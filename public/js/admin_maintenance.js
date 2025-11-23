document.addEventListener("DOMContentLoaded", () => {
  const urgencySelect = document.getElementById("filter-urgency");
  const statusSelect = document.getElementById("filter-status");
  const searchBtn = document.getElementById("search-btn");
  const listDiv = document.getElementById("list");
  let exportBtn = document.getElementById('export-btn');

  // 한글 상수 (Unicode escape)
  const TXT_RECEIVED = '\uC811\uC218'; // 접수
  const TXT_PROCESSING = '\uCC98\uB9AC\uC911'; // 처리중
  const TXT_COMPLETED = '\uC870\uCE58\uC644\uB8CC'; // 조치완료
  const TXT_EMERGENCY = '\uAE30\uAE08'; // 긴급
  const TXT_NORMAL = '\uBCF4\uD1B5'; // 보통
  const TXT_LOW = '\uB0AE\uC74C'; // 낮음
  const TXT_DELETE = '\uC0AD\uC81C'; // 삭제
  const TXT_EXCEL = '\uC5D1\uC140 \uB2E4\uC6B4\uB85C\uB4DC';
  const TXT_EMPTY = '\uBB38\uC6D0\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.'; // 민원이 없습니다.
  const TXT_FAIL_LOAD = '\uC870\uD68C \uC2E4\uD328';
  const TXT_STATUS_CHANGE_DONE = '\uC0C1\uD0DC \uBCC0\uACBD \uC644\uB8CC';
  const TXT_STATUS_CHANGE_FAIL = '\uBCC0\uACBD \uC2E4\uD328';
  const TXT_DELETE_DONE = '\uC0AD\uC81C \uC644\uB8CC';
  const TXT_DELETE_FAIL = '\uC0AD\uC81C \uC2E4\uD328';
  const TXT_CONFIRM_DELETE = '\uC815\uB9D0 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?';
  const TXT_CONFIRM_STATUS_PREFIX = '\uC0C1\uD0DC\uB97C \''; // 상태를 '
  const TXT_CONFIRM_STATUS_SUFFIX = '\'\uB85C \uBCC0\uACBD\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?';

  // 깨진 문자열(normalization)
  const normalize = (txt) => {
    if (!txt) return txt;
    const map = {
      [TXT_RECEIVED]: TXT_RECEIVED, [TXT_PROCESSING]: TXT_PROCESSING, [TXT_COMPLETED]: TXT_COMPLETED,
      [TXT_EMERGENCY]: TXT_EMERGENCY, [TXT_NORMAL]: TXT_NORMAL, [TXT_LOW]: TXT_LOW,
      '\uCC98\uB9AC\uC911': TXT_PROCESSING, '\uC870\uCE58\uC644\uB8CC': TXT_COMPLETED, '\uC811\uC218': TXT_RECEIVED,
      '\uAE30\uAE08': TXT_EMERGENCY, '\uBCF4\uD1B5': TXT_NORMAL, '\uB0AE\uC74C': TXT_LOW
    };
    // 깨진 글자(?) 포함 시 기본 접수 처리
    if (txt.includes('\uFFFD')) return TXT_RECEIVED;
    return map[txt] || txt;
  };

  // 페이지 로드시 자동 조회
  loadList();

  // 검색 버튼 클릭
  searchBtn.addEventListener("click", () => {
    loadList();
  });

  // 엑셀 다운로드 버튼 동적 추가(없을 경우)
  if (!exportBtn) {
    exportBtn = document.createElement('button');
    exportBtn.id = 'export-btn';
    exportBtn.className = 'ml-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-500';
    exportBtn.textContent = TXT_EXCEL;
    searchBtn.parentElement.appendChild(exportBtn);
  }

  exportBtn.addEventListener('click', () => {
    window.location.href = '/api/maintenance/export';
  });

  // -------------------------------
  // 민원 목록 불러오기
  // -------------------------------
  async function loadList() {
    const urgency = urgencySelect.value;
    const status = statusSelect.value;
    const params = new URLSearchParams();
    if (urgency) params.append('urgency', urgency);
    if (status) params.append('status', status);

    try {
      const res = await fetch(`/api/maintenance?${params}`);
      const payload = await res.json();
      listDiv.innerHTML = '';

      if (!res.ok || !payload.ok) {
        const p=document.createElement('p'); p.className='text-center text-red-500 py-8'; p.textContent=TXT_FAIL_LOAD; listDiv.appendChild(p); return;
      }
      const records = payload.data;
      if (!Array.isArray(records) || records.length === 0) {
        const p=document.createElement('p'); p.className='text-center text-gray-500 py-8'; p.textContent=TXT_EMPTY; listDiv.appendChild(p); return;
      }

      records.forEach(r => {
        const div = document.createElement('div'); div.className='border rounded p-4';
        const mainContainer = document.createElement('div'); mainContainer.className='flex justify-between';
        const leftContent = document.createElement('div'); leftContent.className='flex-1';
        const badgeContainer = document.createElement('div'); badgeContainer.className='flex items-center gap-2 mb-2';
        const statusBadge = document.createElement('span'); statusBadge.className='px-2 py-1 text-xs rounded';
        const s = normalize(r.status); statusBadge.textContent = s; statusBadge.className += s===TXT_COMPLETED?' bg-green-100 text-green-800':(s===TXT_PROCESSING?' bg-yellow-100 text-yellow-800':' bg-gray-100 text-gray-800');
        const urgencyBadge = document.createElement('span'); urgencyBadge.className='px-2 py-1 text-xs rounded';
        const u = normalize(r.urgency); urgencyBadge.textContent=u; urgencyBadge.className += u===TXT_EMERGENCY?' bg-red-100 text-red-800':(u===TXT_NORMAL?' bg-blue-100 text-blue-800':' bg-gray-100 text-gray-800');
        const categorySpan = document.createElement('span'); categorySpan.className='text-sm text-gray-500'; categorySpan.textContent = r.category;
        const studentInfoSpan = document.createElement('span'); studentInfoSpan.className='text-sm text-gray-600'; studentInfoSpan.textContent = r.room + ' - ' + r.studentName + '(' + r.studentId + ')';
        badgeContainer.append(statusBadge, urgencyBadge, categorySpan, studentInfoSpan);
        const titleH4 = document.createElement('h4'); titleH4.className='font-semibold text-lg'; titleH4.textContent=r.title;
        const descP = document.createElement('p'); descP.className='text-sm text-gray-600 mt-1'; descP.textContent=r.description;
        const dateP = document.createElement('p'); dateP.className='text-xs text-gray-400 mt-2'; dateP.textContent=new Date(r.createdAt).toLocaleString('ko-KR');
        leftContent.append(badgeContainer, titleH4, descP, dateP);
        const buttonContainer = document.createElement('div'); buttonContainer.className='flex flex-col gap-2 ml-4';
        if (s !== TXT_COMPLETED) {
          const processingBtn = document.createElement('button'); processingBtn.className='px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600'; processingBtn.textContent=TXT_PROCESSING; processingBtn.addEventListener('click', () => updateStatus(r._id || r.id, TXT_PROCESSING));
          const completeBtn = document.createElement('button'); completeBtn.className='px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600'; completeBtn.textContent=TXT_COMPLETED; completeBtn.addEventListener('click', () => updateStatus(r._id || r.id, TXT_COMPLETED));
          buttonContainer.append(processingBtn, completeBtn);
        }
        const deleteBtn = document.createElement('button'); deleteBtn.className='px-3 py-1 text-sm border border-red-600 text-red-600 rounded hover:bg-red-50'; deleteBtn.textContent=TXT_DELETE; deleteBtn.addEventListener('click', () => deleteMaintenance(r._id || r.id));
        buttonContainer.appendChild(deleteBtn);
        mainContainer.append(leftContent, buttonContainer); div.append(mainContainer); listDiv.append(div);
      });
    } catch (err) { alert(TXT_FAIL_LOAD+': '+err.message); }
  }

  async function updateStatus(id, status) {
    if (!confirm(TXT_CONFIRM_STATUS_PREFIX + status + TXT_CONFIRM_STATUS_SUFFIX)) return;
    try {
      const res = await fetch(`/api/maintenance/${id}/status`, { method:'PATCH', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ status }) });
      const result = await res.json();
      if (res.ok && result.ok) { alert(TXT_STATUS_CHANGE_DONE); loadList(); } else { alert(TXT_STATUS_CHANGE_FAIL+': '+(result.message||'\uC624\uB958')); }
    } catch (err) { alert('\uC11C\uBC84 \uC624\uB958: '+err.message); }
  }

  async function deleteMaintenance(id) {
    if (!confirm(TXT_CONFIRM_DELETE)) return;
    try {
      const res = await fetch(`/api/maintenance/${id}`, { method:'DELETE' });
      const result = await res.json();
      if (res.ok && result.ok) { alert(TXT_DELETE_DONE); loadList(); } else { alert(TXT_DELETE_FAIL+': '+(result.message||'\uC624\uB958')); }
    } catch (err) { alert('\uC11C\uBC84 \uC624\uB958: '+err.message); }
  }
});
