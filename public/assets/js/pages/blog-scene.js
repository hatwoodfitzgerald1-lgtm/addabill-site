/* Addabill blog index scene: THE YEAR. Twelve small month pages lie on the counter in a row;
   the camera slides across them like reading a wall planner and each post's tag docks to its
   month as the band scrolls through. SceneLite: one canvas, lazy (loaded by core.js after
   first paint), pixel ratio capped, paused offscreen, disposed on pagehide. Mobile and reduced
   motion get the settled DOM strip from blog.js instead. */
(function () {
  'use strict';
  var AB = window.AB, SL = window.SceneLite, doc = document;
  if (!AB || !SL) return;
  var mount = doc.getElementById('blog-year'), band = mount && mount.closest('.blog-year'), hint = doc.getElementById('blog-year-hint');
  if (!mount) return;
  var POSTS = window.__blogPosts || [];
  if (AB.motion.mobileHero) { if (AB.blogSettledYear) AB.blogSettledYear(); var s = doc.getElementById('blog-year-settled'); if (s) s.hidden = false; return; }

  var state = { p: 0 };
  var PITCH = 1.78, PAGE_W = 1.52, PAGE_D = 1.16, THICK = 0.024;
  function monthX(m) { return (m - 5.5) * PITCH; } /* m = 0..11 */

  SL.create({
    mount: mount, env: '/assets/hdri-interior-512.hdr', fov: 40, toneMapping: 'none',
    dpr: { desktop: 1.5, touch: 1 }, shadow: { desktop: 1024, touch: 512 }, settled: '#blog-year-settled',
    onStatic: function () { if (AB.blogSettledYear) AB.blogSettledYear(); },
    setup: function (ctx, ctl) { return build(ctx, ctl); }
  }).then(function (ctl) { if (ctl) scroll(ctl); });

  function build(ctx, ctl) {
    var THREE = ctx.THREE, H = SL.helpers, scene = ctx.scene, camera = ctx.camera;
    scene.fog = new THREE.Fog(0xEDE2CF, 13, 26);
    var now = new Date(), curM = now.getMonth(), today = now.getDate(), year = now.getFullYear();
    var names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    /* the counter (oat, with the wood grain blended lightly like Home) */
    var counterMat = new THREE.MeshStandardMaterial({ color: 0xE7DAC3, roughness: 1, metalness: 0, envMapIntensity: 0.3 });
    (function () {
      var img = new Image(); img.crossOrigin = 'anonymous';
      img.onload = function () {
        var c = doc.createElement('canvas'); c.width = c.height = 512; var g = c.getContext('2d');
        g.fillStyle = '#E7DAC3'; g.fillRect(0, 0, 512, 512); g.globalAlpha = 0.26; g.drawImage(img, 0, 0, 512, 512); g.globalAlpha = 1;
        var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(9, 9); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
        counterMat.map = t; counterMat.color.set(0xFFFFFF); counterMat.needsUpdate = true; ctl.invalidate();
      };
      img.src = '/assets/tex-counter.jpg';
    })();
    var counter = new THREE.Mesh(new THREE.PlaneGeometry(90, 40), counterMat); counter.rotation.x = -Math.PI / 2; counter.receiveShadow = true; scene.add(counter);

    /* the twelve month pages: one atlas (4 by 3), one InstancedMesh */
    var CW = 384, CH = 292, cols = 4, rows = 3, atlas = doc.createElement('canvas'); atlas.width = CW * cols; atlas.height = CH * rows;
    var g = atlas.getContext('2d');
    for (var m = 0; m < 12; m++) {
      var x0 = (m % cols) * CW, y0 = Math.floor(m / cols) * CH;
      g.fillStyle = '#FFFFFF'; g.fillRect(x0, y0, CW, CH);
      g.fillStyle = 'rgba(43,38,34,0.28)'; g.fillRect(x0, y0, CW, 5);
      g.fillStyle = '#2B2622'; g.font = '600 34px Fraunces, Georgia, serif'; g.textBaseline = 'top'; g.textAlign = 'left'; g.fillText(names[m], x0 + 26, y0 + 22);
      if (m === curM) { g.fillStyle = '#E9A825'; H.roundRect(g, x0 + CW - 44, y0 + 24, 9, 30, 4.5); g.fill(); }
      g.font = '600 15px Figtree, system-ui, sans-serif'; g.fillStyle = '#6B6058'; g.textAlign = 'center';
      var gx = x0 + 26, gy = y0 + 76, cw = (CW - 52) / 7, ch = (CH - 76 - 22) / 6;
      ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(function (l, i) { g.fillText(l, gx + cw * i + cw / 2, gy); });
      gy += 22;
      var first = new Date(year, m, 1).getDay(), n = new Date(year, m + 1, 0).getDate();
      g.lineWidth = 1.5; g.strokeStyle = 'rgba(43,38,34,0.22)';
      for (var d = 1; d <= n; d++) {
        var idx = first + d - 1, cx = gx + (idx % 7) * cw, cy = gy + Math.floor(idx / 7) * ch;
        if (m === curM && d === today) { g.fillStyle = '#E9A825'; g.fillRect(cx + 2, cy + 2, cw - 4, ch - 4); }
        g.strokeRect(cx + 1.5, cy + 1.5, cw - 3, ch - 3);
        g.fillStyle = 'rgba(43,38,34,0.55)'; g.font = '600 11px Figtree, system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(String(d), cx + 5, cy + 4);
      }
    }
    var pageTex = new THREE.CanvasTexture(atlas); pageTex.encoding = THREE.sRGBEncoding; pageTex.anisotropy = 8; pageTex.flipY = true;
    var geo = new THREE.BoxGeometry(PAGE_W, THICK, PAGE_D);
    var uv = geo.attributes.uv, mode = new Float32Array(uv.count);
    for (var v = 0; v < uv.count; v++) { var top = v >= 8 && v <= 11; mode[v] = top ? 1 : 0; if (!top) uv.setXY(v, 0.01, 0.5); }
    var off = new Float32Array(12 * 4);
    for (var i = 0; i < 12; i++) { off.set([(i % cols) / cols, 1 - (Math.floor(i / cols) + 1) / rows, 1 / cols, 1 / rows], i * 4); }
    geo.setAttribute('uvOffset', new THREE.InstancedBufferAttribute(off, 4));
    geo.setAttribute('uvMode', new THREE.BufferAttribute(mode, 1));
    var pages = new THREE.InstancedMesh(geo, H.atlasMaterial(THREE, { map: pageTex, roughness: 0.92, metalness: 0, envMapIntensity: 0.55 }), 12);
    var m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(1, 1, 1);
    for (var k = 0; k < 12; k++) { e.set(0, (k % 2 ? -1 : 1) * 0.012 * ((k * 7) % 3), 0); q.setFromEuler(e); v3.set(monthX(k), THICK / 2 + 0.004, 0); m4.compose(v3, q, s3); pages.setMatrixAt(k, m4); }
    pages.instanceMatrix.needsUpdate = true; pages.receiveShadow = true; pages.castShadow = true; scene.add(pages);

    /* the four posts as standing tags docking to their months */
    var tagAtlas = H.tagAtlas(THREE, POSTS.map(function (p) { return { text: p.short }; }));
    var tags = H.standingTags(THREE, tagAtlas, POSTS.length, { w: 0.74, h: 0.4, d: 0.024 }); scene.add(tags);
    var shadows = H.contactShadows(THREE, POSTS.length, { alpha: 0.3 }); scene.add(shadows);
    var home = POSTS.map(function (p) { return { x: monthX(p.month - 1) + 0.02, y: THICK + 0.2, z: 0.16 }; });
    function placeTag(k, x, y, z, yaw, roll, sc) {
      e.set(0, yaw, roll || 0); q.setFromEuler(e); v3.set(x, y, z); s3.set(sc || 1, sc || 1, sc || 1); m4.compose(v3, q, s3); tags.setMatrixAt(k, m4);
      var lift = Math.max(0, y - home[k].y), sh = Math.max(0.15, 1 - lift * 0.5);
      e.set(0, yaw, 0); q.setFromEuler(e); v3.set(x, THICK + 0.006, z); s3.set(1.0 * sh, 1, 0.6 * sh); m4.compose(v3, q, s3); shadows.setMatrixAt(k, m4);
    }
    /* docking order follows the camera: June first, September last */
    var order = POSTS.slice().sort(function (a, b) { return a.month - b.month; });
    var win = {}; order.forEach(function (p, i) { win[p.key] = { s: 0.14 + i * 0.17, e: 0.14 + i * 0.17 + 0.2 }; });

    var sweep = H.lightSweep(THREE, scene, { mapSize: ctx.shadowSize, span: 12, fill: 0.38, intensity: [0.78, 0.92] });
    var camPos = new THREE.Vector3(), look = new THREE.Vector3();
    var X0 = monthX(1) + 0.4, X1 = monthX(9) + 0.7;
    var idle = { liftIndex: -1, t0: 5, cursor: 0 };
    function resize(ctx) { var a = ctx.width / ctx.height; camera.fov = AB.clamp(46 - a * 3, 34, 44); camera.updateProjectionMatrix(); }
    resize(ctx);
    function update(t, dt, ctx) {
      var p = state.p, pe = AB.smooth(p);
      var cx = AB.lerp(X0, X1, pe);
      camPos.set(cx, 4.5 + Math.sin(t * 0.4) * 0.02, 4.7); look.set(cx + 0.3, 0.0, -0.45);
      camera.position.copy(camPos); camera.lookAt(look);
      sweep.setProgress(0.25 + p * 0.5, Math.sin(t * 0.2) * 0.05);
      for (var k = 0; k < POSTS.length; k++) {
        var w = win[POSTS[k].key], u = AB.range(p, w.s, w.e), eu = AB.ease.headsup(u), h = home[k];
        var y = u <= 0 ? -4 : h.y + (1 - eu) * 3.2, yaw = (1 - eu) * 0.5 - 0.02, roll = (1 - eu) * -0.2, z = h.z + (1 - eu) * 0.4;
        if (u >= 1 && k === idle.liftIndex) { var it = t - idle.t0; if (it >= 0 && it < AB.D.slow) { var li = Math.sin((it / AB.D.slow) * Math.PI); y += li * 0.12; yaw += li * 0.06; } }
        placeTag(k, h.x, y, z, yaw, roll, 1);
      }
      if (t - idle.t0 > 8) { idle.t0 = t; var docked = []; for (var j = 0; j < POSTS.length; j++) if (p >= win[POSTS[j].key].e) docked.push(j); idle.liftIndex = docked.length ? docked[(idle.cursor++) % docked.length] : -1; }
      tags.instanceMatrix.needsUpdate = true; shadows.instanceMatrix.needsUpdate = true;
      if (hint) hint.classList.toggle('is-on', p < 0.08);
      return true;
    }
    return { update: update, resize: resize, dispose: function () { pageTex.dispose(); } };
  }

  function scroll(ctl) {
    if (!window.gsap || !window.ScrollTrigger || !band) return;
    var proxy = { p: 0 };
    gsap.to(proxy, {
      p: 1, ease: 'none',
      scrollTrigger: { trigger: band, start: 'top 90%', end: 'bottom 10%', scrub: 0.8, invalidateOnRefresh: true, onRefresh: function (st) { AB.qa.arc(st.start, st.end, 'The year (blog index)'); } },
      onUpdate: function () { state.p = proxy.p; ctl.invalidate(); }
    });
  }
})();
