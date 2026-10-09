/** Historial de cobros */

import { historial, setHistorial, saveState } from './state.js';
import { formatTime, formatFecha, escapeHtml } from './utils.js';

export function renderHistorial(historialList) {
  if (!historialList) return;
  if (historial.length === 0) {
    historialList.innerHTML =
      '<p class="historial-empty">Sin registros aún.<br>Los cobros aparecerán aquí.</p>';
    return;
  }
  const items = historial.slice().reverse();
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
