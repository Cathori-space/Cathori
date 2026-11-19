# 이슈 #217 FCM 토큰 소유권 전환

공통 운영 승인, 사전 검사와 롤백 절차는 [Cathori 1.0.2 운영 전환 검토](issue-217-release-safety.md)를 따른다.

## 등록 및 이전 정책

`users.device_token`을 발송용 현재 등록으로 유지한다. PostgreSQL의 `uk_users_device_token`은 같은 토큰 문자열이 두 회원 행에 저장되는 것을 막으며, 토큰이 없는 여러 행에는 NULL을 허용한다.

`device_token_claims`는 토큰의 SHA-256 해시, 계정, 마지막 등록 당시의 로그인 세대를 보관한다. `latest_claim`이 TRUE이면 해당 토큰의 마지막 등록이고, NULL이면 다른 계정으로 이전됐거나 마이그레이션에서 격리된 이력이다. 토큰 반납 후에도 이력을 유지한다. 회원탈퇴 시 해당 회원의 이력은 외래 키에 의해 삭제된다.

PUT은 요청 토큰의 트랜잭션 단위 advisory lock과 요청 회원 행 잠금을 순서대로 획득한 뒤 JWT 세대를 확인한다. 이력이 없는 토큰만 최초 등록할 수 있다. 이미 최신 소유자가 있는 토큰은 해당 계정만 다시 등록할 수 있으며 DELETE나 로그아웃 후에도 소유권 이력은 남는다. 소유권이 모호한 기존 중복 이력과 다른 계정의 토큰은 `409 DEVICE_TOKEN_OWNERSHIP_CONFLICT`로 거부한다.

같은 기기에서 계정을 바꾸면 앱은 이전 토큰을 무효화하고 새 토큰을 발급받는다. 소유권 충돌 응답을 받은 현재 세션은 한 번만 토큰 교체를 시도한다. 서버가 실제 요청 발생 순서를 검증할 수 없어 같은 토큰의 계정 간 재할당을 허용하지 않는다.

## 기존 데이터 전환 및 배포 절차

1. 승인된 대상 DB에서 [세션 버전 마이그레이션](../db/migrations/001-add-user-session-version.sql)의 적용 여부를 확인한다. 토큰 원문을 출력하지 않고 중복 그룹 수와 영향받는 사용자 수를 확인한다.

   ```sql
   SELECT count(*) AS duplicate_groups, coalesce(sum(owners), 0) AS affected_users
   FROM (
       SELECT count(*) AS owners
       FROM users
       WHERE device_token IS NOT NULL
       GROUP BY device_token
       HAVING count(*) > 1
   ) AS duplicates;
   ```

2. 구 백엔드의 등록 요청과 푸시 작업을 종료한다. [소유권 마이그레이션](../db/migrations/002-isolate-device-token-ownership.sql)은 `users` 테이블에 배타 잠금을 잡으므로 적용 전에 연결과 대기 한도를 확인한다. 아래 명령은 확인된 연결에 한 번 실행한다.

   ```sh
   psql -X --set ON_ERROR_STOP=1 --single-transaction \
     --command 'SET lock_timeout = 5s' \
     --file backend/db/migrations/002-isolate-device-token-ownership.sql
   ```

3. 기존 고유 등록은 보존한다. 중복 그룹은 실제 소유자를 판별할 근거가 없어 **모든 회원 행에서 토큰을 해제**하고 각 계정의 현재 세대를 이전 이력으로 기록한다. 영향받은 회원은 새 기기 토큰으로 등록할 수 있다. 기존 `session_version`과 Refresh Token은 변경하지 않는다.
4. 중복 그룹이 0인지 확인한 뒤 승인된 수동 배포를 실행한다. 배포 사전 검사는 테이블, 고유 제약 및 현재 등록의 소유권 이력을 확인한다. SQL 적용은 별도의 승인 단계에서 완료해야 한다.
5. 구 버전으로 되돌리면 DB 고유 제약은 유지되지만 이력 검증과 계정 간 재할당 차단이 사라진다. 푸시 등록을 계속 허용하려면 이전 이력 검증을 유지하는 호환 이미지를 사용한다.

## 보장 범위

- 등록된 토큰의 최초 지연 PUT도 다른 계정으로 소유권을 변경할 수 없다. 아직 등록 이력이 없는 토큰은 최초 성공한 요청에 연결한다. 서버는 토큰 문자열만으로 실제 기기 소유를 증명하거나 이력이 없는 여러 요청의 발생 순서를 알 수 없다.
- 대기 발송과 실패 재시도는 현재 등록을 수신자별 한 번의 조회로 읽는다. 발송 작업이 이미 읽은 토큰이나 FCM이 이미 받은 알림은 DB 등록 변경으로 회수할 수 없다. 실제 iOS·Android 수신 격리는 별도의 QA 검증 항목이다.
- 기존 버전 0의 단독 등록은 이번 SQL에서 보존한다. 기존 JWT 무효화 시점에 해당 등록의 발송을 중단할지 여부는 [세션 버전 전환 계획](issue-217-session-version.md)에 따른다.
