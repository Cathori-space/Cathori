import { describe, expect, it } from '@jest/globals';

import { DEPARTMENTS } from '@/src/constants/departments';
import { getDepartmentOptions, NO_SECOND_MAJOR } from '@/src/features/auth/utils/departmentOptions';

describe('학과 선택 목록', () => {
  it('한글 학과는 가나다순, 영문 학과는 뒤에 A–Z 순으로 제공한다', () => {
    const options = getDepartmentOptions();
    expect(options.slice(0, 3)).toEqual(['경영학과', '경제학과', '공간디자인소비자학과']);
    expect(options.slice(-2)).toEqual(['AI의공학과', 'CUK 특화 학부대학']);
    expect(new Set(options)).toEqual(new Set(DEPARTMENTS));
    expect(DEPARTMENTS.slice(0, 3)).toEqual(['경영학과', '회계학과', '국제경영학과']);
  });

  it('부분 검색 결과도 가나다순으로 제공한다', () => {
    expect(getDepartmentOptions('경영')).toEqual(['경영학과', '국제경영학과', '글로벌경영학과']);
  });

  it('영문 대소문자와 공백을 무시하고 분리된 한글 입력도 검색한다', () => {
    expect(getDepartmentOptions('  ai  ')).toEqual(['AI의공학과']);
    expect(getDepartmentOptions('컴퓨터 정보')).toEqual(['컴퓨터정보공학부']);
    expect(getDepartmentOptions('경영'.normalize('NFD'))).toContain('경영학과');
  });

  it('검색어를 비우면 전체 목록을 복원하고 일치하지 않으면 빈 목록을 제공한다', () => {
    expect(getDepartmentOptions('   ')).toEqual(getDepartmentOptions());
    expect(getDepartmentOptions('없는학과')).toEqual([]);
  });

  it('선택 안 함은 복수·부전공 목록 맨 위에만 추가하고 함께 검색한다', () => {
    expect(getDepartmentOptions('', true)).toEqual([NO_SECOND_MAJOR, ...getDepartmentOptions()]);
    expect(getDepartmentOptions()).not.toContain(NO_SECOND_MAJOR);
    expect(getDepartmentOptions('선택 안 함', true)).toEqual([NO_SECOND_MAJOR]);
    expect(getDepartmentOptions('없는학과', true)).toEqual([]);
  });
});
