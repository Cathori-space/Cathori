# Cathori Backend

가톨릭대학교 공지사항 AI 요약 서비스의 백엔드 서버입니다.

---

## 목차

1. [기술 스택](#기술-스택)
2. [로컬 실행 방법](#로컬-실행-방법)
3. [전체 동작 흐름](#전체-동작-흐름)
4. [인증 방식](#인증-방식)
5. [API 명세](#api-명세)
6. [에러 응답 형식](#에러-응답-형식)

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| Language | Java 21 |
| Framework | Spring Boot 4.0.4 |
| Database | PostgreSQL 16 |
| ORM | Spring Data JPA |
| 인증 | JWT (JJWT) + Spring Security |
| AI | Google Gemini 2.5 Flash Lite |
| 크롤링 | JSoup |
| 이메일 | Spring Mail |
| API 문서 | Springdoc OpenAPI (Swagger) |
| 컨테이너 | Docker Compose |

---

## 로컬 실행 방법

### 사전 준비

- Docker Desktop 설치 및 실행
- Java 21 설치
- `application.properties` 파일 (팀 노션 또는 리기박에게 받을 것 — DB 접속 정보, Gemini API 키 등 민감 정보 포함)

### 실행 순서

```bash
# 1. backend 디렉토리로 이동
cd cathori/backend

# 2. PostgreSQL 컨테이너 실행 (처음 한 번만)
docker compose up -d

# 3. 서버 실행
./gradlew bootRun
```

> 이후 모든 명령어는 `backend/` 디렉토리 안에서 실행해야 합니다.

### 자주 쓰는 Gradle 명령어

```bash
# 서버 실행
./gradlew bootRun

# 빌드 (실행 가능한 jar 파일 생성)
./gradlew build

# 빌드 없이 컴파일만 (오류 확인용)
./gradlew compileJava

# 테스트 실행
./gradlew test

# 빌드 캐시 초기화 (뭔가 이상할 때)
./gradlew clean

# clean 후 다시 빌드
./gradlew clean build
```


- 서버 주소: `http://localhost:8080`
- Swagger UI (API 직접 테스트 가능): `http://localhost:8080/swagger-ui.html`

### 자주 하는 실수

| 상황 | 원인 | 해결 |
|------|------|------|
| DB 연결 실패로 서버 시작 안 됨 | Docker 컨테이너가 꺼져 있음 | `docker compose up -d` 먼저 실행 |
| `application.properties` 관련 오류 | 파일이 없음 | 리기박에게 파일 받아서 `src/main/resources/`에 넣기 |

---

## 전체 동작 흐름

### 공지 수집 흐름

서버가 떠 있는 동안 아래 흐름이 **매일 00:00, 12:00** 자동 실행됩니다.

```
[크롤링 스케줄러 실행]
... (416줄 남음)

