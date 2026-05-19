import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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

export default function RootLayout() {
  // SafeAreaProvider — react-native-safe-area-context의 inset 컨텍스트를 트리에 주입.
  // 트리 상단에 Provider가 없으면 useSafeAreaInsets() - SafeAreaView가 inset을 0으로
  // 계산하여 갤럭시(Android)의 OS 네비바 영역을 침범한다.
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          {/* 공지 상세 화면 */}
          <Stack.Screen
            name="notice/[id]"
            options={{ headerShown: false, animation: 'slide_from_right' }}
          />
        </Stack>
        {/* Android only: 상태바 스타일 */}
        <StatusBar style="light" backgroundColor="transparent" translucent />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
