/* Terms of Service and Privacy Policy: the contents column (current section, the sliding marigold
   marker), the print button, and the settled DOM month used when the scene does not run (reduced
   motion, no WebGL, mobile). The dimmed month scene itself is legal-scene.js, loaded after first paint. */
(function () {
  'use strict';
  var AB = window.AB, doc = document;
  if (!AB) return;

  /* the current month as a settled DOM grid (today marked) */
  function renderMonth(el) {
    if (!el || el.dataset.done === '1') return;
    var now = new Date(), y = now.getFullYear(), m = now.getMonth(), today = now.getDate();
    var first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate(), html = '', i;
    for (i = 0; i < first; i++) html += '<i class="pad"></i>';
    for (i = 1; i <= days; i++) html += '<i data-n="' + i + '"' + (i === today ? ' class="today"' : '') + '></i>';
    var count = first + days;
    while (count % 7) { html += '<i class="pad"></i>'; count++; }
    el.innerHTML = html; el.dataset.done = '1';
  }
  window.__legalRenderMonth = renderMonth;

  AB.onReady(function () {
    var month = doc.getElementById('legal-month');
    if (month && (AB.motion.rm || AB.motion.mobileHero)) { renderMonth(month); month.hidden = false; }

    /* print */
    AB.$$('[data-print]').forEach(function (b) { b.addEventListener('click', function () { window.print(); }); });

    /* contents: current section and the marker */
    var list = AB.$('.legal-toc__list'), marker = AB.$('.legal-toc__marker');
    if (!list) return;
    var links = AB.$$('a', list), byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var sections = AB.$$('.legal-section');
    var current = null;
    function setCurrent(id) {
      if (current === id) return; current = id;
      links.forEach(function (a) { if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
      if (marker && byId[id]) {
        var li = byId[id].parentNode, top = li.offsetTop, h = li.offsetHeight;
        marker.style.transform = 'translateY(' + top + 'px)'; marker.style.height = h + 'px'; marker.classList.add('is-on');
      }
    }
    if ('IntersectionObserver' in window) {
      var visible = {};
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting ? e.boundingClientRect.top : null; });
        var best = null, bestTop = Infinity;
        sections.forEach(function (s) { var t = visible[s.id]; if (t != null && t < bestTop) { bestTop = t; best = s.id; } });
        if (best) setCurrent(best);
      }, { rootMargin: '-25% 0px -55% 0px', threshold: [0, 0.2, 0.5, 1] });
      sections.forEach(function (s) { io.observe(s); });
    }
    if (sections.length) setCurrent(sections[0].id);
    /* clicking a contents link focuses the section heading so keyboard readers land on it */
    links.forEach(function (a) {
      a.addEventListener('click', function () {
        var t = doc.getElementById(a.getAttribute('href').slice(1)); if (!t) return;
        var h = t.querySelector('h2'); if (h) { h.setAttribute('tabindex', '-1'); setTimeout(function () { h.focus({ preventScroll: true }); }, 60); }
      });
    });
  });
})();
