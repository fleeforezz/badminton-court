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
    bankSelect: document.getElementById('bankSelect'),
    bankAccountNumber: document.getElementById('bankAccountNumber'),
    bankAccountName: document.getElementById('bankAccountName'),
    qrPersonSelect: document.getElementById('qrPersonSelect'),
    transferMemo: document.getElementById('transferMemo'),
    qrImage: document.getElementById('qrImage'),
    qrAmountLabel: document.getElementById('qrAmountLabel'),
    qrMemoLabel: document.getElementById('qrMemoLabel'),
};

let lastResults = [];
let lastGrandTotal = 0;

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
    const courtTotal = courtFeePerHour * courtHours * numCourts;

    const tubePrice = parseFloat(els.tubePrice.value) || 0;
    const perTube = parseFloat(els.shuttlesPerTube.value) || 1;
    const used = parseFloat(els.shuttlesUsed.value) || 0;
    const pricePerShuttle = tubePrice / perTube;
    const shuttleTotal = pricePerShuttle * used;

    const waterCups = parseFloat(els.waterCups.value) || 0;
    const waterPrice = parseFloat(els.waterPrice.value) || 0;
    const waterTotal = waterCups * waterPrice;

    const grandCostBase = courtTotal + shuttleTotal + waterTotal;
    const baseRate = players.length > 0 ? grandCostBase / players.length : 0;

    // Extra-time cost: split among only the people who stayed extra.
    // Instead of stepping by a fixed chunk (which breaks for odd minutes like
    // 1h15 or 1h45), we build the timeline from the *actual* hour values
    // everyone reported, then split each segment's cost only among the
    // people who were still playing through that segment. This handles any
    // fraction of an hour (15/30/45 minutes, or anything else) exactly.
    const extraCost = {};
    players.forEach(p => extraCost[p.id] = 0);

    const marks = new Set([courtHours]);
    players.forEach(p => { if (p.hours > courtHours + 1e-9) marks.add(p.hours); });
    const timeline = Array.from(marks).sort((a, b) => a - b);

    let extraTotal = 0;
    for (let i = 0; i < timeline.length - 1; i++) {
        const segStart = timeline[i];
        const segEnd = timeline[i + 1];
        const duration = segEnd - segStart;
        if (duration <= 1e-9) continue;

        const stayers = players.filter(p => p.hours >= segEnd - 1e-9);
        if (stayers.length === 0) continue;

        const segCost = courtFeePerHour * numCourts * duration;
        const share = segCost / stayers.length;
        stayers.forEach(p => extraCost[p.id] += share);
        extraTotal += segCost;
    }

    els.resultsList.innerHTML = '';
    let grandCollected = 0;

    players.forEach(p => {
        const myExtra = extraCost[p.id] || 0;
        const total = baseRate + myExtra;
        grandCollected += total;

        const row = document.createElement('div');
        row.className = 'result-row';
        const breakdown = myExtra > 0.5
            ? `Đơn giá cơ bản ${fmt(baseRate)} + phần sân giờ thêm (chia đều) ${fmt(myExtra)}`
            : `Đơn giá cơ bản (${courtHours}h)`;
        row.innerHTML = `
      <div class="name">${p.name || '—'}</div>
      <div class="hrs">${p.hours}h</div>
      <div class="amount">${fmt(total)}</div>
      <div class="breakdown">${breakdown}</div>
    `;
        els.resultsList.appendChild(row);
    });

    els.grandTotal.textContent = fmt(grandCollected);
    els.grandTotalSplit.textContent = `${fmt(courtTotal)} · ${fmt(shuttleTotal)} · ${fmt(waterTotal)}${extraTotal > 0.5 ? ` · +${fmt(extraTotal)} giờ thêm` : ''}`;
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