// server.js (ESM)
import 'dotenv/config.js';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import reservationsRouterFactory from './routes/reservations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ====== Mongo 연결 (선택) ======
let useDb = false;
let mongoose = null;

if (process.env.MONGODB_URI) {
    try {
        const mod = await import('mongoose'); // ESM 동적 import
        mongoose = mod.default;
        mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
        }).then(() => {
            console.log('✅ MongoDB connected');
            useDb = true;
        }).catch((e) => {
            console.warn('⚠️ MongoDB connect failed, fallback to in-memory:', e.message);
            useDb = false;
        });
    } catch (e) {
        console.warn('⚠️ Mongoose not installed, fallback to in-memory:', e.message);
    }
}

app.use(express.json());

// 정적 리소스에 UTF-8 지정 (한글 깨짐 방지)
const withCharset = (res, filePath) => {
    if (filePath.endsWith('.html')) res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css; charset=utf-8');
    if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
};

// 정적 폴더: public (공용 CSS/JS/이미지)
app.use('/assets', express.static(path.join(__dirname, 'public'), {
    setHeaders: withCharset
}));

// 정적 폴더: html_assets (기존 정적 페이지)
app.use('/', express.static(path.join(__dirname, 'html_assets'), {
    setHeaders: withCharset
}));

// 라우트: 예약 API (팩토리)
const reservationsRouter = await reservationsRouterFactory(useDb);
app.use('/api/reservations', reservationsRouter);

// 라우트: 공간예약 페이지(정적)
app.get('/reservation', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(path.join(__dirname, 'html_assets', 'reservation.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running http://localhost:${PORT}`);
});
