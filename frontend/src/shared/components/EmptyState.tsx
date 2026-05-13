/**
 * EmptyState — 빈 상태 안내 컴포넌트
 * 검색 결과 0건, 카테고리 필터 결과 없음 등에 사용
 */

import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/src/constants/colors';

interface EmptyStateProps {
  /** 안내 메시지 */
  message?: string;
  /** 아이콘 이름 (Feather) */
  iconName?: string;
}

function EmptyStateComponent({
  message = '표시할 공지가 없습니다.',
  iconName = 'inbox',
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Feather
        name={iconName as keyof typeof Feather.glyphMap}
        size={48}
        color={Colors.separator}
      />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

export const EmptyState = React.memo(EmptyStateComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    gap: 16,
  },
  text: {
    fontFamily: 'Pretendard',
    fontSize: 14,
    fontWeight: '400',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
