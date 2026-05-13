<br>

## 1. 📋 기능정의

사용자가 이메일을 입력하면 해당 이메일로 6자리 인증번호를 발송한다. 인증번호는 서버 In-Memory에 저장되며 3분 후 만료된다.

<br>

## 2. 🔌 API 설계

### HTTP 메서드 & URL

> POST /api/auth/email/send

### Request Body

```json
{
  "email": "user@catholic.ac.kr"
}
```

### Response Body (200 OK)

```json
{
  "email": "user@catholic.ac.kr"
}
```

### Response Body (입력 형식 부적합)

email 형식 부적합 → DTO 레벨 처리

```json
{
  "code": "INVALID_INPUT",
  "message": "이메일 형식이 올바르지 않습니다"
}
```

<br>

## 3. ⚙️ 서비스 로직

- 6자리 랜덤 인증번호 생성
- 이메일 발송
- In-Memory에 email을 key로 인증번호 + 만료시각 저장 (TTL 3분)
- 동일 이메일로 재요청 시 덮어쓰기

<br>

## 4. 🗄️ In-Memory 저장 구조

| 항목 | 값 |
|------|-----|
| 저장소 | `ConcurrentHashMap` |
| key | email (String) |
| value | 인증번호 (String) + 만료시각 (LocalDateTime) |
| TTL | 3분 |
| 재요청 처리 | 동일 key 덮어쓰기 |

<br>

## 5. 구현 상세

`AuthController`, `EmailVerificationService`, `VerificationStore`, `NotificationPort` 4개 클래스 간 상호작용 및 In-Memory 저장 구조를 다룬다.

![시퀀스 다이어그램](https://github.com/user-attachments/assets/081dc329-bf24-4f49-83d0-4eaba1847cec)