/**
 * AiSummarySection — AI 요약 섹션 컴포넌트
 * aiSummaryStatus별 분기 렌더링:
 *   DONE       → 요약 텍스트 (bullet list)
 *   PENDING    → 스켈레톤 + "AI 요약을 생성하고 있습니다..."
 *   PROCESSING → 스켈레톤 + "AI 요약을 생성하고 있습니다..."
 *   FAILED     → "요약을 불러올 수 없습니다" 안내
 */

import { Feather } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/src/constants/colors';
import type { AiSummaryStatus } from '@/src/types/api';

interface AiSummarySectionProps {
  aiSummary: string | null;
  aiSummaryStatus: AiSummaryStatus;
}

function AiSummarySectionComponent({
  aiSummary,
  aiSummaryStatus,
}: AiSummarySectionProps) {
  return (
    <View style={styles.container}>
      {/* 섹션 헤더 */}
      <View style={styles.header}>
        <Feather name="cpu" size={14} color={Colors.primary} />
        <Text style={styles.headerText}>AI 요약</Text>
      </View>

      {/* 상태별 분기 렌더링 */}
      {aiSummaryStatus === 'DONE' && aiSummary != null ? (
        <SummaryContent summary={aiSummary} />
      ) : aiSummaryStatus === 'FAILED' ? (
        <FailedContent />
      ) : (
        <LoadingContent />
      )}
    </View>
  );
}

export const AiSummarySection = React.memo(AiSummarySectionComponent);

// ─── DONE: 요약 텍스트 ────────────────────────────────────────────────

function SummaryContent({ summary }: { summary: string }) {
  const bullets = summary
    .split('\n')
    .map((line) => line.replace(/^•\s*/, '').trim())
    .filter((line) => line.length > 0);

  return (
    <View style={styles.summaryBox}>
      {bullets.map((bullet, index) => (
        <View key={`bullet-${index}`} style={styles.bulletRow}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>{bullet}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── PENDING / PROCESSING: 로딩 ──────────────────────────────────────

function LoadingContent() {
  return (
    <View style={styles.statusBox}>
      <ActivityIndicator size="small" color={Colors.primary} />
      <Text style={styles.statusText}>AI 요약을 생성하고 있습니다...</Text>
    </View>
  );
}

// ─── FAILED: 실패 ─────────────────────────────────────────────────────

function FailedContent() {
  return (
    <View style={styles.statusBox}>
      <Feather name="alert-circle" size={16} color={Colors.textSecondary} />
      <Text style={styles.statusText}>요약을 불러올 수 없습니다</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerText: {
    fontFamily: 'Pretendard',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    lineHeight: 20,
  },
  summaryBox: {
    backgroundColor: Colors.summaryBg,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    fontFamily: 'Pretendard',
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    lineHeight: 22,
    marginTop: 1,
  },
  bulletText: {
    flex: 1,
    fontFamily: 'Pretendard',
    fontSize: 14,
    fontWeight: '400',
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  statusBox: {
    backgroundColor: Colors.summaryBg,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  statusText: {
    fontFamily: 'Pretendard',
    fontSize: 13,
    fontWeight: '400',
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
