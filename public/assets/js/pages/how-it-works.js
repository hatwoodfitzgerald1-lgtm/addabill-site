/* How it works: the sticky phone rail (screens swap as the steps pass, the clip plays only in view),
   the By typing or by photo tabs (real tabs, arrow keys, a segmented control on mobile), the anatomy
   leader lines, and the settled DOM week used on mobile and under reduced motion. The week walk scene
   is how-it-works-scene.js, loaded after first paint. */
(function () {
  'use strict';
  var AB = window.AB, doc = document;
  if (!AB) return;

  /* ---- the sticky rail ------------------------------------------------------------- */
  function rail() {
    var phone = doc.getElementById('hiw-phone'), video = doc.getElementById('hiw-video'), caption = doc.getElementById('hiw-rail-caption');
    var steps = AB.$$('.hiw-step');
    var captions = { add: ['01', 'The water bill, added'], calendar: ['02', 'On its day, with the week ahead'], motion: ['03', 'The text, before the day'], bills: ['04', 'One tap, then marked paid'] };
    var inView = false, current = 'motion';
    function playVideo() { if (!video || AB.motion.rm) return; if (inView && current === 'motion') { var p = video.play(); if (p && p.catch) p.catch(function () {}); } else video.pause(); }
    function setLayer(name) {
      if (!phone || current === name) return; current = name;
      AB.$$('.hiw-phone__layer', phone).forEach(function (l) { var on = l.dataset.layer === name; l.classList.toggle('is-on', on); l.setAttribute('aria-hidden', on ? 'false' : 'true'); });
      if (caption && captions[name]) {
        caption.classList.add('is-swapping');
        setTimeout(function () { caption.querySelector('.hiw-rail__caption-num').textContent = captions[name][0]; caption.querySelector('.hiw-rail__caption-text').textContent = captions[name][1]; caption.classList.remove('is-swapping'); }, AB.motion.rm ? 0 : 200);
      }
      playVideo();
    }
    if (phone && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { inView = en[en.length - 1].isIntersecting; playVideo(); }, { threshold: 0.2 }).observe(phone);
    }
    if (window.ScrollTrigger && window.matchMedia('(min-width: 900px)').matches && steps.length) {
      /* the active step is read from geometry on every update, so a jump (an anchor, a fast wheel) never leaves the rail stale */
      var list = doc.getElementById('hiw-steps');
      function pick() {
        var line = window.innerHeight * 0.58, active = null;
        steps.forEach(function (s) { var r = s.getBoundingClientRect(); if (r.top <= line) active = s; });
        if (!active) { var first = steps[0].getBoundingClientRect(); if (first.top > window.innerHeight) return; active = steps[0]; }
        var last = steps[steps.length - 1].getBoundingClientRect(); if (last.bottom < line) active = steps[steps.length - 1];
        setLayer(active.dataset.screen);
      }
      ScrollTrigger.create({ trigger: list, start: 'top bottom', end: 'bottom top', onUpdate: pick, onEnter: pick, onEnterBack: pick, onRefresh: pick });
    }
    /* mobile: each step carries its own phone; the clip in step 3 plays only in view */
    AB.$$('.hiw-step__video').forEach(function (v) {
      if (AB.motion.rm || !('IntersectionObserver' in window)) return;
      new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) { if (v.preload === 'none') v.preload = 'metadata'; var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause(); }); }, { threshold: 0.3 }).observe(v);
    });
    /* the desktop video never plays under reduced motion: the poster stays */
    if (video && AB.motion.rm) video.pause();
  }

  /* ---- tabs ------------------------------------------------------------------------- */
  function tabs() {
    var list = AB.$('.hiw-tabs__list'); if (!list) return;
    var tabsEls = AB.$$('[role="tab"]', list), screen = doc.getElementById('hiw-tab-screen');
    var screenFor = { 'tab-type': 'add', 'tab-snap': 'photo', 'tab-share': 'add' }, sideFor = { 'tab-type': 'type', 'tab-snap': 'snap', 'tab-share': 'share' };
    function select(tab, focus) {
      tabsEls.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false'); t.setAttribute('tabindex', on ? '0' : '-1');
        var panel = doc.getElementById(t.getAttribute('aria-controls')); if (panel) { panel.hidden = !on; panel.classList.toggle('is-on', on); }
      });
      if (screen) AB.$$('.hiw-screen__layer', screen).forEach(function (l) { var on = l.dataset.screen === screenFor[tab.id]; l.classList.toggle('is-on', on); l.setAttribute('aria-hidden', on ? 'false' : 'true'); });
      AB.$$('.hiw-tabs__side [data-for]').forEach(function (s) { var on = s.dataset.for === sideFor[tab.id]; s.hidden = !on; s.classList.toggle('is-on', on); });
      if (focus) tab.focus();
    }
    tabsEls.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t, false); });
      t.addEventListener('keydown', function (e) {
        var j = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % tabsEls.length;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + tabsEls.length) % tabsEls.length;
        if (e.key === 'Home') j = 0; if (e.key === 'End') j = tabsEls.length - 1;
        if (j !== null) { e.preventDefault(); select(tabsEls[j], true); }
      });
    });
    select(tabsEls[0], false);
  }

  /* ---- anatomy leader lines ---------------------------------------------------------- */
  function anatomy() {
    var root = doc.getElementById('anatomy'), svg = doc.getElementById('anatomy-lines'), bubble = doc.getElementById('anatomy-bubble');
    if (!root || !svg || !bubble) return;
    var NS = 'http://www.w3.org/2000/svg';
    function draw() {
      if (!window.matchMedia('(min-width: 1000px)').matches) { svg.innerHTML = ''; return; }
      var rr = root.getBoundingClientRect(); svg.setAttribute('viewBox', '0 0 ' + rr.width + ' ' + rr.height);
      var frag = doc.createDocumentFragment();
      AB.$$('.anatomy__label', root).forEach(function (label) {
        var mark = bubble.querySelector('[data-part="' + label.dataset.for + '"]'); if (!mark) return;
        var mr = mark.getBoundingClientRect(), lr = label.getBoundingClientRect(), left = label.classList.contains('anatomy__label--l');
        var mx = (left ? mr.left : mr.right) - rr.left, my = mr.top + mr.height / 2 - rr.top;
        var lx = (left ? lr.right : lr.left) - rr.left, ly = lr.top + lr.height / 2 - rr.top;
        var k = Math.abs(mx - lx) * 0.45, dir = left ? -1 : 1;
        var p = doc.createElementNS(NS, 'path');
        p.setAttribute('d', 'M' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' C' + (mx + dir * k).toFixed(1) + ' ' + my.toFixed(1) + ', ' + (lx - dir * k).toFixed(1) + ' ' + ly.toFixed(1) + ', ' + lx.toFixed(1) + ' ' + ly.toFixed(1));
        p.setAttribute('pathLength', '1000'); p.setAttribute('class', 'draw-path'); frag.appendChild(p);
        var c = doc.createElementNS(NS, 'circle'); c.setAttribute('cx', mx.toFixed(1)); c.setAttribute('cy', my.toFixed(1)); c.setAttribute('r', '3.5'); frag.appendChild(c);
      });
      svg.innerHTML = ''; svg.appendChild(frag);
    }
    draw();
    var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(draw, 120); });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(draw);
    window.addEventListener('load', draw);
  }

  /* ---- the settled DOM week (mobile and reduced motion) ------------------------------- */
  function domWeek() {
    var week = doc.getElementById('hiw-week'), hero = AB.$('.hiw-hero');
    if (!week) return;
    if (!(AB.motion.mobileHero || AB.motion.rm)) return;
    week.hidden = false; week.classList.add('is-active');
    var mount = doc.getElementById('hiw-scene'); if (mount) mount.classList.add('is-dom');
    if (AB.motion.rm || !window.gsap || !window.ScrollTrigger) { week.classList.add('is-landed'); return; }
    var tags = AB.$$('.tag', week), chip = AB.$('.chip-headsup', week);
    gsap.set(tags, { y: -30, opacity: 0 });
    ScrollTrigger.create({
      trigger: hero, start: 'top top', end: 'bottom 45%', scrub: 0.6,
      onUpdate: function (st) {
        var p = st.progress;
        tags.forEach(function (t, k) { var u = AB.range(p, 0.05 + k * 0.15, 0.35 + k * 0.15); gsap.set(t, { opacity: u, y: -30 * (1 - AB.ease.headsup(u)) }); });
        if (chip) { var c = AB.range(p, 0.55, 0.9); gsap.set(chip, { y: -26 * AB.ease.headsup(c), opacity: 1 - AB.range(c, 0.7, 1) }); }
        if (p > 0.4) week.classList.add('is-landed');
      },
      onRefresh: function (st) { AB.qa.arc(st.start, st.end, 'How it works week (DOM)'); }
    });
  }

  AB.onReady(function () { rail(); tabs(); anatomy(); domWeek(); });
})();
