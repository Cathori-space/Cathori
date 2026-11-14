/**
 * NotificationItem — 알림 리스트 카드
 *
 * 구조:
 * ┌─────────────────────────────┐
 * │ [#매칭태그]          [D-day] │
 * │ 공지 제목 텍스트 (최대 2줄)  │
 * │ 2026-06-02                   │
 * └─────────────────────────────┘
 *
 * - 카드 탭 → 공지 상세(/notice/{noticeId})로 이동
 * - deadlineAt이 있을 때만 date.ts로 D-day를 연산해 뱃지 표시
 */

import { Feather } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { SharedValue } from 'react-native-reanimated';

import { Colors } from '@/src/constants/colors';
import {
  calculateDday,
  formatDate,
  formatDday,
  isDdayUrgent,
} from '@/src/shared/utils/date';
import type { NotificationListItem } from '@/src/types/notifications';

interface NotificationItemProps {
  notification: NotificationListItem;
  onPress?: (notification: NotificationListItem) => void;
  onDelete?: (notification: NotificationListItem) => void;
  isDeleteDisabled?: boolean;
}

function NotificationItemComponent({
  notification,
  onPress,
  onDelete,
  isDeleteDisabled = false,
}: NotificationItemProps) {
  const router = useRouter();

  // 카드 탭 → 공지 상세로 이동 (NoticeCard와 동일 패턴)
  const handlePress = () => {
    if (onPress) {
      onPress(notification);
      return;
    }
    router.push(`/notice/${notification.noticeId}` as Href);
  };

  const dday =
    notification.deadlineAt != null
      ? calculateDday(notification.deadlineAt)
      : null;
  const urgent = dday != null && isDdayUrgent(dday);

  const renderRightActions = (
    _progress: SharedValue<number>,
    _translation: SharedValue<number>,
    swipeableMethods: SwipeableMethods,
  ) => (
    <View style={styles.deleteActionWrapper}>
      <TouchableOpacity
        style={[
          styles.deleteAction,
          isDeleteDisabled && styles.deleteActionDisabled,
        ]}
        onPress={() => {
          swipeableMethods.close();
          onDelete?.(notification);
        }}
        activeOpacity={0.8}
        disabled={isDeleteDisabled}
      >
        <Feather name="trash-2" size={18} color="#FFFFFF" />
        <Text style={styles.deleteActionText}>삭제</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ReanimatedSwipeable
      containerStyle={styles.swipeableContainer}
      renderRightActions={renderRightActions}
      rightThreshold={36}
      friction={2}
      overshootRight={false}
    >
      <TouchableOpacity
        style={[
          styles.container,
          !notification.isRead && styles.unreadContainer,
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        {!notification.isRead && <View style={styles.unreadAccent} />}

        {/* 상단: 매칭 태그 칩 + D-day 뱃지 */}
        <View style={styles.topRow}>
          <View style={styles.badgeRow}>
            {!notification.isRead && (
              <View style={styles.unreadBadge}>
                <View style={styles.unreadDot} />
                <Text style={styles.unreadBadgeText}>새 알림</Text>
              </View>
            )}
            {notification.matchedTag && (
              <View style={styles.tagChip}>
                <Text style={styles.tagChipText} numberOfLines={1}>
                  #{notification.matchedTag}
                </Text>
              </View>
            )}
          </View>
          {dday != null && (
            <View
              style={[
                styles.ddayBadge,
                urgent ? styles.ddayUrgent : styles.ddayNormal,
              ]}
            >
              <Text
                style={[
                  styles.ddayText,
                  urgent ? styles.ddayTextUrgent : styles.ddayTextNormal,
                ]}
              >
                {formatDday(dday)}
              </Text>
            </View>
          )}
        </View>

        {/* 제목 */}
        <Text
          style={[styles.title, !notification.isRead && styles.unreadTitle]}
          numberOfLines={2}
        >
          {notification.title}
        </Text>

        {/* 발송 시각 */}
        <Text style={styles.date}>{formatDate(notification.createdAt)}</Text>
      </TouchableOpacity>
    </ReanimatedSwipeable>
  );
}

export const NotificationItem = NotificationItemComponent;

const styles = StyleSheet.create({
  swipeableContainer: {
    borderRadius: 12,
  },
  container: {
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    padding: 20,
    gap: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  unreadContainer: {
    backgroundColor: Colors.notificationUnreadBg,
    borderColor: Colors.notificationUnreadBorder,
  },
  unreadAccent: {
    position: 'absolute',
    top: 14,
    bottom: 14,
    left: 0,
    width: 3,
    borderRadius: 9999,
    backgroundColor: Colors.accent,
  },
  deleteActionWrapper: {
    width: 88,
    marginLeft: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  deleteAction: {
    flex: 1,
    backgroundColor: '#D92D20',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  deleteActionDisabled: {
    backgroundColor: '#F97066',
  },
  deleteActionText: {
    fontFamily: 'Pretendard',
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  badgeRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  unreadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 9999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: Colors.notificationUnreadBadgeBg,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 9999,
    backgroundColor: Colors.accent,
  },
  unreadBadgeText: {
    fontFamily: 'Pretendard',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.notificationUnreadText,
  },
  // 매칭 태그 칩
  tagChip: {
    backgroundColor: Colors.chipBg,
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: '65%',
  },
  tagChipText: {
    fontFamily: 'Pretendard',
    fontSize: 12,
    fontWeight: '600',
    color: Colors.categoryBadgeText,
  },
  // D-day 뱃지
  ddayBadge: {
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ddayUrgent: {
    backgroundColor: Colors.ddayUrgentBg,
  },
  ddayNormal: {
    backgroundColor: Colors.ddayNormalBg,
  },
  ddayText: {
    fontFamily: 'Pretendard',
    fontSize: 12,
    fontWeight: '700',
  },
  ddayTextUrgent: {
    color: Colors.ddayUrgentText,
  },
  ddayTextNormal: {
    color: Colors.ddayNormalText,
  },
  // 제목
  title: {
    fontFamily: 'Pretendard',
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  // 발송 시각
  date: {
    fontFamily: 'Pretendard',
    fontSize: 11,
    fontWeight: '400',
    color: Colors.textSecondary,
    opacity: 0.7,
  },
});
