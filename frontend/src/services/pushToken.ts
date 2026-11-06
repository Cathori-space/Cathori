import { CanceledError, create, isAxiosError, type AxiosRequestConfig } from 'axios';

import { API_BASE_URL, API_TIMEOUT } from '@/src/constants/api';
import { getPendingRefresh } from '@/src/services/authRefresh';
import { invalidateDevicePushToken } from '@/src/services/pushDevice';
import { assertCurrentSession, getSessionId } from '@/src/services/session';

// 정리 요청의 401은 다시 인증 종료를 호출하지 않는다. 종료 시점의 회원 JWT만 사용한다.
const cleanupClient = create({ baseURL: API_BASE_URL, timeout: API_TIMEOUT });
let activeSession: number | null = null;
let serverTask: Promise<unknown> = Promise.resolve();

function enqueueServer<T>(operation: () => Promise<T>): Promise<T> {
  const pending = serverTask.then(operation, operation);
  serverTask = pending.catch(() => {});
  return pending;
}

export function startPushSession(sessionId: number) {
  assertCurrentSession(sessionId);
  activeSession = sessionId;
}

export function isPushSessionActive(sessionId: number) {
  return activeSession === sessionId && getSessionId() === sessionId;
}

export function registerDeviceToken(deviceToken: string, sessionId = getSessionId()): Promise<void> {
  const assertActive = () => {
    if (!isPushSessionActive(sessionId)) throw new CanceledError('종료된 회원의 푸시 등록을 차단했습니다.');
  };
  return enqueueServer(async () => {
    assertActive();
    // 인증 스토어 초기화와 서버 클라이언트 사이의 순환 초기화를 피한다.
    const { default: apiClient } = await import('./api');
    assertActive();
    const config: AxiosRequestConfig & { sessionId: number; preserveOnSessionEnd: boolean } = {
      sessionId, preserveOnSessionEnd: true,
    };
    await apiClient.put('/api/users/device-token', { deviceToken }, config);
  });
}

export interface PushCleanupResult {
  server: 'cleared' | 'failed' | 'not-attempted';
  device: 'invalidated' | 'failed';
  logout: 'confirmed' | 'unconfirmed' | 'not-attempted';
}

async function revokeSession(
  accessToken: string | null,
  refreshToken: string | null,
  pendingRefresh: ReturnType<typeof getPendingRefresh>,
): Promise<boolean> {
  if (accessToken) {
    try {
      const response = await cleanupClient.post('/api/auth/logout', undefined, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.status === 204;
    } catch (error) {
      if (!isAxiosError(error) || error.response?.status !== 401) return false;
    }
  }

  const refreshed = await pendingRefresh?.catch(() => undefined);
  const token = refreshed?.refreshToken ?? refreshToken;
  if (!token) return false;
  try {
    const response = await cleanupClient.post('/api/auth/logout/refresh', undefined, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.status === 204;
  } catch {
    return false;
  }
}

export function stopPushSession(
  accessToken: string | null,
  logout?: { refreshToken: string | null },
): Promise<PushCleanupResult> {
  activeSession = null;
  const pendingRefresh = logout ? getPendingRefresh(getSessionId()) : undefined;
  const server = enqueueServer(async (): Promise<Pick<PushCleanupResult, 'server' | 'logout'>> => {
    let result: PushCleanupResult['server'] = 'not-attempted';
    if (accessToken) {
      try {
        const response = await cleanupClient.delete('/api/users/device-token', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        result = response.status === 204 ? 'cleared' : 'failed';
      } catch {
        result = 'failed';
      }
    }
    if (logout && await revokeSession(accessToken, logout.refreshToken, pendingRefresh)) {
      return { server: 'cleared', logout: 'confirmed' };
    }
    if (result === 'failed') console.warn('[push] 서버 토큰 반납을 확인하지 못했습니다.');
    if (logout) console.warn('[auth] 서버 로그아웃을 확인하지 못했습니다.');
    return { server: result, logout: logout ? 'unconfirmed' : 'not-attempted' };
  });
  // 회원 JWT로 서버 반납을 먼저 시도하고, 실패 여부와 관계없이 기기를 무효화한다.
  const device = invalidateDevicePushToken(server).then(() => 'invalidated' as const, () => {
    console.warn('[push] 기기 푸시 무효화 실패: 다음 회원 등록 전에 다시 시도합니다.');
    return 'failed' as const;
  });
  return Promise.all([server, device]).then(([serverResult, deviceResult]) => ({ ...serverResult, device: deviceResult }));
}
