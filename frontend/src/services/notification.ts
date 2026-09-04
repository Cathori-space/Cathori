/**
 * expo-notifications 래퍼 — 권한 요청 / 디바이스 토큰 발급 / 포그라운드 표시 정책
 *
 * ADR `알림 발송 방식 도입`에 따라 RN 클라이언트는 expo-notifications를 사용한다.
 * 현재는 FCM 직접 방식(네이티브 FCM 토큰)이며, 추후 Expo Push로 전환 시
 * getDevicePushToken()의 본문 한 줄만 교체하면 된다(아래 주석 참고).
 *
 * 주의: getDevicePushTokenAsync()는 google-services.json이 포함된 개발 빌드(EAS dev build)에서만
 * 동작하며 Expo Go에서는 동작하지 않는다.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  getMessaging,
  getToken,
} from '@react-native-firebase/messaging';

// 앱이 포그라운드일 때도 OS 알림 배너를 표시한다.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
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

if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync(ANDROID_NOTIFICATION_CHANNEL_ID, {
    name: '공지 알림',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
}

/** OS 알림 권한을 확인하고, 미허용 시 요청한다. 최종 허용 여부를 반환. */
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * 디바이스 푸시 토큰을 발급한다. 실패 시 null.
 *
 * 현재: FCM 직접 방식 — 네이티브 FCM 토큰.
 * [Expo Push 전환 시] 아래 본문을 다음으로 교체:
 *   import Constants from 'expo-constants';
 *   const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
 *   const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
 *   return data;
 */
export async function getDevicePushToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'ios') {
      const messaging = getMessaging();
      return await getToken(messaging);
    }

    const { data } = await Notifications.getDevicePushTokenAsync();
    return data;
  } catch (e) {
    console.warn('[push] 디바이스 토큰 발급 실패:', e);
    return null;
  }
}
