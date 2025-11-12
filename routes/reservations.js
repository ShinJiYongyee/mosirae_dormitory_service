// routes/reservations.js (ESM)
import express from 'express';

const TIMESLOTS = [
    "09:00-10:00", "10:00-11:00", "11:00-12:00",
    "12:00-13:00", "13:00-14:00", "14:00-15:00",
    "15:00-16:00", "16:00-17:00", "17:00-18:00",
    "18:00-19:00", "19:00-20:00", "20:00-21:00"
];

const SPACES = [
    { id: "ROOM_A", name: "스터디룸 A", capacity: 2 },
    { id: "ROOM_B", name: "스터디룸 B", capacity: 2 },
    { id: "HALL_1", name: "다목적홀 1", capacity: 10 },
];

export default async function reservationsRouterFactory(useDb) {
    const router = express.Router();

    // 저장소: DB 또는 메모리
    let ReservationModel = null;
    let memoryStore = [];

    if (useDb) {
        try {
            const mod = await import('../models/Reservation.js');
            ReservationModel = mod.default;
        } catch (e) {
            console.warn('⚠️ Reservation model load failed, fallback to memory:', e.message);
            useDb = false;
        }
    }

    const findReservations = async (spaceId, date) => {
        if (useDb) {
            return await ReservationModel.find({ spaceId, date, status: { $in: ['confirmed', 'waitlist'] } }).lean();
        } else {
            return memoryStore.filter(r => r.spaceId === spaceId && r.date === date && (r.status === 'confirmed' || r.status === 'waitlist'));
        }
    };

    const confirmedCount = (reservations, timeSlot) =>
        reservations.filter(r => r.timeSlot === timeSlot && r.status === 'confirmed').length;

    // 가용 조회
    router.get('/availability', async (req, res) => {
        try {
            const { spaceId, date } = req.query;
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

    return router;
}
