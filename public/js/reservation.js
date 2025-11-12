// public/js/reservation.js

const $ = (sel) => document.querySelector(sel);

const spaceSelect = $('#spaceSelect');
const dateInput = $('#dateInput');
const slotSelect = $('#slotSelect');
const reserveBtn = $('#reserveBtn');
const reserveMsg = $('#reserveMsg');

const lookupStudentId = $('#lookupStudentId');
const lookupBtn = $('#lookupBtn');
const myList = $('#myList');

// 기본 공간 목록 불러오기
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

// 날짜 변경/공간 변경 시 가용슬롯 불러오기
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
        op.textContent = `${s.timeSlot} (가능: ${s.available}/${s.capacity})`;
        // 남은자리가 0이면 비활성화
        if (s.available === 0) op.disabled = true;
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
        const st = data.data.status === 'confirmed' ? '확정' : '대기';
        reserveMsg.textContent = `예약이 완료되었습니다. 상태: ${st}`;
        if (lookupStudentId.value.trim() === payload.studentId) {
            await loadMyReservations(); // 자기 목록 보고 있었으면 갱신
        }
        await loadAvailability();    // 가용 슬롯 갱신
    } else {
        reserveMsg.textContent = data.message || '예약에 실패했습니다.';
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
        myList.innerHTML = `<li>목록을 불러오지 못했습니다.</li>`;
        return;
    }
    if (data.data.length === 0) {
        myList.innerHTML = `<li>예약 내역이 없습니다.</li>`;
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
            if (!confirm('정말 취소하시겠습니까?')) return;

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

// 초기 바인딩
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
