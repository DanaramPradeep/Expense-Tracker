/* ═══════════════════════════════════════
   XPENSE TRACKER — app.js
   Features: Add / Delete / Filter / Search
             Charts / Summary / Budget / CSV Export
════════════════════════════════════════ */

/* ──────────────────────────────────────
   STATE
────────────────────────────────────── */
let transactions = JSON.parse(localStorage.getItem('xpense_txns')) || [];
let currentType  = 'income';
let budget       = parseFloat(localStorage.getItem('xpense_budget')) || 0;
let activeTab    = 'history';

const CATEGORY_ICONS = {
  food:          '🍔',
  transport:     '🚗',
  shopping:      '🛍️',
  entertainment: '🎬',
  health:        '💊',
  education:     '📚',
  bills:         '🧾',
  salary:        '💼',
  investment:    '📈',
  other:         '🔖',
};

/* ──────────────────────────────────────
   INIT
────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Set today's date
  document.getElementById('txnDate').valueAsDate = new Date();

  // Header date
  document.getElementById('currentDate').textContent =
    new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Restore budget UI
  if (budget > 0) {
    document.getElementById('budgetInput').value = budget;
    showBudgetBar();
  }

  refresh();
});

/* ──────────────────────────────────────
   SAVE / LOAD
────────────────────────────────────── */
function save() {
  localStorage.setItem('xpense_txns', JSON.stringify(transactions));
}

/* ──────────────────────────────────────
   TYPE TOGGLE
────────────────────────────────────── */
function setType(type) {
  currentType = type;
  document.getElementById('btnIncome').classList.toggle('active', type === 'income');
  document.getElementById('btnExpense').classList.toggle('active', type === 'expense');
}

/* ──────────────────────────────────────
   ADD TRANSACTION
────────────────────────────────────── */
function addTransaction() {
  const desc     = document.getElementById('txnDesc').value.trim();
  const amount   = parseFloat(document.getElementById('txnAmount').value);
  const category = document.getElementById('txnCategory').value;
  const date     = document.getElementById('txnDate').value;

  if (!desc) return showToast('Please add a description.', 'error');
  if (!amount || amount <= 0) return showToast('Please enter a valid amount.', 'error');
  if (!date)  return showToast('Please pick a date.', 'error');

  const txn = {
    id: Date.now(),
    desc,
    amount,
    category,
    date,
    type: currentType,
  };

  transactions.unshift(txn);
  save();
  refresh();
  clearForm();
  showToast(
    currentType === 'income'
      ? `+₹${fmt(amount)} income added!`
      : `-₹${fmt(amount)} expense recorded.`,
    currentType === 'income' ? 'success' : 'error'
  );
}

function clearForm() {
  document.getElementById('txnDesc').value = '';
  document.getElementById('txnAmount').value = '';
  document.getElementById('txnDate').valueAsDate = new Date();
  document.getElementById('txnCategory').value = 'food';
}

/* ──────────────────────────────────────
   DELETE
────────────────────────────────────── */
function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  save();
  refresh();
  showToast('Transaction deleted.', 'info');
}

/* ──────────────────────────────────────
   CLEAR ALL
────────────────────────────────────── */
function clearAll() {
  if (!transactions.length) return showToast('Nothing to clear.', 'info');
  if (!confirm('Delete ALL transactions? This cannot be undone.')) return;
  transactions = [];
  save();
  refresh();
  showToast('All transactions cleared.', 'info');
}

/* ──────────────────────────────────────
   FILTER & RENDER LIST
────────────────────────────────────── */
function getFiltered() {
  const search   = document.getElementById('searchInput').value.toLowerCase();
  const catF     = document.getElementById('filterCategory').value;
  const typeF    = document.getElementById('filterType').value;

  return transactions.filter(t => {
    const matchSearch = t.desc.toLowerCase().includes(search) ||
                        t.category.toLowerCase().includes(search);
    const matchCat    = catF  === 'all' || t.category === catF;
    const matchType   = typeF === 'all' || t.type     === typeF;
    return matchSearch && matchCat && matchType;
  });
}

function renderList() {
  const list    = document.getElementById('txnList');
  const empty   = document.getElementById('emptyState');
  const filtered = getFiltered();

  // Remove all txn items but keep emptyState
  Array.from(list.querySelectorAll('.txn-item')).forEach(el => el.remove());

  if (!filtered.length) {
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  filtered.forEach(t => {
    const li = document.createElement('li');
    li.className = `txn-item ${t.type}`;
    li.innerHTML = `
      <span class="txn-icon">${CATEGORY_ICONS[t.category] || '💰'}</span>
      <div class="txn-info">
        <p class="txn-desc">${escape(t.desc)}</p>
        <p class="txn-meta">${formatDate(t.date)} &nbsp;·&nbsp; ${capitalise(t.category)}</p>
      </div>
      <span class="txn-amount ${t.type}">${t.type === 'income' ? '+' : '−'}₹${fmt(t.amount)}</span>
      <button class="txn-delete" onclick="deleteTransaction(${t.id})" title="Delete">✕</button>
    `;
    list.appendChild(li);
  });
}

/* ──────────────────────────────────────
   SUMMARY CARDS
────────────────────────────────────── */
function updateCards() {
  const income  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  document.getElementById('totalBalance').textContent = `₹${fmt(balance)}`;
  document.getElementById('totalIncome').textContent  = `₹${fmt(income)}`;
  document.getElementById('totalExpense').textContent = `₹${fmt(expense)}`;

  // Balance bar
  const pct = income > 0 ? Math.min((balance / income) * 100, 100) : 0;
  document.getElementById('balanceBar').style.width = pct + '%';
}

/* ──────────────────────────────────────
   BUDGET
────────────────────────────────────── */
function setBudget() {
  const val = parseFloat(document.getElementById('budgetInput').value);
  if (!val || val <= 0) return showToast('Enter a valid budget amount.', 'error');
  budget = val;
  localStorage.setItem('xpense_budget', budget);
  showBudgetBar();
  showToast(`Monthly budget set to ₹${fmt(budget)}`, 'success');
}

function showBudgetBar() {
  const wrap = document.getElementById('budgetBarWrap');
  wrap.style.display = 'block';
  updateBudget();
}

function updateBudget() {
  if (!budget) return;
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const pct     = Math.min((expense / budget) * 100, 100);

  document.getElementById('budgetUsed').textContent  = `₹${fmt(expense)} used`;
  document.getElementById('budgetLimit').textContent = `of ₹${fmt(budget)}`;
  document.getElementById('budgetFill').style.width  = pct + '%';

  const fill = document.getElementById('budgetFill');
  const msg  = document.getElementById('budgetMsg');

  fill.className = 'budget-fill';
  msg.className  = 'budget-msg';

  if (pct >= 100) {
    fill.classList.add('over');
    msg.classList.add('over');
    msg.textContent = '⚠️ Budget exceeded!';
  } else if (pct >= 75) {
    fill.classList.add('warn');
    msg.classList.add('warn');
    msg.textContent = `${(100 - pct).toFixed(0)}% of budget remaining — spend wisely!`;
  } else {
    msg.textContent = `${(100 - pct).toFixed(0)}% of budget remaining.`;
  }
}

/* ──────────────────────────────────────
   CHARTS  (vanilla canvas)
────────────────────────────────────── */
function drawCharts() {
  drawDonut();
  drawBarChart();
}

/* ── Donut chart — spending by category ── */
function drawDonut() {
  const canvas = document.getElementById('categoryChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Aggregate
  const totals = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  });

  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const total   = entries.reduce((s, [, v]) => s + v, 0);

  const COLORS = ['#7b6ef6','#00e5a0','#ff4f6d','#f9c846','#3dd6f5','#f97316','#a78bfa','#34d399','#f472b6','#60a5fa'];

  // Resize canvas for pixel ratio
  const dpr = window.devicePixelRatio || 1;
  const size = 180;
  canvas.width  = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width  = size + 'px';
  canvas.style.height = size + 'px';
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, size, size);

  if (!total) {
    ctx.fillStyle = '#252a38';
    ctx.beginPath();
    ctx.arc(90, 90, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px Space Mono';
    ctx.textAlign = 'center';
    ctx.fillText('No expenses', 90, 94);
    document.getElementById('legendWrap').innerHTML = '';
    return;
  }

  let start = -Math.PI / 2;
  entries.forEach(([cat, val], i) => {
    const slice = (val / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(90, 90);
    ctx.arc(90, 90, 72, start, start + slice);
    ctx.closePath();
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.fill();
    start += slice;
  });

  // Donut hole
  ctx.beginPath();
  ctx.arc(90, 90, 44, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1e29';
  ctx.fill();

  // Centre text
  ctx.fillStyle = '#e8eaf0';
  ctx.font = 'bold 13px Syne';
  ctx.textAlign = 'center';
  ctx.fillText('₹' + fmtShort(total), 90, 87);
  ctx.fillStyle = '#6b7280';
  ctx.font = '9px Space Mono';
  ctx.fillText('SPENT', 90, 101);

  // Legend
  const legend = document.getElementById('legendWrap');
  legend.innerHTML = entries.map(([cat, val], i) => `
    <div class="legend-item">
      <div class="legend-dot" style="background:${COLORS[i % COLORS.length]}"></div>
      ${CATEGORY_ICONS[cat]} ${capitalise(cat)}: ₹${fmt(val)}
    </div>`
  ).join('');
}

/* ── Bar chart — income vs expense ── */
function drawBarChart() {
  const canvas = document.getElementById('compareChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const income  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const maxVal  = Math.max(income, expense, 1);

  const dpr = window.devicePixelRatio || 1;
  const W = 400, H = 160;
  canvas.width  = W * dpr; canvas.height = H * dpr;
  canvas.style.width = '100%'; canvas.style.height = H + 'px';
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const barW = 60, gap = 40, padding = 60;
  const barMax = H - 40;

  const bars = [
    { label: 'Income',  value: income,  color: '#00e5a0', x: padding },
    { label: 'Expense', value: expense, color: '#ff4f6d', x: padding + barW + gap },
  ];

  bars.forEach(bar => {
    const h = (bar.value / maxVal) * barMax;
    const y = H - 24 - h;

    // Bar glow
    ctx.shadowColor = bar.color;
    ctx.shadowBlur  = 10;
    ctx.fillStyle   = bar.color + '22';
    ctx.fillRect(bar.x, H - 24 - barMax, barW, barMax);
    ctx.shadowBlur  = 0;

    // Actual bar
    ctx.fillStyle = bar.color;
    const grad = ctx.createLinearGradient(bar.x, y, bar.x, H - 24);
    grad.addColorStop(0, bar.color);
    grad.addColorStop(1, bar.color + '66');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(bar.x, y, barW, h, [4, 4, 0, 0]);
    ctx.fill();

    // Label
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px Space Mono';
    ctx.textAlign = 'center';
    ctx.fillText(bar.label, bar.x + barW / 2, H - 6);

    // Value above bar
    ctx.fillStyle = bar.color;
    ctx.font = 'bold 11px Space Mono';
    ctx.fillText('₹' + fmtShort(bar.value), bar.x + barW / 2, Math.max(y - 6, 14));
  });
}

/* ──────────────────────────────────────
   SUMMARY TAB
────────────────────────────────────── */
function updateSummary() {
  const expenses = transactions.filter(t => t.type === 'expense');
  const income   = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expTotal = expenses.reduce((s, t) => s + t.amount, 0);
  const maxExp   = expenses.length ? Math.max(...expenses.map(t => t.amount)) : 0;
  const avgExp   = expenses.length ? expTotal / expenses.length : 0;
  const savings  = income > 0 ? ((income - expTotal) / income) * 100 : 0;

  document.getElementById('statCount').textContent   = transactions.length;
  document.getElementById('statAvg').textContent     = `₹${fmt(avgExp)}`;
  document.getElementById('statMax').textContent     = `₹${fmt(maxExp)}`;
  document.getElementById('statSavings').textContent = `${Math.max(savings, 0).toFixed(1)}%`;

  // Top categories
  const catTotals = {};
  expenses.forEach(t => { catTotals[t.category] = (catTotals[t.category] || 0) + t.amount; });
  const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCat = sorted[0]?.[1] || 1;

  const topWrap = document.getElementById('topCategories');
  topWrap.innerHTML = sorted.length
    ? `<p class="top-cat-title">Top Spending Categories</p>` +
      sorted.map(([cat, val]) => `
        <div class="cat-row">
          <span class="cat-name">${CATEGORY_ICONS[cat]} ${capitalise(cat)}</span>
          <div class="cat-track"><div class="cat-fill" style="width:${(val / maxCat) * 100}%"></div></div>
          <span class="cat-val">₹${fmt(val)}</span>
        </div>`
      ).join('')
    : '';
}

/* ──────────────────────────────────────
   EXPORT CSV
────────────────────────────────────── */
function exportCSV() {
  if (!transactions.length) return showToast('No transactions to export.', 'info');
  const rows = [
    ['ID', 'Description', 'Amount', 'Type', 'Category', 'Date'],
    ...transactions.map(t => [t.id, `"${t.desc}"`, t.amount, t.type, t.category, t.date])
  ];
  const csv  = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `xpense_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exported!', 'success');
}

/* ──────────────────────────────────────
   TABS
────────────────────────────────────── */
function switchTab(name, btn) {
  activeTab = name;

  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');

  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');

  // Filter bar only for history
  document.getElementById('filterBar').style.display = name === 'history' ? 'flex' : 'none';

  if (name === 'charts')  drawCharts();
  if (name === 'summary') updateSummary();
}

/* ──────────────────────────────────────
   REFRESH ALL
────────────────────────────────────── */
function refresh() {
  updateCards();
  renderList();
  updateBudget();
  if (activeTab === 'charts')  drawCharts();
  if (activeTab === 'summary') updateSummary();
}

/* ──────────────────────────────────────
   TOAST
────────────────────────────────────── */
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = `toast show ${type}`;
  setTimeout(() => { t.className = 'toast'; }, 3000);
}

/* ──────────────────────────────────────
   HELPERS
────────────────────────────────────── */
function fmt(n)       { return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtShort(n)  { return n >= 1e5 ? (n / 1e5).toFixed(1) + 'L' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : fmt(n); }
function capitalise(s){ return s.charAt(0).toUpperCase() + s.slice(1); }
function escape(s)    { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function formatDate(d){
  const [y, m, day] = d.split('-');
  return new Date(y, m - 1, day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ──────────────────────────────────────
   Canvas roundRect polyfill
────────────────────────────────────── */
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    const rad = Array.isArray(r) ? r[0] : r;
    this.beginPath();
    this.moveTo(x + rad, y);
    this.lineTo(x + w - rad, y);
    this.quadraticCurveTo(x + w, y, x + w, y + rad);
    this.lineTo(x + w, y + h);
    this.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    this.lineTo(x + rad, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - rad);
    this.lineTo(x, y + rad);
    this.quadraticCurveTo(x, y, x + rad, y);
    this.closePath();
    return this;
  };
}
