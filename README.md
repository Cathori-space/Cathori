# Cathori 🔔

<!-- ============================================== --> <!-- 📌 비고: 여기에 Cathori 배너 이미지 추가 예정 --> <!-- 권장 크기: 1200 x 400 / DCU Blue + Ginkgo Yellow --> <!-- ============================================== --> <div align="center">

![banner-placeholder](https://placehold.co/1200x400/00288C/FABE00?text=Cathori)

<h3>관심 공지를 편하게, 놓치지 않고 알람으로</h3> <p>가톨릭대학교 학생을 위한 공지 개인화 알림 서비스</p> <br/>

<a href="#">🚀 서비스 바로가기 (출시 후 업데이트 예정)</a> | <a href="#">📚 팀 Wiki</a>

<br/>

<img src="https://img.shields.io/badge/status-개발중-FABE00?style=flat-square"/> <img src="https://img.shields.io/badge/platform-Android-3DDC84?style=flat-square&logo=android&logoColor=white"/> <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square"/> </div>

---

## 💡 이런 경험, 한 번쯤 있지 않으셨나요?

> "등록금 1차 납부 기간이 끝났다고요…? 저는 처음 듣는데요…"

- 📅 **등록금 납부 기한**을 놓쳐서 1차가 아닌 **2차에 납부**한 경험
- 🎯 가고 싶었던 **비교과 프로그램**의 신청이 이미 마감된 후에 공지를 본 경험
- 🏫 학교 공식 홈페이지, **트리니티 포털**, 학과 홈페이지를 **따로따로** 확인해야 하는 번거로움
- 💬 학내 공지를 일부 보내주던 **가대톡 서비스가 종료**된 이후, 이제는 직접 모든 공지를 직접 모니터링해야 하는 부담

저희도 같은 경험을 했고, 그래서 이 프로젝트를 시작했습니다.

---

## ✨ Cathori가 제안하는 해결책

|**🎯 관심사 기반 매칭**|**🤖 AI 본문 요약**|**🔔 실시간 푸시 알림**|
|---|---|---|
|학과·키워드를 미리 등록해두면 관련 공지만 골라 전달|AI가 본문과 이미지를 3줄로 요약하고 마감일 자동 추출|매칭된 공지가 올라오는 즉시 FCM으로 푸시 알림 발송|

> 💡 **Cathori는** _Catholic_ + 한국어 *소리(sori)*의 합성어로, "가톨릭대학교의 소식을 전하는 목소리"라는 뜻을 담고 있습니다.

---

## 🎬 주요 기능

<!-- ============================================== --> 
<!-- 📌 비고: 각 기능별 스크린샷/GIF 추후 추가 예정 --> 
<!-- 권장 형식: Android 디바이스 프레임 + GIF/PNG --> 
<!-- ============================================== --> 

<h3 align="center">📝 이메일 인증 회원가입</h3> 
<p align="center">비고 </p>
<p align="center">가톨릭대학교 학생임을 이메일 인증으로 확인 후 가입</p> 

<br/> 

<h3 align="center">🏠 메인 피드 · 카테고리/태그 필터</h3> 
<p align="center">비고 </p>
<p align="center">대분류(일반·장학·학사·취창업) + 사용자 태그 필터로 공지 골라 보기</p> 

<br/> 

<h3 align="center">📄 공지 상세 · AI 3줄 요약</h3> 
<p align="center">비고 </p>
<p align="center">Gemini API가 본문·이미지를 분석해 핵심 3줄과 마감일을 자동 정리</p> 

<br/> 

<h3 align="center">🔍 키워드 검색</h3> 
<p align="center">비고 </p>
<p align="center">300ms debounce 검색 + 최근 검색어 자동 저장</p> 

<br/> 

<h3 align="center">🔔 키워드 매칭 푸시 알림</h3> 
<p align="center">비고 </p>
<p align="center">설정한 키워드와 매칭되는 새 공지가 올라오면 즉시 알림</p> 

<br/> 

<h3 align="center">⭐ 즐겨찾기 · 마이페이지</h3> 
<p align="center">비고 </p>
<p align="center">놓치고 싶지 않은 공지는 북마크해두고 마이페이지에서 한눈에</p> 

<br/> 

<h3 align="center">⚙️ 키워드 · 알림 설정</h3> 
<p align="center">비고 </p>
<p align="center">최대 20개 키워드 관리 · 알림 시간대 · 야간 알림 제한</p>

---

## 🔄 어떻게 동작하나요?

<details> 
<summary><h3>📊 전체 데이터 흐름</h3></summary>

```mermaid
sequenceDiagram
  autonumber
  participant U as 가톨릭대 학생
  participant A as Cathori App (RN)
  participant API as Spring Boot API
  participant DB as PostgreSQL
  participant S as Spring Scheduler
  participant W as 학교 공지 게시판
  participant G as Gemini API
  participant F as FCM

  Note over S,W: 매일 0시, 12시 자동 실행
  S->>W: HTML 페이지 요청 (Jsoup)
  W-->>S: 공지 목록 HTML
  S->>DB: 신규 공지만 INSERT (중복 제외)
  S->>G: 본문 + 이미지 → 요약 요청
  G-->>S: 3줄 bullet + 마감일(YYYY-MM-DD)
  S->>DB: 요약 결과 저장

  Note over S,F: 키워드 매칭 후 푸시 발송
  S->>DB: 사용자 키워드 ↔ 신규 공지 매칭
  DB-->>S: 매칭 대상 사용자 목록
  S->>F: 매칭 사용자에게 푸시 발송 요청
  F->>A: 푸시 알림 전달
  
  Note over U,A: 사용자 인터랙션
  U->>A: 알림 탭
  A->>API: GET /api/notices/{id}
  API->>DB: 공지 조회 + 사용자 북마크 여부
  DB-->>API: 공지 + AI 요약 + D-Day
  API-->>A: 공지 상세 응답
  A-->>U: 상세 화면 표시
```

</details>

<details> 
<summary><h3>🏗 처리 파이프라인 (5단계)</h3></summary>

```mermaid
graph LR
    %% 스타일 정의
    classDef default fill:#f9f9f9,stroke:#333,stroke-width:1px,color:#333;
    classDef step fill:#e6f2ff,stroke:#0056b3,stroke-width:2px,color:#003366;

    %% 노드 구성
    A["<b>① 크롤링</b><br/>Jsoup<br/>Scheduler"]
    B["<b>② DB 저장</b><br/>JPA<br/>PostgreSQL"]
    C["<b>③ AI 요약</b><br/>Gemini API<br/>(3줄 + 마감일)"]
    D["<b>④ 키워드 매칭</b><br/>App Layer"]
    E["<b>⑤ FCM 푸시</b><br/>Firebase"]

    %% 클래스 적용
    class A,B,C,D,E step;

    %% 흐름 연결
    A --> B
    B --> C
    C --> D
    D --> E
```

</details>

> 💡 더 자세한 아키텍처, ERD, ADR(아키텍처 결정 기록)은 [Wiki]()에서 확인할 수 있습니다 _(추후 링크 추가 예정)_.

---

## 🏛 시스템 아키텍처

<!-- ============================================== --> 
<!-- 📌 비고: 시스템 아키텍처 다이어그램 추가 예정 --> 
<!-- (NCP Cloud + Docker + 외부 API 연계 다이어그램) --> <!-- ============================================== -->

추후 이미지 추가 예정

---

## 🛠 기술 스택

<div align="center">

### Frontend (Mobile App)

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) 
![Expo](https://img.shields.io/badge/Expo_SDK_54-000020?style=for-the-badge&logo=expo&logoColor=white) 
![Expo Router](https://img.shields.io/badge/Expo_Router_6-000020?style=for-the-badge&logo=expo&logoColor=white) 
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white) 
![Zustand](https://img.shields.io/badge/Zustand-181717?style=for-the-badge&logo=react) 
![TanStack Query](https://img.shields.io/badge/TanStack_Query_v5-FF4154?style=for-the-badge&logo=reactquery&logoColor=white) 
![Axios](https://img.shields.io/badge/Axios-5A29E4?style=for-the-badge&logo=axios&logoColor=white)

### Backend

![Spring Boot](https://img.shields.io/badge/Spring_Boot_4.0.4-6DB33F?style=for-the-badge&logo=springboot&logoColor=white) 
![Java](https://img.shields.io/badge/Java_21-007396?style=for-the-badge&logo=openjdk&logoColor=white) 
![Spring Security](https://img.shields.io/badge/Spring_Security-6DB33F?style=for-the-badge&logo=springsecurity&logoColor=white) 
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white) 
![JPA](https://img.shields.io/badge/Hibernate_JPA-59666C?style=for-the-badge&logo=hibernate&logoColor=white) 
![Jsoup](https://img.shields.io/badge/Jsoup_1.18-2E6E9E?style=for-the-badge) 
![Swagger](https://img.shields.io/badge/SpringDoc_OpenAPI-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)

### Database

![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)

### AI / Notification

![Gemini](https://img.shields.io/badge/Gemini_2.5_Flash--Lite-4285F4?style=for-the-badge&logo=googlegemini&logoColor=white) 
![FCM](https://img.shields.io/badge/Firebase_Cloud_Messaging-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)

### Infra / DevOps

![Naver Cloud](https://img.shields.io/badge/NCP_Cloud-03C75A?style=for-the-badge&logo=naver&logoColor=white) 
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white) 
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white) 
![Sentry](https://img.shields.io/badge/Sentry-362D59?style=for-the-badge&logo=sentry&logoColor=white)

</div>

### 🎯 기술 선택 배경

|**결정**|**선택 이유**|
|---|---|
|**백엔드 언어**<br>Java / Spring Boot|팀 전원 공통 경험, 한국 취업 시장 적합성|
|**모바일 프레임워크**<br>>React Native + Expo|크로스플랫폼 + 빠른 빌드/배포 사이클|
|**DB**<br>PostgreSQL|벡터 임베딩 확장(pgvector) 지원, 무료, 풍부한 한국어 레퍼런스|
|**크롤링**<br>Jsoup (정적)|Spring과 동일 JVM, 학교 공지 페이지가 대부분 정적 HTML|
|**AI 요약**<br>Gemini 2.5 Flash-Lite|한국어 품질 양호 + 무료 티어 + 이미지 멀티모달 지원|
|**서버 호스팅**<br>NCP Cloud|캡스톤 지원 예산이 프리페이드 결제만 가능, 세금계산서 발행 지원|
|**상태 관리**<br>Zustand|Redux 대비 보일러플레이트 최소화, RN과 궁합 양호|

---

## 🗂 프로젝트 구조

```
cathori/
├── frontend/                    # React Native + Expo
│   └── src/
│       ├── app/                 # Expo Router 스크린
│       │   ├── (tabs)/          # 하단 탭 (홈, 검색, 마이)
│       │   ├── notice/[id].tsx  # 공지 상세
│       │   └── auth/            # 로그인/회원가입
│       ├── features/            # 도메인 모듈
│       │   ├── notices/         # 공지 도메인
│       │   ├── search/          # 검색 도메인
│       │   └── auth/            # 인증 도메인
│       ├── shared/              # 공용 컴포넌트/훅/유틸
│       ├── services/            # Axios 인스턴스
│       ├── store/               # Zustand 스토어
│       └── constants/           # 디자인 토큰
│
├── backend/                     # Spring Boot
│   └── src/main/java/com/cathori/
│       ├── auth/                # 인증 (회원가입, 로그인, JWT)
│       ├── notice/              # 공지 도메인
│       ├── crawler/             # 크롤러 (Jsoup + Scheduler)
│       ├── summary/             # AI 요약 (Gemini)
│       ├── keyword/             # 키워드 관리
│       ├── bookmark/            # 즐겨찾기
│       ├── notification/        # FCM 푸시 (포트만 정의)
│       └── common/              # 공용 (예외, 설정, 보안)
│
├── docs/                        # 문서 (ADR, ERD, API 명세)
└── docker-compose.yml           # 로컬 개발 환경
```

---

## 👥 팀 소개 · 회광반조

> **회광반조(回光返照)** — "빛이 거꾸로 돌아 비춘다"는 뜻으로, 해가 지기 직전 마지막으로 빛을 강하게 내뿜어 하늘을 밝게 비추는 자연현상을 가리킵니다. 막학년을 불태워서 학생들을 위한 서비스를 만들겠다는 다짐을 담았습니다.

<div align="center">
  <table>
    <tr>
      <!-- 팀원 1: 이정훈 -->
      <td align="center" width="160">
		    <img src="https://github.com/tomass22.png" width="120" style="border-radius: 50%;"/><br/>
		    <a href="https://github.com/tomass22" target="_blank" style="text-decoration: none; color: inherit;"><b>이정훈</b></a><br/>
		    <sub>Team Lead</sub><br/>
		    기획 · 앱
	    </td>
      <!-- 팀원 2: 이기백 -->
      <td align="center" width="160">
		    <img src="https://github.com/NiceLeeMan.png" width="120" style="border-radius: 50%;"/><br/>
		    <a href="https://github.com/NiceLeeMan" target="_blank" style="text-decoration: none; color: inherit;"><b>이기백</b></a><br/>
		    <sub>Backend Lead</sub><br/>
        서버
      </td>
      <!-- 팀원 3: 김재민 -->
      <td align="center" width="160">
		    <img src="https://github.com/leasenose.png" width="120" style="border-radius: 50%;"/><br/>
		    <a href="https://github.com/leasenose" target="_blank" style="text-decoration: none; color: inherit;"><b>김재민</b></a><br/>
		    <sub>Backend</sub><br/>
        서버
      </td>
    </tr>
  </table>
</div>

<!-- ============================================== --> 
<!-- 📌 비고: 각 팀원의 GitHub 링크와 프로필 이미지 --> 
<!-- 실제 GitHub 계정으로 교체 예정 --> 
<!-- ============================================== -->

---

## 🏫 프로젝트 정보

- **소속**: 가톨릭대학교 (Catholic University of Korea)
- **과목**: 종합설계프로젝트 (캡스톤 디자인)
- **진행 기간**: 2026.03 ~ 2026.06
- **타겟 사용자**: 가톨릭대학교 학부생
- **첫 출시 플랫폼**: Android (Google Play Store, 추후 등록)

---

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다. 자세한 내용은 [LICENSE]() 파일을 참고해주세요.

<!-- 비고: 학교 공지 크롤링과 관련한 약관/저작권 표기는 추후 LEGAL.md로 분리하여 명시 예정 -->

---

## 💌 문의 / 피드백

서비스 사용 중 불편한 점이나 제안하고 싶은 기능이 있다면 언제든 알려주세요.

- **이메일**: 비고 <!-- 비고: 팀 대표 메일 추후 추가 -->
- **사용자 피드백 폼**: 출시 후 앱 내 설정 화면에서 제공 예정

<br/> 

<div align="center">

**Cathori는 가톨릭대학교 학생을 위해, 가톨릭대학교 학생이 만들고 있습니다.** 🐦

⭐ 응원해주신다면 Star 한 번 부탁드립니다!

</div>
