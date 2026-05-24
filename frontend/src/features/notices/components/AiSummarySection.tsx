/**
 * AiSummarySection — AI 요약 섹션 컴포넌트
 * aiSummaryStatus별 분기 렌더링:
 *   SUCCESS    → 요약 텍스트 (bullet list)
 *   PENDING    → 스켈레톤 + "AI 요약을 생성하고 있습니다..."
 *   SKIPPED    → "요약을 불러올 수 없습니다" 안내 (FAILED와 동일)
 *   FAILED     → "요약을 불러올 수 없습니다" 안내
 *
 * aiSummary 형식 대응:
 *   - JSON 배열 문자열: '["항목1","항목2"]' → JSON.parse 후 배열 순회
 *   - bullet 텍스트:   '• 항목1\n• 항목2'  → \n 분리 + • 접두어 제거 (Mock 호환)
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
      {aiSummaryStatus === 'SUCCESS' && aiSummary != null ? (
        <SummaryContent summary={aiSummary} />
      ) : aiSummaryStatus === 'FAILED' || aiSummaryStatus === 'SKIPPED' ? (
        <FailedContent />
      ) : (
        <LoadingContent />
      )}
    </View>
  );
}

export const AiSummarySection = React.memo(AiSummarySectionComponent);

// ─── SUCCESS: 요약 텍스트 ──────────────────────────────────────────────

/**
 * AI 요약 텍스트를 bullet 리스트로 렌더링한다.
 *
 * 백엔드 실제 응답: JSON 배열 문자열 '["항목1","항목2"]'
 * Mock 데이터:       bullet 텍스트 '• 항목1\n• 항목2'
 *
 * 두 형식 모두 처리하여 Mock ↔ 실제 API 전환 시 깨지지 않도록 한다.
 */
function SummaryContent({ summary }: { summary: string }) {
  const bullets = parseSummary(summary);

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

/**
 * aiSummary 문자열을 bullet 배열로 파싱한다.
 * JSON 배열 문자열이면 JSON.parse, 아니면 \n 분리 + • 제거 (기존 Mock 호환)
 */
function parseSummary(summary: string): string[] {
  const trimmed = summary.trim();

  // JSON 배열 형태인지 판별 ('[' 로 시작)
  if (trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item).trim())
          .filter((item) => item.length > 0);
      }
    } catch {
      // JSON 파싱 실패 시 fallback으로 bullet 텍스트 파싱
    }
  }

  // fallback: \n 분리 + • 접두어 제거 (Mock 데이터 호환)
  return trimmed
    .split('\n')
    .map((line) => line.replace(/^•\s*/, '').trim())
    .filter((line) => line.length > 0);
}

// ─── PENDING: 로딩 ──────────────────────────────────────────────────

function LoadingContent() {
  return (
    <View style={styles.statusBox}>
      <ActivityIndicator size="small" color={Colors.primary} />
      <Text style={styles.statusText}>AI 요약을 생성하고 있습니다...</Text>
    </View>
  );
}

// ─── FAILED / SKIPPED: 실패 ────────────────────────────────────────────

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
