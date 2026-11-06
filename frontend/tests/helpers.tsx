import React, { act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { QueryClientProvider } from '@tanstack/react-query';
import axios, { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { jest } from '@jest/globals';

import { queryClient } from '@/src/lib/queryClient';
import { useAuthStore } from '@/src/store/useAuthStore';
import type { LoginResponse } from '@/src/types/auth';

export const transport = axios.defaults.adapter as jest.Mock<(config: InternalAxiosRequestConfig) => Promise<unknown>>;
export const member: LoginResponse = {
  accessToken: 'access', refreshToken: 'refresh', userId: 1, email: 'member@catholic.ac.kr',
  major: '컴퓨터정보공학부', secondMajor: null, grade: 1, enrollmentStatus: '재학',
  tags: [{ tagId: 1, tagName: '장학금' }],
};
export const publicNotice = {
  noticeId: '213', category: '장학', title: '장학금 공지', department: '학생지원팀',
  publishedAt: '2026-11-04', aiSummary: '["요약 첫째","요약 둘째","요약 셋째"]',
  aiSummaryStatus: 'SUCCESS', url: 'https://www.catholic.ac.kr/notice/213',
  viewCount: 3, deadlineAt: null,
};

export function response(config: InternalAxiosRequestConfig, data: unknown, status = 200) {
  return { data, status, statusText: 'OK', headers: new AxiosHeaders(), config };
}
export function rejectStatus(config: InternalAxiosRequestConfig, status: number, data: unknown = {}) {
  return Promise.reject(new AxiosError('요청 실패', String(status), config, undefined, response(config, data, status)));
}
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
export const flush = async () => {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
};
const trees: ReactTestRenderer[] = [];
export async function render(element: React.ReactNode) {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<QueryClientProvider client={queryClient}>{element}</QueryClientProvider>);
  });
  trees.push(tree);
  await flush();
  return tree;
}
export async function renderHook<T>(hook: () => T) {
  let current!: T;
  function Harness() { current = hook(); return null; }
  const tree = await render(<Harness />);
  return { get current() { return current; }, tree };
}
export async function pressText(tree: ReactTestRenderer, label: string) {
  const text = tree.root.findAll((n) => String(n.type) === 'Text' && n.children.join('') === label)[0];
  if (!text) throw new Error(`버튼을 찾지 못했습니다: ${label}`);
  let button = text.parent;
  while (button && String(button.type) !== 'TouchableOpacity' && String(button.type) !== 'Pressable') button = button.parent;
  if (!button || button.props.disabled) throw new Error(`누를 수 없는 버튼입니다: ${label}`);
  await act(async () => { await button!.props.onPress(); });
  await flush();
}
export const textOf = (tree: ReactTestRenderer) => tree.root.findAll((node) => String(node.type) === 'Text').map((node) => node.children.filter((child) => typeof child === 'string').join('')).join('');
export async function cleanup() {
  await act(async () => { trees.splice(0).forEach((tree) => tree.unmount()); });
  // 이전 테스트의 지연 응답 대체가 인증 정리 요청까지 붙잡지 않게 한다.
  transport.mockImplementation(async (config) => response(config, {}));
  await useAuthStore.getState().clearAuth();
  queryClient.setDefaultOptions({ queries: { retry: false, staleTime: 30_000 } });
  transport.mockReset();
  transport.mockImplementation(async (config) => response(config, {}));
}
