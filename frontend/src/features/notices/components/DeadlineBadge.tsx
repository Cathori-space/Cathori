/**
 * DeadlineBadge — D-day 뱃지 컴포넌트
 * 시안: 임박(D-3 이내) → 노란 배경, 일반 → 회색 배경, 마감 → 회색+텍스트 흐림
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/src/constants/colors';
import { calculateDday, formatDday, isDdayUrgent } from '@/src/shared/utils/date';

interface DeadlineBadgeProps {
  /** ISO 8601 마감일 문자열 */
  deadlineAt: string;
}

function DeadlineBadgeComponent({ deadlineAt }: DeadlineBadgeProps) {
  const dday = calculateDday(deadlineAt);
  const label = formatDday(dday);
  const isUrgent = isDdayUrgent(dday);
  const isExpired = dday < 0;

  return (
    <View
      style={[
        styles.container,
        isUrgent && styles.urgentBg,
        isExpired && styles.expiredBg, // 단축 평가 및 스타일 병합 원리
        !isUrgent && !isExpired && styles.normalBg,
      ]}
    >
      <Text
        style={[
          styles.text,
          isUrgent && styles.urgentText,
          isExpired && styles.expiredText,
          !isUrgent && !isExpired && styles.normalText,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export const DeadlineBadge = DeadlineBadgeComponent;

const styles = StyleSheet.create({
  container: {
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  // 임박 (D-3 이내, D-day 포함)
  urgentBg: {
    backgroundColor: Colors.ddayUrgentBg,
  },
  // 일반 (D-4 이상)
  normalBg: {
    backgroundColor: Colors.ddayNormalBg,
  },
  // 마감 (기한 지남)
  expiredBg: {
    backgroundColor: Colors.ddayNormalBg,
    opacity: 0.6,
  },
  text: {
    fontFamily: 'Pretendard',
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 15,
  },
  urgentText: {
    color: Colors.ddayUrgentText,
  },
  normalText: {
    color: Colors.ddayNormalText,
  },
  expiredText: {
    color: Colors.ddayNormalText,
    opacity: 0.5,
  },
});
