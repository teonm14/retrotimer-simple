/** Estado y persistencia */

export let equipos = [];
export let priceConfig = { amount: 30, per: 30, unit: 'minutos' };
export let historial = [];
/** Hora límite global para tiempo libre, formato "HH:MM" o "" si no hay */
export let limiteHora = '';

export function loadState() {
  try {
    equipos = JSON.parse(localStorage.getItem('rc_equipos') || '[]');
  } catch (e) {
    equipos = [];
  }
  try {
    priceConfig = JSON.parse(
      localStorage.getItem('rc_price') || '{"amount":30,"per":30,"unit":"minutos"}'
    );
  } catch (e) {
    priceConfig = { amount: 30, per: 30, unit: 'minutos' };
  }
  try {
    historial = JSON.parse(localStorage.getItem('rc_historial') || '[]');
  } catch (e) {
    historial = [];
  }
  try {
    limiteHora = localStorage.getItem('rc_limite_hora') || '';
  } catch (e) {
    limiteHora = '';
  }

  equipos.forEach((eq) => {
    if (!eq.estado) eq.estado = 'idle';
    if (eq.notas === undefined) eq.notas = '';
    if (eq.pausado === undefined) eq.pausado = false;
    if (eq.alerted === undefined) eq.alerted = false;
    if (eq.sessionStart === undefined) eq.sessionStart = null;
    if (eq.limiteHasta === undefined) eq.limiteHasta = null;
  });
}

export function saveState() {
  localStorage.setItem('rc_equipos', JSON.stringify(equipos));
  localStorage.setItem('rc_price', JSON.stringify(priceConfig));
  localStorage.setItem('rc_historial', JSON.stringify(historial));
  localStorage.setItem('rc_limite_hora', limiteHora || '');
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

export function setLimiteHora(next) {
  limiteHora = next || '';
}

/**
 * Calcula el timestamp de la próxima ocurrencia de HH:MM (hoy o mañana).
 */
export function computeLimiteHasta(horaStr) {
  if (!horaStr || !/^\d{1,2}:\d{2}$/.test(horaStr)) return null;
  const parts = horaStr.split(':');
  const hh = Number(parts[0]);
  const mm = Number(parts[1]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  const d = new Date();
  d.setSeconds(0, 0);
  d.setHours(hh, mm, 0, 0);
  if (d.getTime() <= Date.now()) {
    d.setDate(d.getDate() + 1);
  }
  return d.getTime();
}

export function calcularPrecio(segundos) {
  const { amount, per, unit } = priceConfig;
  const perSec = unit === 'horas' ? per * 3600 : per * 60;
  if (perSec <= 0) return 0;
  return Math.ceil((segundos / perSec) * amount * 100) / 100;
}
