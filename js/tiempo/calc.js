/** Calculadora */

let calcDisplay = null;
let calcCurrent = '0';
let calcPrev = null;
let calcOp = null;
let calcFresh = true;

export function initCalc() {
  calcDisplay = document.getElementById('calcDisplay');
  const grid = document.querySelector('.calc-grid');
  if (!grid) return;

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-calc]');
    if (!btn) return;
    handleKey(btn.dataset.calc);
  });
}

function update() {
  if (calcDisplay) calcDisplay.textContent = calcCurrent;
}

export function calcReset() {
  calcCurrent = '0';
  calcPrev = null;
  calcOp = null;
  calcFresh = true;
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
  calcCurrent = String(Math.round(r * 1e10) / 1e10);
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
