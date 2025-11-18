import express from "express";

export default function overnightRouterFactory(useDb, mongoose) {
  const router = express.Router();

  let OvernightModel = null;
  let store = []; // 인메모리 저장

  // -------------------------
  // DB Mode: Mongoose Schema
  // -------------------------
  if (useDb && mongoose) {
    const schema = new mongoose.Schema({
      studentId: String,
      name: String,
      room: String,
      startDate: String,
      endDate: String,
      destination: String,
      contact: String,
      reason: String,
      createdAt: { type: Date, default: Date.now }
    });

    OvernightModel = mongoose.model("OvernightRequest", schema);
  }

  // -------------------------
  // POST /api/overnight
  // -------------------------
  router.post("/", async (req, res) => {
    const data = req.body;

    // 필수 입력값 검사
    if (!data.studentId || !data.name || !data.room || !data.startDate || !data.endDate) {
      return res.status(400).json({
        message: "필수 입력 항목이 누락되었습니다. 학번, 이름, 호실, 외박 시작/종료일은 반드시 입력해야 합니다."
      });
    }

    try {
      if (useDb && OvernightModel) {
        await OvernightModel.create(data);
      } else {
        // 인메모리 모드
        store.push({ ...data, createdAt: new Date() });
      }

      return res.json({
        message: "외박 신청이 성공적으로 완료되었습니다."
      });

    } catch (err) {
      console.error("외박 신청 저장 오류:", err);
      return res.status(500).json({
        message: "서버 오류로 인해 저장에 실패했습니다."
      });
    }
  });

  return router;
}
