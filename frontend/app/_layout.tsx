import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MembershipPrompt } from '@/src/features/auth/components/MembershipPrompt';
import { usePushNotifications } from '@/src/features/notifications';
import { useReviewSessionTimer } from '@/src/features/reviews';
import { queryClient } from '@/src/lib/queryClient';
import { useAuthStore } from '@/src/store/useAuthStore';

// SplashScreen을 수동 제어 — rehydrate 완료 전까지 유지
SplashScreen.preventAutoHideAsync();

// 뒤로 가기 시, 탭으로 이동되도록 설정
export const unstable_settings = {
    anchor: '(tabs)',
};

/**
 * 인증 상태 기반 라우팅 가드
 *
 * 게스트는 공개 화면과 인증 화면을 이용하고,
 * 회원 인증이 종료되면 로그인 화면으로 이동한다.
 */
function useProtectedRoute() {
    const status = useAuthStore((state) => state.status);
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        // Expo Router typed routes 캐시 갱신 전까지 string 캐스팅 필요
        const currentSegment = segments[0] as string;
        const inAuthGroup =
            currentSegment === 'login' || currentSegment === 'register';

        if (status === 'unauthenticated' && !inAuthGroup) {
            router.replace('/login' as never);
        } else if (status === 'authenticated' && inAuthGroup) {
            router.replace('/(tabs)');
        }
    }, [status, segments, router]);
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
        const unsubscribe =
            useAuthStore.persist.onFinishHydration(initialize);

        // 이미 rehydrate가 완료된 경우를 대비
        if (useAuthStore.persist.hasHydrated()) {
            initialize();
        }

        return unsubscribe;
    }, []);

    useEffect(() => {
        if (isRehydrated) {
            SplashScreen.hideAsync();
        }
    }, [isRehydrated]);

    // rehydrate 전에는 아무것도 렌더링하지 않음
    if (!isRehydrated) {
        return null;
    }

    return <RootLayoutNav />;
}

function RootLayoutNav() {
    const sessionId = useAuthStore((state) => state.sessionId);

    // 화면과 인증 스토어가 같은 QueryClient를 사용한다.
    // 세션이 바뀌면 내비게이터를 다시 생성한다.
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <QueryClientProvider client={queryClient}>
                    <AppNavigator key={sessionId} />
                </QueryClientProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}

function AppNavigator() {
    const status = useAuthStore((state) => state.status);

    useProtectedRoute();
    useReviewSessionTimer();
    usePushNotifications();

    return (
        <>
            <Stack>
                <Stack.Protected
                    guard={status === 'guest' || status === 'authenticated'}
                >
                    <Stack.Screen
                        name="(tabs)"
                        options={{ headerShown: false }}
                    />

                    {/* 공지 상세 화면 */}
                    <Stack.Screen
                        name="notice/[id]"
                        options={{
                            headerShown: false,
                            animation: 'slide_from_right',
                        }}
                    />
                </Stack.Protected>

                <Stack.Protected guard={status === 'authenticated'}>
                    {/* 알림 리스트 화면 */}
                    <Stack.Screen
                        name="notification/index"
                        options={{
                            headerShown: false,
                            animation: 'slide_from_right',
                        }}
                    />

                    {/* 북마크 목록 화면 */}
                    <Stack.Screen
                        name="bookmark/index"
                        options={{
                            headerShown: false,
                            animation: 'slide_from_right',
                        }}
                    />
                </Stack.Protected>

                {/* 인증 화면 — 로그인 */}
                <Stack.Screen
                    name="login"
                    options={{
                        headerShown: false,
                        animation: 'fade',
                    }}
                />

                {/* 인증 화면 — 회원가입 */}
                <Stack.Screen
                    name="register"
                    options={{
                        headerShown: false,
                        animation: 'slide_from_right',
                    }}
                />

                <Stack.Protected guard={status === 'authenticated'}>
                    {/* 설정 — 관심 키워드 화면 */}
                    <Stack.Screen
                        name="settings/keywords"
                        options={{
                            headerShown: false,
                            animation: 'slide_from_right',
                        }}
                    />
                </Stack.Protected>
            </Stack>

            <MembershipPrompt />

            {/* Android only: 상태바 스타일 */}
            <StatusBar
                style="light"
                backgroundColor="transparent"
                translucent
            />
        </>
    );
}