/**
 * TodayHighlightCard — Today's Highlight 시그니처 카드
 * 시안: hljQp 노드
 *
 * 구조:
 * ┌───────────────────────────────┐
 * │ TODAY'S HIGHLIGHT             │
 * │ 제목 텍스트 (최대 2줄)        │
 * │                     🏫 아이콘 │
 * │ 마감일: 2026.04.15 (18:00까지)│
 * └───────────────────────────────┘
 *
 * fill #FFDF9C, cornerRadius 12, 좌우마진 16, width 358
 * shadow: blur 1.75, offset y:1, color #0000000D
 */

import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors } from '@/src/constants/colors';
import type { Notice } from '@/src/types/api';

interface TodayHighlightCardProps {
  notice: Notice;
}

function TodayHighlightCardComponent({ notice }: TodayHighlightCardProps) {
  const router = useRouter();

  const handlePress = () => {
    router.push(`/notice/${notice.id}` as Href);
  };

  // 마감일 포맷 (예: "마감일: 2026.04.15 (18:00까지)")
  const deadlineLabel = notice.deadlineAt
    ? `마감일: ${notice.deadlineAt.replace(/-/g, '.')}`
    : undefined;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      {/* TODAY'S HIGHLIGHT 라벨 */}
      <View style={styles.labelContainer}>
        <Text style={styles.label}>TODAY&apos;S HIGHLIGHT</Text>
      </View>

      {/* 제목 */}
      <View style={styles.headingContainer}>
        <Text style={styles.heading} numberOfLines={2}>
          {notice.title}
        </Text>
      </View>

      {/* 마감일 */}
      {deadlineLabel != null && (
        <View style={styles.deadlineContainer}>
          <Text style={styles.deadline}>{deadlineLabel}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export const TodayHighlightCard = TodayHighlightCardComponent;

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.highlightBg,
    borderRadius: 12,
    marginHorizontal: 16,
    height: 132,
    overflow: 'hidden',
    // 시안: shadow
    // Android only: elevation으로 그림자 대체
    elevation: 1,
  },
  // TODAY'S HIGHLIGHT 라벨
  labelContainer: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  label: {
    fontFamily: 'Pretendard',
    fontSize: 10,
    fontWeight: '700',
    color: Colors.highlightSubText,
    letterSpacing: 1,
    lineHeight: 15,
  },
  // 제목
  headingContainer: {
    paddingHorizontal: 20,
    paddingBottom: 0.75,
  },
  heading: {
    fontFamily: 'Pretendard',
    fontSize: 18,
    fontWeight: '700',
    color: Colors.highlightText,
    lineHeight: 22.5,
  },
  // 마감일
  deadlineContainer: {
    paddingHorizontal: 20,
    paddingTop: 4,
    opacity: 0.8,
  },
  deadline: {
    fontFamily: 'Pretendard',
    fontSize: 12,
    fontWeight: '400',
    color: Colors.highlightSubText,
    lineHeight: 16,
  },
});
