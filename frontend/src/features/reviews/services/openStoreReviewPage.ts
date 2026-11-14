import { Linking, Platform } from 'react-native';

import { IOS_APP_STORE_ID } from '@/src/features/reviews/constants';
import { openAndroidReviewPage } from '@/src/features/reviews/services/openAndroidReviewPage';

const APP_STORE_APP_URL =
  `itms-apps://itunes.apple.com/app/viewContentsUserReviews/id${IOS_APP_STORE_ID}?action=write-review`;
const APP_STORE_WEB_URL =
  `https://apps.apple.com/app/id${IOS_APP_STORE_ID}?action=write-review`;

async function openIosReviewPage(): Promise<void> {
  try {
    await Linking.openURL(APP_STORE_APP_URL);
  } catch {
    await Linking.openURL(APP_STORE_WEB_URL);
  }
}

/** 현재 플랫폼의 Cathori 스토어 리뷰 작성 페이지를 연다. */
export async function openStoreReviewPage(): Promise<void> {
  if (Platform.OS === 'android') {
    await openAndroidReviewPage();
    return;
  }

  if (Platform.OS === 'ios') {
    await openIosReviewPage();
    return;
  }

  throw new Error('Store review page is not supported on this platform.');
}
