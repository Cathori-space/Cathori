import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { queryClient } from '@/src/lib/queryClient';
import { assertCurrentSession, getSessionId, rotateSession } from '@/src/services/session';
import { clearTokens, getTokens, saveTokens } from '@/src/services/tokenStorage';
import { startPushSession, stopPushSession, type PushCleanupResult } from '@/src/services/pushToken';
import { useMembershipPromptStore } from '@/src/store/useMembershipPromptStore';
import { useNoticeFilterStore } from '@/src/store/useNoticeFilterStore';
import { useSearchHistoryStore } from '@/src/store/useSearchHistoryStore';
import type { AuthUser, LoginResponse, ReissueResponse, UserTag } from '@/src/types/auth';

export type AuthStatus = 'initializing' | 'unauthenticated' | 'guest' | 'authenticated';

interface AuthState {
  status: AuthStatus;
  sessionId: number;
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  tags: UserTag[];
  setAuth: (response: LoginResponse, expectedSession?: number) => Promise<void>;
  setTokens: (tokens: ReissueResponse, expectedSession?: number) => Promise<void>;
  clearAuth: (reason?: 'logout' | 'expired' | 'withdrawal') => Promise<PushCleanupResult>;
  enterGuest: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  updateTags: (tags: UserTag[]) => void;
}

const EMPTY_AUTH = { accessToken: null, refreshToken: null, user: null, tags: [] as UserTag[] };

// 저장 작업을 직렬화하여 이전 세션의 삭제가 새 로그인 토큰을 지우지 않게 한다.
let storageTask: Promise<unknown> = Promise.resolve();
function enqueueStorage<T>(task: () => Promise<T>): Promise<T> {
  const next = storageTask.then(task, task);
  storageTask = next.catch(() => {});
  return next;
}

function clearSessionStorage(pushCleanup: Promise<PushCleanupResult>): Promise<PushCleanupResult> {
  return enqueueStorage(async () => {
    // 네트워크·SDK 정리가 지연되어도 JWT는 먼저 지우고, 다음 로그인은 두 정리를 모두 기다린다.
    const [storage, cleanup] = await Promise.allSettled([clearTokens(), pushCleanup]);
    if (storage.status === 'rejected') throw storage.reason;
    if (cleanup.status === 'rejected') throw cleanup.reason;
    return cleanup.value;
  });
}

function resetSession() {
  const id = rotateSession();
  void queryClient.cancelQueries();
  queryClient.clear();
  useMembershipPromptStore.getState().close();
  useNoticeFilterStore.setState({ selectedCategory: null, selectedTag: null });
  useSearchHistoryStore.getState().clearAll();
  return id;
}

export const useAuthStore = create<AuthState>()(
  persist<AuthState, [], [], Pick<AuthState, 'user' | 'tags'>>(
    (set, get) => ({
      ...EMPTY_AUTH,
      status: 'initializing',
      sessionId: getSessionId(),

      setAuth: async (response, expectedSession = getSessionId()) => {
        assertCurrentSession(expectedSession);
        const previousCleanup = get().status === 'authenticated' ? stopPushSession(get().accessToken) : null;
        const id = resetSession();
        set({ ...EMPTY_AUTH, status: 'initializing', sessionId: id });
        try {
          await enqueueStorage(async () => {
            await previousCleanup;
            assertCurrentSession(id);
            await saveTokens(response);
          });
          assertCurrentSession(id);
          startPushSession(id);
          set({
            status: 'authenticated',
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            user: {
              userId: response.userId, email: response.email, major: response.major,
              secondMajor: response.secondMajor, grade: response.grade,
              enrollmentStatus: response.enrollmentStatus,
            },
            tags: response.tags,
          });
        } catch (error) {
          if (getSessionId() === id) {
            await stopPushSession(null);
            if (getSessionId() === id) set({ ...EMPTY_AUTH, status: 'unauthenticated' });
          }
          throw error;
        }
      },

      setTokens: async (tokens, expectedSession = getSessionId()) => {
        await enqueueStorage(async () => {
          assertCurrentSession(expectedSession);
          if (get().status !== 'authenticated') throw new Error('회원 인증이 필요합니다.');
          await saveTokens(tokens);
        });
        assertCurrentSession(expectedSession);
        set(tokens);
      },

      clearAuth: async (reason = 'expired') => {
        const { accessToken, refreshToken } = get();
        const cleanup = stopPushSession(reason === 'withdrawal' ? null : accessToken,
          reason === 'logout' ? { refreshToken } : undefined);
        const id = resetSession();
        set({ ...EMPTY_AUTH, status: 'unauthenticated', sessionId: id });
        return clearSessionStorage(cleanup);
      },

      enterGuest: async () => {
        if (get().status === 'guest') return;
        if (get().status !== 'unauthenticated') return;
        const cleanup = stopPushSession(null);
        const id = resetSession();
        set({ ...EMPTY_AUTH, status: 'initializing', sessionId: id });
        try {
          await clearSessionStorage(cleanup);
          assertCurrentSession(id);
          set({ status: 'guest' });
        } catch (error) {
          if (getSessionId() === id) set({ status: 'unauthenticated' });
          throw error;
        }
      },

      initializeAuth: async () => {
        const id = getSessionId();
        try {
          const tokens = await enqueueStorage(getTokens);
          assertCurrentSession(id);
          if (tokens) startPushSession(id);
          else await stopPushSession(null);
          assertCurrentSession(id);
          set(tokens
            ? { ...tokens, status: 'authenticated' }
            : { ...EMPTY_AUTH, status: 'unauthenticated' });
        } catch (error) {
          if (getSessionId() === id) {
            await stopPushSession(null);
            if (getSessionId() === id) set({ ...EMPTY_AUTH, status: 'unauthenticated' });
          }
          throw error;
        }
      },

      updateTags: (tags) => {
        if (get().status === 'authenticated') set({ tags });
      },
    }),
    {
      name: 'cathori-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ user, tags }) => ({ user, tags }),
    },
  ),
);

export function requireMember() {
  if (useAuthStore.getState().status !== 'authenticated') {
    throw new Error('회원 전용 기능입니다.');
  }
  return getSessionId();
}
