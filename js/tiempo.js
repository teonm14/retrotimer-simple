/**
 * RetroControl - Gestor de Tiempo
 *
 * Tiempo Libre:
 *  - Transcurrido (cronómetro de cobro): se puede pausar y restar
 *  - Límite: corre con reloj de pared desde sessionStart; NO se afecta por pausa ni por restar
 */

document.addEventListener('DOMContentLoaded', () => {
  let equipos = JSON.parse(localStorage.getItem('rc_equipos') || '[]');
  let priceConfig = JSON.parse(localStorage.getItem('rc_price') || '{"amount":30,"per":30,"unit":"minutos"}');
  let historial = JSON.parse(localStorage.getItem('rc_historial') || '[]');

  equipos.forEach(eq => {
    if (!eq.estado) eq.estado = 'idle';
    if (eq.notas === undefined) eq.notas = '';
    if (eq.pausado === undefined) eq.pausado = false;
    if (eq.alerted === undefined) eq.alerted = false;
    if (eq.sessionStart === undefined) eq.sessionStart = null;
  });

  const equiposList = document.getElementById('equiposList');
  const historialList = document.getElementById('historialList');
  const btnAdd = document.getElementById('btnAddEquipo');
  const fabConfig = document.getElementById('fabConfig');
  const pricePanel = document.getElementById('pricePanel');
  const btnClearHistorial = document.getElementById('btnClearHistorial');

  const modalNuevo = document.getElementById('modalNuevoEquipo');
  const modalTiempo = document.getElementById('modalTiempo');
  const modalCobrar = document.getElementById('modalCobrar');
  const modalConfirm = document.getElementById('modalConfirm');

  let currentEquipoId = null;
  let currentTiempoAction = null;
  let confirmCallback = null;
  let cobrarContext = null;

  function playFinishSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        const start = now + i * 0.18;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.35, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
        osc.start(start);
        osc.stop(start + 0.22);
      });
    } catch (e) { /* ignore */ }
  }

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
    return h + ':' + m + ':' + s;
  }

  function toSeconds(valor, unidad) {
    const v = Number(valor) || 0;
    return unidad === 'horas' ? v * 3600 : v * 60;
  }

  function iconName(tipo) {
    const t = (tipo || '').toUpperCase();
    if (t.includes('XBOX')) return 'logo-xbox';
    if (t.includes('PLAY')) return 'logo-playstation';
    return 'desktop-outline';
  }

  function iconClass(tipo) {
    const t = (tipo || '').toUpperCase();
    if (t.includes('XBOX')) return 'xbox';
    if (t.includes('PLAY')) return 'playstation';
    return 'pc';
  }

  function calcularPrecio(segundos) {
    const amount = priceConfig.amount;
    const per = priceConfig.per;
    const unit = priceConfig.unit;
    const perSec = unit === 'horas' ? (per * 3600) : (per * 60);
    if (perSec <= 0) return 0;
    return Math.ceil((segundos / perSec) * amount * 100) / 100;
  }

  function formatFecha(ts) {
    return new Date(ts).toLocaleString('es-MX', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function getTranscurrido(eq) {
    if (eq.pausado || !eq.startTimestamp) {
      return eq.tiempoTranscurrido || 0;
    }
    const live = Math.floor((Date.now() - eq.startTimestamp) / 1000) + (eq.pausedAccum || 0);
    if (eq.estado === 'definido') return Math.min(live, eq.tiempoTotal || 0);
    return live;
  }

  function getLimiteRestante(eq) {
    if (!eq.sessionStart || !eq.limiteTotal) return eq.limiteTotal || 0;
    const wall = Math.floor((Date.now() - eq.sessionStart) / 1000);
    return Math.max(0, eq.limiteTotal - wall);
  }

  function getWallElapsed(eq) {
    if (!eq.sessionStart) return 0;
    return Math.floor((Date.now() - eq.sessionStart) / 1000);
  }

  function renderHistorial() {
    if (!historialList) return;
    if (historial.length === 0) {
      historialList.innerHTML = '<p class="historial-empty">Sin registros aún</p>';
      return;
    }
    const items = historial.slice().reverse();
    historialList.innerHTML = items.map(function(h) {
      return '<div class="historial-item">' +
        '<div class="historial-item-top">' +
          '<span class="historial-equipo">' + h.nombre + '</span>' +
          '<span class="historial-tipo">' + h.tipo + '</span>' +
        '</div>' +
        '<div class="historial-item-mid">' +
          '<span>' + (h.modo === 'definido' ? 'Definido' : 'Libre') + '</span>' +
          '<span>' + formatTime(h.segundos) + '</span>' +
        '</div>' +
        '<div class="historial-item-bot">' +
          '<span class="historial-total">$' + Number(h.total).toFixed(2) + '</span>' +
          '<span class="historial-fecha">' + formatFecha(h.fecha) + '</span>' +
        '</div>' +
        (h.notas ? '<div class="historial-notas">' + h.notas + '</div>' : '') +
        (h.extra > 0 ? '<div class="historial-extra">Extra: $' + Number(h.extra).toFixed(2) + '</div>' : '') +
      '</div>';
    }).join('');
  }

  function render() {
    if (!equiposList) return;

    var active = document.activeElement;
    var focusedNotasId = (active && active.classList && active.classList.contains('notas-input'))
      ? active.dataset.id : null;
    var focusedNotasPos = focusedNotasId ? active.selectionStart : null;

    if (equipos.length === 0) {
      equiposList.innerHTML = '';
      return;
    }

    equiposList.innerHTML = equipos.map(function(eq) {
      var iName = iconName(eq.tipo);
      var iClass = iconClass(eq.tipo);
      var notasVal = (eq.notas || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
      var notasInput = '<input type="text" class="notas-input" data-id="' + eq.id +
        '" placeholder="Notas..." value="' + notasVal + '" title="Notas de esta sesión">';

      if (eq.estado === 'idle') {
        return '<div class="equipo-row" data-id="' + eq.id + '">' +
          '<div class="equipo-info">' +
            '<div class="equipo-icon ' + iClass + '"><ion-icon name="' + iName + '"></ion-icon></div>' +
            '<span class="equipo-nombre">' + eq.nombre + '</span>' +
          '</div>' +
          notasInput +
          '<button class="btn-accion btn-definido" data-action="definido">Tiempo Definido</button>' +
          '<button class="btn-accion btn-libre" data-action="libre">Tiempo Libre</button>' +
          '<button class="btn-accion btn-eliminar" data-action="eliminar" title="Eliminar">' +
            '<ion-icon name="trash-outline"></ion-icon>' +
          '</button>' +
        '</div>';
      }

      if (eq.estado === 'definido') {
        var trans = getTranscurrido(eq);
        var restante = Math.max(0, (eq.tiempoTotal || 0) - trans);
        var pct = eq.tiempoTotal > 0 ? (restante / eq.tiempoTotal) * 100 : 0;
        var pauseIcon = eq.pausado ? 'play' : 'pause';
        return '<div class="equipo-row ' + (eq.pausado ? 'is-paused' : '') + '" data-id="' + eq.id + '">' +
          '<div class="equipo-info">' +
            '<div class="equipo-icon ' + iClass + '"><ion-icon name="' + iName + '"></ion-icon></div>' +
            '<span class="equipo-nombre">' + eq.nombre + '</span>' +
            (eq.pausado ? '<span class="badge-paused">PAUSA</span>' : '') +
          '</div>' +
          '<div class="tiempo-info">' +
            '<div class="progress-wrap">' +
              '<div class="progress-bar" data-bar style="width:' + pct + '%"></div>' +
              '<span class="progress-text" data-time>Restante: ' + formatTime(restante) + '</span>' +
            '</div>' +
          '</div>' +
          notasInput +
          '<div class="acciones-activas">' +
            '<button class="btn-accion btn-pause" data-action="pause" title="' + (eq.pausado ? 'Reanudar' : 'Pausar') + '">' +
              '<ion-icon name="' + pauseIcon + '-outline"></ion-icon>' +
            '</button>' +
            '<button class="btn-accion btn-cobrar" data-action="cobrar">Cobrar</button>' +
            '<button class="btn-accion btn-agregar" data-action="agregar">+ Tiempo</button>' +
            '<button class="btn-accion btn-cancelar" data-action="cancelar">' +
              '<ion-icon name="close-outline"></ion-icon>' +
            '</button>' +
          '</div>' +
        '</div>';
      }

      if (eq.estado === 'libre') {
        var trans2 = getTranscurrido(eq);
        var limRest = getLimiteRestante(eq);
        var pct2 = eq.limiteTotal > 0 ? (limRest / eq.limiteTotal) * 100 : 100;
        var pauseIcon2 = eq.pausado ? 'play' : 'pause';
        return '<div class="equipo-row ' + (eq.pausado ? 'is-paused' : '') + '" data-id="' + eq.id + '">' +
          '<div class="equipo-info">' +
            '<div class="equipo-icon ' + iClass + '"><ion-icon name="' + iName + '"></ion-icon></div>' +
            '<span class="equipo-nombre">' + eq.nombre + '</span>' +
            (eq.pausado ? '<span class="badge-paused">PAUSA</span>' : '') +
          '</div>' +
          '<div class="tiempo-info">' +
            '<div class="progress-wrap">' +
              '<div class="progress-bar" data-bar style="width:' + pct2 + '%"></div>' +
              '<span class="progress-text" data-time>' + formatTime(trans2) + ' / Límite ' + formatTime(limRest) + '</span>' +
            '</div>' +
          '</div>' +
          notasInput +
          '<div class="acciones-activas">' +
            '<button class="btn-accion btn-pause" data-action="pause" title="' + (eq.pausado ? 'Reanudar' : 'Pausar') + '">' +
              '<ion-icon name="' + pauseIcon2 + '-outline"></ion-icon>' +
            '</button>' +
            '<button class="btn-accion btn-restar" data-action="restar">− Tiempo</button>' +
            '<button class="btn-accion btn-cobrar" data-action="cobrar">Cobrar</button>' +
            '<button class="btn-accion btn-cancelar" data-action="cancelar">' +
              '<ion-icon name="close-outline"></ion-icon>' +
            '</button>' +
          '</div>' +
        '</div>';
      }

      return '';
    }).join('');

    if (focusedNotasId) {
      var input = equiposList.querySelector('.notas-input[data-id="' + focusedNotasId + '"]');
      if (input) {
        input.focus();
        if (focusedNotasPos != null) {
          try { input.setSelectionRange(focusedNotasPos, focusedNotasPos); } catch (e) {}
        }
      }
    }
  }

  function updateTimersUI() {
    equipos.forEach(function(eq) {
      if (eq.estado !== 'definido' && eq.estado !== 'libre') return;
      var row = equiposList.querySelector('.equipo-row[data-id="' + eq.id + '"]');
      if (!row) return;
      var bar = row.querySelector('[data-bar]');
      var text = row.querySelector('[data-time]');
      if (!bar || !text) return;

      if (eq.estado === 'definido') {
        var trans = getTranscurrido(eq);
        var restante = Math.max(0, (eq.tiempoTotal || 0) - trans);
        var pct = eq.tiempoTotal > 0 ? (restante / eq.tiempoTotal) * 100 : 0;
        bar.style.width = pct + '%';
        text.textContent = 'Restante: ' + formatTime(restante);
      }

      if (eq.estado === 'libre') {
        var trans2 = getTranscurrido(eq);
        var limRest = getLimiteRestante(eq);
        var pct2 = eq.limiteTotal > 0 ? (limRest / eq.limiteTotal) * 100 : 100;
        bar.style.width = pct2 + '%';
        text.textContent = formatTime(trans2) + ' / Límite ' + formatTime(limRest);
      }
    });
  }

  function tick() {
    var needSave = false;
    var now = Date.now();

    equipos.forEach(function(eq) {
      if (!eq.pausado && eq.startTimestamp) {
        if (eq.estado === 'definido') {
          var elapsed = Math.floor((now - eq.startTimestamp) / 1000) + (eq.pausedAccum || 0);
          var capped = Math.min(elapsed, eq.tiempoTotal || 0);
          if (capped !== eq.tiempoTranscurrido) {
            eq.tiempoTranscurrido = capped;
            needSave = true;
          }
          if (eq.tiempoTranscurrido >= eq.tiempoTotal && !eq.alerted) {
            eq.alerted = true;
            playFinishSound();
            needSave = true;
          }
        }

        if (eq.estado === 'libre') {
          var elapsed2 = Math.floor((now - eq.startTimestamp) / 1000) + (eq.pausedAccum || 0);
          if (elapsed2 !== eq.tiempoTranscurrido) {
            eq.tiempoTranscurrido = elapsed2;
            needSave = true;
          }
        }
      }

      if (eq.estado === 'libre' && eq.limiteTotal > 0 && eq.sessionStart) {
        var wall = getWallElapsed(eq);
        if (wall >= eq.limiteTotal && !eq.alerted) {
          eq.alerted = true;
          playFinishSound();
          needSave = true;
        }
      }
    });

    updateTimersUI();
    if (needSave) save();
  }

  setInterval(tick, 1000);

  function openModal(el) { el.hidden = false; }
  function closeModal(el) { el.hidden = true; }

  document.querySelectorAll('.modal-overlay').forEach(function(overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeModal(overlay);
    });
  });

  equiposList.addEventListener('input', function(e) {
    var input = e.target.closest('.notas-input');
    if (!input) return;
    var id = Number(input.dataset.id);
    var eq = equipos.find(function(x) { return x.id === id; });
    if (eq) {
      eq.notas = input.value;
      localStorage.setItem('rc_equipos', JSON.stringify(equipos));
    }
  });

  equiposList.addEventListener('keydown', function(e) {
    if (e.target.classList.contains('notas-input') && e.key === 'Enter') {
      e.preventDefault();
      e.target.blur();
    }
  });

  btnAdd.addEventListener('click', function() {
    document.getElementById('inputNombre').value = '';
    document.getElementById('inputTipo').value = 'PC';
    openModal(modalNuevo);
    setTimeout(function() { document.getElementById('inputNombre').focus(); }, 50);
  });

  document.getElementById('btnAceptarNuevo').addEventListener('click', function() {
    var nombre = document.getElementById('inputNombre').value.trim();
    var tipo = document.getElementById('inputTipo').value;
    if (!nombre) {
      document.getElementById('inputNombre').focus();
      return;
    }
    equipos.push({
      id: Date.now(),
      nombre: nombre,
      tipo: tipo,
      estado: 'idle',
      tiempoTotal: 0,
      tiempoTranscurrido: 0,
      limiteTotal: 0,
      startTimestamp: null,
      sessionStart: null,
      pausedAccum: 0,
      pausado: false,
      notas: '',
      alerted: false
    });
    save();
    render();
    closeModal(modalNuevo);
  });

  equiposList.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var row = btn.closest('.equipo-row');
    if (!row) return;
    var id = Number(row.dataset.id);
    var eq = equipos.find(function(x) { return x.id === id; });
    if (!eq) return;

    var action = btn.dataset.action;
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
      document.getElementById('modalTiempoTitle').textContent = 'Restar del tiempo usado';
      document.getElementById('inputTiempoValor').value = '0';
      document.getElementById('inputTiempoUnidad').value = 'minutos';
      openModal(modalTiempo);
    }

    if (action === 'pause') {
      if (eq.pausado) {
        eq.pausado = false;
        eq.startTimestamp = Date.now();
      } else {
        if (eq.startTimestamp) {
          var now = Date.now();
          eq.pausedAccum = Math.floor((now - eq.startTimestamp) / 1000) + (eq.pausedAccum || 0);
          if (eq.estado === 'definido') {
            eq.pausedAccum = Math.min(eq.pausedAccum, eq.tiempoTotal || 0);
          }
          eq.tiempoTranscurrido = eq.pausedAccum;
        }
        eq.startTimestamp = null;
        eq.pausado = true;
      }
      save();
      render();
    }

    if (action === 'eliminar') {
      confirmCallback = function() {
        equipos = equipos.filter(function(x) { return x.id !== id; });
        save();
        render();
      };
      document.getElementById('confirmTitle').textContent = '¿Eliminar equipo?';
      document.getElementById('confirmText').textContent = 'Se eliminará "' + eq.nombre + '".';
      openModal(modalConfirm);
    }

    if (action === 'cancelar') {
      confirmCallback = function() {
        eq.estado = 'idle';
        eq.tiempoTotal = 0;
        eq.tiempoTranscurrido = 0;
        eq.limiteTotal = 0;
        eq.startTimestamp = null;
        eq.sessionStart = null;
        eq.pausedAccum = 0;
        eq.pausado = false;
        eq.alerted = false;
        eq.notas = '';
        save();
        render();
      };
      document.getElementById('confirmTitle').textContent = '¿Cancelar sesión?';
      document.getElementById('confirmText').textContent = 'Se detendrá el contador y se perderá el tiempo actual.';
      openModal(modalConfirm);
    }

    if (action === 'cobrar') {
      var segundosUsados = getTranscurrido(eq);
      var base = calcularPrecio(segundosUsados);
      cobrarContext = {
        id: id,
        segundos: segundosUsados,
        base: base,
        modo: eq.estado,
        nombre: eq.nombre,
        tipo: eq.tipo,
        notas: eq.notas || ''
      };
      document.getElementById('cobrarInfo').textContent = 'Tiempo utilizado: ' + formatTime(segundosUsados);
      document.getElementById('cobrarBase').textContent = 'Tiempo: $' + base.toFixed(2);
      document.getElementById('inputExtra').value = '0';
      updateCobrarTotal();
      openModal(modalCobrar);
    }
  });

  function updateCobrarTotal() {
    if (!cobrarContext) return;
    var extra = Number(document.getElementById('inputExtra').value) || 0;
    document.getElementById('cobrarTotal').textContent =
      'Total a cobrar: $' + (cobrarContext.base + extra).toFixed(2);
  }

  document.getElementById('inputExtra').addEventListener('input', updateCobrarTotal);

  document.getElementById('btnConfirmarCobrar').addEventListener('click', function() {
    if (!cobrarContext) return;
    var extra = Number(document.getElementById('inputExtra').value) || 0;
    var total = cobrarContext.base + extra;

    historial.push({
      id: Date.now(),
      nombre: cobrarContext.nombre,
      tipo: cobrarContext.tipo,
      modo: cobrarContext.modo,
      segundos: cobrarContext.segundos,
      base: cobrarContext.base,
      extra: extra,
      total: total,
      notas: cobrarContext.notas,
      fecha: Date.now()
    });

    var eq = equipos.find(function(x) { return x.id === cobrarContext.id; });
    if (eq) {
      eq.estado = 'idle';
      eq.tiempoTotal = 0;
      eq.tiempoTranscurrido = 0;
      eq.limiteTotal = 0;
      eq.startTimestamp = null;
      eq.sessionStart = null;
      eq.pausedAccum = 0;
      eq.pausado = false;
      eq.alerted = false;
      eq.notas = '';
    }

    cobrarContext = null;
    save();
    render();
    renderHistorial();
    closeModal(modalCobrar);
  });

  document.getElementById('btnAceptarTiempo').addEventListener('click', function() {
    var valor = document.getElementById('inputTiempoValor').value;
    var unidad = document.getElementById('inputTiempoUnidad').value;
    var segs = toSeconds(valor, unidad);
    var eq = equipos.find(function(x) { return x.id === currentEquipoId; });
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
      var trans = getTranscurrido(eq);
      var restanteActual = Math.max(0, (eq.tiempoTotal || 0) - trans);
      eq.tiempoTotal = trans + restanteActual + segs;
      if (!eq.pausado && eq.startTimestamp) {
        eq.tiempoTranscurrido = trans;
      }
      eq.alerted = false;
    }

    if (currentTiempoAction === 'limite') {
      eq.estado = 'libre';
      eq.limiteTotal = segs;
      eq.tiempoTranscurrido = 0;
      eq.pausedAccum = 0;
      eq.pausado = false;
      eq.alerted = false;
      var t = Date.now();
      eq.startTimestamp = t;
      eq.sessionStart = t;
    }

    if (currentTiempoAction === 'restar') {
      if (segs <= 0) return;
      var actual = getTranscurrido(eq);
      var nuevo = Math.max(0, actual - segs);
      eq.tiempoTranscurrido = nuevo;
      eq.pausedAccum = nuevo;
      if (!eq.pausado) {
        eq.startTimestamp = Date.now();
      }
      // NO tocamos sessionStart ni limiteTotal
    }

    save();
    render();
    closeModal(modalTiempo);
  });

  document.getElementById('btnConfirmSi').addEventListener('click', function() {
    if (typeof confirmCallback === 'function') confirmCallback();
    confirmCallback = null;
    closeModal(modalConfirm);
  });
  document.getElementById('btnConfirmNo').addEventListener('click', function() {
    confirmCallback = null;
    closeModal(modalConfirm);
  });

  function loadPriceUI() {
    document.getElementById('priceAmount').value = priceConfig.amount;
    document.getElementById('pricePer').value = priceConfig.per;
    document.getElementById('priceUnit').value = priceConfig.unit;
  }

  fabConfig.addEventListener('click', function() {
    if (pricePanel.hidden) {
      loadPriceUI();
      pricePanel.hidden = false;
    } else {
      pricePanel.hidden = true;
    }
  });

  document.getElementById('btnSavePrice').addEventListener('click', function() {
    priceConfig = {
      amount: Number(document.getElementById('priceAmount').value) || 0,
      per: Number(document.getElementById('pricePer').value) || 1,
      unit: document.getElementById('priceUnit').value
    };
    save();
    pricePanel.hidden = true;
  });

  document.addEventListener('click', function(e) {
    if (!pricePanel.hidden && !pricePanel.contains(e.target) && e.target !== fabConfig && !fabConfig.contains(e.target)) {
      pricePanel.hidden = true;
    }
  });

  btnClearHistorial.addEventListener('click', function() {
    confirmCallback = function() {
      historial = [];
      save();
      renderHistorial();
    };
    document.getElementById('confirmTitle').textContent = '¿Limpiar historial?';
    document.getElementById('confirmText').textContent = 'Se borrarán todos los registros de cobros.';
    openModal(modalConfirm);
  });

  render();
  renderHistorial();
});
