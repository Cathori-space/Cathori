import { create, isAxiosError, CanceledError } from 'axios';
import { router } from 'expo-router';

import { API_BASE_URL, API_TIMEOUT } from '@/src/constants/api';
import { refreshSession } from '@/src/services/authRefresh';
import { assertCurrentSession, getSessionId, installSessionInterceptors, isCurrentSession, type SessionConfig } from '@/src/services/session';
import { useAuthStore } from '@/src/store/useAuthStore';

const PUBLIC_AUTH_ENDPOINTS = new Set([
  '/api/auth/login', '/api/auth/register', '/api/auth/email/send', '/api/auth/email/verify',
]);

const apiClient = create({
  baseURL: API_BASE_URL, timeout: API_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const { status, accessToken } = useAuthStore.getState();
  if (PUBLIC_AUTH_ENDPOINTS.has(config.url ?? '')) {
    config.headers.delete('Authorization');
  } else {
    if (status !== 'authenticated' || !accessToken) {
      const blocked = new CanceledError('회원 전용 요청을 차단했습니다.');
      blocked.config = config;
      throw blocked;
    }
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});
// 요청 인터셉터는 역순, 응답 인터셉터는 등록순으로 실행된다.
installSessionInterceptors(apiClient);

async function expireSession(id: number) {
  if (!isCurrentSession(id)) return;
  try {
    await useAuthStore.getState().clearAuth();
  } finally {
    if (useAuthStore.getState().status === 'unauthenticated') router.replace('/login');
  }
}

apiClient.interceptors.response.use(undefined, async (error) => {
  if (!isAxiosError(error) || error.response?.status !== 401) throw error;
  const original = error.config as (SessionConfig & { _retry?: boolean }) | undefined;
  if (!original || PUBLIC_AUTH_ENDPOINTS.has(original.url ?? '')) throw error;
  const id = original.sessionId ?? getSessionId();
  assertCurrentSession(id);
  const { status, accessToken, refreshToken } = useAuthStore.getState();
  if (status !== 'authenticated' || !accessToken) throw error;
  if (original._retry || !refreshToken) {
    await expireSession(id);
    throw error;
  }
  original._retry = true;
  try {
    const token = await refreshSession(id, refreshToken, (tokens) => useAuthStore.getState().setTokens(tokens, id));
    assertCurrentSession(id);
    original.headers.Authorization = `Bearer ${token}`;
    return apiClient(original);
  } catch (refreshError) {
    await expireSession(id);
    throw refreshError;
  }
});

export default apiClient;
