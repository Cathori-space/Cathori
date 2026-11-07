import { useIsFocused } from '@react-navigation/native';
import * as StoreReview from 'expo-store-review';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';

import { useIosReviewPolicyStore } from '@/src/features/reviews/store/useIosReviewPolicyStore';
import { useReviewSessionStore } from '@/src/features/reviews/store/useReviewSessionStore';

/**
 * 메인 피드에서 최소 사용 시간을 채운 iOS 사용자에게 StoreKit 리뷰를 요청한다.
 * 실제 팝업 표시 여부와 무관하게 현재 설치에서는 한 번만 시도한다.
 */
export function useIosReviewPrompt() {
  const isFocused = useIsFocused();
  const requestInFlightRef = useRef(false);
  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState,
  );
  const hasReachedMinimumUsage = useReviewSessionStore(
    (state) => state.hasReachedMinimumUsage,
  );
  const requestAttemptedAt = useIosReviewPolicyStore(
    (state) => state.requestAttemptedAt,
  );
  const hasHydrated = useIosReviewPolicyStore(
    (state) => state.hasHydrated,
  );

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (
      Platform.OS !== 'ios' ||
      appState !== 'active' ||
      !isFocused ||
      !hasReachedMinimumUsage ||
      !hasHydrated ||
      requestAttemptedAt != null ||
      requestInFlightRef.current
    ) {
      return;
    }

    requestInFlightRef.current = true;

    // 앱이 요청 결과를 알 수 없으므로 네이티브 API 호출 전에 1회를 소진한다.
    useIosReviewPolicyStore.getState().recordRequestAttempt(Date.now());

    void StoreReview.requestReview()
      .catch((error: unknown) => {
        console.warn('[review] iOS review request failed', error);
      })
      .finally(() => {
        requestInFlightRef.current = false;
      });
  }, [
    appState,
    hasHydrated,
    hasReachedMinimumUsage,
    isFocused,
    requestAttemptedAt,
  ]);
}
