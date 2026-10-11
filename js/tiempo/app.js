/**
 * RetroControl - Gestor de Tiempo (entry)
 * Módulos: state, timers, render, cobro, historial, calc
 */

import {
  loadState,
  saveState,
  equipos,
  setEquipos,
  priceConfig,
  setPriceConfig,
  historial,
  limiteHora,
  setLimiteHora,
  computeLimiteHasta
} from './state.js';
import { getTranscurrido, tickOnce } from './timers.js';
import { renderEquipos, renderVencidos, updateTimersUI } from './render.js';
import { renderHistorial, clearHistorial } from './historial.js';
import {
  initCobroUI,
  openCobrarModal,
  setCobroCallbacks,
  updateCobrarTotal
} from './cobro.js';
import { initCalc, calcReset } from './calc.js';
import { toSeconds, openModal, closeModal } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  loadState();

  const equiposList = document.getElementById('equiposList');
  const historialList = document.getElementById('historialList');
  const vencidosBanner = document.getElementById('vencidosBanner');
  const btnAdd = document.getElementById('btnAddEquipo');
  const fabConfig = document.getElementById('fabConfig');
  const pricePanel = document.getElementById('pricePanel');
  const toolsMenu = document.getElementById('toolsMenu');
  const btnClearHistorial = document.getElementById('btnClearHistorial');

  const modalNuevo = document.getElementById('modalNuevoEquipo');
  const modalTiempo = document.getElementById('modalTiempo');
  const modalConfirm = document.getElementById('modalConfirm');
  const modalCalc = document.getElementById('modalCalc');

  let currentEquipoId = null;
  let currentTiempoAction = null;
  let confirmCallback = null;
  let editingEquipoId = null;

  function refresh() {
    renderEquipos(equiposList);
    renderHistorial(historialList);
    renderVencidos(vencidosBanner);
  }

  function softRefreshTimers() {
    updateTimersUI(equiposList);
    renderVencidos(vencidosBanner);
  }

  setCobroCallbacks({
    afterCobro: () => refresh(),
    afterUndo: () => refresh()
  });

  initCobroUI();
  initCalc();

  /* ----- Tick ----- */
  setInterval(() => {
    tickOnce();
    softRefreshTimers();
  }, 1000);

  /* ----- Notas ----- */
  equiposList.addEventListener('input', (e) => {
    const input = e.target.closest('.notas-input');
    if (!input) return;
    const id = Number(input.dataset.id);
    const eq = equipos.find((x) => x.id === id);
    if (eq) {
      eq.notas = input.value;
      localStorage.setItem('rc_equipos', JSON.stringify(equipos));
      input.style.height = 'auto';
      const max = 5 * 22;
      input.style.height = Math.min(input.scrollHeight, max) + 'px';
    }
  });

  /* ----- Añadir / editar equipo ----- */
  function openAddEquipo() {
    editingEquipoId = null;
    document.getElementById('modalEquipoTitle').textContent = 'Nuevo Equipo';
    document.getElementById('inputNombre').value = '';
    document.getElementById('inputTipo').value = 'PC';
    openModal(modalNuevo);
    setTimeout(() => document.getElementById('inputNombre').focus(), 50);
  }

  if (btnAdd) btnAdd.addEventListener('click', openAddEquipo);

  function acceptEquipoModal() {
    const nombre = document.getElementById('inputNombre').value.trim();
    const tipo = document.getElementById('inputTipo').value;
    if (!nombre) {
      document.getElementById('inputNombre').focus();
      return;
    }
    if (editingEquipoId != null) {
      const eqEdit = equipos.find((x) => x.id === editingEquipoId);
      if (eqEdit) {
        eqEdit.nombre = nombre;
        eqEdit.tipo = tipo;
      }
      editingEquipoId = null;
    } else {
      equipos.push({
        id: Date.now(),
        nombre,
        tipo,
        estado: 'idle',
        tiempoTotal: 0,
        tiempoTranscurrido: 0,
        limiteTotal: 0,
        startTimestamp: null,
        sessionStart: null,
        limiteHasta: null,
        pausedAccum: 0,
        pausado: false,
        notas: '',
        alerted: false
      });
    }
    saveState();
    refresh();
    closeModal(modalNuevo);
  }

  document.getElementById('btnAceptarNuevo').addEventListener('click', acceptEquipoModal);
  const btnCancelarNuevo = document.getElementById('btnCancelarNuevo');
  if (btnCancelarNuevo) {
    btnCancelarNuevo.addEventListener('click', () => {
      editingEquipoId = null;
      closeModal(modalNuevo);
    });
  }

  /* ----- Acciones de fila ----- */
  equiposList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const row = btn.closest('.equipo-row');
    if (!row) return;
    const id = Number(row.dataset.id);
    const eq = equipos.find((x) => x.id === id);
    if (!eq) return;

    const action = btn.dataset.action;
    currentEquipoId = id;

    if (action === 'editar') {
      editingEquipoId = id;
      document.getElementById('modalEquipoTitle').textContent = 'Editar Equipo';
      document.getElementById('inputNombre').value = eq.nombre || '';
      document.getElementById('inputTipo').value = eq.tipo || 'PC';
      openModal(modalNuevo);
      setTimeout(() => document.getElementById('inputNombre').focus(), 50);
      return;
    }

    if (action === 'definido') {
      currentTiempoAction = 'definido';
      document.getElementById('modalTiempoTitle').textContent = 'Tiempo Definido';
      openTiempoModal(0, 30);
    }

    if (action === 'libre') {
      // Inicia sin modal; el límite es "hasta hora" del panel de herramientas
      const t = Date.now();
      eq.estado = 'libre';
      eq.tiempoTranscurrido = 0;
      eq.pausedAccum = 0;
      eq.pausado = false;
      eq.alerted = false;
      eq.startTimestamp = t;
      eq.sessionStart = t;
      eq.limiteTotal = 0;
      eq.limiteHasta = computeLimiteHasta(limiteHora);
      saveState();
      refresh();
    }

    if (action === 'agregar') {
      currentTiempoAction = 'agregar';
      document.getElementById('modalTiempoTitle').textContent = 'Agregar Tiempo';
      openTiempoModal(0, 15);
    }

    if (action === 'restar') {
      currentTiempoAction = 'restar';
      document.getElementById('modalTiempoTitle').textContent = 'Restar del tiempo usado';
      openTiempoModal(0, 5);
    }

    if (action === 'pause') {
      if (eq.pausado) {
        eq.pausado = false;
        eq.startTimestamp = Date.now();
      } else {
        if (eq.startTimestamp) {
          const now = Date.now();
          eq.pausedAccum = Math.floor((now - eq.startTimestamp) / 1000) + (eq.pausedAccum || 0);
          if (eq.estado === 'definido') {
            eq.pausedAccum = Math.min(eq.pausedAccum, eq.tiempoTotal || 0);
          }
          eq.tiempoTranscurrido = eq.pausedAccum;
        }
        eq.startTimestamp = null;
        eq.pausado = true;
      }
      saveState();
      refresh();
    }

    if (action === 'eliminar') {
      confirmCallback = () => {
        setEquipos(equipos.filter((x) => x.id !== id));
        saveState();
        refresh();
      };
      document.getElementById('confirmTitle').textContent = '¿Eliminar equipo?';
      document.getElementById('confirmText').textContent = 'Se eliminará "' + eq.nombre + '".';
      openModal(modalConfirm);
    }

    if (action === 'cancelar') {
      confirmCallback = () => {
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
        saveState();
        refresh();
      };
      document.getElementById('confirmTitle').textContent = '¿Cancelar sesión?';
      document.getElementById('confirmText').textContent =
        'Se detendrá el contador y se perderá el tiempo actual.';
      openModal(modalConfirm);
    }

    if (action === 'cobrar') {
      openCobrarModal(eq);
    }
  });

  /* ----- Modal tiempo (steppers horas / minutos) ----- */
  let draftTiempoH = 0;
  let draftTiempoM = 30;

  function pad2t(n) {
    return String(n).padStart(2, '0');
  }

  function syncTiempoUI() {
    const hEl = document.getElementById('tiempoHoraDisplay');
    const mEl = document.getElementById('tiempoMinDisplay');
    const hint = document.getElementById('tiempoTotalHint');
    if (hEl) hEl.textContent = String(draftTiempoH);
    if (mEl) mEl.textContent = pad2t(draftTiempoM);
    const totalMin = draftTiempoH * 60 + draftTiempoM;
    if (hint) {
      if (totalMin < 60) hint.textContent = 'Total: ' + totalMin + ' min';
      else {
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        hint.textContent = 'Total: ' + h + ' h' + (m ? ' ' + m + ' min' : '');
      }
    }
    document.querySelectorAll('#tiempoPresets .limite-chip').forEach((chip) => {
      const mins = Number(chip.getAttribute('data-mins'));
      chip.classList.toggle('is-active', mins === totalMin);
    });
  }

  function openTiempoModal(h, m) {
    draftTiempoH = h || 0;
    draftTiempoM = m || 0;
    syncTiempoUI();
    openModal(modalTiempo);
  }

  function getTiempoSegundos() {
    return draftTiempoH * 3600 + draftTiempoM * 60;
  }

  const btnTHUp = document.getElementById('btnTiempoHoraUp');
  const btnTHDown = document.getElementById('btnTiempoHoraDown');
  const btnTMUp = document.getElementById('btnTiempoMinUp');
  const btnTMDown = document.getElementById('btnTiempoMinDown');
  if (btnTHUp) {
    btnTHUp.addEventListener('click', () => {
      draftTiempoH = Math.min(24, draftTiempoH + 1);
      syncTiempoUI();
    });
  }
  if (btnTHDown) {
    btnTHDown.addEventListener('click', () => {
      draftTiempoH = Math.max(0, draftTiempoH - 1);
      syncTiempoUI();
    });
  }
  if (btnTMUp) {
    btnTMUp.addEventListener('click', () => {
      draftTiempoM += 5;
      if (draftTiempoM >= 60) {
        draftTiempoM = 0;
        draftTiempoH = Math.min(24, draftTiempoH + 1);
      }
      syncTiempoUI();
    });
  }
  if (btnTMDown) {
    btnTMDown.addEventListener('click', () => {
      draftTiempoM -= 5;
      if (draftTiempoM < 0) {
        if (draftTiempoH > 0) {
          draftTiempoH -= 1;
          draftTiempoM = 55;
        } else {
          draftTiempoM = 0;
        }
      }
      syncTiempoUI();
    });
  }
  const tiempoPresets = document.getElementById('tiempoPresets');
  if (tiempoPresets) {
    tiempoPresets.addEventListener('click', (e) => {
      const chip = e.target.closest('.limite-chip');
      if (!chip) return;
      const mins = Number(chip.getAttribute('data-mins')) || 0;
      draftTiempoH = Math.floor(mins / 60);
      draftTiempoM = mins % 60;
      syncTiempoUI();
    });
  }

  document.getElementById('btnAceptarTiempo').addEventListener('click', () => {
    const segs = getTiempoSegundos();
    const eq = equipos.find((x) => x.id === currentEquipoId);
    if (!eq) return;

    if (currentTiempoAction === 'definido') {
      if (segs <= 0) return;
      eq.estado = 'definido';
      eq.tiempoTotal = segs;
      eq.tiempoTranscurrido = 0;
      eq.startTimestamp = Date.now();
      eq.sessionStart = null;
      eq.pausedAccum = 0;
      eq.pausado = false;
      eq.alerted = false;
    }

    if (currentTiempoAction === 'agregar') {
      if (segs <= 0) return;
      const trans = getTranscurrido(eq);
      const restanteActual = Math.max(0, (eq.tiempoTotal || 0) - trans);
      eq.tiempoTotal = trans + restanteActual + segs;
      if (!eq.pausado && eq.startTimestamp) eq.tiempoTranscurrido = trans;
      eq.alerted = false;
    }

    if (currentTiempoAction === 'restar') {
      // Resta del tiempo transcurrido (definido y libre)
      if (segs <= 0) return;
      const actual = getTranscurrido(eq);
      const nuevo = Math.max(0, actual - segs);
      eq.tiempoTranscurrido = nuevo;
      eq.pausedAccum = nuevo;
      if (!eq.pausado) eq.startTimestamp = Date.now();
      if (eq.estado === 'definido' && eq.tiempoTranscurrido < eq.tiempoTotal) {
        eq.alerted = false;
      }
      if (eq.estado === 'libre' && eq.limiteHasta && Date.now() < eq.limiteHasta) {
        eq.alerted = false;
      }
    }

    saveState();
    refresh();
    closeModal(modalTiempo);
  });

  const btnCancelarTiempo = document.getElementById('btnCancelarTiempo');
  if (btnCancelarTiempo) {
    btnCancelarTiempo.addEventListener('click', () => closeModal(modalTiempo));
  }

  /* ----- Confirm ----- */
  document.getElementById('btnConfirmSi').addEventListener('click', () => {
    if (typeof confirmCallback === 'function') confirmCallback();
    confirmCallback = null;
    closeModal(modalConfirm);
  });
  document.getElementById('btnConfirmNo').addEventListener('click', () => {
    confirmCallback = null;
    closeModal(modalConfirm);
  });

  /* ----- Tools / precio / calc ----- */
  function closeTools() {
    if (toolsMenu) toolsMenu.hidden = true;
    if (pricePanel) pricePanel.hidden = true;
    const limPanel = document.getElementById('limitePanel');
    if (limPanel) limPanel.hidden = true;
  }

  function loadPriceUI() {
    document.getElementById('priceAmount').value = priceConfig.amount;
    document.getElementById('pricePer').value = priceConfig.per;
    document.getElementById('priceUnit').value = priceConfig.unit;
  }

  if (fabConfig) {
    fabConfig.addEventListener('click', (e) => {
      e.stopPropagation();
      if (toolsMenu.hidden) {
        pricePanel.hidden = true;
        toolsMenu.hidden = false;
      } else {
        closeTools();
      }
    });
  }

  const btnMenuPrecio = document.getElementById('btnMenuPrecio');
  if (btnMenuPrecio) {
    btnMenuPrecio.addEventListener('click', (e) => {
      e.stopPropagation();
      toolsMenu.hidden = true;
      loadPriceUI();
      pricePanel.hidden = false;
    });
  }

  const btnMenuCalc = document.getElementById('btnMenuCalc');
  if (btnMenuCalc) {
    btnMenuCalc.addEventListener('click', (e) => {
      e.stopPropagation();
      toolsMenu.hidden = true;
      calcReset();
      openModal(modalCalc);
    });
  }

  const limitePanel = document.getElementById('limitePanel');
  const btnMenuLimite = document.getElementById('btnMenuLimite');
  let draftHora = 22;
  let draftMin = 0;

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function syncLimiteUI() {
    const hEl = document.getElementById('limiteHoraDisplay');
    const mEl = document.getElementById('limiteMinDisplay');
    const hidden = document.getElementById('inputLimiteHora');
    if (hEl) hEl.textContent = pad2(draftHora);
    if (mEl) mEl.textContent = pad2(draftMin);
    if (hidden) hidden.value = pad2(draftHora) + ':' + pad2(draftMin);
    document.querySelectorAll('.limite-chip').forEach((chip) => {
      const v = chip.getAttribute('data-hora');
      chip.classList.toggle('is-active', v === pad2(draftHora) + ':' + pad2(draftMin));
    });
  }

  function loadDraftFromConfig() {
    if (limiteHora && /^\d{1,2}:\d{2}$/.test(limiteHora)) {
      const parts = limiteHora.split(':');
      draftHora = Math.min(23, Math.max(0, Number(parts[0]) || 0));
      draftMin = Math.min(59, Math.max(0, Number(parts[1]) || 0));
    } else {
      draftHora = 22;
      draftMin = 0;
    }
    syncLimiteUI();
  }

  if (btnMenuLimite) {
    btnMenuLimite.addEventListener('click', (e) => {
      e.stopPropagation();
      toolsMenu.hidden = true;
      loadDraftFromConfig();
      if (limitePanel) limitePanel.hidden = false;
    });
  }

  const btnHoraUp = document.getElementById('btnHoraUp');
  const btnHoraDown = document.getElementById('btnHoraDown');
  const btnMinUp = document.getElementById('btnMinUp');
  const btnMinDown = document.getElementById('btnMinDown');
  if (btnHoraUp) {
    btnHoraUp.addEventListener('click', (e) => {
      e.stopPropagation();
      draftHora = (draftHora + 1) % 24;
      syncLimiteUI();
    });
  }
  if (btnHoraDown) {
    btnHoraDown.addEventListener('click', (e) => {
      e.stopPropagation();
      draftHora = (draftHora + 23) % 24;
      syncLimiteUI();
    });
  }
  if (btnMinUp) {
    btnMinUp.addEventListener('click', (e) => {
      e.stopPropagation();
      draftMin = (draftMin + 5) % 60;
      syncLimiteUI();
    });
  }
  if (btnMinDown) {
    btnMinDown.addEventListener('click', (e) => {
      e.stopPropagation();
      draftMin = (draftMin + 55) % 60;
      syncLimiteUI();
    });
  }

  const limitePresets = document.getElementById('limitePresets');
  if (limitePresets) {
    limitePresets.addEventListener('click', (e) => {
      const chip = e.target.closest('.limite-chip');
      if (!chip) return;
      e.stopPropagation();
      const v = chip.getAttribute('data-hora') || '22:00';
      const parts = v.split(':');
      draftHora = Number(parts[0]) || 0;
      draftMin = Number(parts[1]) || 0;
      syncLimiteUI();
    });
  }

  const btnSaveLimite = document.getElementById('btnSaveLimite');
  if (btnSaveLimite) {
    btnSaveLimite.addEventListener('click', () => {
      const val = pad2(draftHora) + ':' + pad2(draftMin);
      setLimiteHora(val);
      const hasta = computeLimiteHasta(val);
      equipos.forEach((eq) => {
        if (eq.estado === 'libre') {
          eq.limiteHasta = hasta;
          if (hasta && Date.now() < hasta) eq.alerted = false;
        }
      });
      saveState();
      if (limitePanel) limitePanel.hidden = true;
      refresh();
    });
  }
  const btnClearLimite = document.getElementById('btnClearLimite');
  if (btnClearLimite) {
    btnClearLimite.addEventListener('click', () => {
      setLimiteHora('');
      equipos.forEach((eq) => {
        if (eq.estado === 'libre') {
          eq.limiteHasta = null;
          eq.alerted = false;
        }
      });
      saveState();
      draftHora = 22;
      draftMin = 0;
      syncLimiteUI();
      const hidden = document.getElementById('inputLimiteHora');
      if (hidden) hidden.value = '';
      if (limitePanel) limitePanel.hidden = true;
      refresh();
    });
  }

  document.getElementById('btnSavePrice').addEventListener('click', () => {
    setPriceConfig({
      amount: Number(document.getElementById('priceAmount').value) || 0,
      per: Number(document.getElementById('pricePer').value) || 1,
      unit: document.getElementById('priceUnit').value
    });
    saveState();
    pricePanel.hidden = true;
  });

  document.addEventListener('click', (e) => {
    if (
      toolsMenu &&
      !toolsMenu.hidden &&
      !toolsMenu.contains(e.target) &&
      e.target !== fabConfig &&
      !(fabConfig && fabConfig.contains(e.target))
    ) {
      toolsMenu.hidden = true;
    }
    if (
      pricePanel &&
      !pricePanel.hidden &&
      !pricePanel.contains(e.target) &&
      e.target !== fabConfig &&
      !(fabConfig && fabConfig.contains(e.target))
    ) {
      pricePanel.hidden = true;
    }
    const limP = document.getElementById('limitePanel');
    if (
      limP &&
      !limP.hidden &&
      !limP.contains(e.target) &&
      e.target !== fabConfig &&
      !(fabConfig && fabConfig.contains(e.target))
    ) {
      limP.hidden = true;
    }
  });

  const btnCerrarCalc = document.getElementById('btnCerrarCalc');
  if (btnCerrarCalc) {
    btnCerrarCalc.addEventListener('click', () => closeModal(modalCalc));
  }

  /* ----- Historial toggle ----- */
  function setHistorialVisible(visible) {
    const sidebar = document.getElementById('historialSidebar');
    const label = document.getElementById('toggleHistorialLabel');
    if (sidebar) sidebar.classList.toggle('is-hidden', !visible);
    if (label) label.textContent = visible ? 'Ocultar' : 'Historial';
    localStorage.setItem('rc_historial_visible', visible ? '1' : '0');
  }

  const histPref = localStorage.getItem('rc_historial_visible');
  setHistorialVisible(histPref !== '0');

  const btnToggleHistorial = document.getElementById('btnToggleHistorial');
  if (btnToggleHistorial) {
    btnToggleHistorial.addEventListener('click', () => {
      const sidebar = document.getElementById('historialSidebar');
      const visible = sidebar && sidebar.classList.contains('is-hidden');
      setHistorialVisible(visible);
    });
  }

  const btnHideHistorial = document.getElementById('btnHideHistorial');
  if (btnHideHistorial) {
    btnHideHistorial.addEventListener('click', () => setHistorialVisible(false));
  }

  if (btnClearHistorial) {
    btnClearHistorial.addEventListener('click', () => {
      confirmCallback = () => {
        clearHistorial();
        renderHistorial(historialList);
      };
      document.getElementById('confirmTitle').textContent = '¿Limpiar historial?';
      document.getElementById('confirmText').textContent =
        'Se borrarán todos los registros de cobros.';
      openModal(modalConfirm);
    });
  }

  /* ----- Cerrar modales al click fuera ----- */
  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay);
    });
  });

  /* ----- Teclado: Enter en modales + atajos N / C ----- */
  document.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) || '';
    const isTyping =
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT' ||
      (e.target && e.target.isContentEditable);

    // Atajos globales (no mientras se escribe, excepto en modales con Enter)
    if (!isTyping && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (e.key === 'n' || e.key === 'N') {
        // Solo si no hay modal abierto
        const anyModal = document.querySelector('.modal-overlay:not([hidden])');
        if (!anyModal) {
          e.preventDefault();
          openAddEquipo();
          return;
        }
      }
      if (e.key === 'c' || e.key === 'C') {
        const anyModal = document.querySelector('.modal-overlay:not([hidden])');
        if (!anyModal) {
          // Cobrar el primer equipo activo vencido, o el primero activo
          const activo =
            equipos.find(
              (eq) =>
                (eq.estado === 'definido' || eq.estado === 'libre') &&
                (eq.alerted || false)
            ) || equipos.find((eq) => eq.estado === 'definido' || eq.estado === 'libre');
          if (activo) {
            e.preventDefault();
            openCobrarModal(activo);
            return;
          }
        }
      }
    }

    if (e.key !== 'Enter') return;
    if (e.target.classList.contains('notas-input')) return;

    if (modalNuevo && !modalNuevo.hidden) {
      e.preventDefault();
      acceptEquipoModal();
      return;
    }
    if (modalTiempo && !modalTiempo.hidden) {
      e.preventDefault();
      document.getElementById('btnAceptarTiempo').click();
      return;
    }
    const modalCobrar = document.getElementById('modalCobrar');
    if (modalCobrar && !modalCobrar.hidden) {
      e.preventDefault();
      document.getElementById('btnConfirmarCobrar').click();
      return;
    }
    if (modalConfirm && !modalConfirm.hidden) {
      e.preventDefault();
      document.getElementById('btnConfirmSi').click();
    }
  });


  /* ----- Filtros historial ----- */
  function refreshHistorial() {
    renderHistorial(historialList);
  }
  ['histSearch', 'histTipo', 'histFecha', 'histMontoMin', 'histMontoMax'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const evt = id === 'histSearch' || id === 'histMontoMin' || id === 'histMontoMax' ? 'input' : 'change';
    el.addEventListener(evt, refreshHistorial);
  });

  refresh();
});
