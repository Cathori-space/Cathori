/**
 * 메인 피드 화면 — app/(tabs)/index.tsx
 *
 * 구조:
 * ┌─ MainHedaer ─────────────────────────────┐
 * │ Cathori 로고                    알림🔔  │
 * ├─ FeedHeader (별도 컴포넌트) ────────────┤
 * │ TodayHighlightCard (고정)               │
 * │ CategoryTab (독립 토글)                  │
 * │ TagChipList (독립 토글)                  │
 * ├─ FlatList (NoticeCard) ────────────────┤
 * │ [카드1] [카드2] [카드3] ...             │
 * └────────────────────────────────────────┘
 *
 */

import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { CATEGORY_TABS } from '@/src/constants/categories';
import { Colors } from '@/src/constants/colors';
import {
  CategoryTab,
  NoticeCard,
  TagChipList,
  TodayHighlightCard,
  useNotices,
  useToggleBookmark,
} from '@/src/features/notices';
import { useRefreshTags } from '@/src/features/settings/hooks';
import { EmptyState, MainHeader } from '@/src/shared/components';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useNoticeFilterStore } from '@/src/store/useNoticeFilterStore';
import type { Notice } from '@/src/types/api';

/** FlatList getItemLayout — 고정 높이 추정값 (성능 최적화) */
const ESTIMATED_CARD_HEIGHT = 200;

// ─── 리스트 헤더 별도 컴포넌트 ────────────────────────────────────────
function FeedHeaderComponent() {
  const router = useRouter();

  // HomeScreen에서 props로 받지 않고 직접 구독 — 재마운트 원인 제거
  const selectedCategory = useNoticeFilterStore((s) => s.selectedCategory);
  const selectedTag = useNoticeFilterStore((s) => s.selectedTag);
  const toggleCategory = useNoticeFilterStore((s) => s.toggleCategory);
  const toggleTag = useNoticeFilterStore((s) => s.toggleTag);

  // Zustand 사용자 정의 태그 리스트 가져옴
  const userTags = useAuthStore((s) => s.tags);
  const tagNames = userTags.map((t) => t.tagName);

  // 만약 선택된 태그가 현재 사용자의 태그 목록에 존재하지 않게 되었다면(키워드 화면에서 삭제 등), 필터를 초기화
  useEffect(() => {
    if (selectedTag && !tagNames.includes(selectedTag)) {
      // selectedTag를 강제로 해제(null)하기 위해 toggleTag 호출
      toggleTag(selectedTag);
    }
  }, [selectedTag, tagNames, toggleTag]);

  const handleAddPress = () => {
    router.push('/settings/keywords' as never);
  };

  return (
    <View>
      {/* Today's Highlight — 필터 무관, 첫 번째 마감일 공지 */}

      {/* 대분류 카테고리 탭 — 토글 방식 (재클릭 시 해제) */}
      <CategoryTab
        categories={CATEGORY_TABS}
        selectedCategory={selectedCategory}
        onSelect={toggleCategory}
      />

      {/* 소분류 태그 칩 — 독립 동작, 대분류와 무관. 사용자 정의 태그 적용 및 플러스 버튼 탑재 */}
      <TagChipList
        tags={tagNames}
        selectedTag={selectedTag}
        onSelect={toggleTag}
        onAddPress={handleAddPress}
      />
    </View>
  );
}

const FeedHeader = FeedHeaderComponent;

// ─── 메인 화면 ────────────────────────────────────────────────────────

export default function HomeScreen() {
  // 필터 상태 (Zustand) — 데이터 조회용
  const selectedCategory = useNoticeFilterStore((s) => s.selectedCategory);
  const selectedTag = useNoticeFilterStore((s) => s.selectedTag);

  // 데이터 조회 (TanStack Query) — category/tag 각각 null이면 해당 필터 건너뜀
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useNotices({
    category: selectedCategory,
    tag: selectedTag,
  });

  const { refreshTags, isRefreshing: isRefreshingTags } = useRefreshTags();

  const handleRefresh = async () => {
    // 공지사항 데이터와 태그 데이터를 동시에 새로고침합니다.
    await Promise.all([refetch(), refreshTags()]);
  };

  const notices = data?.pages.flatMap((page) => page.content) ?? [];

  // Today's Highlight — 실 데이터 중 마감일이 있는 첫 번째 공지, 없으면 첫 번째 공지
  // TODO(2차 MVP): 1차 MVP에서는 hightlightNotice 구현 X
  const highlightNotice = null;

  // 즐겨찾기 토글 mutation
  const { mutate: toggleBookmarkMutate } = useToggleBookmark();

  const handleToggleBookmark = React.useCallback(
    (noticeId: string) => {
      toggleBookmarkMutate(noticeId);
    },
    [toggleBookmarkMutate]
  );

  // FlatList renderItem — 인라인 화살표 함수 방지 (Global Rules)
  const renderNoticeCard = React.useCallback(
    ({ item }: { item: Notice }) => (
      <NoticeCard notice={item} onToggleBookmark={handleToggleBookmark} />
    ),
    [handleToggleBookmark]
  );

  // FlatList keyExtractor
  const keyExtractor = React.useCallback((item: Notice) => item.id, []);

  // FlatList getItemLayout (성능 최적화)
  const getItemLayout = React.useCallback(
    (_: unknown, index: number) => ({
      length: ESTIMATED_CARD_HEIGHT,
      offset: ESTIMATED_CARD_HEIGHT * index,
      index,
    }),
    []
  );
  
  // 리스트 빈 상태
  const ListEmpty = React.useCallback(
    () =>
      isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <EmptyState message="조건에 맞는 공지가 없습니다." />
      ),
    [isLoading]
  );

  // 무한 스크롤 추가 로드
  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // 푸터 로딩바 컴포넌트
  const ListFooter = React.useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoading}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }, [isFetchingNextPage]);

  return (
    <View style={styles.screen}>
      {/* 상단 헤더 */}
      <MainHeader />

      {/* 공지 리스트
       * getItemLayout - 아이템의 높이/위치를 미리 계산해 알려주는 함수
       * ListHeaderComponent - 리스트 최상단에 고정으로 붙는 컴포넌트 (스크롤해도 따라오지 않음)
       */}
      <FlatList
        data={notices}
        renderItem={renderNoticeCard}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        ListHeaderComponent={
          <>
            {/* Today's Highlight(2차 MVP에서 구현 예정) */}
            {highlightNotice != null && (
              <View style={styles.highlightSection}>
                <TodayHighlightCard notice={highlightNotice} />
              </View>
            )}
            <FeedHeader />
          </>
        }
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter} // 다음 페이지 호출 중일 경우 하단에 스피너 컴포넌트 렌더링
        onEndReached={handleLoadMore} // 다음 페이지 fetch 호출
        onEndReachedThreshold={0.5} // 리스트 하단에서 50% 만큼 남았을 때 onEndReached 트리거
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching || isRefreshingTags}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
          />
        }
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
  footerLoading: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});