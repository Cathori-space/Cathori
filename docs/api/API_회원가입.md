<br>

## 1. 📋 기능정의

사용자는 자신의 정보를 입력한다. 이후 이메일 인증을 성공하면 성공적으로 cathori 서비스에 회원가입을 한다.

<br>

## 2. 🔌 API 설계

### HTTP 메서드 & URL

> POST /api/auth/register

### Request Body

```json
{
  "email": "user@catholic.ac.kr",
  "password": "...",
  "major1": "컴퓨터공학부",
  "major2": "경영학부",
  "grade": 1,
  "status": "재학"
}
```

### Response Body (201 Created)

```json
{
  "userId": 1,
  "email": "user@catholic.ac.kr"
}
```

### Response Body (입력 형식 부적합)

입력 형식 부적합 → DTO 레벨 처리

```json
{
  "code": "INVALID_INPUT",
  "message": "..."
}
```

### Response Body (이미 존재하는 이메일)

```json
{
  "code": "USER_EMAIL_DUPLICATE",
  "message": "이미 사용중인 이메일입니다"
}
```

### Response Body (이메일 인증 미완료)

```json
{
  "code": "USER_NOT_VERIFIED",
  "message": "이메일 인증이 완료되지 않았습니다"
}
```

<br>

## 3. ⚙️ 서비스 로직

- `@Valid` → DTO 레벨에서 검증 (형식 부적합)
- 이메일 인증 완료 여부 확인 → `USER_NOT_VERIFIED`
- 이메일 중복 체크 → `USER_EMAIL_DUPLICATE`
- 비밀번호 암호화 (BCrypt)
- users 테이블에 저장
- 응답 반환

<br>

## 4. 🗄️ DB 쿼리

JPA 기본 함수로 해결 가능.

<br>

## 5. 구현 상세

![시퀀스 다이어그램](https://github.com/user-attachments/assets/132ba11e-be6c-45db-a776-5fbeb2486c0d)