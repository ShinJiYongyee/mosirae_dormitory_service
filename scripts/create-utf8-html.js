import fs from 'fs';

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>상벌점 관리</title>
<style>
body { font-family: Arial; padding: 20px; }
table { width: 100%; border-collapse: collapse; margin-top: 20px; }
th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
th { background-color: #f2f2f2; }
button { padding: 10px 20px; margin: 5px; cursor: pointer; }
</style>
</head>
<body>
<h1>상벌점 관리 (완전 새 버전)</h1>
<button onclick="loadData()">데이터 불러오기</button>
<div id="result"></div>
<table id="dataTable" style="display:none;">
<thead>
<tr>
<th>날짜</th>
<th>학번</th>
<th>이름</th>
<th>구분</th>
<th>점수</th>
<th>사유</th>
</tr>
</thead>
<tbody id="tbody"></tbody>
</table>
<script>
async function loadData() {
  try {
    const res = await fetch('/api/points');
    const data = await res.json();
    console.log('받은 데이터:', data);
    
    const tbody = document.getElementById('tbody');
    const table = document.getElementById('dataTable');
    const result = document.getElementById('result');
    
    tbody.innerHTML = '';
    
    if (data.length === 0) {
      result.textContent = '데이터 없음';
      table.style.display = 'none';
      return;
    }
    
    table.style.display = 'table';
    result.textContent = '';
    
    data.forEach(item => {
      const tr = document.createElement('tr');
      
      const td1 = document.createElement('td');
      td1.textContent = item.date;
      
      const td2 = document.createElement('td');
      td2.textContent = item.studentId;
      
      const td3 = document.createElement('td');
      td3.textContent = item.studentName;
      
      const td4 = document.createElement('td');
      td4.textContent = item.type === 'reward' ? '상점' : '벌점';
      
      const td5 = document.createElement('td');
      td5.textContent = item.points;
      
      const td6 = document.createElement('td');
      td6.textContent = item.reason;
      
      tr.appendChild(td1);
      tr.appendChild(td2);
      tr.appendChild(td3);
      tr.appendChild(td4);
      tr.appendChild(td5);
      tr.appendChild(td6);
      
      tbody.appendChild(tr);
    });
    
    alert('총 ' + data.length + '개의 데이터를 불러왔습니다.');
  } catch (err) {
    document.getElementById('result').textContent = '오류: ' + err.message;
  }
}
</script>
</body>
</html>`;

// UTF-8 BOM 없이 저장
fs.writeFileSync('html_assets/points-test-clean.html', html, { encoding: 'utf8' });
console.log('? 파일 생성 완료: html_assets/points-test-clean.html');
