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
    tierCount: document.getElementById('tierCount'),
    matchMode: document.getElementById('matchMode'),
    ratingPlayersList: document.getElementById('ratingPlayersList'),
    addRatingBtn: document.getElementById('addRatingBtn'),
    ratingEmpty: document.getElementById('ratingEmpty'),
    ratingTable: document.getElementById('ratingTable'),
    ratingTableBody: document.getElementById('ratingTableBody'),
    generatePairsBtn: document.getElementById('generatePairsBtn'),
    pairingResults: document.getElementById('pairingResults'),
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

// ---- Tabs: switch between panels ----
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

// ==================================================================
// Tab 4: xếp trình độ theo thắng/thua & gợi ý ghép cặp đấu
// ==================================================================
let ratingPlayers = [];
let nextRatingId = 1;

const TIER_NAMES = ['Giỏi', 'Khá', 'Trung bình', 'Yếu', 'Mới chơi', 'Tập sự'];

function defaultRatingName(i) { return 'Người ' + (i + 1); }

function addRatingPlayer(wins = 0, losses = 0) {
    ratingPlayers.push({ id: nextRatingId++, name: defaultRatingName(ratingPlayers.length), wins, losses });
    renderRatingRows();
    updateRankings();
}

function removeRatingPlayer(idx) {
    ratingPlayers.splice(idx, 1);
    renderRatingRows();
    updateRankings();
}

function renderRatingRows() {
    if (!els.ratingPlayersList) return;
    els.ratingPlayersList.innerHTML = '';
    ratingPlayers.forEach((p, i) => {
        const row = document.createElement('div');
        row.className = 'rating-row';
        row.innerHTML = `
      <input type="text" value="${p.name}" data-idx="${i}" data-field="name" />
      <input type="number" min="0" value="${p.wins}" data-idx="${i}" data-field="wins" />
      <input type="number" min="0" value="${p.losses}" data-idx="${i}" data-field="losses" />
      <button class="remove-btn" data-idx="${i}" title="Xóa người này">×</button>
    `;
        els.ratingPlayersList.appendChild(row);
    });

    els.ratingPlayersList.querySelectorAll('input[data-field="name"]').forEach(inp => {
        inp.addEventListener('input', e => {
            ratingPlayers[+e.target.dataset.idx].name = e.target.value;
            updateRankings();
        });
    });
    els.ratingPlayersList.querySelectorAll('input[data-field="wins"]').forEach(inp => {
        inp.addEventListener('input', e => {
            ratingPlayers[+e.target.dataset.idx].wins = Math.max(0, parseInt(e.target.value) || 0);
            updateRankings();
        });
    });
    els.ratingPlayersList.querySelectorAll('input[data-field="losses"]').forEach(inp => {
        inp.addEventListener('input', e => {
            ratingPlayers[+e.target.dataset.idx].losses = Math.max(0, parseInt(e.target.value) || 0);
            updateRankings();
        });
    });
    els.ratingPlayersList.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', e => removeRatingPlayer(+e.target.dataset.idx));
    });
}

// Điểm xếp hạng dùng Bayesian smoothing: người chơi ít trận không bị đội
// lên hạng nhất chỉ vì thắng 1-2 trận may mắn — điểm được kéo về mức trung
// bình (0.5) theo trọng số C, số trận càng nhiều thì điểm càng phản ánh
// đúng thực lực.
const BAYES_PRIOR_MATCHES = 4;
const BAYES_PRIOR_WINRATE = 0.5;

function computeRating(p) {
    const total = p.wins + p.losses;
    const rating = (p.wins + BAYES_PRIOR_MATCHES * BAYES_PRIOR_WINRATE) / (total + BAYES_PRIOR_MATCHES);
    const winRate = total > 0 ? p.wins / total : 0;
    return { ...p, total, winRate, rating };
}

function tierColor(rank, tierCount) {
    if (tierCount <= 1) return { bg: 'rgba(15,61,46,0.75)', fg: 'var(--court-line)' };
    const t = rank / (tierCount - 1); // 0 = giỏi nhất, 1 = yếu nhất
    const alpha = 0.78 - 0.58 * t;
    const fg = alpha > 0.42 ? 'var(--court-line)' : 'var(--ink)';
    return { bg: `rgba(15,61,46,${alpha.toFixed(2)})`, fg };
}

function assignTiers(sorted) {
    const tierCount = Math.min(8, Math.max(2, parseInt(els.tierCount.value) || 4));
    const n = sorted.length;
    return sorted.map((p, i) => {
        const tierIdx = n <= 1 ? 0 : Math.min(tierCount - 1, Math.floor((i / n) * tierCount));
        const label = tierIdx < TIER_NAMES.length ? TIER_NAMES[tierIdx] : `Bậc ${tierIdx + 1}`;
        return { ...p, tierIdx, tierLabel: label };
    });
}

let lastRanked = [];

function updateRankings() {
    if (!els.ratingTable) return;

    if (ratingPlayers.length === 0) {
        els.ratingEmpty.hidden = false;
        els.ratingTable.hidden = true;
        lastRanked = [];
        renderPairingPlaceholder();
        return;
    }

    els.ratingEmpty.hidden = true;
    els.ratingTable.hidden = false;

    const rated = ratingPlayers.map(computeRating);
    rated.sort((a, b) => b.rating - a.rating || b.total - a.total);
    const ranked = assignTiers(rated);
    lastRanked = ranked;

    const tierCountUsed = Math.min(8, Math.max(2, parseInt(els.tierCount.value) || 4));

    els.ratingTableBody.innerHTML = '';
    ranked.forEach((p, i) => {
        const { bg, fg } = tierColor(p.tierIdx, tierCountUsed);
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${p.name || '—'}</td>
      <td>${p.wins}-${p.losses}</td>
      <td>${p.total > 0 ? Math.round(p.winRate * 100) + '%' : '—'}</td>
      <td>${(p.rating * 100).toFixed(1)}</td>
      <td><span class="tier-badge" style="background:${bg};color:${fg};">${p.tierLabel}</span></td>
    `;
        els.ratingTableBody.appendChild(tr);
    });
}

['tierCount'].forEach(id => {
    if (els[id]) els[id].addEventListener('input', updateRankings);
});
if (els.addRatingBtn) els.addRatingBtn.addEventListener('click', () => addRatingPlayer());

function renderPairingPlaceholder() {
    if (els.pairingResults) {
        els.pairingResults.innerHTML = '<p class="bye-note">Thêm người chơi và bấm "Ghép cặp ngay" để xem gợi ý.</p>';
    }
}

function renderMatchCard(label, sideA, sideB, ratingA, ratingB) {
    return `
    <div class="match-card">
      <div class="match-label">${label}</div>
      <div class="match-sides">
        <div class="match-side">${sideA}<span class="match-rating">Điểm đội: ${ratingA.toFixed(1)}</span></div>
        <div class="match-vs">VS</div>
        <div class="match-side" style="text-align:right;">${sideB}<span class="match-rating">Điểm đội: ${ratingB.toFixed(1)}</span></div>
      </div>
    </div>
  `;
}

function generatePairing() {
    if (!els.pairingResults) return;
    if (lastRanked.length < 2) {
        els.pairingResults.innerHTML = '<p class="bye-note">Cần ít nhất 2 người chơi để ghép cặp.</p>';
        return;
    }

    const mode = els.matchMode ? els.matchMode.value : 'doubles';
    const pool = [...lastRanked]; // already sorted best -> worst
    let html = '';

    if (mode === 'singles') {
        // Ghép các đối thủ liền bậc (rank 1 vs 2, 3 vs 4, ...) để trận đấu sát nút.
        let matchNo = 1;
        for (let i = 0; i < pool.length - 1; i += 2) {
            const a = pool[i], b = pool[i + 1];
            html += renderMatchCard(`Trận ${matchNo++}`, a.name, b.name, a.rating * 100, b.rating * 100);
        }
        if (pool.length % 2 === 1) {
            html += `<p class="bye-note">${pool[pool.length - 1].name} chưa có đối, ngồi ngoài chờ trận sau.</p>`;
        }
    } else {
        // Ghép đôi: người mạnh nhất + người yếu nhất thành 1 đội (snake), để
        // tổng điểm hai đội cân bằng nhau; sau đó xếp các đội có điểm gần
        // nhau đấu với nhau.
        let benched = null;
        let active = pool;
        if (active.length % 2 === 1) {
            benched = active[active.length - 1];
            active = active.slice(0, -1);
        }

        const teams = [];
        let lo = 0, hi = active.length - 1;
        while (lo < hi) {
            const p1 = active[lo], p2 = active[hi];
            teams.push({ players: [p1, p2], rating: (p1.rating + p2.rating) * 100 / 2 });
            lo++; hi--;
        }
        teams.sort((a, b) => b.rating - a.rating);

        let matchNo = 1;
        for (let i = 0; i < teams.length - 1; i += 2) {
            const A = teams[i], B = teams[i + 1];
            html += renderMatchCard(
                `Trận ${matchNo++}`,
                `${A.players[0].name} &amp; ${A.players[1].name}`,
                `${B.players[0].name} &amp; ${B.players[1].name}`,
                A.rating, B.rating
            );
        }
        if (teams.length % 2 === 1) {
            const last = teams[teams.length - 1];
            html += `<p class="bye-note">Đội ${last.players[0].name} & ${last.players[1].name} chưa có đội đối đầu, chờ trận sau.</p>`;
        }
        if (benched) {
            html += `<p class="bye-note">${benched.name} dư ra do số người lẻ, ngồi ngoài chờ trận sau.</p>`;
        }
    }

    els.pairingResults.innerHTML = html || '<p class="bye-note">Không đủ người để ghép cặp.</p>';
}

if (els.generatePairsBtn) els.generatePairsBtn.addEventListener('click', generatePairing);

// Khởi tạo sẵn vài dòng mẫu để tab không trống trơn khi mới mở
addRatingPlayer(0, 0);
addRatingPlayer(0, 0);
addRatingPlayer(0, 0);
addRatingPlayer(0, 0);