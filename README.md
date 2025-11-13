# 모시래학사 공간예약 시스템

건국대학교 글로컬캠퍼스 모시래학사의 스터디룸/다목적홀 예약 관리 시스템입니다.

## 🎯 주요 기능

### 사용자 기능
- 📅 공간 예약 (스터디룸 A/B, 다목적홀)
- ⏰ 시간대별 가용 정보 실시간 조회
- 🎫 내 예약 조회 및 취소
- 📋 대기열 시스템 (정원 초과 시 자동 등록)

### 관리자 기능
- 🔧 전체 예약 조회 (확정/대기/취소)
- 🗑️ 예약 취소 및 대기열 관리
- 🔐 HTTP Basic Auth 인증

## 🏗️ 기술 스택

- **Backend**: Node.js + Express (ESM)
- **Database**: MongoDB (선택) 또는 In-Memory
- **Frontend**: Vanilla JavaScript + TailwindCSS
- **인증**: HTTP Basic Auth

## 📦 설치 및 실행

### 1. 의존성 설치
```powershell
npm install
```

### 2. 환경변수 설정 (.env)
```env
# MongoDB 연결 문자열 (선택 - 없으면 인메모리 모드)
MONGODB_URI=mongodb://localhost:27017/mosirae_dormitory

# 관리자 계정
ADMIN_USER=admin
ADMIN_PASS=your_password

# 서버 포트
PORT=3000
```

### 3. 서버 실행
```powershell
# 프로덕션 모드
npm start

# 개발 모드
npm run dev
```

서버가 시작되면 http://localhost:3000 에서 접속 가능합니다.

## 📁 프로젝트 구조

```
mosirae_dormitory_service/
├── server.js                 # 메인 서버 (상세 주석 포함)
├── routes/
│   └── reservations.js      # 예약 API 라우터
├── models/
│   └── Reservation.js       # Mongoose 예약 모델
├── middleware/
│   └── adminAuth.js         # 관리자 인증 미들웨어
├── html_assets/             # 사용자 페이지
│   ├── index.html           # 메인 홈페이지
│   └── reservation.html     # 예약 페이지
└── public/                  # 정적 자원 및 관리자 페이지
    ├── css/
    │   └── reservation.css
    ├── js/
    │   └── reservation.js   # 예약 시스템 클라이언트 스크립트
    └── admin_reservations.html  # 관리자 페이지
```

## 🔧 주요 API

### 공간 목록 조회
```http
GET /api/reservations/spaces
```

### 가용 정보 조회
```http
GET /api/reservations/availability?spaceId=ROOM_A&date=2025-11-14
```

### 예약 생성
```http
POST /api/reservations
Content-Type: application/json

{
  "spaceId": "ROOM_A",
  "date": "2025-11-14",
  "timeSlot": "09:00-10:00",
  "studentId": "202221042",
  "studentName": "홍길동"
}
```

### 내 예약 조회
```http
GET /api/reservations/my?studentId=202221042
```

### 예약 취소
```http
DELETE /api/reservations/:id
```

### 전체 예약 조회 (관리자용)
```http
GET /api/reservations/all?spaceId=ROOM_A&date=2025-11-14
```

## 🎮 사용 방법

### 사용자 - 예약하기
1. http://localhost:3000/ 접속
2. "공간대여" 메뉴 클릭
3. 공간, 날짜, 시간대 선택
4. 학번과 이름 입력 후 "예약하기"

### 사용자 - 내 예약 확인
1. 예약 페이지 하단 "내 예약 목록"에서 학번 입력
2. "조회" 버튼 클릭
3. 취소 원하는 예약의 "취소" 버튼 클릭

### 관리자 - 예약 관리
1. http://localhost:3000/ 접속
2. "공간예약관리" 메뉴 클릭
3. 관리자 ID/PW 입력 (ADMIN_USER/ADMIN_PASS)
4. 전체 예약 목록 확인 및 관리

## 📊 예약 상태

- **확정 (confirmed)**: 정원 내 예약, 즉시 사용 가능
- **대기 (waitlist)**: 정원 초과, 취소 발생 시 자동 승격
- **취소 (cancelled)**: 사용자 또는 관리자가 취소

## 🔄 대기열 시스템

1. 예약 시 정원이 가득 차면 자동으로 대기열 등록
2. 확정 예약이 취소되면 대기열의 첫 번째 예약이 자동으로 확정으로 승격
3. 승격 순서는 예약 생성 시간 기준

## 🗄️ 저장소 모드

### MongoDB 모드
- `.env`에 `MONGODB_URI` 설정 시 활성화
- 영구 데이터 저장
- 서버 재시작 후에도 데이터 유지

### In-Memory 모드
- `MONGODB_URI` 없을 시 자동 활성화
- 메모리에만 데이터 저장
- 서버 재시작 시 모든 데이터 초기화
- 개발/테스트용으로 적합

## 📝 라이선스

이 프로젝트는 건국대학교 글로컬캠퍼스 모시래학사 전용입니다.

## 👨‍💻 개발자

건국대학교 글로컬캠퍼스 모시래학사 개발팀
