/** Lógica de cronómetros y límite */

import { playFinishSound } from './utils.js';
import { equipos, saveState } from './state.js';

export function getTranscurrido(eq) {
  if (eq.pausado || !eq.startTimestamp) {
    return eq.tiempoTranscurrido || 0;
  }
  const live = Math.floor((Date.now() - eq.startTimestamp) / 1000) + (eq.pausedAccum || 0);
  if (eq.estado === 'definido') return Math.min(live, eq.tiempoTotal || 0);
  return live;
}

/** Límite por reloj de pared — no se afecta por pausa ni restar */
export function getLimiteRestante(eq) {
  if (!eq.sessionStart || !eq.limiteTotal) return eq.limiteTotal || 0;
  const wall = Math.floor((Date.now() - eq.sessionStart) / 1000);
  return Math.max(0, eq.limiteTotal - wall);
}

export function getWallElapsed(eq) {
  if (!eq.sessionStart) return 0;
  return Math.floor((Date.now() - eq.sessionStart) / 1000);
}

/** Equipo con tiempo agotado */
export function isVencido(eq) {
  if (eq.estado === 'definido') {
    return getTranscurrido(eq) >= (eq.tiempoTotal || 0) && (eq.tiempoTotal || 0) > 0;
  }
  if (eq.estado === 'libre' && (eq.limiteTotal || 0) > 0) {
    return getWallElapsed(eq) >= eq.limiteTotal;
  }
  return false;
}

export function getVencidos() {
  return equipos.filter(isVencido);
}

/**
 * Avanza timers. Devuelve { needSave, justAlerted: ids[] }
 */
export function tickOnce() {
  let needSave = false;
  const justAlerted = [];
  const now = Date.now();

  equipos.forEach((eq) => {
    if (!eq.pausado && eq.startTimestamp) {
      if (eq.estado === 'definido') {
        const elapsed = Math.floor((now - eq.startTimestamp) / 1000) + (eq.pausedAccum || 0);
        const capped = Math.min(elapsed, eq.tiempoTotal || 0);
        if (capped !== eq.tiempoTranscurrido) {
          eq.tiempoTranscurrido = capped;
          needSave = true;
        }
        if (eq.tiempoTranscurrido >= eq.tiempoTotal && eq.tiempoTotal > 0 && !eq.alerted) {
          eq.alerted = true;
          playFinishSound();
          justAlerted.push(eq.id);
          needSave = true;
        }
      }

      if (eq.estado === 'libre') {
        const elapsed = Math.floor((now - eq.startTimestamp) / 1000) + (eq.pausedAccum || 0);
        if (elapsed !== eq.tiempoTranscurrido) {
          eq.tiempoTranscurrido = elapsed;
          needSave = true;
        }
      }
    }

    // Límite libre: alerta aunque esté pausado (reloj de pared)
    if (eq.estado === 'libre' && eq.limiteTotal > 0 && eq.sessionStart) {
      const wall = getWallElapsed(eq);
      if (wall >= eq.limiteTotal && !eq.alerted) {
        eq.alerted = true;
        playFinishSound();
        justAlerted.push(eq.id);
        needSave = true;
      }
    }
  });

  if (needSave) saveState();
  return { needSave, justAlerted };
}
