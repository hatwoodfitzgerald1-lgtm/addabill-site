/* How it works scene: THE WEEK WALK. Seven paper day cells (Mon Sep 29 to Sun Oct 5) on the counter.
   The camera tracks Monday to Sunday while the four steps happen on the days: the water bill lands on
   Thursday and is stamped Added; the rent stands up paid on Wednesday; the heads up chip lifts from
   Monday and flies into the phone lying past Sunday, whose screen shows the text; then the camera rises
   to look down at Thursday as the water bill gets its paid check. Scrubbed by the hero's scroll.
   Loaded after first paint by core.js. Mobile and reduced motion use the settled DOM week instead. */
(function () {
  'use strict';
  var AB = window.AB, doc = document, SL = window.SceneLite;
  if (!AB || !SL) return;
  var mount = doc.getElementById('hiw-scene'), hint = doc.getElementById('hiw-hint');
  if (!mount || AB.motion.rm || AB.motion.mobileHero) return;

  var PITCH = 1.06, DAYS = [{ label: 29, dim: true }, { label: 30, dim: true }, { label: 1 }, { label: 2, today: true }, { label: 3 }, { label: 4 }, { label: 5 }];
  var WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  function cx(i) { return (i - 3) * PITCH; }
  var state = { p: 0 };

  SL.create({
    mount: mount, env: '/assets/hdri-interior-512.hdr', fov: 36, toneMapping: 'none',
    dpr: { desktop: 1.5, touch: 1 }, shadow: { desktop: 1024, touch: 512 }, settled: '#hiw-week',
    setup: function (ctx, ctl) {
      var THREE = ctx.THREE, H = SL.helpers, scene = ctx.scene, camera = ctx.camera;
      scene.fog = new THREE.Fog(0xEFE6D6, 7, 17);

      /* the counter */
      var counterMat = new THREE.MeshStandardMaterial({ color: 0xEDE2CF, roughness: 1, metalness: 0, envMapIntensity: 0.35 });
      (function () {
        var img = new Image(); img.onload = function () {
          var c = doc.createElement('canvas'); c.width = c.height = 512; var g = c.getContext('2d');
          g.fillStyle = '#EDE2CF'; g.fillRect(0, 0, 512, 512); g.globalAlpha = 0.22; g.drawImage(img, 0, 0, 512, 512); g.globalAlpha = 1;
          var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(7, 7); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
          counterMat.map = t; counterMat.color.set(0xFFFFFF); counterMat.needsUpdate = true; ctl.invalidate();
        }; img.src = '/assets/tex-counter.jpg';
      })();
      var counter = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), counterMat); counter.rotation.x = -Math.PI / 2; counter.receiveShadow = true; scene.add(counter);

      /* the week strip page under the cells, with the weekday letters */
      var pc = doc.createElement('canvas'); pc.width = 1792; pc.height = 420; var pg = pc.getContext('2d');
      pg.fillStyle = '#FFFFFF'; pg.fillRect(0, 0, pc.width, pc.height);
      pg.fillStyle = 'rgba(43,38,34,0.25)'; pg.fillRect(0, 0, pc.width, 6);
      pg.fillStyle = '#6B6058'; pg.font = '600 30px Figtree, system-ui, sans-serif'; pg.textAlign = 'center'; pg.textBaseline = 'top';
      WD.forEach(function (l, i) { pg.fillText(l.toUpperCase(), 128 + i * 256, 34); });
            var pageTex = new THREE.CanvasTexture(pc); pageTex.encoding = THREE.sRGBEncoding;
      var page = new THREE.Mesh(new THREE.PlaneGeometry(7 * PITCH + 0.5, 1.85), new THREE.MeshStandardMaterial({ map: pageTex, roughness: 0.95, metalness: 0, envMapIntensity: 0.5 }));
      page.rotation.x = -Math.PI / 2; page.position.set(0, 0.004, 0.1); page.receiveShadow = true; scene.add(page);

      /* the seven day cells */
      var atlas = H.monthAtlas(THREE, { cols: 7, rows: 1, cell: 256, cells: DAYS });
      var cells = H.dayCells(THREE, atlas, 7, function (i) { return { x: cx(i), z: 0.18, y: 0.02 }; }, { size: 0.96, thick: 0.035 });
      scene.add(cells);

      /* the tags: 0 water bill, 1 rent paid, 2 the Added stamp; region 3 is the water bill paid */
      var tagAtlas = H.tagAtlas(THREE, [{ text: 'Water bill' }, { text: 'Rent', paid: true }, { text: 'Added' }, { text: 'Water bill', paid: true }]);
      var tags = H.standingTags(THREE, tagAtlas, 3, { w: 0.68, h: 0.36, d: 0.024 }); scene.add(tags);
      var shadows = H.contactShadows(THREE, 3, { alpha: 0.3 }); scene.add(shadows);
      var m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(1, 1, 1);
      function place(k, x, y, z, yaw, roll, sc, restY) {
        e.set(0, yaw, roll || 0); q.setFromEuler(e); v3.set(x, y, z); s3.set(sc, sc, sc); m4.compose(v3, q, s3); tags.setMatrixAt(k, m4);
        var lift = Math.max(0, y - restY), sh = Math.max(0.15, 1 + lift * 0.6 - lift * lift * 0.5) * sc;
        e.set(0, yaw, 0); q.setFromEuler(e); v3.set(x, 0.041, z); s3.set(0.95 * sh, 1, 0.55 * sh); m4.compose(v3, q, s3); shadows.setMatrixAt(k, m4);
      }
      var REST_Y = 0.0375 + 0.18, waterPaid = false;
      function setWaterPaid(on) {
        if (waterPaid === on) return; waterPaid = on;
        var attr = tags.geometry.getAttribute('uvOffset'), r = tagAtlas.region(on ? 3 : 0);
        attr.setXYZW(0, r[0], r[1], r[2], r[3]); attr.needsUpdate = true;
      }

      /* the heads up chip on Monday */
      var chipMat = new THREE.MeshStandardMaterial({ color: 0xE9A825, roughness: 0.55, metalness: 0, transparent: true, opacity: 1 });
      var chip = new THREE.Mesh(H.roundedBox(THREE, 0.44, 0.2, 0.03, 0.05), chipMat); chip.rotation.x = -Math.PI / 2; chip.castShadow = true;
      var chipStart = new THREE.Vector3(cx(0) + 0.02, 0.055, 0.38); chip.position.copy(chipStart); scene.add(chip);
      var chipShadow = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.34), new THREE.MeshBasicMaterial({ map: shadows.material.map, transparent: true, depthWrite: false })); chipShadow.rotation.x = -Math.PI / 2; chipShadow.position.set(chipStart.x, 0.041, chipStart.z); scene.add(chipShadow);

      /* the phone lying past Sunday, face up */
      var phone = new THREE.Group();
      var body = new THREE.Mesh(H.roundedBox(THREE, 0.92, 1.9, 0.08, 0.14), new THREE.MeshStandardMaterial({ color: 0x2B2622, roughness: 0.45, metalness: 0.1, envMapIntensity: 0.9 })); body.castShadow = true; body.receiveShadow = true; phone.add(body);
      var screenTex = H.phoneScreen(THREE, {});
      var screen = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.7), new THREE.MeshBasicMaterial({ map: screenTex.texture, toneMapped: false })); screen.position.z = 0.0625; phone.add(screen);
      var glowC = doc.createElement('canvas'); glowC.width = glowC.height = 256; var gg = glowC.getContext('2d'); var grd = gg.createRadialGradient(128, 128, 20, 128, 128, 128); grd.addColorStop(0, 'rgba(255,240,200,0.55)'); grd.addColorStop(1, 'rgba(255,240,200,0)'); gg.fillStyle = grd; gg.fillRect(0, 0, 256, 256);
      var glow = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.0), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(glowC), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.1 })); glow.position.z = 0.09; phone.add(glow);
      var PHONE_X = cx(6) + 1.75;
      phone.position.set(PHONE_X, 0.045, 0.35); phone.rotation.set(-Math.PI / 2, 0, -0.22); scene.add(phone);

      /* the light */
      var sweep = H.lightSweep(THREE, scene, { mapSize: ctx.shadowSize, span: 7, fill: 0.4, intensity: [0.85, 0.95] });

      /* camera keyframes: Monday, along the strip to Sunday, then up over Thursday */
      var KEYS = [
        { p: 0.0, pos: [cx(0) - 1.5, 1.7, 3.3], look: [cx(0) + 1.1, 0.05, 0.1] },
        { p: 0.38, pos: [cx(3) - 0.8, 1.75, 3.4], look: [cx(3) + 0.7, 0.05, 0.05] },
        { p: 0.72, pos: [cx(6) - 0.4, 1.85, 3.5], look: [cx(6) + 1.0, 0.05, 0.05] },
        { p: 1.0, pos: [cx(3) + 0.15, 5.6, 2.4], look: [cx(3), 0.1, 0.0] }
      ];
      var camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), tA = new THREE.Vector3(), tB = new THREE.Vector3();
      function camAt(p) {
        var a = KEYS[0], b = KEYS[KEYS.length - 1];
        for (var i = 0; i < KEYS.length - 1; i++) { if (p >= KEYS[i].p && p <= KEYS[i + 1].p) { a = KEYS[i]; b = KEYS[i + 1]; break; } }
        var t = AB.smooth((p - a.p) / (b.p - a.p || 1));
        camPos.set(a.pos[0], a.pos[1], a.pos[2]).lerp(tA.set(b.pos[0], b.pos[1], b.pos[2]), t);
        camLook.set(a.look[0], a.look[1], a.look[2]).lerp(tB.set(b.look[0], b.look[1], b.look[2]), t);
      }
      var chipCtrl = new THREE.Vector3(cx(3), 2.6, 0.6), chipEnd = new THREE.Vector3(PHONE_X, 0.13, 0.35), chipPos = new THREE.Vector3(), a0 = new THREE.Vector3();
      var phoneProgress = -1, idle = { t0: 5, k: 0 };
      function resize(ctx) { camera.fov = ctx.width / ctx.height < 1.2 ? 48 : 36; camera.updateProjectionMatrix(); }
      resize(ctx);

      function update(t, dt, ctx) {
        var p = state.p;
        camAt(p);
        camera.position.copy(camPos); camera.position.y += Math.sin(t * 0.45) * 0.015;
        camera.lookAt(camLook);
        sweep.setProgress(0.12 + p * 0.5, Math.sin(t * 0.22) * 0.05);

        /* 01 Add: the water bill flies in from the mail at the left and lands on Thursday */
        var u = AB.range(p, 0.04, 0.2), eu = AB.ease.headsup(u);
        var wx = AB.lerp(cx(0) - 4.5, cx(3), eu), wy = REST_Y + Math.sin(u * Math.PI) * 0.8 + (1 - eu) * 0.6, wz = AB.lerp(1.6, 0.38, eu);
        var wyaw = (1 - eu) * 0.9, wroll = (1 - eu) * -0.3;
        /* 04 Tap: a small hop as the paid check lands */
        var tap = AB.range(p, 0.84, 0.94); if (tap > 0) { wy += Math.sin(tap * Math.PI) * 0.12; }
        setWaterPaid(p > 0.88);
        /* idle: the landed tag lifts and resettles every 8 s */
        var it = t - idle.t0; if (u >= 1 && it >= 0 && it < AB.D.slow) { var li = Math.sin((it / AB.D.slow) * Math.PI); wy += li * 0.1; wyaw += li * 0.05; }
        if (it > 8) idle.t0 = t;
        place(0, wx, wy, wz, wyaw, wroll, 1, REST_Y);
        /* the Added stamp pops beside the tag, then goes */
        var s = AB.range(p, 0.19, 0.27), sf = 1 - AB.range(p, 0.42, 0.5), ss = AB.ease.headsup(s) * sf;
        place(2, cx(3) + 0.62, REST_Y - 0.06 + (1 - AB.ease.headsup(s)) * 0.3, 0.62, -0.35, 0, Math.max(0.001, ss * 0.62), REST_Y - 0.06);
        /* 02 See: the rent stands up on Wednesday, already paid */
        var r = AB.ease.headsup(AB.range(p, 0.26, 0.4));
        e.set(-(1 - r) * Math.PI / 2 * 0.98, 0.03, 0); q.setFromEuler(e); v3.set(cx(2), 0.04 + r * (REST_Y - 0.04), 0.38); s3.set(1, 1, 1); m4.compose(v3, q, s3); tags.setMatrixAt(1, m4);
        e.set(0, 0.03, 0); q.setFromEuler(e); v3.set(cx(2), 0.041, 0.38); s3.set(0.95 * r, 1, 0.55 * r + 0.001); m4.compose(v3, q, s3); shadows.setMatrixAt(1, m4);
        tags.instanceMatrix.needsUpdate = true; shadows.instanceMatrix.needsUpdate = true;
        /* 03 Heads-up: the chip lifts from Monday and flies into the phone */
        var b = AB.range(p, 0.46, 0.74);
        if (b <= 0) { chip.position.copy(chipStart); chip.rotation.set(-Math.PI / 2, 0, 0); chipMat.opacity = 1; chip.scale.setScalar(1); chipShadow.material.opacity = 1; }
        else {
          var lift = AB.range(b, 0, 0.22), le = AB.ease.headsup(lift);
          if (b < 0.22) { chip.position.set(chipStart.x, chipStart.y + le * 0.7, chipStart.z); chip.rotation.set(-Math.PI / 2 + le * 0.9, 0, 0); }
          else {
            var f = AB.range(b, 0.22, 0.94), fe = AB.ease.pageturn(f);
            a0.set(chipStart.x, chipStart.y + 0.7, chipStart.z);
            chipPos.x = (1 - fe) * (1 - fe) * a0.x + 2 * (1 - fe) * fe * chipCtrl.x + fe * fe * chipEnd.x;
            chipPos.y = (1 - fe) * (1 - fe) * a0.y + 2 * (1 - fe) * fe * chipCtrl.y + fe * fe * chipEnd.y;
            chipPos.z = (1 - fe) * (1 - fe) * a0.z + 2 * (1 - fe) * fe * chipCtrl.z + fe * fe * chipEnd.z;
            chip.position.copy(chipPos); chip.rotation.set(-Math.PI / 2 + 0.9 - fe * 0.9, -fe * 0.3, fe * 0.2); chip.scale.setScalar(1 - fe * 0.4);
            chipMat.opacity = 1 - AB.range(b, 0.88, 1);
          }
          chipShadow.material.opacity = 1 - AB.range(b, 0, 0.3);
        }
        var pp = AB.range(p, 0.66, 0.8);
        if (Math.abs(pp - phoneProgress) > 0.01 || (pp === 0 && phoneProgress !== 0) || (pp === 1 && phoneProgress !== 1)) { phoneProgress = pp; screenTex.draw(AB.ease.headsup(pp)); }
        glow.material.opacity = 0.06 + Math.sin(t * 1.3) * 0.03 + pp * 0.16;
        return true;
      }
      return { update: update, resize: resize, dispose: function () {} };
    }
  }).then(function (ctl) {
    if (!ctl) { var w = doc.getElementById('hiw-week'); if (w) { w.hidden = false; w.classList.add('is-landed'); } return; }
    if (hint) hint.classList.add('is-on');
    if (!window.gsap || !window.ScrollTrigger) return;
    var hero = mount.closest('.hiw-hero') || mount;
    var proxy = { p: 0 };
    gsap.to(proxy, {
      p: 1, ease: 'none',
      scrollTrigger: {
        trigger: hero, start: 'top top', end: 'bottom 18%', scrub: 0.8, invalidateOnRefresh: true,
        onUpdate: function (st) { if (hint && st.progress > 0.04) hint.classList.remove('is-on'); },
        onRefresh: function (st) { AB.qa.arc(st.start, st.end, 'The week walk'); }
      },
      onUpdate: function () { state.p = proxy.p; }
    });
    window.__hiwState = state;
  });
})();
