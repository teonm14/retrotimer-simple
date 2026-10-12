/** Calculadora + historial (expresión completa solo al pulsar =) */

const HIST_KEY = 'rc_calc_historial';
const HIST_MAX = 40;

let calcDisplay = null;
let calcCurrent = '0';
let calcPrev = null;
let calcOp = null;
let calcFresh = true;
/** Tokens de la expresión en curso, ej. ['5', '+', '3', '+'] */
let exprParts = [];
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

function isOpToken(t) {
  return t === '+' || t === '-' || t === '×' || t === '÷' || t === '*' || t === '/';
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
      exprParts = [];
      calcPrev = null;
      calcOp = null;
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

  if (keyHandler) document.removeEventListener('keydown', keyHandler, true);
  keyHandler = (e) => {
    if (!isCalcOpen()) return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    let k = null;
    if (e.key >= '0' && e.key <= '9') k = e.key;
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

/** AC: borra todo (entrada, operación pendiente y expresión) */
export function calcReset() {
  calcCurrent = '0';
  calcPrev = null;
  calcOp = null;
  calcFresh = true;
  exprParts = [];
  update();
}

/** C: solo borra el número que se está escribiendo (mantiene la operación) */
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
 * Calcula resultado parcial o final.
 * NO escribe en historial (el historial se arma en handleKey '=').
 */
function computeSilent() {
  if (calcPrev == null || calcOp == null) return null;
  const a = parseFloat(calcPrev);
  const b = parseFloat(calcCurrent);
  let r = 0;
  if (calcOp === '+') r = a + b;
  else if (calcOp === '-') r = a - b;
  else if (calcOp === '*') r = a * b;
  else if (calcOp === '/') r = b === 0 ? 0 : a / b;
  const result = String(Math.round(r * 1e10) / 1e10);
  calcCurrent = result;
  calcPrev = null;
  calcOp = null;
  calcFresh = true;
  update();
  return result;
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
      calcFresh = false;
      update();
    }
    return;
  }
  if (k === '%') {
    calcCurrent = String(parseFloat(calcCurrent) / 100);
    calcFresh = false;
    update();
    return;
  }

  if (k === '=') {
    if (calcPrev == null || calcOp == null) return;
    // Completar expresión con el operando actual
    exprParts.push(calcCurrent);
    const fullExpr = exprParts.join(' ');
    const result = computeSilent();
    if (result != null) {
      pushHist(fullExpr, result);
    }
    exprParts = [];
    return;
  }

  if ('+-*/'.indexOf(k) !== -1) {
    const label = opLabel(k);

    // Cambiar operador antes de escribir el siguiente número
    if (calcFresh && calcOp != null && calcPrev != null) {
      calcOp = k;
      if (exprParts.length && isOpToken(exprParts[exprParts.length - 1])) {
        exprParts[exprParts.length - 1] = label;
      }
      return;
    }

    // Cadena: 5 + 3 + … → calcula intermedio SIN historial
    if (calcPrev != null && calcOp != null && !calcFresh) {
      exprParts.push(calcCurrent);
      computeSilent();
      exprParts.push(label);
      calcPrev = calcCurrent;
      calcOp = k;
      calcFresh = true;
      return;
    }

    // Primera operación de la expresión
    exprParts = [calcCurrent, label];
    calcPrev = calcCurrent;
    calcOp = k;
    calcFresh = true;
  }
}
