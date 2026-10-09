/** Estado y persistencia */

export let equipos = [];
export let priceConfig = { amount: 30, per: 30, unit: 'minutos' };
export let historial = [];

export function loadState() {
  try {
    equipos = JSON.parse(localStorage.getItem('rc_equipos') || '[]');
  } catch (e) {
    equipos = [];
  }
  try {
    priceConfig = JSON.parse(localStorage.getItem('rc_price') || '{"amount":30,"per":30,"unit":"minutos"}');
  } catch (e) {
    priceConfig = { amount: 30, per: 30, unit: 'minutos' };
  }
  try {
    historial = JSON.parse(localStorage.getItem('rc_historial') || '[]');
  } catch (e) {
    historial = [];
  }

  equipos.forEach((eq) => {
    if (!eq.estado) eq.estado = 'idle';
    if (eq.notas === undefined) eq.notas = '';
    if (eq.pausado === undefined) eq.pausado = false;
    if (eq.alerted === undefined) eq.alerted = false;
    if (eq.sessionStart === undefined) eq.sessionStart = null;
  });
}

export function saveState() {
  localStorage.setItem('rc_equipos', JSON.stringify(equipos));
  localStorage.setItem('rc_price', JSON.stringify(priceConfig));
  localStorage.setItem('rc_historial', JSON.stringify(historial));
}

export function setEquipos(next) {
  equipos = next;
}

export function setPriceConfig(next) {
  priceConfig = next;
}

export function setHistorial(next) {
  historial = next;
}

export function calcularPrecio(segundos) {
  const { amount, per, unit } = priceConfig;
  const perSec = unit === 'horas' ? per * 3600 : per * 60;
  if (perSec <= 0) return 0;
  return Math.ceil((segundos / perSec) * amount * 100) / 100;
}
