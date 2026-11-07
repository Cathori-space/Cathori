import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as SecureStore from 'expo-secure-store';
import { isCancel, type InternalAxiosRequestConfig } from 'axios';
import { router } from 'expo-router';
import { QueryObserver } from '@tanstack/react-query';

import apiClient from '@/src/services/api';
import publicApiClient from '@/src/services/publicApi';
import { fetchPublicNotices, fetchPublicSearchNotices, fetchPublicNoticeById, mapPublicNotice } from '@/src/services/publicNotices';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useNoticeFilterStore } from '@/src/store/useNoticeFilterStore';
import { useSearchHistoryStore } from '@/src/store/useSearchHistoryStore';
import { queryClient } from '@/src/lib/queryClient';
import { getSessionId } from '@/src/services/session';
import { cleanup, deferred, member, publicNotice, rejectStatus, response, transport } from './helpers';

beforeEach(cleanup);
afterEach(async () => { await cleanup(); jest.mocked(SecureStore.getItemAsync).mockResolvedValue(null); });

describe('명시적 인증 상태와 저장소', () => {
  it('토큰이 없으면 unauthenticated이며 게스트 선택은 재실행 후 복원하지 않는다', async () => {
    await useAuthStore.getState().initializeAuth();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
    await useAuthStore.getState().enterGuest();
    expect(useAuthStore.getState()).toMatchObject({ status: 'guest', accessToken: null, refreshToken: null });
    await useAuthStore.getState().initializeAuth();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });
  it('저장된 회원 토큰을 복원하고 명시적 게스트 진입으로 덮지 않는다', async () => {
    jest.mocked(SecureStore.getItemAsync).mockImplementation(async (key) => key.includes('refresh') ? 'saved-refresh' : 'saved-access');
    await useAuthStore.getState().initializeAuth();
    await useAuthStore.getState().enterGuest();
    expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', accessToken: 'saved-access', refreshToken: 'saved-refresh' });
  });
  it('게스트에서 로그인하면 캐시·필터·검색 기록을 제거한다', async () => {
    await useAuthStore.getState().enterGuest();
    const id = getSessionId();
    queryClient.setQueryData(['notices', null, null], { guest: true });
    queryClient.setQueryData(['notice', '213'], publicNotice);
    useNoticeFilterStore.setState({ selectedCategory: '장학', selectedTag: '이전 태그' });
    useSearchHistoryStore.getState().addEntry('이전 검색');
    await useAuthStore.getState().setAuth(member, id);
    expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', accessToken: 'access', tags: member.tags });
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(useNoticeFilterStore.getState()).toMatchObject({ selectedCategory: null, selectedTag: null });
    expect(useSearchHistoryStore.getState().history).toEqual([]);
    expect(SecureStore.setItemAsync).toHaveBeenCalled();
  });
  it('이전 로그인 응답은 새 세션을 인증하지 못한다', async () => {
    const id = getSessionId();
    await useAuthStore.getState().enterGuest();
    await expect(useAuthStore.getState().setAuth(member, id)).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    expect(useAuthStore.getState().status).toBe('guest');
  });
  it('토큰 저장 도중 로그아웃하면 늦은 저장이 인증 상태를 복구하지 못한다', async () => {
    const gate = deferred<void>();
    jest.mocked(SecureStore.setItemAsync).mockImplementationOnce(() => gate.promise);
    const login = useAuthStore.getState().setAuth(member).catch((e: unknown) => e);
    await Promise.resolve();
    const logout = useAuthStore.getState().clearAuth();
    gate.resolve();
    await Promise.all([login, logout]);
    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
  it('토큰 복원 실패를 자동 게스트 전환으로 처리하지 않는다', async () => {
    jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error('저장소 실패'));
    await expect(useAuthStore.getState().initializeAuth()).rejects.toThrow();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });
});

describe('공개 API 계약', () => {
  it('피드에서 카테고리와 0 기반 페이지를 보내고 개인화 필드는 로컬 기본값으로 매핑한다', async () => {
    transport.mockImplementation(async (config) => response(config, { content: [{ ...publicNotice, isBookmarked: true, tags: ['비공개'] }], page: 0, size: 20, hasNext: true }));
    const page = await fetchPublicNotices({ category: '장학', tags: '금지', page: 1, size: 20 });
    expect(transport.mock.calls[0][0].params).toEqual({ category: '장학', page: 0, size: 20 });
    expect(page).toMatchObject({ page: 1, hasNext: true });
    expect(page.content[0]).toMatchObject({ id: '213', isBookmarked: false, tags: [], aiSummaryStatus: 'SUCCESS', viewCount: 3 });
  });
  it('검색의 슬림 DTO와 hasNext를 보존한다', async () => {
    transport.mockImplementation(async (config) => response(config, { content: [publicNotice], page: 1, size: 10, hasNext: false }));
    const page = await fetchPublicSearchNotices({ q: '  장학%_! ', page: 2, size: 10 });
    expect(transport.mock.calls[0][0].params).toEqual({ q: '장학%_!', page: 1, size: 10 });
    expect(page).toMatchObject({ page: 2, hasNext: false });
    expect(page.content[0]).not.toHaveProperty('url');
    expect(page.content[0].isBookmarked).toBe(false);
  });
  it('상세의 저장된 AI 요약과 원문 링크를 매핑한다', async () => {
    transport.mockImplementation(async (config) => response(config, publicNotice));
    expect(await fetchPublicNoticeById('213')).toMatchObject({ aiSummary: publicNotice.aiSummary, url: publicNotice.url, isBookmarked: false });
  });
  it('알 수 없는 상태와 카테고리를 안전하게 정규화한다', () => {
    expect(mapPublicNotice({ ...publicNotice, category: '미지원', aiSummaryStatus: 'UNKNOWN' })).toMatchObject({ category: null, aiSummary: null, aiSummaryStatus: 'FAILED' });
  });
  it('회원 토큰과 수동 Authorization이 있어도 공개 요청에는 붙이지 않는다', async () => {
    await useAuthStore.getState().setAuth(member);
    await publicApiClient.get('/api/public/notices', { headers: { Authorization: 'Bearer manual' } });
    expect(transport.mock.calls[0][0].headers.has('Authorization')).toBe(false);
  });
  it.each([400, 401, 403, 404])('공개 API %i 응답은 재발급이나 강제 로그아웃을 일으키지 않는다', async (status) => {
    await useAuthStore.getState().setAuth(member);
    transport.mockImplementation((config) => rejectStatus(config, status));
    await expect(fetchPublicNoticeById('213')).rejects.toMatchObject({ response: { status } });
    expect(transport).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe('요청 취소와 기존 회원 재발급', () => {
  it('게스트 회원 API 요청은 서버 전송 전에 차단한다', async () => {
    await useAuthStore.getState().enterGuest();
    await expect(apiClient.get('/api/notifications')).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    await expect(apiClient.post('/api/notices/213/bookmark')).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    expect(transport).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe('guest');
  });
  it('로그인 실패는 게스트 상태와 복귀 가능성을 유지한다', async () => {
    await useAuthStore.getState().enterGuest();
    transport.mockImplementation((config) => rejectStatus(config, 401));
    await expect(apiClient.post('/api/auth/login', {})).rejects.toMatchObject({ response: { status: 401 } });
    expect(useAuthStore.getState().status).toBe('guest');
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it('세션 전환은 진행 요청을 취소하고 늦은 응답을 거부한다', async () => {
    await useAuthStore.getState().enterGuest();
    const gate = deferred<ReturnType<typeof response>>();
    let config!: InternalAxiosRequestConfig;
    transport.mockImplementation((request) => { config = request; return gate.promise; });
    const pending = fetchPublicNoticeById('213').catch((e: unknown) => e);
    await new Promise((r) => setTimeout(r, 0));
    await useAuthStore.getState().setAuth(member);
    expect(config.signal?.aborted).toBe(true);
    gate.resolve(response(config, publicNotice));
    expect(isCancel(await pending)).toBe(true);
  });
  it('TanStack Query 취소 신호가 실제 Axios 요청에 전달된다', async () => {
    const controller = new AbortController();
    const gate = deferred<ReturnType<typeof response>>();
    let config!: InternalAxiosRequestConfig;
    transport.mockImplementation((request) => { config = request; return gate.promise; });
    const pending = fetchPublicNoticeById('213', controller.signal).catch((e: unknown) => e);
    await new Promise((r) => setTimeout(r, 0));
    controller.abort();
    expect(config.signal?.aborted).toBe(true);
    gate.resolve(response(config, publicNotice));
    expect(isCancel(await pending)).toBe(true);
  });
  it('이전 쿼리 응답은 새 캐시에 복원되지 않는다', async () => {
    await useAuthStore.getState().enterGuest();
    const gate = deferred<ReturnType<typeof response>>();
    let config!: InternalAxiosRequestConfig;
    transport.mockImplementation((request) => { config = request; return gate.promise; });
    const observer = new QueryObserver(queryClient, { queryKey: ['notice', '213'], queryFn: ({ signal }) => fetchPublicNoticeById('213', signal) });
    const unsubscribe = observer.subscribe(() => {});
    await new Promise((r) => setTimeout(r, 0));
    await useAuthStore.getState().setAuth(member);
    unsubscribe();
    gate.resolve(response(config, publicNotice));
    await new Promise((r) => setTimeout(r, 0));
    expect(queryClient.getQueryData(['notice', '213'])).toBeUndefined();
  });
  it('동시 401은 재발급 한 번과 새 JWT로 재시도한다', async () => {
    await useAuthStore.getState().setAuth(member);
    transport.mockImplementation(async (config) => {
      if (config.url === '/api/auth/reissue') {
        await new Promise((r) => setTimeout(r, 5));
        expect(config.headers.has('Authorization')).toBe(false);
        return response(config, { accessToken: 'new-access', refreshToken: 'new-refresh' });
      }
      return config.headers.Authorization === 'Bearer new-access' ? response(config, { ok: true }) : rejectStatus(config, 401);
    });
    await Promise.all([apiClient.get('/api/notices'), apiClient.get('/api/notifications')]);
    expect(transport.mock.calls.filter(([config]) => config.url === '/api/auth/reissue')).toHaveLength(1);
    expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', accessToken: 'new-access', refreshToken: 'new-refresh' });
  });
  it('재발급을 기다리는 동안 취소된 쿼리는 회원 API를 재시도하지 않는다', async () => {
    await useAuthStore.getState().setAuth(member);
    const controller = new AbortController();
    const gate = deferred<ReturnType<typeof response>>();
    let refreshConfig!: InternalAxiosRequestConfig;
    transport.mockImplementation((config) => {
      if (config.url === '/api/auth/reissue') { refreshConfig = config; return gate.promise; }
      return rejectStatus(config, 401);
    });
    const pending = apiClient.get('/api/notices', { signal: controller.signal }).catch((e: unknown) => e);
    await new Promise((r) => setTimeout(r, 0));
    controller.abort();
    gate.resolve(response(refreshConfig, { accessToken: 'new', refreshToken: 'new-refresh' }));
    expect(isCancel(await pending)).toBe(true);
    expect(transport.mock.calls.filter(([config]) => config.url === '/api/notices')).toHaveLength(1);
    expect(useAuthStore.getState().status).toBe('authenticated');
  });
  it('재발급 실패는 unauthenticated로 끝나고 게스트가 되지 않는다', async () => {
    await useAuthStore.getState().setAuth(member);
    transport.mockImplementation((config) => rejectStatus(config, 401));
    await expect(apiClient.get('/api/notices')).rejects.toBeDefined();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(router.replace).toHaveBeenCalledWith('/login');
  });
  it('이전 재발급 응답이나 실패가 새 회원 세션을 덮거나 종료하지 않는다', async () => {
    await useAuthStore.getState().setAuth(member);
    const gate = deferred<ReturnType<typeof response>>();
    let refreshConfig!: InternalAxiosRequestConfig;
    transport.mockImplementation((config) => {
      if (config.url === '/api/auth/reissue') { refreshConfig = config; return gate.promise; }
      return rejectStatus(config, 401);
    });
    const pending = apiClient.get('/api/notices').catch((e: unknown) => e);
    await new Promise((r) => setTimeout(r, 0));
    await useAuthStore.getState().clearAuth();
    await useAuthStore.getState().setAuth({ ...member, accessToken: 'other', userId: 2 });
    gate.resolve(response(refreshConfig, { accessToken: 'old-refresh', refreshToken: 'old' }));
    await pending;
    expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', accessToken: 'other', user: { userId: 2 } });
    expect(router.replace).not.toHaveBeenCalled();
  });
});
