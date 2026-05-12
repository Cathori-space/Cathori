/**
 * Axios 인스턴스 + 인터셉터 설정
 * Sprint 1: 인증 없이 기본 요청만 처리
 * Sprint 2: JWT 토큰 인터셉터 추가 예정
 */

import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT } from '@/src/constants/api';

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
    // TODO Sprint 2: JWT 액세스 토큰 헤더 추가
    // const token = useAuthStore.getState().accessToken;
    // if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── 응답 인터셉터 ─────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // TODO Sprint 2: 401 → 토큰 갱신 후 재시도 로직 추가
    return Promise.reject(error);
  },
);

export default apiClient;
