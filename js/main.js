/**
 * RetroControl - JS principal
 * About, notificaciones, feedback (compartido entre páginas)
 */

document.addEventListener('DOMContentLoaded', () => {
  const NOTIF_VERSION = '2026-10-17-v8';

  const NOVEDADES = [
    {
      type: 'feature',
      text: 'Vista móvil independiente: barra inferior (Inicio, Tiempo, Historial, Acerca) sin afectar la vista de PC.',
      date: '17 Oct 2026'
    },
    {
      type: 'feature',
      text: 'Historial en móvil como panel a pantalla completa; el botón del header se oculta para evitar duplicados.',
      date: '17 Oct 2026'
    },
    {
      type: 'fix',
      text: 'Tarjetas de equipo más compactas en móvil (menos espacio vacío en el temporizador).',
      date: '17 Oct 2026'
    },
    {
      type: 'feature',
      text: 'Tema claro y oscuro con preferencia guardada.',
      date: '12 Oct 2026'
    },
    {
      type: 'feature',
      text: 'Filtros de equipos, calculadora con historial, selectores de tiempo editables.',
      date: '12 Oct 2026'
    },
    {
      type: 'feature',
      text: 'Cobro flexible, mover sesión, precios redondeados a .00 o .50.',
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

  /* Navegación móvil: Acerca de */
  document.querySelectorAll('#btnMobileAbout').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var aboutBtn = document.getElementById('btnAbout');
      if (aboutBtn) aboutBtn.click();
      else if (modalAbout) {
        modalAbout.hidden = false;
      }
    });
  });

});
