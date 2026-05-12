/**
 * CategoryTab — 대분류 태그 탭 컴포넌트
 * pencil.dev 시안: pill 버튼, 수평 배치, gap 8
 * 미선택: #EEEEEE 배경 + #44465299 텍스트
 * 선택: #00288C 배경 + #FFFFFF 텍스트
 * padding [8, 20], borderRadius 9999, fontSize 14, fontWeight 600
 */

import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors } from '@/src/constants/colors';
import type { NoticeCategory } from '@/src/types/api';

interface CategoryTabProps {
  /** 대분류 카테고리 목록 */
  categories: NoticeCategory[];
  /** 현재 선택된 카테고리 */
  selectedCategory: NoticeCategory;
  /** 카테고리 변경 콜백 */
  onSelect: (category: NoticeCategory) => void;
}

function CategoryTabComponent({
  categories,
  selectedCategory,
  onSelect,
}: CategoryTabProps) {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal // 가로 방향 스크롤
        showsHorizontalScrollIndicator={false} // 스크롤 바 숨기기
        contentContainerStyle={styles.container}
      >
        {categories.map((category) => {
          const isSelected = category === selectedCategory;
          return (
            <TabButton
              key={category}
              label={category}
              isSelected={isSelected}
              onPress={() => onSelect(category)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

export const CategoryTab = React.memo(CategoryTabComponent);

// ─── 개별 탭 버튼 ────────────────────────────────────────────────────

interface TabButtonProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}

function TabButtonComponent({ label, isSelected, onPress }: TabButtonProps) {
  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  return (
    <TouchableOpacity // 투명도가 변하는 커스텀 버튼
      style={[styles.button, isSelected && styles.buttonSelected]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={[styles.buttonText, isSelected && styles.buttonTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// 스크롤 내, 개별 탭 별로 메모이제이션 적용
const TabButton = React.memo(TabButtonComponent);

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: 16,
  },
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 24,
    paddingBottom: 4,
  },
  button: {
    backgroundColor: Colors.tabBg,
    borderRadius: 9999,
    paddingVertical: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonSelected: {
    backgroundColor: Colors.primary,
  },
  buttonText: {
    fontFamily: 'Pretendard',
    fontSize: 14,
    fontWeight: '600',
    color: Colors.tabText,
    lineHeight: 20,
    textAlign: 'center',
  },
  buttonTextSelected: {
    color: '#FFFFFF',
  },
});
