<br>

## 1. 📋 기능정의

사용자가 이메일과 인증번호를 입력하면 서버가 In-Memory에 저장된 값과 대조한다. 일치하면 해당 이메일의 인증 완료 상태를 In-Memory에 기록한다. 인증 완료 상태는 회원가입 API에서 확인한다.

<br>

## 2. 🔌 API 설계

### HTTP 메서드 & URL

> POST /api/auth/email/verify

### Request Body

```json
{
  "email": "user@catholic.ac.kr",
  "code": "123456"
}
```

### Response Body (200 OK)

```json
{
  "email": "user@catholic.ac.kr"
}
```

### Response Body (인증번호 만료)

```json
{
  "code": "USER_VERIFY_CODE_EXPIRED",
  "message": "인증번호가 만료되었습니다"
}
```

### Response Body (인증번호 불일치)

```json
{
  "code": "USER_INVALID_VERIFY_CODE",
  "message": "인증번호가 올바르지 않습니다"
}
```

<br>

## 3. ⚙️ 서비스 로직

- In-Memory에서 email로 인증번호 조회
  - 없으면 → `USER_VERIFY_CODE_EXPIRED`
- 만료시각 체크
  - 만료됐으면 → `USER_VERIFY_CODE_EXPIRED`
- 인증번호 일치 여부 확인
  - 불일치 → `USER_INVALID_VERIFY_CODE`
- 인증 완료 상태 In-Memory에 기록
- 인증번호 In-Memory에서 삭제

<br>

## 4. 🗄️ In-Memory 저장 구조

| 항목 | 값 |
|------|-----|
| 저장소 | `ConcurrentHashMap` |
| key | email (String) |
| value | 인증 완료 여부 (Boolean) |
| 삭제 시점 | 회원가입 완료 후 |

<br>

## 5. 구현 상세

<img width="1227" height="802" alt="image" src="https://github.com/user-attachments/assets/c414f939-186c-4a74-a12b-b83a68efa1e0" />