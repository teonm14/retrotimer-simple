/** Render de equipos, vencidos y timers UI */

import { equipos } from './state.js';
import { getTranscurrido, getLimiteRestante, isVencido, getVencidos } from './timers.js';
import { formatTime, iconName, iconClass, escapeHtml } from './utils.js';

function autoResizeNotas(el) {
  if (!el) return;
  el.style.height = 'auto';
  const max = 5 * 22;
  el.style.height = Math.min(el.scrollHeight, max) + 'px';
}

export function renderVencidos(container) {
  if (!container) return;
  const list = getVencidos();
  if (list.length === 0) {
    container.hidden = true;
    container.innerHTML = '';
    return;
  }
  container.hidden = false;
  container.innerHTML =
    '<div class="vencidos-inner">' +
    '<ion-icon name="warning-outline" class="vencidos-icon"></ion-icon>' +
    '<div class="vencidos-text">' +
    '<strong>Equipos vencidos (' +
    list.length +
    ')</strong>' +
    '<span>' +
    list.map((eq) => escapeHtml(eq.nombre)).join(', ') +
    '</span>' +
    '</div>' +
    '</div>';
}

export function renderEquipos(equiposList) {
  if (!equiposList) return;

  const active = document.activeElement;
  const focusedNotasId =
    active && active.classList && active.classList.contains('notas-input')
      ? active.dataset.id
      : null;
  const focusedNotasPos = focusedNotasId != null ? active.selectionStart : null;

  if (equipos.length === 0) {
    equiposList.innerHTML =
      '<p class="equipos-empty">No hay equipos. Pulsa <strong>Añadir</strong> o la tecla <kbd>N</kbd>.</p>';
    return;
  }

  equiposList.innerHTML = equipos
    .map((eq) => {
      const iName = iconName(eq.tipo);
      const iClass = iconClass(eq.tipo);
      const notasVal = escapeHtml(eq.notas || '');
      const notasInput =
        '<textarea class="notas-input" data-id="' +
        eq.id +
        '" rows="1" placeholder="Notas de esta sesión..." title="Notas">' +
        notasVal +
        '</textarea>';
      const vencido = isVencido(eq);
      const rowClass =
        'equipo-row' +
        (eq.pausado ? ' is-paused' : '') +
        (vencido ? ' is-vencido' : '');

      if (eq.estado === 'idle') {
        return (
          '<div class="' +
          rowClass +
          '" data-id="' +
          eq.id +
          '">' +
          '<div class="equipo-row-top">' +
          '<div class="equipo-info">' +
          '<div class="equipo-icon ' +
          iClass +
          '"><ion-icon name="' +
          iName +
          '"></ion-icon></div>' +
          '<span class="equipo-nombre">' +
          escapeHtml(eq.nombre) +
          '</span>' +
          '</div>' +
          '<div class="acciones-activas">' +
          '<button class="btn-accion btn-definido" data-action="definido">Tiempo Definido</button>' +
          '<button class="btn-accion btn-libre" data-action="libre">Tiempo Libre</button>' +
          '<button class="btn-accion btn-editar" data-action="editar" title="Editar equipo">' +
          '<ion-icon name="create-outline"></ion-icon></button>' +
          '<button class="btn-accion btn-eliminar" data-action="eliminar" title="Eliminar">' +
          '<ion-icon name="trash-outline"></ion-icon></button>' +
          '</div></div>' +
          '<div class="equipo-notas-row">' +
          notasInput +
          '</div></div>'
        );
      }

      if (eq.estado === 'definido') {
        const trans = getTranscurrido(eq);
        const restante = Math.max(0, (eq.tiempoTotal || 0) - trans);
        const pct = eq.tiempoTotal > 0 ? (restante / eq.tiempoTotal) * 100 : 0;
        const pauseIcon = eq.pausado ? 'play' : 'pause';
        return (
          '<div class="' +
          rowClass +
          '" data-id="' +
          eq.id +
          '">' +
          '<div class="equipo-row-top">' +
          '<div class="equipo-info">' +
          '<div class="equipo-icon ' +
          iClass +
          '"><ion-icon name="' +
          iName +
          '"></ion-icon></div>' +
          '<span class="equipo-nombre">' +
          escapeHtml(eq.nombre) +
          '</span>' +
          '<span class="badge-mode">Definido</span>' +
          (eq.pausado ? '<span class="badge-paused">Pausa</span>' : '') +
          (vencido ? '<span class="badge-vencido">Vencido</span>' : '') +
          '</div>' +
          '<div class="tiempo-info">' +
          '<div class="progress-wrap">' +
          '<div class="progress-bar" data-bar style="width:' +
          pct +
          '%"></div>' +
          '<span class="progress-text" data-time>' +
          formatTime(trans) +
          ' · Restante ' +
          formatTime(restante) +
          '</span></div></div>' +
          '<div class="acciones-activas">' +
          '<button class="btn-accion btn-pause" data-action="pause" title="' +
          (eq.pausado ? 'Reanudar' : 'Pausar') +
          '"><ion-icon name="' +
          pauseIcon +
          '-outline"></ion-icon></button>' +
          '<button class="btn-accion btn-agregar" data-action="agregar">+ Tiempo</button>' +
          '<button class="btn-accion btn-cobrar" data-action="cobrar">Cobrar</button>' +
          '<button class="btn-accion btn-editar" data-action="editar" title="Editar">' +
          '<ion-icon name="create-outline"></ion-icon></button>' +
          '<button class="btn-accion btn-cancelar" data-action="cancelar" title="Cancelar sesión">' +
          '<ion-icon name="close-outline"></ion-icon></button>' +
          '</div></div>' +
          '<div class="equipo-notas-row">' +
          notasInput +
          '</div></div>'
        );
      }

      if (eq.estado === 'libre') {
        const trans2 = getTranscurrido(eq);
        const limRest = getLimiteRestante(eq);
        const pct2 = eq.limiteTotal > 0 ? (limRest / eq.limiteTotal) * 100 : 100;
        const pauseIcon2 = eq.pausado ? 'play' : 'pause';
        return (
          '<div class="' +
          rowClass +
          '" data-id="' +
          eq.id +
          '">' +
          '<div class="equipo-row-top">' +
          '<div class="equipo-info">' +
          '<div class="equipo-icon ' +
          iClass +
          '"><ion-icon name="' +
          iName +
          '"></ion-icon></div>' +
          '<span class="equipo-nombre">' +
          escapeHtml(eq.nombre) +
          '</span>' +
          '<span class="badge-mode">Libre</span>' +
          (eq.pausado ? '<span class="badge-paused">Pausa</span>' : '') +
          (vencido ? '<span class="badge-vencido">Vencido</span>' : '') +
          '</div>' +
          '<div class="tiempo-info">' +
          '<div class="progress-wrap">' +
          '<div class="progress-bar" data-bar style="width:' +
          pct2 +
          '%"></div>' +
          '<span class="progress-text" data-time>' +
          formatTime(trans2) +
          ' / Límite ' +
          formatTime(limRest) +
          '</span></div></div>' +
          '<div class="acciones-activas">' +
          '<button class="btn-accion btn-pause" data-action="pause" title="' +
          (eq.pausado ? 'Reanudar' : 'Pausar') +
          '"><ion-icon name="' +
          pauseIcon2 +
          '-outline"></ion-icon></button>' +
          '<button class="btn-accion btn-restar" data-action="restar">− Tiempo</button>' +
          '<button class="btn-accion btn-cobrar" data-action="cobrar">Cobrar</button>' +
          '<button class="btn-accion btn-editar" data-action="editar" title="Editar">' +
          '<ion-icon name="create-outline"></ion-icon></button>' +
          '<button class="btn-accion btn-cancelar" data-action="cancelar" title="Cancelar sesión">' +
          '<ion-icon name="close-outline"></ion-icon></button>' +
          '</div></div>' +
          '<div class="equipo-notas-row">' +
          notasInput +
          '</div></div>'
        );
      }

      return '';
    })
    .join('');

  if (focusedNotasId) {
    const input = equiposList.querySelector('.notas-input[data-id="' + focusedNotasId + '"]');
    if (input) {
      input.focus();
      if (focusedNotasPos != null) {
        try {
          input.setSelectionRange(focusedNotasPos, focusedNotasPos);
        } catch (e) {}
      }
    }
  }

  equiposList.querySelectorAll('.notas-input').forEach(autoResizeNotas);
}

export function updateTimersUI(equiposList) {
  if (!equiposList) return;
  equipos.forEach((eq) => {
    if (eq.estado !== 'definido' && eq.estado !== 'libre') return;
    const row = equiposList.querySelector('.equipo-row[data-id="' + eq.id + '"]');
    if (!row) return;

    const bar = row.querySelector('[data-bar]');
    const text = row.querySelector('[data-time]');
    const vencido = isVencido(eq);
    row.classList.toggle('is-vencido', vencido);

    let badge = row.querySelector('.badge-vencido');
    if (vencido && !badge) {
      const info = row.querySelector('.equipo-info');
      if (info) {
        badge = document.createElement('span');
        badge.className = 'badge-vencido';
        badge.textContent = 'Vencido';
        info.appendChild(badge);
      }
    } else if (!vencido && badge) {
      badge.remove();
    }

    if (!bar || !text) return;

    if (eq.estado === 'definido') {
      const trans = getTranscurrido(eq);
      const restante = Math.max(0, (eq.tiempoTotal || 0) - trans);
      const pct = eq.tiempoTotal > 0 ? (restante / eq.tiempoTotal) * 100 : 0;
      bar.style.width = pct + '%';
      text.textContent = formatTime(trans) + ' · Restante ' + formatTime(restante);
    }

    if (eq.estado === 'libre') {
      const trans2 = getTranscurrido(eq);
      const limRest = getLimiteRestante(eq);
      const pct2 = eq.limiteTotal > 0 ? (limRest / eq.limiteTotal) * 100 : 100;
      bar.style.width = pct2 + '%';
      text.textContent = formatTime(trans2) + ' / Límite ' + formatTime(limRest);
    }
  });
}
