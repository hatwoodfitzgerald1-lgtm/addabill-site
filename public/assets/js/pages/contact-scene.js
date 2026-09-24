/* Contact scene: THE FRIDGE DOOR. A small paper month held by one marigold magnet on a fridge door that
   tilts toward the pointer (and with the scroll on touch), lit by the window. Loaded after first paint by
   core.js. Mobile and reduced motion show the settled DOM fridge from contact.js. */
(function () {
  'use strict';
  var AB = window.AB, doc = document, SL = window.SceneLite;
  if (!AB || !SL) return;
  var mount = doc.getElementById('contact-scene');
  if (!mount || AB.motion.rm || AB.motion.mobileHero) return;
  var BILLS = [{ n: 'Rent', d: 1, paid: true }, { n: 'Water bill', d: 2 }, { n: 'Internet', d: 6 }, { n: 'Phone plan', d: 10 }, { n: 'Gym', d: 13 }, { n: 'Electric', d: 15 }, { n: 'Streaming', d: 17 }, { n: 'Gas', d: 20 }, { n: 'Car insurance', d: 21 }, { n: 'Trash pickup', d: 24 }, { n: 'Dentist', d: 28 }];
  var FIRST_DOW = 3;
  var state = { p: 0, px: 0, py: 0, hasPointer: false };

  function monthTexture(THREE) {
    var W = 640, Hh = 700, c = doc.createElement('canvas'); c.width = W; c.height = Hh; var g = c.getContext('2d');
    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, Hh);
    g.fillStyle = '#2B2622'; g.font = '600 54px Fraunces, Georgia, serif'; g.textBaseline = 'top'; g.fillText('October', 40, 40);
    g.fillStyle = '#6B6058'; g.font = '600 16px Figtree, system-ui, sans-serif'; g.textAlign = 'center';
    var x0 = 40, y0 = 150, cw = (W - 80) / 7, ch = (Hh - y0 - 40) / 5;
    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(function (l, i) { g.fillText(l, x0 + cw * (i + 0.5), 122); });
    for (var i = 0; i < 35; i++) {
      var col = i % 7, row = Math.floor(i / 7), x = x0 + col * cw, y = y0 + row * ch, d = i - FIRST_DOW + 1, inM = d >= 1 && d <= 31;
      g.strokeStyle = 'rgba(43,38,34,0.2)'; g.lineWidth = 1.5; g.strokeRect(x + 0.75, y + 0.75, cw - 1.5, ch - 1.5);
      if (!inM) { g.fillStyle = 'rgba(237,226,207,0.5)'; g.fillRect(x + 1.5, y + 1.5, cw - 3, ch - 3); continue; }
      g.fillStyle = '#2B2622'; g.font = '600 15px Figtree, system-ui, sans-serif'; g.textAlign = 'left'; g.fillText(String(d), x + 8, y + 7);
      if (d === 2) { g.fillStyle = '#E9A825'; g.fillRect(x + cw - 13, y + 7, 4, 13); }
    }
    BILLS.forEach(function (b) {
      var i = b.d + FIRST_DOW - 1, col = i % 7, row = Math.floor(i / 7), x = x0 + col * cw, y = y0 + row * ch, tx = x + 7, ty = y + ch - 30, tw = cw - 14, th = 22;
      g.fillStyle = '#FFFFFF'; g.fillRect(tx, ty, tw, th);
      g.strokeStyle = b.paid ? 'rgba(43,38,34,0.35)' : '#2B2622'; g.lineWidth = 1.5; g.strokeRect(tx + 0.75, ty + 0.75, tw - 1.5, th - 1.5);
      g.fillStyle = b.paid ? 'rgba(43,38,34,0.35)' : '#2B2622'; g.fillRect(tx, ty, tw, 3);
      g.fillStyle = b.paid ? '#6B6058' : '#2B2622'; g.font = '600 11px Figtree, system-ui, sans-serif'; g.textAlign = 'left'; g.fillText(b.n, tx + 5, ty + 8);
    });
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
  }
  function brushed(THREE) {
    var c = doc.createElement('canvas'); c.width = 64; c.height = 512; var g = c.getContext('2d');
    g.fillStyle = '#F6F2EA'; g.fillRect(0, 0, 64, 512);
    for (var i = 0; i < 512; i += 2) { g.fillStyle = 'rgba(43,38,34,' + (0.012 + ((i * 7919) % 13) / 13 * 0.03) + ')'; g.fillRect(0, i, 64, 1); }
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 1); t.encoding = THREE.sRGBEncoding; return t;
  }

  SL.create({
    mount: mount, env: '/assets/hdri-interior-512.hdr', fov: 30, toneMapping: 'none',
    dpr: { desktop: 1.5, touch: 1 }, shadow: { desktop: 1024, touch: 512 }, settled: '#contact-fridge',
    setup: function (ctx, ctl) {
      var THREE = ctx.THREE, H = SL.helpers, scene = ctx.scene, camera = ctx.camera;
      var door = new THREE.Group(); scene.add(door);
      var panel = new THREE.Mesh(new THREE.PlaneGeometry(9, 7), new THREE.MeshStandardMaterial({ map: brushed(THREE), color: 0xFFFFFF, metalness: 0.5, roughness: 0.38, envMapIntensity: 0.9 }));
      panel.receiveShadow = true; door.add(panel);
      var seam = new THREE.Mesh(new THREE.PlaneGeometry(9, 0.02), new THREE.MeshBasicMaterial({ color: 0xD9D2C6 })); seam.position.set(0, 2.55, 0.001); door.add(seam);
      var handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 18), new THREE.MeshStandardMaterial({ color: 0xE3DDD2, metalness: 0.75, roughness: 0.3, envMapIntensity: 1.1 }));
      handle.position.set(-1.62, 0.1, 0.16); handle.castShadow = true; door.add(handle);
      [-1.0, 1.2].forEach(function (y) { var m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 12), handle.material); m.rotation.x = Math.PI / 2; m.position.set(-1.62, y, 0.08); door.add(m); });
      /* the paper month */
      var paper = new THREE.Group(); paper.position.set(0.3, 0.05, 0.03); paper.rotation.z = -0.035; door.add(paper);
      var sheet = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.75, 1, 6), new THREE.MeshStandardMaterial({ map: monthTexture(THREE), roughness: 0.92, metalness: 0, envMapIntensity: 0.55 }));
      var pos = sheet.geometry.attributes.position; for (var i = 0; i < pos.count; i++) { var y = pos.getY(i), x = pos.getX(i); var u = (0.875 - y) / 1.75; pos.setZ(i, u * u * 0.06 + (x > 0.7 && u > 0.7 ? (x - 0.7) * (u - 0.7) * 0.3 : 0)); } sheet.geometry.computeVertexNormals();
      sheet.castShadow = true; sheet.receiveShadow = true; paper.add(sheet);
      var magnetMat = new THREE.MeshStandardMaterial({ color: 0xE9A825, roughness: 0.32, metalness: 0.06, envMapIntensity: 1.0 });
      var magnet = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.135, 0.05, 36), magnetMat);
      magnet.rotation.x = Math.PI / 2; magnet.position.set(0, 0.8, 0.045); magnet.castShadow = true; paper.add(magnet);
      var dome = new THREE.Mesh(new THREE.SphereGeometry(0.13, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), magnetMat);
      dome.rotation.x = Math.PI / 2; dome.scale.set(1, 1, 0.42); dome.position.set(0, 0.8, 0.07); dome.castShadow = true; paper.add(dome);
      var sweep = H.lightSweep(THREE, scene, { mapSize: ctx.shadowSize, span: 5, fill: 0.55, intensity: [0.75, 0.85] });
      sweep.light.shadow.bias = -0.0004;
      camera.position.set(0, 0, 5.4); camera.lookAt(0, 0, 0);
      var tx = 0, ty = 0;
      function resize(ctx) { var aspect = ctx.width / ctx.height; camera.fov = aspect < 1 ? 44 : aspect < 1.4 ? 36 : 30; camera.updateProjectionMatrix(); }
      resize(ctx);
      function update(t, dt, ctx) {
        var targetX, targetY;
        if (ctx.isTouch || !state.hasPointer) { targetX = (0.5 - state.p) * 0.26 + Math.sin(t * 0.3) * 0.015; targetY = (state.p - 0.5) * 0.2 + Math.sin(t * 0.23) * 0.02; }
        else { targetX = -state.py * 0.2; targetY = state.px * 0.3; }
        var k = 1 - Math.pow(0.001, dt);
        tx += (targetX - tx) * k * 0.9; ty += (targetY - ty) * k * 0.9;
        door.rotation.x = tx; door.rotation.y = ty;
        paper.rotation.z = -0.035 + Math.sin(t * 0.6) * 0.006;
        sweep.setProgress(0.2 + Math.sin(t * 0.06) * 0.05, ty * 0.3);
        return true;
      }
      return { update: update, resize: resize, dispose: function () {} };
    }
  }).then(function (ctl) {
    if (!ctl) return;
    if (!ctl.ctx.isTouch) {
      doc.addEventListener('pointermove', function (e) {
        var r = mount.getBoundingClientRect(); if (r.bottom < 0 || r.top > window.innerHeight) return;
        state.px = AB.clamp((e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2), -1, 1);
        state.py = AB.clamp((e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2), -1, 1);
        state.hasPointer = true;
      }, { passive: true });
      doc.addEventListener('pointerleave', function () { state.hasPointer = false; });
    }
    if (window.ScrollTrigger) {
      var hero = mount.closest('.contact-hero') || mount;
      ScrollTrigger.create({ trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6, onUpdate: function (st) { state.p = st.progress; }, onRefresh: function (st) { AB.qa.arc(st.start, st.end, 'Contact fridge tilt'); } });
    }
    window.__contactState = state;
  });
})();
