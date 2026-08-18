/**
 * 이메일 인증 TanStack Query mutation 훅
 *
 * 두 단계:
 *  1. sendVerification — 인증번호 발송 + 3분 타이머 시작
 *  2. verify — 인증번호 검증, 성공 시 isVerified = true
 *
 * 타이머:
 *  - 인증번호 발송 성공 시 180초 카운트다운 시작
 *  - 0초 도달 시 자동 만료 표시
 *  - 재발송 시 타이머 리셋
 *
 * 에러 분기 (API 명세 기반):
 *  발송:
 *    - 400 INVALID_INPUT → 이메일 형식 오류
 *    - 500 INTERNAL_ERROR → SMTP 발송 실패
 *  검증:
 *    - 400 USER_VERIFY_CODE_EXPIRED → 인증번호 만료 (3분 초과)
 *    - 400 USER_INVALID_VERIFY_CODE → 인증번호 불일치
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

/** 백엔드 에러 응답 공통 형태 */
interface ApiErrorResponse {
  code: string;
  message: string;
}

/** 이메일 인증 에러 코드 */
type EmailVerificationErrorCode =
  | 'INVALID_INPUT'
  | 'INTERNAL_ERROR'
  | 'USER_VERIFY_CODE_EXPIRED'
  | 'USER_INVALID_VERIFY_CODE'
  | 'UNKNOWN';

/** 에러 메시지 매핑 */
const ERROR_MESSAGES: Record<EmailVerificationErrorCode, string> = {
  INVALID_INPUT: '올바른 이메일 형식이 아닙니다.',
  INTERNAL_ERROR: '메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.',
  USER_VERIFY_CODE_EXPIRED: '인증번호가 만료되었습니다. 재발송해주세요.',
  USER_INVALID_VERIFY_CODE: '인증번호가 올바르지 않습니다.',
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

export function useEmailVerification() {
  // ── 인증 상태 ──
  const [isVerified, setIsVerified] = useState(false);
  const [isSent, setIsSent] = useState(false);

  // ── 3분 타이머 ──
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** 타이머 시작 */
  const startTimer = useCallback(() => {
    // 기존 타이머 정리
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setRemainingSeconds(VERIFICATION_TTL_SECONDS);

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => { // 매 1초마다 previous state 갱신
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  /** 타이머 정리 (언마운트 시) */
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  /** 남은 시간 포맷 (MM:SS) */
  const formattedTime = `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, '0')}`;

  /** 타이머 만료 여부 */
  const isExpired = isSent && remainingSeconds === 0;

  // ── 인증번호 발송 mutation ──
  const sendMutation = useMutation<
    EmailSendResponse,
    AxiosError<ApiErrorResponse>,
    EmailSendRequest
  >({
    mutationFn: sendVerificationEmail,
    onSuccess: () => {
      setIsSent(true);
      setIsVerified(false);
      startTimer();
    },
  });

  // ── 인증번호 검증 mutation ──
  const verifyMutation = useMutation<
    EmailVerifyResponse,
    AxiosError<ApiErrorResponse>,
    EmailVerifyRequest
  >({
    mutationFn: verifyEmail,
    onSuccess: () => {
      setIsVerified(true);
      // 인증 성공 시 타이머 정지
      if (timerRef.current) clearInterval(timerRef.current);
    },
  });

  // ── 에러 메시지 파생 ──
  const sendErrorCode: EmailVerificationErrorCode | null = sendMutation.error
    ? extractErrorCode(sendMutation.error)
    : null;

  const verifyErrorCode: EmailVerificationErrorCode | null = verifyMutation.error
    ? extractErrorCode(verifyMutation.error)
    : null;

  const sendErrorMessage = sendErrorCode ? ERROR_MESSAGES[sendErrorCode] : null;
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

    // ── 유틸 ──
    /** 에러 상태 초기화 */
    resetErrors: () => {
      sendMutation.reset();
      verifyMutation.reset();
    },
  };
}
