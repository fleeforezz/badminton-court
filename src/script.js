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
        <input type="number" min="0" step="0.5" value="${p.hours}" data-idx="${i}" data-field="hours" />
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

    // Extra-time cost: split among only the people who stayed extra, hour by hour,
    // so someone playing 3h doesn't pay the full extra-hour rate alone —
    // it's shared with everyone else who also stayed that extra hour.
    const extraCost = {};
    players.forEach(p => extraCost[p.id] = 0);

    const STEP = 0.5;
    const maxHours = players.reduce((m, p) => Math.max(m, p.hours), courtHours);
    for (let t = courtHours; t < maxHours - 1e-9; t += STEP) {
        const stayers = players.filter(p => p.hours >= t + STEP - 1e-9);
        if (stayers.length === 0) continue;
        const slotCost = courtFeePerHour * numCourts * STEP;
        const perStayer = slotCost / stayers.length;
        stayers.forEach(p => extraCost[p.id] += perStayer);
    }

    let extraTotal = 0;
    Object.values(extraCost).forEach(v => extraTotal += v);

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