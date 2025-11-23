import express from "express";

export default function pointsRouterFactory(useDb, mongoose) {
  const router = express.Router();

  let PointModel = null;
  let memory = []; // 인메모리 저장 배열

  if (useDb && mongoose) {
    const schema = new mongoose.Schema({
      studentId: { type: String, required: true },
      studentName: { type: String, required: true },
      type: { type: String, enum: ["reward", "penalty"], required: true },
      points: { type: Number, required: true },
      reason: { type: String, required: true },
      date: { type: String, required: true }, // YYYY-MM-DD
      createdAt: { type: Date, default: Date.now }
    }, { collection: "points", collation: { locale: "ko", strength: 2 } });
    PointModel = mongoose.models.Point || mongoose.model("Point", schema);
  }

  router.use((req, res, next) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    next();
  });

  // 추가
  router.post("/", async (req, res) => {
    const { studentId, studentName, type, points, reason, date } = req.body;
    if (!studentId || !studentName || !type || !points || !reason || !date) {
      return res.status(400).json({ ok: false, message: "필수 항목 누락" });
    }
    try {
      if (useDb && PointModel) {
        const saved = await PointModel.create({ studentId, studentName, type, points, reason, date });
        return res.json({ ok: true, data: saved });
      } else {
        const item = { id: Date.now().toString(), studentId, studentName, type, points, reason, date, createdAt: new Date() };
        memory.push(item);
        return res.json({ ok: true, data: item });
      }
    } catch (e) {
      return res.status(500).json({ ok: false, message: "추가 실패: " + e.message });
    }
  });

  // 관리자 전체 목록
  router.get("/", async (_req, res) => {
    try {
      if (useDb && PointModel) {
        const list = await PointModel.find().sort({ createdAt: -1 }).lean();
        return res.json({ ok: true, data: list });
      } else {
        const list = [...memory].sort((a, b) => b.createdAt - a.createdAt);
        return res.json({ ok: true, data: list });
      }
    } catch (e) {
      return res.status(500).json({ ok: false, message: "조회 실패" });
    }
  });

  // 학생별 조회
  router.get("/:studentId", async (req, res) => {
    const { studentId } = req.params;
    try {
      let list;
      if (useDb && PointModel) {
        list = await PointModel.find({ studentId }).sort({ createdAt: -1 }).lean();
      } else {
        list = memory.filter(r => r.studentId === studentId).sort((a, b) => b.createdAt - a.createdAt);
      }
      const rewardTotal = list.filter(r => r.type === "reward").reduce((s, r) => s + r.points, 0);
      const penaltyTotal = list.filter(r => r.type === "penalty").reduce((s, r) => s + r.points, 0);
      const totalScore = rewardTotal - penaltyTotal;
      return res.json({ ok: true, data: { records: list, summary: { rewardTotal, penaltyTotal, totalScore } } });
    } catch (e) {
      return res.status(500).json({ ok: false, message: "조회 실패" });
    }
  });

  // 삭제
  router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    try {
      if (useDb && PointModel) {
        const del = await PointModel.findByIdAndDelete(id);
        if (!del) return res.status(404).json({ ok: false, message: "기록 없음" });
        return res.json({ ok: true, data: { id } });
      } else {
        const idx = memory.findIndex(r => r.id === id);
        if (idx === -1) return res.status(404).json({ ok: false, message: "기록 없음" });
        memory.splice(idx, 1);
        return res.json({ ok: true, data: { id } });
      }
    } catch (e) {
      return res.status(500).json({ ok: false, message: "삭제 실패: " + e.message });
    }
  });

  return router;
}
