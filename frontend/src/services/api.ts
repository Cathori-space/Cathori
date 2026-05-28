/**
 * Axios 인스턴스 + 인터셉터 설정
 * Sprint 1: 인증 없이 기본 요청만 처리
 * Sprint 2: JWT 토큰 인터셉터 활성화
 */

import axios from 'axios';
import { router } from 'expo-router';

import { API_BASE_URL, API_TIMEOUT } from '@/src/constants/api';
import { useAuthStore } from '@/src/store/useAuthStore';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
  (error) => {
    // 401 Unauthorized → 토큰 클리어 + 로그인 화면 리다이렉트
    // 1차 MVP: refreshToken 갱신 미구현, 단순 로그아웃 처리
    // (트랩 #9: accessToken 만료 + refreshToken 유효 케이스는 추후에 재검토)
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const { accessToken } = useAuthStore.getState();

      // 이미 인증 토큰이 있었는데 401을 받은 경우에만 로그아웃 처리
      // (인증 불필요 API의 401은 무시 — 로그인/회원가입 API의 비밀번호 오답 등)
      if (accessToken) {
        useAuthStore.getState().clearAuth();
        router.replace('/login' as never);
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
