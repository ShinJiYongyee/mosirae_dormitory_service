import express from "express";

export default function maintenanceRouterFactory(useDb, mongoose) {
  const router = express.Router();

  let MaintenanceModel = null;
  let store = []; // 인메모리 모드 저장 배열

  if (useDb && mongoose) {
    const schema = new mongoose.Schema({
      studentId: { type: String, required: true },
      studentName: { type: String, required: true },
      room: { type: String, required: true },
      category: { type: String, required: true },
      urgency: { type: String, required: true },
      title: { type: String, required: true },
      description: { type: String, required: true },
      status: { type: String, default: '접수' },
      createdAt: { type: Date, default: Date.now }
    }, {
      collection: 'maintenances',
      collation: { locale: 'ko', strength: 2 }
    });

    MaintenanceModel = mongoose.models.Maintenance || mongoose.model("Maintenance", schema);
  }

  // -------------------------
  // POST /api/maintenance - 민원 제출
  // -------------------------
  router.post("/", async (req, res) => {
    const data = req.body;

    if (!data.studentId || !data.studentName || !data.room || !data.category || 
        !data.urgency || !data.title || !data.description) {
      return res.status(400).json({ message: "필수 항목 누락" });
    }

    try {
      if (useDb && MaintenanceModel) {
        const saved = await MaintenanceModel.create(data);
        return res.json(saved);
      } else {
        // In-memory 저장
        const item = { 
          ...data, 
          id: Date.now().toString(), 
          status: '접수',
          createdAt: new Date() 
        };
        store.push(item);
        return res.json(item);
      }
    } catch (err) {
      console.error("? 민원 제출 실패:", err);
      return res.status(500).json({ message: "제출 실패: " + err.message });
    }
  });

  // -------------------------
  // GET /api/maintenance - 전체 민원 조회 (관리자용)
  // -------------------------
  router.get("/", async (req, res) => {
    const { urgency, status } = req.query;

    try {
      if (useDb && MaintenanceModel) {
        let query = {};
        if (urgency) query.urgency = urgency;
        if (status) query.status = status;

        const records = await MaintenanceModel.find(query).sort({ createdAt: -1 }).lean();
        return res.json(records);
      } else {
        let filtered = store;
        if (urgency) filtered = filtered.filter(r => r.urgency === urgency);
        if (status) filtered = filtered.filter(r => r.status === status);
        
        return res.json(filtered);
      }
    } catch (err) {
      console.error("? 민원 조회 실패:", err);
      return res.status(500).json({ message: "조회 실패" });
    }
  });

  // -------------------------
  // GET /api/maintenance/:studentId - 학생별 민원 조회
  // -------------------------
  router.get("/:studentId", async (req, res) => {
    const { studentId } = req.params;

    try {
      if (useDb && MaintenanceModel) {
        const records = await MaintenanceModel.find({ studentId }).sort({ createdAt: -1 }).lean();
        return res.json(records);
      } else {
        const records = store.filter(item => item.studentId === studentId);
        return res.json(records);
      }
    } catch (err) {
      console.error("? 민원 조회 실패:", err);
      return res.status(500).json({ message: "조회 실패" });
    }
  });

  // -------------------------
  // PATCH /api/maintenance/:id/status - 민원 상태 변경 (관리자용)
  // -------------------------
  router.patch("/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "상태가 필요합니다" });
    }

    try {
      if (useDb && MaintenanceModel) {
        const updated = await MaintenanceModel.findByIdAndUpdate(
          id, 
          { status }, 
          { new: true }
        ).lean();
        if (!updated) {
          return res.status(404).json({ message: "민원을 찾을 수 없습니다" });
        }
        return res.json(updated);
      } else {
        const item = store.find(m => m.id === id);
        if (!item) {
          return res.status(404).json({ message: "민원을 찾을 수 없습니다" });
        }
        item.status = status;
        return res.json(item);
      }
    } catch (err) {
      console.error("? 상태 변경 실패:", err);
      return res.status(500).json({ message: "상태 변경 실패" });
    }
  });

  // -------------------------
  // DELETE /api/maintenance/:id - 민원 삭제 (관리자용)
  // -------------------------
  router.delete("/:id", async (req, res) => {
    const { id } = req.params;

    try {
      if (useDb && MaintenanceModel) {
        const deleted = await MaintenanceModel.findByIdAndDelete(id);
        if (!deleted) {
          return res.status(404).json({ message: "민원을 찾을 수 없습니다" });
        }
        return res.json({ message: "삭제 완료" });
      } else {
        const index = store.findIndex(item => item.id === id);
        if (index === -1) {
          return res.status(404).json({ message: "민원을 찾을 수 없습니다" });
        }
        store.splice(index, 1);
        return res.json({ message: "삭제 완료" });
      }
    } catch (err) {
      console.error("? 민원 삭제 실패:", err);
      return res.status(500).json({ message: "삭제 실패" });
    }
  });

  return router;
}
