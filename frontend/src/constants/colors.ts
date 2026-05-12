/**
 * Cathori 브랜드 디자인 토큰 — 색상
 * pencil.dev cathori-1st-mvp.pen 에서 추출
 */

export const Colors = {
  // ─── 브랜드 색상 ───────────────────────────────────────
  /** DCU 블루 (Primary) */
  primary: '#00288C',
  /** 은행나무 옐로 (Accent / D-day urgent) */
  accent: '#FCC006',

  // ─── 배경 ──────────────────────────────────────────────
  /** 앱 기본 배경 */
  background: '#F9F9F9',
  /** 카드 배경 */
  cardBg: '#FFFFFF',
  /** Today's Highlight 카드 배경 */
  highlightBg: '#FFDF9C',

  // ─── 텍스트 ────────────────────────────────────────────
  /** 주요 텍스트 */
  textPrimary: '#1A1C1C',
  /** 보조 텍스트 */
  textSecondary: '#444652',
  /** Highlight 카드 내 텍스트 */
  highlightText: '#251A00',
  /** Highlight 카드 내 서브 텍스트 */
  highlightSubText: '#5B4300',

  // ─── 태그 / 칩 ─────────────────────────────────────────
  /** 대분류 태그 배경 (미선택) */
  tabBg: '#EEEEEE',
  /** 대분류 태그 텍스트 (미선택) */
  tabText: '#44465299',   // 60% opacity
  /** 소분류 태그 배경 */
  chipBg: '#F5F6FA',
  /** 소분류 태그 텍스트 */
  chipText: '#444652B2',  // 70% opacity

  // ─── 카테고리 뱃지 ─────────────────────────────────────
  /** 카테고리 뱃지 배경 (Primary 10%) */
  categoryBadgeBg: '#00288C1A',
  /** 카테고리 뱃지 텍스트 */
  categoryBadgeText: '#00288C',

  // ─── D-day 뱃지 ────────────────────────────────────────
  /** D-day 임박 배경 (노란색) */
  ddayUrgentBg: '#FCC006',
  /** D-day 임박 텍스트 */
  ddayUrgentText: '#6C5000',
  /** D-day 일반 배경 (회색) */
  ddayNormalBg: '#E2E2E2',
  /** D-day 일반 텍스트 */
  ddayNormalText: '#444652',

  // ─── AI 요약 영역 ──────────────────────────────────────
  /** AI 요약 배경 (회색 박스) */
  summaryBg: '#F3F3F3',

  // ─── 구분선 / 기타 ──────────────────────────────────────
  divider: '#E5E5E5',
  separator: '#C5C5D4',
  /** 즐겨찾기 미선택 아이콘 */
  bookmarkInactive: '#CBD5E1',

  // ─── 네비게이션 바 ─────────────────────────────────────
  /** 하단 NavBar 배경 (80% 흰색) */
  navBarBg: '#FFFFFFCC',
  /** NavBar 활성 아이콘/텍스트 */
  navActive: '#00288C',
  /** NavBar 비활성 아이콘/텍스트 */
  navInactive: '#94A3B8',
} as const;

export type ColorKey = keyof typeof Colors;
