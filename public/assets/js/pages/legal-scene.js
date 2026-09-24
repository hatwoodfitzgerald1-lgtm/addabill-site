/* Terms of Service and Privacy Policy scene (lightweight): a dimmed month lying in the page header,
   today marked with the marigold tick, one very slow light crossing it, the camera rising a little as
   the header scrolls away. Loaded after first paint by core.js; no WebGL on mobile (the settled DOM
   month from legal.js takes over) and none under reduced motion. */
(function () {
  'use strict';
  var AB = window.AB, doc = document, SL = window.SceneLite;
  if (!AB || !SL) return;
  var mount = doc.getElementById('legal-scene'), monthEl = doc.getElementById('legal-month');
  if (!mount) return;
  if (AB.motion.mobileHero || AB.motion.rm) { if (monthEl && window.__legalRenderMonth) { window.__legalRenderMonth(monthEl); monthEl.hidden = false; } return; }

  var now = new Date(), Y = now.getFullYear(), M = now.getMonth(), TODAY = now.getDate();
  var FIRST = new Date(Y, M, 1).getDay(), DAYS = new Date(Y, M + 1, 0).getDate();
  var COLS = 7, ROWS = Math.ceil((FIRST + DAYS) / 7), PITCH = 1.06;
  var prevDays = new Date(Y, M, 0).getDate();
  function cellLabel(i) {
    if (i < FIRST) return { label: prevDays - FIRST + 1 + i, dim: true };
    var d = i - FIRST + 1;
    if (d > DAYS) return { label: d - DAYS, dim: true };
    return { label: d, dim: d !== TODAY, today: d === TODAY };
  }
  var state = { p: 0 };

  SL.create({
    mount: mount, env: '/assets/hdri-interior-512.hdr', fov: 30, toneMapping: 'none', shadows: false,
    dpr: { desktop: 1.25, touch: 1 }, settled: '#legal-month',
    onStatic: function () { if (monthEl && window.__legalRenderMonth) { window.__legalRenderMonth(monthEl); monthEl.hidden = false; } },
    setup: function (ctx, ctl) {
      var THREE = ctx.THREE, H = SL.helpers, scene = ctx.scene, camera = ctx.camera;
      var group = new THREE.Group(); scene.add(group);
      var cells = []; for (var i = 0; i < COLS * ROWS; i++) cells.push(cellLabel(i));
      var atlas = H.monthAtlas(THREE, { cols: COLS, rows: ROWS, cell: 192, cells: cells });
      var mesh = H.dayCells(THREE, atlas, COLS * ROWS, function (i) { var c = i % COLS, r = Math.floor(i / COLS); return { x: (c - 3) * PITCH, z: (r - (ROWS - 1) / 2) * PITCH, y: 0.02 }; }, { size: 0.96, thick: 0.035, envIntensity: 0.45 });
      mesh.material.color = new THREE.Color(0xEDE6D8); /* the whole month sits a shade under paper: dimmed */
      group.add(mesh);
      /* today's tick, the one bright mark */
      var ti = FIRST + TODAY - 1, tc = ti % COLS, tr = Math.floor(ti / COLS);
      var tick = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.17), new THREE.MeshStandardMaterial({ color: 0xE9A825, roughness: 0.6, metalness: 0 }));
      tick.position.set((tc - 3) * PITCH + 0.37, 0.05, (tr - (ROWS - 1) / 2) * PITCH - 0.36); group.add(tick);
      /* a soft paper sheet under the month so it reads as one page on the counter */
      var sheet = new THREE.Mesh(new THREE.PlaneGeometry(COLS * PITCH + 0.5, ROWS * PITCH + 0.5), new THREE.MeshStandardMaterial({ color: 0xF6EEDF, roughness: 1, metalness: 0, envMapIntensity: 0.3 }));
      sheet.rotation.x = -Math.PI / 2; sheet.position.y = 0.003; group.add(sheet);
      var sweep = H.lightSweep(THREE, scene, { fill: 0.5, intensity: [0.75, 0.95] });
      sweep.light.castShadow = false;
      var look = new THREE.Vector3(0, 0, -0.2);
      function resize(ctx) {
        var aspect = ctx.width / ctx.height;
        group.position.x = AB.clamp(aspect * 1.05, 0, 4.4);
        camera.fov = aspect < 1.4 ? 40 : 30; camera.updateProjectionMatrix();
      }
      resize(ctx);
      function update(t, dt, ctx) {
        var p = state.p;
        /* a very slow light: one crossing takes about two minutes, the scroll adds a little */
        sweep.setProgress(((t * 0.0085) % 1) * 0.8 + p * 0.15, Math.sin(t * 0.15) * 0.03);
        camera.position.set(group.position.x * 0.35, 6.4 + p * 2.2 + Math.sin(t * 0.3) * 0.03, 6.2 - p * 1.6);
        look.set(group.position.x * 0.55, 0, -0.2 - p * 0.6);
        camera.lookAt(look);
        group.rotation.z = Math.sin(t * 0.12) * 0.004;
        return true;
      }
      return { update: update, resize: resize, dispose: function () {} };
    }
  }).then(function (ctl) {
    if (!ctl || !window.gsap || !window.ScrollTrigger) return;
    var hero = mount.closest('.legal-hero') || mount;
    ScrollTrigger.create({
      trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.8,
      onUpdate: function (st) { state.p = st.progress; },
      onRefresh: function (st) { AB.qa.arc(st.start, st.end, 'Legal header month'); }
    });
  });
})();
