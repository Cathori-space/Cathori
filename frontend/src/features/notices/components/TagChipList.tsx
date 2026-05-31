import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors } from '@/src/constants/colors';

interface TagChipListProps {
  /** 소분류 태그 목록 (예: ['#국가장학', '#교내장학', ...]) */
  tags: string[];
  /** 현재 선택된 태그 (null = 미선택) */
  selectedTag: string | null;
  /** 태그 토글 콜백 — 같은 값 다시 탭 시 해제(null) */
  onSelect: (tag: string) => void;
  /** 키워드 추가(+) 버튼 클릭 콜백 */
  onAddPress?: () => void;
}

function TagChipListComponent({ tags, selectedTag, onSelect, onAddPress }: TagChipListProps) {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {tags.map((tag) => {
          const isSelected = tag === selectedTag;
          return (
            <ChipButton
              key={tag}
              label={'#' + tag}
              isSelected={isSelected}
              onPress={() => onSelect(tag)}
            />
          );
        })}

        {/* 사용자 정의 태그가 있든 없든 항상 노출되는 '+' 설정 추가 버튼 */}
        {onAddPress && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={onAddPress}
            activeOpacity={0.7}
          >
            <Text style={styles.chipText}>{'+태그'}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

export const TagChipList = TagChipListComponent;

// ─── 개별 칩 버튼 ────────────────────────────────────────────────────

interface ChipButtonProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}

function ChipButtonComponent({ label, isSelected, onPress }: ChipButtonProps) {
  const handlePress = () => {
    onPress();
  };

  return (
    <TouchableOpacity
      style={[styles.chip, isSelected && styles.chipSelected]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const ChipButton = ChipButtonComponent;

const styles = StyleSheet.create({
  wrapper: {
    height: 52,
    justifyContent: 'center',
  },
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 24,
  },
  chip: {
    backgroundColor: Colors.chipBg,
    borderRadius: 9999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipSelected: {
    backgroundColor: Colors.primary,
  },
  chipText: {
    fontFamily: 'Pretendard',
    fontSize: 12,
    fontWeight: '500',
    color: Colors.chipText,
    lineHeight: 16,
    textAlign: 'center',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  addButton: {
    backgroundColor: Colors.chipBg,
    borderRadius: 9999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
