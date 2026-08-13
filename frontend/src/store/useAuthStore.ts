/**
 * 인증 상태 Zustand 스토어
 *
 * 정책:
 *  - accessToken + refreshToken은 OS 보안 저장소(SecureStore)에 저장
 *  - user 정보 + tags는 AsyncStorage에 영속 저장
 *  - clearAuth() 호출 시 토큰·사용자·태그 모두 초기화 (로그아웃)
 *
 * 영속화:
 *  - persist 미들웨어는 user + tags만 AsyncStorage에 저장
 *  - 앱 시작 시 SecureStore의 토큰을 메모리 상태로 복원
 *  - 키: 'cathori-auth'
 *  - 앱 재시작 후 자동 rehydrate
 *
 * 패턴 참고: useSearchHistoryStore.ts
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  clearTokens,
  getTokens,
  saveTokens,
} from '@/src/services/tokenStorage';
import type {
  AuthUser,
  LoginResponse,
  ReissueResponse,
  UserTag,
} from '@/src/types/auth';

interface AuthState {
  /** JWT 액세스 토큰 (1시간 유효) */
  accessToken: string | null;
  /** JWT 리프레시 토큰 (30일 유효) */
  refreshToken: string | null;
  /** 사용자 프로필 정보 */
  user: AuthUser | null;
  /** 사용자 태그 목록 */
  tags: UserTag[];

  /**
   * 로그인 성공 시 호출 — 토큰 + 사용자 정보 + 태그를 한 번에 세팅
   * LoginResponse를 그대로 받아 필요한 필드를 추출
   */
  setAuth: (response: LoginResponse) => Promise<void>;

  /** 토큰 재발급 성공 시 새 토큰 쌍만 교체합니다. */
  setTokens: (tokens: ReissueResponse) => Promise<void>;

  /**
   * 로그아웃 시 호출 — 토큰·사용자·태그 모두 초기화
   * SecureStore의 토큰과 AsyncStorage의 사용자 정보를 함께 삭제
   */
  clearAuth: () => Promise<void>;

  /** SecureStore에 저장된 토큰을 앱 메모리로 복원합니다. */
  initializeAuth: () => Promise<void>;

  /**
   * 태그 목록 갱신 — 태그 추가/삭제 후 클라이언트 낙관적 갱신용
   */
  updateTags: (tags: UserTag[]) => void;
}

/** 초기 상태 (로그아웃 상태) */
const INITIAL_STATE = {
  accessToken: null,
  refreshToken: null,
  user: null,
  tags: [] as UserTag[],
};

type PersistedAuthState = Pick<AuthState, 'user' | 'tags'>;

export const useAuthStore = create<AuthState>()(
  persist<AuthState, [], [], PersistedAuthState>(
    (set) => ({
      ...INITIAL_STATE, // 스토어 처음 켜졌을 시 세팅용 초기값

      setAuth: async (response) => {
        await saveTokens({
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
        });
        set({
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          user: {
            userId: response.userId,
            email: response.email,
            major: response.major,
            secondMajor: response.secondMajor,
            grade: response.grade,
            enrollmentStatus: response.enrollmentStatus,
          },
          tags: response.tags,
        });
      },

      setTokens: async (tokens) => {
        await saveTokens(tokens);
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        });
      },

      clearAuth: async () => {
        try {
          await clearTokens();
        } finally {
          // SecureStore 삭제가 실패해도 현재 앱의 인증 상태는 반드시 초기화한다.
          set({ ...INITIAL_STATE });
        }
      },

      initializeAuth: async () => {
        const tokens = await getTokens();
        set({
          accessToken: tokens?.accessToken ?? null,
          refreshToken: tokens?.refreshToken ?? null,
        });
      },

      updateTags: (tags) => set({ tags }),
    }),
    {
      name: 'cathori-auth', // 저장소 안의 아이템의 이름
      storage: createJSONStorage(() => AsyncStorage), // 사용자 정보와 태그만 저장
      partialize: (state) => ({
        user: state.user,
        tags: state.tags,
      }),
    },
  ),
);
