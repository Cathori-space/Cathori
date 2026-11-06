import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { router } from 'expo-router';
import { Alert, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';

import LoginScreen from '@/app/login';
import RegisterScreen from '@/app/register';
import SettingsScreen from '@/app/(tabs)/settings';
import HomeScreen from '@/app/(tabs)/index';
import SearchScreen from '@/app/(tabs)/search';
import NoticeDetailScreen from '@/app/notice/[id]';
import RootLayout from '@/app/_layout';
import { MainHeader } from '@/src/shared/components/MainHeader';
import { MembershipPrompt } from '@/src/features/auth/components/MembershipPrompt';
import { useSearchHistoryStore } from '@/src/store/useSearchHistoryStore';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useMembershipPromptStore } from '@/src/store/useMembershipPromptStore';
import { cleanup, flush, member, pressText, publicNotice, rejectStatus, render, response, textOf, transport } from './helpers';

beforeEach(cleanup);
afterEach(cleanup);
async function guest() { await act(async () => { await useAuthStore.getState().enterGuest(); }); }

describe('게스트 진입과 인증 화면 복귀', () => {
  it('로그인 화면의 게스트 버튼으로 홈에 진입한다', async () => {
    const tree = await render(<LoginScreen />);
    await pressText(tree, '게스트로 둘러보기');
    expect(useAuthStore.getState().status).toBe('guest');
    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
  });
  it('게스트의 로그인 화면에서 뒤로 돌아가도 게스트 상태를 유지한다', async () => {
    await guest();
    const tree = await render(<LoginScreen />);
    await pressText(tree, '게스트 화면으로 돌아가기');
    expect(router.back).toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe('guest');
  });
  it('게스트 로그인 화면에서 회원가입으로 이동할 수 있다', async () => {
    await guest();
    const tree = await render(<LoginScreen />);
    await pressText(tree, '회원가입');
    expect(router.push).toHaveBeenCalledWith('/register');
    expect(useAuthStore.getState().status).toBe('guest');
  });
  it('게스트 회원가입의 이전 버튼은 홈으로 복귀한다', async () => {
    await guest();
    const tree = await render(<RegisterScreen />);
    await pressText(tree, '이전');
    expect(router.dismissTo).toHaveBeenCalledWith('/(tabs)');
    expect(useAuthStore.getState().status).toBe('guest');
  });
  it('게스트는 회원 전용 경로를 마운트하지 않으며 로그인 뒤 허용한다', async () => {
    const tree = await render(<RootLayout />);
    await guest();
    await flush();
    const screens = () => tree.root.findAll((n) => String(n.type) === 'StackScreen').map((n) => n.props.name);
    expect(screens()).toEqual(expect.arrayContaining(['(tabs)', 'notice/[id]', 'login', 'register']));
    expect(screens()).not.toContain('bookmark/index');
    expect(screens()).not.toContain('notification/index');
    expect(screens()).not.toContain('settings/keywords');
    await act(async () => { await useAuthStore.getState().setAuth(member); });
    await flush();
    expect(screens()).toEqual(expect.arrayContaining(['bookmark/index', 'notification/index', 'settings/keywords']));
  });
});

describe('회원 전용 가입 안내와 게스트 설정', () => {
  it.each(['bookmark', 'bell'])('%s 접근은 회원 API 대신 안내창을 연다', async (name) => {
    await guest();
    const tree = await render(<><MainHeader /><MembershipPrompt /></>);
    const icon = tree.root.findAll((n) => String(n.type) === 'Icon' && n.props.name === name)[0];
    let button = icon.parent;
    while (button && String(button.type) !== 'TouchableOpacity') button = button.parent;
    await act(async () => { button!.props.onPress(); });
    expect(textOf(tree)).toContain('회원 전용 기능이에요');
    expect(transport).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
    await pressText(tree, '닫기');
    expect(useMembershipPromptStore.getState().visible).toBe(false);
    expect(useAuthStore.getState().status).toBe('guest');
  });
  it.each([['로그인', '/login'], ['회원가입', '/register']])('안내창에서 %s 화면으로 이동한다', async (label, path) => {
    await guest();
    useMembershipPromptStore.getState().open();
    const tree = await render(<MembershipPrompt />);
    await pressText(tree, label);
    expect(router.push).toHaveBeenCalledWith(path);
    expect(useMembershipPromptStore.getState().visible).toBe(false);
    expect(useAuthStore.getState().status).toBe('guest');
  });
  it('게스트 설정에는 버전만 표시하고 회원 정보와 알림 설정을 숨긴다', async () => {
    await guest();
    const tree = await render(<SettingsScreen />);
    const text = textOf(tree);
    expect(text).toContain('버전 정보');
    expect(text).toContain('1.0.2');
    ['가톨릭대 학생', '로그아웃', '회원탈퇴', '시스템 알림 설정', '관심 공지 태그 설정'].forEach((label) => expect(text).not.toContain(label));
    expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
    expect(transport).not.toHaveBeenCalled();
  });
});

describe('기존 회원 로그아웃', () => {
  it('기기 토큰을 반납하고 서버 로그아웃한 뒤 로컬 인증을 지운다', async () => {
    await act(async () => { await useAuthStore.getState().setAuth(member); });
    const tree = await render(<SettingsScreen />);
    transport.mockClear();
    await pressText(tree, '로그아웃');
    const buttons = jest.mocked(Alert.alert).mock.lastCall?.[2];
    await act(async () => { await buttons?.find((button) => button.style === 'destructive')?.onPress?.(); });
    expect(transport.mock.calls.map(([config]) => [config.method, config.url, config.headers.Authorization])).toEqual([
      ['delete', '/api/users/device-token', 'Bearer access'],
      ['post', '/api/auth/logout', 'Bearer access'],
    ]);
    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(router.replace).toHaveBeenCalledWith('/login');
  });
});

describe('공개 공지 화면', () => {
  it('게스트 홈에 공개 공지가 표시되고 기존 태그 버튼은 가입 안내만 연다', async () => {
    await guest();
    transport.mockImplementation(async (config) => response(config, { content: [publicNotice], page: 0, size: 20, hasNext: false }));
    const tree = await render(<><HomeScreen /><MembershipPrompt /></>);
    expect(textOf(tree)).toContain('장학금 공지');
    await pressText(tree, '+태그');
    expect(useMembershipPromptStore.getState().visible).toBe(true);
    expect(transport.mock.calls.every(([c]) => c.url === '/api/public/notices')).toBe(true);
  });
  it('게스트 검색 화면에서 공개 검색 결과를 표시하고 기록은 저장하지 않는다', async () => {
    await guest();
    transport.mockImplementation(async (config) => response(config, { content: [publicNotice], page: 0, size: 20, hasNext: false }));
    const tree = await render(<SearchScreen />);
    const input = tree.root.findAll((n) => String(n.type) === 'TextInput')[0];
    await act(async () => { input.props.onChangeText('장학'); });
    await act(async () => { await new Promise((r) => setTimeout(r, 350)); });
    await flush();
    expect(textOf(tree)).toContain('장학금 공지');
    expect(transport.mock.calls[0][0].url).toBe('/api/public/notices/search');
    await act(async () => { tree.root.findAll((n) => String(n.type) === 'TextInput')[0].props.onSubmitEditing(); });
    expect(useSearchHistoryStore.getState().history).toEqual([]);
  });
  it('상세 화면에서 저장된 AI 요약과 원문 링크를 사용할 수 있다', async () => {
    await guest();
    transport.mockImplementation(async (config) => response(config, publicNotice));
    const tree = await render(<NoticeDetailScreen />);
    expect(textOf(tree)).toContain('요약 첫째');
    expect(textOf(tree)).toContain('요약 둘째');
    expect(textOf(tree)).toContain('요약 셋째');
    await pressText(tree, '원문 보기');
    expect(Linking.openURL).toHaveBeenCalledWith(publicNotice.url);
  });
  it.each([[403, '공개되지 않은 공지입니다.'], [404, '공지를 찾을 수 없습니다'], [500, '공지를 불러오지 못했습니다.']])('상세 %i 응답을 구분하여 안내한다', async (status, message) => {
    await guest();
    transport.mockImplementation((config) => rejectStatus(config, status as number));
    const tree = await render(<NoticeDetailScreen />);
    expect(textOf(tree)).toContain(message);
    expect(useAuthStore.getState().status).toBe('guest');
  });
});
