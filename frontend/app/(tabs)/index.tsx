/**
 * 메인 피드 화면 — app/(tabs)/index.tsx
 *
 * 구조:
 * ┌─ TopAppBar (absolute) ─────────────────┐
 * │ Cathori 로고                    알림🔔  │
 * ├─ TodayHighlightCard ──────────────────┤
 * │ TODAY'S HIGHLIGHT                      │
 * │ 2026학년도 1학기 국가장학금...           │
 * ├─ CategoryTab ──────────────────────────┤
 * │ 일반 | 장학 | 학사 | 취창업              │
 * ├─ TagChipList ──────────────────────────┤
 * │ #전체 #국가장학 #교내장학 ...            │
 * ├─ FlatList (NoticeCard) ────────────────┤
 * │ [카드1] [카드2] [카드3] ...             │
 * └────────────────────────────────────────┘
 */

import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  View,
} from 'react-native';

import { CATEGORY_TABS, TAG_LIST } from '@/src/constants/categories';
import { Colors } from '@/src/constants/colors';
import {
  CategoryTab,
  NoticeCard,
  TagChipList,
  TodayHighlightCard,
  TopAppBar,
} from '@/src/features/notices';
import { useNotices } from '@/src/features/notices/hooks';
import { MOCK_NOTICES } from '@/src/mocks/notices';
import { EmptyState } from '@/src/shared/components';
import { useNoticeFilterStore } from '@/src/store/useNoticeFilterStore';
import type { Notice } from '@/src/types/api';

/** FlatList getItemLayout — 고정 높이 추정값 (성능 최적화) */
const ESTIMATED_CARD_HEIGHT = 200;

/**
 * Today's Highlight용 고정 공지 — 필터 영향 없음
 * 추후 별도 선정 알고리즘 적용 시 이 부분만 교체
 */
const HIGHLIGHT_NOTICE = MOCK_NOTICES.find((n) => n.deadlineAt != null) ?? MOCK_NOTICES[0];

export default function HomeScreen() {
  // 필터 상태 (Zustand) — 독립 동작
  const selectedCategory = useNoticeFilterStore((s) => s.selectedCategory);
  const selectedTag = useNoticeFilterStore((s) => s.selectedTag);
  const toggleCategory = useNoticeFilterStore((s) => s.toggleCategory);
  const toggleTag = useNoticeFilterStore((s) => s.toggleTag);

  // 데이터 조회 (TanStack Query) — category/tag 각각 null이면 해당 필터 건너뜀
  const { data, isLoading } = useNotices({
    category: selectedCategory,
    tag: selectedTag,
  });

  const notices = data?.content ?? [];

  // 즐겨찾기 토글 (향후 useMutation으로 교체)
  const handleToggleBookmark = useCallback((noticeId: string) => {
    // TODO: 즐겨찾기 낙관적 업데이트 useMutation 연동
    console.log('즐겨찾기 토글:', noticeId);
  }, []);

  // FlatList renderItem — 인라인 화살표 함수 방지 (Global Rules)
  const renderNoticeCard = useCallback(
    ({ item }: { item: Notice }) => (
      <NoticeCard notice={item} onToggleBookmark={handleToggleBookmark} />
    ),
    [handleToggleBookmark],
  );

  // FlatList keyExtractor
  const keyExtractor = useCallback((item: Notice) => item.id, []);

  // FlatList getItemLayout (성능 최적화)
  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: ESTIMATED_CARD_HEIGHT,
      offset: ESTIMATED_CARD_HEIGHT * index,
      index,
    }),
    [],
  );

  // 리스트 헤더 — Highlight(고정) + CategoryTab(독립) + TagChipList(독립)
  const ListHeader = useCallback(
    () => (
      <View>
        {/* Today's Highlight — 필터 무관, 고정 공지 */}
        {HIGHLIGHT_NOTICE != null && (
          <View style={styles.highlightSection}>
            <TodayHighlightCard notice={HIGHLIGHT_NOTICE} />
          </View>
        )}

        {/* 대분류 카테고리 탭 — 토글 방식 (재클릭 시 해제) */}
        <CategoryTab
          categories={CATEGORY_TABS}
          selectedCategory={selectedCategory}
          onSelect={toggleCategory}
        />

        {/* 소분류 태그 칩 — 독립 동작, 대분류와 무관 */}
        <TagChipList
          tags={TAG_LIST}
          selectedTag={selectedTag}
          onSelect={toggleTag}
        />
      </View>
    ),
    [selectedCategory, toggleCategory, selectedTag, toggleTag],
  );

  // 리스트 빈 상태
  const ListEmpty = useCallback(
    () =>
      isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <EmptyState message="조건에 맞는 공지가 없습니다." />
      ),
    [isLoading],
  );

  return (
    <View style={styles.screen}>
      {/* 상단 헤더 */}
      <TopAppBar />

      {/* 공지 리스트 */}
      <FlatList
        data={notices} // / 렌더링할 데이터 배열
        renderItem={renderNoticeCard} // 각 아이템을 어떻게 그릴지 정의하는 함수 — { item } 구조분해로 데이터 하나씩 받음
        keyExtractor={keyExtractor} // 각 아이템의 고유 키 반환 함수
        getItemLayout={getItemLayout} // 아이템의 높이/위치를 미리 계산해 알려주는 함수
        ListHeaderComponent={ListHeader} // 리스트 최상단에 고정으로 붙는 컴포넌트 (스크롤해도 따라오지 않음)
        ListEmptyComponent={ListEmpty} 
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  highlightSection: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  listContent: {
    paddingBottom: 100,
    gap: 16,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    paddingVertical: 80,
    alignItems: 'center',
  },
});