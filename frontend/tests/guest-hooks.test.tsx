import { act, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import type { InfiniteData } from '@tanstack/react-query';

import { useNotices } from '@/src/features/notices/hooks/useNotices';
import { useSearchNotices } from '@/src/features/search/hooks/useSearchNotices';
import { useNoticeDetail } from '@/src/features/notices/hooks/useNoticeDetail';
import { useBookmarkedNotices } from '@/src/features/notices/hooks/useBookmarkedNotices';
import { useToggleBookmark } from '@/src/features/notices/hooks/useToggleBookmark';
import { useHasNotifications, useNotifications, useMarkNotificationRead, useDeleteNotification } from '@/src/features/notifications/hooks/useNotifications';
import { useCreateTag, useDeleteTag, useRefreshTags } from '@/src/features/settings/hooks/useTags';
import { usePushNotifications } from '@/src/features/notifications/hooks/usePushNotifications';
import { useLogin } from '@/src/features/auth/hooks/useLogin';
import { useRegister } from '@/src/features/auth/hooks/useRegister';
import { queryClient } from '@/src/lib/queryClient';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useMembershipPromptStore } from '@/src/store/useMembershipPromptStore';
import { mapPublicNotice } from '@/src/services/publicNotices';
import type { Notice, PageResponse } from '@/src/types/api';
import { cleanup, deferred, flush, member, publicNotice, rejectStatus, renderHook, response, transport } from './helpers';

beforeEach(cleanup);
afterEach(async () => {
  await cleanup();
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ status: 'granted' } as Notifications.NotificationPermissionsStatus);
});
async function guest() { await act(async () => { await useAuthStore.getState().enterGuest(); }); }
async function authenticate() { await act(async () => { await useAuthStore.getState().setAuth(member); }); }

describe('공개 공지 훅', () => {
  it('게스트 피드의 페이지 추가와 카테고리 변경이 공개 API로만 전달된다', async () => {
    await guest();
    transport.mockImplementation(async (config) => response(config, {
      content: [{ ...publicNotice, noticeId: String(config.params.page + 1) }], page: config.params.page,
      size: 20, hasNext: config.params.page === 0,
    }));
    const h = await renderHook(() => {
      const [category, setCategory] = useState<'장학' | '학사'>('장학');
      return { ...useNotices({ category, tag: '이전 회원 태그' }), setCategory };
    });
    expect(h.current.data?.pages[0].content[0].isBookmarked).toBe(false);
    await act(async () => { await h.current.fetchNextPage(); });
    await flush();
    expect(h.current.data?.pages).toHaveLength(2);
    expect(h.current.hasNextPage).toBe(false);
    await act(async () => { h.current.setCategory('학사'); });
    await flush();
    expect(transport.mock.calls.map(([c]) => c.url)).toEqual(['/api/public/notices', '/api/public/notices', '/api/public/notices']);
    expect(transport.mock.calls[2][0].params).toEqual({ category: '학사', page: 0, size: 20 });
  });
  it('게스트 검색과 상세는 공개 API를 사용한다', async () => {
    await guest();
    transport.mockImplementation(async (config) => response(config, config.url?.endsWith('/search')
      ? { content: [publicNotice], page: 0, size: 20, hasNext: false } : publicNotice));
    const search = await renderHook(() => useSearchNotices(' 장학 '));
    const detail = await renderHook(() => useNoticeDetail('213'));
    expect(search.current.data?.pages[0].content[0].title).toBe(publicNotice.title);
    expect(detail.current.data?.aiSummary).toBe(publicNotice.aiSummary);
    expect(transport.mock.calls.map(([c]) => c.url)).toEqual(['/api/public/notices/search', '/api/public/notices/213']);
  });
  it('빈 검색어·101자 검색어·유효하지 않은 ID는 요청하지 않는다', async () => {
    await guest();
    await renderHook(() => { useSearchNotices(' '); useSearchNotices('가'.repeat(101)); useNoticeDetail('-1'); useNoticeDetail('0'); });
    expect(transport).not.toHaveBeenCalled();
  });
  it('회원 피드·검색·상세는 기존 회원 API와 JWT를 사용한다', async () => {
    await authenticate();
    transport.mockImplementation(async (config) => response(config, config.url?.endsWith('/213')
      ? { ...publicNotice, isBookmarked: true } : { content: [{ ...publicNotice, isBookmarked: true }], page: 0, size: 20, hasNext: false }));
    const h = await renderHook(() => ({
      feed: useNotices({ category: null, tag: '장학금' }), search: useSearchNotices('장학'), detail: useNoticeDetail('213'),
    }));
    expect(h.current.detail.data?.isBookmarked).toBe(true);
    expect(transport.mock.calls.map(([c]) => c.url).sort()).toEqual(['/api/notices', '/api/notices/213', '/api/notices/search']);
    expect(transport.mock.calls.every(([c]) => c.headers.Authorization === 'Bearer access')).toBe(true);
    expect(transport.mock.calls.find(([c]) => c.url === '/api/notices')?.[0].params.tags).toBe('장학금');
  });
});

describe('회원 전용 조회와 낙관적 변경', () => {
  it('게스트 홈에서 알림 상태·목록·북마크·태그 새로고침을 조회하지 않는다', async () => {
    await guest();
    const h = await renderHook(() => {
      useHasNotifications(); useNotifications(); useBookmarkedNotices(); return useRefreshTags();
    });
    await act(async () => { await h.current.refreshTags(); });
    expect(transport).not.toHaveBeenCalled();
  });
  it('게스트 북마크는 가입 안내만 열고 캐시를 변경하지 않는다', async () => {
    await guest();
    const cached = mapPublicNotice(publicNotice);
    queryClient.setQueryData(['notice', '213'], cached);
    const h = await renderHook(useToggleBookmark);
    await act(async () => { h.current.mutate('213'); });
    expect(useMembershipPromptStore.getState().visible).toBe(true);
    expect(queryClient.getQueryData(['notice', '213'])).toEqual(cached);
    expect(transport).not.toHaveBeenCalled();
  });
  it('게스트 태그·알림 mutation은 API와 낙관적 업데이트 전에 차단한다', async () => {
    await guest();
    const h = await renderHook(() => ({ create: useCreateTag(), remove: useDeleteTag(), read: useMarkNotificationRead(), deleteAlert: useDeleteNotification() }));
    await act(async () => {
      await expect(h.current.create.mutateAsync('장학')).rejects.toThrow('회원 전용');
      await expect(h.current.remove.mutateAsync(1)).rejects.toThrow('회원 전용');
      await expect(h.current.read.mutateAsync(1)).rejects.toThrow('회원 전용');
      await expect(h.current.deleteAlert.mutateAsync(1)).rejects.toThrow('회원 전용');
    });
    expect(useAuthStore.getState().tags).toEqual([]);
    expect(transport).not.toHaveBeenCalled();
  });
  it('회원 북마크 성공은 상세·피드의 개인화 상태를 갱신한다', async () => {
    await authenticate();
    const cached = mapPublicNotice(publicNotice);
    queryClient.setQueryData(['notice', '213'], cached);
    queryClient.setQueryData(['notices', null, null], { pages: [{ content: [cached], page: 1, size: 20, hasNext: false }], pageParams: [1] });
    transport.mockImplementation(async (config) => response(config, { noticeId: '213', isBookmarked: true }));
    const h = await renderHook(useToggleBookmark);
    await act(async () => { await h.current.mutateAsync('213'); });
    expect(queryClient.getQueryData<Notice>(['notice', '213'])?.isBookmarked).toBe(true);
    expect(queryClient.getQueryData<InfiniteData<PageResponse<Notice>>>(['notices', null, null])?.pages[0].content[0].isBookmarked).toBe(true);
  });
  it('회원 태그 추가·삭제는 기존 개인화 상태에 반영한다', async () => {
    await authenticate();
    transport.mockImplementation(async (config) => response(config, { tagId: 2, tagName: '등록' }));
    const h = await renderHook(() => ({ create: useCreateTag(), remove: useDeleteTag() }));
    await act(async () => { await h.current.create.mutateAsync('등록'); });
    expect(useAuthStore.getState().tags).toContainEqual({ tagId: 2, tagName: '등록' });
    await act(async () => { await h.current.remove.mutateAsync(2); });
    expect(useAuthStore.getState().tags).toEqual(member.tags);
    expect(transport.mock.calls.map(([c]) => c.url)).toEqual(['/api/tags', '/api/tags/2']);
  });
  it('회원 알림의 읽음·삭제는 기존 캐시를 갱신한다', async () => {
    await authenticate();
    const page = { alerts: [{ alertHistoryId: 1, isRead: false }], nextCursor: null, hasNext: false };
    queryClient.setQueryData(['notifications'], { pages: [page], pageParams: [null] });
    const h = await renderHook(() => ({ read: useMarkNotificationRead(), remove: useDeleteNotification() }));
    await act(async () => { await h.current.read.mutateAsync(1); });
    expect(queryClient.getQueryData(['notifications'])).toMatchObject({ pages: [{ alerts: [{ alertHistoryId: 1, isRead: true }] }] });
    await act(async () => { await h.current.remove.mutateAsync(1); });
    expect(queryClient.getQueryData(['notifications'])).toMatchObject({ pages: [{ alerts: [] }] });
    expect(transport.mock.calls.map(([c]) => c.url)).toEqual(['/api/notifications/1/read', '/api/notifications/1']);
  });
  it('이전 회원의 태그 mutation 실패가 다음 회원의 태그를 롤백하지 않는다', async () => {
    await authenticate();
    const gate = deferred<never>();
    transport.mockImplementation((config) => config.url === '/api/tags' ? gate.promise : Promise.resolve(response(config, {})));
    const h = await renderHook(useCreateTag);
    let pending!: Promise<unknown>;
    await act(async () => { pending = h.current.mutateAsync('새 태그').catch((e: unknown) => e); });
    expect(useAuthStore.getState().tags.some((t) => t.tagName === '새 태그')).toBe(true);
    await act(async () => { await useAuthStore.getState().setAuth({ ...member, userId: 2, tags: [{ tagId: 2, tagName: '다음 회원' }] }); });
    gate.reject(new Error('이전 요청 실패'));
    await act(async () => { await pending; });
    expect(useAuthStore.getState().tags).toEqual([{ tagId: 2, tagName: '다음 회원' }]);
  });
});

describe('로그인·회원가입 전환', () => {
  it('게스트 로그인 성공은 회원 상태와 프로필을 반영한다', async () => {
    await guest();
    transport.mockImplementation(async (config) => response(config, member));
    const h = await renderHook(useLogin);
    await act(async () => { await h.current.loginAsync({ email: member.email, password: 'password' }); });
    expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', user: { userId: 1 }, tags: member.tags });
  });
  it('게스트 로그인 실패는 상태를 유지한다', async () => {
    await guest();
    transport.mockImplementation((config) => rejectStatus(config, 401, { code: 'USER_INVALID_PASSWORD' }));
    const h = await renderHook(useLogin);
    await act(async () => { await h.current.loginAsync({ email: member.email, password: 'wrong' }).catch(() => {}); });
    expect(useAuthStore.getState().status).toBe('guest');
  });
  it('회원가입 이후 기존 자동 로그인을 유지한다', async () => {
    await guest();
    transport.mockImplementation(async (config) => response(config, config.url === '/api/auth/register' ? { userId: 1, email: member.email } : member));
    const h = await renderHook(useRegister);
    await act(async () => { await h.current.registerAsync({ email: member.email, password: 'password', major1: member.major, major2: null, grade: 1, status: '재학' }); });
    expect(transport.mock.calls.map(([c]) => c.url)).toEqual(['/api/auth/register', '/api/auth/login']);
    expect(useAuthStore.getState().status).toBe('authenticated');
  });
});

describe('푸시 알림 제한', () => {
  it('게스트는 권한·토큰·알림 탭 리스너를 등록하지 않는다', async () => {
    await guest();
    await renderHook(usePushNotifications);
    expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(Notifications.addNotificationResponseReceivedListener).not.toHaveBeenCalled();
    expect(transport).not.toHaveBeenCalled();
  });
  it('회원 전환 뒤 권한 확인과 토큰 등록을 시작한다', async () => {
    await guest();
    await renderHook(usePushNotifications);
    await authenticate();
    await flush();
    expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
    expect(transport.mock.calls.some(([c]) => c.url === '/api/users/device-token' && c.method === 'put')).toBe(true);
  });
  it('회원 토큰 재발급은 이미 완료한 푸시 등록을 반복하지 않는다', async () => {
    await authenticate();
    await renderHook(usePushNotifications);
    await flush();
    await act(async () => { await useAuthStore.getState().setTokens({ accessToken: 'renewed', refreshToken: 'renewed-refresh' }); });
    await flush();
    expect(transport.mock.calls.filter(([c]) => c.url === '/api/users/device-token')).toHaveLength(1);
  });
  it('회원의 알림 탭은 기존 상세 이동을 유지한다', async () => {
    await authenticate();
    await renderHook(usePushNotifications);
    const listener = jest.mocked(Notifications.addNotificationResponseReceivedListener).mock.calls[0][0];
    listener({ notification: { request: { content: { data: { noticeId: '213' } } } } } as unknown as Notifications.NotificationResponse);
    expect(router.push).toHaveBeenCalledWith('/notice/213');
  });
  it('권한 확인 중 로그아웃하면 뒤늦게 권한을 요청하거나 토큰을 등록하지 않는다', async () => {
    await authenticate();
    const gate = deferred<Notifications.NotificationPermissionsStatus>();
    jest.mocked(Notifications.getPermissionsAsync).mockReturnValueOnce(gate.promise);
    await renderHook(usePushNotifications);
    await act(async () => { await useAuthStore.getState().clearAuth(); await useAuthStore.getState().enterGuest(); });
    gate.resolve({ status: 'undetermined' } as Notifications.NotificationPermissionsStatus);
    await flush();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(transport.mock.calls.filter(([c]) => c.method !== 'delete')).toHaveLength(0);
  });
  it('이전 세션의 알림 탭 콜백은 게스트 화면을 이동하지 않는다', async () => {
    await authenticate();
    await renderHook(usePushNotifications);
    const listener = jest.mocked(Notifications.addNotificationResponseReceivedListener).mock.calls[0][0];
    await act(async () => { await useAuthStore.getState().clearAuth(); await useAuthStore.getState().enterGuest(); });
    listener({ notification: { request: { content: { data: { noticeId: '213' } } } } } as unknown as Notifications.NotificationResponse);
    expect(router.push).not.toHaveBeenCalled();
  });
});
