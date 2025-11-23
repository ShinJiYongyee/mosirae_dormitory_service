document.addEventListener("DOMContentLoaded", () => {
  const studentIdInput = document.getElementById("studentId");
  const studentNameInput = document.getElementById("studentName");
  const typeSelect = document.getElementById("type");
  const pointsInput = document.getElementById("points");
  const dateInput = document.getElementById("date");
  const reasonInput = document.getElementById("reason");
  const addForm = document.getElementById("addForm");
  const loadBtn = document.getElementById("loadBtn");
  const tbody = document.getElementById("tbody");

  dateInput.valueAsDate = new Date();

  const mapTypeToKorean = (t) => t === 'reward' ? '\uC0C1\uC810' : '\uBC8C\uC810'; // 상점 / 벌점
  const safeText = (txt) => {
    if (!txt) return txt;
    if (/\uFFFD/.test(txt)) { // 깨짐 포함
      // 시도: 타입/고정 문자열 매핑
      if (txt.length <= 4) return '\uC0AD\uC81C'; // 삭제 버튼이 깨진 경우
    }
    return txt;
  };

  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
      studentId: studentIdInput.value.trim(),
      studentName: studentNameInput.value.trim(),
      type: typeSelect.value,
      points: Number(pointsInput.value),
      date: dateInput.value,
      reason: reasonInput.value.trim()
    };
    if (!data.studentId || !data.studentName || !data.type || !data.points || !data.reason || !data.date) {
      alert('\uD544\uC218 \uD56D\uBAA9 \uC785\uB825');
      return;
    }
    try {
      const res = await fetch('/api/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (json.ok) {
        alert('\uCD94\uAC00 \uC644\uB8CC');
        addForm.reset();
        dateInput.valueAsDate = new Date();
        loadAll();
      } else {
        alert('\uC2E4\uD328: ' + json.message);
      }
    } catch (err) {
      alert('\uC11C\uBC84 \uC624\uB958: ' + err.message);
    }
  });

  loadBtn.addEventListener('click', loadAll);

  async function loadAll() {
    try {
      const res = await fetch('/api/points');
      const json = await res.json();
      tbody.innerHTML = '';
      const list = json.ok ? json.data : (Array.isArray(json) ? json : []);
      if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-gray-500">\uB0B4\uC5ED \uC5C6\uC74C</td></tr>';
        return;
      }
      list.forEach(r => {
        const tr = document.createElement('tr');
        tr.className = 'border-b';
        const typeLabel = mapTypeToKorean(r.type);
        tr.innerHTML = `
          <td class="px-3 py-2">${safeText(r.date)}</td>
          <td class="px-3 py-2">${safeText(r.studentId)}</td>
          <td class="px-3 py-2">${safeText(r.studentName)}</td>
          <td class="px-3 py-2">${typeLabel}</td>
          <td class="px-3 py-2">${safeText(r.points)}</td>
          <td class="px-3 py-2">${safeText(r.reason)}</td>
          <td class="px-3 py-2"><button data-id="${r._id || r.id}" class="del-btn text-red-600 border px-2 py-1 rounded">\uC0AD\uC81C</button></td>`;
        tbody.appendChild(tr);
      });
      tbody.querySelectorAll('.del-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('\uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?')) return;
          const id = btn.dataset.id;
          const res = await fetch(`/api/points/${id}`, { method: 'DELETE' });
          const j = await res.json();
          if (j.ok) {
            alert('\uC0AD\uC81C \uC644\uB8CC');
            loadAll();
          } else {
            alert('\uC0AD\uC81C \uC2E4\uD328: ' + (j.message || 'Error'));
          }
        });
      });
    } catch (e) {
      alert('\uC870\uD68C \uC2E4\uD328: ' + e.message);
    }
  }
});
