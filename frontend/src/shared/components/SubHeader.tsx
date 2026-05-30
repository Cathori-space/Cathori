/**
 * SubHeader — 앱 공용 서브 페이지 헤더
 *
 * 사용 화면: 관심 키워드 설정, 회원가입
 *
 * 구조:
 * ┌─────────────────────────────┐
 * │ ←  관심 공지 키워드 설정      │
 * └─────────────────────────────┘
 *
 * fill #FFFFFFCC (80% 불투명 흰색 + blur)
 * position absolute, height 64, padding [0, 24]
 * 뒤로가기: chevron-left 24 / #00175B
 * 타이틀: Pretendard 18 / 700 / #00175B, letterSpacing -0.45
 *
 * [Props]
 * - title: string — 화면 타이틀 텍스트
 * - onBack?: () => void — 뒤로가기 핸들러 (미전달 시 router.back())
 */

import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SubHeaderProps {
  /** 화면 타이틀 텍스트 */
  title: string;
  /** 뒤로가기 핸들러 (미전달 시 router.back()) */
  onBack?: () => void;
}

function SubHeaderComponent({ title, onBack }: SubHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.content}>
        {/* 뒤로가기 버튼 */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          hitSlop={8}
        >
          <Feather name="chevron-left" size={24} color="#00175B" />
        </TouchableOpacity>

        {/* 타이틀 */}
        <Text style={styles.title}>{title}</Text>

        {/* 오른쪽 빈 공간 (좌우 대칭용) */}
        <View style={styles.backButton} />
      </View>
    </SafeAreaView>
  );
}

export const SubHeader = React.memo(SubHeaderComponent);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: '#FFFFFFCC', // 시안: 80% 불투명 흰색
  },
  content: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontFamily: 'Pretendard',
    fontSize: 18,
    fontWeight: '700',
    color: '#00175B',
    letterSpacing: -0.45,
    textAlign: 'center',
  },
});
