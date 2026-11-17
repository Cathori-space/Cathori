/**
 * 검색 기록 Zustand 스토어 (AsyncStorage 영속화)
 *
 * 정책:
 *  - 최대 10건 보관
 *  - 동일 키워드가 들어오면 기존 항목을 제거하고 최상단에 재추가 (이력 갱신)
 *  - 빈 문자열/공백만 입력은 무시
 *  - 엔터/제출 또는 결과 카드 탭 시점에 addEntry를 호출 (호출자 책임)
 *
 * 영속화:
 *  - zustand/middleware persist + createJSONStorage(() => AsyncStorage)
 *  - 회원 키: 'cathori-search-history', 게스트 키: 'cathori-guest-search-history'
 *  - 앱 재시작 후 자동 rehydrate (rehydrate 전에는 history = [])
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** 검색 기록 최대 보관 건수 */
// TODO: 설정에서 변경 가능하도록 하고, constant에 상수로 추가
const MAX_HISTORY = 10;

interface SearchHistoryState {
  history: string[];
  /** 검색어를 기록에 추가. 중복은 최상단으로 이동, 빈 문자열은 무시 */
  addEntry: (keyword: string) => void;
  /** 특정 검색어 1건 삭제 */
  removeEntry: (keyword: string) => void;
  /** 전체 검색 기록 삭제 */
  clearAll: () => void;
  flush: () => Promise<void>;
}

function createSearchHistoryStore(name: string) {
  let changedSinceCreation = false;
  let storageTask: Promise<void> = Promise.resolve();
  const enqueueWrite = (operation: () => Promise<void>) => {
    const next = storageTask.then(operation, operation);
    storageTask = next;
    return next.catch(() => {});
  };

  return create<SearchHistoryState>()(
    persist( // 영속화 설정 미들웨어
      (set) => ({
        history: [],

        addEntry: (keyword) => {
          const trimmed = keyword.trim();
          if (!trimmed) return;
          changedSinceCreation = true;
          set((state) => {
            // 중복 키워드는 일단 제거한 뒤 최상단에 재삽입
            const deduped = state.history.filter((k) => k !== trimmed);
            return {
              history: [trimmed, ...deduped].slice(0, MAX_HISTORY),
            };
          });
        },

        removeEntry: (keyword) => {
          changedSinceCreation = true;
          set((state) => ({
            history: state.history.filter((k) => k !== keyword),
          }));
        },

        clearAll: () => {
          changedSinceCreation = true;
          set({ history: [] });
        },
        flush: () => storageTask,
      }),
      {
        name,
        // 이전 검색어 저장이 늦게 끝나도 세션 전환 시 기록 삭제를 덮지 않게 한다.
        storage: createJSONStorage(() => ({
          getItem: async (key) => {
            await storageTask;
            return AsyncStorage.getItem(key);
          },
          setItem: (key, value) => enqueueWrite(() => AsyncStorage.setItem(key, value)),
          removeItem: (key) => enqueueWrite(() => AsyncStorage.removeItem(key)),
        })),
        partialize: ({ history }) => ({ history }),
        merge: (persisted, current) => {
          // 늦은 초기 복원으로 세션 전환 때 비운 기록이나 새 검색을 덮지 않는다.
          if (changedSinceCreation) return current;
          const history = (persisted as Partial<SearchHistoryState> | undefined)?.history;
          return {
            ...current,
            history: Array.isArray(history)
              ? history.filter((entry): entry is string => typeof entry === 'string').slice(0, MAX_HISTORY)
              : [],
          };
        },
      },
    ),
  );
}

export const useSearchHistoryStore = createSearchHistoryStore('cathori-search-history');
export const useGuestSearchHistoryStore = createSearchHistoryStore('cathori-guest-search-history');
