import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteToken, getMessaging, getToken, registerDeviceForRemoteMessages, setAutoInitEnabled, unregisterDeviceForRemoteMessages } from '@react-native-firebase/messaging';
import type { InternalAxiosRequestConfig } from 'axios';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { Alert, Platform } from 'react-native';

import SettingsScreen from '@/app/(tabs)/settings';

import { usePushNotifications } from '@/src/features/notifications/hooks/usePushNotifications';
import apiClient from '@/src/services/api';
import { registerDeviceToken, type PushCleanupResult } from '@/src/services/pushToken';
import { getSessionId } from '@/src/services/session';
import { useAuthStore } from '@/src/store/useAuthStore';
import { cleanup, deferred, flush, member, pressText, rejectStatus, render, renderHook, response, transport } from './helpers';

const defaultGetToken = jest.mocked(getToken).getMockImplementation()!;
const defaultDeleteToken = jest.mocked(deleteToken).getMockImplementation()!;
const defaultSetAutoInit = jest.mocked(setAutoInitEnabled).getMockImplementation()!;
const defaultStorageRead = jest.mocked(AsyncStorage.getItem).getMockImplementation()!;
const defaultGetPermissions = jest.mocked(Notifications.getPermissionsAsync).getMockImplementation()!;

beforeEach(async () => {
  await cleanup();
  transport.mockImplementation(async (config) => response(config, {},
    config.method === 'delete' || config.url === '/api/auth/logout' ? 204 : 200));
});
afterEach(async () => {
  jest.mocked(getToken).mockImplementation(defaultGetToken);
  jest.mocked(deleteToken).mockImplementation(defaultDeleteToken);
  jest.mocked(setAutoInitEnabled).mockImplementation(defaultSetAutoInit);
  jest.mocked(AsyncStorage.getItem).mockImplementation(defaultStorageRead);
  jest.mocked(Notifications.getPermissionsAsync).mockImplementation(defaultGetPermissions);
  jest.replaceProperty(Platform, 'OS', 'ios');
  await cleanup();
});

const puts = () => transport.mock.calls.map(([config]) => config).filter((config) => config.url === '/api/users/device-token' && config.method === 'put');
const deletes = () => transport.mock.calls.map(([config]) => config).filter((config) => config.url === '/api/users/device-token' && config.method === 'delete');
async function authenticate() {
  await act(async () => { await useAuthStore.getState().setAuth(member); });
}
async function registerPush() {
  await authenticate();
  return renderHook(usePushNotifications);
}

async function confirmLogout() {
  const tree = await render(<SettingsScreen />);
  await pressText(tree, '로그아웃');
  const buttons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2];
  const confirm = buttons?.find((button) => button.text === '로그아웃');
  expect(confirm?.onPress).toBeDefined();
  await act(async () => { await confirm!.onPress!(); });
}

describe('인증 종료와 서버 반납 정책', () => {
  it('설정 화면의 로그아웃 확인도 공통 푸시 반납 정책을 사용한다', async () => {
    await registerPush();
    await confirmLogout();
    expect(deletes()).toHaveLength(1);
    expect(transport.mock.calls.some(([c]) => c.url === '/api/auth/logout')).toBe(true);
    expect(Alert.alert).not.toHaveBeenCalledWith('서버 로그아웃 미확인', expect.any(String));
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  it('정상 로그아웃은 등록 완료 뒤 서버 반납과 서버 로그아웃을 순서대로 수행한다', async () => {
    await registerPush();
    expect(puts()).toHaveLength(1);
    const deletesBefore = jest.mocked(deleteToken).mock.calls.length;
    jest.mocked(deleteToken).mockImplementationOnce(async (messaging) => {
      expect(deletes()).toHaveLength(1);
      await defaultDeleteToken(messaging);
    });
    await act(async () => { await useAuthStore.getState().clearAuth('logout'); });

    expect(transport.mock.calls.map(([c]) => `${c.method} ${c.url}`)).toEqual([
      'put /api/users/device-token', 'delete /api/users/device-token', 'post /api/auth/logout',
    ]);
    expect(deletes()[0].headers.Authorization).toBe('Bearer access');
    expect(deleteToken).toHaveBeenCalledTimes(deletesBefore + 1);
    expect(setAutoInitEnabled).toHaveBeenLastCalledWith(getMessaging(), false);
    expect(unregisterDeviceForRemoteMessages).toHaveBeenCalled();
    expect(Notifications.dismissAllNotificationsAsync).toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  it('Access 로그아웃이 401이면 재발급 없이 현재 Refresh Token으로 폐기를 확인한다', async () => {
    await authenticate();
    transport.mockImplementation(async (config) => {
      if (config.url === '/api/auth/logout/refresh') return response(config, {}, 204);
      return rejectStatus(config, 401);
    });

    await expect(useAuthStore.getState().clearAuth('logout')).resolves.toMatchObject({
      server: 'cleared', logout: 'confirmed', device: 'invalidated',
    });
    expect(transport.mock.calls.map(([config]) => [config.url, config.headers.Authorization])).toEqual([
      ['/api/users/device-token', 'Bearer access'],
      ['/api/auth/logout', 'Bearer access'],
      ['/api/auth/logout/refresh', 'Bearer refresh'],
    ]);
    expect(transport.mock.calls.at(-1)?.[0].data).toBeUndefined();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  it.each(['server-error', 'lost-response'])('폐기 요청의 %s를 서버 로그아웃 성공으로 표시하지 않는다', async (failure) => {
    await authenticate();
    let committed = false;
    transport.mockImplementation(async (config) => {
      if (config.url === '/api/auth/logout' || config.url === '/api/users/device-token') {
        return rejectStatus(config, 401);
      }
      if (config.url === '/api/auth/logout/refresh') {
        if (failure === 'server-error') return rejectStatus(config, 500);
        committed = true;
        throw new Error('응답 유실');
      }
      return response(config, {});
    });

    await confirmLogout();

    expect(committed).toBe(failure === 'lost-response');
    expect(Alert.alert).toHaveBeenCalledWith('서버 로그아웃 미확인', expect.stringContaining('이 기기에서는 로그아웃했습니다'));
    expect(useAuthStore.getState()).toMatchObject({ status: 'unauthenticated', accessToken: null, refreshToken: null });
    expect(router.replace).toHaveBeenCalledWith('/login');
    expect(transport.mock.calls.filter(([c]) => c.url === '/api/auth/logout/refresh')).toHaveLength(1);
    expect(transport.mock.calls.filter(([c]) => c.url === '/api/auth/reissue')).toHaveLength(0);
  });

  it('진행 중인 재발급이 먼저 성공하면 교체 Refresh Token만 폐기에 사용한다', async () => {
    await authenticate();
    const reissue = deferred<ReturnType<typeof response>>();
    const started = deferred<InternalAxiosRequestConfig>();
    transport.mockImplementation(async (config) => {
      if (config.url === '/api/auth/reissue') {
        started.resolve(config);
        return reissue.promise;
      }
      if (config.url === '/api/auth/logout/refresh' && config.headers.Authorization === 'Bearer rotated-refresh') {
        return response(config, {}, 204);
      }
      return rejectStatus(config, 401);
    });
    const pending = apiClient.get('/api/notices').catch((error: unknown) => error);
    const refreshConfig = await started.promise;
    jest.mocked(SecureStore.setItemAsync).mockClear();
    const logout = useAuthStore.getState().clearAuth('logout');
    expect(useAuthStore.getState().status).toBe('unauthenticated');
    reissue.resolve(response(refreshConfig, { accessToken: 'rotated-access', refreshToken: 'rotated-refresh' }));

    await expect(logout).resolves.toMatchObject({ logout: 'confirmed' });
    await pending;
    expect(transport.mock.calls.filter(([c]) => c.url === '/api/auth/reissue')).toHaveLength(1);
    expect(transport.mock.calls.filter(([c]) => c.url === '/api/notices')).toHaveLength(1);
    expect(jest.mocked(SecureStore.setItemAsync)).not.toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({ status: 'unauthenticated', refreshToken: null });
  });

  it('Access·Refresh 만료 뒤 게스트에 진입해도 재발급을 반복하거나 푸시를 재등록하지 않는다', async () => {
    let serverToken: string | null = null;
    transport.mockImplementation(async (config) => {
      if (config.url === '/api/users/device-token' && config.method === 'put') {
        serverToken = JSON.parse(config.data).deviceToken;
        return response(config, {});
      }
      return rejectStatus(config, 401);
    });
    await registerPush();
    expect(serverToken).not.toBeNull();
    const deletedBefore = jest.mocked(deleteToken).mock.calls.length;
    await act(async () => { await apiClient.get('/api/notices').catch(() => {}); });
    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(router.replace).toHaveBeenCalledWith('/login');
    await act(async () => { await useAuthStore.getState().enterGuest(); });

    expect(useAuthStore.getState().status).toBe('guest');
    expect(transport.mock.calls.filter(([c]) => c.url === '/api/auth/reissue')).toHaveLength(1);
    expect(puts()).toHaveLength(1);
    expect(deleteToken).toHaveBeenCalledTimes(deletedBefore + 2);
    // 인증이 만료되면 서버 등록은 남을 수 있으며, 기기 무효화 시도와 구분한다.
    expect(serverToken).not.toBeNull();
    expect(setAutoInitEnabled).toHaveBeenLastCalledWith(getMessaging(), false);
  });

  it.each(['401', 'network'])('서버 반납의 %s 실패와 관계없이 기기를 무효화하고 인증을 종료한다', async (failure) => {
    await registerPush();
    transport.mockImplementation((config) => {
      if (config.url === '/api/users/device-token' && config.method === 'delete') {
        return failure === '401' ? rejectStatus(config, 401) : Promise.reject(new Error('네트워크 오류'));
      }
      return Promise.resolve(response(config, {}));
    });
    const deletedBefore = jest.mocked(deleteToken).mock.calls.length;
    await act(async () => { await useAuthStore.getState().clearAuth('logout'); });
    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(deleteToken).toHaveBeenCalledTimes(deletedBefore + 1);
    expect(transport.mock.calls.filter(([c]) => c.url === '/api/auth/reissue')).toHaveLength(0);
    expect(deletes()).toHaveLength(1);
  });

  it('게스트에서 회원 인증 없이 서버 반납을 요청하지 않는다', async () => {
    await act(async () => { await useAuthStore.getState().enterGuest(); });
    expect(transport).not.toHaveBeenCalled();
    expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe('지연 요청과 회원 전환', () => {
  it.each([
    { status: 503, logout: false, expectedPuts: 2 },
    { status: 503, logout: true, expectedPuts: 1 },
    { status: 409, logout: false, expectedPuts: 1 },
  ])('PUT 실패 상태 $status, 로그아웃 $logout에서 등록 요청을 $expectedPuts 번만 보낸다',
    async ({ status, logout, expectedPuts }) => {
      const first = deferred<ReturnType<typeof response>>();
      const started = deferred<InternalAxiosRequestConfig>();
      let attempts = 0;
      transport.mockImplementation(async (config) => {
        if (config.url === '/api/users/device-token' && config.method === 'put' && ++attempts === 1) {
          started.resolve(config);
          return first.promise;
        }
        return response(config, {}, 204);
      });
      await registerPush();
      const firstConfig = await started.promise;
      const tokenRequests = jest.mocked(getToken).mock.calls.length;
      jest.useFakeTimers();
      try {
        await act(async () => { await rejectStatus(firstConfig, status).catch(first.reject); });
        if (logout) {
          await act(async () => { await useAuthStore.getState().clearAuth('logout'); });
        }
        await act(async () => { await jest.advanceTimersByTimeAsync(4_000); });
        expect(puts()).toHaveLength(expectedPuts);
        expect(jest.mocked(getToken)).toHaveBeenCalledTimes(tokenRequests);
        for (const attempt of puts()) {
          expect(attempt.data).toBe(firstConfig.data);
          expect(attempt.headers.Authorization).toBe('Bearer access');
        }
      } finally {
        jest.useRealTimers();
      }
    });

  it('네이티브 삭제가 지연되어도 저장된 회원 JWT를 먼저 지운다', async () => {
    await registerPush();
    const gate = deferred<void>();
    jest.mocked(deleteToken).mockReturnValueOnce(gate.promise);
    jest.mocked(SecureStore.deleteItemAsync).mockClear();
    let ending!: Promise<PushCleanupResult>;
    await act(async () => { ending = useAuthStore.getState().clearAuth(); });
    await flush();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('cathori.auth.access-token', expect.anything());
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('cathori.auth.refresh-token', expect.anything());
    gate.resolve();
    await act(async () => { await ending; });
  });

  it('전송 중인 PUT을 기다린 뒤 DELETE하여 늦은 등록이 반납을 되돌리지 못한다', async () => {
    const gate = deferred<ReturnType<typeof response>>();
    let registration!: InternalAxiosRequestConfig;
    let serverToken: string | null = null;
    transport.mockImplementation(async (config) => {
      if (config.url === '/api/users/device-token' && config.method === 'put') {
        registration = config;
        const result = await gate.promise;
        serverToken = JSON.parse(config.data).deviceToken;
        return result;
      }
      if (config.method === 'delete') serverToken = null;
      return response(config, {});
    });
    await registerPush();
    let ending!: Promise<PushCleanupResult>;
    await act(async () => { ending = useAuthStore.getState().clearAuth('logout'); });
    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(registration.signal?.aborted).toBe(false);
    expect(deletes()).toHaveLength(0);

    gate.resolve(response(registration, {}));
    await act(async () => { await ending; });
    expect(serverToken).toBeNull();
    expect(puts()).toHaveLength(1);
    expect(deletes()).toHaveLength(1);
  });

  it('토큰 발급 중 인증이 종료되면 늦은 발급 뒤 삭제하고 서버에 등록하지 않는다', async () => {
    const gate = deferred<string>();
    jest.mocked(getToken).mockReturnValueOnce(gate.promise);
    await registerPush();
    let ending!: Promise<PushCleanupResult>;
    await act(async () => { ending = useAuthStore.getState().clearAuth(); });
    const deletedBefore = jest.mocked(deleteToken).mock.calls.length;
    gate.resolve('late-device');
    await act(async () => { await ending; });
    await flush();
    expect(puts()).toHaveLength(0);
    expect(deleteToken).toHaveBeenCalledTimes(deletedBefore + 1);
  });

  it('이전 세션의 등록 재시도는 새 요청을 전송하지 않는다', async () => {
    await registerPush();
    const oldSession = getSessionId();
    await act(async () => { await useAuthStore.getState().clearAuth(); });
    await expect(registerDeviceToken('old-device', oldSession)).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    expect(puts()).toHaveLength(1);
  });

  it('회원 A → 로그아웃 → 게스트 → 회원 B는 서로 다른 FCM 토큰을 등록한다', async () => {
    await registerPush();
    const tokenA = JSON.parse(puts()[0].data).deviceToken;
    await act(async () => { await useAuthStore.getState().clearAuth('logout'); });
    await act(async () => { await useAuthStore.getState().enterGuest(); });
    await act(async () => { await useAuthStore.getState().setAuth({ ...member, userId: 2, accessToken: 'access-b' }); });
    await flush();

    expect(puts()).toHaveLength(2);
    expect(JSON.parse(puts()[1].data).deviceToken).not.toBe(tokenA);
    expect(puts()[1].headers.Authorization).toBe('Bearer access-b');
  });

  it('SDK가 폐기한 토큰을 다시 반환하면 새 회원에게 등록하지 않는다', async () => {
    jest.mocked(getToken).mockResolvedValue('reused-device');
    await registerPush();
    await act(async () => { await useAuthStore.getState().clearAuth(); });
    await act(async () => { await useAuthStore.getState().setAuth({ ...member, userId: 2 }); });
    await flush();
    expect(puts()).toHaveLength(1);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('cathori-push-reset-required', 'true');
  });
});

describe('기기 삭제 실패와 기존 회원 회귀', () => {
  it('서버 반납과 기기 삭제가 모두 실패하면 게스트와 다음 회원의 토큰 등록을 차단한다', async () => {
    await registerPush();
    transport.mockImplementation(async (config) => {
      if (config.method === 'delete' && config.url === '/api/users/device-token') {
        throw new Error('네트워크 오류');
      }
      return response(config, {});
    });
    jest.mocked(deleteToken).mockRejectedValue(new Error('FCM 삭제 실패'));
    const clearedMarkers = jest.mocked(AsyncStorage.removeItem).mock.calls.length;

    await act(async () => { await useAuthStore.getState().clearAuth('logout'); });
    expect(deletes()).toHaveLength(1);
    expect(deleteToken).toHaveBeenCalledWith(getMessaging());
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('cathori-push-reset-required', 'true');
    expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(clearedMarkers);
    expect(useAuthStore.getState().status).toBe('unauthenticated');

    await act(async () => { await useAuthStore.getState().enterGuest(); });
    expect(useAuthStore.getState().status).toBe('guest');
    expect(puts()).toHaveLength(1);

    await act(async () => { await useAuthStore.getState().setAuth({ ...member, userId: 2 }); });
    await flush();
    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(puts()).toHaveLength(1);
  });

  it('기기 삭제 실패를 기록하고 다음 회원 토큰 발급 전에 다시 삭제한다', async () => {
    await registerPush();
    jest.mocked(deleteToken).mockRejectedValueOnce(new Error('FCM 삭제 실패'));
    await act(async () => { await useAuthStore.getState().clearAuth(); });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('cathori-push-reset-required', 'true');
    const deletedBefore = jest.mocked(deleteToken).mock.calls.length;
    await act(async () => { await useAuthStore.getState().setAuth({ ...member, userId: 2 }); });
    await flush();
    expect(deleteToken).toHaveBeenCalledTimes(deletedBefore + 1);
    expect(puts()).toHaveLength(2);
  });

  it('재실행 후 남은 삭제 실패 표시를 읽고 삭제가 계속 실패하면 발급·등록하지 않는다', async () => {
    jest.mocked(AsyncStorage.getItem).mockImplementation(async (key) => key === 'cathori-push-reset-required' ? 'true' : null);
    jest.mocked(deleteToken).mockRejectedValue(new Error('FCM 삭제 실패'));
    const getsBefore = jest.mocked(getToken).mock.calls.length;
    await registerPush();
    expect(getToken).toHaveBeenCalledTimes(getsBefore);
    expect(puts()).toHaveLength(0);
  });

  it.each(['ios', 'android'] as const)('%s는 Firebase FCM으로 발급·삭제하고 Expo 토큰 발급을 섞지 않는다', async (os) => {
    jest.replaceProperty(Platform, 'OS', os);
    jest.mocked(registerDeviceForRemoteMessages).mockClear();
    jest.mocked(unregisterDeviceForRemoteMessages).mockClear();
    await registerPush();
    expect(getToken).toHaveBeenCalledWith(getMessaging());
    expect(Notifications.getDevicePushTokenAsync).not.toHaveBeenCalled();
    await act(async () => { await useAuthStore.getState().clearAuth(); });
    expect(deleteToken).toHaveBeenCalledWith(getMessaging());
    if (os === 'ios') {
      expect(registerDeviceForRemoteMessages).toHaveBeenCalled();
      expect(unregisterDeviceForRemoteMessages).toHaveBeenCalled();
    } else {
      expect(registerDeviceForRemoteMessages).not.toHaveBeenCalled();
      expect(unregisterDeviceForRemoteMessages).not.toHaveBeenCalled();
    }
  });

  it('회원 JWT 갱신 뒤 이미 등록된 푸시를 중복 등록하지 않고 알림 상세 이동을 유지한다', async () => {
    await registerPush();
    await act(async () => { await useAuthStore.getState().setTokens({ accessToken: 'renewed', refreshToken: 'renewed-refresh' }); });
    await flush();
    expect(puts()).toHaveLength(1);
    const listener = jest.mocked(Notifications.addNotificationResponseReceivedListener).mock.calls[0][0];
    listener({ notification: { request: { content: { data: { noticeId: '213' } } } } } as unknown as Notifications.NotificationResponse);
    expect(router.push).toHaveBeenCalledWith('/notice/213');
  });
});
