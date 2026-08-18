/**
 * SearchResultItem — 검색 결과 한 줄 행
 *
 * 시각 구조:
 *  ┌────────────────────────────────────────┐
 *  │ [장학]  국가장학금 신청 안내      D-3  │
 *  │         학생지원팀 · 2026.03.28        │
 *  └────────────────────────────────────────┘
 *
 *  - 좌측: CategoryBadge (small)
 *  - 중앙: 제목 1줄 (검색어 매칭 부분 하이라이트) + 부서·날짜 1줄
 *  - 우측: DeadlineBadge (deadlineAt이 있을 때만)
 *
 * 카드(NoticeCard) 대신 검색 결과에서만 쓰는 행 컴포넌트. AI 요약 미리보기는
 * 스캔 효율을 위해 제거하고, 빠르게 훑어 원하는 공지로 진입하는 흐름에 최적화.
 */

import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/src/constants/colors';
import { CategoryBadge, DeadlineBadge } from '@/src/features/notices';
import { formatDate } from '@/src/shared/utils/date';
import type { SearchNoticeListItem } from '@/src/types/api';

interface SearchResultItemProps {
  // 슬림 페이로드 — aiSummary/url/isBookmarked/tags는 검색 응답에 미포함
  notice: SearchNoticeListItem;
  /** 검색어 — 제목 내 매칭 부분 하이라이트용. 빈 문자열이면 하이라이트 없이 표시 */
  query: string;
}

function SearchResultItemComponent({ notice, query }: SearchResultItemProps) {
  const router = useRouter();

  const handlePress = () => {
    router.push(`/notice/${notice.id}` as Href);
  };

  return (
    <Pressable style={styles.row} onPress={handlePress}>
      <CategoryBadge category={notice.category} />

      <View style={styles.middle}>
        {/*numberOfLines={1}: 텍스트 한 줄만 남기고 크기 넘치면 점으로 표시*/}
        <Text style={styles.title} numberOfLines={1}>
          {renderHighlighted(notice.title, query)}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{notice.department}</Text>
          <View style={styles.metaDot} />
          <Text style={styles.metaText}>{formatDate(notice.postedAt)}</Text>
        </View>
      </View>

      {notice.deadlineAt != null && (
        <DeadlineBadge deadlineAt={notice.deadlineAt} />
      )}
    </Pressable>
  );
}

export const SearchResultItem = SearchResultItemComponent;

/**
 * 검색어 매칭 부분을 primary 색상 + bold로 강조해 노드 배열로 반환.
 * 대소문자 무시 매칭하되 원본 텍스트의 대소문자는 그대로 보존.
 * (`'안내'`로 검색해도 표시 글자는 원문 그대로 — `lowerText.indexOf()`로
 * 위치만 찾고 `text.slice()`로 원문에서 잘라냄)
 */
function renderHighlighted(text: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q) return text;

  const lowerText = text.toLowerCase();
  const lowerQ = q.toLowerCase();
  const nodes: React.ReactNode[] = [];
  let key = 0;
  let cursor = 0;

  while (cursor < text.length) {
    const found = lowerText.indexOf(lowerQ, cursor);
    if (found === -1) { // 못 찾으면 cursor부터 끝까지 넣고 break
      nodes.push(<Text key={`t-${key++}`}>{text.slice(cursor)}</Text>); 
      break;
    }
    if (found > cursor) { // 찾으면 cursor부터 찾은 곳까지 넣고
      nodes.push(<Text key={`t-${key++}`}>{text.slice(cursor, found)}</Text>);
    }
    nodes.push(
      <Text key={`h-${key++}`} style={styles.highlight}>
        {text.slice(found, found + q.length)}
      </Text>,
    );
    cursor = found + q.length;
  }

  return nodes;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  middle: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  title: {
    fontFamily: 'Pretendard',
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  highlight: {
    color: Colors.primary,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontFamily: 'Pretendard',
    fontSize: 11,
    fontWeight: '400',
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 9999,
    backgroundColor: Colors.separator,
  },
});
