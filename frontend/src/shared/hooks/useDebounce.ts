/**
 * useDebounce — 값이 지정된 시간 동안 변하지 않을 때만 갱신되는 디바운스 훅
 *
 * 사용 예: 검색어 입력 시, 매 키 입력마다 API를 호출하지 않고
 * 사용자가 타이핑을 멈춘 뒤(=delay ms 경과) 한 번만 호출하기 위함.
 *
 * 동작:
 *  - value가 바뀔 때마다 새 setTimeout을 예약
 *  - delay 안에 다시 바뀌면 이전 타이머는 cleanup으로 취소
 *  - 마지막 변경 후 delay가 지나야만 debouncedValue가 갱신됨
 */

import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => { // 클린업 함수 -> 한 번 더 호출되었을 때만 실행
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
