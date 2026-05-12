import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { Colors } from '@/src/constants/colors';

// 탭 화면 타입 정의
type TabBarIconProps = { color: string; size: number };

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          // 하단 네비게이션 바 스타일 — pencil.dev 시안 기반
          backgroundColor: Colors.navBarBg,
          borderTopWidth: 0,
          elevation: 0,
          // Android only: 소프트웨어 네비게이션 바 대응
          paddingBottom: 8,
          height: 72,
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
      {/* 꿀팁 탭 — Task 4에서 구현 */}
      <Tabs.Screen
        name="tips"
        options={{
          title: 'TIPS',
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <Feather name="star" size={size} color={color} />
          ),
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
