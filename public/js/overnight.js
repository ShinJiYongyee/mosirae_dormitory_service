document.addEventListener("DOMContentLoaded", () => {
  const studentIdInput = document.getElementById("student-id");
  const nameInput = document.getElementById("name");
  const roomInput = document.getElementById("room");
  const startDateInput = document.getElementById("start-date");
  const endDateInput = document.getElementById("end-date");
  const destinationInput = document.getElementById("destination");
  const contactInput = document.getElementById("contact");
  const reasonInput = document.getElementById("reason");

  const submitBtn = document.querySelector("button.bg-blue-600");
  const resetBtn = document.querySelector("button.border");

  // ============================
  // 1) 신청하기 기능
  // ============================
  submitBtn.addEventListener("click", async () => {
    const data = {
      studentId: studentIdInput.value.trim(),
      name: nameInput.value.trim(),
      room: roomInput.value.trim(),
      startDate: startDateInput.value,
      endDate: endDateInput.value,
      destination: destinationInput.value.trim(),
      contact: contactInput.value.trim(),
      reason: reasonInput.value.trim(),
    };

    // 필수 항목 검사
    if (!data.studentId || !data.name || !data.room || !data.startDate || !data.endDate) {
      alert("학번, 이름, 호실, 외박 시작일, 종료일은 필수 입력 사항입니다.");
      return;
    }

    try {
      const res = await fetch("/api/overnight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const contentType = res.headers.get("content-type") || "";
      let payload;

      // JSON 응답인지 검사
      if (contentType.includes("application/json")) {
        payload = await res.json();
      } else {
        const text = await res.text();
        console.error("서버가 JSON 대신 HTML을 반환함:", text);
        alert("서버 오류가 발생했습니다. 관리자에게 문의하세요.");
        return;
      }

      if (res.ok) {
        alert("외박 신청이 완료되었습니다!");
        window.location.href = "/"; // 홈으로 이동
      } else {
        alert("신청 실패: " + (payload.message || "오류 발생"));
      }
    } catch (err) {
      console.error(err);
      alert("서버 통신 오류: " + err.message);
    }
  });

  // ============================
  // 2) 초기화 기능
  // ============================
  resetBtn.addEventListener("click", () => {
    studentIdInput.value = "";
    nameInput.value = "";
    roomInput.value = "";
    startDateInput.value = "";
    endDateInput.value = "";
    destinationInput.value = "";
    contactInput.value = "";
    reasonInput.value = "";
  });
});
