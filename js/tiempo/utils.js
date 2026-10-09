/** Utilidades compartidas */

export function formatTime(seconds) {
  seconds = Math.max(0, Math.floor(seconds));
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return h + ':' + m + ':' + s;
}

export function toSeconds(valor, unidad) {
  const v = Number(valor) || 0;
  return unidad === 'horas' ? v * 3600 : v * 60;
}

export function iconName(tipo) {
  const t = (tipo || '').toUpperCase();
  if (t.includes('XBOX')) return 'logo-xbox';
  if (t.includes('PLAY')) return 'logo-playstation';
  return 'desktop-outline';
}

export function iconClass(tipo) {
  const t = (tipo || '').toUpperCase();
  if (t.includes('XBOX')) return 'xbox';
  if (t.includes('PLAY')) return 'playstation';
  return 'pc';
}

export function formatFecha(ts) {
  return new Date(ts).toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}

export function formatFechaLarga(ts) {
  return new Date(ts).toLocaleString('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

export function playFinishSound() {
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

export function openModal(el) {
  if (el) el.hidden = false;
}

export function closeModal(el) {
  if (el) el.hidden = true;
}

export function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
