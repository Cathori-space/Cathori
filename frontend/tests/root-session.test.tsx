import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClientProvider } from '@tanstack/react-query';

import RootLayout from '@/app/_layout';
import { useReviewSessionTimer } from '@/src/features/reviews';
import { queryClient } from '@/src/lib/queryClient';
import { useAuthStore } from '@/src/store/useAuthStore';
import { cleanup, flush, member, render } from './helpers';

jest.mock('@/src/features/notifications', () => ({ usePushNotifications: jest.fn() }));
jest.mock('@/src/features/reviews', () => ({ useReviewSessionTimer: jest.fn() }));

beforeEach(cleanup);
afterEach(cleanup);

describe('루트 화면의 세션 경계', () => {
  it('화면에서 사용하는 캐시도 인증 종료 시 함께 비워진다', async () => {
    const tree = await render(<RootLayout />);
    const provider = tree.root.findByType(RootLayout).findByType(QueryClientProvider);
    const screenCache = provider.props.client;
    expect(screenCache).toBe(queryClient);
    screenCache.setQueryData(['member-private-data'], { userId: 1 });

    await act(async () => { await useAuthStore.getState().clearAuth(); });

    expect(screenCache.getQueryData(['member-private-data'])).toBeUndefined();
  });

  it('회원 세션이 바뀌면 내비게이터를 다시 생성하고 리뷰 타이머 호출을 유지한다', async () => {
    const tree = await render(<RootLayout />);
    const navigator = () => tree.root.findAll((node) => String(node.type) === 'Stack')[0];
    const previousNavigator = navigator();
    expect(previousNavigator).toBeDefined();

    await act(async () => { await useAuthStore.getState().setAuth(member); });
    await flush();

    expect(navigator()).not.toBe(previousNavigator);
    expect(useReviewSessionTimer).toHaveBeenCalled();
  });
});
