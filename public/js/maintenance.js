document.addEventListener("DOMContentLoaded", () => {
  const studentIdInput = document.getElementById("student-id");
  const studentNameInput = document.getElementById("student-name");
  const roomInput = document.getElementById("room");
  const categoryInput = document.getElementById("category");
  const urgencyInput = document.getElementById("urgency");
  const titleInput = document.getElementById("title");
  const descriptionInput = document.getElementById("description");
  const submitBtn = document.querySelector("button.bg-blue-600");
  const resetBtn = document.querySelector("button.border");
  const searchBtn = document.getElementById("search-btn");
  const searchIdInput = document.getElementById("search-id");
  const listDiv = document.getElementById("list");

  submitBtn.addEventListener("click", async () => {
    const data = {
      studentId: studentIdInput.value.trim(),
      studentName: studentNameInput.value.trim(),
      room: roomInput.value.trim(),
      category: categoryInput.value,
      urgency: urgencyInput.value,
      title: titleInput.value.trim(),
      description: descriptionInput.value.trim(),
    };
    if (!data.studentId || !data.studentName || !data.room || !data.category || !data.urgency || !data.title || !data.description) {
      alert("\uD544\uC218 \uD56D\uBAA9\uC744 \uBAA8\uB450 \uC785\uB825\uD558\uC138\uC694.");
      return;
    }
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (res.ok && result.ok) {
        alert("\uBBFC\uC6D0/\uC218\uB9AC \uC2E0\uCCAD\uC774 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
        studentIdInput.value = "";
        studentNameInput.value = "";
        roomInput.value = "";
        categoryInput.value = "";
        urgencyInput.value = "";
        titleInput.value = "";
        descriptionInput.value = "";
      } else {
        alert("\uC2E0\uCCAD \uC2E4\uD328: " + (result.message || "\uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4."));
      }
    } catch (err) {
      alert("\uC11C\uBC84 \uC624\uB958: " + err.message);
    }
  });

  resetBtn.addEventListener("click", () => {
    studentIdInput.value = "";
    studentNameInput.value = "";
    roomInput.value = "";
    categoryInput.value = "";
    urgencyInput.value = "";
    titleInput.value = "";
    descriptionInput.value = "";
  });

  searchBtn.addEventListener("click", async () => {
    const studentId = searchIdInput.value.trim();
    if (!studentId) {
      alert("\uD559\uBC88\uC744 \uC785\uB825\uD558\uC138\uC694.");
      return;
    }
    try {
      const res = await fetch(`/api/maintenance/${studentId}`);
      const result = await res.json();
      listDiv.innerHTML = "";
      const records = result.data || [];
      if (!res.ok || !result.ok || records.length === 0) {
        const p = document.createElement("p");
        p.className = "text-center text-gray-500 py-4";
        p.textContent = "\uBBFC\uC6D0 \uB0B4\uC5ED\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.";
        listDiv.appendChild(p);
        return;
      }
      records.forEach(r => {
        const div = document.createElement("div");
        div.className = "border rounded p-4";
        const badgeContainer = document.createElement("div");
        badgeContainer.className = "flex items-center gap-2 mb-2";
        const statusBadge = document.createElement("span");
        statusBadge.className = "px-2 py-1 text-xs rounded";
        statusBadge.textContent = r.status;
        if (r.status === "\uCC98\uB9AC\uC644\uB8CC") {
          statusBadge.className += " bg-green-100 text-green-800";
        } else if (r.status === "\uCC98\uB9AC\uC911") {
          statusBadge.className += " bg-yellow-100 text-yellow-800";
        } else {
          statusBadge.className += " bg-gray-100 text-gray-800";
        }
        const urgencyBadge = document.createElement("span");
        urgencyBadge.className = "px-2 py-1 text-xs rounded";
        urgencyBadge.textContent = r.urgency;
        if (r.urgency === "\uAE34\uAE09") {
          urgencyBadge.className += " bg-red-100 text-red-800";
        } else if (r.urgency === "\uBCF4\uD1B5") {
          urgencyBadge.className += " bg-blue-100 text-blue-800";
        } else {
          urgencyBadge.className += " bg-gray-100 text-gray-800";
        }
        const categorySpan = document.createElement("span");
        categorySpan.className = "text-sm text-gray-500";
        categorySpan.textContent = r.category;
        badgeContainer.appendChild(statusBadge);
        badgeContainer.appendChild(urgencyBadge);
        badgeContainer.appendChild(categorySpan);
        const titleH4 = document.createElement("h4");
        titleH4.className = "font-semibold";
        titleH4.textContent = r.title;
        const descP = document.createElement("p");
        descP.className = "text-sm text-gray-600 mt-1";
        descP.textContent = r.description;
        const dateP = document.createElement("p");
        dateP.className = "text-xs text-gray-400 mt-2";
        dateP.textContent = new Date(r.createdAt).toLocaleString("ko-KR");
        div.appendChild(badgeContainer);
        div.appendChild(titleH4);
        div.appendChild(descP);
        div.appendChild(dateP);
        listDiv.appendChild(div);
      });
    } catch (err) {
      alert("\uC870\uD68C \uC624\uB958: " + err.message);
    }
  });
});
