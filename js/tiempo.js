/**
 * RetroControl - Gestor de Tiempo
 * Con pausa, notas, extra en cobro e historial
 */

document.addEventListener('DOMContentLoaded', () => {
  // ---------- Estado ----------
  let equipos = JSON.parse(localStorage.getItem('rc_equipos') || '[]');
  let priceConfig = JSON.parse(localStorage.getItem('rc_price') || '{"amount":30,"per":30,"unit":"minutos"}');
  let historial = JSON.parse(localStorage.getItem('rc_historial') || '[]');

  // Migrar equipos antiguos
  equipos.forEach(eq => {
    if (!eq.estado) eq.estado = 'idle';
    if (eq.notas === undefined) eq.notas = '';
    if (eq.pausado === undefined) eq.pausado = false;
  });

  // DOM
  const equiposList = document.getElementById('equiposList');
  const historialList = document.getElementById('historialList');
  const btnAdd = document.getElementById('btnAddEquipo');
  const fabConfig = document.getElementById('fabConfig');
  const pricePanel = document.getElementById('pricePanel');
  const btnClearHistorial = document.getElementById('btnClearHistorial');

  const modalNuevo = document.getElementById('modalNuevoEquipo');
  const modalTiempo = document.getElementById('modalTiempo');
  const modalNotas = document.getElementById('modalNotas');
  const modalCobrar = document.getElementById('modalCobrar');
  const modalConfirm = document.getElementById('modalConfirm');

  let currentEquipoId = null;
  let currentTiempoAction = null;
  let confirmCallback = null;
  let cobrarContext = null; // { id, segundos, base }

  // ---------- Helpers ----------
  function save() {
    localStorage.setItem('rc_equipos', JSON.stringify(equipos));
    localStorage.setItem('rc_price', JSON.stringify(priceConfig));
    localStorage.setItem('rc_historial', JSON.stringify(historial));
  }

  function formatTime(seconds) {
    seconds = Math.max(0, Math.floor(seconds));
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  function toSeconds(valor, unidad) {
    const v = Number(valor) || 0;
    return unidad === 'horas' ? v * 3600 : v * 60;
  }

  function iconClass(tipo) {
    const t = (tipo || '').toUpperCase();
    if (t.includes('XBOX')) return 'xbox';
    if (t.includes('PLAY')) return 'playstation';
    return 'pc';
  }

  function iconLabel(tipo) {
    const t = (tipo || '').toUpperCase();
    if (t.includes('XBOX')) return 'XB';
    if (t.includes('PLAY')) return 'PS';
    return 'PC';
  }

  function calcularPrecio(segundos) {
    const { amount, per, unit } = priceConfig;
    const perSec = unit === 'horas' ? (per * 3600) : (per * 60);
    if (perSec <= 0) return 0;
    const bloques = segundos / perSec;
    return Math.ceil(bloques * amount * 100) / 100;
  }

  function formatFecha(ts) {
    const d = new Date(ts);
    return d.toLocaleString('es-MX', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  }

  // ---------- Render Historial ----------
  function renderHistorial() {
    if (!historialList) return;
    if (historial.length === 0) {
      historialList.innerHTML = '<p class="historial-empty">Sin registros aún</p>';
      return;
    }
    // Más recientes primero
    const items = [...historial].reverse();
    historialList.innerHTML = items.map(h => `
      <div class="historial-item">
        <div class="historial-item-top">
          <span class="historial-equipo">${h.nombre}</span>
          <span class="historial-tipo">${h.tipo}</span>
        </div>
        <div class="historial-item-mid">
          <span>${h.modo === 'definido' ? 'Definido' : 'Libre'}</span>
          <span>${formatTime(h.segundos)}</span>
        </div>
        <div class="historial-item-bot">
          <span class="historial-total">$${Number(h.total).toFixed(2)}</span>
          <span class="historial-fecha">${formatFecha(h.fecha)}</span>
        </div>
        ${h.notas ? `<div class="historial-notas">${h.notas}</div>` : ''}
        ${h.extra > 0 ? `<div class="historial-extra">Extra: $${Number(h.extra).toFixed(2)}</div>` : ''}
      </div>
    `).join('');
  }

  // ---------- Render Equipos ----------
  function render() {
    if (!equiposList) return;

    if (equipos.length === 0) {
      equiposList.innerHTML = '';
      return;
    }

    equiposList.innerHTML = equipos.map(eq => {
      const iconC = iconClass(eq.tipo);
      const iconL = iconLabel(eq.tipo);
      const notasBtn = `
        <button class="btn-icon btn-notas" data-action="notas" title="Notas">
          <ion-icon name="document-text-outline"></ion-icon>
        </button>`;

      // ---- IDLE ----
      if (eq.estado === 'idle') {
        return `
          <div class="equipo-row" data-id="${eq.id}">
            <div class="equipo-info">
              <div class="equipo-icon ${iconC}">${iconL}</div>
              <span class="equipo-nombre">${eq.nombre}</span>
              ${eq.notas ? '<ion-icon name="document-text" class="notas-indicator" title="Tiene notas"></ion-icon>' : ''}
            </div>
            <button class="btn-accion btn-definido" data-action="definido">Tiempo Definido</button>
            <button class="btn-accion btn-libre" data-action="libre">Tiempo Libre</button>
            ${notasBtn}
            <button class="btn-accion btn-eliminar" data-action="eliminar">
              <ion-icon name="trash-outline"></ion-icon>
            </button>
          </div>`;
      }

      // ---- DEFINIDO ----
      if (eq.estado === 'definido') {
        const restante = Math.max(0, eq.tiempoTotal - eq.tiempoTranscurrido);
        const pct = eq.tiempoTotal > 0 ? (restante / eq.tiempoTotal) * 100 : 0;
        const pauseIcon = eq.pausado ? 'play' : 'pause';
        const pauseTitle = eq.pausado ? 'Reanudar' : 'Pausar';
        return `
          <div class="equipo-row ${eq.pausado ? 'is-paused' : ''}" data-id="${eq.id}">
            <div class="equipo-info">
              <div class="equipo-icon ${iconC}">${iconL}</div>
              <span class="equipo-nombre">${eq.nombre}</span>
              ${eq.pausado ? '<span class="badge-paused">PAUSA</span>' : ''}
            </div>
            <div class="tiempo-info">
              <div class="progress-wrap">
                <div class="progress-bar" style="width:${pct}%"></div>
                <span class="progress-text">Restante: ${formatTime(restante)}</span>
              </div>
            </div>
            <div class="acciones-activas">
              <button class="btn-accion btn-pause" data-action="pause" title="${pauseTitle}">
                <ion-icon name="${pauseIcon}-outline"></ion-icon>
              </button>
              <button class="btn-accion btn-cobrar" data-action="cobrar">Cobrar</button>
              <button class="btn-accion btn-agregar" data-action="agregar">+ Tiempo</button>
              ${notasBtn}
              <button class="btn-accion btn-cancelar" data-action="cancelar">
                <ion-icon name="close-outline"></ion-icon>
              </button>
            </div>
          </div>`;
      }

      // ---- LIBRE ----
      if (eq.estado === 'libre') {
        const transcurrido = eq.tiempoTranscurrido || 0;
        const limiteTotal = eq.limiteTotal || 0;
        const limiteRestante = Math.max(0, limiteTotal - transcurrido);
        const pct = limiteTotal > 0 ? (limiteRestante / limiteTotal) * 100 : 100;
        const pauseIcon = eq.pausado ? 'play' : 'pause';
        const pauseTitle = eq.pausado ? 'Reanudar' : 'Pausar';
        return `
          <div class="equipo-row ${eq.pausado ? 'is-paused' : ''}" data-id="${eq.id}">
            <div class="equipo-info">
              <div class="equipo-icon ${iconC}">${iconL}</div>
              <span class="equipo-nombre">${eq.nombre}</span>
              ${eq.pausado ? '<span class="badge-paused">PAUSA</span>' : ''}
            </div>
            <div class="tiempo-info">
              <div class="progress-wrap">
                <div class="progress-bar" style="width:${pct}%"></div>
                <span class="progress-text">${formatTime(transcurrido)} / Límite ${formatTime(limiteRestante)}</span>
              </div>
            </div>
            <div class="acciones-activas">
              <button class="btn-accion btn-pause" data-action="pause" title="${pauseTitle}">
                <ion-icon name="${pauseIcon}-outline"></ion-icon>
              </button>
              <button class="btn-accion btn-restar" data-action="restar">− Tiempo</button>
              <button class="btn-accion btn-cobrar" data-action="cobrar">Cobrar</button>
              ${notasBtn}
              <button class="btn-accion btn-cancelar" data-action="cancelar">
                <ion-icon name="close-outline"></ion-icon>
              </button>
            </div>
          </div>`;
      }

      return '';
    }).join('');
  }

  // ---------- Tick ----------
  function tick() {
    let changed = false;
    const now = Date.now();

    equipos.forEach(eq => {
      if (eq.pausado || !eq.startTimestamp) return;

      if (eq.estado === 'definido') {
        const elapsed = Math.floor((now - eq.startTimestamp) / 1000) + (eq.pausedAccum || 0);
        if (elapsed !== eq.tiempoTranscurrido) {
          eq.tiempoTranscurrido = Math.min(elapsed, eq.tiempoTotal);
          changed = true;
        }
      }

      if (eq.estado === 'libre') {
        const elapsed = Math.floor((now - eq.startTimestamp) / 1000) + (eq.pausedAccum || 0);
        if (elapsed !== eq.tiempoTranscurrido) {
          eq.tiempoTranscurrido = elapsed;
          changed = true;
        }
      }
    });

    if (changed) {
      render();
      save();
    }
  }

  setInterval(tick, 1000);

  // ---------- Modales helpers ----------
  function openModal(el) { el.hidden = false; }
  function closeModal(el) { el.hidden = true; }

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay);
    });
  });

  // ---------- Añadir equipo ----------
  btnAdd.addEventListener('click', () => {
    document.getElementById('inputNombre').value = '';
    document.getElementById('inputTipo').value = 'PC';
    openModal(modalNuevo);
    setTimeout(() => document.getElementById('inputNombre').focus(), 50);
  });

  document.getElementById('btnAceptarNuevo').addEventListener('click', () => {
    const nombre = document.getElementById('inputNombre').value.trim();
    const tipo = document.getElementById('inputTipo').value;
    if (!nombre) {
      document.getElementById('inputNombre').focus();
      return;
    }
    equipos.push({
      id: Date.now(),
      nombre,
      tipo,
      estado: 'idle',
      tiempoTotal: 0,
      tiempoTranscurrido: 0,
      limiteTotal: 0,
      startTimestamp: null,
      pausedAccum: 0,
      pausado: false,
      notas: ''
    });
    save();
    render();
    closeModal(modalNuevo);
  });

  // ---------- Acciones de fila ----------
  equiposList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const row = btn.closest('.equipo-row');
    if (!row) return;
    const id = Number(row.dataset.id);
    const eq = equipos.find(x => x.id === id);
    if (!eq) return;

    const action = btn.dataset.action;
    currentEquipoId = id;

    if (action === 'definido') {
      currentTiempoAction = 'definido';
      document.getElementById('modalTiempoTitle').textContent = 'Tiempo Definido';
      document.getElementById('inputTiempoValor').value = '0';
      document.getElementById('inputTiempoUnidad').value = 'minutos';
      openModal(modalTiempo);
    }

    if (action === 'libre') {
      currentTiempoAction = 'limite';
      document.getElementById('modalTiempoTitle').textContent = 'Establecer límite';
      document.getElementById('inputTiempoValor').value = '0';
      document.getElementById('inputTiempoUnidad').value = 'horas';
      openModal(modalTiempo);
    }

    if (action === 'agregar') {
      currentTiempoAction = 'agregar';
      document.getElementById('modalTiempoTitle').textContent = 'Agregar Tiempo';
      document.getElementById('inputTiempoValor').value = '0';
      document.getElementById('inputTiempoUnidad').value = 'minutos';
      openModal(modalTiempo);
    }

    if (action === 'restar') {
      currentTiempoAction = 'restar';
      document.getElementById('modalTiempoTitle').textContent = 'Restar Tiempo';
      document.getElementById('inputTiempoValor').value = '0';
      document.getElementById('inputTiempoUnidad').value = 'minutos';
      openModal(modalTiempo);
    }

    if (action === 'pause') {
      if (eq.pausado) {
        // Reanudar
        eq.pausado = false;
        eq.startTimestamp = Date.now();
      } else {
        // Pausar: congelar el acumulado
        if (eq.startTimestamp) {
          const now = Date.now();
          eq.pausedAccum = Math.floor((now - eq.startTimestamp) / 1000) + (eq.pausedAccum || 0);
          if (eq.estado === 'definido') {
            eq.pausedAccum = Math.min(eq.pausedAccum, eq.tiempoTotal);
          }
          eq.tiempoTranscurrido = eq.pausedAccum;
        }
        eq.startTimestamp = null;
        eq.pausado = true;
      }
      save();
      render();
    }

    if (action === 'notas') {
      document.getElementById('inputNotas').value = eq.notas || '';
      openModal(modalNotas);
      setTimeout(() => document.getElementById('inputNotas').focus(), 50);
    }

    if (action === 'eliminar') {
      confirmCallback = () => {
        equipos = equipos.filter(x => x.id !== id);
        save();
        render();
      };
      document.getElementById('confirmTitle').textContent = '¿Eliminar equipo?';
      document.getElementById('confirmText').textContent = `Se eliminará "${eq.nombre}".`;
      openModal(modalConfirm);
    }

    if (action === 'cancelar') {
      confirmCallback = () => {
        eq.estado = 'idle';
        eq.tiempoTotal = 0;
        eq.tiempoTranscurrido = 0;
        eq.limiteTotal = 0;
        eq.startTimestamp = null;
        eq.pausedAccum = 0;
        eq.pausado = false;
        save();
        render();
      };
      document.getElementById('confirmTitle').textContent = '¿Cancelar sesión?';
      document.getElementById('confirmText').textContent = 'Se detendrá el contador y se perderá el tiempo actual.';
      openModal(modalConfirm);
    }

    if (action === 'cobrar') {
      // Tiempo utilizado = lo que realmente corrió
      let segundosUsados = eq.tiempoTranscurrido || 0;
      if (eq.estado === 'definido' && !eq.pausado && eq.startTimestamp) {
        // Asegurar valor fresco
        const now = Date.now();
        segundosUsados = Math.min(
          Math.floor((now - eq.startTimestamp) / 1000) + (eq.pausedAccum || 0),
          eq.tiempoTotal
        );
      }
      if (eq.estado === 'libre' && !eq.pausado && eq.startTimestamp) {
        const now = Date.now();
        segundosUsados = Math.floor((now - eq.startTimestamp) / 1000) + (eq.pausedAccum || 0);
      }

      const base = calcularPrecio(segundosUsados);
      cobrarContext = { id, segundos: segundosUsados, base, modo: eq.estado, nombre: eq.nombre, tipo: eq.tipo, notas: eq.notas || '' };

      document.getElementById('cobrarInfo').textContent = `Tiempo utilizado: ${formatTime(segundosUsados)}`;
      document.getElementById('cobrarBase').textContent = `Tiempo: $${base.toFixed(2)}`;
      document.getElementById('inputExtra').value = '0';
      updateCobrarTotal();
      openModal(modalCobrar);
    }
  });

  function updateCobrarTotal() {
    if (!cobrarContext) return;
    const extra = Number(document.getElementById('inputExtra').value) || 0;
    const total = cobrarContext.base + extra;
    document.getElementById('cobrarTotal').textContent = `Total a cobrar: $${total.toFixed(2)}`;
  }

  document.getElementById('inputExtra').addEventListener('input', updateCobrarTotal);

  document.getElementById('btnConfirmarCobrar').addEventListener('click', () => {
    if (!cobrarContext) return;
    const extra = Number(document.getElementById('inputExtra').value) || 0;
    const total = cobrarContext.base + extra;

    // Guardar en historial
    historial.push({
      id: Date.now(),
      nombre: cobrarContext.nombre,
      tipo: cobrarContext.tipo,
      modo: cobrarContext.modo,
      segundos: cobrarContext.segundos,
      base: cobrarContext.base,
      extra,
      total,
      notas: cobrarContext.notas,
      fecha: Date.now()
    });

    // Reset equipo
    const eq = equipos.find(x => x.id === cobrarContext.id);
    if (eq) {
      eq.estado = 'idle';
      eq.tiempoTotal = 0;
      eq.tiempoTranscurrido = 0;
      eq.limiteTotal = 0;
      eq.startTimestamp = null;
      eq.pausedAccum = 0;
      eq.pausado = false;
    }

    cobrarContext = null;
    save();
    render();
    renderHistorial();
    closeModal(modalCobrar);
  });

  // ---------- Modal tiempo ----------
  document.getElementById('btnAceptarTiempo').addEventListener('click', () => {
    const valor = document.getElementById('inputTiempoValor').value;
    const unidad = document.getElementById('inputTiempoUnidad').value;
    const segs = toSeconds(valor, unidad);
    const eq = equipos.find(x => x.id === currentEquipoId);
    if (!eq) return;

    if (currentTiempoAction === 'definido') {
      if (segs <= 0) return;
      eq.estado = 'definido';
      eq.tiempoTotal = segs;
      eq.tiempoTranscurrido = 0;
      eq.startTimestamp = Date.now();
      eq.pausedAccum = 0;
      eq.pausado = false;
    }

    if (currentTiempoAction === 'agregar') {
      if (segs <= 0) return;
      const restanteActual = Math.max(0, eq.tiempoTotal - eq.tiempoTranscurrido);
      eq.tiempoTotal = eq.tiempoTranscurrido + restanteActual + segs;
    }

    if (currentTiempoAction === 'limite') {
      eq.estado = 'libre';
      eq.limiteTotal = segs;
      eq.tiempoTranscurrido = 0;
      eq.startTimestamp = Date.now();
      eq.pausedAccum = 0;
      eq.pausado = false;
    }

    if (currentTiempoAction === 'restar') {
      if (segs <= 0) return;
      eq.tiempoTranscurrido = Math.max(0, (eq.tiempoTranscurrido || 0) - segs);
      eq.pausedAccum = eq.tiempoTranscurrido;
      if (!eq.pausado) {
        eq.startTimestamp = Date.now();
      }
    }

    save();
    render();
    closeModal(modalTiempo);
  });

  // ---------- Notas ----------
  document.getElementById('btnGuardarNotas').addEventListener('click', () => {
    const eq = equipos.find(x => x.id === currentEquipoId);
    if (eq) {
      eq.notas = document.getElementById('inputNotas').value.trim();
      save();
      render();
    }
    closeModal(modalNotas);
  });

  // ---------- Confirm ----------
  document.getElementById('btnConfirmSi').addEventListener('click', () => {
    if (typeof confirmCallback === 'function') confirmCallback();
    confirmCallback = null;
    closeModal(modalConfirm);
  });
  document.getElementById('btnConfirmNo').addEventListener('click', () => {
    confirmCallback = null;
    closeModal(modalConfirm);
  });

  // ---------- Precio ----------
  function loadPriceUI() {
    document.getElementById('priceAmount').value = priceConfig.amount;
    document.getElementById('pricePer').value = priceConfig.per;
    document.getElementById('priceUnit').value = priceConfig.unit;
  }

  fabConfig.addEventListener('click', () => {
    if (pricePanel.hidden) {
      loadPriceUI();
      pricePanel.hidden = false;
    } else {
      pricePanel.hidden = true;
    }
  });

  document.getElementById('btnSavePrice').addEventListener('click', () => {
    priceConfig = {
      amount: Number(document.getElementById('priceAmount').value) || 0,
      per: Number(document.getElementById('pricePer').value) || 1,
      unit: document.getElementById('priceUnit').value
    };
    save();
    pricePanel.hidden = true;
  });

  document.addEventListener('click', (e) => {
    if (!pricePanel.hidden && !pricePanel.contains(e.target) && e.target !== fabConfig && !fabConfig.contains(e.target)) {
      pricePanel.hidden = true;
    }
  });

  // ---------- Limpiar historial ----------
  btnClearHistorial.addEventListener('click', () => {
    confirmCallback = () => {
      historial = [];
      save();
      renderHistorial();
    };
    document.getElementById('confirmTitle').textContent = '¿Limpiar historial?';
    document.getElementById('confirmText').textContent = 'Se borrarán todos los registros de cobros.';
    openModal(modalConfirm);
  });

  // ---------- Init ----------
  render();
  renderHistorial();
});
