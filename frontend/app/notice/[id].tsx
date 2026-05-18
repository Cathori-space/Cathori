/**
 * 공지 상세 화면 — app/notice/[id].tsx
 *
 * 구조:
 * ┌─ 헤더 (fixed) ─────────────────────────────┐
 * │ ← 뒤로          🔖 즐겨찾기  🔗 공유      │
 * ├─ ScrollView ──────────────────────────────┤
 * │  [카테고리뱃지] [D-day뱃지]               │
 * │  제목                                     │
 * │  작성일 · 부서 · 조회수                   │
 * │  ── AI 요약 섹션 ──                        │
 * │  태그                                     │
 * ├─ Footer (fixed) ──────────────────────────┤
 * │  [링크 복사]  [    원문 보기    ]          │
 * └───────────────────────────────────────────┘
 */

import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/src/constants/colors';
import {
  AiSummarySection,
  CategoryBadge,
  DeadlineBadge,
} from '@/src/features/notices';
import { useNoticeDetail } from '@/src/features/notices/hooks';
import { formatDate } from '@/src/shared/utils/date';

export default function NoticeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); // URL 파라미터에서 ID 가져오기
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: notice, isLoading } = useNoticeDetail(id ?? ''); // ID를 이용해 공지 상세 데이터 가져오기

  // 원문 링크 열기
  const handleOpenUrl = () => {
    if (notice?.url) {
      Linking.openURL(notice.url);
    }
  };

  // 원문 링크 복사
  const handleCopyUrl = async () => {
    if (notice?.url) {
      await Clipboard.setStringAsync(notice.url);
    }
  };

  // 공유
  const handleShare = () => {
    if (notice) {
      Share.share({
        message: `[Cathori] ${notice.title}\n${notice.url}`,
      });
    }
  };

  // 즐겨찾기 토글
  const handleBookmark = () => {
    // TODO: 즐겨찾기 낙관적 업데이트 useMutation 연동
    if (notice) {
      console.log('즐겨찾기 토글:', notice.id);
    }
  };

  // 하단 고정 Footer 높이 (Safe Area 하단 포함)
  const footerHeight = 56 + 32 + insets.bottom; // 버튼 높이 + 패딩 + 안전영역

  // 로딩 상태
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // 공지를 찾을 수 없는 경우
  if (notice == null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Feather name="arrow-left" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={Colors.separator} />
          <Text style={styles.errorText}>공지를 찾을 수 없습니다</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        {/* ─── 헤더: 뒤로가기 + 액션 버튼 ─── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Feather name="arrow-left" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleBookmark} hitSlop={8}>
              <Feather
                name="bookmark"
                size={22}
                color={
                  notice.isBookmarked ? Colors.primary : Colors.bookmarkInactive
                }
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} hitSlop={8}>
              <Feather name="share-2" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* ─── 스크롤 영역 ─── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: footerHeight + 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 공지 메타 정보 */}
        <View style={styles.metaSection}>
          <View style={styles.badgeRow}>
            <CategoryBadge category={notice.category} />
            {notice.deadlineAt != null && (
              <DeadlineBadge deadlineAt={notice.deadlineAt} />
            )}
          </View>

          <Text style={styles.title}>{notice.title}</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoText}>{formatDate(notice.postedAt)}</Text>
            <View style={styles.infoDot} />
            <Text style={styles.infoText}>{notice.department}</Text>
            <View style={styles.infoDot} />
            {/*TODO: 조회수 API 연동 및 조회 텍스트 눈 이모지로 변경 필요*/}
            <Text style={styles.infoText}>조회 {notice.viewCount}</Text>
          </View>
        </View>

        {/* 구분선 */}
        <View style={styles.divider} />

        {/* AI 요약 섹션 */}
        <View style={styles.summarySection}>
          <AiSummarySection
            aiSummary={notice.aiSummary}
            aiSummaryStatus={notice.aiSummaryStatus}
          />
        </View>

        {/* 태그 */}
        {notice.tags.length > 0 && (
          <View style={styles.tagSection}>
            {notice.tags.map((tag) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ─── 하단 고정 Footer ─── */}
      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 },
        ]}
      >
        <View style={styles.footerButtonRow}>
          {/* 링크 복사 — 작은 회색 버튼 (서브 액션) */}
          <TouchableOpacity
            style={styles.copyButton}
            onPress={handleCopyUrl}
            activeOpacity={0.7}
          >
            <Feather name="copy" size={18} color={Colors.textPrimary} />
            <Text style={styles.copyButtonText}>링크 복사</Text>
          </TouchableOpacity>

          {/* 원문 보기 — 큰 블루 버튼 (메인 액션) */}
          <TouchableOpacity
            style={styles.openButton}
            onPress={handleOpenUrl}
            activeOpacity={0.85}
          >
            <Text style={styles.openButtonText}>원문 보기</Text>
            <Feather name="external-link" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeTop: {
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontFamily: 'Pretendard',
    fontSize: 14,
    fontWeight: '400',
    color: Colors.textSecondary,
  },
  // ─── 헤더 ───
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  // ─── 스크롤 ───
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  // ─── 메타 정보 ───
  metaSection: {
    paddingHorizontal: 24,
    gap: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: 'Pretendard',
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 28,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontFamily: 'Pretendard',
    fontSize: 12,
    fontWeight: '400',
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  infoDot: {
    width: 3,
    height: 3,
    borderRadius: 9999,
    backgroundColor: Colors.separator,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginHorizontal: 24,
    marginVertical: 20,
  },
  // ─── AI 요약 ───
  summarySection: {
    paddingHorizontal: 24,
  },
  // ─── 태그 ───
  tagSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  tagChip: {
    backgroundColor: Colors.chipBg,
    borderRadius: 9999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  tagText: {
    fontFamily: 'Pretendard',
    fontSize: 12,
    fontWeight: '500',
    color: Colors.chipText,
    lineHeight: 16,
  },
  // ─── 하단 고정 Footer ───
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(197,197,212,0.15)',
    paddingTop: 16,
    paddingHorizontal: 16,
    // Android only — elevation으로 blur 효과 대체
    ...Platform.select({
      android: { elevation: 8 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
    }),
  },
  footerButtonRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  // 링크 복사 — 원문 보기와 동일 비율 (flex:1), 아이콘 좌측 배치
  copyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    backgroundColor: Colors.ddayNormalBg,
    borderRadius: 12,
  },
  copyButtonText: {
    fontFamily: 'Pretendard',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 16,
    textAlign: 'center',
  },
  // 원문 보기 — 큰 블루 버튼 (메인 액션)
  openButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: 12,
  },
  openButtonText: {
    fontFamily: 'Pretendard',
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 24,
  },
});
