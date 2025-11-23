document.addEventListener("DOMContentLoaded", () => {
  const studentIdInput = document.getElementById("student-id");
  const searchBtn = document.getElementById("search-btn");
  const rewardEl = document.getElementById("reward");
  const penaltyEl = document.getElementById("penalty");
  const totalEl = document.getElementById("total");
  const listDiv = document.getElementById("list");

  const safeText = (t) => {
    if (t == null) return "";
    // U+FFFD 포함 시 원문 추정 불가 → 그대로 반환
    return t;
  };
  const typeLabel = (type) =>
    type === "reward" ? "\uC0C1\uC810" : "\uBC8C\uC810"; // 상점/벌점
  const formatPoints = (type, pts) => (type === "reward" ? "+" : "-") + pts + "\uC810"; // +13점 / -2점

  // Enter 키로 조회
  studentIdInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      search();
    }
  });

  // 조회 버튼 클릭
  searchBtn.addEventListener("click", search);

  async function search() {
    const studentId = studentIdInput.value.trim();
    if (!studentId) {
      alert("\uD559\uBC88\uC744 \uC785\uB825\uD558\uC138\uC694.");
      return;
    }
    try {
      const res = await fetch(`/api/points/${studentId}`);
      const json = await res.json();
      listDiv.innerHTML = "";
      if (!json.ok) {
        listDiv.innerHTML =
          '<p class="text-center text-red-600 py-8">' +
          (json.message || "오류") +
          "</p>";
        (rewardEl.textContent = "0\uC810"),
          (penaltyEl.textContent = "0\uC810"),
          (totalEl.textContent = "0\uC810");
        return;
      }
      const { records, summary } = json.data;
      (rewardEl.textContent = summary.rewardTotal + "\uC810"),
        (penaltyEl.textContent = summary.penaltyTotal + "\uC810"),
        (totalEl.textContent = summary.totalScore + "\uC810");
      if (records.length === 0) {
        listDiv.innerHTML =
          '<p class="text-center text-gray-500 py-8">\uC0C1\uBC8C\uC810 \uB0B4\uC5ED\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>';
        return;
      }
      records.forEach((r) => {
        const div = document.createElement("div");
        div.className = "flex items-center justify-between p-4 bg-gray-50 rounded-lg";
        const left = document.createElement("div");
        left.className = "flex items-center gap-3";
        const badge = document.createElement("span");
        badge.className =
          "px-2 py-1 text-sm rounded " +
          (r.type === "reward"
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800");
        badge.textContent = typeLabel(r.type);
        const dateSpan = document.createElement("span");
        dateSpan.className = "text-sm text-gray-500";
        dateSpan.textContent = safeText(r.date);
        left.append(badge, dateSpan);
        const right = document.createElement("div");
        right.className = "flex items-center gap-4";
        const reasonSpan = document.createElement("span");
        reasonSpan.className = "text-sm";
        reasonSpan.textContent = safeText(r.reason);
        const pointSpan = document.createElement("span");
        pointSpan.className =
          "font-semibold " +
          (r.type === "reward" ? "text-green-600" : "text-red-600");
        pointSpan.textContent = formatPoints(r.type, r.points);
        right.append(reasonSpan, pointSpan);
        div.append(left, right);
        listDiv.appendChild(div);
      });
    } catch (e) {
      alert("\uC870\uD68C \uC2E4\uD328: " + e.message);
    }
  }
});
