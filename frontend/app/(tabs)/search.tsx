/**
 * 검색 화면 (Phase 4)
 *
 * 구조:
 *  ┌──────────────────────────────┐
 *  │ [🔍 검색 입력 바        X]   │
 *  ├──────────────────────────────┤
 *  │ (쿼리 비어있음)               │
 *  │   - history 0건: 안내 텍스트  │
 *  │   - history 1건+: 최근 검색어  │
 *  │ (쿼리 있음)                   │
 *  │   - isLoading: 스피너          │
 *  │   - isError:   재시도 안내      │
 *  │   - 결과 0건: EmptyState       │
 *  │   - 결과 있음: SearchResultItem│
 *  │                + 무한스크롤    │
 *  └──────────────────────────────┘
 *
 * 결과는 NoticeCard가 아닌 행 기반 SearchResultItem 사용 — 스캔 최적화.
 */

import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/src/constants/colors';
import {
  SearchBar,
  SearchHistoryList,
  SearchResultItem,
  useSearchNotices,
} from '@/src/features/search';
import { EmptyState } from '@/src/shared/components';
import { useDebounce } from '@/src/shared/hooks';
import { useSearchHistoryStore } from '@/src/store/useSearchHistoryStore';
import type { Notice } from '@/src/types/api';

/** SearchResultItem 한 행의 추정 높이 (paddingVertical 14*2 + 내용 약 40 = 68) */
const ESTIMATED_ROW_HEIGHT = 68;

export default function SearchScreen() {
  // 입력 원본은 즉시 갱신, 쿼리 발사는 300ms 디바운스
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  // 검색 기록 스토어 — 영속화는 AsyncStorage가 담당
  const history = useSearchHistoryStore((s) => s.history);
  const addEntry = useSearchHistoryStore((s) => s.addEntry);
  const removeEntry = useSearchHistoryStore((s) => s.removeEntry);
  const clearAll = useSearchHistoryStore((s) => s.clearAll);

  const {
    data,                  // ← 검색 결과 데이터
    isLoading,             // ← 첫 로딩 중인지?
    isError,               // ← 에러 났는지?
    refetch,               // ← 수동으로 다시 요청
    fetchNextPage,         // ← 다음 페이지 불러오기
    hasNextPage,           // ← 다음 페이지 있는지?
    isFetchingNextPage,    // ← 다음 페이지 로딩 중인지?
  } = useSearchNotices(debouncedQuery);

  // 모든 페이지의 content를 평탄화
  const results: Notice[] = data?.pages.flatMap((p) => p.content) ?? [];

  // 엔터/제출 시점에만 히스토리 추가 (디바운스 키 입력으로는 추가 안 함 — 노이즈 방지)
  const handleSubmit = (text: string) => {
      const t = text.trim();
      if (t) addEntry(t);
  };

  // 히스토리 행 탭 → 입력값을 해당 키워드로 채워 검색 트리거
  const handleSelectHistory = (keyword: string) => {
    setQuery(keyword);
  };

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // FlatList 콜백 — 인라인 화살표 함수 방지 (Global Rules)
  // debouncedQuery를 prop으로 넘겨 매칭 부분 하이라이트에 사용
  const renderItem = ({ item }: { item: Notice }) => (
    <SearchResultItem notice={item} query={debouncedQuery} />
  );
  const keyExtractor = (item: Notice) => item.id;
  const getItemLayout = (_: unknown, index: number) => ({
    length: ESTIMATED_ROW_HEIGHT,
    offset: (ESTIMATED_ROW_HEIGHT + StyleSheet.hairlineWidth) * index,
    index,
  });

  const trimmed = debouncedQuery.trim();
  const isSearching = trimmed.length > 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.searchBarArea}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          onSubmit={handleSubmit}
        />
      </View>

      {/* ─── 쿼리 비어있음 ─────────────────────────── */}
      {!isSearching &&
        (history.length > 0 ? (
          <SearchHistoryList
            history={history}
            onSelect={handleSelectHistory}
            onRemove={removeEntry}
            onClearAll={clearAll}
          />
        ) : (
          <View style={styles.hintContainer}>
            <Feather name="search" size={48} color={Colors.separator} />
            <Text style={styles.hintText}>검색어를 입력해주세요</Text>
          </View>
        ))}

      {/* ─── 검색 중 ──────────────────────────────── */}
      {isSearching && isLoading && (
        <View style={styles.loadingContainer}>
          {/* 로딩 컴포넌트 */}
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}

      {isSearching && isError && (
        <View style={styles.errorContainer}>
          {/* 에러 메시지 */}
          <Text style={styles.errorText}>검색 중 오류가 발생했습니다</Text>
          <Pressable onPress={() => refetch()} hitSlop={8}>
            {/* 재시도 버튼 */}
            <Text style={styles.retryText}>다시 시도</Text>
          </Pressable>
        </View>
      )}

      {isSearching && !isLoading && !isError && (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={ItemSeparator} // 아이템 간 구분선 추가
          ListEmptyComponent={ // 검색 결과가 없을 때 표시
            <EmptyState message="검색 결과가 없습니다" iconName="search" />
          }
          onEndReached={handleEndReached} // 스크롤 맨 아래에 닿으면 다음 페이지 불러오기
          onEndReachedThreshold={0.5}
          ListFooterComponent={ // 다음 페이지 로딩 시 로딩 인디케이터 표시
            isFetchingNextPage ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={Colors.primary} />
              </View>
            ) : null
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchBarArea: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  // 빈 안내 (히스토리 없음)
  hintContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  hintText: {
    fontFamily: 'Pretendard',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  // 로딩
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 에러
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontFamily: 'Pretendard',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  retryText: {
    fontFamily: 'Pretendard',
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  // 리스트
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 24,
    flexGrow: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.divider,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
