/** Cobro, ticket e deshacer */

import { equipos, historial, calcularPrecio, saveState } from './state.js';
import { getTranscurrido } from './timers.js';
import { formatTime, formatFechaLarga, openModal, closeModal } from './utils.js';
import { removeHistorialById } from './historial.js';

const UNDO_MS = 20000;

let cobrarContext = null;
let lastCobro = null; // { historialId, timeoutId, sessionSnapshot }
let onAfterCobro = null;
let onUndo = null;

export function setCobroCallbacks({ afterCobro, afterUndo }) {
  onAfterCobro = afterCobro;
  onUndo = afterUndo;
}

export function getCobrarContext() {
  return cobrarContext;
}

export function openCobrarModal(eq) {
  const segundosUsados = getTranscurrido(eq);
  const segundosCompleto = eq.estado === 'definido' ? (eq.tiempoTotal || segundosUsados) : segundosUsados;
  const baseUsado = calcularPrecio(segundosUsados);
  const baseCompleto = calcularPrecio(segundosCompleto);

  cobrarContext = {
    id: eq.id,
    segundosUsados,
    segundosCompleto,
    baseUsado,
    baseCompleto,
    segundos: segundosUsados,
    base: baseUsado,
    modo: eq.estado,
    nombre: eq.nombre,
    tipo: eq.tipo,
    notas: eq.notas || '',
    tipoCobro: 'usado'
  };

  document.getElementById('cobrarInfo').textContent =
    'Tiempo utilizado: ' + formatTime(segundosUsados) +
    (eq.estado === 'definido'
      ? ' · Contratado: ' + formatTime(segundosCompleto)
      : '');

  const modoWrap = document.getElementById('cobrarModoWrap');
  const radioUsado = document.getElementById('cobrarModoUsado');
  const radioCompleto = document.getElementById('cobrarModoCompleto');
  if (modoWrap) {
    if (eq.estado === 'definido') {
      modoWrap.hidden = false;
      if (radioUsado) radioUsado.checked = true;
      if (radioCompleto) radioCompleto.checked = false;
    } else {
      modoWrap.hidden = true;
    }
  }

  document.getElementById('inputExtra').value = '0';
  applyTipoCobro('usado');
  openModal(document.getElementById('modalCobrar'));
}

function applyTipoCobro(tipo) {
  if (!cobrarContext) return;
  cobrarContext.tipoCobro = tipo;
  if (tipo === 'completo') {
    cobrarContext.segundos = cobrarContext.segundosCompleto;
    cobrarContext.base = cobrarContext.baseCompleto;
    document.getElementById('cobrarBase').textContent =
      'Tiempo completo: $' + cobrarContext.base.toFixed(2);
  } else {
    cobrarContext.segundos = cobrarContext.segundosUsados;
    cobrarContext.base = cobrarContext.baseUsado;
    document.getElementById('cobrarBase').textContent =
      'Tiempo usado: $' + cobrarContext.base.toFixed(2);
  }
  updateCobrarTotal();
}

export function updateCobrarTotal() {
  if (!cobrarContext) return;
  const extra = Number(document.getElementById('inputExtra').value) || 0;
  document.getElementById('cobrarTotal').textContent =
    'Total a cobrar: $' + (cobrarContext.base + extra).toFixed(2);
}

export function confirmarCobro() {
  if (!cobrarContext) return;
  const extra = Number(document.getElementById('inputExtra').value) || 0;
  const total = cobrarContext.base + extra;
  const fecha = Date.now();
  const historialId = fecha;

  const entry = {
    id: historialId,
    nombre: cobrarContext.nombre,
    tipo: cobrarContext.tipo,
    modo: cobrarContext.modo,
    segundos: cobrarContext.segundos,
    base: cobrarContext.base,
    extra,
    total,
    notas: cobrarContext.notas,
    tipoCobro: cobrarContext.tipoCobro || 'usado',
    fecha
  };

  historial.push(entry);

  // Snapshot de la sesión para poder deshacer y restaurar datos
  const eq = equipos.find((x) => x.id === cobrarContext.id);
  let sessionSnapshot = null;
  if (eq) {
    // Congelar transcurrido actual antes de guardar
    const trans = getTranscurrido(eq);
    sessionSnapshot = {
      equipoId: eq.id,
      estado: eq.estado,
      tiempoTotal: eq.tiempoTotal || 0,
      tiempoTranscurrido: trans,
      limiteTotal: eq.limiteTotal || 0,
      limiteHasta: eq.limiteHasta || null,
      sessionStart: eq.sessionStart,
      pausedAccum: trans,
      pausado: true,
      notas: eq.notas || '',
      alerted: eq.alerted || false
    };

    eq.estado = 'idle';
    eq.tiempoTotal = 0;
    eq.tiempoTranscurrido = 0;
    eq.limiteTotal = 0;
    eq.limiteHasta = null;
    eq.startTimestamp = null;
    eq.sessionStart = null;
    eq.pausedAccum = 0;
    eq.pausado = false;
    eq.alerted = false;
    eq.notas = '';
  }

  saveState();
  closeModal(document.getElementById('modalCobrar'));

  showTicket(entry);
  scheduleUndo(historialId, sessionSnapshot);

  const ctx = cobrarContext;
  cobrarContext = null;
  if (typeof onAfterCobro === 'function') onAfterCobro(ctx);
}

function showTicket(entry) {
  const modal = document.getElementById('modalTicket');
  if (!modal) return;

  document.getElementById('ticketEquipo').textContent = entry.nombre + ' (' + entry.tipo + ')';
  document.getElementById('ticketModo').textContent =
    entry.modo === 'definido' ? 'Tiempo definido' : 'Tiempo libre';
  document.getElementById('ticketTiempo').textContent = formatTime(entry.segundos);
  document.getElementById('ticketBase').textContent = '$' + Number(entry.base).toFixed(2);
  document.getElementById('ticketExtra').textContent = '$' + Number(entry.extra || 0).toFixed(2);
  document.getElementById('ticketTotal').textContent = '$' + Number(entry.total).toFixed(2);
  document.getElementById('ticketHora').textContent = formatFechaLarga(entry.fecha);
  document.getElementById('ticketNotas').textContent = entry.notas || '—';

  openModal(modal);
}

export function printTicket() {
  window.print();
}

function scheduleUndo(historialId, sessionSnapshot) {
  if (lastCobro && lastCobro.timeoutId) {
    clearTimeout(lastCobro.timeoutId);
  }

  const toast = document.getElementById('undoToast');
  if (toast) {
    toast.hidden = false;
    toast.classList.add('visible');
  }

  const timeoutId = setTimeout(() => {
    hideUndo();
    lastCobro = null;
  }, UNDO_MS);

  lastCobro = { historialId, timeoutId, sessionSnapshot };
}

function hideUndo() {
  const toast = document.getElementById('undoToast');
  if (toast) {
    toast.classList.remove('visible');
    toast.hidden = true;
  }
}

export function undoLastCobro() {
  if (!lastCobro) return;
  clearTimeout(lastCobro.timeoutId);
  removeHistorialById(lastCobro.historialId);

  // Restaurar sesión del equipo si aún existe
  const snap = lastCobro.sessionSnapshot;
  if (snap) {
    const eq = equipos.find((x) => x.id === snap.equipoId);
    if (eq) {
      eq.estado = snap.estado;
      eq.tiempoTotal = snap.tiempoTotal;
      eq.tiempoTranscurrido = snap.tiempoTranscurrido;
      eq.limiteTotal = snap.limiteTotal;
      eq.limiteHasta = snap.limiteHasta || null;
      eq.sessionStart = snap.sessionStart;
      eq.pausedAccum = snap.pausedAccum;
      eq.pausado = true;
      eq.startTimestamp = null;
      eq.notas = snap.notas || '';
      eq.alerted = snap.alerted || false;
      saveState();
    }
  }

  lastCobro = null;
  hideUndo();
  // Cerrar ticket si sigue abierto
  closeModal(document.getElementById('modalTicket'));
  if (typeof onUndo === 'function') onUndo();
}

export function initCobroUI() {
  const inputExtra = document.getElementById('inputExtra');
  if (inputExtra) inputExtra.addEventListener('input', updateCobrarTotal);

  const radioUsado = document.getElementById('cobrarModoUsado');
  const radioCompleto = document.getElementById('cobrarModoCompleto');
  if (radioUsado) {
    radioUsado.addEventListener('change', () => {
      if (radioUsado.checked) applyTipoCobro('usado');
    });
  }
  if (radioCompleto) {
    radioCompleto.addEventListener('change', () => {
      if (radioCompleto.checked) applyTipoCobro('completo');
    });
  }

  const btnConfirmar = document.getElementById('btnConfirmarCobrar');
  if (btnConfirmar) btnConfirmar.addEventListener('click', confirmarCobro);

  const btnCancelar = document.getElementById('btnCancelarCobrar');
  if (btnCancelar) {
    btnCancelar.addEventListener('click', () => {
      cobrarContext = null;
      closeModal(document.getElementById('modalCobrar'));
    });
  }

  const btnCerrarTicket = document.getElementById('btnCerrarTicket');
  if (btnCerrarTicket) {
    btnCerrarTicket.addEventListener('click', () => {
      closeModal(document.getElementById('modalTicket'));
    });
  }

  const btnPrint = document.getElementById('btnPrintTicket');
  if (btnPrint) btnPrint.addEventListener('click', printTicket);

  const btnUndo = document.getElementById('btnUndoCobro');
  if (btnUndo) btnUndo.addEventListener('click', undoLastCobro);
}
