import express from "express";

export default function maintenanceRouterFactory(useDb, mongoose) {
  const router = express.Router();

  let MaintenanceModel = null;
  let store = []; // 인메모리 저장 배열

  if (useDb && mongoose) {
    const schema = new mongoose.Schema({
      studentId: { type: String, required: true },
      studentName: { type: String, required: true },
      room: { type: String, required: true },
      category: { type: String, required: true },
      urgency: { type: String, required: true },
      title: { type: String, required: true },
      description: { type: String, required: true },
      status: { type: String, default: '\uC811\uC218' }, // 접수
      createdAt: { type: Date, default: Date.now }
    }, {
      collection: 'maintenances',
      collation: { locale: 'ko', strength: 2 }
    });

    MaintenanceModel = mongoose.models.Maintenance || mongoose.model("Maintenance", schema);
  }

  const ALLOWED_CATEGORIES = [
    '\uC2DC\uC124', // 시설
    '\uC804\uAE30', // 전기
    '\uC218\uB3C4', // 수도
    '\uB0C9\uB09C\uBC29', // 냉난방
    '\uAE30\uD0C0'  // 기타
  ];
  const ALLOWED_URGENCY = [
    '\uAE34\uAE09', // 긴급
    '\uBCF4\uD1B5', // 보통
    '\uB0AE\uC74C'  // 낮음
  ];
  const ALLOWED_STATUS = [
    '\uC811\uC218', // 접수
    '\uCC98\uB9AC\uC911', // 처리중
    '\uCC98\uB9AC\uC644\uB8CC' // 처리완료
  ];

  const normalize = v => (typeof v === 'string' ? v.normalize('NFC').trim() : v);

  const codePoints = v => Array.from(v).map(c=>c.charCodeAt(0).toString(16)).join(' ');

  // -------------------------
  // POST /api/maintenance - 민원/수리 신청
  // -------------------------
  router.post("/", async (req, res) => {
    const data = req.body;
    console.log('[POST /api/maintenance] raw body:', data);
    ['studentId','studentName','room','category','urgency','title','description'].forEach(f => { data[f] = normalize(data[f]); });

    const missing = [];
    ['studentId','studentName','room','category','urgency','title','description'].forEach(f => { if (!data[f]) missing.push(f); });
    if (missing.length) {
      return res.status(400).json({ ok:false, message:`필수 항목 누락: ${missing.join(', ')}` });
    }

    let categoryOk = ALLOWED_CATEGORIES.includes(data.category);
    let urgencyOk = ALLOWED_URGENCY.includes(data.urgency);
    if (!categoryOk) { const c2 = data.category.replace(/\s+/g,''); if (ALLOWED_CATEGORIES.includes(c2)) { categoryOk = true; data.category = c2; } }
    if (!urgencyOk) { const u2 = data.urgency.replace(/\s+/g,''); if (ALLOWED_URGENCY.includes(u2)) { urgencyOk = true; data.urgency = u2; } }
    if (!categoryOk) {
      return res.status(400).json({ ok:false, message:`잘못된 카테고리: ${data.category}`, allowed: ALLOWED_CATEGORIES });
    }
    if (!urgencyOk) {
      return res.status(400).json({ ok:false, message:`잘못된 긴급도: ${data.urgency}`, allowed: ALLOWED_URGENCY });
    }

    data.status = '\uC811\uC218'; // 접수

    try {
      if (useDb && MaintenanceModel) {
        const saved = await MaintenanceModel.create(data);
        return res.status(201).json({ ok:true, data:saved });
      } else {
        const item = { ...data, id: Date.now().toString(), createdAt:new Date() };
        store.push(item);
        return res.status(201).json({ ok:true, data:item });
      }
    } catch (err) {
      console.error('민원 저장 오류:', err);
      return res.status(500).json({ ok:false, message:'서버 오류: '+err.message });
    }
  });

  // -------------------------
  // GET /api/maintenance - 전체 민원 조회 (관리자 필터)
  // -------------------------
  router.get("/", async (req, res) => {
    const urgency = normalize(req.query.urgency);
    const status = normalize(req.query.status);
    if (urgency && !ALLOWED_URGENCY.includes(urgency)) {
      return res.status(400).json({ ok:false, message:`잘못된 긴급도 필터: ${urgency}` });
    }
    if (status && !ALLOWED_STATUS.includes(status)) {
      return res.status(400).json({ ok:false, message:`잘못된 상태 필터: ${status}` });
    }
    try {
      if (useDb && MaintenanceModel) {
        const query = {};
        if (urgency) query.urgency = urgency;
        if (status) query.status = status;
        const records = await MaintenanceModel.find(query).sort({ createdAt:-1 }).lean();
        return res.json({ ok:true, data:records });
      } else {
        let filtered = store;
        if (urgency) filtered = filtered.filter(r=>r.urgency===urgency);
        if (status) filtered = filtered.filter(r=>r.status===status);
        return res.json({ ok:true, data:filtered });
      }
    } catch (err) {
      console.error('민원 조회 오류:', err);
      return res.status(500).json({ ok:false, message:'조회 오류' });
    }
  });

  // -------------------------
  // GET /api/maintenance/export - 민원 내역 엑셀(CSV) 다운로드
  // -------------------------
  router.get("/export", async (req, res) => {
    const urgency = normalize(req.query.urgency);
    const status = normalize(req.query.status);
    if (urgency && !ALLOWED_URGENCY.includes(urgency)) {
      return res.status(400).json({ ok:false, message:`잘못된 긴급도 필터: ${urgency}` });
    }
    if (status && !ALLOWED_STATUS.includes(status)) {
      return res.status(400).json({ ok:false, message:`잘못된 상태 필터: ${status}` });
    }
    try {
      let records;
      if (useDb && MaintenanceModel) {
        const query = {};
        if (urgency) query.urgency = urgency;
        if (status) query.status = status;
        records = await MaintenanceModel.find(query).sort({ createdAt:-1 }).lean();
      } else {
        records = store.slice();
        if (urgency) records = records.filter(r=>r.urgency===urgency);
        if (status) records = records.filter(r=>r.status===status);
      }
      // CSV 헤더 (유니코드 이스케이프 사용)
      const header = ['\uD559\uBC88','\uC774\uB984','\uD638\uC2E4','\uCE74\uD14C\uACE0\uB9AC','\uAE34\uAE09\uB3C4','\uC81C\uBAA9','\uB0B4\uC6A9','\uC0C1\uD0DC','\uC791\uC131\uC77C'];
      const needsQuote = v => /[",\n]/.test(v);
      const escapeCell = v => {
        if (v == null) return '';
        let s = String(v).replace(/"/g,'""');
        if (needsQuote(s)) s = '"'+s+'"';
        return s;
      };
      const rows = records.map(r => [
        r.studentId,
        r.studentName,
        r.room,
        r.category,
        r.urgency,
        r.title,
        r.description,
        r.status,
        new Date(r.createdAt).toLocaleString('ko-KR')
      ].map(escapeCell).join(','));
      let csv = header.map(escapeCell).join(',') + '\n' + rows.join('\n');
      csv = '\uFEFF' + csv; // UTF-8 BOM
      const filename = 'maintenance_export_' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '_utf8.csv';
      res.setHeader('Content-Type','text/csv; charset=UTF-8');
      res.setHeader('Content-Disposition',`attachment; filename="${filename}"`);
      return res.send(csv);
    } catch (err) {
      console.error('CSV 생성 오류:', err);
      return res.status(500).json({ ok:false, message:'CSV 생성 실패' });
    }
  });

  // -------------------------
  // GET /api/maintenance/:studentId - 학생별 민원 조회
  // -------------------------
  router.get("/:studentId", async (req, res) => {
    const studentId = normalize(req.params.studentId);
    try {
      if (useDb && MaintenanceModel) {
        const records = await MaintenanceModel.find({ studentId }).sort({ createdAt:-1 }).lean();
        return res.json({ ok:true, data:records });
      } else {
        const records = store.filter(item=>item.studentId===studentId);
        return res.json({ ok:true, data:records });
      }
    } catch (err) {
      console.error('학생 민원 조회 오류:', err);
      return res.status(500).json({ ok:false, message:'조회 오류' });
    }
  });

  // -------------------------
  // PATCH /api/maintenance/:id/status - 상태 변경 (관리자)
  // -------------------------
  router.patch("/:id/status", async (req, res) => {
    const { id } = req.params;
    const status = normalize(req.body.status);
    if (!status) return res.status(400).json({ ok:false, message:'상태 값이 필요합니다.' });
    if (!ALLOWED_STATUS.includes(status)) return res.status(400).json({ ok:false, message:`허용되지 않는 상태: ${status}` });
    try {
      if (useDb && MaintenanceModel) {
        const updated = await MaintenanceModel.findByIdAndUpdate(id, { status }, { new:true }).lean();
        if (!updated) return res.status(404).json({ ok:false, message:'민원을 찾을 수 없습니다.' });
        return res.json({ ok:true, data:updated });
      } else {
        const item = store.find(m=>m.id===id);
        if (!item) return res.status(404).json({ ok:false, message:'민원을 찾을 수 없습니다.' });
        item.status = status; return res.json({ ok:true, data:item });
      }
    } catch (err) {
      console.error('상태 변경 오류:', err);
      return res.status(500).json({ ok:false, message:'상태 변경 실패' });
    }
  });

  // -------------------------
  // DELETE /api/maintenance/:id - 민원 삭제 (관리자)
  // -------------------------
  router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    try {
      if (useDb && MaintenanceModel) {
        const deleted = await MaintenanceModel.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ ok:false, message:'민원을 찾을 수 없습니다.' });
        return res.json({ ok:true, message:'삭제 완료' });
      } else {
        const index = store.findIndex(item=>item.id===id);
        if (index === -1) return res.status(404).json({ ok:false, message:'민원을 찾을 수 없습니다.' });
        store.splice(index,1); return res.json({ ok:true, message:'삭제 완료' });
      }
    } catch (err) {
      console.error('민원 삭제 오류:', err);
      return res.status(500).json({ ok:false, message:'삭제 실패' });
    }
  });

  return router;
}
