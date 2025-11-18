import express from "express";

export default function checkinRouterFactory(useDb, mongoose) {
  const router = express.Router();

  let CheckinModel = null;
  let store = []; // 인메모리 모드 저장 배열

  if (useDb && mongoose) {
    const schema = new mongoose.Schema({
      studentId: String,
      name: String,
      room: String,
      type: String,
      date: String,
      reason: String,
      createdAt: { type: Date, default: Date.now }
    });

    CheckinModel = mongoose.model("CheckinRequest", schema);
  }

  // -------------------------
  // POST /api/checkin
  // -------------------------
  router.post("/", async (req, res) => {
    const data = req.body;

    if (!data.studentId || !data.name || !data.room || !data.type || !data.date) {
      return res.status(400).json({ message: "필수 항목 누락" });
    }

    try {
      if (useDb && CheckinModel) {
        const saved = await CheckinModel.create(data);
        return res.json(saved);
      } else {
        // In-memory 저장
        const item = { ...data, createdAt: new Date() };
        store.push(item);
        return res.json(item);
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "DB 저장 실패" });
    }
  });

  return router;
}
