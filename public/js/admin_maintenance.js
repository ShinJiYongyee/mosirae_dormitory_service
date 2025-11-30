document.addEventListener("DOMContentLoaded", () => {
  const urgencySelect = document.getElementById("filter-urgency");
  const statusSelect = document.getElementById("filter-status");
  const searchBtn = document.getElementById("search-btn");
  const exportBtn = document.getElementById("export-btn");
  const listDiv = document.getElementById("list");


  // 초기 로드
  loadList();
  searchBtn.addEventListener("click", () => loadList());
  exportBtn.addEventListener("click", () => doExport());

  async function loadList() {
    const urgency = urgencySelect.value;
    const status = statusSelect.value;
    const params = new URLSearchParams();
    if (urgency) params.append("urgency", urgency);
    if (status) params.append("status", status);
    try {
      const res = await fetch(`/api/maintenance?${params}`);
      const result = await res.json();
      listDiv.innerHTML = "";
      const records = result.data || [];
      
      if (!res.ok || !result.ok || records.length === 0) {
        const p = document.createElement('p');
        p.className='text-center text-gray-500 py-8';
        p.textContent='\uBBFC\uC6D0\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.'; 
        listDiv.appendChild(p); 
        return; 
      }
      records.forEach(r => {
        const div = document.createElement("div");
        div.className = "border rounded p-4";
        const mainContainer = document.createElement("div");
        mainContainer.className = "flex justify-between";
        const leftContent = document.createElement("div");
        leftContent.className = "flex-1";
        const badgeContainer = document.createElement("div");
        badgeContainer.className = "flex items-center gap-2 mb-2";
        const statusBadge = document.createElement("span");
        statusBadge.className = "px-2 py-1 text-xs rounded";
        const s = r.status;
        statusBadge.textContent = s;
        statusBadge.className += s==='\uCC98\uB9AC\uC644\uB8CC' ? ' bg-green-100 text-green-800' : (s==='\uCC98\uB9AC\uC911' ? ' bg-yellow-100 text-yellow-800' : ' bg-gray-100 text-gray-800');
        const urgencyBadge = document.createElement("span");
        urgencyBadge.className = "px-2 py-1 text-xs rounded";
        const u = r.urgency;
        urgencyBadge.textContent = u;
        urgencyBadge.className += u==='\uAE34\uAE09' ? ' bg-red-100 text-red-800' : (u==='\uBCF4\uD1B5' ? ' bg-blue-100 text-blue-800' : ' bg-gray-100 text-gray-800');
        const categorySpan = document.createElement("span");
        categorySpan.className = "text-sm text-gray-500";
        categorySpan.textContent = r.category;
        const studentInfoSpan = document.createElement("span");
        studentInfoSpan.className = "text-sm text-gray-600";
        studentInfoSpan.textContent = `${r.room} - ${r.studentName}(${r.studentId})`;
        badgeContainer.append(statusBadge, urgencyBadge, categorySpan, studentInfoSpan);
        const titleH4 = document.createElement("h4");
        titleH4.className = "font-semibold text-lg";
        titleH4.textContent = r.title;
        const descP = document.createElement("p");
        descP.className = "text-sm text-gray-600 mt-1";
        descP.textContent = r.description;
        const dateP = document.createElement("p");
        dateP.className = "text-xs text-gray-400 mt-2";
        dateP.textContent = new Date(r.createdAt).toLocaleString("ko-KR");
        leftContent.append(badgeContainer, titleH4, descP, dateP);
        const buttonContainer = document.createElement("div");
        buttonContainer.className = "flex flex-col gap-2 ml-4";
        if (s !== '\uCC98\uB9AC\uC644\uB8CC') {
          const processingBtn = document.createElement("button");
          processingBtn.className = "px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600";
          processingBtn.textContent = "\uCC98\uB9AC\uC911";
          processingBtn.addEventListener("click", () => updateStatus(r._id || r.id, "\uCC98\uB9AC\uC911"));
          const completeBtn = document.createElement("button");
          completeBtn.className = "px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600";
          completeBtn.textContent = "\uCC98\uB9AC\uC644\uB8CC";
          completeBtn.addEventListener("click", () => updateStatus(r._id || r.id, "\uCC98\uB9AC\uC644\uB8CC"));
          buttonContainer.append(processingBtn, completeBtn);
        }
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "px-3 py-1 text-sm border border-red-600 text-red-600 rounded hover:bg-red-50";
        deleteBtn.textContent = "\uC0AD\uC81C";
        deleteBtn.addEventListener("click", () => deleteMaintenance(r._id || r.id));
        buttonContainer.appendChild(deleteBtn);
        mainContainer.append(leftContent, buttonContainer);
        div.append(mainContainer);
        listDiv.append(div);
      });
    } catch (err) {
      alert("\uC870\uD68C \uC2E4\uD328: " + err.message);
    }
  }

  function doExport() {
    const urgency = urgencySelect.value;
    const status = statusSelect.value;
    const params = new URLSearchParams();
    if (urgency) params.append("urgency", urgency);
    if (status) params.append("status", status);
    const url = `/api/maintenance/export?${params}`;
    // 임시 a 태그로 다운로드
    const a = document.createElement('a');
    a.href = url;
    a.download = 'maintenance.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function updateStatus(id, status) {
    if (!confirm(`\uC0C1\uD0DC\uB97C '${status}'\uB85C \uBCC0\uACBD\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?`)) return;
    try {
      const res = await fetch(`/api/maintenance/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const result = await res.json();
      if (res.ok && result.ok) {
        alert("\uC0C1\uD0DC \uBCC0\uACBD \uC644\uB8CC");
        loadList();
      } else {
        alert("\uC0C1\uD0DC \uBCC0\uACBD \uC2E4\uD328: " + (result.message || "\uC624\uB958"));
      }
    } catch (err) {
      alert("\uC0C1\uD0DC \uBCC0\uACBD \uC624\uB958: " + err.message);
    }
  }

  async function deleteMaintenance(id) {
    if (!confirm("\uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?")) return;
    try {
      const res = await fetch(`/api/maintenance/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (res.ok && result.ok) {
        alert("\uC0AD\uC81C \uC644\uB8CC");
        loadList();
      } else {
        alert("\uC0AD\uC81C \uC2E4\uD328: " + (result.message || "\uC624\uB958"));
      }
    } catch (err) {
      alert("\uC0AD\uC81C \uC624\uB958: " + err.message);
    }
  }
});
