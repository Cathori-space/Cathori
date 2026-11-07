/**
 * expo-notifications 래퍼 — 권한 요청 / 디바이스 토큰 발급 / 포그라운드 표시 정책
 *
 * ADR `알림 발송 방식 도입`에 따라 RN 클라이언트는 expo-notifications를 사용한다.
 * 알림 표시와 권한은 Expo, FCM 등록 토큰의 발급·삭제는 Firebase가 담당한다.
 *
 * FCM 발급·삭제는 Firebase로 통일하며 개발 빌드가 필요하다. Expo Go에서는 동작하지 않는다.
 */

import { useAuthStore } from '@/src/store/useAuthStore';
import { getSessionId, isCurrentSession } from '@/src/services/session';
import { getManagedDevicePushToken } from '@/src/services/pushDevice';
import { isPushSessionActive } from '@/src/services/pushToken';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 회원 세션에서만 포그라운드 알림을 표시한다.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: useAuthStore.getState().status === 'authenticated',
    shouldShowList: useAuthStore.getState().status === 'authenticated',
    shouldPlaySound: useAuthStore.getState().status === 'authenticated',
    shouldSetBadge: false,
  }),
});

/**
 * Android 8+(API 26+)는 알림 채널이 최초 생성 시점 설정(사운드 포함)으로 고정되며 코드로 재변경할 수 없다.
 * expo-notifications가 채널 ID 없이 쓰는 fallback 채널에 기대면 과거에 사운드 없이 생성된 채널이
 * 남아있는 기기에서 계속 무음이 되므로, 우리가 소유하는 채널을 명시적으로 만들어 사운드를 보장한다.
 * (백엔드 FcmAdapter도 이 채널 ID를 지정해야 실제로 이 채널이 쓰인다.)
 */
export const ANDROID_NOTIFICATION_CHANNEL_ID = 'notice';

async function ensureNotificationChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_NOTIFICATION_CHANNEL_ID, {
    name: '공지 알림',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
}

/** OS 알림 권한을 확인하고, 미허용 시 요청한다. 최종 허용 여부를 반환. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (useAuthStore.getState().status !== 'authenticated') return false;
  const sessionId = getSessionId();
  await ensureNotificationChannel();
  if (!isCurrentSession(sessionId)) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (!isCurrentSession(sessionId) || useAuthStore.getState().status !== 'authenticated') return false;
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return isCurrentSession(sessionId) && useAuthStore.getState().status === 'authenticated' && status === 'granted';
}

/**
 * 디바이스 푸시 토큰을 발급한다. 실패 시 null.
 *
 * 발급·삭제를 직렬화하고 이전 세션에서 삭제하지 못한 토큰은 재사용하지 않는다.
 */
export async function getDevicePushToken(): Promise<string | null> {
  if (useAuthStore.getState().status !== 'authenticated') return null;
  const sessionId = getSessionId();
  try {
    return await getManagedDevicePushToken(() => isPushSessionActive(sessionId)
      && useAuthStore.getState().status === 'authenticated');
  } catch {
    console.warn('[push] 디바이스 토큰 발급을 완료하지 못했습니다.');
    return null;
  }
}
