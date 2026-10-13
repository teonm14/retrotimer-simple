/**
 * RetroControl - JS principal
 * About, notificaciones, feedback (compartido entre páginas)
 */

document.addEventListener('DOMContentLoaded', () => {
  const NOTIF_VERSION = '2026-10-12-v7';

  const NOVEDADES = [
    {
      type: 'feature',
      text: 'Tema claro y oscuro: interruptor junto a las notificaciones. Se guarda tu preferencia.',
      date: '12 Oct 2026'
    },
    {
      type: 'fix',
      text: 'Tema claro: scrollbars, botón mover sesión, steppers/chips de tiempo y menú de herramientas.',
      date: '12 Oct 2026'
    },
    {
      type: 'fix',
      text: 'Tarjetas de estado con más contraste en tema claro (vencidos, pausa, activos).',
      date: '12 Oct 2026'
    },
    {
      type: 'feature',
      text: 'Mejoras de accesibilidad: skip-link, ARIA en modales y controles, focus visible.',
      date: '12 Oct 2026'
    },
    {
      type: 'feature',
      text: 'Filtros de equipos por tipo: Todos, PC, Xbox y PlayStation.',
      date: '12 Oct 2026'
    },
    {
      type: 'feature',
      text: 'Calculadora con historial, teclado numérico, C y AC.',
      date: '12 Oct 2026'
    },
    {
      type: 'feature',
      text: 'Selectores de tiempo editables (+/− y captura manual de hora/minutos).',
      date: '11 Oct 2026'
    },
    {
      type: 'feature',
      text: 'Mover sesión entre equipos, cobro flexible y precios redondeados a .00 o .50.',
      date: '11 Oct 2026'
    }
  ];

  const notifList = document.getElementById('notifList');
  const notifPanel = document.getElementById('notifPanel');
  const notifDot = document.getElementById('notifDot');
  const btnNotif = document.getElementById('btnNotif');
  const btnCloseNotif = document.getElementById('btnCloseNotif');
  const btnAbout = document.getElementById('btnAbout');
  const modalAbout = document.getElementById('modalAbout');
  const btnCerrarAbout = document.getElementById('btnCerrarAbout');
  const btnEnviarFeedback = document.getElementById('btnEnviarFeedback');
  const feedbackText = document.getElementById('feedbackText');
  const feedbackThanks = document.getElementById('feedbackThanks');

  if (notifList) {
    notifList.innerHTML = NOVEDADES.map(function (n) {
      return (
        '<div class="notif-item">' +
        '<div class="notif-item-type ' + n.type + '">' +
        (n.type === 'fix' ? 'Corrección' : 'Novedad') +
        '</div>' +
        '<div class="notif-item-text">' + n.text + '</div>' +
        '<div class="notif-item-date">' + n.date + '</div>' +
        '</div>'
      );
    }).join('');
  }

  const seen = localStorage.getItem('rc_notif_seen');
  if (notifDot && seen !== NOTIF_VERSION) {
    notifDot.classList.add('visible');
  }

  function openNotif() {
    if (!notifPanel) return;
    notifPanel.hidden = false;
    if (btnNotif) btnNotif.setAttribute('aria-expanded', 'true');
    if (notifDot) notifDot.classList.remove('visible');
    localStorage.setItem('rc_notif_seen', NOTIF_VERSION);
  }

  function closeNotif() {
    if (notifPanel) notifPanel.hidden = true;
    if (btnNotif) btnNotif.setAttribute('aria-expanded', 'false');
  }

  if (btnNotif) {
    btnNotif.addEventListener('click', function (e) {
      e.stopPropagation();
      if (notifPanel && notifPanel.hidden) openNotif();
      else closeNotif();
    });
  }

  if (btnCloseNotif) {
    btnCloseNotif.addEventListener('click', closeNotif);
  }

  document.addEventListener('click', function (e) {
    if (!notifPanel || notifPanel.hidden) return;
    if (notifPanel.contains(e.target) || (btnNotif && btnNotif.contains(e.target))) return;
    closeNotif();
  });

  function openAbout() {
    if (!modalAbout) return;
    if (feedbackText) feedbackText.value = '';
    if (feedbackThanks) feedbackThanks.hidden = true;
    modalAbout.hidden = false;
  }

  function closeAbout() {
    if (modalAbout) modalAbout.hidden = true;
  }

  if (btnAbout) btnAbout.addEventListener('click', openAbout);
  if (btnCerrarAbout) btnCerrarAbout.addEventListener('click', closeAbout);

  if (modalAbout) {
    modalAbout.addEventListener('click', function (e) {
      if (e.target === modalAbout) closeAbout();
    });
  }

  if (btnEnviarFeedback) {
    btnEnviarFeedback.addEventListener('click', function () {
      var msg = (feedbackText && feedbackText.value.trim()) || '';
      if (!msg) {
        if (feedbackText) feedbackText.focus();
        return;
      }
      var subject = encodeURIComponent('RetroControl — comentario / solicitud');
      var body = encodeURIComponent(msg + '\n\n— Enviado desde RetroControl');
      // Cambia este correo por el del desarrollador cuando lo tengas
      var email = 'teofilo.naredo.works14@gmail.com';
      window.location.href = 'mailto:' + email + '?subject=' + subject + '&body=' + body;
      if (feedbackThanks) feedbackThanks.hidden = false;
    });
  }

  /* ----- Tema claro / oscuro ----- */
  const THEME_KEY = 'rc_theme';
  const btnTheme = document.getElementById('btnTheme');

  function getTheme() {
    const t = document.documentElement.getAttribute('data-theme');
    return t === 'light' ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    const next = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (e) {}
    if (btnTheme) {
      btnTheme.setAttribute(
        'aria-label',
        next === 'light' ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro'
      );
      btnTheme.title = next === 'light' ? 'Tema oscuro' : 'Tema claro';
    }
  }

  // Sincronizar UI del botón con el tema ya aplicado (script en <head>)
  applyTheme(getTheme());

  if (btnTheme) {
    btnTheme.addEventListener('click', function (e) {
      e.stopPropagation();
      applyTheme(getTheme() === 'light' ? 'dark' : 'light');
    });
  }


});
