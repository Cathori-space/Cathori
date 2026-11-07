import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  ANDROID_REVIEW_COOLDOWN_MS,
  ANDROID_REVIEW_MAX_DISMISS_COUNT,
} from '@/src/features/reviews/constants';

export type AndroidReviewDisabledReason =
  | 'dismiss-limit'
  | 'review-pressed'
  | null;

interface AndroidReviewPolicyState {
  /** 마지막으로 자체 리뷰 팝업을 표시한 시각 */
  lastShownAt: number | null;
  /** `나중에`, 닫기, 시스템 뒤로가기로 팝업을 닫은 누적 횟수 */
  dismissCount: number;
  /** 자동 리뷰 요청이 영구 중단됐는지 여부 */
  automaticRequestDisabled: boolean;
  disabledReason: AndroidReviewDisabledReason;

  /** 현재 앱 프로세스에서 팝업을 이미 표시했는지 여부 */
  hasShownThisSession: boolean;
  /** AsyncStorage에 저장된 정책의 복원이 끝났는지 여부 */
  hasHydrated: boolean;

  markShown: (shownAt: number) => void;
  recordDismiss: () => void;
  recordReviewPress: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

type PersistedAndroidReviewPolicy = Pick<
  AndroidReviewPolicyState,
  | 'lastShownAt'
  | 'dismissCount'
  | 'automaticRequestDisabled'
  | 'disabledReason'
>;

type AndroidReviewEligibilityState = Pick<
  AndroidReviewPolicyState,
  | 'lastShownAt'
  | 'automaticRequestDisabled'
  | 'hasShownThisSession'
  | 'hasHydrated'
>;

/** Android 자체 리뷰 팝업의 공통 노출 제한을 확인한다. */
export function canShowAndroidReviewPrompt(
  state: AndroidReviewEligibilityState,
  now = Date.now(),
): boolean {
  if (
    !state.hasHydrated ||
    state.automaticRequestDisabled ||
    state.hasShownThisSession
  ) {
    return false;
  }

  if (
    state.lastShownAt != null &&
    now - state.lastShownAt < ANDROID_REVIEW_COOLDOWN_MS
  ) {
    return false;
  }

  return true;
}

export const useAndroidReviewPolicyStore =
  create<AndroidReviewPolicyState>()(
    persist<
      AndroidReviewPolicyState,
      [],
      [],
      PersistedAndroidReviewPolicy
    >(
      (set) => ({
        lastShownAt: null,
        dismissCount: 0,
        automaticRequestDisabled: false,
        disabledReason: null,
        hasShownThisSession: false,
        hasHydrated: false,

        markShown: (shownAt) =>
          set({
            lastShownAt: shownAt,
            hasShownThisSession: true,
          }),

        recordDismiss: () =>
          set((state) => {
            const dismissCount = Math.min(
              ANDROID_REVIEW_MAX_DISMISS_COUNT,
              state.dismissCount + 1,
            );
            const reachedDismissLimit =
              dismissCount >= ANDROID_REVIEW_MAX_DISMISS_COUNT;

            return {
              dismissCount,
              automaticRequestDisabled:
                state.automaticRequestDisabled || reachedDismissLimit,
              disabledReason: reachedDismissLimit
                ? 'dismiss-limit'
                : state.disabledReason,
            };
          }),

        recordReviewPress: () =>
          set({
            automaticRequestDisabled: true,
            disabledReason: 'review-pressed',
          }),

        setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      }),
      {
        name: 'cathori-android-review-policy',
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({
          lastShownAt: state.lastShownAt,
          dismissCount: state.dismissCount,
          automaticRequestDisabled: state.automaticRequestDisabled,
          disabledReason: state.disabledReason,
        }),
        onRehydrateStorage: (state) => {
          state.setHasHydrated(false);
          return (hydratedState) => {
            hydratedState?.setHasHydrated(true);
          };
        },
      },
    ),
  );
