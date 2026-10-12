/** Calculadora + historial */

const HIST_KEY = 'rc_calc_historial';
const HIST_MAX = 30;

let calcDisplay = null;
let calcCurrent = '0';
let calcPrev = null;
let calcOp = null;
let calcFresh = true;
let lastExprLeft = null;

function loadHist() {
  try {
    return JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function saveHist(items) {
  localStorage.setItem(HIST_KEY, JSON.stringify(items.slice(0, HIST_MAX)));
}

function opLabel(op) {
  if (op === '*') return '×';
  if (op === '/') return '÷';
  return op;
}

function renderHist() {
  const list = document.getElementById('calcHistoryList');
  if (!list) return;
  const items = loadHist();
  if (items.length === 0) {
    list.innerHTML = '<p class="calc-history-empty">Sin operaciones aún</p>';
    return;
  }
  list.innerHTML = items
    .map(
      (h, i) =>
        '<div class="calc-history-item" data-idx="' +
        i +
        '">' +
        '<span class="calc-history-expr">' +
        h.expr +
        '</span>' +
        '<span class="calc-history-result" data-result="' +
        h.result +
        '" title="Usar resultado">' +
        h.result +
        '</span>' +
        '</div>'
    )
    .join('');
}

function pushHist(expr, result) {
  const items = loadHist();
  items.unshift({ expr, result, ts: Date.now() });
  saveHist(items);
  renderHist();
}

export function initCalc() {
  calcDisplay = document.getElementById('calcDisplay');
  const grid = document.querySelector('.calc-grid');
  if (!grid) return;

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-calc]');
    if (!btn) return;
    handleKey(btn.dataset.calc);
  });

  const histList = document.getElementById('calcHistoryList');
  if (histList) {
    histList.addEventListener('click', (e) => {
      const res = e.target.closest('[data-result]');
      if (!res) return;
      calcCurrent = res.getAttribute('data-result') || '0';
      calcFresh = true;
      update();
    });
  }

  const btnClear = document.getElementById('btnClearCalcHist');
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      saveHist([]);
      renderHist();
    });
  }

  renderHist();
}

function update() {
  if (calcDisplay) calcDisplay.textContent = calcCurrent;
}

export function calcReset() {
  calcCurrent = '0';
  calcPrev = null;
  calcOp = null;
  calcFresh = true;
  lastExprLeft = null;
  update();
}

function compute() {
  if (calcPrev == null || calcOp == null) return;
  const a = parseFloat(calcPrev);
  const b = parseFloat(calcCurrent);
  let r = 0;
  if (calcOp === '+') r = a + b;
  else if (calcOp === '-') r = a - b;
  else if (calcOp === '*') r = a * b;
  else if (calcOp === '/') r = b === 0 ? 0 : a / b;
  const result = String(Math.round(r * 1e10) / 1e10);
  const expr = calcPrev + ' ' + opLabel(calcOp) + ' ' + calcCurrent;
  pushHist(expr, result);
  calcCurrent = result;
  calcPrev = null;
  calcOp = null;
  calcFresh = true;
  update();
}

function handleKey(k) {
  if (k >= '0' && k <= '9') {
    if (calcFresh || calcCurrent === '0') {
      calcCurrent = k;
      calcFresh = false;
    } else {
      calcCurrent += k;
    }
    update();
    return;
  }
  if (k === '.') {
    if (calcFresh) {
      calcCurrent = '0.';
      calcFresh = false;
    } else if (calcCurrent.indexOf('.') === -1) {
      calcCurrent += '.';
    }
    update();
    return;
  }
  if (k === 'C') {
    calcReset();
    return;
  }
  if (k === '±') {
    if (calcCurrent !== '0') {
      calcCurrent = calcCurrent.charAt(0) === '-' ? calcCurrent.slice(1) : '-' + calcCurrent;
      update();
    }
    return;
  }
  if (k === '%') {
    calcCurrent = String(parseFloat(calcCurrent) / 100);
    update();
    return;
  }
  if (k === '=') {
    compute();
    return;
  }
  if ('+-*/'.indexOf(k) !== -1) {
    if (calcPrev != null && calcOp && !calcFresh) compute();
    calcPrev = calcCurrent;
    calcOp = k;
    calcFresh = true;
  }
}
