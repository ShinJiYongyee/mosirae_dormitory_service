import express from "express";
import ExcelJS from "exceljs";

export default function maintenanceRouterFactory(useDb, mongoose) {
  const router = express.Router();

  let MaintenanceModel = null;
  let store = []; // 인메모리 저장 배열

  const STATUS_RECEIVED = "\uC811\uC218"; // 접수
  const STATUS_PROCESSING = "\uCC98\uB9AC\uC911"; // 처리중
  const STATUS_COMPLETED = "\uC870\uCE58\uC644\uB8CC"; // 조치완료
  const ALLOWED_STATUS = [STATUS_RECEIVED, STATUS_PROCESSING, STATUS_COMPLETED];

  const normalizeStatus = (s) => {
    if (!s) return STATUS_RECEIVED;
    if (typeof s === 'string' && s.includes('\uFFFD')) return STATUS_RECEIVED; // 깨진 문자
    const map = { received: STATUS_RECEIVED, processing: STATUS_PROCESSING, completed: STATUS_COMPLETED };
    if (map[s]) return map[s];
    return ALLOWED_STATUS.includes(s) ? s : STATUS_RECEIVED;
  };

  if (useDb && mongoose) {
    const schema = new mongoose.Schema({
      studentId: { type: String, required: true },
      studentName: { type: String, required: true },
      room: { type: String, required: true },
      category: { type: String, required: true },
      urgency: { type: String, required: true },
      title: { type: String, required: true },
      description: { type: String, required: true },
      status: { type: String, default: STATUS_RECEIVED },
      createdAt: { type: Date, default: Date.now }
    }, { collection: 'maintenances', collation: { locale: 'ko', strength: 2 } });

    if (mongoose.models.Maintenance) {
      MaintenanceModel = mongoose.models.Maintenance;
      const path = MaintenanceModel.schema.path('status');
      if (path) path.default(STATUS_RECEIVED);
    } else {
      MaintenanceModel = mongoose.model("Maintenance", schema);
    }
  }

  router.use((req, res, next) => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); next(); });

  const sanitizeList = (list) => list.map(r => ({ ...r, status: normalizeStatus(r.status) }));

  // 신청
  router.post("/", async (req, res) => {
    const data = req.body;
    if (!data.studentId || !data.studentName || !data.room || !data.category || !data.urgency || !data.title || !data.description)
      return res.status(400).json({ ok:false, message: "필수 항목 누락" });
    try {
      if (useDb && MaintenanceModel) {
        const saved = await MaintenanceModel.create({ ...data, status: STATUS_RECEIVED }); // 명시적 기본값
        saved.status = normalizeStatus(saved.status);
        return res.json({ ok:true, data: saved });
      } else {
        const item = { ...data, id: Date.now().toString(), status: STATUS_RECEIVED, createdAt: new Date() };
        store.push(item); return res.json({ ok:true, data: item });
      }
    } catch (err) { console.error("? 민원 신청 오류:", err); return res.status(500).json({ ok:false, message: "등록 실패: "+err.message }); }
  });

  // 목록
  router.get("/", async (req, res) => {
    const { urgency, status } = req.query;
    try {
      if (useDb && MaintenanceModel) {
        let query = {}; if (urgency) query.urgency = urgency; if (status) query.status = normalizeStatus(status);
        let records = await MaintenanceModel.find(query).sort({ createdAt: -1 }).lean();
        records = sanitizeList(records); return res.json({ ok:true, data: records });
      } else {
        let filtered = store; if (urgency) filtered = filtered.filter(r=>r.urgency===urgency);
        if (status) filtered = filtered.filter(r=>normalizeStatus(r.status)===normalizeStatus(status));
        filtered = sanitizeList(filtered); return res.json({ ok:true, data: filtered });
      }
    } catch (err) { console.error("? 민원 조회 오류:", err); return res.status(500).json({ ok:false, message: "조회 실패" }); }
  });

  // 엑셀
  router.get('/export', async (_req, res) => {
    try {
      let list = useDb && MaintenanceModel ? await MaintenanceModel.find().sort({ createdAt: -1 }).lean() : [...store].sort((a,b)=> b.createdAt - a.createdAt);
      list = sanitizeList(list);
      const wb = new ExcelJS.Workbook();
      wb.creator = 'MosiraeDormitory';
      wb.created = new Date();
      const ws = wb.addWorksheet('\uBB38\uC6D0\uBAA9\uB85D'); // 민원목록
      ws.columns = [
        { header:'\uBC88\uD638', key:'no', width:6 },            // 번호
        { header:'\uD559\uBC88', key:'studentId', width:14 },    // 학번
        { header:'\uC774\uB984', key:'studentName', width:12 },  // 이름
        { header:'\uD638\uC2E4', key:'room', width:10 },         // 호실
        { header:'\uCE74\uD14C\uACE0\uB9AC', key:'category', width:12 }, // 카테고리
        { header:'\uAE30\uAE08\uB3C4', key:'urgency', width:10 }, // 긴급도
        { header:'\uC0C1\uD0DC', key:'status', width:10 },       // 상태
        { header:'\uC81C\uBAA9', key:'title', width:30 },       // 제목
        { header:'\uB0B4\uC6A9', key:'description', width:50 }, // 내용
        { header:'\uC2E0\uCCAD\uC77C\uC2DC', key:'createdAt', width:20 } // 신청일시
      ];
      list.forEach((r,i)=> ws.addRow({ no:i+1, studentId:r.studentId, studentName:r.studentName, room:r.room, category:r.category, urgency:r.urgency, status:normalizeStatus(r.status), title:r.title, description:r.description, createdAt:new Date(r.createdAt).toLocaleString('ko-KR') }));
      ws.getRow(1).font = { name:'Malgun Gothic', bold:true };
      ws.eachRow((row,idx)=>{ if (idx>1) row.font = { name:'Malgun Gothic' }; });
      const d=new Date(); const filename=`maintenance_${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}.xlsx`;
      const buffer = await wb.xlsx.writeBuffer();
      res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.setHeader('Content-Length', buffer.length);
      res.end(buffer);
    } catch(e){ console.error('? 엑셀 생성 실패:', e); return res.status(500).json({ ok:false, message:'엑셀 생성 실패: '+e.message }); }
  });

  // 학생 조회
  router.get("/:studentId", async (req, res) => {
    const { studentId } = req.params;
    try {
      let records = useDb && MaintenanceModel ? await MaintenanceModel.find({ studentId }).sort({ createdAt: -1 }).lean() : store.filter(r=>r.studentId===studentId);
      records = sanitizeList(records); return res.json(records);
    } catch (err) { console.error("? 학생 민원 조회 오류:", err); return res.status(500).json({ ok:false, message:"조회 실패" }); }
  });

  // 상태 변경
  router.patch("/:id/status", async (req, res) => {
    const { id } = req.params; let { status } = req.body; status = normalizeStatus(status);
    if (!status) return res.status(400).json({ ok:false, message:'상태값 필요' });
    try {
      if (useDb && MaintenanceModel) {
        const updated = await MaintenanceModel.findByIdAndUpdate(id,{ status },{ new:true }).lean();
        if (!updated) return res.status(404).json({ ok:false, message:'민원 없음' }); updated.status = normalizeStatus(updated.status);
        return res.json({ ok:true, data: updated });
      } else {
        const item = store.find(r=>r.id===id); if (!item) return res.status(404).json({ ok:false, message:'민원 없음' }); item.status = normalizeStatus(status); return res.json({ ok:true, data:item });
      }
    } catch(err){ console.error('? 상태 변경 오류:', err); return res.status(500).json({ ok:false, message:'상태 변경 실패' }); }
  });

  // 삭제
  router.delete("/:id", async (req, res) => {
    const { id } = req.params; try {
      if (useDb && MaintenanceModel) { const deleted = await MaintenanceModel.findByIdAndDelete(id); if (!deleted) return res.status(404).json({ ok:false, message:'민원 없음' }); return res.json({ ok:true, message:'삭제 완료' }); }
      else { const idx = store.findIndex(r=>r.id===id); if (idx===-1) return res.status(404).json({ ok:false, message:'민원 없음' }); store.splice(idx,1); return res.json({ ok:true, message:'삭제 완료' }); }
    } catch(err){ console.error('? 민원 삭제 오류:', err); return res.status(500).json({ ok:false, message:'삭제 실패' }); }
  });

  // 전체 정규화
  router.post('/_normalize-all', async (_req, res) => {
    try {
      if (useDb && MaintenanceModel) {
        const result = await MaintenanceModel.updateMany({ $or: [ { status: { $nin: ALLOWED_STATUS } }, { status: { $regex: /\uFFFD/ } } ] }, { $set: { status: STATUS_RECEIVED } });
        return res.json({ ok:true, message:'정규화 완료', modified: result.modifiedCount });
      } else {
        let modified=0; store = store.map(r=>{ const ns=normalizeStatus(r.status); if (ns!==r.status) modified++; return { ...r, status: ns }; });
        return res.json({ ok:true, message:'정규화 완료', modified });
      }
    } catch(e){ return res.status(500).json({ ok:false, message:'정규화 실패: '+e.message }); }
  });

  return router;
}
