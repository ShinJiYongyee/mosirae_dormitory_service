import express from "express";
import Reservation from "../models/Reservation.js";
import adminAuth from "../middleware/adminAuth.js";

const router = express.Router();

const DEFAULT_SLOTS = [
    "09:00-11:00", "11:00-13:00", "13:00-15:00",
    "15:00-17:00", "17:00-19:00", "19:00-21:00"
];

// \uXXXX 메시지
const MSG = {
    NEED_ROOM_DATE: "\uacf3\uacfc \ub0a0\uc9dc\uac00 \ud544\uc694\ud569\ub2c8\ub2e4.",
    NEED_FIELDS: "\uacf3\uacfc/\ub0a0\uc9dc/\uc2dc\uac04\ub300\uac00 \ud544\uc694\ud569\ub2c8\ub2e4.",
    AVAIL_FAIL: "\uac00\uc6a9\uc131 \uc870\ud68c \uc2e4\ud328",
    REQ_FAIL: "\uc608\uc57d \uc694\uccad \uc2e4\ud328",
    NOT_FOUND: "\ub370\uc774\ud130\ub97c \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.",
    DUP_STUDENT: "\ub3d9\uc77c \ud559\uc0dd\uc758 \ub3d9\uc77c \uc2dc\uac04\ub300 \uc911\ubcf5 \uc608\uc57d\uc740 \ubd88\uac00\ud569\ub2c8\ub2e4."
};

// 가용성 (공개)
router.get("/availability", async (req, res) => {
    const { roomId, date } = req.query;
    if (!roomId || !date) {
        return res.status(400).json({ ok: false, message: MSG.NEED_ROOM_DATE });
    }
    const booked = await Reservation.find({
        roomId, date, status: { $ne: "canceled" }
    }).lean();

    const taken = new Set(booked.map(b => b.timeSlot));
    const available = DEFAULT_SLOTS.filter(s => !taken.has(s));
    return res.json({ ok: true, roomId, date, available, taken: [...taken] });
});

// 목록 조회 (관리자 전용)
router.get("/", adminAuth, async (req, res) => {
    const { roomId, date } = req.query;
    const q = {};
    if (roomId) q.roomId = roomId;
    if (date) q.date = date;
    const list = await Reservation.find(q).sort({ date: 1, timeSlot: 1, createdAt: 1 }).lean();
    return res.json({ ok: true, data: list });
});

// 대기열 전체 조회 (관리자 전용)
router.get("/waitlist", adminAuth, async (req, res) => {
    const { roomId, date } = req.query;
    const q = { status: "waitlist" };
    if (roomId) q.roomId = roomId;
    if (date) q.date = date;
    const list = await Reservation.find(q).sort({ date: 1, timeSlot: 1, createdAt: 1 }).lean();
    return res.json({ ok: true, data: list });
});

// 내 예약 (공개)
router.get("/mine", async (req, res) => {
    const { studentId } = req.query;
    if (!studentId) return res.status(400).json({ ok: false, message: "studentId required" });
    const list = await Reservation.find({ "requester.studentId": studentId }).sort({ createdAt: -1 });
    return res.json({ ok: true, data: list });
});

// 예약 생성 (공개)
router.post("/", async (req, res) => {
    const { roomId, date, timeSlot, requester, capacity } = req.body;
    if (!roomId || !date || !timeSlot) {
        return res.status(400).json({ ok: false, message: MSG.NEED_FIELDS });
    }

    // 동일 학생의 동일 슬롯 중복 방지
    if (requester?.studentId) {
        const dup = await Reservation.findOne({
            "requester.studentId": requester.studentId,
            roomId, date, timeSlot,
            status: { $ne: "canceled" }
        });
        if (dup) {
            return res.status(409).json({ ok: false, message: MSG.DUP_STUDENT });
        }
    }

    const exists = await Reservation.findOne({
        roomId, date, timeSlot, status: { $ne: "canceled" }
    });

    const status = exists ? "waitlist" : "confirmed";
    const saved = await Reservation.create({
        roomId, date, timeSlot, requester: requester || {}, capacity: capacity || 1, status
    });

    return res.status(201).json({ ok: true, data: saved });
});

// 취소(+승격) (관리자 전용으로 가정)
router.patch("/:id/cancel", adminAuth, async (req, res) => {
    const { id } = req.params;

    const current = await Reservation.findById(id);
    if (!current) return res.status(404).json({ ok: false, message: MSG.NOT_FOUND });
    if (current.status === "canceled") {
        return res.json({ ok: true, data: current });
    }
    current.status = "canceled";
    await current.save();

    const next = await Reservation.findOne({
        roomId: current.roomId,
        date: current.date,
        timeSlot: current.timeSlot,
        status: "waitlist"
    }).sort({ createdAt: 1 });

    if (next) {
        next.status = "confirmed";
        await next.save();
    }
    return res.json({ ok: true, data: { canceled: current, promoted: next || null } });
});

// 단건 삭제 (관리자 전용)
router.delete("/:id", adminAuth, async (req, res) => {
    const { id } = req.params;
    const doc = await Reservation.findByIdAndDelete(id);
    if (!doc) return res.status(404).json({ ok: false, message: MSG.NOT_FOUND });
    return res.json({ ok: true, data: doc });
});

export default router;
