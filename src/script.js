const fmt = n => Math.round(n).toLocaleString('vi-VN') + 'đ';

const els = {
    courtFee: document.getElementById('courtFee'),
    courtHours: document.getElementById('courtHours'),
    numCourts: document.getElementById('numCourts'),
    tubePrice: document.getElementById('tubePrice'),
    shuttlesPerTube: document.getElementById('shuttlesPerTube'),
    shuttlesUsed: document.getElementById('shuttlesUsed'),
    waterCups: document.getElementById('waterCups'),
    waterPrice: document.getElementById('waterPrice'),
    numPlayers: document.getElementById('numPlayers'),
    playersList: document.getElementById('playersList'),
    addPlayerBtn: document.getElementById('addPlayerBtn'),
    resultsList: document.getElementById('resultsList'),
    grandTotal: document.getElementById('grandTotal'),
    grandTotalSplit: document.getElementById('grandTotalSplit'),
    mobileSummaryTotal: document.getElementById('mobileSummaryTotal'),
    mobileSummaryBtn: document.getElementById('mobileSummaryBtn'),
    resultsCard: document.getElementById('resultsCard'),
};

let players = [];
let nextPlayerId = 1;

function defaultName(i) { return 'Người ' + (i + 1); }

function syncPlayerCount() {
    const n = Math.max(1, parseInt(els.numPlayers.value) || 1);
    const baseHours = parseFloat(els.courtHours.value) || 0;

    if (players.length < n) {
        while (players.length < n) {
            players.push({ id: nextPlayerId++, name: defaultName(players.length), hours: baseHours });
        }
    } else if (players.length > n) {
        players = players.slice(0, n);
    }
    renderPlayers();
    compute();
}

function renderPlayers() {
    els.playersList.innerHTML = '';
    players.forEach((p, i) => {
        const row = document.createElement('div');
        row.className = 'player-row';
        row.innerHTML = `
      <div class="shuttle-idx">${i + 1}</div>
      <input type="text" value="${p.name}" data-idx="${i}" data-field="name" />
      <div class="hours-wrap">
        <input type="number" min="0" step="0.25" value="${p.hours}" data-idx="${i}" data-field="hours" />
        <span>giờ</span>
      </div>
      <button class="remove-btn" data-idx="${i}" title="Xóa người này">×</button>
    `;
        els.playersList.appendChild(row);
    });

    els.playersList.querySelectorAll('input[data-field="name"]').forEach(inp => {
        inp.addEventListener('input', e => {
            players[+e.target.dataset.idx].name = e.target.value;
            compute();
        });
    });
    els.playersList.querySelectorAll('input[data-field="hours"]').forEach(inp => {
        inp.addEventListener('input', e => {
            players[+e.target.dataset.idx].hours = parseFloat(e.target.value) || 0;
            compute();
        });
    });
    els.playersList.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const idx = +e.target.dataset.idx;
            players.splice(idx, 1);
            els.numPlayers.value = players.length;
            renderPlayers();
            compute();
        });
    });
}

function compute() {
    const courtFeePerHour = parseFloat(els.courtFee.value) || 0;
    const courtHours = parseFloat(els.courtHours.value) || 0;
    const numCourts = Math.max(1, parseFloat(els.numCourts.value) || 1);
    const courtBooked = courtFeePerHour * courtHours * numCourts;

    const tubePrice = parseFloat(els.tubePrice.value) || 0;
    const perTube = parseFloat(els.shuttlesPerTube.value) || 1;
    const used = parseFloat(els.shuttlesUsed.value) || 0;
    const pricePerShuttle = tubePrice / perTube;
    const shuttleTotal = pricePerShuttle * used;

    const waterCups = parseFloat(els.waterCups.value) || 0;
    const waterPrice = parseFloat(els.waterPrice.value) || 0;
    const waterTotal = waterCups * waterPrice;

    // Cầu + nước là chi phí dùng chung, không phụ thuộc số giờ chơi —
    // vẫn chia đều cho tất cả người tham gia.
    const consumablesTotal = shuttleTotal + waterTotal;
    const consumablesRate = players.length > 0 ? consumablesTotal / players.length : 0;

    // Tiền sân: dựng "đường thời gian" từ 0 đến D (D = số giờ thuê sân, hoặc
    // dài hơn nếu có người chơi thêm giờ). Ở mỗi khoảng thời gian, chỉ những
    // ai còn đang chơi mới cùng chia nhau tiền sân của khoảng đó — nên người
    // về sớm chỉ trả cho phần thời gian họ thực sự chơi (được giảm giá), còn
    // người ở lại lâu hơn thì gánh thêm phần giờ dư (chia đều với những ai
    // cũng ở lại chơi thêm giờ đó).
    const courtShare = {};
    players.forEach(p => courtShare[p.id] = 0);

    const maxPlayed = players.reduce((m, p) => Math.max(m, p.hours), 0);
    const D = Math.max(courtHours, maxPlayed);

    const marks = new Set([0, D]);
    players.forEach(p => {
        const h = Math.min(Math.max(p.hours, 0), D);
        if (h > 0) marks.add(h);
    });
    const timeline = Array.from(marks).sort((a, b) => a - b);

    let courtCollected = 0;
    for (let i = 0; i < timeline.length - 1; i++) {
        const segStart = timeline[i];
        const segEnd = timeline[i + 1];
        const duration = segEnd - segStart;
        if (duration <= 1e-9) continue;

        const stayers = players.filter(p => p.hours >= segEnd - 1e-9);
        if (stayers.length === 0) continue;

        const segCost = courtFeePerHour * numCourts * duration;
        const share = segCost / stayers.length;
        stayers.forEach(p => courtShare[p.id] += share);
        courtCollected += segCost;
    }

    const extraTotal = Math.max(0, courtCollected - courtBooked);

    els.resultsList.innerHTML = '';
    let grandCollected = 0;

    players.forEach(p => {
        const myCourt = courtShare[p.id] || 0;
        const total = myCourt + consumablesRate;
        grandCollected += total;

        const row = document.createElement('div');
        row.className = 'result-row';
        const breakdown = `Tiền sân (${p.hours}h): ${fmt(myCourt)} + Cầu & nước: ${fmt(consumablesRate)}`;
        row.innerHTML = `
      <div class="name">${p.name || '—'}</div>
      <div class="hrs">${p.hours}h</div>
      <div class="amount">${fmt(total)}</div>
      <div class="breakdown">${breakdown}</div>
    `;
        els.resultsList.appendChild(row);
    });

    els.grandTotal.textContent = fmt(grandCollected);
    els.grandTotalSplit.textContent = `${fmt(courtCollected)} sân · ${fmt(shuttleTotal)} cầu · ${fmt(waterTotal)} nước${extraTotal > 0.5 ? ` · +${fmt(extraTotal)} giờ thêm` : ''}`;
    if (els.mobileSummaryTotal) els.mobileSummaryTotal.textContent = fmt(grandCollected);
}

['courtFee', 'courtHours', 'numCourts', 'tubePrice', 'shuttlesPerTube', 'shuttlesUsed', 'waterCups', 'waterPrice'].forEach(id => {
    els[id].addEventListener('input', compute);
});
els.numPlayers.addEventListener('input', syncPlayerCount);
els.addPlayerBtn.addEventListener('click', () => {
    const baseHours = parseFloat(els.courtHours.value) || 0;
    players.push({ id: nextPlayerId++, name: defaultName(players.length), hours: baseHours });
    els.numPlayers.value = players.length;
    renderPlayers();
    compute();
});

syncPlayerCount();

if (els.mobileSummaryBtn && els.resultsCard) {
    els.mobileSummaryBtn.addEventListener('click', () => {
        els.resultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

// ---- Tabs: switch between "Chi phí buổi chơi" and "Người chơi & giờ chơi" ----
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
        });
        tabPanels.forEach(p => { p.hidden = true; });

        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        const panel = document.getElementById('tab-' + btn.dataset.tab);
        if (panel) panel.hidden = false;
    });
});