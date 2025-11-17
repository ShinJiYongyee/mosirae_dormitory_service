document.addEventListener("DOMContentLoaded", () => {
  const studentIdInput = document.getElementById("student-id");
    const nameInput = document.getElementById("name");
    const roomInput = document.getElementById("room");
    const typeInput = document.getElementById("type");
    const dateInput = document.getElementById("date");
    const reasonInput = document.getElementById("reason");

    const submitBtn = document.querySelector("button.bg-blue-600");
    const resetBtn = document.querySelector("button.border");

  // -------------------------------
  // 1) 신청하기 버튼 클릭
  // -------------------------------
  submitBtn.addEventListener("click", async () => {
    const data = {
        studentId: studentIdInput.value.trim(),
    name: nameInput.value.trim(),
    room: roomInput.value.trim(),
    type: typeInput.value,
    date: dateInput.value,
    reason: reasonInput.value.trim(),
    };

    // 필수값 체크
    if (!data.studentId || !data.name || !data.room || !data.type || !data.date) {
        alert("모든 필수 정보를 입력하세요.");
    return;
    }

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
    headers: {
        "Content-Type": "application/json",
        },
    body: JSON.stringify(data),
      });

    const result = await res.json();

    if (res.ok) {
        alert("신청이 완료되었습니다!");
    window.location.href = "/"; // 홈으로 이동
      } else {
        alert("신청 실패: " + (result.message || "오류가 발생했습니다."));
      }
    } catch (err) {
        alert("서버 오류: " + err.message);
    }
  });

  // -------------------------------
  // 2) 초기화 버튼 클릭
  // -------------------------------
  resetBtn.addEventListener("click", () => {
        studentIdInput.value = "";
    nameInput.value = "";
    roomInput.value = "";
    typeInput.value = "";
    dateInput.value = "";
    reasonInput.value = "";
  });
});
