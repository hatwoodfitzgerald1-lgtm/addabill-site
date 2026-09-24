/* Addabill blog posts: shared behaviour for the four post routes. Inlines the post's kit SVG
   (svg-post-a to -d) and assembles it on scroll by animating its k-* classes and pathLength
   strokes, draws any [data-draw] kit divider on enter, and makes the "More from the blog" cards
   click through. The post's scene lives in post-scene.js (lazy, one canvas, sticky rail). */
(function () {
  'use strict';
  var AB = window.AB, doc = document;
  if (!AB) return;
  var post = (doc.body.className.match(/page-post--([abcd])/) || [0, 'a'])[1];
  var hasGsap = typeof window.gsap !== 'undefined', hasST = hasGsap && typeof window.ScrollTrigger !== 'undefined';

  /* ---- the kit graphic, inlined and assembled on scroll ---------------------------- */
  function kit() {
    var fig = doc.querySelector('.post-kit__figure'); if (!fig) return;
    var img = fig.querySelector('img'); if (!img) return;
    var railImg = doc.getElementById('post-settled');
    /* fetch when the figure comes near (the rail's settled copy needs it at once under reduced motion) */
    var started = false;
    function start() { if (started) return; started = true; load(); }
    if (AB.motion.rm || !('IntersectionObserver' in window)) start();
    else { var io = new IntersectionObserver(function (en) { if (en.some(function (e) { return e.isIntersecting; })) { io.disconnect(); start(); } }, { rootMargin: '900px 0px' }); io.observe(fig); }
    function load() {
    fetch(img.getAttribute('src')).then(function (r) { return r.ok ? r.text() : Promise.reject(); }).then(function (txt) {
      /* svg-post-b.svg carries a duplicated class attribute on the landed tag, which is invalid XML; mend it before parsing */
      txt = txt.replace(/(<g\b[^>]*?)\sclass="([^"]*)"([^>]*?)\sclass="([^"]*)"/g, '$1 class="$2 $4"$3');
      var parsed = new DOMParser().parseFromString(txt, 'image/svg+xml'), svg = parsed.documentElement;
      if (!svg || svg.nodeName.toLowerCase() !== 'svg' || parsed.querySelector('parsererror')) return;
      AB.$$('style', svg).forEach(function (s) { s.remove(); });
      var bg = svg.querySelector('rect[width="600"][height="400"]'); if (bg) bg.remove();
      svg.removeAttribute('width'); svg.removeAttribute('height');
      svg.setAttribute('class', 'post-kit__svg kit-svg');
      if (railImg) {
        /* the settled state in the rail (reduced motion, no WebGL, coarse pointers) uses the same drawing inline */
        var copy = doc.importNode(svg, true); copy.setAttribute('class', 'post-rail__settled kit-svg'); copy.id = 'post-settled'; copy.setAttribute('aria-hidden', 'true');
        AB.$$('[id]', copy).forEach(function (n) { if (n !== copy) n.removeAttribute('id'); }); copy.removeAttribute('aria-labelledby'); copy.removeAttribute('role');
        copy.hidden = railImg.hidden; railImg.replaceWith(copy);
      }
      var node = doc.importNode(svg, true);
      AB.$$('[id]', node).forEach(function (n) { n.id = 'kit-' + n.id; });
      node.setAttribute('aria-labelledby', 'kit-t kit-d');
      img.replaceWith(node);
      if (AB.motion.rm || !hasST) return; /* reduced motion shows the drawn state */
      assemble(node);
    }).catch(function () { /* the image stays */ });
    }
  }

  function prepStrokes(paths) {
    paths.forEach(function (p) {
      var len = 1; if (!p.hasAttribute('pathLength')) { try { len = Math.ceil(p.getTotalLength()); } catch (e) { len = 1000; } p.setAttribute('pathLength', len); }
      else len = parseFloat(p.getAttribute('pathLength')) || 1;
      p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
    });
  }
  function drawTo(tl, paths, at, dur, stagger) {
    if (!paths.length) return;
    tl.to(paths, { strokeDashoffset: 0, duration: dur || AB.D.slow, ease: 'headsup', stagger: stagger || 0 }, at);
  }

  function assemble(svg) {
    var tl = gsap.timeline({ paused: true });
    var cells = AB.$$('.k-cell', svg), nums = AB.$$('.k-num', svg);
    prepStrokes(cells);
    if (nums.length) gsap.set(nums, { opacity: 0 });
    if (post === 'a') {
      var tags = AB.$$('.k-tag[data-step]', svg).sort(function (x, y) { return +x.dataset.step - +y.dataset.step; });
      var paid = AB.$$('.k-paid', svg), tick = AB.$$('.k-todaytick', svg);
      prepStrokes(paid);
      gsap.set(tags, { opacity: 0, y: -10, transformOrigin: '50% 100%' });
      if (tick.length) gsap.set(tick, { opacity: 0, scaleY: 0, transformOrigin: '50% 0%' });
      drawTo(tl, cells, 0, AB.D.slow, 0.012);
      tl.to(nums, { opacity: 1, duration: AB.D.base, ease: 'headsup', stagger: 0.008 }, 0.3);
      if (tick.length) tl.to(tick, { opacity: 1, scaleY: 1, duration: AB.D.base, ease: 'headsup' }, 0.9);
      tl.to(tags, { opacity: 1, y: 0, duration: AB.D.base, ease: 'headsup', stagger: 0.16 }, 1.0);
      drawTo(tl, paid, 1.2 + tags.length * 0.16, AB.D.base);
    } else if (post === 'b') {
      var dip = AB.$$('.k-dip', svg), level = AB.$$('.k-level', svg), crooked = svg.querySelector('.k-tag[data-step="1"]'), landed = svg.querySelector('.k-tag[data-step="2"]');
      var arc = AB.$$('.k-arc', svg), dot = AB.$$('.k-dot', svg), hair = AB.$$('.k-hair, .k-line', svg);
      prepStrokes(arc); prepStrokes(hair);
      if (level.length) level.forEach(function (l) { AB.$$('[style]', l).forEach(function (n) { n.style.opacity = ''; }); });
      gsap.set(level, { opacity: 0 });
      if (crooked) gsap.set(crooked, { opacity: 0 });
      if (landed) gsap.set(landed, { opacity: 0, y: -14 });
      gsap.set(dot, { scale: 0, transformOrigin: '50% 50%' });
      drawTo(tl, cells, 0, AB.D.slow, 0.05);
      tl.to(nums, { opacity: 1, duration: AB.D.base, ease: 'headsup', stagger: 0.03 }, 0.4);
      drawTo(tl, hair, 0.5, AB.D.slow);
      if (crooked) tl.to(crooked, { opacity: 1, duration: AB.D.base, ease: 'headsup' }, 0.9);
      drawTo(tl, arc, 1.4, AB.D.slow);
      tl.to(dot, { scale: 1, duration: AB.D.base, ease: 'headsup' }, 2.5);
      if (landed) tl.to(landed, { opacity: 1, y: 0, duration: AB.D.base, ease: 'headsup' }, 2.6);
      if (crooked) tl.to(crooked, { opacity: 0, duration: AB.D.base, ease: 'pageturn' }, 2.7);
      tl.to(dip, { opacity: 0, duration: AB.D.base, ease: 'pageturn' }, 3.0);
      tl.to(level, { opacity: 1, duration: AB.D.base, ease: 'headsup' }, 3.05);
    } else if (post === 'c') {
      var objs = AB.$$('.k-obj[data-step]', svg).sort(function (x, y) { return +x.dataset.step - +y.dataset.step; });
      var dotc = AB.$$('.k-dot', svg); gsap.set(dotc, { scale: 0, transformOrigin: '50% 50%' });
      objs.forEach(function (o, i) {
        var strokes = AB.$$('path', o); prepStrokes(strokes);
        var fills = AB.$$('.k-note', o); if (fills.length) gsap.set(fills, { fillOpacity: 0 });
        var at = i * 1.1;
        drawTo(tl, strokes, at, AB.D.slow, 0.02);
        if (fills.length) tl.to(fills, { fillOpacity: 1, duration: AB.D.base, ease: 'headsup' }, at + 0.8);
      });
      tl.to(dotc, { scale: 1, duration: AB.D.base, ease: 'headsup' }, objs.length * 1.1 + 0.2);
    } else {
      var ticks = AB.$$('.k-tick', svg), circle = AB.$$('.k-circle', svg), arcs = AB.$$('.k-arc', svg), dots = AB.$$('.k-dot', svg), hairs = AB.$$('.k-hair', svg);
      prepStrokes(ticks); prepStrokes(circle); prepStrokes(arcs); prepStrokes(hairs);
      gsap.set(dots, { scale: 0, transformOrigin: '50% 50%' });
      drawTo(tl, cells, 0, AB.D.slow, 0.06);
      tl.to(nums, { opacity: 1, duration: AB.D.base, ease: 'headsup', stagger: 0.04 }, 0.4);
      drawTo(tl, hairs, 0.6, AB.D.base);
      drawTo(tl, ticks, 1.0, AB.D.base, 0.5);
      drawTo(tl, circle, 2.6, AB.D.slow);
      tl.to(dots, { scale: 1, duration: AB.D.base, ease: 'headsup', stagger: 0.2 }, 3.3);
      drawTo(tl, arcs, 3.0, AB.D.slow, 0.25);
    }
    var fig = svg.closest('.post-kit') || svg;
    ScrollTrigger.create({ trigger: fig, start: 'top 85%', end: 'center 45%', scrub: 0.6, animation: tl, invalidateOnRefresh: true });
  }

  /* ---- kit dividers that sit inside a section with another entrance -------------------- */
  function dividers() {
    AB.$$('[data-draw]').forEach(function (el) {
      var paths = AB.$$('.draw-path', el); if (!paths.length) return;
      if (AB.motion.rm || !hasST) return;
      prepStrokes(paths);
      ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: function () { gsap.to(paths, { strokeDashoffset: 0, duration: AB.D.slow, ease: 'headsup', stagger: 0.12 }); } });
    });
  }

  /* ---- More from the blog: the whole card opens the piece ----------------------------- */
  function cardClicks() {
    AB.$$('.post-card').forEach(function (card) {
      var link = card.querySelector('h2 a, h3 a'); if (!link) return;
      card.addEventListener('click', function (e) {
        if (e.target.closest('a, button')) return;
        if (e.metaKey || e.ctrlKey) { window.open(link.href, '_blank', 'noopener'); return; }
        link.click();
      });
    });
  }

  /* ---- the section the reader is on (drives the rail scene through window.__postReading) --- */
  function reading() {
    var secs = AB.$$('.post-col [data-scene-step]'); if (!secs.length || !hasST) return;
    var state = window.__postReading = { steps: {}, active: -1 };
    secs.forEach(function (s) {
      var k = s.dataset.sceneStep;
      state.steps[k] = 0;
      ScrollTrigger.create({ trigger: s, start: 'top 70%', end: 'bottom 40%', scrub: 0.6, onUpdate: function (st) { state.steps[k] = st.progress; }, onToggle: function (st) { if (st.isActive) state.active = +k; } });
    });
  }

  AB.onReady(function () { kit(); dividers(); cardClicks(); reading(); });
})();
