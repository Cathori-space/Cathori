import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import {
  REVIEW_MINIMUM_ACTIVE_TIME_MS,
  useReviewSessionStore,
} from '@/src/features/reviews/store/useReviewSessionStore';

/**
 * 현재 앱 세션에서 앱이 화면에 활성 상태로 표시된 시간만 누적한다.
 *
 * 매초 상태를 갱신하지 않고 활성 구간의 시작 시각을 기록한 뒤,
 * 백그라운드 전환 시 실제 경과 시간을 반영한다. 최소 사용 시간까지
 * 남은 시간에는 한 번의 타이머만 예약한다.
 */
export function useReviewSessionTimer() {
  const hasReachedMinimumUsage = useReviewSessionStore(
    (state) => state.hasReachedMinimumUsage,
  );
  const addActiveElapsedTime = useReviewSessionStore(
    (state) => state.addActiveElapsedTime,
  );

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const activeStartedAtRef = useRef<number | null>(null);
  const thresholdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (hasReachedMinimumUsage) return;

    const clearThresholdTimer = () => {
      if (thresholdTimerRef.current == null) return;

      clearTimeout(thresholdTimerRef.current);
      thresholdTimerRef.current = null;
    };

    const finishActivePeriod = () => {
      const activeStartedAt = activeStartedAtRef.current;
      activeStartedAtRef.current = null;
      clearThresholdTimer();

      if (activeStartedAt == null) return;

      addActiveElapsedTime(Math.max(0, Date.now() - activeStartedAt));
    };

    const startActivePeriod = () => {
      if (activeStartedAtRef.current != null) return;

      const { activeElapsedMs, hasReachedMinimumUsage: hasReached } =
        useReviewSessionStore.getState();
      if (hasReached) return;

      const remainingMs = Math.max(
        0,
        REVIEW_MINIMUM_ACTIVE_TIME_MS - activeElapsedMs,
      );

      activeStartedAtRef.current = Date.now();
      thresholdTimerRef.current = setTimeout(
        finishActivePeriod,
        remainingMs,
      );
    };

    if (appStateRef.current === 'active') {
      startActivePeriod();
    }

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (previousAppState === 'active' && nextAppState !== 'active') {
        finishActivePeriod();
        return;
      }

      if (previousAppState !== 'active' && nextAppState === 'active') {
        startActivePeriod();
      }
    });

    return () => {
      subscription.remove();
      finishActivePeriod();
    };
  }, [addActiveElapsedTime, hasReachedMinimumUsage]);
}
