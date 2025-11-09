// 모든 페이지에 공통 주입되는 스크립트
(function () {
    const path = window.location.pathname;

    // percent-encoded → UTF-8 문자열 복원 헬퍼 (파일 인코딩과 무관하게 한글 보장)
    const K = (s) => decodeURIComponent(s);

    // ========= [A] 어디서든 보이는 "공간예약" 빠른 이동 버튼(FAB) 주입 =========
    function injectReservationFAB() {
        if (document.getElementById("reservation-fab")) return; // 중복 주입 방지

        const a = document.createElement("a");
        a.id = "reservation-fab";
        a.href = "/reservation";
        a.textContent = K("%EA%B3%B5%EA%B0%84%EC%98%88%EC%95%BD"); // "공간예약"
        Object.assign(a.style, {
            position: "fixed",
            right: "20px",
            bottom: "20px",
            zIndex: "9999",
            padding: "12px 16px",
            background: "#2563eb",
            color: "#fff",
            borderRadius: "9999px",
            boxShadow: "0 10px 15px rgba(0,0,0,.2)",
            fontWeight: "700",
            fontSize: "14px",
            textDecoration: "none"
        });
        document.body.appendChild(a);
    }

    // ========= [B] index(메인) 화면에 "공간예약" 카드/메뉴 항목 동적 추가 =========
    function injectReservationCardOnIndex() {
        const candidates = [
            ".grid", ".cards", ".menu", "main .grid", "main", ".container", ".content", ".wrapper", "body"
        ];
        let host = null;
        for (const sel of candidates) {
            const el = document.querySelector(sel);
            if (el) { host = el; break; }
        }
        if (!host) return;
        if (host.querySelector('a[href="/reservation"]')) return;

        const card = document.createElement("a");
        card.href = "/reservation";
        card.setAttribute("aria-label", K("%EA%B8%B0%EC%88%99%EC%82%AC%20%EA%B3%B5%EA%B0%84%EC%98%88%EC%95%BD%20%ED%8E%98%EC%9D%B4%EC%A7%80%EB%A1%9C%20%EC%9D%B4%EB%8F%99")); // "기숙사 공간예약 페이지로 이동"
        Object.assign(card.style, {
            display: "block",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "16px",
            margin: "8px",
            background: "#ffffff",
            textDecoration: "none",
            color: "#111827",
            boxShadow: "0 1px 2px rgba(0,0,0,.06)"
        });

        const title = document.createElement("div");
        title.textContent = K("%EA%B3%B5%EA%B0%84%EC%98%88%EC%95%BD"); // "공간예약"
        Object.assign(title.style, {
            fontSize: "18px",
            fontWeight: "700",
            marginBottom: "6px"
        });

        const desc = document.createElement("div");
        desc.textContent = K("%EC%8A%A4%ED%84%B0%EB%94%94%EB%A3%B8/%EC%84%B8%EB%AF%B8%EB%82%98%EC%8B%A4%20%EC%8B%9C%EA%B0%84%EB%8C%80%20%EC%98%88%EC%95%BD"); // "스터디룸/세미나실 시간대 예약"
        Object.assign(desc.style, {
            fontSize: "13px",
            color: "#6b7280"
        });

        card.appendChild(title);
        card.appendChild(desc);
        host.appendChild(card);
    }

    // ========= [C] /reservation 페이지 동작 =========
    function initReservationPage() {
        const dateEl = document.getElementById("resv-date");
        const roomEl = document.getElementById("resv-room");
        const slotEl = document.getElementById("resv-slot");
        const checkBtn = document.getElementById("btn-check");
        const submitBtn = document.getElementById("btn-reserve");

        // 오늘 날짜 기본값
        if (dateEl && !dateEl.value) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, "0");
            const dd = String(today.getDate()).padStart(2, "0");
            dateEl.value = `${yyyy}-${mm}-${dd}`;
        }

        checkBtn?.addEventListener("click", async () => {
            if (!roomEl.value || !dateEl.value) {
                alert(K("%EA%B3%B5%EA%B0%84%EA%B3%BC%20%EB%82%A0%EC%A7%9C%EB%A5%BC%20%EB%A8%BC%EC%A0%80%20%EC%84%A0%ED%83%9D%ED%95%98%EC%84%B8%EC%9A%94.")); // "공간과 날짜를 먼저 선택하세요."
                return;
            }
            try {
                const q = new URLSearchParams({ roomId: roomEl.value, date: dateEl.value });
                const res = await fetch(`/api/reservations/availability?${q}`);
                const json = await res.json();

                if (!json.ok) {
                    alert(json.message || K("%EA%B0%80%EC%9A%A9%EC%84%B1%20%EC%A1%B0%ED%9A%8C%20%EC%8B%A4%ED%8C%A8")); // "가용성 조회 실패"
                    return;
                }

                slotEl.innerHTML = "";
                (json.available || []).forEach(s => {
                    const opt = document.createElement("option");
                    opt.value = opt.textContent = s;
                    slotEl.appendChild(opt);
                });

                if (!json.available || json.available.length === 0) {
                    const opt = document.createElement("option");
                    opt.value = "";
                    opt.textContent = K("%EA%B0%80%EC%9A%A9%20%EC%8B%9C%EA%B0%84%EB%8C%80%20%EC%97%86%EC%9D%8C"); // "가용 시간대 없음"
                    slotEl.appendChild(opt);
                } else {
                    slotEl.value = json.available[0];
                }

                alert(K("%EA%B0%80%EC%9A%A9%20%EC%8B%9C%EA%B0%84%EB%8C%80%EB%A5%BC%20%EB%B6%88%EB%9F%AC%EC%99%94%EC%8A%B5%EB%8B%88%EB%8B%A4.")); // "가용 시간대를 불러왔습니다."
            } catch (e) {
                alert(K("%EA%B0%80%EC%9A%A9%EC%84%B1%20%EC%A1%B0%ED%9A%8C%20%EC%A4%91%20%EB%AC%B8%EC%A0%9C%EA%B0%80%20%EB%B0%9C%EC%83%9D%ED%96%88%EC%8A%B5%EB%8B%88%EB%8B%A4.")); // "가용성 조회 중 문제가 발생했습니다."
            }
        });

        submitBtn?.addEventListener("click", async () => {
            const payload = {
                roomId: roomEl.value,
                date: dateEl.value,
                timeSlot: (document.getElementById("resv-slot") || {}).value || "",
                requester: {
                    studentId: document.getElementById("student-id")?.value || "",
                    name: document.getElementById("name")?.value || "",
                    phone: document.getElementById("phone")?.value || "",
                    email: document.getElementById("email")?.value || ""
                }
            };

            if (!payload.roomId || !payload.date || !payload.timeSlot) {
                alert(K("%EA%B3%B5%EA%B0%84/%EB%82%A0%EC%A7%9C/%EC%8B%9C%EA%B0%84%EB%8C%80%EB%A5%BC%20%EB%AA%A8%EB%91%90%20%EC%84%A0%ED%83%9D%ED%95%98%EC%84%B8%EC%9A%94.")); // "공간/날짜/시간대를 모두 선택하세요."
                return;
            }

            try {
                const res = await fetch("/api/reservations", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (!data.ok) {
                    alert(data.message || K("%EC%98%88%EC%95%BD%20%EC%9A%94%EC%B2%AD%20%EC%8B%A4%ED%8C%A8")); // "예약 요청 실패"
                    return;
                }
                alert(data.data.status === "confirmed"
                    ? K("%EC%98%88%EC%95%BD%20%ED%99%95%EC%A0%95!")              // "예약 확정!"
                    : K("%EB%8C%80%EA%B8%B0%EC%97%B4%EC%97%90%20%EB%93%B1%EB%A1%9D%EB%90%98%EC%97%88%EC%8A%B5%EB%8B%88%EB%8B%A4.") // "대기열에 등록되었습니다."
                );
            } catch (e) {
                alert(K("%EC%98%88%EC%95%BD%20%EC%9A%94%EC%B2%AD%20%EC%A4%91%20%EB%AC%B8%EC%A0%9C%EA%B0%80%20%EB%B0%9C%EC%83%9D%ED%96%88%EC%8A%B5%EB%8B%88%EB%8B%A4.")); // "예약 요청 중 문제가 발생했습니다."
            }
        });
    }

    // ========= 부팅 시퀀스 =========
    try {
        injectReservationFAB();
        if (path === "/" || path.endsWith("/index.html")) {
            injectReservationCardOnIndex();
        }
        if (path.includes("/reservation")) {
            initReservationPage();
        }
    } catch (e) {
        // silent
    }
})();
