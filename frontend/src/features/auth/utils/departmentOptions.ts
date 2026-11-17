import { DEPARTMENTS } from '@/src/constants/departments';

export const NO_SECOND_MAJOR = '선택 안 함';

const collator = new Intl.Collator('ko', { sensitivity: 'base' });
const sortedDepartments = [...DEPARTMENTS].sort((a, b) => {
  const aIsKorean = /^[가-힣]/u.test(a);
  const bIsKorean = /^[가-힣]/u.test(b);
  if (aIsKorean !== bIsKorean) return aIsKorean ? -1 : 1;
  return collator.compare(a, b);
});

const normalize = (value: string) => value.normalize('NFC').replace(/\s+/g, '').toLowerCase();

export function getDepartmentOptions(query = '', includeNone = false): string[] {
  const options: string[] = includeNone
    ? [NO_SECOND_MAJOR, ...sortedDepartments]
    : [...sortedDepartments];
  const keyword = normalize(query);
  return keyword ? options.filter((department) => normalize(department).includes(keyword)) : options;
}
