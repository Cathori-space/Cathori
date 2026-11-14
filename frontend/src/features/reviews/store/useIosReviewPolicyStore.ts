import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface IosReviewPolicyState {
  /** 현재 설치에서 StoreKit 리뷰 요청을 시도한 시각 */
  requestAttemptedAt: number | null;
  /** AsyncStorage에 저장된 정책 복원이 끝났는지 여부 */
  hasHydrated: boolean;

  recordRequestAttempt: (attemptedAt: number) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

type PersistedIosReviewPolicy = Pick<
  IosReviewPolicyState,
  'requestAttemptedAt'
>;

/** iOS 자동 리뷰 요청을 설치당 한 번으로 제한하는 영속 상태. */
export const useIosReviewPolicyStore = create<IosReviewPolicyState>()(
  persist<IosReviewPolicyState, [], [], PersistedIosReviewPolicy>(
    (set) => ({
      requestAttemptedAt: null,
      hasHydrated: false,

      recordRequestAttempt: (requestAttemptedAt) =>
        set({ requestAttemptedAt }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'cathori-ios-review-policy',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        requestAttemptedAt: state.requestAttemptedAt,
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
