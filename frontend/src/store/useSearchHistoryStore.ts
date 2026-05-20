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
 *  - 키: 'cathori-search-history'
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
}

export const useSearchHistoryStore = create<SearchHistoryState>()(
  persist( // 영속화 설정 미들웨어
    (set) => ({
      history: [],

      addEntry: (keyword) => {
        const trimmed = keyword.trim();
        if (!trimmed) return;
        set((state) => {
          // 중복 키워드는 일단 제거한 뒤 최상단에 재삽입
          const deduped = state.history.filter((k) => k !== trimmed);
          return {
            history: [trimmed, ...deduped].slice(0, MAX_HISTORY),
          };
        });
      },

      removeEntry: (keyword) =>
        set((state) => ({
          history: state.history.filter((k) => k !== keyword),
        })),

      clearAll: () => set({ history: [] }),
    }),
    {
      name: 'cathori-search-history',                 // 저장소 안의 아이템의 이름
      storage: createJSONStorage(() => AsyncStorage), // AsyncStorage에 저장
    },
  ),
);
