import { Linking } from 'react-native';

import { ANDROID_STORE_PACKAGE_NAME } from '@/src/features/reviews/constants';

const PLAY_STORE_APP_URL =
  `market://details?id=${ANDROID_STORE_PACKAGE_NAME}&showAllReviews=true`;
const PLAY_STORE_WEB_URL =
  `https://play.google.com/store/apps/details?id=${ANDROID_STORE_PACKAGE_NAME}&showAllReviews=true`;

/** Google Play 앱을 우선 사용하고, 실행할 수 없으면 웹 페이지로 이동한다. */
export async function openAndroidReviewPage(): Promise<void> {
  try {
    await Linking.openURL(PLAY_STORE_APP_URL);
  } catch {
    await Linking.openURL(PLAY_STORE_WEB_URL);
  }
}
