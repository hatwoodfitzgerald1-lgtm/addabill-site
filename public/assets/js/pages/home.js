/* Addabill Home: THE STANDING MONTH (the signature scene), the flip calendar loader wiring,
   the Settled Numeral "2", the week in hand mobile hero and the loop band video.
   Loaded deferred; Three.js is lazy loaded by SceneLite after first paint. */
(function () {
  'use strict';
  var AB = window.AB, doc = document;
  if (!AB) return;

  /* ---- the month (October, the 1st a Wednesday, matching the product master) ---- */
  var COLS = 7, ROWS = 5, FIRST_DOW = 3, PITCH = 1.06;
  var BILLS = [
    { name: 'Rent', day: 1, paid: true }, { name: 'Water bill', day: 2 }, { name: 'Internet', day: 6 }, { name: 'Phone plan', day: 10 },
    { name: 'Gym', day: 13 }, { name: 'Electric', day: 15 }, { name: 'Streaming', day: 17 }, { name: 'Gas', day: 20 },
    { name: 'Car insurance', day: 21 }, { name: 'Trash pickup', day: 24 }, { name: 'Dentist', day: 28 }
  ];
  var TODAY = 2, CHIP_DAY_INDEX = 1; /* the 29th of the previous month sits at cell index 1 (Mon), top left */
  function cellOfIndex(i) { var c = i % COLS, r = Math.floor(i / COLS); return { c: c, r: r, x: (c - 3) * PITCH, z: (r - 2) * PITCH }; }
  function indexOfDay(d) { return d + FIRST_DOW - 1; }
  function cellLabel(i) { if (i < FIRST_DOW) return { label: 28 + i, dim: true }; var d = i - FIRST_DOW + 1; if (d > 31) return { label: d - 31, dim: true }; return { label: d, dim: false, today: false, paid: d === 1 }; }

  var hero = doc.getElementById('hero'), stage = doc.getElementById('hero-stage'), sceneMount = doc.getElementById('hero-scene');
  var numeral = doc.getElementById('hero-numeral'), tickEl = doc.getElementById('hero-tick'), hint = doc.getElementById('hero-hint');
  var loaderEl = doc.getElementById('loader');
  var state = { p: 0, ready: false, loaderDone: false };

  /* ---- loop band video: plays only in view and never under reduced motion ---- */
  (function video() {
    var v = doc.getElementById('loop-video'); if (!v) return;
    if (AB.motion.rm) { v.removeAttribute('autoplay'); v.pause(); return; }
    var io = new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause(); }); }, { threshold: 0.15 });
    io.observe(v);
  })();

  /* ---- mobile: the week in hand ------------------------------------------------ */
  function weekInHand() {
    var wrap = doc.getElementById('week-hand'), list = doc.getElementById('week-hand-weeks'), chip = doc.getElementById('week-hand-chip'), phone = doc.getElementById('week-hand-phone');
    if (!wrap || !list) return;
    wrap.hidden = false;
    var names = ['S', 'M', 'T', 'W', 'T', 'F', 'S'], byDay = {}; BILLS.forEach(function (b) { byDay[b.day] = b; });
    var html = '';
    for (var w = 0; w < ROWS; w++) {
      var first = w * 7 - FIRST_DOW + 1, last = first + 6;
      var label = 'Week ' + (w + 1) + ', ' + (first < 1 ? 'Sep ' + (30 + first) : 'Oct ' + first) + ' to ' + (last > 31 ? 'Nov ' + (last - 31) : 'Oct ' + last);
      html += '<li class="wh-week" data-week="' + w + '"><p class="wh-week__name"><span>' + label + '</span><span>October</span></p><ul class="wh-days">';
      for (var c = 0; c < 7; c++) {
        var i = w * 7 + c, cl = cellLabel(i), d = cl.dim ? null : cl.label, b = d ? byDay[d] : null;
        html += '<li class="wh-day' + (cl.dim ? ' dim' : '') + (d === TODAY ? ' today' : '') + '"' + (d ? ' data-day="' + d + '"' : '') + ' aria-label="' + names[c] + (d ? ', October ' + d : '') + (b ? ', ' + b.name : '') + '"><span class="wh-num">' + cl.label + '</span>' +
          (b ? '<span class="tag wh-tag' + (b.paid ? ' tag--paid' : '') + '" style="--k:' + BILLS.indexOf(b) + '">' + b.name + '</span>' : '') + '</li>';
      }
      html += '</ul></li>';
    }
    list.innerHTML = html;
    if (AB.motion.rm || !window.gsap) { wrap.classList.add('is-landed', 'is-delivered'); return; }
    var tags = AB.$$('.wh-tag', list);
    gsap.set(tags, { opacity: 0, y: -34 });
    var landed = false, delivered = false;
    /* tags land as the visitor scrolls the first 60 percent of a viewport */
    ScrollTrigger.create({
      trigger: hero, start: 'top top', end: '+=60%', scrub: 0.6,
      onUpdate: function (st) { var p = st.progress; tags.forEach(function (t, k) { var u = AB.range(p, k * 0.035, k * 0.035 + 0.32); gsap.set(t, { opacity: u, y: -34 * (1 - AB.ease.headsup(u)) }); }); if (p > 0.42 && !landed) { landed = true; wrap.classList.add('is-landed'); maybeDeliver(); } },
      onRefresh: function (st) { if (AB.qa.arcFlag) AB.qa.arc(st.start, st.end, 'Mobile week strip landing'); }
    });
    var scroller = doc.getElementById('week-hand-scroller'), centered = 0;
    function updateCentered() { var r = scroller.getBoundingClientRect(), cx = r.left + r.width / 2, best = 0, bd = 1e9; AB.$$('.wh-week', list).forEach(function (wk, i) { var rr = wk.getBoundingClientRect(), d = Math.abs(rr.left + rr.width / 2 - cx); if (d < bd) { bd = d; best = i; } }); if (best !== centered) { centered = best; if (centered !== 0) { delivered = false; wrap.classList.remove('is-delivered'); gsap.set(chip, { opacity: 0 }); } else maybeDeliver(); } }
    var t; scroller.addEventListener('scroll', function () { clearTimeout(t); t = setTimeout(updateCentered, 90); }, { passive: true });
    function maybeDeliver() {
      if (delivered || !landed || centered !== 0) return; delivered = true;
      var from = list.querySelector('.wh-day[aria-label*="September"], .wh-day.dim:nth-child(2)') || list.querySelector('.wh-day.dim'), to = doc.getElementById('week-hand-bubble');
      if (!from || !to || !chip) { wrap.classList.add('is-delivered'); return; }
      var fr = from.getBoundingClientRect(), tr = to.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
      var x0 = fr.left - wr.left + fr.width / 2 - 11, y0 = fr.top - wr.top + fr.height * 0.35, x1 = tr.left - wr.left + 16, y1 = tr.top - wr.top + 12;
      gsap.timeline()
        .set(chip, { x: x0, y: y0, opacity: 1, scale: 1 })
        .to(chip, { y: y0 - 40, duration: AB.D.base, ease: 'headsup' })
        .to(chip, { x: x1, y: y1, scale: 0.7, duration: AB.D.slow, ease: 'pageturn' })
        .to(chip, { opacity: 0, duration: AB.D.fast, onStart: function () { wrap.classList.add('is-delivered'); } });
    }
    /* the strip is draggable by thumb natively (scroll snap); on desktop touch devices also allow arrow keys */
    scroller.addEventListener('keydown', function (e) { var w = scroller.clientWidth; if (e.key === 'ArrowRight') scroller.scrollBy({ left: w, behavior: 'smooth' }); if (e.key === 'ArrowLeft') scroller.scrollBy({ left: -w, behavior: 'smooth' }); });
  }

  /* ---- desktop: the loader + THE STANDING MONTH ------------------------------------ */
  function standingMonth() {
    var rm = AB.motion.rm;
    /* loader on real load progress */
    var loader = loaderEl ? AB.loader({ root: loaderEl, cap: 4000, flipTarget: '#hero-tick', onDone: function (skipped) { state.loaderDone = true; if (hint && !rm) hint.classList.add('is-on'); if (scene3d && scene3d.onLoaderDone) scene3d.onLoaderDone(); } }) : null;
    if (loader) { ['fonts', 'three', 'env', 'textures', 'init'].forEach(function (n) { loader.expect(n, n === 'three' ? 3 : n === 'init' ? 2 : n === 'fonts' ? 2 : 1); }); }
    if (doc.fonts && doc.fonts.load) { Promise.all([doc.fonts.load('600 1em Fraunces'), doc.fonts.load('600 1em Figtree')]).then(function () { if (loader) loader.done('fonts'); }, function () { if (loader) loader.done('fonts'); }); } else if (loader) loader.done('fonts');

    if (rm) {
      /* reduced motion: the poster of the settled state under the same DOM, the numeral settled, no pin */
      if (loader) { loader.done('three'); loader.done('env'); loader.done('textures'); loader.done('init'); }
      if (numeral) { numeral.classList.add('is-settled'); numeral.style.opacity = 0; }
      window.SceneLite.create({ mount: sceneMount, poster: '/assets/hero-poster.jpg' });
      return;
    }

    var scene3d = null;
    AB.afterPaint(function () {
      window.SceneLite.loadThree().then(function () { if (loader) loader.done('three'); }, function () { if (loader) loader.finish(true); });
      window.SceneLite.create({
        mount: sceneMount, env: '/assets/hdri-interior-512.hdr', fov: 38, toneMapping: 'none', preserve: !!new URLSearchParams(location.search).get('qa'),
        dpr: { desktop: 1.5, touch: 1 }, shadow: { desktop: 1024, touch: 512 }, poster: '/assets/hero-poster.jpg',
        setup: function (ctx, ctl) {
          if (loader) loader.done('env');
          scene3d = buildScene(ctx, ctl, loader);
          return scene3d;
        }
      }).then(function (ctl) {
        if (!ctl) { if (loader) loader.finish(true); if (numeral) { numeral.classList.add('is-settled'); } return; }
        setupScroll(ctl);
      });
    });
  }

  function buildScene(ctx, ctl, loader) {
    var THREE = ctx.THREE, H = window.SceneLite.helpers, scene = ctx.scene, camera = ctx.camera;
    scene.fog = new THREE.Fog(0xFAF3E6, 11, 26);

    /* the counter */
    var counterMat = new THREE.MeshStandardMaterial({ color: 0xEDE2CF, roughness: 1, metalness: 0, envMapIntensity: 0.35 });
    /* the wood grain is blended lightly over oat in a canvas so the counter stays calm and on palette */
    (function () {
      var img = new Image(); img.crossOrigin = 'anonymous';
      img.onload = function () {
        var c = doc.createElement('canvas'); c.width = c.height = 512; var g = c.getContext('2d');
        g.fillStyle = '#EDE2CF'; g.fillRect(0, 0, 512, 512); g.globalAlpha = 0.22; g.drawImage(img, 0, 0, 512, 512); g.globalAlpha = 1;
        var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(7, 7); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
        counterMat.map = t; counterMat.color.set(0xFFFFFF); counterMat.needsUpdate = true;
        if (loader) loader.done('textures');
      };
      img.onerror = function () { if (loader) loader.done('textures'); };
      img.src = '/assets/tex-counter.jpg';
    })();
    var counter = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), counterMat); counter.rotation.x = -Math.PI / 2; counter.receiveShadow = true; scene.add(counter);

    /* the calendar page under the cells */
    var pc = doc.createElement('canvas'); pc.width = 1024; pc.height = 820; var pg = pc.getContext('2d');
    pg.fillStyle = '#FFFFFF'; pg.fillRect(0, 0, 1024, 820);
    pg.fillStyle = '#2B2622'; pg.font = '600 58px Fraunces, Georgia, serif'; pg.textBaseline = 'top'; pg.fillText('October', 44, 16);
    pg.font = '600 22px Figtree, system-ui, sans-serif'; pg.fillStyle = '#6B6058';
    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(function (l, i) { pg.textAlign = 'center'; pg.fillText(l, 73 + i * 146, 84); });
    pg.fillStyle = 'rgba(43,38,34,0.25)'; pg.fillRect(0, 0, 1024, 4);
    var pageTex = new THREE.CanvasTexture(pc); pageTex.encoding = THREE.sRGBEncoding;
    var page = new THREE.Mesh(new THREE.PlaneGeometry(7.9, 6.33), new THREE.MeshStandardMaterial({ map: pageTex, roughness: 0.95, metalness: 0, envMapIntensity: 0.5 }));
    page.rotation.x = -Math.PI / 2; page.position.set(0, 0.004, -0.36); page.receiveShadow = true; scene.add(page);

    /* the 7 by 5 day cells */
    var cells = [];
    for (var i = 0; i < COLS * ROWS; i++) cells.push(cellLabel(i));
    var monthAtlas = H.monthAtlas(THREE, { cols: COLS, rows: ROWS, cell: 256, cells: cells });
    var cellMesh = H.dayCells(THREE, monthAtlas, COLS * ROWS, function (i) { var c = cellOfIndex(i); return { x: c.x, z: c.z, y: 0.02 }; }, { size: 0.96, thick: 0.035 });
    scene.add(cellMesh);

    /* the standing tags */
    var tagAtlas = H.tagAtlas(THREE, BILLS.map(function (b) { return { text: b.name, paid: b.paid }; }));
    var tags = H.standingTags(THREE, tagAtlas, BILLS.length, { w: 0.68, h: 0.36, d: 0.024 });
    scene.add(tags);
    var shadows = H.contactShadows(THREE, BILLS.length, { alpha: 0.3 }); scene.add(shadows);
    var tagHome = BILLS.map(function (b, k) { var c = cellOfIndex(indexOfDay(b.day)); return { x: c.x, y: 0.0375 + 0.18, z: c.z + 0.2, yaw: (k % 3 - 1) * 0.02 }; });
    var m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(1, 1, 1);
    function placeTag(k, x, y, z, yaw, roll, sc) {
      e.set(0, yaw, roll || 0); q.setFromEuler(e); v3.set(x, y, z); s3.set(sc || 1, sc || 1, sc || 1); m4.compose(v3, q, s3); tags.setMatrixAt(k, m4);
      var lift = Math.max(0, y - tagHome[k].y); var sh = Math.max(0.2, 1 + lift * 0.6 - lift * lift * 0.5);
      e.set(0, yaw, 0); q.setFromEuler(e); v3.set(x, 0.041, z); s3.set(0.95 * sh, 1, 0.55 * sh); m4.compose(v3, q, s3); shadows.setMatrixAt(k, m4);
    }

    /* the today tick on the 2nd (appears after the loader hands off) */
    var tick = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.17), new THREE.MeshStandardMaterial({ color: 0xE9A825, roughness: 0.6, metalness: 0 }));
    var c2 = cellOfIndex(indexOfDay(TODAY)); tick.position.set(c2.x + 0.37, 0.045, c2.z - 0.36); tick.scale.set(0.001, 0.001, 0.001); tick.castShadow = true; scene.add(tick);

    /* the heads up chip on the 29th */
    var chipCell = cellOfIndex(CHIP_DAY_INDEX);
    var chipMat = new THREE.MeshStandardMaterial({ color: 0xE9A825, roughness: 0.55, metalness: 0, transparent: true, opacity: 1 });
    var chip = new THREE.Mesh(H.roundedBox(THREE, 0.44, 0.2, 0.03, 0.05), chipMat); chip.rotation.x = -Math.PI / 2; chip.castShadow = true;
    var chipStart = new THREE.Vector3(chipCell.x + 0.02, 0.055, chipCell.z + 0.22); chip.position.copy(chipStart); scene.add(chip);
    var chipShadow = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.34), new THREE.MeshBasicMaterial({ map: shadows.material.map, transparent: true, depthWrite: false })); chipShadow.rotation.x = -Math.PI / 2; chipShadow.position.set(chipStart.x, 0.041, chipStart.z); scene.add(chipShadow);

    /* the phone at the right frame edge */
    var phone = new THREE.Group();
    var body = new THREE.Mesh(H.roundedBox(THREE, 0.92, 1.9, 0.08, 0.14), new THREE.MeshStandardMaterial({ color: 0x2B2622, roughness: 0.45, metalness: 0.1, envMapIntensity: 0.9 })); body.castShadow = true; body.receiveShadow = true; phone.add(body);
    var screenTex = H.phoneScreen(THREE, {});
    var screen = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.7), new THREE.MeshBasicMaterial({ map: screenTex.texture, toneMapped: false })); screen.position.z = 0.0625; phone.add(screen);
    var glowC = doc.createElement('canvas'); glowC.width = glowC.height = 256; var gg = glowC.getContext('2d'); var grd = gg.createRadialGradient(128, 128, 20, 128, 128, 128); grd.addColorStop(0, 'rgba(255,240,200,0.55)'); grd.addColorStop(1, 'rgba(255,240,200,0)'); gg.fillStyle = grd; gg.fillRect(0, 0, 256, 256);
    var glow = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.0), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(glowC), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.2 })); glow.position.z = 0.02; phone.add(glow);
    phone.position.set(4.5, 0.98, -0.5); phone.rotation.set(-0.16, -0.32, 0); scene.add(phone);
    var phoneShadow = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9), new THREE.MeshBasicMaterial({ map: shadows.material.map, transparent: true, depthWrite: false, opacity: 0.9 })); phoneShadow.rotation.x = -Math.PI / 2; phoneShadow.position.set(4.5, 0.042, -0.45); scene.add(phoneShadow);

    /* the light sweep and shadows */
    var sweep = H.lightSweep(THREE, scene, { mapSize: ctx.shadowSize, span: 6, fill: 0.38, intensity: [0.98, 1.0] });

    /* camera keyframes: micro on the 2nd, macro, the beat, the elevated reading angle */
    var KEYS = [
      { p: 0.0, pos: [c2.x + 1.3, 1.3, c2.z + 2.65], look: [c2.x - 0.1, 0.62, c2.z - 1.2] },
      { p: 0.55, pos: [0.1, 7.0, 9.0], look: [0.1, 0.3, -3.6] },
      { p: 0.74, pos: [0.8, 6.4, 8.2], look: [1.1, 0.7, -3.6] },
      { p: 1.0, pos: [0, 10.2, 8.3], look: [0, 0.2, -3.9] }
    ];
    var camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
    function camAt(p) {
      var a = KEYS[0], b = KEYS[KEYS.length - 1];
      for (var i = 0; i < KEYS.length - 1; i++) { if (p >= KEYS[i].p && p <= KEYS[i + 1].p) { a = KEYS[i]; b = KEYS[i + 1]; break; } }
      var t = AB.smooth((p - a.p) / (b.p - a.p || 1));
      camPos.set(a.pos[0], a.pos[1], a.pos[2]).lerp(tmpA.set(b.pos[0], b.pos[1], b.pos[2]), t);
      camLook.set(a.look[0], a.look[1], a.look[2]).lerp(tmpB.set(b.look[0], b.look[1], b.look[2]), t);
    }

    /* per tag slide in windows: rent and water stand from the start; the rest arrive during the pull back */
    var enter = BILLS.map(function (b, k) { return k < 2 ? { s: -1, e: 0 } : { s: 0.05 + (k - 2) * 0.045, e: 0.05 + (k - 2) * 0.045 + 0.16 }; });
    var idle = { liftIndex: 2, liftT0: 6, cursor: 0 };
    var numeralAnchor = new THREE.Vector3(c2.x - 0.34, 0.6, c2.z + 0.3);
    var tickAnchor = new THREE.Vector3(c2.x + 0.37, 0.05, c2.z - 0.36);
    var chipCtrl = new THREE.Vector3(0.2, 3.0, -1.0), chipEnd = new THREE.Vector3(4.42, 1.05, -0.3), chipPos = new THREE.Vector3();
    var settled = false, phoneProgress = -1, firstFrame = false, aspectX = 4.5;

    function resize(ctx) {
      var aspect = ctx.width / ctx.height;
      aspectX = AB.clamp(2.9 + aspect * 1.0, 3.7, 5.1);
      phone.position.x = aspectX; phoneShadow.position.x = aspectX; chipEnd.x = aspectX - 0.08;
      if (numeral) numeral.style.fontSize = '';
    }
    resize(ctx);

    function update(t, dt, ctx) {
      var p = state.p;
      /* camera */
      camAt(p);
      camera.position.copy(camPos);
      camera.position.y += Math.sin(t * 0.45) * 0.02 * (1 - p * 0.5);
      camera.lookAt(camLook);
      /* light: the sweep encodes time of day, plus a slow idle drift */
      sweep.setProgress(p, Math.sin(t * 0.22) * 0.05);
      /* tags */
      for (var k = 0; k < BILLS.length; k++) {
        var h = tagHome[k], w = enter[k], u = w.s < 0 ? 1 : AB.range(p, w.s, w.e), eu = AB.ease.headsup(u);
        var fromLeft = k % 2 === 1, x0 = fromLeft ? -9.5 : 9.5;
        var x = AB.lerp(x0, h.x, eu), y = h.y + Math.sin(u * Math.PI) * 0.7 + (1 - eu) * 0.9, z = AB.lerp(h.z + (fromLeft ? 1.4 : -1.2), h.z, eu);
        var yaw = h.yaw + (1 - eu) * (fromLeft ? 0.9 : -0.9), roll = (1 - eu) * (fromLeft ? -0.25 : 0.25);
        if (u >= 1) {
          /* idle: one landed tag lifts and resettles every 8 s */
          var it = t - idle.liftT0;
          if (k === idle.liftIndex && it >= 0 && it < AB.D.slow) { var li = Math.sin((it / AB.D.slow) * Math.PI); y += li * 0.13; yaw += li * 0.05; }
        }
        placeTag(k, x, y, z, yaw, roll, 1);
      }
      if (t - idle.liftT0 > 8) { idle.liftT0 = t; var landedIdx = []; for (var j = 0; j < BILLS.length; j++) { if (enter[j].s < 0 || p >= enter[j].e) landedIdx.push(j); } idle.liftIndex = landedIdx.length ? landedIdx[(idle.cursor++) % landedIdx.length] : -1; }
      tags.instanceMatrix.needsUpdate = true; shadows.instanceMatrix.needsUpdate = true;
      /* the heads up chip flies from the 29th into the phone (the beat, 0.62 to 0.82) */
      var b = AB.range(p, 0.62, 0.82), be = AB.ease.pageturn(b);
      if (b <= 0) { chip.position.copy(chipStart); chip.rotation.set(-Math.PI / 2, 0, 0); chipMat.opacity = 1; chip.scale.setScalar(1); chipShadow.material.opacity = 1; }
      else {
        var lift = AB.range(b, 0, 0.22), le = AB.ease.headsup(lift);
        if (b < 0.22) { chip.position.set(chipStart.x, chipStart.y + le * 0.7, chipStart.z); chip.rotation.set(-Math.PI / 2 + le * 0.9, 0, 0); }
        else {
          var f = AB.range(b, 0.22, 0.92), fe = AB.ease.pageturn(f);
          chipPos.set(0, 0, 0);
          var a0 = new THREE.Vector3(chipStart.x, chipStart.y + 0.7, chipStart.z);
          chipPos.x = (1 - fe) * (1 - fe) * a0.x + 2 * (1 - fe) * fe * chipCtrl.x + fe * fe * chipEnd.x;
          chipPos.y = (1 - fe) * (1 - fe) * a0.y + 2 * (1 - fe) * fe * chipCtrl.y + fe * fe * chipEnd.y;
          chipPos.z = (1 - fe) * (1 - fe) * a0.z + 2 * (1 - fe) * fe * chipCtrl.z + fe * fe * chipEnd.z;
          chip.position.copy(chipPos); chip.rotation.set(-Math.PI / 2 + 0.9 + fe * 0.7, -fe * 0.3, fe * 0.2); chip.scale.setScalar(1 - fe * 0.45);
          chipMat.opacity = 1 - AB.range(b, 0.86, 1);
        }
        chipShadow.material.opacity = 1 - AB.range(b, 0, 0.3);
      }
      /* the phone screen shows Text 1 as the chip arrives */
      var pp = AB.range(p, 0.74, 0.86);
      if (Math.abs(pp - phoneProgress) > 0.01 || (pp === 0 && phoneProgress !== 0) || (pp === 1 && phoneProgress !== 1)) { phoneProgress = pp; screenTex.draw(AB.ease.headsup(pp)); }
      glow.material.opacity = 0.16 + Math.sin(t * 1.3) * 0.05 + pp * 0.22;
      /* the Settled Numeral "2": DOM type beside the water bill tag, projected each frame */
      if (numeral) {
        var pr = ctl.project(numeralAnchor);
        var big = Math.min(ctx.height * 0.22, 300), small = Math.max(22, ctx.height * 0.028);
        var sz = AB.lerp(big, small, AB.smooth(AB.range(p, 0, 0.55)));
        numeral.style.fontSize = sz + 'px';
        numeral.style.left = pr.x + 'px'; numeral.style.top = pr.y + 'px';
        /* written on the wall, then printed in the app: the DOM numeral settles, then hands over to the printed date */
        numeral.style.opacity = (pr.z < 1 && state.loaderDone) ? String(AB.clamp(1 - AB.range(p, 0.64, 0.76), 0, 1)) : '0';
        if (p >= 0.5 && !settled) { settled = true; AB.settle(numeral, { duration: AB.D.slow }); }
        else if (p < 0.3 && settled) { settled = false; numeral.classList.remove('is-settled'); if (window.gsap) gsap.to(numeral, { '--wonk': 1, '--opsz': 48, duration: AB.D.base, ease: 'pageturn' }); }
      }
      if (tickEl && !state.loaderDone) { var tp = ctl.project(tickAnchor); tickEl.style.left = tp.x + 'px'; tickEl.style.top = tp.y + 'px'; tickEl.style.height = Math.max(10, ctx.height * 0.03) + 'px'; tickEl.style.width = Math.max(4, ctx.height * 0.009) + 'px'; }
      if (!firstFrame) { firstFrame = true; state.ready = true; if (loader) loader.done('init'); }
      return true;
    }

    return {
      update: update, resize: resize,
      onLoaderDone: function () { if (window.gsap) gsap.to(tick.scale, { x: 1, y: 1, z: 1, duration: AB.D.base, ease: 'headsup' }); else tick.scale.set(1, 1, 1); if (tickEl) tickEl.style.opacity = 0; },
      setProgress: function (p) { state.p = p; },
      snapshot: function () { return ctl.snapshot(); },
      dispose: function () {}
    };
  }

  function setupScroll(ctl) {
    if (!window.gsap || !window.ScrollTrigger) return;
    var qa = new URLSearchParams(location.search).get('qa');
    if (qa === 'poster') { if (hint) hint.classList.remove('is-on'); state.p = 1; state.loaderDone = true; window.__heroSnapshot = function () { state.p = 1; ctl.render(); return ctl.snapshot(); }; window.__heroState = state; return; }
    var proxy = { p: 0 };
    var headerH = function () { var h = doc.querySelector('.hdr'); return h ? h.getBoundingClientRect().height : 72; };
    var tween = gsap.to(proxy, {
      p: 1, ease: 'none',
      scrollTrigger: {
        trigger: hero, start: function () { return 'top ' + headerH() + 'px'; }, end: '+=150%', pin: true, pinSpacing: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true,
        snap: { snapTo: function (v) { return (v > 0.66 && v < 0.9) ? 0.78 : v; }, duration: { min: 0.2, max: 0.48 }, delay: 0.1, ease: 'headsup', inertia: false },
        onUpdate: function (st) { if (hint && st.progress > 0.04) hint.classList.remove('is-on'); },
        onRefresh: function (st) { AB.qa.arc(st.start, st.end, 'The Standing Month (Heads-Up timeline)'); }
      },
      onUpdate: function () { state.p = proxy.p; }
    });
    state.st = tween.scrollTrigger;
    window.__heroState = state;
  }

  AB.onReady(function () {
    if (AB.motion.mobileHero) { weekInHand(); if (loaderEl) { loaderEl.classList.add('is-done'); loaderEl.setAttribute('aria-hidden', 'true'); } if (numeral) numeral.style.display = 'none'; return; }
    var wh = doc.getElementById('week-hand'); if (wh) wh.hidden = true;
    standingMonth();
  });
})();
