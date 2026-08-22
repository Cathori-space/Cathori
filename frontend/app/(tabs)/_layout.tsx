import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/src/constants/colors';

// 탭 화면 타입 정의
type TabBarIconProps = { color: string; size: number };

// 탭바 기본 높이/패딩 — 디자인 시안 기준. OS 시스템 UI 영역(insets.bottom)은 별도 가산.
const TAB_BAR_BASE_HEIGHT = 72;
const TAB_BAR_BASE_PADDING_BOTTOM = 8;

// 꿀팁 탭 노출 여부 — 앱스토어 2.1 반려 대응으로 임시 숨김 처리 (#141).
// 화면/API 구현 완료 후 true로 바꾸면 탭바에 바로 노출됨.
const SHOW_TIPS_TAB = false;

export default function TabLayout() {
  // OS 네비게이션 바 / 홈 인디케이터가 차지하는 하단 영역(픽셀).
  // 갤럭시 소프트웨어 네비바, 아이폰 홈 인디케이터 등 기기별로 자동 계산됨.
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          // 하단 네비게이션 바 스타일
          backgroundColor: Colors.navBarBg,
          borderTopWidth: 0,
          elevation: 0,
          // SafeArea inset을 가산해 OS 네비바와 겹치지 않도록 함
          paddingBottom: TAB_BAR_BASE_PADDING_BOTTOM + insets.bottom,
          height: TAB_BAR_BASE_HEIGHT + insets.bottom,
        },
        tabBarActiveTintColor: Colors.navActive,
        tabBarInactiveTintColor: Colors.navInactive,
        tabBarLabelStyle: {
          fontFamily: 'Pretendard',
          fontSize: 11,
          fontWeight: '500',
          letterSpacing: 0.275,
          marginTop: 3,
        },
      }}
    >
      {/* 홈 탭 */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'HOME',
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      {/* 검색 탭 */}
      <Tabs.Screen
        name="search"
        options={{
          title: 'SEARCH',
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <Feather name="search" size={size} color={color} />
          ),
        }}
      />
      {/* 꿀팁 탭 — 1차 MVP 이후에 구현, 그 전까지 탭바에서 숨김 */}
      <Tabs.Screen
        name="tips"
        options={{
          title: 'TIPS',
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <Feather name="star" size={size} color={color} />
          ),
          href: SHOW_TIPS_TAB ? undefined : null,
        }}
      />
      {/* 설정 탭 — Sprint 2에서 구현 */}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'SETTINGS',
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <Feather name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
