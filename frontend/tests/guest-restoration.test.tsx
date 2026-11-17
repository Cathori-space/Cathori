import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as SecureStore from 'expo-secure-store';

import RootLayout from '@/app/_layout';
import apiClient from '@/src/services/api';
import { saveGuestSelection } from '@/src/services/guestSelectionStorage';
import { useAuthStore } from '@/src/store/useAuthStore';
import { cleanup, deferred, member, rejectStatus, render, transport } from './helpers';

const GUEST_SELECTION_KEY = 'cathori.auth.guest-selected';
let storage: Map<string, string>;

beforeEach(async () => {
  await cleanup();
  storage = new Map();
  jest.mocked(AsyncStorage.getItem).mockImplementation(async (key) => storage.get(key) ?? null);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => { storage.set(key, value); });
  jest.mocked(AsyncStorage.removeItem).mockImplementation(async (key) => { storage.delete(key); });
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async (key) => storage.get(key) ?? null);
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => { storage.set(key, value); });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async (key) => { storage.delete(key); });
});

afterEach(async () => {
  await cleanup();
  jest.mocked(AsyncStorage.getItem).mockReset().mockResolvedValue(null);
  jest.mocked(AsyncStorage.setItem).mockReset().mockResolvedValue();
  jest.mocked(AsyncStorage.removeItem).mockReset().mockResolvedValue();
  jest.mocked(SecureStore.getItemAsync).mockReset().mockResolvedValue(null);
  jest.mocked(SecureStore.setItemAsync).mockReset().mockResolvedValue();
  jest.mocked(SecureStore.deleteItemAsync).mockReset().mockResolvedValue();
});

describe('게스트 선택의 재실행 복원', () => {
  it('새 인증 스토어에서도 저장된 게스트 선택을 토큰 없이 복원한다', async () => {
    await useAuthStore.getState().enterGuest();
    expect(storage.get(GUEST_SELECTION_KEY)).toBe('true');

    let restartedStore!: typeof useAuthStore;
    jest.isolateModules(() => {
      restartedStore = jest.requireActual<typeof import('@/src/store/useAuthStore')>('@/src/store/useAuthStore').useAuthStore;
    });
    await restartedStore.persist.rehydrate();
    expect(restartedStore.getState().status).toBe('initializing');
    await restartedStore.getState().initializeAuth();

    expect(restartedStore.getState()).toMatchObject({
      status: 'guest', accessToken: null, refreshToken: null, user: null, tags: [],
    });
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it.each([null, 'false', 'invalid'])('게스트 선택 기록이 %s이면 로그인 대기 상태로 시작한다', async (value) => {
    if (value !== null) storage.set(GUEST_SELECTION_KEY, value);
    await useAuthStore.getState().initializeAuth();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  it('게스트 기록이 함께 있어도 저장된 회원 토큰을 우선 복원한다', async () => {
    await saveGuestSelection();
    storage.set('cathori.auth.access-token', 'saved-access');
    storage.set('cathori.auth.refresh-token', 'saved-refresh');
    await useAuthStore.getState().initializeAuth();
    expect(useAuthStore.getState()).toMatchObject({
      status: 'authenticated', accessToken: 'saved-access', refreshToken: 'saved-refresh',
    });
    expect(storage.has(GUEST_SELECTION_KEY)).toBe(false);
  });

  it('게스트 선택 저장에 실패하면 게스트 진입을 완료하지 않는다', async () => {
    const setItem = jest.mocked(AsyncStorage.setItem).getMockImplementation()!;
    jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {
      if (key === GUEST_SELECTION_KEY) throw new Error('게스트 저장 실패');
      await setItem(key, value);
    });
    await expect(useAuthStore.getState().enterGuest()).rejects.toThrow('게스트 저장 실패');
    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(storage.has(GUEST_SELECTION_KEY)).toBe(false);
  });

  it('회원 토큰을 읽지 못하면 저장된 게스트로 자동 전환하지 않는다', async () => {
    await saveGuestSelection();
    jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error('토큰 읽기 실패'));
    await expect(useAuthStore.getState().initializeAuth()).rejects.toThrow('토큰 읽기 실패');
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  it('로그아웃 뒤에 도착한 게스트 복원 결과는 적용하지 않는다', async () => {
    const gate = deferred<string | null>();
    const started = deferred<void>();
    jest.mocked(AsyncStorage.getItem).mockImplementation(async (key) => {
      if (key !== GUEST_SELECTION_KEY) return storage.get(key) ?? null;
      started.resolve();
      return gate.promise;
    });
    const restore = useAuthStore.getState().initializeAuth().catch((error: unknown) => error);
    await started.promise;
    const logout = useAuthStore.getState().clearAuth();
    gate.resolve('true');
    expect(await restore).toMatchObject({ code: 'ERR_CANCELED' });
    await logout;
    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(storage.has(GUEST_SELECTION_KEY)).toBe(false);
  });

  it('루트 화면은 저장된 게스트를 복원하고 공개 화면만 허용한다', async () => {
    await saveGuestSelection();
    const tree = await render(<RootLayout />);
    const screens = tree.root.findAll((node) => String(node.type) === 'StackScreen').map((node) => node.props.name);
    expect(useAuthStore.getState().status).toBe('guest');
    expect(screens).toEqual(expect.arrayContaining(['(tabs)', 'notice/[id]']));
    expect(screens).not.toEqual(expect.arrayContaining(['bookmark/index']));
    expect(screens).not.toEqual(expect.arrayContaining(['notification/index']));
    expect(screens).not.toEqual(expect.arrayContaining(['settings/keywords']));
  });
});

describe('회원 전환 시 게스트 선택 기록 정리', () => {
  it('로그인 성공 후 회원 토큰이 사라져도 예전 게스트로 복원하지 않는다', async () => {
    await useAuthStore.getState().enterGuest();
    await useAuthStore.getState().setAuth(member);
    expect(storage.has(GUEST_SELECTION_KEY)).toBe(false);
    expect(useAuthStore.getState().status).toBe('authenticated');

    storage.delete('cathori.auth.access-token');
    storage.delete('cathori.auth.refresh-token');
    await useAuthStore.getState().initializeAuth();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  it('명시적으로 인증을 종료하면 게스트 선택 기록도 삭제한다', async () => {
    await useAuthStore.getState().enterGuest();
    await useAuthStore.getState().clearAuth();
    await useAuthStore.getState().initializeAuth();
    expect(storage.has(GUEST_SELECTION_KEY)).toBe(false);
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  it('토큰 삭제가 실패해도 게스트 선택 기록 정리는 실행한다', async () => {
    await useAuthStore.getState().enterGuest();
    jest.mocked(SecureStore.deleteItemAsync).mockRejectedValueOnce(new Error('토큰 삭제 실패'));
    await expect(useAuthStore.getState().clearAuth()).rejects.toThrow('토큰 삭제 실패');
    expect(storage.has(GUEST_SELECTION_KEY)).toBe(false);
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  it('로그인 API 실패 시 게스트 선택을 유지하고 다시 복원할 수 있다', async () => {
    await useAuthStore.getState().enterGuest();
    transport.mockImplementation((config) => rejectStatus(config, 401));
    await expect(apiClient.post('/api/auth/login', {})).rejects.toMatchObject({ response: { status: 401 } });
    expect(storage.get(GUEST_SELECTION_KEY)).toBe('true');
    expect(useAuthStore.getState().status).toBe('guest');
    await useAuthStore.getState().initializeAuth();
    expect(useAuthStore.getState().status).toBe('guest');
  });

  it('인증 갱신 실패로 종료되면 남은 게스트 기록도 제거한다', async () => {
    await useAuthStore.getState().setAuth(member);
    await saveGuestSelection();
    transport.mockImplementation((config) => rejectStatus(config, 401));
    await expect(apiClient.get('/api/notices')).rejects.toBeDefined();
    await useAuthStore.getState().initializeAuth();
    expect(storage.has(GUEST_SELECTION_KEY)).toBe(false);
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  it('게스트 기록을 읽지 못하면 자동 게스트 복원 대신 오류로 종료한다', async () => {
    await saveGuestSelection();
    jest.mocked(AsyncStorage.getItem).mockImplementation(async (key) => {
      if (key === GUEST_SELECTION_KEY) throw new Error('게스트 기록 읽기 실패');
      return storage.get(key) ?? null;
    });
    await expect(useAuthStore.getState().initializeAuth()).rejects.toThrow('게스트 기록 읽기 실패');
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  it('게스트 저장 도중 로그아웃과 로그인이 이어져도 이전 기록이 남지 않는다', async () => {
    const gate = deferred<void>();
    const started = deferred<void>();
    const setItem = jest.mocked(AsyncStorage.setItem).getMockImplementation()!;
    jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {
      if (key === GUEST_SELECTION_KEY) {
        started.resolve();
        await gate.promise;
      }
      await setItem(key, value);
    });
    const enterGuest = useAuthStore.getState().enterGuest().catch((error: unknown) => error);
    await started.promise;
    const logout = useAuthStore.getState().clearAuth();
    const login = useAuthStore.getState().setAuth(member);
    gate.resolve();
    expect(await enterGuest).toMatchObject({ code: 'ERR_CANCELED' });
    await Promise.all([logout, login]);
    expect(storage.has(GUEST_SELECTION_KEY)).toBe(false);
    expect(storage.get('cathori.auth.access-token')).toBe(member.accessToken);
    expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', user: { userId: member.userId } });
  });
});
