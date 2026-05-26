/**
 * CategoryBadge — 카테고리 뱃지 컴포넌트
 * 시안: Primary 10% 배경 (#00288C1A) + Primary 텍스트
 * cornerRadius 4, padding [4, 10], fontSize 10, fontWeight 700
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/src/constants/colors';
import type { NoticeCategory } from '@/src/types/api';

interface CategoryBadgeProps {
  category: NoticeCategory | null; // 백엔드에서 '학과공지' 등 추가 값 가능성이 있지만 그 부분들은 현재는 null로 보내주기로 함
}

function CategoryBadgeComponent({ category }: CategoryBadgeProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{category}</Text>
    </View>
  );
}

export const CategoryBadge = CategoryBadgeComponent;

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.categoryBadgeBg,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: 'Pretendard',
    fontSize: 10,
    fontWeight: '700',
    color: Colors.categoryBadgeText,
    letterSpacing: -0.25,
    lineHeight: 15,
  },
});
