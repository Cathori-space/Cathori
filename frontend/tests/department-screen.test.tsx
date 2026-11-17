import './department-setup.cjs';

import React, { act } from 'react';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import RegisterScreen from '@/app/register';
import { getDepartmentOptions } from '@/src/features/auth/utils/departmentOptions';

const mockRegister = jest.fn();
jest.mock('@/src/features/auth/hooks', () => ({
  useEmailVerification: () => ({
    isVerified: true, isSending: false, isSent: false, isVerifying: false,
    resetErrors: jest.fn(), sendVerification: jest.fn(), verify: jest.fn(),
  }),
  useRegister: () => ({ register: mockRegister, isLoading: false, errorMessage: null, resetError: jest.fn() }),
}));
jest.mock('@/src/shared/components', () => ({ SubHeader: () => null }));
jest.mock('@/src/store/useAuthStore', () => ({
  useAuthStore: { getState: () => ({ status: 'unauthenticated' }) },
}));

let tree: ReactTestRenderer;
afterEach(async () => { if (tree) await act(async () => { tree.unmount(); }); });

async function render() {
  await act(async () => { tree = create(<RegisterScreen />); });
}
const nodes = (type: string, scope: ReactTestInstance = tree.root) => scope.findAll((node) => String(node.type) === type);
const modal = () => nodes('Modal')[0];
const list = () => nodes('FlatList', modal())[0];
const search = () => nodes('TextInput', modal())[0];
async function pressText(label: string, scope: ReactTestInstance = tree.root) {
  const text = nodes('Text', scope).find((node) => node.children.join('') === label);
  expect(text).toBeDefined();
  let button = text!.parent;
  while (button && String(button.type) !== 'TouchableOpacity') button = button.parent;
  await act(async () => { button!.props.onPress(); });
}
async function enterQuery(query: string) {
  await act(async () => { search().props.onChangeText(query); });
}

describe('회원가입 학과 검색 모달', () => {
  it('주전공과 복수·부전공에 같은 정렬을 적용한다', async () => {
    await render();
    await pressText('전공을 선택하세요');
    expect(list().props.data).toEqual(getDepartmentOptions());
    await pressText('경영학과', modal());
    await pressText('선택 안 함');
    expect(list().props.data).toEqual(['선택 안 함', ...getDepartmentOptions()]);
  });

  it('실시간으로 필터링하고 검색어 삭제 시 전체 목록을 복원한다', async () => {
    await render();
    await pressText('전공을 선택하세요');
    await enterQuery('경영');
    expect(list().props.data).toEqual(['경영학과', '국제경영학과', '글로벌경영학과']);
    const clear = nodes('TouchableOpacity', modal()).find((node) => node.props.accessibilityLabel === '학과 검색어 지우기');
    await act(async () => { clear!.props.onPress(); });
    expect(search().props.value).toBe('');
    expect(list().props.data).toEqual(getDepartmentOptions());
  });

  it('일치하는 학과가 없으면 안내하고 빈 목록에 스크롤하지 않는다', async () => {
    await render();
    await pressText('전공을 선택하세요');
    await enterQuery('없는학과');
    expect(list().props.data).toEqual([]);
    expect(nodes('Text', modal()).some((node) => node.children.join('') === '검색 결과가 없어요')).toBe(true);
    expect(() => modal().props.onShow()).not.toThrow();
  });

  it.each(['backdrop', 'request'])('%s로 닫아도 선택을 유지하고 다시 열면 검색어를 초기화한다', async (method) => {
    await render();
    await pressText('전공을 선택하세요');
    await enterQuery('컴퓨터');
    await pressText('컴퓨터정보공학부', modal());
    await pressText('컴퓨터정보공학부');
    await enterQuery('없는학과');
    await act(async () => {
      if (method === 'request') modal().props.onRequestClose();
      else nodes('Pressable', modal())[0].props.onPress();
    });
    expect(nodes('Modal')).toHaveLength(0);
    await pressText('컴퓨터정보공학부');
    expect(search().props.value).toBe('');
    expect(list().props.data).toEqual(getDepartmentOptions());
    const selected = nodes('TouchableOpacity', modal()).filter((node) => node.props.accessibilityState?.selected);
    expect(selected).toHaveLength(1);
    expect(nodes('Text', selected[0])[0].children.join('')).toBe('컴퓨터정보공학부');
    await act(async () => { modal().props.onShow(); });
  });

  it.each([['경제학과', '경제학과'], ['선택 안 함', null]])('검색으로 선택한 전공과 복수·부전공 %s을 가입 요청에 반영한다', async (selection, expected) => {
    await render();
    await pressText('전공을 선택하세요');
    await enterQuery('ai');
    await pressText('AI의공학과', modal());
    await pressText('선택 안 함');
    await enterQuery('경제');
    await pressText('경제학과', modal());
    if (selection === '선택 안 함') {
      await pressText('경제학과');
      await pressText('선택 안 함', modal());
    }
    await act(async () => {
      nodes('TextInput').find((node) => node.props.placeholder === '이메일 아이디')!.props.onChangeText('tester');
      nodes('TextInput').find((node) => node.props.placeholder === '비밀번호 입력')!.props.onChangeText('Password1!');
    });
    await pressText('완료');
    expect(mockRegister).toHaveBeenCalledWith({
      email: 'tester@catholic.ac.kr', password: 'Password1!', major1: 'AI의공학과', major2: expected,
      grade: 1, status: '재학',
    });
  });
});
