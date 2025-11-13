/**
 * ============================================
 * 공간예약 시스템 라우터
 * ============================================
 * 
 * 주요 기능:
 * - 예약 가능 시간대 조회
 * - 예약 생성 (정원 초과 시 대기열 등록)
 * - 내 예약 조회
 * - 예약 취소 (대기열 자동 승격)
 * - 전체 예약 조회 (관리자용)
 * 
 * 저장소 모드:
 * - MongoDB: 영구 저장
 * - In-Memory: 서버 재시작 시 초기화
 */

import express from 'express';

// ============================================
// 상수 정의
// ============================================

/**
 * 예약 가능한 시간대 목록 (09:00-21:00, 1시간 단위)
 */
const TIMESLOTS = [
    "09:00-10:00", "10:00-11:00", "11:00-12:00",
    "12:00-13:00", "13:00-14:00", "14:00-15:00",
    "15:00-16:00", "16:00-17:00", "17:00-18:00",
    "18:00-19:00", "19:00-20:00", "20:00-21:00"
];

/**
 * 예약 가능한 공간 목록
 * - ROOM_A, ROOM_B: 스터디룸 (2인실)
 * - HALL_1: 다목적홀 (10인실)
 */
const SPACES = [
    { id: "ROOM_A", name: "스터디룸 A", capacity: 2 },
    { id: "ROOM_B", name: "스터디룸 B", capacity: 2 },
    { id: "HALL_1", name: "다목적홀 1", capacity: 10 },
];

// ============================================
// 라우터 팩토리 함수
// ============================================
/**
 * 예약 라우터 생성 (팩토리 패턴)
 * @param {boolean} useDb - MongoDB 사용 여부
 * @returns {Router} Express 라우터 인스턴스
 */
export default async function reservationsRouterFactory(useDb) {
    const router = express.Router();

    // ============================================
    // 저장소 초기화
    // ============================================
    let ReservationModel = null;  // Mongoose 모델 (DB 모드)
    let memoryStore = [];         // 인메모리 저장소 (폴백 모드)

    // MongoDB 사용 시 Reservation 모델 로드
    if (useDb) {
        try {
            const mod = await import('../models/Reservation.js');
            ReservationModel = mod.default;
        } catch (e) {
            console.warn('⚠️ Reservation model load failed, fallback to memory:', e.message);
            useDb = false;  // 모델 로드 실패 시 인메모리 모드로 전환
        }
    }

    // ============================================
    // 헬퍼 함수
    // ============================================
    
    /**
     * 특정 공간과 날짜의 예약 목록 조회
     * @param {string} spaceId - 공간 ID (예: "ROOM_A")
     * @param {string} date - 날짜 (YYYY-MM-DD)
     * @returns {Promise<Array>} 예약 목록 (confirmed, waitlist만)
     */
    const findReservations = async (spaceId, date) => {
        if (useDb) {
            // MongoDB: 확정 및 대기열 예약만 조회
            return await ReservationModel.find({ 
                spaceId, 
                date, 
                status: { $in: ['confirmed', 'waitlist'] } 
            }).lean();
        } else {
            // In-Memory: 배열 필터링
            return memoryStore.filter(r => 
                r.spaceId === spaceId && 
                r.date === date && 
                (r.status === 'confirmed' || r.status === 'waitlist')
            );
        }
    };

    /**
     * 특정 시간대의 확정된 예약 수 계산
     * @param {Array} reservations - 예약 목록
     * @param {string} timeSlot - 시간대 (예: "09:00-10:00")
     * @returns {number} 확정된 예약 수
     */
    const confirmedCount = (reservations, timeSlot) =>
        reservations.filter(r => r.timeSlot === timeSlot && r.status === 'confirmed').length;

    // ============================================
    // API 엔드포인트
    // ============================================
    
    /**
     * GET /api/reservations/availability
     * 특정 공간과 날짜의 예약 가능 정보 조회
     * 
     * Query Parameters:
     * - spaceId: 공간 ID (필수)
     * - date: 날짜 YYYY-MM-DD (필수)
     * 
     * Response:
     * - space: 공간 정보
     * - date: 조회 날짜
     * - slots: 시간대별 가용 정보 배열
     *   - timeSlot: 시간대
     *   - capacity: 정원
     *   - confirmed: 확정된 예약 수
     *   - available: 남은 자리 수
     */
    router.get('/availability', async (req, res) => {
        try {
            const { spaceId, date } = req.query;
            
            // 공간 유효성 검증
            const space = SPACES.find(s => s.id === spaceId);
            if (!space) return res.status(400).json({ ok: false, message: '유효하지 않은 공간입니다.' });
            if (!date) return res.status(400).json({ ok: false, message: 'date가 필요합니다 (YYYY-MM-DD).' });

            const list = await findReservations(spaceId, date);
            const slots = TIMESLOTS.map(ts => {
                const count = confirmedCount(list, ts);
                return {
                    timeSlot: ts,
                    capacity: space.capacity,
                    confirmed: count,
                    available: Math.max(space.capacity - count, 0)
                };
            });
            res.json({ ok: true, space, date, slots });
        } catch (e) {
            res.status(500).json({ ok: false, message: e.message });
        }
    });

    // 예약 생성
    router.post('/', async (req, res) => {
        try {
            const { spaceId, date, timeSlot, studentId, studentName } = req.body;
            const space = SPACES.find(s => s.id === spaceId);
            if (!space) return res.status(400).json({ ok: false, message: '유효하지 않은 공간입니다.' });
            if (!date || !timeSlot || !studentId || !studentName) {
                return res.status(400).json({ ok: false, message: '필수 항목이 누락되었습니다.' });
            }

            const list = await findReservations(spaceId, date);
            const dup = list.find(r => r.timeSlot === timeSlot && r.studentId === studentId && r.status !== 'cancelled');
            if (dup) return res.status(409).json({ ok: false, message: '이미 해당 시간대에 예약이 있습니다.' });

            const count = confirmedCount(list, timeSlot);
            const status = count < space.capacity ? 'confirmed' : 'waitlist';

            const newRes = {
                spaceId, spaceName: space.name, date, timeSlot, studentId, studentName,
                status, createdAt: new Date()
            };

            if (useDb) {
                try {
                    const doc = await ReservationModel.create(newRes);
                    return res.status(201).json({ ok: true, data: doc });
                } catch (e) {
                    return res.status(409).json({ ok: false, message: e.message });
                }
            } else {
                newRes.id = String(Date.now()) + Math.random().toString(36).slice(2);
                memoryStore.push(newRes);
                return res.status(201).json({ ok: true, data: newRes });
            }
        } catch (e) {
            res.status(500).json({ ok: false, message: e.message });
        }
    });

    // 내 예약 목록
    router.get('/my', async (req, res) => {
        try {
            const { studentId } = req.query;
            if (!studentId) return res.status(400).json({ ok: false, message: 'studentId가 필요합니다.' });

            if (useDb) {
                const rows = await ReservationModel.find({ studentId, status: { $in: ['confirmed', 'waitlist'] } })
                    .sort({ date: 1, timeSlot: 1 }).lean();
                return res.json({ ok: true, data: rows });
            } else {
                const rows = memoryStore
                    .filter(r => r.studentId === studentId && (r.status === 'confirmed' || r.status === 'waitlist'))
                    .sort((a, b) => (a.date + a.timeSlot).localeCompare(b.date + b.timeSlot));
                return res.json({ ok: true, data: rows });
            }
        } catch (e) {
            res.status(500).json({ ok: false, message: e.message });
        }
    });

    // 취소 + 웨이팅 승격
    router.delete('/:id', async (req, res) => {
        try {
            const id = req.params.id;

            if (useDb) {
                const doc = await ReservationModel.findById(id);
                if (!doc || doc.status === 'cancelled') return res.status(404).json({ ok: false, message: '예약을 찾을 수 없습니다.' });

                doc.status = 'cancelled';
                await doc.save();

                const firstWait = await ReservationModel.findOne({
                    spaceId: doc.spaceId, date: doc.date, timeSlot: doc.timeSlot, status: 'waitlist'
                }).sort({ createdAt: 1 });
                if (firstWait) {
                    firstWait.status = 'confirmed';
                    await firstWait.save();
                }
                return res.json({ ok: true, cancelled: doc._id, promoted: firstWait?._id || null });
            } else {
                const idx = memoryStore.findIndex(r => r.id === id && r.status !== 'cancelled');
                if (idx === -1) return res.status(404).json({ ok: false, message: '예약을 찾을 수 없습니다.' });

                const target = memoryStore[idx];
                memoryStore[idx].status = 'cancelled';

                const candIdx = memoryStore.findIndex(r =>
                    r.spaceId === target.spaceId && r.date === target.date && r.timeSlot === target.timeSlot && r.status === 'waitlist'
                );
                let promoted = null;
                if (candIdx !== -1) {
                    memoryStore[candIdx].status = 'confirmed';
                    promoted = memoryStore[candIdx].id;
                }
                return res.json({ ok: true, cancelled: target.id, promoted });
            }
        } catch (e) {
            res.status(500).json({ ok: false, message: e.message });
        }
    });

    // 공간 목록
    router.get('/spaces', (req, res) => {
        res.json({ ok: true, data: SPACES });
    });

    // 전체 예약 조회 (관리자용)
    router.get('/all', async (req, res) => {
        try {
            const { spaceId, date } = req.query;
            
            if (useDb) {
                const filter = {};
                if (spaceId) filter.spaceId = spaceId;
                if (date) filter.date = date;
                
                const rows = await ReservationModel.find(filter)
                    .sort({ date: 1, timeSlot: 1, createdAt: 1 })
                    .lean();
                return res.json({ ok: true, data: rows });
            } else {
                let rows = memoryStore;
                if (spaceId) rows = rows.filter(r => r.spaceId === spaceId);
                if (date) rows = rows.filter(r => r.date === date);
                
                rows = rows.sort((a, b) => {
                    const cmp1 = (a.date + a.timeSlot).localeCompare(b.date + b.timeSlot);
                    if (cmp1 !== 0) return cmp1;
                    return a.createdAt - b.createdAt;
                });
                return res.json({ ok: true, data: rows });
            }
        } catch (e) {
            res.status(500).json({ ok: false, message: e.message });
        }
    });

    return router;
}
