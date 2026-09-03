/**
 * 알림 리스트 화면 — app/notification/index.tsx
 *
 * 진입: MainHeader의 알림(종) 아이콘 탭
 *
 * 구조:
 * ┌─ SubHeader ──────────────────────────────┐
 * │ ←              알림                       │
 * ├──────────────────────────────────────────┤
 * │ [#매칭태그]                      [D-day] │
 * │ 공지 제목                                 │
 * │ 2026-06-02                                │
 * │ … (최근순, 커서 무한 스크롤)              │
 * └──────────────────────────────────────────┘
 *
 * - 데이터: GET /api/notifications (useNotifications, 커서 페이지네이션)
 * - 카드 탭 → 공지 상세(/notice/{noticeId})
 */

import React from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/src/constants/colors';
import {
  NotificationItem,
  useDeleteNotification,
  useNotifications,
} from '@/src/features/notifications';
import { EmptyState, SubHeader } from '@/src/shared/components';
import type { NotificationListItem } from '@/src/types/notifications';

export default function NotificationScreen() {
  const insets = useSafeAreaInsets();
  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotifications();
  const deleteNotificationMutation = useDeleteNotification();

  // 커서 페이지네이션 응답(pages)을 단일 목록으로 평탄화
  const notifications = data?.pages.flatMap((page) => page.alerts) ?? [];

  const contentPadding = {
    paddingTop: insets.top + 64 + 16,
    paddingBottom: insets.bottom + 16,
  };

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleDeleteNotification = (notification: NotificationListItem) => {
    if (deleteNotificationMutation.isPending) return;

    Alert.alert(
      '알림 삭제',
      '이 알림을 삭제할까요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            deleteNotificationMutation.mutate(notification.alertHistoryId, {
              onError: () => {
                Alert.alert(
                  '삭제 실패',
                  '알림 삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
                );
              },
            });
          },
        },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      <SubHeader title="알림" />

      {isLoading ? (
        <View style={[styles.center, contentPadding]}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : isError ? (
        <View style={[styles.center, contentPadding]}>
          <EmptyState
            message="알림을 불러오지 못했습니다."
            iconName="alert-circle"
          />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.alertHistoryId)}
          renderItem={({ item }) => (
            <NotificationItem
              notification={item}
              onDelete={handleDeleteNotification}
              isDeleteDisabled={
                deleteNotificationMutation.isPending &&
                deleteNotificationMutation.variables === item.alertHistoryId
              }
            />
          )}
          contentContainerStyle={[styles.listContent, contentPadding]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isRefetching}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator
                style={styles.footerLoader}
                color={Colors.primary}
              />
            ) : null
          }
          ListEmptyComponent={
            <EmptyState message="받은 알림이 없습니다." iconName="bell" />
          }
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  separator: {
    height: 12,
  },
  footerLoader: {
    paddingVertical: 16,
  },
});
