/**
 * RetroControl - Gestor de Tiempo (completo)
 */

document.addEventListener('DOMContentLoaded', () => {
  // ---------- Estado ----------
  let equipos = JSON.parse(localStorage.getItem('rc_equipos') || '[]');
  let priceConfig = JSON.parse(localStorage.getItem('rc_price') || '{"amount":30,"per":30,"unit":"minutos"}');

  // Referencias DOM
  const equiposList = document.getElementById('equiposList');
  const btnAdd = document.getElementById('btnAddEquipo');
  const fabConfig = document.getElementById('fabConfig');
  const pricePanel = document.getElementById('pricePanel');

  // Modales
  const modalNuevo = document.getElementById('modalNuevoEquipo');
  const modalTiempo = document.getElementById('modalTiempo');
  const modalCobrar = document.getElementById('modalCobrar');
  const modalConfirm = document.getElementById('modalConfirm');

  // Contexto temporal para modales
  let currentEquipoId = null;
  let currentTiempoAction = null; // 'definido' | 'agregar' | 'limite' | 'restar'
  let confirmCallback = null;

  // ---------- Helpers ----------
  function save() {
    localStorage.setItem('rc_equipos', JSON.stringify(equipos));
    localStorage.setItem('rc_price', JSON.stringify(priceConfig));
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

  /** Calcula el precio según el tiempo en segundos y la config actual */
  function calcularPrecio(segundos) {
    const { amount, per, unit } = priceConfig;
    const perSec = unit === 'horas' ? (per * 3600) : (per * 60);
    if (perSec <= 0) return 0;
    // Cobramos por bloques completos + proporción del último
    const bloques = segundos / perSec;
    return Math.ceil(bloques * amount * 100) / 100; // redondeo a 2 decimales hacia arriba
  }

  // ---------- Render ----------
  function render() {
    if (!equiposList) return;

    if (equipos.length === 0) {
      equiposList.innerHTML = '';
      return;
    }

    equiposList.innerHTML = equipos.map(eq => {
      const iconC = iconClass(eq.tipo);
      const iconL = iconLabel(eq.tipo);

      // ---- Estado IDLE ----
      if (eq.estado === 'idle') {
        return `
          <div class="equipo-row" data-id="${eq.id}">
            <div class="equipo-info">
              <div class="equipo-icon ${iconC}">${iconL}</div>
              <span class="equipo-nombre">${eq.nombre}</span>
            </div>
            <button class="btn-accion btn-definido" data-action="definido">Tiempo Definido</button>
            <button class="btn-accion btn-libre" data-action="libre">Tiempo Libre</button>
            <button class="btn-accion btn-eliminar" data-action="eliminar">Eliminar</button>
          </div>`;
      }

      // ---- Estado DEFINIDO (temporizador) ----
      if (eq.estado === 'definido') {
        const restante = Math.max(0, eq.tiempoTotal - eq.tiempoTranscurrido);
        const pct = eq.tiempoTotal > 0 ? (restante / eq.tiempoTotal) * 100 : 0;
        return `
          <div class="equipo-row" data-id="${eq.id}">
            <div class="equipo-info">
              <div class="equipo-icon ${iconC}">${iconL}</div>
              <span class="equipo-nombre">${eq.nombre}</span>
            </div>
            <div class="tiempo-info">
              <div class="progress-wrap">
                <div class="progress-bar" style="width:${pct}%"></div>
                <span class="progress-text">Restante: ${formatTime(restante)}</span>
              </div>
            </div>
            <div class="acciones-activas">
              <button class="btn-accion btn-cobrar" data-action="cobrar">Cobrar</button>
              <button class="btn-accion btn-agregar" data-action="agregar">Agregar Tiempo</button>
              <button class="btn-accion btn-cancelar" data-action="cancelar">Cancelar</button>
            </div>
          </div>`;
      }

      // ---- Estado LIBRE (cronómetro + límite) ----
      if (eq.estado === 'libre') {
        const transcurrido = eq.tiempoTranscurrido || 0;
        const limiteTotal = eq.limiteTotal || 0;
        const limiteRestante = Math.max(0, limiteTotal - transcurrido);
        // Barra basada en el límite restante (si hay límite). Si límite = 0, barra llena.
        const pct = limiteTotal > 0 ? (limiteRestante / limiteTotal) * 100 : 100;
        return `
          <div class="equipo-row" data-id="${eq.id}">
            <div class="equipo-info">
              <div class="equipo-icon ${iconC}">${iconL}</div>
              <span class="equipo-nombre">${eq.nombre}</span>
            </div>
            <div class="tiempo-info">
              <div class="progress-wrap">
                <div class="progress-bar" style="width:${pct}%"></div>
                <span class="progress-text">Transcurrido: ${formatTime(transcurrido)} · Límite: ${formatTime(limiteRestante)}</span>
              </div>
            </div>
            <div class="acciones-activas">
              <button class="btn-accion btn-restar" data-action="restar">Restar Tiempo</button>
              <button class="btn-accion btn-cobrar" data-action="cobrar">Cobrar</button>
              <button class="btn-accion btn-cancelar" data-action="cancelar">Cancelar</button>
            </div>
          </div>`;
      }

      return '';
    }).join('');
  }

  // ---------- Tick (cada segundo) ----------
  function tick() {
    let changed = false;
    const now = Date.now();

    equipos.forEach(eq => {
      if (eq.estado === 'definido' && eq.startTimestamp) {
        const elapsed = Math.floor((now - eq.startTimestamp) / 1000) + (eq.pausedAccum || 0);
        if (elapsed !== eq.tiempoTranscurrido) {
          eq.tiempoTranscurrido = elapsed;
          changed = true;
          // Si se acabó el tiempo, se queda en 0 (no auto-cobra)
          if (eq.tiempoTranscurrido >= eq.tiempoTotal) {
            eq.tiempoTranscurrido = eq.tiempoTotal;
          }
        }
      }

      if (eq.estado === 'libre' && eq.startTimestamp) {
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

  // ---------- Abrir / Cerrar modales ----------
  function openModal(el) {
    el.hidden = false;
  }
  function closeModal(el) {
    el.hidden = true;
  }

  // Cerrar al hacer click fuera del modal
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
      pausedAccum: 0
    });
    save();
    render();
    closeModal(modalNuevo);
  });

  // ---------- Click en acciones de fila ----------
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

    if (action === 'eliminar') {
      confirmCallback = () => {
        equipos = equipos.filter(x => x.id !== id);
        save();
        render();
      };
      document.getElementById('confirmTitle').textContent = '¿Eliminar equipo?';
      document.getElementById('confirmText').textContent = `Se eliminará "${eq.nombre}". Esta acción no se puede deshacer.`;
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
        save();
        render();
      };
      document.getElementById('confirmTitle').textContent = '¿Cancelar sesión?';
      document.getElementById('confirmText').textContent = 'Se detendrá el contador y se perderá el tiempo actual.';
      openModal(modalConfirm);
    }

    if (action === 'cobrar') {
      let segundosUsados = 0;
      if (eq.estado === 'definido') {
        // En modo definido cobramos el tiempo configurado (o el transcurrido si prefieres)
        segundosUsados = eq.tiempoTotal; // o eq.tiempoTranscurrido si quieres solo lo usado
      } else if (eq.estado === 'libre') {
        segundosUsados = eq.tiempoTranscurrido || 0;
      }
      const total = calcularPrecio(segundosUsados);
      document.getElementById('cobrarInfo').textContent = `Tiempo utilizado: ${formatTime(segundosUsados)}`;
      document.getElementById('cobrarTotal').textContent = `Total a cobrar: $${total.toFixed(2)}`;
      openModal(modalCobrar);

      // Al cerrar el cobrar, volvemos a idle (se considera cobrado)
      document.getElementById('btnCerrarCobrar').onclick = () => {
        closeModal(modalCobrar);
        eq.estado = 'idle';
        eq.tiempoTotal = 0;
        eq.tiempoTranscurrido = 0;
        eq.limiteTotal = 0;
        eq.startTimestamp = null;
        eq.pausedAccum = 0;
        save();
        render();
      };
    }
  });

  // ---------- Aceptar modal de tiempo ----------
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
    }

    if (currentTiempoAction === 'agregar') {
      if (segs <= 0) return;
      // Sumar al total restante
      const restanteActual = Math.max(0, eq.tiempoTotal - eq.tiempoTranscurrido);
      // Re-ajustamos: el nuevo total = transcurrido + (restante + agregado)
      eq.tiempoTotal = eq.tiempoTranscurrido + restanteActual + segs;
      // No tocamos startTimestamp para que el contador siga fluido
    }

    if (currentTiempoAction === 'limite') {
      // Puede ser 0 (sin límite real, solo cronómetro)
      eq.estado = 'libre';
      eq.limiteTotal = segs;
      eq.tiempoTranscurrido = 0;
      eq.startTimestamp = Date.now();
      eq.pausedAccum = 0;
    }

    if (currentTiempoAction === 'restar') {
      if (segs <= 0) return;
      // Restar solo del tiempo transcurrido (cronómetro)
      eq.tiempoTranscurrido = Math.max(0, (eq.tiempoTranscurrido || 0) - segs);
      // Ajustar el timestamp para que el tick no lo vuelva a sumar de golpe
      if (eq.startTimestamp) {
        eq.pausedAccum = eq.tiempoTranscurrido;
        eq.startTimestamp = Date.now();
      }
    }

    save();
    render();
    closeModal(modalTiempo);
  });

  // ---------- Confirmación ----------
  document.getElementById('btnConfirmSi').addEventListener('click', () => {
    if (typeof confirmCallback === 'function') confirmCallback();
    confirmCallback = null;
    closeModal(modalConfirm);
  });
  document.getElementById('btnConfirmNo').addEventListener('click', () => {
    confirmCallback = null;
    closeModal(modalConfirm);
  });

  // ---------- Panel de precios ----------
  function loadPriceUI() {
    document.getElementById('priceAmount').value = priceConfig.amount;
    document.getElementById('pricePer').value = priceConfig.per;
    document.getElementById('priceUnit').value = priceConfig.unit;
  }

  fabConfig.addEventListener('click', () => {
    const isHidden = pricePanel.hidden;
    if (isHidden) {
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

  // Cerrar panel al hacer click fuera
  document.addEventListener('click', (e) => {
    if (!pricePanel.hidden &&
        !pricePanel.contains(e.target) &&
        e.target !== fabConfig) {
      pricePanel.hidden = true;
    }
  });

  // ---------- Init ----------
  // Asegurar que equipos antiguos tengan estado
  equipos.forEach(eq => {
    if (!eq.estado) eq.estado = 'idle';
  });
  render();
});
