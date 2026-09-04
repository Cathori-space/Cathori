/**
 * NoticeCard — 공지 카드 컴포넌트 (기본형)
 * 시안 Card 1, Card 3 기준
 *
 * 구조:
 * ┌─────────────────────────────┐
 * │ [카테고리뱃지]       [D-day] │
 * │ 제목 텍스트                  │
 * │ ┌─ AI 요약 미리보기 ──────┐ │
 * │ │ • 요약 내용 1줄~2줄       │ │
 * │ └──────────────────────────┘ │
 * │ 날짜 · 부서          🔖     │
 * └─────────────────────────────┘
 *
 * padding 20, gap 8, cornerRadius 12, fill #FFFFFF
 */

import { Feather, FontAwesome } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors } from '@/src/constants/colors';
import { formatDate } from '@/src/shared/utils/date';
import type { Notice } from '@/src/types/api';

import { CategoryBadge } from './CategoryBadge';
import { DeadlineBadge } from './DeadlineBadge';

interface NoticeCardProps {
  notice: Notice;
  /** 즐겨찾기 토글 콜백 */
  onToggleBookmark?: (noticeId: string) => void;
  /** 즐겨찾기 요청 중 중복 클릭 방지 */
  isBookmarkDisabled?: boolean;
}

function NoticeCardComponent({
  notice,
  onToggleBookmark,
  isBookmarkDisabled = false,
}: NoticeCardProps) {
  const router = useRouter();

  // 카드 탭 → 공지 상세로 이동
  const handlePress = () => {
    router.push(`/notice/${notice.id}` as Href);
  };

  // 즐겨찾기 토글
  const handleBookmarkPress = () => {
    if (isBookmarkDisabled) return;
    onToggleBookmark?.(notice.id);
  };

  // AI 요약 1줄만 가져오기
  const getFirstSummaryLine = (aiSummary: string | null): string => {
    if (!aiSummary) return '';
    try {
      const parsed = JSON.parse(aiSummary);
      if (Array.isArray(parsed)) {
        return parsed[0] || '';
      }
      return aiSummary;
    } catch {
      // 백엔드에서 간혹 일반 string으로 줄바꿈해서 줄 때를 위한 대비책
      return aiSummary.replace(/•\s*/g, '').split('\n')[0] || '';
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* 상단: 카테고리 뱃지 + D-day 뱃지 */}
      <View style={styles.badgeRow}>
        {notice?.category != null && <CategoryBadge category={notice.category} />}
        {notice.deadlineAt != null && (
          <DeadlineBadge deadlineAt={notice.deadlineAt} />
        )}
      </View>

      {/* 제목 */}
      <View style={styles.titleContainer}>
        <Text style={styles.title} numberOfLines={2}>
          {notice.title}
        </Text>
      </View>

      {/* AI 요약 미리보기 — SUCCESS 상태일 때만 표시 */}
      {notice.aiSummaryStatus === 'SUCCESS' && notice.aiSummary != null && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryContent}>
            <Feather
              name="file-text"
              size={10.5}
              color={Colors.primary}
              style={styles.summaryIcon}
            />
            <Text style={styles.summaryText} numberOfLines={2}>
              {/* 마크 제거하고 첫 줄만 가져오기 */}
              {getFirstSummaryLine(notice.aiSummary)}
            </Text>
          </View>
        </View>
      )}

      {/* 하단: 날짜 · 부서 + 즐겨찾기 */}
      <View style={styles.footer}>
        <View style={styles.meta}>
          <Text style={styles.metaText}>{formatDate(notice.postedAt)}</Text>
          <View style={styles.metaDot} />
          <Text style={styles.metaText}>{notice.department}</Text>
        </View>
        <TouchableOpacity
          onPress={(event) => {
            event.stopPropagation();
            handleBookmarkPress();
          }}
          hitSlop={8}
          disabled={isBookmarkDisabled}
        >
          {notice.isBookmarked ? (
            <FontAwesome name="bookmark" size={17} color={Colors.bookmarkActive} />
          ) : (
            <Feather name="bookmark" size={18} color={Colors.bookmarkInactive} />
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export const NoticeCard = NoticeCardComponent;

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    padding: 20,
    gap: 8,
  },
  // 뱃지 행
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // 제목
  titleContainer: {
    paddingTop: 4,
  },
  title: {
    fontFamily: 'Pretendard',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  // AI 요약 미리보기
  summaryContainer: {
    backgroundColor: Colors.summaryBg,
    borderRadius: 8,
    padding: 12,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  summaryIcon: {
    marginTop: 5,
    marginRight: 6,
  },
  summaryText: {
    flex: 1,
    fontFamily: 'Pretendard',
    fontSize: 14,
    fontWeight: '400',
    color: Colors.textSecondary,
    lineHeight: 22.75,
  },
  // 하단 메타
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    opacity: 0.7,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaText: {
    fontFamily: 'Pretendard',
    fontSize: 11,
    fontWeight: '400',
    color: Colors.textSecondary,
    lineHeight: 16.5,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 9999,
    backgroundColor: Colors.separator,
  },
});
