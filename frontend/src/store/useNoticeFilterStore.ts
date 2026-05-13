/**
 * 공지 필터 상태 Zustand 스토어
 *
 * [정책 5/13] 대분류(카테고리)와 소분류(태그)는 독립적으로 동작한다.
 * - 둘 다 null(미선택) 가능
 * - 같은 버튼을 다시 탭하면 해제(null)
 * - 둘 다 선택 시 AND 조건 필터링
 */

import { create } from 'zustand';

import type { NoticeCategory } from '@/src/types/api';

interface NoticeFilterState {
  /** 현재 선택된 대분류 카테고리 (null = 미선택, 전체 공지) */
  selectedCategory: NoticeCategory | null;
  /** 현재 선택된 소분류 태그 (null = 미선택) */
  selectedTag: string | null;

  /**
   * 대분류 카테고리 토글 — 같은 값 다시 탭 시 해제(null)
   * 소분류 태그에 영향 없음 (독립 동작)
   */
  toggleCategory: (category: NoticeCategory) => void;
  /**
   * 소분류 태그 토글 — 같은 값 다시 탭 시 해제(null)
   * 대분류 카테고리에 영향 없음 (독립 동작)
   */
  toggleTag: (tag: string) => void;
}

export const useNoticeFilterStore = create<NoticeFilterState>((set, get) => ({
  // 기본값: 둘 다 미선택 → 전체 공지 시간순 노출
  selectedCategory: null,
  selectedTag: null,

  toggleCategory: (category) => {
    const current = get().selectedCategory;
    set({
      // 같은 카테고리 다시 탭 → 해제(null)
      selectedCategory: current === category ? null : category,
    });
  },

  toggleTag: (tag) => {
    const current = get().selectedTag;
    set({
      // 같은 태그 다시 탭 → 해제(null)
      selectedTag: current === tag ? null : tag,
    });
  },
}));
