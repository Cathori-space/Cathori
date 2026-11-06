/**
 * usePushNotifications — 푸시 알림 토큰 동기화 + 탭 네비게이션 훅
 *
 * RootLayoutNav에서 1회 호출한다.
 *
 * 1) 토큰 등록: accessToken이 생기면(로그인/자동로그인) 권한 요청 → 토큰 발급 →
 *    서버 등록(PUT). 로그아웃(accessToken=null) 시 ref를 리셋해 재로그인 시 재등록.
 *    (로그아웃 시점의 토큰 반납 DELETE는 settings.tsx handleLogout에서 처리)
 * 2) 탭 네비게이션: 알림을 탭하면 data.noticeId로 공지 상세 화면 이동.
 *    앱이 종료된 상태에서 알림으로 진입한 경우(cold start)도 처리.
 */

import * as Notifications from 'expo-notifications';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getDevicePushToken, requestNotificationPermission } from '@/src/services/notification';
import { markNotificationReadByNoticeId } from '@/src/services/notifications';
import { registerDeviceToken } from '@/src/services/pushToken';
import { useAuthStore } from '@/src/store/useAuthStore';

/** 알림 payload의 noticeId를 안전하게 숫자로 변환 */
function getNoticeId(data: unknown): number | null {
  if (data != null && typeof data === 'object' && 'noticeId' in data) {
    const rawNoticeId = (data as { noticeId?: unknown }).noticeId;
    const noticeId = Number(rawNoticeId);
    if (Number.isSafeInteger(noticeId) && noticeId > 0) return noticeId;
  }
  return null;
}

export function usePushNotifications() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const registeredRef = useRef(false); // 등록여부 확인 플래그
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const handledNotificationIdsRef = useRef(new Set<string>());

  const handleNotificationResponse = useCallback(
    async (response: Notifications.NotificationResponse) => {
      const notificationId = response.notification.request.identifier;
      if (handledNotificationIdsRef.current.has(notificationId)) return;

      const noticeId = getNoticeId(response.notification.request.content.data);
      if (noticeId == null) return;
      handledNotificationIdsRef.current.add(notificationId);

      try {
        await markNotificationReadByNoticeId(noticeId);
      } catch {
        // 저장 실패 시 서버의 미읽음 상태를 유지하되 공지 상세 이동은 허용한다.
      } finally {
        void queryClient.invalidateQueries({ queryKey: ['notifications'] });
        router.push(`/notice/${noticeId}` as Href);
      }
    },
    [queryClient, router],
  );

  // 1) 로그인 직후 디바이스 토큰 등록
  useEffect(() => {
    if (!accessToken) {
      registeredRef.current = false; // 로그아웃 → 재로그인 시 재등록 가능하도록 리셋
      return;
    }
    if (registeredRef.current) return;
    registeredRef.current = true;

    (async () => {
      try {
        const granted = await requestNotificationPermission();
        if (!granted) return;
        const token = await getDevicePushToken();
        if (!token) return;
        // 테스트 중에는 콘솔에 찍힌 토큰을 복사해 DB users.device_token에 수기 입력할 수 있다.
        // console.log('[push] device token =', token);
        await registerDeviceToken(token);
      } catch {
        // 토큰 등록 실패해도 앱 흐름은 진행. 다음 accessToken 변화에서 재시도.
        registeredRef.current = false;
      }
    })();
  }, [accessToken]);

  // 2) 포그라운드 푸시 수신 → 알림 목록/헤더 상태 갱신
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(() => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });
    return () => sub.remove();
  }, [queryClient]);

  // 3) 백그라운드에서 돌아오면 알림 목록/헤더 상태 갱신
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextAppState) => {
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (
        previousAppState.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    });

    return () => sub.remove();
  }, [queryClient]);

  // 4) 알림 탭 → 공지 상세 이동 (포그라운드/백그라운드)
  useEffect(() => {
    if (!accessToken) return;

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      void handleNotificationResponse(response);
    });
    return () => sub.remove();
  }, [accessToken, handleNotificationResponse]);

  // 4-b) cold start: 종료 상태에서 알림 탭으로 진입한 경우
  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;
    Notifications.getLastNotificationResponseAsync()
      .then(async (response) => {
        if (!cancelled && response) {
          await handleNotificationResponse(response);
          await Notifications.clearLastNotificationResponseAsync();
        }
      })
      .catch(() => {
        // 마지막 응답 조회 실패는 앱 시작을 막지 않는다.
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, handleNotificationResponse]);
}
