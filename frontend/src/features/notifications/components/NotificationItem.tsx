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

import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
}

function NotificationItemComponent({ notification }: NotificationItemProps) {
  const router = useRouter();

  // 카드 탭 → 공지 상세로 이동 (NoticeCard와 동일 패턴)
  const handlePress = () => {
    router.push(`/notice/${notification.noticeId}` as Href);
  };

  const dday =
    notification.deadlineAt != null
      ? calculateDday(notification.deadlineAt)
      : null;
  const urgent = dday != null && isDdayUrgent(dday);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* 상단: 매칭 태그 칩 + D-day 뱃지 */}
      <View style={styles.topRow}>
        {notification.matchedTag ? (
          <View style={styles.tagChip}>
            <Text style={styles.tagChipText} numberOfLines={1}>
              #{notification.matchedTag}
            </Text>
          </View>
        ) : (
          // 태그가 없는 경우에도 space-between 정렬 유지를 위한 빈 자리
          <View />
        )}
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
      <Text style={styles.title} numberOfLines={2}>
        {notification.title}
      </Text>

      {/* 발송 시각 */}
      <Text style={styles.date}>{formatDate(notification.createdAt)}</Text>
    </TouchableOpacity>
  );
}

export const NotificationItem = NotificationItemComponent;

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    padding: 20,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // 매칭 태그 칩
  tagChip: {
    backgroundColor: Colors.chipBg,
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: '70%',
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
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 22,
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
