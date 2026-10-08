/**
 * RetroControl - JS principal
 * About, notificaciones, feedback (compartido entre páginas)
 */

document.addEventListener('DOMContentLoaded', () => {
  const NOTIF_VERSION = '2026-10-07-v2';

  const NOVEDADES = [
    {
      type: 'feature',
      text: 'Editar equipos existentes (nombre y tipo) sin reiniciar la sesión.',
      date: 'Oct 2026'
    },
    {
      type: 'feature',
      text: 'Menú de herramientas: ajustar precio y calculadora.',
      date: 'Oct 2026'
    },
    {
      type: 'feature',
      text: 'Tiempo definido muestra transcurrido y restante.',
      date: 'Oct 2026'
    },
    {
      type: 'feature',
      text: 'Notas multilínea (hasta 5 líneas) y confirmar modales con Enter.',
      date: 'Oct 2026'
    },
    {
      type: 'feature',
      text: 'Historial se puede mostrar u ocultar. Sección Acerca de y novedades.',
      date: 'Oct 2026'
    },
    {
      type: 'fix',
      text: 'Botones Cancelar en cobro y alta/edición de equipos.',
      date: 'Oct 2026'
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
    if (notifDot) notifDot.classList.remove('visible');
    localStorage.setItem('rc_notif_seen', NOTIF_VERSION);
  }

  function closeNotif() {
    if (notifPanel) notifPanel.hidden = true;
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
});
