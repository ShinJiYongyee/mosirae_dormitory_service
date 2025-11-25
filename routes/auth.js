/**
 * routes/auth.js
 * 
 * 세션 기반 관리자 인증 라우터
 * - POST /login: 관리자 로그인 (DB 사용자 검증)
 * - POST /logout: 로그아웃 (세션 파괴)
 * - GET /status: 현재 로그인 상태 확인
 * - POST /register: 관리자 계정 생성 (bcrypt 해시 저장)
 */

import express from 'express';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import AdminUser from '../models/AdminUser.js';

export default function authRouterFactory() {
    const router = express.Router();

    // MongoDB 연결 여부 확인
    const dbReady = mongoose?.connection?.readyState === 1;

    /**
     * POST /api/auth/register
     * 관리자 계정 생성 (MongoDB 필요)
     */
    router.post('/register', async (req, res) => {
        try {
            if (!dbReady) return res.status(503).json({ ok: false, message: 'DB 연결이 필요합니다.' });
            const { username, password } = req.body;
            if (!username || !password) return res.status(400).json({ ok: false, message: 'username, password 모두 필요합니다.' });

            const exists = await AdminUser.findOne({ username });
            if (exists) return res.status(409).json({ ok: false, message: '이미 존재하는 관리자 아이디입니다.' });

            const hash = await bcrypt.hash(password, 10);
            const doc = await AdminUser.create({ username, passwordHash: hash });
            return res.status(201).json({ ok: true, data: { id: doc._id, username: doc.username }, message: '관리자 계정 생성 완료' });
        } catch (e) {
            return res.status(500).json({ ok: false, message: e.message });
        }
    });

    /**
     * POST /api/auth/login
     */
    router.post('/login', async (req, res) => {
        try {
            const { username, password } = req.body;
            if (!username || !password) return res.status(400).json({ ok: false, message: 'username, password 모두 필요합니다.' });
            if (!dbReady) return res.status(503).json({ ok: false, message: 'DB 연결이 필요합니다.' });

            const user = await AdminUser.findOne({ username });
            if (!user) return res.status(401).json({ ok: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
            const match = await bcrypt.compare(password, user.passwordHash);
            if (!match) return res.status(401).json({ ok: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });

            req.session.isAdmin = true;
            req.session.username = user.username;
            return res.json({ ok: true, message: '로그인 성공' });
        } catch (e) {
            return res.status(500).json({ ok: false, message: e.message });
        }
    });

    /**
     * POST /api/auth/logout
     */
    router.post('/logout', (req, res) => {
        req.session.destroy((err) => {
            if (err) return res.status(500).json({ ok: false, message: '로그아웃 실패' });
            res.clearCookie('connect.sid');
            return res.json({ ok: true, message: '로그아웃 성공' });
        });
    });

    /**
     * GET /api/auth/status
     */
    router.get('/status', (req, res) => {
        if (req.session.isAdmin) {
            return res.json({ isLoggedIn: true, username: req.session.username });
        }
        return res.json({ isLoggedIn: false });
    });

    return router;
}
