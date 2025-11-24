document.addEventListener("DOMContentLoaded", () => {
  const urgencySelect = document.getElementById("filter-urgency");
  const statusSelect = document.getElementById("filter-status");
  const searchBtn = document.getElementById("search-btn");
  const listDiv = document.getElementById("list");

  const normalize = (txt) => {
    if (!txt) return txt;
    const map = {
      '접수':'접수','처리중':'처리중','조치완료':'조치완료',
      '긴급':'긴급','보통':'보통','낮음':'낮음',
      // 깨진 패턴 대체
      '\uCC98\uB9AC\uC911':'처리중','\uC870\uCE58\uC644\uB8CC':'조치완료','\uC811\uC218':'접수',
      '\uAE30\uAE08':'긴급','\uBCF4\uD1B5':'보통','\uB0AE\uC74C':'낮음'
    };
    return map[txt] || txt;
  };

  // 페이지 로드시 자동 조회
  loadList();

  // 검색 버튼 클릭
  searchBtn.addEventListener("click", () => {
    loadList();
  });

  // -------------------------------
  // 민원 목록 불러오기
  // -------------------------------
  async function loadList() {
    const urgency = urgencySelect.value;
    const status = statusSelect.value;
    const params = new URLSearchParams();
    
    if (urgency) params.append("urgency", urgency);
    if (status) params.append("status", status);

    try {
      const res = await fetch(`/api/maintenance?${params}`);
      const records = await res.json();

      listDiv.innerHTML = "";

      if (!Array.isArray(records) || records.length === 0) {
        const p=document.createElement('p'); p.className='text-center text-gray-500 py-8'; p.textContent='민원이 없습니다.'; listDiv.appendChild(p); return; }

      records.forEach(r => {
        const div = document.createElement("div");
        div.className = "border rounded p-4";

        // 메인 컨테이너
        const mainContainer = document.createElement("div");
        mainContainer.className = "flex justify-between";

        // 왼쪽 컨텐츠
        const leftContent = document.createElement("div");
        leftContent.className = "flex-1";

        // 배지 컨테이너
        const badgeContainer = document.createElement("div");
        badgeContainer.className = "flex items-center gap-2 mb-2";

        // 상태 배지
        const statusBadge = document.createElement("span");
        statusBadge.className = "px-2 py-1 text-xs rounded";
        const s=normalize(r.status); 
        statusBadge.textContent=s; 
        statusBadge.className+= s==='조치완료'?' bg-green-100 text-green-800':(s==='처리중'?' bg-yellow-100 text-yellow-800':' bg-gray-100 text-gray-800');

        // 긴급도 배지
        const urgencyBadge = document.createElement("span");
        urgencyBadge.className = "px-2 py-1 text-xs rounded";
        const u=normalize(r.urgency); 
        urgencyBadge.textContent=u; 
        urgencyBadge.className+= u==='긴급'?' bg-red-100 text-red-800':(u==='보통'?' bg-blue-100 text-blue-800':' bg-gray-100 text-gray-800');

        // 카테고리
        const categorySpan = document.createElement("span");
        categorySpan.className = "text-sm text-gray-500";
        categorySpan.textContent = r.category;

        // 학생 정보
        const studentInfoSpan = document.createElement("span");
        studentInfoSpan.className = "text-sm text-gray-600";
        studentInfoSpan.textContent = r.room + " - " + r.studentName + "(" + r.studentId + ")";

        badgeContainer.append(statusBadge, urgencyBadge, categorySpan, studentInfoSpan);

        // 제목
        const titleH4 = document.createElement("h4");
        titleH4.className = "font-semibold text-lg";
        titleH4.textContent = r.title;

        // 설명
        const descP = document.createElement("p");
        descP.className = "text-sm text-gray-600 mt-1";
        descP.textContent = r.description;

        // 날짜
        const dateP = document.createElement("p");
        dateP.className = "text-xs text-gray-400 mt-2";
        dateP.textContent = new Date(r.createdAt).toLocaleString("ko-KR");

        leftContent.append(badgeContainer, titleH4, descP, dateP);

        // 오른쪽 버튼들
        const buttonContainer = document.createElement("div");
        buttonContainer.className = "flex flex-col gap-2 ml-4";

        if (s !== '조치완료') {
          // 처리중 버튼
          const processingBtn = document.createElement("button");
          processingBtn.className = "px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600";
          processingBtn.textContent = "\uCC98\uB9AC\uC911";
          processingBtn.addEventListener("click", () => updateStatus(r._id || r.id, "\uCC98\uB9AC\uC911"));

          // 조치완료 버튼
          const completeBtn = document.createElement("button");
          completeBtn.className = "px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600";
          completeBtn.textContent = "\uC870\uCE58\uC644\uB8CC";
          completeBtn.addEventListener("click", () => updateStatus(r._id || r.id, "\uC870\uCE58\uC644\uB8CC"));

          buttonContainer.append(processingBtn, completeBtn);
        }

        // 삭제 버튼
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
      alert("\u870C\uD68C \uC2E4\uD328: " + err.message);
    }
  }

  // -------------------------------
  // 상태 변경
  // -------------------------------
  async function updateStatus(id, status) {
    if (!confirm("상태를 '" + status + "'로 변경하시겠습니까?")) return;

    try {
      const res = await fetch(`/api/maintenance/${id}/status`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ status })
      });

      const result = await res.json();

      if (res.ok) {
        alert("\uC0C1\uD0DC \uBCC0\uACBD \uC644\uB8CC");
        loadList();
      } else {
        alert("\uBCC0\uACBD \uC2E4\uD328: " + (result.message || "\uC624\uB958"));
      }
    } catch (err) {
      alert("\uC11C\uBC84 \uC624\uB958: " + err.message);
    }
  }

  // -------------------------------
  // 삭제
  // -------------------------------
  async function deleteMaintenance(id) {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      const res = await fetch(`/api/maintenance/${id}`, { 
        method: "DELETE" 
      });

      const result = await res.json();

      if (res.ok) {
        alert("\uC0AD\uC81C \uC644\uB8CC");
        loadList();
      } else {
        alert("\uC0AD\uC81C \uC2E4\uD328: " + (result.message || "\uC624\uB958"));
      }
    } catch (err) {
      alert("\uC11C\uBC84 \uC624\uB958: " + err.message);
    }
  }
});
