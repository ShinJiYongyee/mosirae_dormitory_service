import express from "express";

export default function applicationRouterFactory(useDb, mongoose) {
  const router = express.Router();

  let ApplicationModel = null;
  let store = []; // 인메모리 저장 배열

  // ====== MongoDB 모델 설정 ======
  if (useDb && mongoose) {
    const schema = new mongoose.Schema({
      studentId: String,
      name: String,
      department: String,
      grade: String,
      phone: String,
      email: String,
      roomType: String,
      specialNeeds: String,
      createdAt: { type: Date, default: Date.now }
    });

    ApplicationModel = mongoose.model("DormApplication", schema);
  }

  // ============================
  // POST /api/application/
  // ============================
  router.post("/", async (req, res) => {
    const data = req.body;

    // 필수 항목 체크
    if (!data.studentId || !data.name || !data.department || !data.grade ||
        !data.phone || !data.email || !data.roomType) {
      return res.status(400).json({ message: "필수 항목 누락" });
    }

    try {
      if (useDb && ApplicationModel) {
        const saved = await ApplicationModel.create(data);
        return res.json(saved);
      } else {
        // 인메모리 저장
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
