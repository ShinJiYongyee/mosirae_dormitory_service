/**
 * ============================================
 * 모시래학사 공간예약 시스템 - 메인 서버
 * ============================================
 * 
 * 주요 기능:
 * - 스터디룸/다목적홀 예약 관리
 * - 대기열 시스템 (정원 초과 시 자동 대기 등록)
 * - 관리자 페이지 (HTTP Basic Auth)
 * - MongoDB 또는 인메모리 저장소 자동 전환
 * 
 * 환경변수 (.env):
 * - MONGODB_URI: MongoDB 연결 문자열 (선택)
 * - ADMIN_USER: 관리자 사용자명
 * - ADMIN_PASS: 관리자 비밀번호
 * - PORT: 서버 포트 (기본값: 3000)
 */

// ============================================
// 모듈 임포트
// ============================================
import 'dotenv/config.js';                               // 환경변수 로드 (.env 파일)
import express from 'express';                           // Express 웹 프레임워크
import session from 'express-session';                   // 세션 관리 (로그인 상태 유지)
import path from 'path';                                 // 경로 유틸리티
import { fileURLToPath } from 'url';                     // ESM에서 __dirname 사용을 위한 변환
import reservationsRouterFactory from './routes/reservations.js'; // 예약 라우터
import authRouterFactory from './routes/auth.js';        // 인증 라우터 (로그인/로그아웃)
import checkinRouterFactory from "./routes/checkin.js";  // 입/퇴실신청 라우터
import overnightRouterFactory from "./routes/overnight.js"; // 외박신청 라우터
import applicationRouterFactory from "./routes/application.js"; // 관생신청 라우터
import pointsRouterFactory from "./routes/points.js";    // 상벌점 라우터
import maintenanceRouterFactory from "./routes/maintenance.js"; // 민원/수리 라우터

// ============================================
// 기본 설정
// ============================================
const __filename = fileURLToPath(import.meta.url);       // 현재 파일의 절대 경로
const __dirname = path.dirname(__filename);              // 현재 디렉토리 경로
const app = express();                                   // Express 앱 생성

app.set("view engine", "ejs");
app.set("views", "./html_assets");

// ============================================
// MongoDB 연결 (선택적)
// ============================================
// MongoDB가 없어도 인메모리 모드로 작동 가능
let useDb = false;      // DB 사용 여부 플래그
let mongoose = null;    // Mongoose 인스턴스

if (process.env.MONGODB_URI) {
    try {
        // Mongoose 동적 import (설치되지 않은 경우 대비)
        const mod = await import('mongoose');
        mongoose = mod.default;

        // MongoDB 연결 시도 (5초 타임아웃) - await으로 기다림!
        try {
            await mongoose.connect(process.env.MONGODB_URI, {
                serverSelectionTimeoutMS: 5000,
            });
            console.log('✅ MongoDB connected');
            console.log('📊 연결된 DB:', mongoose.connection.name || 'test');
            useDb = true;  // DB 모드로 전환
        } catch (e) {
            console.warn('⚠️ MongoDB connect failed, fallback to in-memory:', e.message);
            useDb = false; // 인메모리 모드로 폴백
        }
    } catch (e) {
        console.warn('⚠️ Mongoose not installed, fallback to in-memory:', e.message);
    }
}

// ============================================
// 미들웨어 설정
// ============================================
app.use(express.json());  // JSON 요청 본문 파싱

// 세션 설정 (로그인 상태 유지)
app.use(session({
    secret: process.env.SESSION_SECRET || 'mosirae-dormitory-secret-key',  // 세션 암호화 키
    resave: false,                      // 세션 변경사항 없어도 저장 안함
    saveUninitialized: false,           // 초기화되지 않은 세션 저장 안함
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7,  // 쿠키 유효기간: 7일
        httpOnly: true,                    // XSS 공격 방지 (JavaScript로 접근 불가)
        secure: false                      // HTTPS 아닐 때도 동작 (개발환경)
    }
}));

// ============================================
// 정적 파일 제공 (UTF-8 charset 명시)
// ============================================
/**
 * 한글 깨짐 방지를 위해 모든 정적 파일에 UTF-8 charset 헤더 추가
 * @param {Response} res - Express response 객체
 * @param {string} filePath - 파일 경로
 */
const withCharset = (res, filePath) => {
    if (filePath.endsWith('.ejs')) res.setHeader('Content-Type', 'text/ejs; charset=utf-8');
    if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css; charset=utf-8');
    if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
};

// /assets 경로로 public 폴더 제공 (CSS, JS, 이미지)
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: withCharset
}));


app.get('/', (req, res) => {
    res.render("index");
});

// ============================================
// API 라우트 등록
// ============================================
/**
 * 인증 API (로그인/로그아웃/상태확인)
 */
const authRouter = authRouterFactory();
app.use('/api/auth', authRouter);

/**
 * 예약 시스템 API
 * - useDb 플래그를 전달하여 MongoDB 또는 인메모리 모드 선택
 * - 라우터 팩토리 패턴으로 저장소 추상화
 */
const reservationsRouter = await reservationsRouterFactory(useDb);
app.use('/api/reservations', reservationsRouter);

// 기숙사 입/퇴실 라우터 활성화
const checkinRouter = checkinRouterFactory(useDb, mongoose);
app.use("/api/checkin", checkinRouter);

// 외박신청 라우터 활성화
const overnightRouter = overnightRouterFactory(useDb, mongoose);
app.use("/api/overnight", overnightRouter);

// 관생신청 라우터 활성화
const applicationRouter = applicationRouterFactory(useDb, mongoose);
app.use("/api/application", applicationRouter);

// 상벌점 라우터 활성화
const pointsRouter = pointsRouterFactory(useDb, mongoose);
app.use("/api/points", pointsRouter);

// 민원/수리 라우터 활성화
const maintenanceRouter = maintenanceRouterFactory(useDb, mongoose);
app.use("/api/maintenance", maintenanceRouter);

// ============================================
// 정적 페이지 라우트
// ============================================
// 로그인
app.get('/login', (req, res) => {
    res.render("login");
});
// 입/퇴실 신청(사용자용)
app.get('/checkin', (req, res) => {
    res.render("checkin");
});
// 외박신청(사용자용)
app.get('/overnight', (req, res) => {
    res.render("overnight");
});
// 관생신청(사용자용)
app.get('/application', (req, res) => {
    res.render("application");
});
// 공간예약 페이지 (사용자용)
app.get('/reservation', (req, res) => {
    res.render("reservation");
});
// 상/벌점 확인(사용자용)
app.get('/points', (req, res) => {
    res.render("points");
});
// 민원/수리(사용자용)
app.get('/maintenance', (req, res) => {
    res.render("maintenance");
});

// ============================================
// 관리자 페이지 라우트 (세션 인증 보호)
// ============================================
import sessionAuth from './middleware/sessionAuth.js';

// 예약 관리 페이지 (확정/대기/취소 조회 및 관리)
app.get('/admin/reservations', sessionAuth, (req, res) => {
    res.render("admin_reservations");
});

// 상벌점 관리 페이지 (상벌점 추가/조회/삭제)
app.get('/admin/points', sessionAuth, (req, res) => {
    res.render("admin_points");
});

// 테스트용 v3 페이지 (캐시 우회)
app.get('/admin/points-v3', sessionAuth, (req, res) => {
    res.render("admin_points_v3");
});

// 민원 관리 페이지 (민원 조회/상태변경/삭제)
app.get('/admin/maintenance', sessionAuth, (req, res) => {
    res.render("admin_maintenance");
});
// ============================================
// 서버 시작
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running http://localhost:${PORT}`);
    console.log(`📦 Storage mode: ${useDb ? 'MongoDB' : 'In-Memory'}`);
});
