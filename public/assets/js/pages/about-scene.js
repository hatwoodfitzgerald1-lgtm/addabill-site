/* About scene: THE WALL CALENDAR ON ITS PIN. An October page hangs from one pin on the kitchen wall and
   sways slowly; below it the counter carries the mail sorted into three stacks, one window envelope on
   top. As the reader scrolls the hero, the camera tilts down from the calendar to the counter and the
   mail. Loaded after first paint by core.js. Mobile and reduced motion show the settled DOM wall. */
(function () {
  'use strict';
  var AB = window.AB, doc = document, SL = window.SceneLite;
  if (!AB || !SL) return;
  var mount = doc.getElementById('about-scene');
  if (!mount || AB.motion.rm || AB.motion.mobileHero) return;
  var state = { p: 0 };
  var BILLS = [
    { name: 'Rent', day: 1, paid: true }, { name: 'Water bill', day: 2 }, { name: 'Internet', day: 6 }, { name: 'Dentist', day: 9, paper: true }, { name: 'Phone plan', day: 10 },
    { name: 'Gym', day: 13 }, { name: 'Electric', day: 15 }, { name: 'Streaming', day: 17 }, { name: 'Gas', day: 20 }, { name: 'Car insurance', day: 21 }, { name: 'Trash pickup', day: 24 }
  ];
  var FIRST_DOW = 3; /* October, the 1st a Wednesday (the product master) */

  function pageTexture(THREE) {
    var W = 768, Hh = 880, c = doc.createElement('canvas'); c.width = W; c.height = Hh; var g = c.getContext('2d');
    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, Hh);
    g.fillStyle = '#2B2622'; g.fillRect(0, 0, W, 26);
    g.fillStyle = '#2B2622'; g.font = '600 64px Fraunces, Georgia, serif'; g.textBaseline = 'top'; g.textAlign = 'left'; g.fillText('October', 48, 58);
    g.fillStyle = '#6B6058'; g.font = '600 20px Figtree, system-ui, sans-serif'; g.textAlign = 'center';
    var x0 = 48, y0 = 176, cw = (W - 96) / 7, ch = (Hh - y0 - 48) / 5;
    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(function (l, i) { g.fillText(l, x0 + cw * (i + 0.5), 146); });
    for (var i = 0; i < 35; i++) {
      var col = i % 7, row = Math.floor(i / 7), x = x0 + col * cw, y = y0 + row * ch, d = i - FIRST_DOW + 1, inMonth = d >= 1 && d <= 31;
      g.strokeStyle = 'rgba(43,38,34,0.22)'; g.lineWidth = 1.5; g.strokeRect(x + 0.75, y + 0.75, cw - 1.5, ch - 1.5);
      if (!inMonth) { g.fillStyle = 'rgba(237,226,207,0.55)'; g.fillRect(x + 1.5, y + 1.5, cw - 3, ch - 3); continue; }
      g.fillStyle = '#2B2622'; g.font = '600 18px Figtree, system-ui, sans-serif'; g.textAlign = 'left'; g.fillText(String(d), x + 9, y + 8);
      if (d === 2) { g.fillStyle = '#E9A825'; g.fillRect(x + cw - 16, y + 8, 5, 16); }
    }
    BILLS.forEach(function (b) {
      var i = b.day + FIRST_DOW - 1, col = i % 7, row = Math.floor(i / 7), x = x0 + col * cw, y = y0 + row * ch;
      var tx = x + 8, ty = y + ch - 40, tw = cw - 16, th = 30;
      g.fillStyle = b.paper ? '#F3EBDD' : '#FFFFFF'; g.fillRect(tx, ty, tw, th);
      g.strokeStyle = b.paid ? 'rgba(43,38,34,0.35)' : '#2B2622'; g.lineWidth = 1.5; g.strokeRect(tx + 0.75, ty + 0.75, tw - 1.5, th - 1.5);
      g.fillStyle = b.paid ? 'rgba(43,38,34,0.35)' : '#2B2622'; g.fillRect(tx, ty, tw, 4);
      g.fillStyle = b.paid ? '#6B6058' : '#2B2622'; g.font = '600 13px Figtree, system-ui, sans-serif'; g.textAlign = 'left'; g.fillText(b.name, tx + 6, ty + 11);
      if (b.paid) { g.strokeStyle = '#3F6B4B'; g.lineWidth = 2; g.beginPath(); g.moveTo(tx + tw - 22, ty + 17); g.lineTo(tx + tw - 16, ty + 23); g.lineTo(tx + tw - 7, ty + 11); g.stroke(); }
    });
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
  }

  SL.create({
    mount: mount, env: '/assets/hdri-interior-512.hdr', fov: 34, toneMapping: 'none',
    dpr: { desktop: 1.5, touch: 1 }, shadow: { desktop: 1024, touch: 512 }, settled: '#about-wall',
    setup: function (ctx, ctl) {
      var THREE = ctx.THREE, H = SL.helpers, scene = ctx.scene, camera = ctx.camera;
      /* the wall catches only the shadow; the page's cream shows through the transparent canvas */
      var wall = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.14 })); wall.position.z = -0.08; wall.receiveShadow = true; scene.add(wall);
      /* the counter */
      /* the counter fades out toward its edges (an alpha map) so it reads as a pool of light on the counter, never a cut rectangle */
      var ac = doc.createElement('canvas'); ac.width = ac.height = 256; var ag = ac.getContext('2d');
      var agrd = ag.createRadialGradient(128, 118, 20, 128, 118, 128); agrd.addColorStop(0, '#fff'); agrd.addColorStop(0.55, '#fff'); agrd.addColorStop(1, '#000'); ag.fillStyle = agrd; ag.fillRect(0, 0, 256, 256);
      var alphaTex = new THREE.CanvasTexture(ac);
      var counterMat = new THREE.MeshStandardMaterial({ color: 0xEDE2CF, roughness: 1, metalness: 0, envMapIntensity: 0.25, transparent: true, alphaMap: alphaTex, depthWrite: false });
      (function () { var img = new Image(); img.onload = function () { var c = doc.createElement('canvas'); c.width = c.height = 512; var g = c.getContext('2d'); g.fillStyle = '#EDE2CF'; g.fillRect(0, 0, 512, 512); g.globalAlpha = 0.22; g.drawImage(img, 0, 0, 512, 512); var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); t.encoding = THREE.sRGBEncoding; counterMat.map = t; counterMat.color.set(0xFFFFFF); counterMat.needsUpdate = true; ctl.invalidate(); }; img.src = '/assets/tex-counter.jpg'; })();
      var COUNTER_Y = -2.5;
      var counter = new THREE.Mesh(new THREE.PlaneGeometry(26, 22), counterMat); counter.rotation.x = -Math.PI / 2; counter.position.set(0, COUNTER_Y, 4); counter.receiveShadow = true; scene.add(counter);

      /* the calendar page on its pin */
      var pivot = new THREE.Group(); pivot.position.set(0, 1.95, 0); scene.add(pivot);
      var pageGeo = new THREE.PlaneGeometry(3.0, 3.44, 1, 8);
      /* a gentle curl: the lower part lifts off the wall a little */
      var pos = pageGeo.attributes.position; for (var i = 0; i < pos.count; i++) { var y = pos.getY(i); var u = (1.72 - y) / 3.44; pos.setZ(i, u * u * 0.12); } pageGeo.computeVertexNormals();
      var page = new THREE.Mesh(pageGeo, new THREE.MeshStandardMaterial({ map: pageTexture(THREE), roughness: 0.92, metalness: 0, envMapIntensity: 0.55, side: THREE.DoubleSide }));
      page.position.set(0, -1.72, 0.02); page.castShadow = true; page.receiveShadow = true; pivot.add(page);
      var pin = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshStandardMaterial({ color: 0x2B2622, roughness: 0.4, metalness: 0.3 })); pin.position.set(0, 0, 0.08); pin.castShadow = true; pivot.add(pin);
      var hole = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.055, 16), new THREE.MeshBasicMaterial({ color: 0x2B2622, transparent: true, opacity: 0.5 })); hole.position.set(0, -0.02, 0.05); pivot.add(hole);

      /* the mail, sorted into three stacks */
      var envMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.9, metalness: 0, envMapIntensity: 0.5 });
      var wc = doc.createElement('canvas'); wc.width = 512; wc.height = 336; var wg = wc.getContext('2d'); wg.fillStyle = '#FFFFFF'; wg.fillRect(0, 0, 512, 336); wg.fillStyle = 'rgba(200,214,224,0.9)'; wg.fillRect(60, 170, 220, 96); wg.strokeStyle = 'rgba(43,38,34,0.18)'; wg.lineWidth = 3; wg.strokeRect(60, 170, 220, 96); wg.fillStyle = 'rgba(43,38,34,0.16)'; wg.fillRect(60, 40, 150, 6); wg.fillRect(60, 60, 110, 6); wg.fillStyle = '#E9A825'; wg.fillRect(420, 36, 40, 40);
      var winTex = new THREE.CanvasTexture(wc); winTex.encoding = THREE.sRGBEncoding;
      var windowMat = new THREE.MeshStandardMaterial({ map: winTex, roughness: 0.9, metalness: 0, envMapIntensity: 0.5 });
      var stacks = [{ x: -1.55, z: 1.1, n: 4, rot: 0.08 }, { x: 0.15, z: 1.35, n: 3, rot: -0.05, win: true }, { x: 1.7, z: 1.0, n: 5, rot: 0.12 }];
      var envGeo = new THREE.BoxGeometry(1.15, 0.022, 0.75);
      stacks.forEach(function (s, si) {
        for (var k = 0; k < s.n; k++) {
          var top = k === s.n - 1;
          var m = new THREE.Mesh(envGeo, (top && s.win) ? [envMat, envMat, windowMat, envMat, envMat, envMat] : envMat);
          m.position.set(s.x + (k % 2) * 0.03, COUNTER_Y + 0.011 + k * 0.024, s.z + ((k * 7 + si) % 3) * 0.02);
          m.rotation.y = s.rot + ((k * 13 + si * 5) % 7 - 3) * 0.01; m.castShadow = true; m.receiveShadow = true; scene.add(m);
        }
      });
      /* a mug beside the mail, quietly */
      var mug = new THREE.Group();
      var body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.24, 0.42, 24), new THREE.MeshStandardMaterial({ color: 0xFFFDF8, roughness: 0.55, metalness: 0, envMapIntensity: 0.8 })); body.castShadow = true; body.receiveShadow = true; mug.add(body);
      var handle = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.035, 10, 20), body.material); handle.position.set(0.3, 0.02, 0); handle.castShadow = true; mug.add(handle);
      mug.position.set(-2.9, COUNTER_Y + 0.21, 0.6); scene.add(mug);

      /* the light: side window, warm, drifting */
      var sweep = H.lightSweep(THREE, scene, { mapSize: ctx.shadowSize, span: 6, fill: 0.5, intensity: [0.62, 0.7] });
      sweep.light.shadow.camera.near = 1; sweep.light.shadow.camera.far = 40; sweep.light.shadow.bias = -0.0006;

      var camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
      var A = { pos: [0.0, 0.15, 6.4], look: [0, 0.05, 0] }, B = { pos: [0.1, 2.5, 5.4], look: [0, -1.75, 0.8] };
      function resize(ctx) { var aspect = ctx.width / ctx.height; camera.fov = aspect < 1 ? 46 : aspect < 1.4 ? 40 : 34; camera.updateProjectionMatrix(); }
      resize(ctx);
      function update(t, dt, ctx) {
        var p = AB.smooth(state.p);
        camPos.set(AB.lerp(A.pos[0], B.pos[0], p), AB.lerp(A.pos[1], B.pos[1], p), AB.lerp(A.pos[2], B.pos[2], p));
        camLook.set(AB.lerp(A.look[0], B.look[0], p), AB.lerp(A.look[1], B.look[1], p), AB.lerp(A.look[2], B.look[2], p));
        camera.position.copy(camPos); camera.position.x += Math.sin(t * 0.3) * 0.02; camera.lookAt(camLook);
        /* the slow sway on the pin, a breath of the curl */
        pivot.rotation.z = Math.sin(t * 0.55) * 0.022 + Math.sin(t * 0.17) * 0.01;
        pivot.rotation.x = 0.02 + Math.sin(t * 0.4) * 0.006;
        sweep.setProgress(0.08 + Math.sin(t * 0.05) * 0.04, Math.sin(t * 0.2) * 0.04);
        return true;
      }
      return { update: update, resize: resize, dispose: function () {} };
    }
  }).then(function (ctl) {
    if (!ctl || !window.gsap || !window.ScrollTrigger) return;
    var hero = mount.closest('.about-hero') || mount;
    ScrollTrigger.create({
      trigger: hero, start: 'top top', end: 'bottom 30%', scrub: 0.8,
      onUpdate: function (st) { state.p = st.progress; },
      onRefresh: function (st) { AB.qa.arc(st.start, st.end, 'About wall calendar tilt'); }
    });
    window.__aboutState = state;
  });
})();
