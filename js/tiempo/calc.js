/** Calculadora + historial (solo al pulsar =) */

const HIST_KEY = 'rc_calc_historial';
const HIST_MAX = 40;

let calcDisplay = null;
let calcCurrent = '0';
let calcPrev = null;
let calcOp = null;
let calcFresh = true;
let keyHandler = null;

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
      (h) =>
        '<div class="calc-history-item">' +
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

function isCalcOpen() {
  const modal = document.getElementById('modalCalc');
  return modal && !modal.hidden;
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

  // Teclado / pad numérico mientras la calculadora esté abierta
  if (keyHandler) document.removeEventListener('keydown', keyHandler, true);
  keyHandler = (e) => {
    if (!isCalcOpen()) return;
    // no interferir si se escribe en un input (no hay inputs en calc, pero por seguridad)
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    let k = null;
    if (e.key >= '0' && e.key <= '9') k = e.key;
    else if (e.code && e.code.startsWith('Numpad') && e.key >= '0' && e.key <= '9') k = e.key;
    else if (e.key === '.' || e.key === ',' || e.code === 'NumpadDecimal') k = '.';
    else if (e.key === '+' || e.code === 'NumpadAdd') k = '+';
    else if (e.key === '-' || e.code === 'NumpadSubtract') k = '-';
    else if (e.key === '*' || e.code === 'NumpadMultiply') k = '*';
    else if (e.key === '/' || e.code === 'NumpadDivide') k = '/';
    else if (e.key === 'Enter' || e.key === '=' || e.code === 'NumpadEnter') k = '=';
    else if (e.key === 'Backspace') k = 'Backspace';
    else if (e.key === 'Escape') k = 'AC';
    else if (e.key === 'Delete') k = 'C';
    else if (e.key === '%') k = '%';

    if (!k) return;
    e.preventDefault();
    e.stopPropagation();
    handleKey(k);
  };
  document.addEventListener('keydown', keyHandler, true);

  renderHist();
}

function update() {
  if (calcDisplay) calcDisplay.textContent = calcCurrent;
}

/** AC: borra todo */
export function calcReset() {
  calcCurrent = '0';
  calcPrev = null;
  calcOp = null;
  calcFresh = true;
  update();
}

/** C: borra solo la entrada actual */
function clearEntry() {
  calcCurrent = '0';
  calcFresh = true;
  update();
}

function backspace() {
  if (calcFresh) return;
  if (calcCurrent.length <= 1 || (calcCurrent.length === 2 && calcCurrent.charAt(0) === '-')) {
    calcCurrent = '0';
    calcFresh = true;
  } else {
    calcCurrent = calcCurrent.slice(0, -1);
  }
  update();
}

/**
 * Calcula el resultado parcial.
 * @param {boolean} record Si true, guarda en historial (solo al pulsar =)
 */
function compute(record) {
  if (calcPrev == null || calcOp == null) return;
  const a = parseFloat(calcPrev);
  const b = parseFloat(calcCurrent);
  let r = 0;
  if (calcOp === '+') r = a + b;
  else if (calcOp === '-') r = a - b;
  else if (calcOp === '*') r = a * b;
  else if (calcOp === '/') r = b === 0 ? 0 : a / b;
  const result = String(Math.round(r * 1e10) / 1e10);
  if (record) {
    const expr = calcPrev + ' ' + opLabel(calcOp) + ' ' + calcCurrent;
    pushHist(expr, result);
  }
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
  if (k === 'AC') {
    calcReset();
    return;
  }
  if (k === 'C') {
    clearEntry();
    return;
  }
  if (k === 'Backspace') {
    backspace();
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
    // Solo aquí se registra en historial
    compute(true);
    return;
  }
  if ('+-*/'.indexOf(k) !== -1) {
    // Operaciones intermedias: calcula sin historial
    if (calcPrev != null && calcOp && !calcFresh) compute(false);
    calcPrev = calcCurrent;
    calcOp = k;
    calcFresh = true;
  }
}
