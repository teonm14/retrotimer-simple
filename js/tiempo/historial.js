/** Historial de cobros + filtros */

import { historial, setHistorial, saveState } from './state.js';
import { formatTime, formatFecha, escapeHtml } from './utils.js';

export function getHistorialFiltersFromDOM() {
  const search = (document.getElementById('histSearch') || {}).value || '';
  const tipo = (document.getElementById('histTipo') || {}).value || '';
  const fecha = (document.getElementById('histFecha') || {}).value || '';
  const montoMin = (document.getElementById('histMontoMin') || {}).value;
  const montoMax = (document.getElementById('histMontoMax') || {}).value;
  return {
    search: String(search).trim().toLowerCase(),
    tipo,
    fecha,
    montoMin: montoMin === '' || montoMin == null ? null : Number(montoMin),
    montoMax: montoMax === '' || montoMax == null ? null : Number(montoMax)
  };
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function matchesFecha(ts, filtro) {
  if (!filtro) return true;
  const day = startOfDay(ts);
  const today = startOfDay(Date.now());
  if (filtro === 'hoy') return day === today;
  if (filtro === 'ayer') return day === today - 86400000;
  if (filtro === '7d') return ts >= Date.now() - 7 * 86400000;
  return true;
}

export function filterHistorial(filters) {
  const f = filters || getHistorialFiltersFromDOM();
  return historial.filter((h) => {
    if (f.tipo && String(h.tipo || '').toUpperCase() !== f.tipo.toUpperCase()) {
      return false;
    }
    if (!matchesFecha(h.fecha, f.fecha)) return false;
    const total = Number(h.total) || 0;
    if (f.montoMin != null && !Number.isNaN(f.montoMin) && total < f.montoMin) return false;
    if (f.montoMax != null && !Number.isNaN(f.montoMax) && total > f.montoMax) return false;
    if (f.search) {
      const blob = ((h.nombre || '') + ' ' + (h.notas || '')).toLowerCase();
      if (blob.indexOf(f.search) === -1) return false;
    }
    return true;
  });
}

export function renderHistorial(historialList, filters) {
  if (!historialList) return;

  if (historial.length === 0) {
    historialList.innerHTML =
      '<p class="historial-empty">Sin registros aún.<br>Los cobros aparecerán aquí.</p>';
    return;
  }

  const filtered = filterHistorial(filters);
  if (filtered.length === 0) {
    historialList.innerHTML =
      '<p class="historial-empty">Ningún cobro coincide con los filtros.</p>';
    return;
  }

  const items = filtered.slice().reverse();
  historialList.innerHTML = items
    .map(
      (h) =>
        '<div class="historial-item">' +
        '<div class="historial-item-top">' +
        '<span class="historial-equipo">' +
        escapeHtml(h.nombre) +
        '</span>' +
        '<span class="historial-tipo">' +
        escapeHtml(h.tipo) +
        '</span>' +
        '</div>' +
        '<div class="historial-item-mid">' +
        '<span>' +
        (h.modo === 'definido' ? 'Definido' : 'Libre') +
        '</span>' +
        '<span>' +
        formatTime(h.segundos) +
        '</span>' +
        '</div>' +
        '<div class="historial-item-bot">' +
        '<span class="historial-total">$' +
        Number(h.total).toFixed(2) +
        '</span>' +
        '<span class="historial-fecha">' +
        formatFecha(h.fecha) +
        '</span>' +
        '</div>' +
        (h.notas ? '<div class="historial-notas">' + escapeHtml(h.notas) + '</div>' : '') +
        (h.extra > 0
          ? '<div class="historial-extra">Extra: $' + Number(h.extra).toFixed(2) + '</div>'
          : '') +
        '</div>'
    )
    .join('');
}

export function clearHistorial() {
  setHistorial([]);
  saveState();
}

export function removeHistorialById(id) {
  setHistorial(historial.filter((h) => h.id !== id));
  saveState();
}
