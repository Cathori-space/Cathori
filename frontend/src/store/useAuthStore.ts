/**
 * 인증 상태 Zustand 스토어 (AsyncStorage 영속화)
 *
 * 정책:
 *  - accessToken + refreshToken을 영속 저장 (앱 재실행 시 자동 로그인 기반)
 *  - user 정보 + tags도 영속 저장 (로그인 응답 한 번으로 채움, 별도 조회 불필요)
 *  - clearAuth() 호출 시 토큰·사용자·태그 모두 초기화 (로그아웃)
 *
 * 영속화:
 *  - zustand/middleware persist + createJSONStorage(() => AsyncStorage)
 *  - 키: 'cathori-auth'
 *  - 앱 재시작 후 자동 rehydrate
 *
 * 패턴 참고: useSearchHistoryStore.ts
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AuthUser, LoginResponse, UserTag } from '@/src/types/auth';

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
  setAuth: (response: LoginResponse) => void;

  /**
   * 로그아웃 시 호출 — 토큰·사용자·태그 모두 초기화
   * AsyncStorage에서도 자동으로 삭제됨 (persist 미들웨어)
   */
  clearAuth: () => void;

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

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...INITIAL_STATE, // 스토어 처음 켜졌을 시 세팅용 초기값

      setAuth: (response) =>
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
        }),

      clearAuth: () => set({ ...INITIAL_STATE }),

      updateTags: (tags) => set({ tags }),
    }),
    {
      name: 'cathori-auth', // 저장소 안의 아이템의 이름
      storage: createJSONStorage(() => AsyncStorage), // AsyncStorage에 저장
    },
  ),
);
