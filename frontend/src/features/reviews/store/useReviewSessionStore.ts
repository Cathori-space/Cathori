import { create } from 'zustand';

export const REVIEW_MINIMUM_ACTIVE_TIME_MS = 3 * 60 * 1000;

interface ReviewSessionState {
  /** 현재 앱 프로세스에서 누적한 활성 사용 시간 */
  activeElapsedMs: number;
  /** 자동 리뷰 요청에 필요한 최소 사용 시간을 충족했는지 여부 */
  hasReachedMinimumUsage: boolean;
  /** 한 번의 활성 구간에서 측정한 시간을 세션 누적 시간에 더한다. */
  addActiveElapsedTime: (elapsedMs: number) => void;
}

/**
 * 자동 리뷰 요청을 위한 현재 앱 세션의 사용 시간 상태.
 *
 * 이번 세션은 앱 프로세스의 수명과 같으므로 영속화하지 않는다.
 * 화면 이동과 백그라운드 전환에는 유지되며 앱을 종료하면 초기화된다.
 */
export const useReviewSessionStore = create<ReviewSessionState>((set) => ({
  activeElapsedMs: 0,
  hasReachedMinimumUsage: false,

  addActiveElapsedTime: (elapsedMs) => {
    if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return;

    set((state) => {
      if (state.hasReachedMinimumUsage) return state;

      const activeElapsedMs = Math.min(
        REVIEW_MINIMUM_ACTIVE_TIME_MS,
        state.activeElapsedMs + elapsedMs,
      );

      return {
        activeElapsedMs,
        hasReachedMinimumUsage:
          activeElapsedMs >= REVIEW_MINIMUM_ACTIVE_TIME_MS,
      };
    });
  },
}));
