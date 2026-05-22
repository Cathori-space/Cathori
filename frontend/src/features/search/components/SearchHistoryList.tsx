/**
 * SearchHistoryList — 최근 검색어 목록
 *
 * 부모가 history가 1건 이상일 때만 렌더링한다는 전제.
 * (빈 상태 UI는 부모가 처리 — EmptyState 또는 안내 텍스트)
 *
 * 인터랙션:
 *  - 행 탭 → onSelect(keyword): 부모가 검색어를 SearchBar value로 채워넣어 검색 트리거
 *  - 행 우측 X 탭 → onRemove(keyword): 개별 항목 삭제
 *  - 헤더 "전체 지우기" 탭 → onClearAll(): 기록 전체 비움
 */

import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/src/constants/colors';

interface SearchHistoryListProps {
  history: string[];
  onSelect: (keyword: string) => void;
  onRemove: (keyword: string) => void;
  onClearAll: () => void;
}

function SearchHistoryListComponent({
  history,
  onSelect,
  onRemove,
  onClearAll,
}: SearchHistoryListProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>최근 검색어</Text>
        <Pressable onPress={onClearAll} hitSlop={8}>
          <Text style={styles.clearAll}>전체 지우기</Text>
        </Pressable>
      </View>

      {history.map((keyword) => (
        <Pressable
          key={keyword}
          style={styles.row}
          onPress={() => onSelect(keyword)}
        >
          <Feather name="clock" size={14} color={Colors.textSecondary} />
          <Text style={styles.keyword} numberOfLines={1}>
            {keyword}
          </Text>
          <Pressable onPress={() => onRemove(keyword)} hitSlop={8}>
            <Feather name="x" size={14} color={Colors.textSecondary} />
          </Pressable>
        </Pressable>
      ))}
    </View>
  );
}

export const SearchHistoryList = SearchHistoryListComponent;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
  },
  title: {
    fontFamily: 'Pretendard',
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  clearAll: {
    fontFamily: 'Pretendard',
    fontSize: 12,
    fontWeight: '400',
    color: Colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  keyword: {
    flex: 1,
    fontFamily: 'Pretendard',
    fontSize: 14,
    fontWeight: '400',
    color: Colors.textPrimary,
  },
});
