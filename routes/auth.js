/**
 * routes/auth.js
 * 
 * 세션 기반 관리자 인증 라우터
 * - POST /login: 관리자 로그인 (ADMIN_USER, ADMIN_PASS 검증)
 * - POST /logout: 로그아웃 (세션 파괴)
 * - GET /status: 현재 로그인 상태 확인
 */

import express from 'express';

export default function authRouterFactory() {
    const router = express.Router();

    /**
     * POST /api/auth/login
     * 관리자 로그인
     * Body: { username, password }
     * Response: { ok: true, message: "로그인 성공" } 또는 에러
     */
    router.post('/login', (req, res) => {
        const { username, password } = req.body;

        // 환경변수에서 관리자 계정 정보 가져오기
        const ADMIN_USER = process.env.ADMIN_USER || 'admin';
        const ADMIN_PASS = process.env.ADMIN_PASS || 'admin';

        // 아이디/비번 검증
        if (username === ADMIN_USER && password === ADMIN_PASS) {
            // 세션에 로그인 상태 저장
            req.session.isAdmin = true;
            req.session.username = username;

            return res.json({ 
                ok: true, 
                message: '로그인 성공' 
            });
        } else {
            return res.status(401).json({ 
                ok: false, 
                message: '아이디 또는 비밀번호가 올바르지 않습니다.' 
            });
        }
    });

    /**
     * POST /api/auth/logout
     * 로그아웃 (세션 파괴)
     */
    router.post('/logout', (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ 
                    ok: false, 
                    message: '로그아웃 실패' 
                });
            }
            res.clearCookie('connect.sid'); // 세션 쿠키 삭제
            return res.json({ 
                ok: true, 
                message: '로그아웃 성공' 
            });
        });
    });

    /**
     * GET /api/auth/status
     * 현재 로그인 상태 확인
     * Response: { isLoggedIn: true/false, username?: string }
     */
    router.get('/status', (req, res) => {
        if (req.session.isAdmin) {
            return res.json({ 
                isLoggedIn: true, 
                username: req.session.username 
            });
        } else {
            return res.json({ 
                isLoggedIn: false 
            });
        }
    });

    return router;
}
