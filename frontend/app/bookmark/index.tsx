/**
 * 북마크 목록 화면 — app/bookmark/index.tsx
 *
 * 로그인 사용자가 저장한 공지만 기존 NoticeCard UI로 표시한다.
 */

import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/src/constants/colors';
import {
  NoticeCard,
  useBookmarkedNotices,
  useToggleBookmark,
} from '@/src/features/notices';
import { EmptyState, SubHeader } from '@/src/shared/components';
import type { Notice } from '@/src/types/api';

const ESTIMATED_CARD_HEIGHT = 200;

export default function BookmarkScreen() {
  const insets = useSafeAreaInsets();
  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
  } = useBookmarkedNotices();
  const {
    mutate: toggleBookmarkMutate,
    isPending: isBookmarkPending,
    variables: pendingBookmarkId,
  } = useToggleBookmark();

  const notices = data?.pages.flatMap((page) => page.content) ?? [];

  const handleToggleBookmark = (noticeId: string) => {
    if (isBookmarkPending) return;
    toggleBookmarkMutate(noticeId);
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const renderNoticeCard = ({ item }: { item: Notice }) => (
    <NoticeCard
      notice={item}
      onToggleBookmark={handleToggleBookmark}
      isBookmarkDisabled={isBookmarkPending && pendingBookmarkId === item.id}
    />
  );

  const keyExtractor = (item: Notice) => item.id;

  const getItemLayout = (_: unknown, index: number) => ({
    length: ESTIMATED_CARD_HEIGHT,
    offset: ESTIMATED_CARD_HEIGHT * index,
    index,
  });

  const ListEmpty = () =>
    isLoading ? (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    ) : (
      <EmptyState
        iconName="bookmark"
        message={'저장한 공지가 없습니다.\n관심 있는 공지의 북마크 아이콘을 눌러 저장해보세요.'}
      />
    );

  const ListFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoading}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <SubHeader title="북마크" />

      {isError ? (
        <View
          style={[
            styles.errorContainer,
            { paddingTop: insets.top + 64, paddingBottom: insets.bottom },
          ]}
        >
          <Feather name="alert-circle" size={48} color={Colors.separator} />
          <Text style={styles.errorText}>북마크 목록을 불러오지 못했습니다</Text>
          <Pressable onPress={() => refetch()} hitSlop={8}>
            <Text style={styles.retryText}>다시 시도</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={notices}
          renderItem={renderNoticeCard}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          ListEmptyComponent={ListEmpty}
          ListFooterComponent={ListFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingTop: insets.top + 64 + 16,
              paddingBottom: insets.bottom + 100,
            },
            notices.length === 0 && styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[Colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    gap: 16,
    paddingHorizontal: 16,
  },
  emptyListContent: {
    flexGrow: 1,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  errorText: {
    fontFamily: 'Pretendard',
    fontSize: 14,
    fontWeight: '400',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  retryText: {
    fontFamily: 'Pretendard',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
});
