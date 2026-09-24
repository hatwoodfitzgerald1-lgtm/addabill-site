/* Addabill core.js. Loaded on every page after the GSAP vendor files.
   Provides window.AB: motion flags (reduced motion incl. ?qa=rm, touch, mobile hero), the two
   named easings registered with GSAP, the header (condense, day cell nav indicator, mobile
   drawer with the week strip), the reveal system, the 13 text hover treatments, the Settled
   Numeral, the flip calendar loader, small helpers (accordion, shelf, stamp, announce, forms)
   and the ?qa=arc console hook. Page scripts never re implement any of this. */
(function () {
  'use strict';
  var AB = window.AB = window.AB || {};
  var doc = document, root = doc.documentElement, qs = new URLSearchParams(location.search);
  var hasGsap = typeof window.gsap !== 'undefined';
  var hasST = hasGsap && typeof window.ScrollTrigger !== 'undefined';
  if (hasST) { gsap.registerPlugin(ScrollTrigger); }
  if (hasGsap && typeof window.Flip !== 'undefined') { gsap.registerPlugin(Flip); }

  /* ---- motion flags ---------------------------------------------------- */
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var coarse = window.matchMedia ? window.matchMedia('(pointer: coarse)').matches : false;
  AB.motion = {
    rm: mq.matches || qs.get('qa') === 'rm' || root.classList.contains('rm'),
    touch: coarse || ('ontouchstart' in window && navigator.maxTouchPoints > 0),
    get mobileHero() { return window.innerWidth < 900 || AB.motion.touch; }
  };
  if (AB.motion.rm) root.classList.add('rm');
  root.classList.add('js');
  AB.qa = { arcFlag: qs.get('qa') === 'arc', rmFlag: qs.get('qa') === 'rm' };
  AB.qa.arc = function (startPx, endPx, label) {
    if (!AB.qa.arcFlag) return;
    var vh = window.innerHeight, len = endPx - startPx;
    console.log('[qa arc] ' + (label || 'Heads-Up timeline') + ': start ' + Math.round(startPx) + 'px, end ' + Math.round(endPx) + 'px, pinned length ' + Math.round(len) + 'px = ' + (len / vh).toFixed(2) + ' viewport heights (viewport ' + vh + 'px).');
  };

  /* ---- easings: the two curves, registered with GSAP ------------------- */
  function cubicBezier(p1x, p1y, p2x, p2y) {
    function A(a1, a2) { return 1 - 3 * a2 + 3 * a1; }
    function B(a1, a2) { return 3 * a2 - 6 * a1; }
    function C(a1) { return 3 * a1; }
    function calc(t, a1, a2) { return ((A(a1, a2) * t + B(a1, a2)) * t + C(a1)) * t; }
    function slope(t, a1, a2) { return 3 * A(a1, a2) * t * t + 2 * B(a1, a2) * t + C(a1); }
    function tFor(x) {
      var t = x, i;
      for (i = 0; i < 6; i++) { var s = slope(t, p1x, p2x); if (s === 0) return t; var xx = calc(t, p1x, p2x) - x; t -= xx / s; }
      return t;
    }
    return function (x) { if (x <= 0) return 0; if (x >= 1) return 1; return calc(tFor(x), p1y, p2y); };
  }
  AB.ease = { headsup: cubicBezier(0.24, 0.8, 0.26, 1), pageturn: cubicBezier(0.42, 0, 0.14, 1) };
  AB.css = { headsup: 'cubic-bezier(0.24, 0.8, 0.26, 1)', pageturn: 'cubic-bezier(0.42, 0, 0.14, 1)', fast: 0.2, base: 0.48, slow: 1.4 };
  if (hasGsap) { gsap.registerEase('headsup', AB.ease.headsup); gsap.registerEase('pageturn', AB.ease.pageturn); if (qs.get('qa')) gsap.ticker.lagSmoothing(0); }
  AB.D = { fast: 0.2, base: 0.48, slow: 1.4 };

  /* ---- small utilities --------------------------------------------------- */
  AB.$ = function (sel, ctx) { return (ctx || doc).querySelector(sel); };
  AB.$$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); };
  AB.onReady = function (fn) { if (doc.readyState !== 'loading') fn(); else doc.addEventListener('DOMContentLoaded', fn); };
  AB.afterPaint = function (fn) {
    var run = function () { if ('requestIdleCallback' in window) requestIdleCallback(function () { fn(); }, { timeout: 800 }); else setTimeout(fn, 60); };
    requestAnimationFrame(function () { requestAnimationFrame(run); });
  };
  AB.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  AB.lerp = function (a, b, t) { return a + (b - a) * t; };
  AB.smooth = function (t) { t = AB.clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  AB.range = function (p, a, b) { return AB.clamp((p - a) / (b - a), 0, 1); };
  var live;
  AB.announce = function (text) {
    if (!live) { live = doc.createElement('div'); live.className = 'status-live'; live.setAttribute('aria-live', 'polite'); live.setAttribute('role', 'status'); doc.body.appendChild(live); }
    live.textContent = ''; setTimeout(function () { live.textContent = text; }, 40);
  };
  AB.stamp = function (container, text, opts) {
    opts = opts || {};
    var s = doc.createElement('span');
    s.className = 'stamp is-in' + (opts.marigold ? ' stamp--marigold' : '');
    s.innerHTML = (opts.check ? '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path class="draw" d="M5 12.5l4.5 4.5L19 7"/></svg>' : '') + '<span></span>';
    s.lastChild.textContent = text;
    if (opts.replace) container.innerHTML = '';
    container.appendChild(s);
    if (opts.announce !== false) AB.announce(text);
    return s;
  };
  AB.splitWords = function (el, cls) {
    if (!el || el.dataset.split === '1') return [];
    var ok = Array.prototype.every.call(el.childNodes, function (n) { return n.nodeType === 3; });
    if (!ok) return [];
    var text = el.textContent, words = text.split(/(\s+)/), out = [];
    el.textContent = '';
    words.forEach(function (w) {
      if (!w) return;
      if (/^\s+$/.test(w)) { el.appendChild(doc.createTextNode(w)); return; }
      var s = doc.createElement('span'); s.className = cls || 'hw'; s.textContent = w; s.setAttribute('tabindex', '-1'); el.appendChild(s); out.push(s);
    });
    el.dataset.split = '1';
    return out;
  };
  AB.pressOnTouch = function (el) {
    el.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse') return; el.classList.add('is-pressed'); setTimeout(function () { el.classList.remove('is-pressed'); }, 700); }, { passive: true });
  };

  /* ---- header ------------------------------------------------------------- */
  function header() {
    var hdr = AB.$('.hdr'); if (!hdr) return;
    var condensed = false;
    function onScroll() {
      var y = window.scrollY || window.pageYOffset;
      if (y > 40 && !condensed) { condensed = true; hdr.classList.add('is-condensed'); }
      else if (y <= 40 && condensed) { condensed = false; hdr.classList.remove('is-condensed'); }
    }
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

    /* the day cell that slides under the active link */
    var nav = AB.$('.hdr__nav', hdr);
    if (nav) {
      var ul = AB.$('ul', nav), links = AB.$$('a', ul), cell = doc.createElement('span');
      cell.className = 'nav-cell'; cell.setAttribute('aria-hidden', 'true'); ul.appendChild(cell);
      var path = location.pathname.replace(/\/+$/, '') || '/';
      var active = links.filter(function (a) { var h = a.getAttribute('href').replace(/\/+$/, '') || '/'; return h === path || (h !== '/' && path.indexOf(h) === 0); })[0];
      if (active) active.setAttribute('aria-current', 'page');
      function moveTo(a) {
        if (!a) { cell.classList.remove('is-on'); return; }
        var r = a.getBoundingClientRect(), u = ul.getBoundingClientRect();
        cell.style.width = r.width + 'px';
        cell.style.transform = 'translateX(' + (r.left - u.left) + 'px)';
        cell.classList.add('is-on');
      }
      links.forEach(function (a) {
        a.addEventListener('mouseenter', function () { moveTo(a); });
        a.addEventListener('focus', function () { moveTo(a); });
      });
      ul.addEventListener('mouseleave', function () { moveTo(active); });
      ul.addEventListener('focusout', function (e) { if (!ul.contains(e.relatedTarget)) moveTo(active); });
      if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { moveTo(active); }); else moveTo(active);
      window.addEventListener('resize', function () { moveTo(active); });
    }

    /* mobile drawer with the 7 day strip */
    var btn = AB.$('.menu-btn', hdr), mnav = AB.$('#mnav');
    if (btn && mnav) {
      var closeBtn = AB.$('.mnav__close', mnav);
      var strip = AB.$('.week-strip', mnav);
      if (strip) {
        var now = new Date(), dow = now.getDay(), names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], html = '';
        for (var i = 0; i < 7; i++) {
          var d = new Date(now); d.setDate(now.getDate() - dow + i);
          html += '<div class="wd' + (i === dow ? ' is-today' : '') + '"' + (i === dow ? ' aria-current="date"' : '') + '><small>' + names[i] + '</small><b>' + d.getDate() + '</b></div>';
        }
        strip.innerHTML = html;
      }
      function setOpen(open) {
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        mnav.classList.toggle('is-open', open);
        doc.body.classList.toggle('menu-open', open);
        if (open) { (closeBtn || mnav).focus(); } else { btn.focus(); }
      }
      btn.addEventListener('click', function () { setOpen(btn.getAttribute('aria-expanded') !== 'true'); });
      if (closeBtn) closeBtn.addEventListener('click', function () { setOpen(false); });
      doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && mnav.classList.contains('is-open')) setOpen(false); });
      AB.$$('a', mnav).forEach(function (a) { var h = a.getAttribute('href').replace(/\/+$/, '') || '/'; if (h === (location.pathname.replace(/\/+$/, '') || '/')) a.setAttribute('aria-current', 'page'); });
    }
  }

  /* ---- Settled Numeral ------------------------------------------------------ */
  AB.settle = function (el, opts) {
    opts = opts || {};
    if (el.classList.contains('is-settled')) return;
    if (AB.motion.rm || !hasGsap) { el.classList.add('is-settled'); return; }
    gsap.to(el, { '--wonk': 0, '--opsz': opts.opsz != null ? opts.opsz : 144, duration: opts.duration || AB.D.slow, ease: 'headsup', delay: opts.delay || 0, onComplete: function () { el.classList.add('is-settled'); } });
  };
  function settledNumerals() {
    AB.$$('.settle-num:not([data-manual])').forEach(function (el) {
      if (AB.motion.rm) { el.classList.add('is-settled'); return; }
      if (hasST) ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: function () { AB.settle(el); } });
      else AB.settle(el);
    });
  }

  /* ---- reveal system ------------------------------------------------------ */
  var revealPlays = {
    'rise': function (t, st) { return gsap.fromTo(t, { y: 40, opacity: 0, boxShadow: '0 2px 4px rgba(43,38,34,0.06), 0 22px 44px rgba(43,38,34,0.16)' }, { y: 0, opacity: 1, boxShadow: '0 1px 2px rgba(43,38,34,0.06), 0 6px 18px rgba(43,38,34,0.08)', duration: AB.D.slow, ease: 'headsup', stagger: st, clearProps: 'boxShadow' }); },
    'fade-up': function (t, st) { return gsap.fromTo(t, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: AB.D.base, ease: 'headsup', stagger: st }); },
    'pop': function (t, st) { return gsap.fromTo(t, { x: 48, scale: 0.92, opacity: 0 }, { x: 0, scale: 1, opacity: 1, duration: AB.D.base, ease: 'headsup', stagger: st }); },
    'stamp': function (t, st) { return gsap.fromTo(t, { scale: 1.12, rotate: -2, opacity: 0, transformOrigin: '30% 50%' }, { scale: 1, rotate: 0, opacity: 1, duration: AB.D.base, ease: 'headsup', stagger: st }); },
    'flip-in': function (t, st, el) { gsap.set(el, { perspective: 900 }); return gsap.fromTo(t, { rotateX: -88, opacity: 0, transformOrigin: '50% 0%', transformPerspective: 900 }, { rotateX: 0, opacity: 1, duration: AB.D.base, ease: 'headsup', stagger: st }); },
    'mask-up': function (t, st) { return gsap.fromTo(t, { clipPath: 'inset(100% 0 0 0)', y: 22, opacity: 0 }, { clipPath: 'inset(0% 0 0 0)', y: 0, opacity: 1, duration: AB.D.base, ease: 'headsup', stagger: st, clearProps: 'clipPath' }); },
    'unmask-up': function (t, st) { return gsap.fromTo(t, { clipPath: 'inset(100% 0 0 0 round 10px)', opacity: 0, y: 10 }, { clipPath: 'inset(0% 0 0 0 round 10px)', opacity: 1, y: 0, duration: AB.D.slow, ease: 'headsup', stagger: st, clearProps: 'clipPath' }); },
    'unmask-left': function (t, st) { var imgs = []; t.forEach(function (n) { imgs = imgs.concat(AB.$$('img, video', n)); }); if (imgs.length) gsap.fromTo(imgs, { scale: 1.06 }, { scale: 1, duration: AB.D.slow, ease: 'headsup', stagger: st, clearProps: 'scale' }); return gsap.fromTo(t, { clipPath: 'inset(0 100% 0 0)', opacity: 0 }, { clipPath: 'inset(0 0% 0 0)', opacity: 1, duration: AB.D.slow, ease: 'headsup', stagger: st, clearProps: 'clipPath' }); },
    'clip-cell': function (t, st) { return gsap.fromTo(t, { clipPath: 'inset(46% 46% 46% 46% round 10px)', opacity: 0 }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', opacity: 1, duration: AB.D.slow, ease: 'headsup', stagger: st, clearProps: 'clipPath' }); },
    'draw-in': function (t, st, el) {
      var paths = AB.$$('.draw-path', el);
      paths.forEach(function (p) { var len = 1000; try { len = Math.ceil(p.getTotalLength()); } catch (e) {} if (p.hasAttribute('pathLength')) len = parseFloat(p.getAttribute('pathLength')); p.style.setProperty('--len', len); p.style.strokeDasharray = len; p.style.strokeDashoffset = len; });
      var tl = gsap.timeline();
      if (paths.length) tl.to(paths, { strokeDashoffset: 0, duration: AB.D.slow, ease: 'headsup', stagger: 0.1 }, 0);
      var items = AB.revealItems(el);
      if (items.length) tl.fromTo(items, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: AB.D.base, ease: 'headsup', stagger: st }, 0.15);
      return tl;
    },
    'settle': function (t, st, el) {
      var tl = gsap.timeline();
      var paths = AB.$$('.draw-path', el);
      paths.forEach(function (p) { var len = 1000; try { len = Math.ceil(p.getTotalLength()); } catch (e) {} if (p.hasAttribute('pathLength')) len = parseFloat(p.getAttribute('pathLength')); p.style.strokeDasharray = len; p.style.strokeDashoffset = len; });
      if (paths.length) tl.to(paths, { strokeDashoffset: 0, duration: AB.D.slow, ease: 'headsup' }, 0);
      tl.fromTo(t, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: AB.D.base, ease: 'headsup', stagger: st }, 0.1);
      AB.$$('.settle-num', el).forEach(function (n, i) { n.setAttribute('data-manual', '1'); AB.settle(n, { delay: 0.1 + i * st }); });
      return tl;
    }
  };
  /* the items a reveal staggers: direct children with data-reveal-item, or the descendants a data-reveal-items selector names */
  AB.revealItems = function (el) { var sel = el.dataset.revealItems; return sel ? AB.$$(sel, el) : AB.$$(':scope > [data-reveal-item]', el); };
  AB.revealNow = function (el) {
    var type = el.dataset.reveal, items = AB.revealItems(el);
    var targets = items.length ? items : [el];
    var st = parseFloat(el.dataset.revealStagger || 0.09);
    el.classList.add('is-revealed');
    if (AB.motion.rm || !hasGsap || !revealPlays[type]) { return; }
    if (items.length) gsap.set(el, { opacity: 1 });
    revealPlays[type](targets, st, el);
  };
  function reveals() {
    var els = AB.$$('[data-reveal]');
    els.forEach(function (el) {
      if (AB.motion.rm || !hasST) { el.classList.add('is-revealed'); if (el.dataset.reveal === 'settle') AB.$$('.settle-num', el).forEach(function (n) { n.classList.add('is-settled'); }); return; }
      ScrollTrigger.create({ trigger: el, start: el.dataset.revealStart || 'top 84%', once: true, onEnter: function () { AB.revealNow(el); } });
    });
  }

  /* ---- hover treatments (13) ----------------------------------------------- */
  var hoverSetup = {
    'pencil-circle': function (el) {
      el.classList.add('hw-pencil');
      var made = false;
      function make() {
        if (made) return; made = true;
        var w = Math.max(el.offsetWidth, 12), h = Math.max(el.offsetHeight, 12);
        var W = w * 1.16, H = h * 1.36, cx = W / 2, cy = H / 2, rx = w * 0.56, ry = h * 0.62, pts = [];
        for (var i = 0; i <= 26; i++) {
          var a = -0.5 + (i / 26) * Math.PI * 2.15;
          var j = 1 + (Math.sin(i * 1.7) * 0.035) + (i > 22 ? (i - 22) * 0.02 : 0);
          pts.push((cx + Math.cos(a) * rx * j).toFixed(1) + ' ' + (cy + Math.sin(a) * ry * j * 1.02).toFixed(1));
        }
        var svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'pencil'); svg.setAttribute('viewBox', '0 0 ' + W.toFixed(1) + ' ' + H.toFixed(1)); svg.setAttribute('aria-hidden', 'true');
        svg.innerHTML = '<path pathLength="1000" d="M' + pts.join(' L') + '"/>';
        el.appendChild(svg);
      }
      el.addEventListener('mouseenter', make); el.addEventListener('focus', make); el.addEventListener('pointerdown', make, { passive: true });
    },
    'highlighter': function (el) { el.classList.add('hw-highlighter'); },
    'dated-underline': function (el) { el.classList.add('hw-dated'); },
    'settle': function (el) { el.classList.add('hw-settle'); if (getComputedStyle(el).fontFamily.indexOf('Fraunces') < 0) el.classList.add('ui'); },
    'tap': function (el) { el.classList.add('hw-tap'); },
    'pull-quote-lift': function (el) { el.classList.add('hw-lift'); },
    'date-stamp': function (el) {
      el.classList.add('hw-stamp');
      var s = doc.createElement('span'); s.className = 'stampmark'; s.setAttribute('aria-hidden', 'true');
      var d = el.dataset.date || (el.closest('[data-date]') ? el.closest('[data-date]').dataset.date : null);
      if (!d) { var n = new Date(); d = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][n.getMonth()] + ' ' + n.getFullYear(); }
      s.textContent = d; el.appendChild(s);
    },
    'check': function (el) {
      el.classList.add('hw-check');
      var svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'checkmark'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
      svg.innerHTML = '<path d="M4 12.5l5 5L20 6.5"/>'; el.appendChild(svg);
    },
    'strike': function (el) { el.classList.add('hw-strike'); },
    'sticky': function (el) { el.classList.add('hw-sticky'); },
    'count': function (el) {
      var m = el.textContent.match(/\d[\d,\.]*/);
      if (!m || !hasGsap) { hoverSetup.settle(el); return; }
      el.classList.add('hw-count');
      var orig = el.textContent, num = parseFloat(m[0].replace(/,/g, '')), busy = false;
      var fmt = function (v) { var dec = (m[0].split('.')[1] || '').length; var s = v.toFixed(dec); if (m[0].indexOf(',') >= 0) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ','); return orig.replace(m[0], s); };
      function run() { if (busy) return; busy = true; var o = { v: 0 }; gsap.to(o, { v: num, duration: AB.D.base, ease: 'headsup', onUpdate: function () { el.textContent = fmt(o.v); }, onComplete: function () { el.textContent = orig; busy = false; } }); }
      el.addEventListener('mouseenter', run); el.addEventListener('focus', run); el.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') run(); }, { passive: true });
    },
    'magnet': function (el) {
      el.classList.add('hw-magnet');
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), len = Math.hypot(dx, dy) || 1;
        el.style.transform = 'translate(' + (dx / len * 2).toFixed(2) + 'px,' + (dy / len * 2).toFixed(2) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    },
    'added': function (el) {
      el.classList.add('hw-added');
      var s = doc.createElement('span'); s.className = 'addedmark'; s.setAttribute('aria-hidden', 'true'); s.textContent = 'Added'; el.appendChild(s);
    }
  };
  AB.applyHover = function (type, el) {
    if (!hoverSetup[type] || el.dataset.hw) return;
    el.dataset.hw = type; el.classList.add('hw');
    hoverSetup[type](el);
    AB.pressOnTouch(el);
  };
  function hoverTreatments() {
    var main = AB.$('main[data-hover]'); if (!main) return;
    var type = main.dataset.hover;
    if (!hoverSetup[type]) return;
    var targets = AB.$$('a[href]:not(.tag-btn):not(.card):not(.no-hover):not(.chip), .hover-word, .chip[data-hover-chip]', main);
    AB.$$('h1:not(.no-hover), h2:not(.no-hover), h3:not(.no-hover), .pull-quote:not(.no-hover)', main).forEach(function (h) {
      if (h.closest('a')) return;
      targets = targets.concat(AB.splitWords(h, 'hw'));
    });
    targets.forEach(function (el) {
      if (el.closest('.hw') && el.closest('.hw') !== el) return;
      AB.applyHover(type, el);
    });
  }

  /* ---- the flip calendar loader (TRN-001) ------------------------------- */
  AB.loader = function (opts) {
    var el = opts.root; if (!el) return null;
    var monthCard = AB.$('.loader__card--month .val', el), dayCard = AB.$('.loader__card--day', el), wdCard = AB.$('.loader__card--weekday .val', el);
    var faceA = AB.$('.face.a', dayCard), faceB = AB.$('.face.b', dayCard), skip = AB.$('.loader__skip', el), status = AB.$('.loader__status', el);
    var now = new Date(), today = now.getDate();
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    if (monthCard) monthCard.textContent = months[now.getMonth()];
    if (wdCard) wdCard.textContent = days[now.getDay()];
    var items = {}, total = 0, done = 0, shownDay = 1, finished = false, flipping = false, queue = null, cap = opts.cap || 4000, t0 = performance.now();
    var api = {
      expect: function (name, weight) { if (items[name] != null) return; items[name] = { w: weight || 1, done: false }; total += weight || 1; },
      done: function (name) { var it = items[name]; if (!it || it.done) return; it.done = true; done += it.w; api.set(done / total); if (done >= total) api.finish(); },
      set: function (p) { setProgress(AB.clamp(p, 0, 1)); },
      finish: finish, get finished() { return finished; }, elapsed: function () { return performance.now() - t0; }
    };
    if (faceA) faceA.textContent = '1';
    function showDay(d) {
      if (!faceA) return;
      if (AB.motion.rm || !hasGsap) { faceA.textContent = d; shownDay = d; return; }
      if (flipping) { queue = d; return; }
      flipping = true; shownDay = d;
      faceB.textContent = d;
      gsap.set(faceB, { rotateX: 90 });
      gsap.timeline({ onComplete: function () { faceA.textContent = d; gsap.set(faceA, { rotateX: 0 }); gsap.set(faceB, { rotateX: 90 }); flipping = false; if (queue != null) { var q = queue; queue = null; if (q !== shownDay) showDay(q); } } })
        .to(faceA, { rotateX: -90, duration: AB.D.fast, ease: 'pageturn' }, 0)
        .to(faceB, { rotateX: 0, duration: AB.D.fast, ease: 'pageturn' }, AB.D.fast * 0.7);
    }
    function setProgress(p) {
      if (finished) return;
      var d = Math.round(1 + p * (today - 1));
      if (status) status.textContent = Math.round(p * 100) + '% loaded';
      if (d !== shownDay) showDay(d);
    }
    function finish(skipped) {
      if (finished) return; finished = true;
      if (status) status.textContent = 'Loaded';
      var target = opts.flipTarget ? AB.$(opts.flipTarget) : null;
      function end() { el.classList.add('is-done'); el.setAttribute('aria-hidden', 'true'); if (opts.onDone) opts.onDone(skipped); }
      if (AB.motion.rm || !hasGsap) { if (faceA) faceA.textContent = today; setTimeout(end, 200); return; }
      queue = null; flipping = false; if (faceA) { faceA.textContent = today; gsap.set(faceA, { rotateX: 0 }); }
      /* the status line and the Skip button leave the moment the load resolves; only the day card stays for the Flip */
      gsap.to([status, skip].filter(Boolean), { opacity: 0, duration: AB.D.fast, ease: 'pageturn', onComplete: function () { if (skip) skip.style.visibility = 'hidden'; } });
      if (target && window.Flip) {
        gsap.delayedCall(0.15, function () {
          dayCard.style.zIndex = 6;
          var vars = Flip.fit(dayCard, target, { getVars: true, scale: true, absolute: true });
          vars.duration = AB.D.base; vars.ease = 'headsup';
          vars.onComplete = function () { gsap.to(dayCard, { opacity: 0, duration: AB.D.fast, ease: 'pageturn' }); end(); };
          gsap.to(dayCard, vars);
          gsap.to([AB.$('.loader__card--month', el), AB.$('.loader__card--weekday', el)], { opacity: 0, y: 10, duration: AB.D.fast, ease: 'pageturn' });
          gsap.to(el, { backgroundColor: 'rgba(250,243,230,0)', duration: AB.D.base, ease: 'pageturn' });
        });
      } else { gsap.delayedCall(0.15, end); }
    }
    if (skip) skip.addEventListener('click', function () { finish(true); });
    setTimeout(function () { if (!finished) finish(false); }, cap);
    return api;
  };

  /* ---- helpers for page agents ---------------------------------------------- */
  AB.accordion = function (rootEl) {
    AB.$$('.acc__btn', rootEl).forEach(function (b) {
      var panel = doc.getElementById(b.getAttribute('aria-controls'));
      b.addEventListener('click', function () {
        var open = b.getAttribute('aria-expanded') === 'true';
        b.setAttribute('aria-expanded', open ? 'false' : 'true');
        if (panel) { panel.classList.toggle('is-open', !open); panel.hidden = false; }
      });
      if (panel && b.getAttribute('aria-expanded') === 'true') panel.classList.add('is-open');
    });
  };
  AB.shelf = function (rootEl) {
    var track = AB.$('.scroll-x', rootEl), prev = AB.$('[data-shelf-prev]', rootEl), next = AB.$('[data-shelf-next]', rootEl);
    if (!track) return;
    function step() { var first = track.children[0]; return first ? first.getBoundingClientRect().width + 16 : 300; }
    function update() { if (prev) prev.disabled = track.scrollLeft <= 2; if (next) next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2; }
    if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: AB.motion.rm ? 'auto' : 'smooth' }); });
    if (next) next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: AB.motion.rm ? 'auto' : 'smooth' }); });
    track.addEventListener('scroll', update, { passive: true }); window.addEventListener('resize', update); update();
    track.setAttribute('tabindex', '0');
    track.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); track.scrollBy({ left: step(), behavior: 'smooth' }); } if (e.key === 'ArrowLeft') { e.preventDefault(); track.scrollBy({ left: -step(), behavior: 'smooth' }); } });
  };
  AB.form = {
    setError: function (field, msg) {
      var f = field.closest('.field') || field.parentNode, ctl = f.querySelector('input, select, textarea') || field;
      f.classList.add('is-invalid'); var id = (ctl.id || 'f') + '-error'; var e = f.querySelector('.field-error');
      if (!e) { e = doc.createElement('p'); e.className = 'field-error'; e.id = id; f.appendChild(e); }
      e.textContent = msg; ctl.setAttribute('aria-invalid', 'true'); ctl.setAttribute('aria-describedby', ((ctl.getAttribute('data-desc') || '') + ' ' + id).trim());
      return { id: ctl.id, msg: msg };
    },
    clearError: function (field) {
      var f = field.closest('.field') || field.parentNode, ctl = f.querySelector('input, select, textarea') || field, e = f.querySelector('.field-error');
      f.classList.remove('is-invalid'); if (e) e.remove(); ctl.removeAttribute('aria-invalid'); if (ctl.getAttribute('data-desc')) ctl.setAttribute('aria-describedby', ctl.getAttribute('data-desc')); else ctl.removeAttribute('aria-describedby');
    },
    summary: function (form, errors, heading) {
      var s = form.querySelector('.error-summary');
      if (!errors.length) { if (s) s.remove(); return; }
      if (!s) { s = doc.createElement('div'); s.className = 'error-summary'; s.setAttribute('role', 'alert'); s.setAttribute('tabindex', '-1'); var anchor = form.querySelector('[data-summary-before]') || form.querySelector('[type="submit"]'); anchor.parentNode.insertBefore(s, anchor); }
      s.innerHTML = '<p class="h3">' + (heading || 'Check these before you submit') + '</p><ul></ul>';
      var ul = s.querySelector('ul');
      errors.forEach(function (er) { var li = doc.createElement('li'); var a = doc.createElement('a'); a.href = '#' + er.id; a.textContent = er.msg; a.addEventListener('click', function (ev) { ev.preventDefault(); var t = doc.getElementById(er.id); if (t) t.focus(); }); li.appendChild(a); ul.appendChild(li); });
      s.focus();
    },
    blurValidate: function (field, fn) {
      var t; field.addEventListener('blur', function () { clearTimeout(t); t = setTimeout(function () { if (field.dataset.touched === '1' || field.form.dataset.submitted === '1') fn(); }, 350); field.dataset.touched = '1'; });
      field.addEventListener('input', function () { if (field.closest('.field') && field.closest('.field').classList.contains('is-invalid')) { /* never message while typing; leave the state until blur */ } });
    }
  };

  /* ---- scenes: lazy load a page's scene module after first paint ------------ */
  AB.loadScript = function (src) {
    return new Promise(function (res, rej) {
      var existing = doc.querySelector('script[src="' + src + '"]');
      if (existing) { if (existing.dataset.loaded === '1') return res(); existing.addEventListener('load', function () { res(); }); existing.addEventListener('error', rej); return; }
      var s = doc.createElement('script'); s.src = src; s.async = true; s.onload = function () { s.dataset.loaded = '1'; res(); }; s.onerror = rej; doc.head.appendChild(s);
    });
  };

  /* ---- init ------------------------------------------------------------------ */
  AB.onReady(function () {
    header();
    reveals();
    settledNumerals();
    hoverTreatments();
    AB.$$('.acc').forEach(AB.accordion);
    AB.$$('[data-shelf]').forEach(AB.shelf);
    AB.$$('.tag-btn').forEach(function (b) {
      var l = b.querySelector('.lbl'); if (l && !l.querySelector('span')) { var t = l.textContent; l.innerHTML = '<span></span><span aria-hidden="true"></span>'; l.firstChild.textContent = t; l.lastChild.textContent = t; }
      b.style.setProperty('--tag-w', b.offsetWidth + 'px');
    });
    var scene = doc.body.dataset.scene;
    if (scene) { AB.afterPaint(function () { AB.loadScript(scene).catch(function () {}); }); }
    if (hasST) { window.addEventListener('load', function () { ScrollTrigger.refresh(); }); }
    doc.dispatchEvent(new CustomEvent('ab:ready'));
  });
})();
