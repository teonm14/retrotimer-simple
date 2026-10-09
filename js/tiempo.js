/**
 * RetroControl — el gestor de tiempo se movió a módulos ES:
 *
 *   js/tiempo/app.js       ← entrada (carga type="module")
 *   js/tiempo/state.js
 *   js/tiempo/timers.js
 *   js/tiempo/render.js
 *   js/tiempo/cobro.js
 *   js/tiempo/historial.js
 *   js/tiempo/calc.js
 *   js/tiempo/utils.js
 *
 * pages/tiempo.html apunta a js/tiempo/app.js
 */
console.warn('[RetroControl] js/tiempo.js está deprecado. Usa js/tiempo/app.js');
