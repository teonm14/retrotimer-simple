/**
 * Vista independiente móvil / escritorio.
 * No altera estilos de PC: solo pone data-layout="mobile"|"desktop" en <html>.
 */
(function () {
  var BP = 820;
  var KEY = 'rc_layout_force'; // 'mobile' | 'desktop' | null

  function forced() {
    try {
      var v = localStorage.getItem(KEY);
      if (v === 'mobile' || v === 'desktop') return v;
    } catch (e) {}
    return null;
  }

  function resolve() {
    var f = forced();
    if (f) return f;
    return window.matchMedia('(max-width: ' + BP + 'px)').matches ? 'mobile' : 'desktop';
  }

  function apply() {
    var layout = resolve();
    document.documentElement.setAttribute('data-layout', layout);
    document.documentElement.classList.toggle('is-mobile-layout', layout === 'mobile');
    document.documentElement.classList.toggle('is-desktop-layout', layout === 'desktop');
    return layout;
  }

  apply();

  var mq = window.matchMedia('(max-width: ' + BP + 'px)');
  function onChange() {
    if (forced()) return;
    apply();
  }
  if (mq.addEventListener) mq.addEventListener('change', onChange);
  else if (mq.addListener) mq.addListener(onChange);

  window.RCLayout = {
    apply: apply,
    resolve: resolve,
    isMobile: function () {
      return resolve() === 'mobile';
    },
    force: function (mode) {
      try {
        if (mode === 'mobile' || mode === 'desktop') localStorage.setItem(KEY, mode);
        else localStorage.removeItem(KEY);
      } catch (e) {}
      return apply();
    }
  };
})();
