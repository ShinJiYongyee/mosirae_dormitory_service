document.addEventListener("DOMContentLoaded", () => {
  const submitBtn = document.querySelector("button.bg-blue-600");
  const resetBtn = document.querySelector("button.border");

  submitBtn.addEventListener("click", async () => {
    const studentId = document.getElementById("student-id").value.trim();
    const name = document.getElementById("name").value.trim();
    const department = document.getElementById("department").value.trim();
    const grade = document.getElementById("grade").value;
    const phone = document.getElementById("phone").value.trim();
    const email = document.getElementById("email").value.trim();
    const roomType = document.getElementById("room-type").value;
    const specialNeeds = document.getElementById("special-needs").value.trim();

    // 필수 항목 검증
    if (!studentId || !name || !department || !grade || !phone || !email || !roomType) {
      alert("필수 입력 항목이 모두 입력되어야 합니다.");
      return;
    }

    const payload = {
      studentId,
      name,
      department,
      grade,
      phone,
      email,
      roomType,
      specialNeeds
    };

    try {
      const response = await fetch("/api/application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        alert("신청 실패: " + result.message);
        return;
      }

      // 성공 메시지 + 홈 이동
      alert("관생 신청이 완료되었습니다!");
      window.location.href = "/";

    } catch (error) {
      console.error(error);
      alert("서버 오류가 발생했습니다.");
    }
  });

  // 초기화 버튼
  resetBtn.addEventListener("click", () => {
    document.querySelectorAll("input, select, textarea").forEach(el => el.value = "");
  });
});
