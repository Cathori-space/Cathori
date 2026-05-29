/**
 * 로그인 TanStack Query mutation 훅
 *
 * 성공 시:
 *  1. useAuthStore.setAuth(response) → 토큰+사용자+태그 영속 저장
 *  2. 라우팅 가드가 accessToken 감지 → 자동으로 (tabs)로 이동
 *
 * 에러 분기 (API 명세 기반):
 *  - 400 INVALID_INPUT    → 입력값 형식 오류
 *  - 401 USER_INVALID_PASSWORD → 비밀번호 불일치
 *  - 404 USER_NOT_FOUND   → 미가입 이메일
 */

import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';

import { login } from '@/src/services/auth';
import { useAuthStore } from '@/src/store/useAuthStore';
import type { LoginRequest, LoginResponse } from '@/src/types/auth';

/** 백엔드 에러 응답 공통 형태
 * TODO: 추후 공통 인터페이스로 분리 예정*/
interface ApiErrorResponse {
  code: string;
  message: string;
}

/** 로그인 에러 코드 타입 */
type LoginErrorCode =
  | 'INVALID_INPUT'
  | 'USER_INVALID_PASSWORD'
  | 'USER_NOT_FOUND'
  | 'UNKNOWN';

/** 에러 코드에 따른 사용자 메시지 */
const ERROR_MESSAGES: Record<LoginErrorCode, string> = {
  INVALID_INPUT: '이메일 또는 비밀번호를 확인해주세요.',
  USER_INVALID_PASSWORD: '비밀번호가 올바르지 않습니다.',
  USER_NOT_FOUND: '존재하지 않는 이메일입니다.',
  UNKNOWN: '로그인 중 오류가 발생했습니다.',
};

/** Axios 에러에서 에러 코드 추출 */
function extractErrorCode(error: AxiosError<ApiErrorResponse>): LoginErrorCode {
  const code = error.response?.data?.code;
  if (code && code in ERROR_MESSAGES) {
    return code as LoginErrorCode;
  }
  return 'UNKNOWN';
}

export function useLogin() {
  const setAuth = useAuthStore((state) => state.setAuth);

  // useMutation으로 서버에 데이터 변경 요청
  const mutation = useMutation<
    LoginResponse,
    AxiosError<ApiErrorResponse>,
    LoginRequest
  >({
    mutationFn: login,
    onSuccess: (response) => {
      // 토큰 + 사용자 정보 + 태그 영속 저장
      // _layout.tsx의 useProtectedRoute가 accessToken 변경 감지 → (tabs)로 자동 이동
      setAuth(response);
    },
  });

  // 에러 메시지를 쉽게 꺼낼 수 있도록 파생 값 제공
  const errorCode: LoginErrorCode | null = mutation.error
    ? extractErrorCode(mutation.error)
    : null;

  const errorMessage: string | null = errorCode
    ? ERROR_MESSAGES[errorCode]
    : null;

  return {
    /** mutation.mutate(LoginRequest) */
    login: mutation.mutate,
    /** mutation.mutateAsync(LoginRequest) */
    loginAsync: mutation.mutateAsync,
    /** 로딩 중 여부 */
    isLoading: mutation.isPending,
    /** 에러 객체 */
    error: mutation.error,
    /** 에러 코드 (INVALID_INPUT | USER_INVALID_PASSWORD | USER_NOT_FOUND | UNKNOWN) */
    errorCode,
    /** 사용자에게 보여줄 에러 메시지 */
    errorMessage,
    /** 에러 상태 초기화 */
    resetError: mutation.reset,
  };
}
