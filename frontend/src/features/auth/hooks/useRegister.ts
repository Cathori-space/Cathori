/**
 * 회원가입 TanStack Query mutation 훅
 *
 * 핵심 흐름:
 *  1. register(RegisterRequest) 호출 → 201 응답 (JWT 미포함!)
 *  2. 성공 시 동일 자격증명으로 login() 자동 호출
 *  3. login 성공 → setAuth() → 라우팅 가드가 (tabs)로 이동
 *
 * 에러 분기 (API 명세 기반):
 *  - 400 INVALID_INPUT → 유효성 검사 실패
 *  - 400 USER_INVALID_MAJOR → 존재하지 않는 학과
 *  - 403 USER_NOT_VERIFIED → 이메일 인증 미완료 (트랩 #8)
 *  - 409 USER_EMAIL_DUPLICATE → 이미 가입된 이메일
 */

import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';

import { login, register } from '@/src/services/auth';
import { useAuthStore } from '@/src/store/useAuthStore';
import type { RegisterRequest } from '@/src/types/auth';

/** 백엔드 에러 응답 공통 형태 */
interface ApiErrorResponse {
  code: string;
  message: string;
}

/** 회원가입 에러 코드 타입 */
type RegisterErrorCode =
  | 'INVALID_INPUT'
  | 'USER_INVALID_MAJOR'
  | 'USER_NOT_VERIFIED'
  | 'USER_EMAIL_DUPLICATE'
  | 'AUTO_LOGIN_FAILED'
  | 'UNKNOWN';

/** 에러 코드에 따른 사용자 메시지 */
const ERROR_MESSAGES: Record<RegisterErrorCode, string> = {
  INVALID_INPUT: '입력값을 확인해주세요.',
  USER_INVALID_MAJOR: '존재하지 않는 학과입니다. 다시 선택해주세요.',
  USER_NOT_VERIFIED: '이메일 인증이 완료되지 않았습니다. 인증을 먼저 진행해주세요.',
  USER_EMAIL_DUPLICATE: '이미 가입된 이메일입니다.',
  AUTO_LOGIN_FAILED: '회원가입은 완료되었지만 자동 로그인에 실패했습니다. 로그인 화면에서 다시 시도해주세요.',
  UNKNOWN: '회원가입 중 오류가 발생했습니다.',
};

function extractErrorCode(
  error?: AxiosError<ApiErrorResponse>,
): RegisterErrorCode {
  const code = error?.response?.data?.code;
  if (code && code in ERROR_MESSAGES) {
    return code as RegisterErrorCode;
  }
  return 'UNKNOWN';
}

/** 내부 에러 타입 — register 단계/autoLogin 단계 구분 */
interface RegisterError {
  phase: 'register' | 'autoLogin';
  axiosError: AxiosError<ApiErrorResponse>;
}

export function useRegister() {
  const setAuth = useAuthStore((state) => state.setAuth);

  const mutation = useMutation<
    void, // 최종 성공 시 반환값 없음 (setAuth로 처리)
    RegisterError,
    RegisterRequest
  >({
    mutationFn: async (req: RegisterRequest) => {
      // 1단계: 회원가입
      try {
        await register(req);
      } catch (registerError) {
        throw {
          phase: 'register',
          axiosError: registerError as AxiosError<ApiErrorResponse>,
        } as RegisterError;
      }

      // 2단계: 자동 로그인 (트랩 #7 — 가입 응답에 JWT 없음)
      try {
        const loginResponse = await login({
          email: req.email,
          password: req.password,
        });
        // 토큰 + 사용자 정보 + 태그 영속 저장
        setAuth(loginResponse);
      } catch (autoLoginError) {
        // 가입은 성공했지만 자동 로그인 실패 — 별도 에러 코드로 처리
        throw {
          phase: 'autoLogin',
          axiosError: autoLoginError as AxiosError<ApiErrorResponse>,
        } as RegisterError;
      }
    },
  });

  // ── 에러 파생 ──
  let errorCode: RegisterErrorCode | null = null;
  let errorMessage: string | null = null;

  if (mutation.error) {
    if (mutation.error.phase === 'autoLogin') {
      errorCode = 'AUTO_LOGIN_FAILED';
    } else {
      errorCode = extractErrorCode(mutation.error.axiosError);
    }
    errorMessage = ERROR_MESSAGES[errorCode];
  }

  return {
    /** mutation.mutate(RegisterRequest) */
    register: mutation.mutate,
    /** mutation.mutateAsync(RegisterRequest) */
    registerAsync: mutation.mutateAsync,
    /** 로딩 중 여부 */
    isLoading: mutation.isPending,
    /** 에러 코드 */
    errorCode,
    /** 사용자에게 보여줄 에러 메시지 */
    errorMessage,
    /** 에러 상태 초기화 */
    resetError: mutation.reset,
  };
}
