/**
 * MainHeader — 앱 공용 메인 헤더
 *
 * 사용 화면: 메인 피드, 검색, 설정
 * 시안: 설정 화면 Y98fYM 노드, 메인 화면 gBevW 노드
 *
 * 구조:
 * ┌─────────────────────────────┐
 * │ 🏫 Cathori              🔔  │
 * └─────────────────────────────┘
 *
 * fill #00175B (DCU Blue), height 64, padding [0, 24]
 * 로고: Pretendard 20 / 900 / white, letterSpacing -1
 * 알림 아이콘: 16x20 흰색 + 노란 dot (#FCC006)
 */

import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/src/constants/colors';

function MainHeaderComponent() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {/* 로고 영역 */}
        <View style={styles.logoSection}>
          <Feather name="book-open" size={18} color="#FFFFFF" />
          <Text style={styles.logoText}>Cathori</Text>
        </View>

        {/* 알림 아이콘 + dot */}
        <View style={styles.bellSection}>
          <Feather name="bell" size={20} color="#FFFFFF" />
          {/* 알림 dot — #FCC006, 10x10, border #00288C 2px */}
          <View style={styles.notificationDot} />
        </View>
      </View>
    </View>
  );
}

export const MainHeader = React.memo(MainHeaderComponent);

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary,
  },
  content: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  // 로고
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    fontFamily: 'Pretendard',
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
    lineHeight: 28,
  },
  // 알림 아이콘
  bellSection: {
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 0,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 9999,
    backgroundColor: Colors.accent,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
});
