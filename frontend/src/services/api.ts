/**
 * Axios 인스턴스 + 인터셉터 설정
 * Sprint 1: 인증 없이 기본 요청만 처리
 * Sprint 2: JWT 토큰 인터셉터 활성화
 */

import axios from 'axios';
import { router } from 'expo-router';

import { API_BASE_URL, API_TIMEOUT } from '@/src/constants/api';
import { useAuthStore } from '@/src/store/useAuthStore';
import type {
  ReissueRequest,
  ReissueResponse,
} from '@/src/types/auth';

interface RetryableRequestConfig {
  _retry?: boolean;
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

let reissuePromise: Promise<string> | null = null;

// ─── 요청 인터셉터 ─────────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    // JWT 액세스 토큰 자동 주입
    // accessToken이 null이면 헤더를 추가하지 않음 (인증 불필요 API에도 안전)
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── 응답 인터셉터 ─────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as
      | (NonNullable<typeof error.config> & RetryableRequestConfig)
      | undefined;
    const { accessToken, refreshToken } = useAuthStore.getState();

    // 로그인 실패 등 인증 API의 401은 access token 만료로 처리하지 않는다.
    if (
      !originalRequest ||
      originalRequest.url?.startsWith('/api/auth/') ||
      !accessToken
    ) {
      return Promise.reject(error);
    }

    // 재발급 후에도 401이거나 refresh token이 없으면 인증을 종료한다.
    if (originalRequest._retry || !refreshToken) {
      await useAuthStore.getState().clearAuth();
      router.replace('/login' as never);
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      // 여러 API가 동시에 401을 받아도 토큰 재발급 요청은 한 번만 보낸다.
      // 먼저 시작된 재발급이 있다면 아래에서 같은 Promise의 완료를 함께 기다린다.
      if (!reissuePromise) {
        const request: ReissueRequest = { refreshToken };

        // 재발급 요청에는 현재 응답 인터셉터가 적용되지 않는 기본 axios를 사용한다.
        // apiClient를 사용하면 재발급 실패의 401까지 다시 재발급 처리할 수 있기 때문이다.
        reissuePromise = axios
          .post<ReissueResponse>(`${API_BASE_URL}/api/auth/reissue`, request, {
            timeout: API_TIMEOUT,
            headers: { 'Content-Type': 'application/json' },
          })
          .then(async ({ data }) => {
            // 서버가 반환한 새 access/refresh token을 SecureStore와 Zustand에 반영한다.
            await useAuthStore.getState().setTokens(data);
            return data.accessToken;
          })
          .finally(() => {
            // 성공과 실패에 관계없이 다음 401에서는 새 재발급 요청을 시작할 수 있게 한다.
            reissuePromise = null;
          });
      }

      // 재발급 완료 후 원래 실패했던 요청에 새 access token을 넣어 한 번 재시도한다.
      const newAccessToken = await reissuePromise;
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);
    } catch (reissueError) {
      // refresh token도 유효하지 않거나 재발급에 실패하면 인증 상태를 종료한다.
      await useAuthStore.getState().clearAuth();
      router.replace('/login' as never);
      return Promise.reject(reissueError);
    }
  },
);

export default apiClient;
