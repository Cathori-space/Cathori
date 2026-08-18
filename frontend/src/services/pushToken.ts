/**
 * 디바이스 푸시 토큰 등록/반납 API fetcher
 *
 * 백엔드 API 명세:
 *  - PUT    /api/users/device-token { deviceToken } → 204
 *  - DELETE /api/users/device-token                  → 204 (토큰 반납)
 *
 * 호출 시점:
 *  - 등록: 로그인 성공 직후 (usePushNotifications)
 *  - 반납: 로그아웃 시 clearAuth() 직전 (settings.tsx)
 */

import apiClient from './api';

/** 디바이스 토큰 등록/갱신 */
export async function registerDeviceToken(deviceToken: string): Promise<void> {
  await apiClient.put('/api/users/device-token', { deviceToken });
}

/** 디바이스 토큰 반납 (로그아웃) */
export async function unregisterDeviceToken(): Promise<void> {
  await apiClient.delete('/api/users/device-token');
}
