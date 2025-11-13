/**
 * ============================================
 * 공간예약 시스템 - 클라이언트 스크립트
 * ============================================
 * 
 * 기능:
 * - 공간 목록 로드
 * - 날짜/시간대별 가용 정보 조회
 * - 예약 생성 (정원 초과 시 대기열 등록)
 * - 내 예약 조회
 * - 예약 취소
 */

// ============================================
// DOM 요소 선택
// ============================================
const $ = (sel) => document.querySelector(sel);  // jQuery식 선택자

// 예약 폼 요소
const spaceSelect = $('#spaceSelect');           // 공간 선택 드롭다운
const dateInput = $('#dateInput');               // 날짜 입력
const slotSelect = $('#slotSelect');             // 시간대 선택 드롭다운
const reserveBtn = $('#reserveBtn');             // 예약하기 버튼
const reserveMsg = $('#reserveMsg');             // 결과 메시지 표시 영역

// 내 예약 조회 요소
const lookupStudentId = $('#lookupStudentId');   // 학번 입력
const lookupBtn = $('#lookupBtn');               // 조회 버튼
const myList = $('#myList');                     // 예약 목록 표시 영역

// ============================================
// API 호출 함수들
// ============================================

/**
 * 공간 목록 불러오기
 * API: GET /api/reservations/spaces
 */
async function loadSpaces() {
    const res = await fetch('/api/reservations/spaces');
    const data = await res.json();
    spaceSelect.innerHTML = '';
    data.data.forEach(s => {
        const op = document.createElement('option');
        op.value = s.id;
        op.textContent = `${s.name} (${s.id})`;
        spaceSelect.appendChild(op);
    });
}

// 날짜 선택/공간 변경 시 가용슬롯 불러오기
async function loadAvailability() {
    const spaceId = spaceSelect.value;
    const date = dateInput.value;
    slotSelect.innerHTML = '';
    reserveMsg.textContent = '';

    if (!spaceId || !date) return;

    const res = await fetch(`/api/reservations/availability?spaceId=${encodeURIComponent(spaceId)}&date=${encodeURIComponent(date)}`);
    const data = await res.json();
    if (!data.ok) {
        slotSelect.innerHTML = '';
        reserveMsg.textContent = data.message || '가용 정보를 불러오지 못했습니다.';
        return;
    }

    data.slots.forEach(s => {
        const op = document.createElement('option');
        op.value = s.timeSlot;
        if (s.available > 0) {
            op.textContent = `${s.timeSlot} (남은자리: ${s.available}/${s.capacity})`;
        } else {
            op.textContent = `${s.timeSlot} (대기열 등록 가능 - 정원 ${s.capacity}명 초과)`;
        }
        slotSelect.appendChild(op);
    });
}

// 예약하기
async function makeReservation() {
    const payload = {
        spaceId: spaceSelect.value,
        date: dateInput.value,
        timeSlot: slotSelect.value,
        studentId: $('#studentIdInput').value.trim(),
        studentName: $('#studentNameInput').value.trim(),
    };
    if (!payload.spaceId || !payload.date || !payload.timeSlot || !payload.studentId || !payload.studentName) {
        reserveMsg.textContent = '모든 항목을 입력해주세요.';
        return;
    }
    const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.ok) {
        if (data.data.status === 'confirmed') {
            reserveMsg.textContent = '✅ 예약이 확정되었습니다!';
            reserveMsg.style.color = '#16a34a';
        } else {
            reserveMsg.textContent = '⏳ 대기열에 등록되었습니다. 취소 발생 시 자동으로 확정됩니다.';
            reserveMsg.style.color = '#ea580c';
        }
        if (lookupStudentId.value.trim() === payload.studentId) {
            await loadMyReservations(); // 자기 학번 조회 중이었으면 갱신
        }
        await loadAvailability();    // 가용 정보 갱신
    } else {
        reserveMsg.textContent = '❌ ' + (data.message || '예약에 실패했습니다.');
        reserveMsg.style.color = '#dc2626';
    }
}

// 내 예약 조회
async function loadMyReservations() {
    const sid = lookupStudentId.value.trim();
    myList.innerHTML = '';
    if (!sid) return;

    const res = await fetch(`/api/reservations/my?studentId=${encodeURIComponent(sid)}`);
    const data = await res.json();
    if (!data.ok) {
        myList.innerHTML = `<li>예약을 불러오지 못했습니다.</li>`;
        return;
    }
    if (data.data.length === 0) {
        myList.innerHTML = `<li>예약 정보가 없습니다.</li>`;
        return;
    }

    data.data.forEach(row => {
        const li = document.createElement('li');
        const badgeClass = row.status === 'confirmed' ? 'ok' : (row.status === 'waitlist' ? 'wait' : 'cancel');
        li.innerHTML = `
      <div class="meta">
        <div><strong>${row.spaceName}</strong> <span class="badge ${badgeClass}">
          ${row.status === 'confirmed' ? '확정' : (row.status === 'waitlist' ? '대기' : '취소')}
        </span></div>
        <div>${row.date} / ${row.timeSlot}</div>
        <div>${row.studentName} (${row.studentId})</div>
      </div>
      <div class="badges">
        ${row.status !== 'cancelled' ? `<button class="cancel-btn" data-id="${row._id || row.id}">취소</button>` : ''}
      </div>
    `;
        myList.appendChild(li);
    });

    // 취소 버튼 이벤트
    myList.querySelectorAll('.cancel-btn').forEach(btn => {
        btn.addEventListener('click', async (ev) => {
            const id = ev.currentTarget.getAttribute('data-id');
            if (!id) return;
            if (!confirm('예약 취소하시겠습니까?')) return;

            const res = await fetch(`/api/reservations/${encodeURIComponent(id)}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.ok) {
                await loadMyReservations();
                await loadAvailability();
            } else {
                alert(data.message || '취소 실패');
            }
        });
    });
}

// 초기 로딩
window.addEventListener('DOMContentLoaded', async () => {
    await loadSpaces();

    // 기본 날짜 오늘로
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    dateInput.value = `${yyyy}-${mm}-${dd}`;

    await loadAvailability();

    spaceSelect.addEventListener('change', loadAvailability);
    dateInput.addEventListener('change', loadAvailability);
    reserveBtn.addEventListener('click', makeReservation);

    lookupBtn.addEventListener('click', loadMyReservations);
});
