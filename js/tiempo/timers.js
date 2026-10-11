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

/**
 * Límite restante en libre: hasta hora fija (limiteHasta).
 * No se afecta por pausa ni restar del transcurrido.
 */
export function getLimiteRestante(eq) {
  if (!eq.limiteHasta) return null;
  return Math.max(0, Math.floor((eq.limiteHasta - Date.now()) / 1000));
}

/** Porcentaje restante del límite (0–100) o null si no hay límite */
export function getLimitePct(eq) {
  if (!eq.limiteHasta || !eq.sessionStart) return null;
  const total = eq.limiteHasta - eq.sessionStart;
  if (total <= 0) return 0;
  const rest = Math.max(0, eq.limiteHasta - Date.now());
  return Math.min(100, (rest / total) * 100);
}

export function isVencido(eq) {
  if (eq.estado === 'definido') {
    return getTranscurrido(eq) >= (eq.tiempoTotal || 0) && (eq.tiempoTotal || 0) > 0;
  }
  if (eq.estado === 'libre' && eq.limiteHasta) {
    return Date.now() >= eq.limiteHasta;
  }
  return false;
}

export function getVencidos() {
  return equipos.filter(isVencido);
}

export function getStatusCounts() {
  let vencidos = 0;
  let pausa = 0;
  let activos = 0;
  let inactivos = 0;

  equipos.forEach((eq) => {
    if (eq.estado === 'idle') {
      inactivos++;
      return;
    }
    if (eq.estado === 'definido' || eq.estado === 'libre') {
      if (isVencido(eq)) {
        vencidos++;
      } else if (eq.pausado) {
        pausa++;
      } else {
        activos++;
      }
    }
  });

  return { vencidos, pausa, activos, inactivos };
}

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

    // Límite libre por hora: alerta aunque esté pausado
    if (eq.estado === 'libre' && eq.limiteHasta && now >= eq.limiteHasta && !eq.alerted) {
      eq.alerted = true;
      playFinishSound();
      justAlerted.push(eq.id);
      needSave = true;
    }
  });

  if (needSave) saveState();
  return { needSave, justAlerted };
}
