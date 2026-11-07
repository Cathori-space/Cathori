# 공개 공지 API — 이슈 #213 / v1.0.2

이 API는 게스트 계정이나 JWT 없이 이용할 수 있다. Authorization 헤더가 있어도
항상 학교 공통 공지(`source_type='MAIN'`)만 반환한다.
기존 `/api/notices/**` API는 계속 회원 인증을 요구한다.

## API 경로 및 입력값

| 메서드 | 경로 | 쿼리 파라미터 |
| --- | --- | --- |
| GET | `/api/public/notices` | `category` 선택: 일반, 장학, 학사, 취창업; `page=0`; `size=20` |
| GET | `/api/public/notices/search` | `q` 필수; `page=0`; `size=10` |
| GET | `/api/public/notices/{noticeId}` | 양수인 부호 있는 64비트 정수 ID |

- `page`는 0부터 시작하는 0 이상의 32비트 정수이며, `size`는 1~50이어야 한다.
- `q`는 앞뒤 공백을 제거한 뒤 1~100자여야 한다.
- 검색은 공지 제목에서 입력 문자열을 그대로 포함하는 부분을 찾는다. `%`, `_`, `!`는 검색 범위를 확장하지 않는다.
- 전체 MAIN 공지를 조회하려면 `category`를 생략한다. 비어 있거나 허용 목록에 없는 카테고리는 유효하지 않다.
- 문서에 정의되지 않은 쿼리 파라미터는 무시한다. `tags`, `major`, `userId`, `sourceId`,
  `sourceType`으로 공개 조회 범위를 변경할 수 없다.
- 정렬 순서는 `posted_at DESC, title ASC, id DESC`이며, 전체 건수는 반환하지 않는다.
- 이 경로의 GET 이외 요청은 거부한다. 비인증 요청은 401,
  유효한 회원 인증이 있는 요청은 403을 반환한다. HEAD와 OPTIONS도 포함한다.

## 응답

피드와 검색은 `{ "content": [...], "page": 0, "size": 20, "hasNext": false }` 형식으로 반환한다.
검색의 기본 페이지 크기는 10이다. `hasNext`는 조건에 맞는 MAIN 공지만을 기준으로 계산한다.

피드 항목과 상세 응답은 다음 필드를 포함한다.

| 필드 | JSON 자료형 | 설명 |
| --- | --- | --- |
| `noticeId` | string | 공지 ID |
| `category` | string | 카테고리 |
| `title` | string | 제목 |
| `department` | string | 게시 부서 |
| `publishedAt` | string | 게시일, `YYYY-MM-DD` |
| `aiSummary` | string 또는 null | 저장된 요약. 일반적으로 JSON 배열을 담은 문자열이며, 상태가 SUCCESS가 아니면 null |
| `aiSummaryStatus` | string | 기존에 저장된 요약 상태 |
| `url` | string | 공지 원문 URL |
| `viewCount` | number | 기존 조회수. 공개 요청에서는 증가시키지 않음 |
| `deadlineAt` | string 또는 null | 마감일, `YYYY-MM-DD` |

검색 항목은 `noticeId`, `category`, `title`, `department`,
`publishedAt`, `deadlineAt`만 포함한다. 상세 조회는 페이지 형식으로 감싸지 않고 객체를 직접 반환한다.

공개 응답에는 `isBookmarked`, `tags`, 사용자·프로필·토큰 필드나 공지 원문 본문이 없다.
프론트엔드는 기존 UI 자료형에 맞출 때 로컬에서 `isBookmarked=false`, `tags=[]`를
기본값으로 적용할 수 있다. 이 경우에도 회원 전용 동작의 접근 제한은 유지해야 한다.
공개 조회에서는 AI 요약 생성이나 재시도를 실행하지 않는다.

## 오류

애플리케이션 및 입력 검증 오류는 `{ "code": "...", "message": "..." }` 형식을 사용한다.

| 상태 코드 | 오류 코드 | 설명 |
| --- | --- | --- |
| 400 | `INVALID_INPUT` | 잘못되거나 누락된 입력값 또는 숫자 변환 실패 |
| 403 | `NOTICE_ACCESS_DENIED` | 존재하는 공지의 출처가 MAIN이 아님. 향후 추가되는 출처 유형도 포함 |
| 404 | `NOTICE_NOT_FOUND` | 요청한 양의 정수 ID에 해당하는 공지가 없음 |

유효하지 않거나 만료된 JWT로 인해 게스트 토큰을 발급하거나 토큰을 재발급하지 않으며,
공개 응답 범위도 확장하지 않는다. 회원 API는 기존 401 응답 및 토큰 재발급 동작을 유지한다.
보안 계층의 401·403 응답은 기존 Spring Security 형식을 유지하며,
애플리케이션 오류 응답 계약을 사용하지 않는다.

프론트엔드 연동과 운영 환경의 요청 빈도 제한은 별도 후속 작업으로 진행한다.
