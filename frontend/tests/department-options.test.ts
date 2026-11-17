import { describe, expect, it } from '@jest/globals';

import { DEPARTMENTS } from '@/src/constants/departments';
import { getDepartmentOptions, NO_SECOND_MAJOR } from '@/src/features/auth/utils/departmentOptions';

describe('학과 선택 목록 정렬', () => {
  it('한글 학과는 가나다순, 영문 학과는 뒤에 A–Z 순으로 제공한다', () => {
    const options = getDepartmentOptions();
    expect(options.slice(0, 3)).toEqual(['경영학과', '경제학과', '공간디자인소비자학과']);
    expect(options.slice(-2)).toEqual(['AI의공학과', 'CUK 특화 학부대학']);
    expect(new Set(options)).toEqual(new Set(DEPARTMENTS));
    expect(DEPARTMENTS.slice(0, 3)).toEqual(['경영학과', '회계학과', '국제경영학과']);
  });

  it('선택 안 함은 복수·부전공 목록 맨 위에만 추가한다', () => {
    expect(getDepartmentOptions(true)).toEqual([NO_SECOND_MAJOR, ...getDepartmentOptions()]);
    expect(getDepartmentOptions()).not.toContain(NO_SECOND_MAJOR);
  });
});
