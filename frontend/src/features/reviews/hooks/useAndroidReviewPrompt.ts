import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Platform } from 'react-native';

import { ANDROID_REVIEW_COOLDOWN_MS } from '@/src/features/reviews/constants';
import { openAndroidReviewPage } from '@/src/features/reviews/services/openAndroidReviewPage';
import {
  canShowAndroidReviewPrompt,
  useAndroidReviewPolicyStore,
} from '@/src/features/reviews/store/useAndroidReviewPolicyStore';
import { useReviewSessionStore } from '@/src/features/reviews/store/useReviewSessionStore';

export function useAndroidReviewPrompt() {
  const isFocused = useIsFocused();
  const hasReachedMinimumUsage = useReviewSessionStore(
    (state) => state.hasReachedMinimumUsage,
  );
  const hasHydrated = useAndroidReviewPolicyStore(
    (state) => state.hasHydrated,
  );
  const lastShownAt = useAndroidReviewPolicyStore(
    (state) => state.lastShownAt,
  );
  const automaticRequestDisabled = useAndroidReviewPolicyStore(
    (state) => state.automaticRequestDisabled,
  );
  const hasShownThisSession = useAndroidReviewPolicyStore(
    (state) => state.hasShownThisSession,
  );

  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const reviewPressInFlightRef = useRef(false);

  const tryShowPrompt = useCallback((): boolean => {
    if (
      Platform.OS !== 'android' ||
      !isFocused ||
      visibleRef.current
    ) {
      return false;
    }

    const policy = useAndroidReviewPolicyStore.getState();
    const now = Date.now();
    if (!canShowAndroidReviewPrompt(policy, now)) return false;

    policy.markShown(now);
    visibleRef.current = true;
    setVisible(true);
    return true;
  }, [isFocused]);

  const handleDismiss = useCallback(() => {
    if (!visibleRef.current) return;

    visibleRef.current = false;
    setVisible(false);
    useAndroidReviewPolicyStore.getState().recordDismiss();
  }, []);

  const handleReviewPress = useCallback(async () => {
    if (!visibleRef.current || reviewPressInFlightRef.current) return;

    reviewPressInFlightRef.current = true;
    useAndroidReviewPolicyStore.getState().recordReviewPress();
    visibleRef.current = false;
    setVisible(false);

    try {
      await openAndroidReviewPage();
    } catch {
      Alert.alert(
        '스토어를 열 수 없습니다',
        '잠시 후 다시 시도해 주세요.',
      );
    } finally {
      reviewPressInFlightRef.current = false;
    }
  }, []);

  // 3분 사용 조건을 다른 화면에서 충족했다면 메인 피드 복귀 시 실행된다.
  useEffect(() => {
    if (
      Platform.OS !== 'android' ||
      !isFocused ||
      !hasReachedMinimumUsage ||
      !hasHydrated ||
      automaticRequestDisabled ||
      hasShownThisSession
    ) {
      return;
    }

    const now = Date.now();
    if (canShowAndroidReviewPrompt(useAndroidReviewPolicyStore.getState(), now)) {
      tryShowPrompt();
      return;
    }

    if (lastShownAt == null) return;

    const remainingCooldownMs =
      ANDROID_REVIEW_COOLDOWN_MS - (now - lastShownAt);
    if (remainingCooldownMs <= 0) {
      tryShowPrompt();
      return;
    }

    const timer = setTimeout(tryShowPrompt, remainingCooldownMs);
    return () => clearTimeout(timer);
  }, [
    automaticRequestDisabled,
    hasHydrated,
    hasReachedMinimumUsage,
    hasShownThisSession,
    isFocused,
    lastShownAt,
    tryShowPrompt,
  ]);

  // 메인 피드에서 더 돌아갈 화면이 없을 때의 Android 시스템 뒤로가기만 처리한다.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        tryShowPrompt,
      );

      return () => subscription.remove();
    }, [tryShowPrompt]),
  );

  return {
    visible,
    handleDismiss,
    handleReviewPress,
  };
}
