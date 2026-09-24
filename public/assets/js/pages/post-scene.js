/* Addabill blog posts: the per post scene in the sticky rail, one SceneLite canvas, lazy
   (loaded by core.js after first paint), paused offscreen, scrubbed to the reading progress.
   A: a month filling tag by tag as the reader scrolls.
   B: a week where the day the draft lands has dipped and its tag sits crooked; a heads-up lifts
      the tag to a chosen day and the cell levels.
   C: three objects on the counter (a sticky note, a cell grid, a phone); the camera pans across
      and each lifts as its section is read.
   D: three standing reminder markers before a due date on a week strip; the camera walks the days.
   Mobile has no rail; reduced motion and no WebGL show the settled kit graphic in the rail. */
(function () {
  'use strict';
  var AB = window.AB, SL = window.SceneLite, doc = document;
  if (!AB || !SL) return;
  var post = (doc.body.className.match(/page-post--([abcd])/) || [0, 'a'])[1];
  var mount = doc.getElementById('post-scene'), read = doc.querySelector('.post-read'), rail = doc.querySelector('.post-rail');
  if (!mount) return;
  function staticRail() { doc.body.classList.add('has-static-rail'); var s = doc.getElementById('post-settled'); if (s) s.hidden = false; mount.classList.add('is-static'); }
  if (AB.motion.mobileHero) { staticRail(); return; }
  var state = { p: 0 };
  var reading = function () { return window.__postReading || { steps: {}, active: -1 }; };

  SL.create({
    mount: mount, env: '/assets/hdri-interior-512.hdr', fov: 44, toneMapping: 'none',
    dpr: { desktop: 1.5, touch: 1 }, shadow: { desktop: 1024, touch: 512 }, settled: '#post-settled',
    onStatic: function () { staticRail(); },
    setup: function (ctx, ctl) { return builders[post](ctx, ctl); }
  }).then(function (ctl) { if (ctl) scroll(ctl); else staticRail(); });

  function scroll(ctl) {
    if (!window.gsap || !window.ScrollTrigger || !read) return;
    var proxy = { p: 0 };
    gsap.to(proxy, {
      p: 1, ease: 'none',
      scrollTrigger: { trigger: read, start: 'top 60%', end: 'bottom 70%', scrub: 0.8, invalidateOnRefresh: true, onRefresh: function (st) { AB.qa.arc(st.start, st.end, 'Post ' + post.toUpperCase() + ' reading scene'); } },
      onUpdate: function () { state.p = proxy.p; ctl.invalidate(); }
    });
  }

  /* ---- shared pieces ---------------------------------------------------------------- */
  function counter(ctx, ctl, opts) {
    var THREE = ctx.THREE; opts = opts || {};
    var mat = new THREE.MeshStandardMaterial({ color: 0xE7DAC3, roughness: 1, metalness: 0, envMapIntensity: 0.3 });
    var img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = function () {
      var c = doc.createElement('canvas'); c.width = c.height = 512; var g = c.getContext('2d');
      g.fillStyle = '#E7DAC3'; g.fillRect(0, 0, 512, 512); g.globalAlpha = 0.26; g.drawImage(img, 0, 0, 512, 512); g.globalAlpha = 1;
      var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(opts.repeat || 6, opts.repeat || 6); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
      mat.map = t; mat.color.set(0xFFFFFF); mat.needsUpdate = true; ctl.invalidate();
    };
    img.src = '/assets/tex-counter.jpg';
    var m = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), mat); m.rotation.x = -Math.PI / 2; m.receiveShadow = true; ctx.scene.add(m);
    ctx.scene.fog = new THREE.Fog(0xE7DAC3, opts.fogNear || 12, opts.fogFar || 26);
    return m;
  }
  function fitFov(ctx, camera, base) { var a = ctx.width / ctx.height; camera.fov = AB.clamp(base + (1 - a) * 16, 34, 62); camera.updateProjectionMatrix(); }
  function placer(THREE, mesh, shadows, homeY) {
    var m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(1, 1, 1);
    return function (k, x, y, z, yaw, roll, sc) {
      e.set(0, yaw || 0, roll || 0); q.setFromEuler(e); v3.set(x, y, z); s3.set(sc || 1, sc || 1, sc || 1); m4.compose(v3, q, s3); mesh.setMatrixAt(k, m4);
      if (shadows) { var lift = Math.max(0, y - homeY), sh = Math.max(0.15, 1 - lift * 0.6); e.set(0, yaw || 0, 0); q.setFromEuler(e); v3.set(x, 0.045, z); s3.set(0.95 * sh, 1, 0.55 * sh); m4.compose(v3, q, s3); shadows.setMatrixAt(k, m4); }
    };
  }
  function bez(a, c, b, t, out) { var u = 1 - t; out.x = u * u * a.x + 2 * u * t * c.x + t * t * b.x; out.y = u * u * a.y + 2 * u * t * c.y + t * t * b.y; out.z = u * u * a.z + 2 * u * t * c.z + t * t * b.z; return out; }

  var builders = {};

  /* ---- A: the month filling tag by tag ------------------------------------------------- */
  builders.a = function (ctx, ctl) {
    var THREE = ctx.THREE, H = SL.helpers, scene = ctx.scene, camera = ctx.camera;
    counter(ctx, ctl, { fogNear: 14, fogFar: 30 });
    var COLS = 7, ROWS = 5, FIRST = 3, PITCH = 1.04;
    var BILLS = [{ name: 'Rent', day: 1, paid: true }, { name: 'Water bill', day: 2 }, { name: 'Internet', day: 6 }, { name: 'Phone plan', day: 10 }, { name: 'Gym', day: 13 }, { name: 'Electric', day: 15 }, { name: 'Streaming', day: 17 }, { name: 'Gas', day: 20 }, { name: 'Car insurance', day: 21 }, { name: 'Trash pickup', day: 24 }, { name: 'Dentist', day: 28 }];
    function cellOf(i) { var c = i % COLS, r = Math.floor(i / COLS); return { x: (c - 3) * PITCH, z: (r - 2) * PITCH }; }
    function label(i) { if (i < FIRST) return { label: 28 + i, dim: true }; var d = i - FIRST + 1; if (d > 31) return { label: d - 31, dim: true }; return { label: d, dim: false, today: d === 2 }; }
    var cells = []; for (var i = 0; i < 35; i++) cells.push(label(i));
    var atlas = H.monthAtlas(THREE, { cols: COLS, rows: ROWS, cell: 256, cells: cells });
    scene.add(H.dayCells(THREE, atlas, 35, function (i) { var c = cellOf(i); return { x: c.x, z: c.z, y: 0.02 }; }, { size: 0.95, thick: 0.035 }));
    /* the page under the cells */
    var pc = doc.createElement('canvas'); pc.width = 1024; pc.height = 820; var pg = pc.getContext('2d');
    pg.fillStyle = '#FFFFFF'; pg.fillRect(0, 0, 1024, 820); pg.fillStyle = '#2B2622'; pg.font = '600 58px Fraunces, Georgia, serif'; pg.textBaseline = 'top'; pg.fillText('October', 44, 16);
    pg.font = '600 22px Figtree, system-ui, sans-serif'; pg.fillStyle = '#6B6058'; pg.textAlign = 'center'; ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(function (l, i) { pg.fillText(l, 73 + i * 146, 84); });
    var pageTex = new THREE.CanvasTexture(pc); pageTex.encoding = THREE.sRGBEncoding;
    var page = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 6.25), new THREE.MeshStandardMaterial({ map: pageTex, roughness: 0.95, metalness: 0, envMapIntensity: 0.5 }));
    page.rotation.x = -Math.PI / 2; page.position.set(0, 0.004, -0.36); page.receiveShadow = true; scene.add(page);
    var tagAtlas = H.tagAtlas(THREE, BILLS.map(function (b) { return { text: b.name, paid: b.paid }; }));
    var tags = H.standingTags(THREE, tagAtlas, BILLS.length, { w: 0.68, h: 0.36, d: 0.024 }); scene.add(tags);
    var shadows = H.contactShadows(THREE, BILLS.length, { alpha: 0.3 }); scene.add(shadows);
    var homeY = 0.0375 + 0.18, home = BILLS.map(function (b, k) { var c = cellOf(b.day + FIRST - 1); return { x: c.x, y: homeY, z: c.z + 0.2, yaw: (k % 3 - 1) * 0.02 }; });
    var place = placer(THREE, tags, shadows, homeY);
    var win = BILLS.map(function (b, k) { var s = 0.02 + k * 0.085; return { s: s, e: s + 0.14 }; });
    var sweep = H.lightSweep(THREE, scene, { mapSize: ctx.shadowSize, span: 7, fill: 0.34, intensity: [0.7, 0.8] });
    var idle = { liftIndex: -1, t0: 6, cursor: 0 };
    var look = new THREE.Vector3(0, 0.2, -0.4);
    function resize(ctx) { fitFov(ctx, camera, 46); }
    resize(ctx);
    function update(t, dt, ctx) {
      var p = state.p, pe = AB.smooth(p);
      camera.position.set(0.4 - pe * 0.4, AB.lerp(6.2, 7.6, pe) + Math.sin(t * 0.4) * 0.02, AB.lerp(7.0, 6.2, pe)); camera.lookAt(look);
      sweep.setProgress(0.2 + p * 0.65, Math.sin(t * 0.22) * 0.05);
      var landed = [];
      for (var k = 0; k < BILLS.length; k++) {
        var h = home[k], u = AB.range(p, win[k].s, win[k].e), eu = AB.ease.headsup(u), fromLeft = k % 2 === 1, x0 = fromLeft ? -8 : 8;
        var x = AB.lerp(x0, h.x, eu), y = h.y + Math.sin(u * Math.PI) * 0.6 + (1 - eu) * 0.8, z = AB.lerp(h.z + (fromLeft ? 1.2 : -1.0), h.z, eu);
        var yaw = h.yaw + (1 - eu) * (fromLeft ? 0.8 : -0.8), roll = (1 - eu) * (fromLeft ? -0.2 : 0.2);
        if (u <= 0) y = -3;
        if (u >= 1) { landed.push(k); if (k === idle.liftIndex) { var it = t - idle.t0; if (it >= 0 && it < AB.D.slow) { var li = Math.sin((it / AB.D.slow) * Math.PI); y += li * 0.12; yaw += li * 0.05; } } }
        place(k, x, y, z, yaw, roll, 1);
      }
      if (t - idle.t0 > 8) { idle.t0 = t; idle.liftIndex = landed.length ? landed[(idle.cursor++) % landed.length] : -1; }
      tags.instanceMatrix.needsUpdate = true; shadows.instanceMatrix.needsUpdate = true;
      return true;
    }
    return { update: update, resize: resize };
  };

  /* ---- B: the dipped day cell leveling ------------------------------------------------ */
  builders.b = function (ctx, ctl) {
    var THREE = ctx.THREE, H = SL.helpers, scene = ctx.scene, camera = ctx.camera;
    counter(ctx, ctl, { fogNear: 10, fogFar: 22 });
    var DAYS = [{ l: 28, d: true }, { l: 29 }, { l: 30 }, { l: 1 }, { l: 2 }, { l: 3 }, { l: 4 }], PITCH = 1.06, DIP = 3, CHOSEN = 1;
    var atlas = H.monthAtlas(THREE, { cols: 7, rows: 1, cell: 256, cells: DAYS.map(function (d) { return { label: d.l, dim: !!d.d }; }) });
    var cells = H.dayCells(THREE, atlas, 7, function (i) { return { x: (i - 3) * PITCH, z: 0, y: 0.02 }; }, { size: 0.96, thick: 0.035 });
    scene.add(cells);
    var group = new THREE.Group(); scene.add(group); group.add(cells);
    var m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(1, 1, 1);
    function setCell(i, y, tilt) { e.set(0, 0, tilt); q.setFromEuler(e); v3.set((i - 3) * PITCH, 0.02 + y, 0); m4.compose(v3, q, s3); cells.setMatrixAt(i, m4); cells.instanceMatrix.needsUpdate = true; }
    /* the weekday strip printed under the cells */
    var pc = doc.createElement('canvas'); pc.width = 1024; pc.height = 128; var pg = pc.getContext('2d');
    pg.fillStyle = '#FFFFFF'; pg.fillRect(0, 0, 1024, 128); pg.fillStyle = '#6B6058'; pg.font = '600 30px Figtree, system-ui, sans-serif'; pg.textAlign = 'center'; pg.textBaseline = 'middle';
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(function (l, i) { pg.fillText(l, 73 + i * 146, 64); });
    var stripTex = new THREE.CanvasTexture(pc); stripTex.encoding = THREE.sRGBEncoding;
    var strip = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 0.95), new THREE.MeshStandardMaterial({ map: stripTex, roughness: 0.95, metalness: 0 }));
    strip.rotation.x = -Math.PI / 2; strip.position.set(0, 0.004, -1.0); strip.receiveShadow = true; group.add(strip);
    var tagAtlas = H.tagAtlas(THREE, [{ text: 'Rent' }]);
    var tags = H.standingTags(THREE, tagAtlas, 1, { w: 0.7, h: 0.38, d: 0.024 }); group.add(tags);
    var shadows = H.contactShadows(THREE, 1, { alpha: 0.32 }); group.add(shadows);
    var homeY = 0.0375 + 0.19, place = placer(THREE, tags, shadows, homeY);
    var chip = new THREE.Mesh(H.roundedBox(THREE, 0.42, 0.19, 0.03, 0.05), new THREE.MeshStandardMaterial({ color: 0xD08E1B, roughness: 0.82, metalness: 0, envMapIntensity: 0.25 })); chip.rotation.x = -Math.PI / 2; chip.castShadow = true; group.add(chip);
    var xDip = (DIP - 3) * PITCH, xChosen = (CHOSEN - 3) * PITCH;
    var a0 = new THREE.Vector3(xDip + 0.05, 0.13, 0.3), c0 = new THREE.Vector3((xDip + xChosen) / 2, 1.3, 0.2), b0 = new THREE.Vector3(xChosen, 0.06, 0.34), tmp = new THREE.Vector3();
    var ta = new THREE.Vector3(xDip, homeY, 0.18), tc = new THREE.Vector3((xDip + xChosen) / 2, homeY + 1.0, 0.25), tb = new THREE.Vector3(xChosen, homeY, 0.18);
    group.rotation.y = 0.42;
    var sweep = H.lightSweep(THREE, scene, { mapSize: ctx.shadowSize, span: 7, fill: 0.34, intensity: [0.7, 0.8] });
    var look = new THREE.Vector3(), wp = new THREE.Vector3();
    function resize(ctx) { fitFov(ctx, camera, 42); }
    resize(ctx);
    function update(t, dt, ctx) {
      var p = state.p;
      var dip = 1 - AB.ease.headsup(AB.range(p, 0.72, 1.0));           /* the cell levels at the end */
      var lift = AB.ease.headsup(AB.range(p, 0.22, 0.42));             /* the heads up lifts off */
      var fly = AB.ease.pageturn(AB.range(p, 0.42, 0.62));             /* and flies to the chosen day */
      var move = AB.ease.headsup(AB.range(p, 0.55, 0.8));              /* the tag follows and straightens */
      setCell(DIP, 0.075 * dip, 0.16 * dip); /* one edge sunk, the other propped: the cell sits crooked until it levels */
      /* the tag: crooked on the dipped cell, then along the arc to the chosen day */
      bez(ta, tc, tb, move, tmp);
      var roll = -0.2 * dip * (1 - move) + Math.sin(move * Math.PI) * 0.25, yaw = -0.06 + move * 0.08;
      var wob = (1 - move) * dip * Math.sin(t * 1.6) * 0.012;
      place(0, tmp.x, tmp.y + (1 - move) * (-0.07 * dip), tmp.z, yaw + wob, roll, 1);
      tags.instanceMatrix.needsUpdate = true; shadows.instanceMatrix.needsUpdate = true;
      /* the heads up chip */
      if (fly <= 0) { chip.position.set(a0.x, a0.y + lift * 0.7, a0.z); chip.rotation.set(-Math.PI / 2 + lift * 0.8, 0, 0); chip.scale.setScalar(1); }
      else { bez(new THREE.Vector3(a0.x, a0.y + 0.7, a0.z), c0, b0, fly, tmp); chip.position.copy(tmp); chip.rotation.set(-Math.PI / 2 + 0.8 - fly * 0.8, 0, 0); chip.scale.setScalar(1 - fly * 0.15 * (1 - fly)); }
      chip.material.opacity = 1; chip.visible = p > 0.02 || lift > 0;
      /* camera: follows the action from the dipped day toward the chosen day, easing up as the cell levels */
      var cx = AB.lerp(xDip * 0.75, xChosen * 0.75, AB.smooth(AB.range(p, 0.3, 0.8)));
      wp.set(cx, 0, 0); group.localToWorld(wp);
      camera.position.set(wp.x + 0.6, AB.lerp(2.5, 3.1, 1 - dip) + Math.sin(t * 0.4) * 0.02, wp.z + AB.lerp(3.1, 3.6, 1 - dip)); look.set(wp.x, 0.1, wp.z - 0.25); camera.lookAt(look);
      sweep.setProgress(0.25 + p * 0.6, Math.sin(t * 0.2) * 0.05);
      return true;
    }
    return { update: update, resize: resize };
  };

  /* ---- C: three objects on the counter --------------------------------------------- */
  builders.c = function (ctx, ctl) {
    var THREE = ctx.THREE, H = SL.helpers, scene = ctx.scene, camera = ctx.camera;
    counter(ctx, ctl, { fogNear: 8, fogFar: 20 });
    var X = [-1.6, 0, 1.6], objs = [], shadowsMesh = H.contactShadows(THREE, 3, { alpha: 0.3 }); scene.add(shadowsMesh);
    /* 1. the sticky note (a curling square, CAR INS in graphite) */
    var nc = doc.createElement('canvas'); nc.width = nc.height = 256; var ng = nc.getContext('2d');
    ng.fillStyle = '#FBEFC9'; ng.fillRect(0, 0, 256, 256); ng.fillStyle = '#2B2622'; ng.font = '700 44px Figtree, system-ui, sans-serif'; ng.textAlign = 'center'; ng.textBaseline = 'middle'; ng.fillText('CAR INS', 128, 118);
    ng.strokeStyle = 'rgba(43,38,34,0.35)'; ng.lineWidth = 3; ng.beginPath(); ng.moveTo(70, 168); ng.lineTo(186, 168); ng.stroke();
    var noteTex = new THREE.CanvasTexture(nc); noteTex.encoding = THREE.sRGBEncoding;
    var noteGeo = new THREE.PlaneGeometry(1.15, 1.15, 8, 8); noteGeo.rotateX(-Math.PI / 2);
    var pos = noteGeo.attributes.position;
    for (var v = 0; v < pos.count; v++) { var x = pos.getX(v), z = pos.getZ(v); var d = Math.max(0, (x + z) / 1.15 - 0.15); pos.setY(v, d * d * 0.55); }
    noteGeo.computeVertexNormals();
    var note = new THREE.Mesh(noteGeo, new THREE.MeshStandardMaterial({ map: noteTex, roughness: 0.9, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.5 }));
    note.position.set(X[0], 0.02, 0); note.rotation.y = 0.18; note.castShadow = true; note.receiveShadow = true; scene.add(note); objs.push(note);
    /* 2. the spreadsheet grid (a white sheet with hairlines and the totals column) */
    var sc = doc.createElement('canvas'); sc.width = 512; sc.height = 384; var sg = sc.getContext('2d');
    sg.fillStyle = '#FFFFFF'; sg.fillRect(0, 0, 512, 384); sg.strokeStyle = 'rgba(43,38,34,0.35)'; sg.lineWidth = 2;
    for (var r = 0; r <= 8; r++) { sg.beginPath(); sg.moveTo(24, 24 + r * 42); sg.lineTo(488, 24 + r * 42); sg.stroke(); }
    for (var cidx = 0; cidx <= 4; cidx++) { sg.beginPath(); sg.moveTo(24 + cidx * 116, 24); sg.lineTo(24 + cidx * 116, 360); sg.stroke(); }
    sg.fillStyle = 'rgba(43,38,34,0.16)'; for (var rr = 0; rr < 4; rr++) { for (var cc = 0; cc < 3; cc++) { if ((rr + cc) % 2 === 0) sg.fillRect(40 + cc * 116, 40 + rr * 42, 60 + (cc * 13) % 30, 10); } }
    sg.fillStyle = 'rgba(43,38,34,0.55)'; sg.fillRect(40, 328, 72, 10); sg.fillRect(388, 328, 84, 10);
    var sheetTex = new THREE.CanvasTexture(sc); sheetTex.encoding = THREE.sRGBEncoding;
    var sheet = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.02, 1.12), new THREE.MeshStandardMaterial({ map: sheetTex, roughness: 0.92, metalness: 0, envMapIntensity: 0.5 }));
    sheet.position.set(X[1], 0.02, 0.05); sheet.rotation.y = -0.1; sheet.castShadow = true; sheet.receiveShadow = true; scene.add(sheet); objs.push(sheet);
    /* 3. the phone with the reminder list */
    var phone = new THREE.Group();
    var body = new THREE.Mesh(H.roundedBox(THREE, 0.78, 1.6, 0.07, 0.12), new THREE.MeshStandardMaterial({ color: 0x2B2622, roughness: 0.45, metalness: 0.1, envMapIntensity: 0.9 })); body.castShadow = true; body.receiveShadow = true; phone.add(body);
    var pcv = doc.createElement('canvas'); pcv.width = 384; pcv.height = 800; var pgc = pcv.getContext('2d');
    pgc.fillStyle = '#FAF3E6'; pgc.fillRect(0, 0, 384, 800); pgc.fillStyle = '#2B2622'; pgc.font = '600 26px Figtree, system-ui, sans-serif'; pgc.fillText('9:00', 34, 52);
    pgc.font = '600 30px Figtree, system-ui, sans-serif'; pgc.fillText('Reminders', 34, 120); pgc.fillStyle = 'rgba(43,38,34,0.18)'; pgc.fillRect(34, 140, 316, 2);
    ['buy milk', 'Pay electric', 'call Mom', 'dentist form', 'return the book'].forEach(function (s, i) {
      var y = 190 + i * 84; pgc.fillStyle = i === 1 ? '#FFFFFF' : 'rgba(255,255,255,0.55)'; H.roundRect(pgc, 34, y - 34, 316, 66, 14); pgc.fill();
      pgc.strokeStyle = 'rgba(43,38,34,0.5)'; pgc.lineWidth = 2; pgc.beginPath(); pgc.arc(66, y - 1, 12, 0, Math.PI * 2); pgc.stroke();
      pgc.fillStyle = '#2B2622'; pgc.font = (i === 1 ? '600' : '500') + ' 24px Figtree, system-ui, sans-serif'; pgc.fillText(s, 96, y + 8);
    });
    var screenTex = new THREE.CanvasTexture(pcv); screenTex.encoding = THREE.sRGBEncoding;
    var screen = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 1.44), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false })); screen.position.z = 0.0585; phone.add(screen);
    phone.rotation.x = -Math.PI / 2; phone.position.set(X[2], 0.045, 0); phone.rotation.z = -0.35; scene.add(phone); objs.push(phone);
    var m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(1, 1, 1);
    var sweep = H.lightSweep(THREE, scene, { mapSize: ctx.shadowSize, span: 6, fill: 0.34, intensity: [0.68, 0.8] });
    var look = new THREE.Vector3(), lifts = [0, 0, 0];
    function resize(ctx) { fitFov(ctx, camera, 40); }
    resize(ctx);
    function update(t, dt, ctx) {
      var rd = reading(), p = state.p;
      var w = 0; for (var k = 1; k <= 3; k++) { var s = rd.steps[k] || 0; w += AB.smooth(AB.range(s, 0, 0.35)); }
      /* wide over all three until the first section is read, then close on the object being read */
      var close = AB.smooth(AB.clamp(w, 0, 1)), center = X[0] + (X[2] - X[0]) * AB.clamp((w - 1) / 2, 0, 1);
      var cx = AB.lerp(0, center, close);
      camera.position.set(cx + 0.4, AB.lerp(4.4, 2.9, close) + Math.sin(t * 0.4) * 0.02, AB.lerp(5.4, 3.7, close)); look.set(cx, 0.05, 0.35); camera.lookAt(look);
      for (var i = 0; i < 3; i++) {
        var s2 = rd.steps[i + 1] || 0, lift = Math.sin(AB.clamp(s2, 0, 1) * Math.PI); lift = AB.ease.headsup(lift);
        lifts[i] += (lift - lifts[i]) * Math.min(1, dt * 6);
        var o = objs[i], baseY = i === 2 ? 0.045 : 0.02, bob = Math.sin(t * 0.9 + i) * 0.01 * lifts[i];
        o.position.y = baseY + lifts[i] * 0.42 + bob;
        if (i === 0) { o.rotation.z = lifts[i] * 0.16; o.rotation.x = -lifts[i] * 0.1; }
        if (i === 1) { o.rotation.z = lifts[i] * 0.08; o.rotation.x = -lifts[i] * 0.14; }
        if (i === 2) { o.rotation.x = -Math.PI / 2 + lifts[i] * 0.55; }
        var sh = Math.max(0.2, 1 - lifts[i] * 0.45); e.set(0, 0, 0); q.setFromEuler(e); v3.set(X[i], 0.043, 0); s3.set((i === 2 ? 1.0 : 1.5) * sh, 1, (i === 2 ? 1.7 : 1.3) * sh); m4.compose(v3, q, s3); shadowsMesh.setMatrixAt(i, m4);
      }
      shadowsMesh.instanceMatrix.needsUpdate = true;
      sweep.setProgress(0.25 + p * 0.6, Math.sin(t * 0.2) * 0.05);
      return true;
    }
    return { update: update, resize: resize };
  };

  /* ---- D: three reminder markers before a due date ------------------------------------- */
  builders.d = function (ctx, ctl) {
    var THREE = ctx.THREE, H = SL.helpers, scene = ctx.scene, camera = ctx.camera;
    counter(ctx, ctl, { fogNear: 9, fogFar: 22 });
    var DAYS = [25, 26, 27, 28, 29, 30, 1, 2], PITCH = 1.06, MARK = { 25: 'Look', 29: 'Pay', 1: 'Check' };
    var atlas = H.monthAtlas(THREE, { cols: 8, rows: 1, cell: 256, cells: DAYS.map(function (d) { return { label: d, dim: d > 20, today: d === 2 }; }) });
    var group = new THREE.Group(); group.rotation.y = 0.34; scene.add(group);
    group.add(H.dayCells(THREE, atlas, 8, function (i) { return { x: (i - 3.5) * PITCH, z: 0, y: 0.02 }; }, { size: 0.96, thick: 0.035 }));
    var labels = [{ text: 'Look' }, { text: 'Pay' }, { text: 'Check' }, { text: 'Water bill' }];
    var tagAtlas = H.tagAtlas(THREE, labels);
    var tags = H.standingTags(THREE, tagAtlas, 4, { w: 0.62, h: 0.34, d: 0.024 }); group.add(tags);
    var shadows = H.contactShadows(THREE, 4, { alpha: 0.3 }); group.add(shadows);
    var homeY = 0.0375 + 0.17, place = placer(THREE, tags, shadows, homeY);
    var at = [0, 4, 6, 7];
    /* the three markers stand in marigold: a small chip at the foot of each */
    var chipMat = new THREE.MeshStandardMaterial({ color: 0xD08E1B, roughness: 0.82, metalness: 0, envMapIntensity: 0.25 }), chips = [];
    for (var i = 0; i < 3; i++) { var c = new THREE.Mesh(H.roundedBox(THREE, 0.3, 0.13, 0.03, 0.04), chipMat); c.rotation.x = -Math.PI / 2; c.position.set((at[i] - 3.5) * PITCH - 0.02, 0.055, -0.22); c.castShadow = true; group.add(c); chips.push(c); }
    /* the circle around the due date */
    var ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.018, 8, 48), new THREE.MeshStandardMaterial({ color: 0x2B2622, roughness: 0.8, metalness: 0 })); ring.rotation.x = -Math.PI / 2; ring.position.set((7 - 3.5) * PITCH, 0.06, 0); ring.scale.set(1, 0.9, 1); group.add(ring);
    var sweep = H.lightSweep(THREE, scene, { mapSize: ctx.shadowSize, span: 8, fill: 0.34, intensity: [0.7, 0.8] });
    var look = new THREE.Vector3(), wp = new THREE.Vector3(), cur = { x: 0, y: 0, z: 0, lx: 0, lz: 0 }, inited = false;
    function stopX(i) { return (at[i] - 3.5) * PITCH; }
    function world(x) { wp.set(x, 0, 0); return group.localToWorld(wp); }
    function resize(ctx) { fitFov(ctx, camera, 42); }
    resize(ctx);
    function update(t, dt, ctx) {
      var rd = reading(), p = state.p;
      var approach = AB.smooth(AB.range(rd.steps[0] || 0, 0, 0.6));
      var w = 0; for (var k = 1; k <= 3; k++) w += AB.smooth(AB.range(rd.steps[k] || 0, 0.45, 1));
      /* the walk: wide over the strip, then the 25th, the 29th, the 1st, then up to the 2nd (positions along the strip, in strip space) */
      var lx, h, d;
      if (w <= 0) { lx = AB.lerp(0.6, stopX(0), approach); h = AB.lerp(3.6, 2.4, approach); d = AB.lerp(4.4, 3.1, approach); }
      else if (w < 2) { var u = w < 1 ? w : w - 1, a = w < 1 ? 0 : 1; lx = AB.lerp(stopX(a), stopX(a + 1), u); h = 2.4 + Math.sin(u * Math.PI) * 0.35; d = 3.1; }
      else { var u2 = w - 2; lx = AB.lerp(stopX(2), stopX(3), u2); h = AB.lerp(2.4, 3.4, u2); d = AB.lerp(3.1, 3.7, u2); }
      var f = inited ? Math.min(1, dt * 5) : 1; inited = true;
      var target = world(lx);
      cur.lx += (target.x - cur.lx) * f; cur.lz += (target.z - cur.lz) * f; cur.y += (h - cur.y) * f; cur.z += (d - cur.z) * f;
      camera.position.set(cur.lx + 0.5, cur.y + Math.sin(t * 0.4) * 0.015, cur.lz + cur.z); look.set(cur.lx, 0.15, cur.lz - 0.15); camera.lookAt(look);
      for (var i = 0; i < 4; i++) {
        var x = stopX(i), y = homeY, yaw = (i % 2 ? -1 : 1) * 0.03, active = i < 3 && rd.active === i + 1;
        if (active) { var li = Math.sin(t * 1.4) * 0.02 + 0.06; y += li; yaw += Math.sin(t * 0.8) * 0.02; }
        place(i, x, y, 0.2, yaw, 0, 1);
      }
      tags.instanceMatrix.needsUpdate = true; shadows.instanceMatrix.needsUpdate = true;
      for (var j = 0; j < 3; j++) { var on = rd.active >= j + 1 || w > j + 0.5; chips[j].scale.setScalar(AB.lerp(chips[j].scale.x, on ? 1 : 0.55, Math.min(1, dt * 6))); }
      ring.scale.setScalar(AB.lerp(0.001, 1, AB.smooth(AB.range(w, 2.4, 3)))); ring.scale.y = 0.9;
      sweep.setProgress(0.25 + p * 0.6, Math.sin(t * 0.2) * 0.05);
      return true;
    }
    return { update: update, resize: resize };
  };
})();
