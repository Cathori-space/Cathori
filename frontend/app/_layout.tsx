import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { usePushNotifications } from '@/src/features/notifications';
import { useAuthStore } from '@/src/store/useAuthStore';

// SplashScreen을 수동 제어 — rehydrate 완료 전까지 유지
SplashScreen.preventAutoHideAsync();

// TanStack Query 클라이언트 설정
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 네트워크 재연결 시 자동 재조회
      refetchOnWindowFocus: false,
      // 오래된 데이터 허용 시간 (30초)
      staleTime: 30_000,
      // 재시도 1회
      retry: 1,
    },
  },
});

// 뒤로 가기 시, 탭으로 이동되도록 설정
export const unstable_settings = {
  anchor: '(tabs)',
};

/**
 * 인증 상태 기반 라우팅 가드
 *
 * - accessToken이 있으면 메인(tabs) 진입 허용
 * - 없으면 로그인 화면으로 리다이렉트
 * - 로그인 화면에서 토큰이 생기면 메인으로 이동
 */
function useProtectedRoute() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // 현재 경로가 인증 화면(login/register)인지 확인
    // Expo Router typed routes 캐시 갱신 전까지 string 캐스팅 필요
    const currentSegment = segments[0] as string;
    const inAuthGroup = currentSegment === 'login' || currentSegment === 'register';

    if (!accessToken && !inAuthGroup) {
      // 토큰 없음 + 인증 화면 밖 → 로그인으로
      router.replace('/login' as never);
    } else if (accessToken && inAuthGroup) {
      // 토큰 있음 + 인증 화면 안 → 메인으로
      router.replace('/(tabs)');
    }
  }, [accessToken, segments, router]);
}

export default function RootLayout() {
  const [isRehydrated, setIsRehydrated] = useState(false);

  useEffect(() => {
    let initializationStarted = false;

    const initialize = () => {
      if (initializationStarted) return;
      initializationStarted = true;

      void useAuthStore
        .getState()
        .initializeAuth()
        .catch((error) => {
          console.warn('[auth] Failed to restore tokens:', error);
        })
        .finally(() => {
          setIsRehydrated(true);
        });
    };

    // Zustand persist rehydrate 완료 대기
    // useAuthStore.persist.onFinishHydration은 이미 hydrate 되었으면 즉시 호출 (휴대폰에서 영구 저장소에서 토큰 데이터 불러오게 되었을 때 호출)
    const unsubscribe = useAuthStore.persist.onFinishHydration(initialize);

    // 이미 rehydrate가 완료된 경우를 대비
    if (useAuthStore.persist.hasHydrated()) {
      initialize();
    }

    return unsubscribe;
  }, []); // 초기 렌더링 한 번에만

  useEffect(() => {
    if (isRehydrated) {
      // rehydrate 완료 후 스플래시 해제
      SplashScreen.hideAsync();
    }
  }, [isRehydrated]);

  // rehydrate 전에는 아무것도 렌더링하지 않음 (SplashScreen이 유지됨)
  if (!isRehydrated) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  // 인증 상태 기반 라우팅 가드 활성화
  useProtectedRoute();
  // 푸시 토큰 동기화(로그인 시 등록) + 알림 탭 → 공지 상세 네비게이션
  usePushNotifications();

  // SafeAreaProvider — react-native-safe-area-context의 inset 컨텍스트를 트리에 주입.
  // 트리 상단에 Provider가 없으면 useSafeAreaInsets() - SafeAreaView가 inset을 0으로
  // 계산하여 갤럭시(Android)의 OS 네비바 영역을 침범한다.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            {/* 공지 상세 화면 */}
            <Stack.Screen
              name="notice/[id]"
              options={{ headerShown: false, animation: 'slide_from_right' }}
            />
            {/* 알림 리스트 화면 */}
            <Stack.Screen
              name="notification/index"
              options={{ headerShown: false, animation: 'slide_from_right' }}
            />
            {/* 북마크 목록 화면 */}
            <Stack.Screen
              name="bookmark/index"
              options={{ headerShown: false, animation: 'slide_from_right' }}
            />
            {/* 인증 화면 — 로그인 */}
            <Stack.Screen
              name="login"
              options={{ headerShown: false, animation: 'fade' }}
            />
            {/* 인증 화면 — 회원가입 */}
            <Stack.Screen
              name="register"
              options={{ headerShown: false, animation: 'slide_from_right' }}
            />
            {/* 설정 — 관심 키워드 화면 */}
            <Stack.Screen
              name="settings/keywords"
              options={{ headerShown: false, animation: 'slide_from_right' }}
            />
          </Stack>
          {/* Android only: 상태바 스타일 */}
          <StatusBar style="light" backgroundColor="transparent" translucent />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
