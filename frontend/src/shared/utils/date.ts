/**
 * 날짜 관련 유틸리티 함수
 */

/**
 * ISO 8601 날짜 문자열로부터 D-day를 계산한다.
 * @returns 양수: 아직 마감 전 (D-{n}), 0: 오늘 (D-day), 음수: 마감 지남
 */
export function calculateDday(deadlineAt: string): number {
  const deadline = new Date(deadlineAt);
  const today = new Date();

  // 시간 무시, 날짜만 비교
  deadline.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffMs = deadline.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24)); // 올림 함수
}

/**
 * D-day 숫자를 화면에 표시할 문자열로 변환한다.
 * @example
 * formatDday(3) → 'D-3'
 * formatDday(0) → 'D-day'
 * formatDday(-1) → '마감'
 */
export function formatDday(dday: number): string {
  if (dday < 0) return '마감';
  if (dday === 0) return 'D-day';
  return `D-${dday}`;
}

/**
 * ISO 8601 날짜 문자열을 'YYYY-MM-DD' 형식으로 포맷한다.
 * @example formatDate('2026-03-28T09:00:00Z') → '2026-03-28'
 */
export function formatDate(isoString: string): string {
  return isoString.slice(0, 10);
}

/**
 * D-day가 임박한지 여부 (3일 이내)
 * 뱃지 색상 결정에 사용
 */
export function isDdayUrgent(dday: number): boolean {
  return dday >= 0 && dday <= 3;
}
