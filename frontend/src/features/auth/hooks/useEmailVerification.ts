/**
 * 이메일 인증 TanStack Query mutation 훅
 *
 * 두 단계:
 *  1. sendVerification — 인증번호 발송 + 3분 타이머 시작
 *  2. verify — 인증번호 검증, 성공 시 isVerified = true
 *
 * 타이머:
 *  - 만료 시각을 기억하고 남은 시간을 매초 다시 계산한다
 *  - 재발송 시 서버는 유효한 번호를 만료 시각 그대로 다시 보낸다 → 타이머도 이어서 센다.
 *    번호가 만료됐거나 5회 틀려 지워진 뒤의 재발송만 새 번호이므로 3분으로 초기화한다
 *
 * 재발송 대기:
 *  - 429(발송 제한)면 응답의 retryAfterSeconds만큼 재발송 버튼을 막고 남은 초를 보여 준다
 */

import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  sendVerificationEmail,
  verifyEmail,
} from '@/src/services/auth';
import type {
  EmailSendRequest,
  EmailSendResponse,
  EmailVerifyRequest,
  EmailVerifyResponse,
} from '@/src/types/auth';

/** 인증번호 유효 시간 (초) */
const VERIFICATION_TTL_SECONDS = 180;

/** 백엔드 에러 응답 공통 형태 (retryAfterSeconds는 429일 때만) */
interface ApiErrorResponse {
  code: string;
  message: string;
  retryAfterSeconds?: number;
}

/** 이메일 인증 에러 코드 */
type EmailVerificationErrorCode =
  | 'INVALID_INPUT'
  | 'INTERNAL_ERROR'
  | 'USER_EMAIL_DOMAIN_NOT_ALLOWED'
  | 'USER_EMAIL_DUPLICATE'
  | 'EMAIL_SEND_TOO_FREQUENT'
  | 'EMAIL_SEND_LIMIT_EXCEEDED'
  | 'EMAIL_SEND_FAILED'
  | 'USER_VERIFY_CODE_EXPIRED'
  | 'USER_INVALID_VERIFY_CODE'
  | 'USER_VERIFY_ATTEMPTS_EXCEEDED'
  | 'UNKNOWN';

/** 에러 메시지 매핑 */
const ERROR_MESSAGES: Record<EmailVerificationErrorCode, string> = {
  INVALID_INPUT: '올바른 이메일 형식이 아닙니다.',
  INTERNAL_ERROR: '메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.',
  USER_EMAIL_DOMAIN_NOT_ALLOWED: '가톨릭대학교 이메일(@catholic.ac.kr)만 사용할 수 있어요.',
  USER_EMAIL_DUPLICATE: '이미 가입된 이메일이에요. 로그인하거나 비밀번호를 찾아 주세요.',
  EMAIL_SEND_TOO_FREQUENT: '잠시 후 다시 시도해 주세요.',
  EMAIL_SEND_LIMIT_EXCEEDED: '인증번호 요청 횟수를 초과했어요. 잠시 후 다시 시도해 주세요.',
  EMAIL_SEND_FAILED: '메일 발송에 실패했어요. 잠시 후 다시 시도해 주세요.',
  USER_VERIFY_CODE_EXPIRED: '인증번호가 만료되었습니다. 재발송해주세요.',
  USER_INVALID_VERIFY_CODE: '인증번호가 올바르지 않습니다.',
  USER_VERIFY_ATTEMPTS_EXCEEDED: '인증번호를 5회 잘못 입력했어요. 인증번호를 다시 받아 주세요.',
  UNKNOWN: '인증 중 오류가 발생했습니다.',
};

function extractErrorCode(
  error: AxiosError<ApiErrorResponse>,
): EmailVerificationErrorCode {
  const code = error.response?.data?.code;
  if (code && code in ERROR_MESSAGES) {
    return code as EmailVerificationErrorCode;
  }
  return 'UNKNOWN';
}

/** 429 응답에서 다시 보낼 수 있을 때까지 남은 초. 본문 값을 우선하고 없으면 Retry-After 헤더 */
function extractRetryAfterSeconds(error: AxiosError<ApiErrorResponse>): number {
  if (error.response?.status !== 429) return 0;
  const fromBody = error.response.data?.retryAfterSeconds;
  if (typeof fromBody === 'number' && fromBody > 0) return Math.ceil(fromBody);
  const fromHeader = Number(error.response.headers?.['retry-after']);
  return Number.isFinite(fromHeader) && fromHeader > 0 ? Math.ceil(fromHeader) : 0;
}

/** 지금부터 deadline(ms)까지 남은 초 (0 이상) */
function secondsUntil(deadline: number): number {
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}

export function useEmailVerification() {
  // ── 인증 상태 ──
  const [isVerified, setIsVerified] = useState(false);
  const [isSent, setIsSent] = useState(false);

  // ── 3분 타이머 ── 만료 시각(ms)을 기준으로 매초 남은 시간을 다시 계산한다
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const expiresAtRef = useRef(0);
  /** 마지막으로 발송에 성공한 이메일 — 같은 이메일일 때만 타이머를 이어서 센다 */
  const sentEmailRef = useRef('');

  // ── 재발송 대기 (429) ──
  const [resendWaitSeconds, setResendWaitSeconds] = useState(0);
  const resendAvailableAtRef = useRef(0);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** 두 카운트다운을 함께 갱신. 둘 다 끝나면 interval을 멈춘다 */
  const tick = useCallback(() => {
    const remaining = secondsUntil(expiresAtRef.current);
    const wait = secondsUntil(resendAvailableAtRef.current);
    setRemainingSeconds(remaining);
    setResendWaitSeconds(wait);
    if (remaining === 0 && wait === 0 && tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const ensureTicking = useCallback(() => {
    tick();
    if (!tickRef.current) {
      tickRef.current = setInterval(tick, 1000);
    }
  }, [tick]);

  /** 번호를 만료 처리 (서버에서 지워진 경우) */
  const expireCode = useCallback(() => {
    expiresAtRef.current = 0;
    tick();
  }, [tick]);

  /** 언마운트 시 interval 정리 */
  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, []);

  /** 남은 시간 포맷 (MM:SS) */
  const formattedTime = `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, '0')}`;

  /** 타이머 만료 여부 */
  const isExpired = isSent && !isVerified && remainingSeconds === 0;

  /** 재발송 대기 표시 — 1분 이상이면 분 단위 */
  const formattedResendWait = resendWaitSeconds >= 60
    ? `${Math.ceil(resendWaitSeconds / 60)}분`
    : `${resendWaitSeconds}초`;

  // ── 인증번호 검증 mutation ──
  const verifyMutation = useMutation<
    EmailVerifyResponse,
    AxiosError<ApiErrorResponse>,
    EmailVerifyRequest
  >({
    mutationFn: verifyEmail,
    onSuccess: () => {
      setIsVerified(true);
      // 인증 성공 시 타이머 정지 (isExpired는 인증 전에만 true라 입력값은 그대로 남는다)
      expireCode();
    },
    onError: (error) => {
      // 5회 초과·만료면 서버에서 번호가 지워졌다 → 타이머를 끝내 재발송을 유도한다
      const code = extractErrorCode(error);
      if (code === 'USER_VERIFY_ATTEMPTS_EXCEEDED' || code === 'USER_VERIFY_CODE_EXPIRED') {
        expireCode();
      }
    },
  });

  // ── 인증번호 발송 mutation ──
  const sendMutation = useMutation<
    EmailSendResponse,
    AxiosError<ApiErrorResponse>,
    EmailSendRequest
  >({
    mutationFn: sendVerificationEmail,
    onSuccess: (_data, variables) => {
      setIsSent(true);
      setIsVerified(false);
      verifyMutation.reset();
      // 같은 이메일의 번호가 아직 유효하면 서버가 같은 번호를 만료 시각 그대로 다시 보낸 것이다 → 이어서 센다.
      // 이메일을 바꿨거나 번호가 끝났으면 새 번호이므로 3분으로 초기화한다
      const sameEmail = variables.email === sentEmailRef.current;
      sentEmailRef.current = variables.email;
      if (!sameEmail || expiresAtRef.current <= Date.now()) {
        expiresAtRef.current = Date.now() + VERIFICATION_TTL_SECONDS * 1000;
      }
      ensureTicking();
    },
    onError: (error) => {
      const wait = extractRetryAfterSeconds(error);
      if (wait > 0) {
        resendAvailableAtRef.current = Date.now() + wait * 1000;
        ensureTicking();
      }
    },
  });

  // ── 에러 메시지 파생 ──
  const sendErrorCode: EmailVerificationErrorCode | null = sendMutation.error
    ? extractErrorCode(sendMutation.error)
    : null;

  const verifyErrorCode: EmailVerificationErrorCode | null = verifyMutation.error
    ? extractErrorCode(verifyMutation.error)
    : null;

  // 재발송 대기가 끝나면 "잠시 후 다시 시도" 안내는 더 보여 주지 않는다
  const isRateLimited = sendErrorCode === 'EMAIL_SEND_TOO_FREQUENT' || sendErrorCode === 'EMAIL_SEND_LIMIT_EXCEEDED';
  const sendErrorMessage = sendErrorCode && !(isRateLimited && resendWaitSeconds === 0)
    ? ERROR_MESSAGES[sendErrorCode]
    : null;
  const verifyErrorMessage = verifyErrorCode ? ERROR_MESSAGES[verifyErrorCode] : null;

  return {
    // ── 발송 ──
    /** 인증번호 발송 */
    sendVerification: sendMutation.mutate,
    /** 발송 로딩 */
    isSending: sendMutation.isPending,
    /** 발송 에러 메시지 */
    sendErrorMessage,
    /** 발송 완료 여부 */
    isSent,

    // ── 검증 ──
    /** 인증번호 검증 */
    verify: verifyMutation.mutate,
    /** 검증 로딩 */
    isVerifying: verifyMutation.isPending,
    /** 검증 에러 메시지 */
    verifyErrorMessage,
    /** 인증 성공 여부 */
    isVerified,

    // ── 타이머 ──
    /** 남은 초 */
    remainingSeconds,
    /** 포맷된 시간 (MM:SS) */
    formattedTime,
    /** 타이머 만료 여부 */
    isExpired,
    /** 재발송까지 남은 초 (429 대기 중일 때만 0보다 큼) */
    resendWaitSeconds,
    /** 재발송 대기 표시 ("42초" / "15분") */
    formattedResendWait,

    // ── 유틸 ──
    /** 에러 상태 초기화 */
    resetErrors: () => {
      sendMutation.reset();
      verifyMutation.reset();
    },
  };
}
