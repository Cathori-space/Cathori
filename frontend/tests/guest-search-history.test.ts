import AsyncStorage from '@react-native-async-storage/async-storage';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as SecureStore from 'expo-secure-store';

import apiClient from '@/src/services/api';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useGuestSearchHistoryStore, useSearchHistoryStore } from '@/src/store/useSearchHistoryStore';
import { cleanup, deferred, member, rejectStatus, transport } from './helpers';

const MEMBER_KEY = 'cathori-search-history';
const GUEST_KEY = 'cathori-guest-search-history';
let storage: Map<string, string>;
const flush = () => Promise.all([
  useSearchHistoryStore.getState().flush(),
  useGuestSearchHistoryStore.getState().flush(),
]);

beforeEach(async () => {
  await cleanup();
  storage = new Map();
  jest.mocked(AsyncStorage.getItem).mockImplementation(async (key) => storage.get(key) ?? null);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => { storage.set(key, value); });
  jest.mocked(AsyncStorage.removeItem).mockImplementation(async (key) => { storage.delete(key); });
});

afterEach(async () => {
  await cleanup();
  jest.mocked(AsyncStorage.getItem).mockReset().mockResolvedValue(null);
  jest.mocked(AsyncStorage.setItem).mockReset().mockResolvedValue();
  jest.mocked(AsyncStorage.removeItem).mockReset().mockResolvedValue();
});

function restartHistoryStores() {
  let stores!: typeof import('@/src/store/useSearchHistoryStore');
  jest.isolateModules(() => {
    stores = jest.requireActual<typeof stores>('@/src/store/useSearchHistoryStore');
  });
  return stores;
}

describe('게스트 최근 검색어 저장과 격리', () => {
  it('재실행 후 게스트 검색어와 기존 회원 검색어를 각각의 저장소에서 복원한다', async () => {
    useGuestSearchHistoryStore.getState().addEntry('장학');
    useSearchHistoryStore.getState().addEntry('컴퓨터정보공학부');
    await flush();
    const restarted = restartHistoryStores();
    await Promise.all([
      restarted.useGuestSearchHistoryStore.persist.rehydrate(),
      restarted.useSearchHistoryStore.persist.rehydrate(),
    ]);
    expect(restarted.useGuestSearchHistoryStore.getState().history).toEqual(['장학']);
    expect(restarted.useSearchHistoryStore.getState().history).toEqual(['컴퓨터정보공학부']);
  });

  it('게스트 최근 검색어는 중복을 맨 앞으로 옮기고 최대 10개만 보관한다', () => {
    const guest = useGuestSearchHistoryStore.getState();
    for (let i = 0; i < 11; i++) guest.addEntry(`공지${i}`);
    guest.addEntry('  공지5  ');
    guest.addEntry('   ');
    const history = useGuestSearchHistoryStore.getState().history;
    expect(history).toHaveLength(10);
    expect(history[0]).toBe('공지5');
    expect(history.filter((keyword) => keyword === '공지5')).toHaveLength(1);
    expect(history).not.toContain('공지0');
    expect(useSearchHistoryStore.getState().history).toEqual([]);
  });

  it('개별 삭제와 전체 삭제는 재실행 뒤에도 유지된다', async () => {
    const guest = useGuestSearchHistoryStore.getState();
    guest.addEntry('장학');
    guest.addEntry('학사');
    guest.removeEntry('장학');
    await guest.flush();
    const restarted = restartHistoryStores().useGuestSearchHistoryStore;
    await restarted.persist.rehydrate();
    expect(restarted.getState().history).toEqual(['학사']);
    restarted.getState().clearAll();
    await restarted.getState().flush();
    const cleared = restartHistoryStores().useGuestSearchHistoryStore;
    await cleared.persist.rehydrate();
    expect(cleared.getState().history).toEqual([]);
  });

  it('게스트 → A → 로그아웃 → 게스트 → B 전환 시 이전 검색어를 넘기지 않는다', async () => {
    await useAuthStore.getState().enterGuest();
    useGuestSearchHistoryStore.getState().addEntry('게스트 검색');
    await useAuthStore.getState().setAuth(member);
    expect(useGuestSearchHistoryStore.getState().history).toEqual([]);
    expect(useSearchHistoryStore.getState().history).toEqual([]);
    useSearchHistoryStore.getState().addEntry('A 검색');
    await useAuthStore.getState().clearAuth();
    await useAuthStore.getState().enterGuest();
    expect(useGuestSearchHistoryStore.getState().history).toEqual([]);
    expect(useSearchHistoryStore.getState().history).toEqual([]);
    useGuestSearchHistoryStore.getState().addEntry('새 게스트 검색');
    await useAuthStore.getState().setAuth({ ...member, userId: 2, accessToken: 'B-access' });
    expect(useGuestSearchHistoryStore.getState().history).toEqual([]);
    expect(useSearchHistoryStore.getState().history).toEqual([]);
    expect(JSON.parse(storage.get(MEMBER_KEY)!).state.history).toEqual([]);
    expect(JSON.parse(storage.get(GUEST_KEY)!).state.history).toEqual([]);
  });

  it('로그인 API 실패 시 게스트 검색 기록을 유지한다', async () => {
    await useAuthStore.getState().enterGuest();
    useGuestSearchHistoryStore.getState().addEntry('장학');
    transport.mockImplementation((config) => rejectStatus(config, 401));
    await expect(apiClient.post('/api/auth/login', {})).rejects.toBeDefined();
    expect(useGuestSearchHistoryStore.getState().history).toEqual(['장학']);
  });

  it('검색 기록 삭제가 실패하면 새 회원 인증을 완료하지 않는다', async () => {
    await useAuthStore.getState().enterGuest();
    useGuestSearchHistoryStore.getState().addEntry('이전 검색');
    await flush();
    const setItem = jest.mocked(AsyncStorage.setItem).getMockImplementation()!;
    jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {
      if (key === GUEST_KEY) throw new Error('검색 기록 삭제 실패');
      await setItem(key, value);
    });
    await expect(useAuthStore.getState().setAuth(member)).rejects.toThrow('검색 기록 삭제 실패');
    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    jest.mocked(AsyncStorage.setItem).mockImplementation(setItem);
  });

  it('세션 정리 후 늦게 도착한 초기 복원 결과가 이전 회원 기록을 되살리지 않는다', async () => {
    const gate = deferred<string | null>();
    const started = deferred<void>();
    jest.mocked(AsyncStorage.getItem).mockImplementation(async (key) => {
      if (key !== MEMBER_KEY) return null;
      started.resolve();
      return gate.promise;
    });
    const restarted = restartHistoryStores().useSearchHistoryStore;
    const hydration = restarted.persist.rehydrate();
    await started.promise;
    restarted.getState().clearAll();
    gate.resolve(JSON.stringify({ state: { history: ['이전 회원 검색'] }, version: 0 }));
    await hydration;
    expect(restarted.getState().history).toEqual([]);
    await restarted.getState().flush();
  });

  it('늦은 검색어 저장보다 세션 전환 시 기록 삭제가 나중에 반영된다', async () => {
    await useAuthStore.getState().enterGuest();
    const gate = deferred<void>();
    const started = deferred<void>();
    const setItem = jest.mocked(AsyncStorage.setItem).getMockImplementation()!;
    jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {
      if (key === GUEST_KEY && JSON.parse(value).state.history.length > 0) {
        started.resolve();
        await gate.promise;
      }
      await setItem(key, value);
    });
    useGuestSearchHistoryStore.getState().addEntry('이전 게스트 검색');
    await started.promise;
    let completed = false;
    const login = useAuthStore.getState().setAuth(member).then(() => { completed = true; });
    await Promise.resolve();
    expect(completed).toBe(false);
    gate.resolve();
    await login;
    expect(JSON.parse(storage.get(GUEST_KEY)!).state.history).toEqual([]);
    expect(useAuthStore.getState().status).toBe('authenticated');
  });
});
