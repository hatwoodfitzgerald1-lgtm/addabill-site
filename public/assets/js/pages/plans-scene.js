/* Addabill Plans scene: two small standing months side by side. Free (one person, 5 tags) on the
   left and Household (five people, 14 tags with initials) on the right. The camera slides
   laterally from Free to Household as the second month fills, then both tilt flat on the counter
   as the price cards dock. Scrubbed to scroll, never pinned. On /cart the same scene sits dimmed
   behind the cart, settled and idling. Mobile and reduced motion use the DOM months instead.
   Loaded lazily by core.js after first paint (the page JSON "scene" field). */
(function () {
  'use strict';
  var AB = window.AB, doc = document;
  if (!AB || !window.SceneLite) return;
  var mount = doc.getElementById('plans-scene') || doc.getElementById('cart-scene');
  var domMonths = doc.getElementById('plans-months-dom');
  if (!mount) return;
  var isCart = mount.id === 'cart-scene';
  var STAND = 1.12;

  var FREE_BILLS = [{ name: 'Rent', day: 1 }, { name: 'Water bill', day: 2 }, { name: 'Internet', day: 6 }, { name: 'Phone plan', day: 10 }, { name: 'Electric', day: 15 }];
  var HOUSE_BILLS = [
    { name: 'Rent', day: 1, initial: 'M' }, { name: 'Water bill', day: 2, initial: 'M' }, { name: 'Internet', day: 6, initial: 'J' }, { name: 'Lawn service', day: 8, initial: 'R' },
    { name: 'Phone plan', day: 10, initial: 'A' }, { name: 'HOA', day: 12, initial: 'M' }, { name: 'Gym', day: 13, initial: 'S' }, { name: 'Electric', day: 15, initial: 'M' },
    { name: 'Streaming', day: 17, initial: 'J' }, { name: 'Gas', day: 20, initial: 'M' }, { name: 'Car insurance', day: 21, initial: 'R' }, { name: 'Trash pickup', day: 24, initial: 'A' },
    { name: 'Dentist', day: 28, initial: 'S' }, { name: 'Orthodontist', day: 30, initial: 'J' }
  ];

  function domFallback(settled) {
    if (!domMonths) return;
    domMonths.hidden = false;
    if (settled || AB.motion.rm || !window.gsap || !window.ScrollTrigger) { domMonths.classList.add('is-settled'); return; }
    /* mobile: the two DOM months tilt from standing to flat as the visitor scrolls past them */
    var stage = domMonths;
    var months = AB.$$('.dom-month', stage);
    gsap.set(months, { rotateX: 32 });
    ScrollTrigger.create({
      trigger: stage, start: 'top 80%', end: 'bottom 30%', scrub: 0.8,
      onUpdate: function (st) { gsap.set(months, { rotateX: 32 * (1 - AB.smooth(st.progress)) }); },
      onRefresh: function (st) { AB.qa.arc(st.start, st.end, 'Plans DOM months tilt'); }
    });
  }

  if (AB.motion.mobileHero) { domFallback(isCart); return; }
  if (AB.motion.rm) { window.SceneLite.create({ mount: mount, settled: domMonths }); if (domMonths) domMonths.classList.add('is-settled'); return; }

  AB.loadScript('/assets/js/pages/month-kit.js').then(function () {
    var K = window.ABMonthKit; if (!K) return;
    var state = { p: isCart ? 1 : 0 };
    window.SceneLite.create({
      mount: mount, env: '/assets/hdri-interior-512.hdr', fov: 36, toneMapping: 'none',
      dpr: { desktop: 1.5, touch: 1 }, shadow: { desktop: 1024, touch: 512 }, settled: domMonths,
      setup: function (ctx, ctl) {
        var THREE = ctx.THREE, H = window.SceneLite.helpers, scene = ctx.scene, camera = ctx.camera;
        scene.fog = new THREE.Fog(0xFAF3E6, 9, 22);
        K.counter(THREE, scene, 60);
        var spec = { title: 'October', firstDow: 3, daysInMonth: 31, prevDays: 30, today: 2, rows: 5, pitch: 0.5 };
        var free = K.build(THREE, H, Object.assign({ bills: FREE_BILLS }, spec));
        var house = K.build(THREE, H, Object.assign({ bills: HOUSE_BILLS }, spec));
        var GAP = 4.7;
        var pivots = [free, house].map(function (m, i) {
          var pv = new THREE.Group(); pv.position.set(i === 0 ? -GAP / 2 : GAP / 2, 0, 0.9);
          m.group.position.z = -m.near; pv.add(m.group); scene.add(pv); return pv;
        });
        var sweep = H.lightSweep(THREE, scene, { mapSize: ctx.shadowSize, span: 6, fill: 0.44, intensity: [1.0, 1.12] });
        var freeC = { x: -GAP / 2, z: 0.9 - free.depth * 0.5 }, houseC = { x: GAP / 2, z: 0.9 - house.depth * 0.5 };
        var standH = free.depth * Math.sin(STAND);
        var KEYS = [
          { p: 0.0, pos: [freeC.x, standH * 0.64, 8.1], look: [freeC.x, standH * 0.5, 0.15] },
          { p: 0.5, pos: [houseC.x, standH * 0.64, 8.1], look: [houseC.x, standH * 0.5, 0.15] },
          { p: 0.74, pos: [houseC.x * 0.35, 4.8, 7.6], look: [houseC.x * 0.25, 0.9, 0.0] },
          { p: 1.0, pos: [0, 8.6, 5.4], look: [0, 0.1, -0.55] }
        ];
        if (isCart) { KEYS = [{ p: 0, pos: [0.4, 9.2, 6.2], look: [0.4, 0.1, -2.6] }, { p: 1, pos: [0.4, 9.2, 6.2], look: [0.4, 0.1, -2.6] }]; }
        var cam = K.camPath(THREE, KEYS, AB.smooth);
        var enter = HOUSE_BILLS.map(function (b, k) { var s = 0.1 + k * 0.03; return { s: s, e: s + 0.15 }; });
        var idle = { liftT0: 5, index: 1, cursor: 0 };
        var caps = [doc.getElementById('plans-cap-free'), doc.getElementById('plans-cap-house')];
        var capAnchor = [new THREE.Vector3(freeC.x, 0.02, 0.9 + 0.55), new THREE.Vector3(houseC.x, 0.02, 0.9 + 0.55)];
        function tagsOf(m, u, t, from) {
          for (var k = 0; k < m.bills.length; k++) {
            var h = m.tagHome[k], uu = u ? u(k) : 1, eu = AB.ease.headsup(uu);
            var x = AB.lerp(h.x + (from || 0), h.x, eu), y = h.y + (1 - eu) * 1.1 + Math.sin(uu * Math.PI) * 0.25, z = h.z;
            var yaw = h.yaw + (1 - eu) * 0.6, roll = (1 - eu) * 0.3;
            if (uu >= 1 && k === idle.index && m === house) { var it = t - idle.liftT0; if (it >= 0 && it < AB.D.slow) { var li = Math.sin((it / AB.D.slow) * Math.PI); y += li * 0.07; yaw += li * 0.05; } }
            var lean = -pivots[0].rotation.x * 0.86;
            m.placeTag(k, x, y, z, yaw, roll, lean, uu <= 0 ? 0.0001 : 1);
          }
          m.commit();
        }
        function update(t, dt, ctx) {
          var p = state.p;
          cam.at(p);
          /* wider bands (1920, 2560) bring the camera in so the months keep their size in the frame */
          var aspect = ctx.width / Math.max(1, ctx.height), f = AB.clamp(2.5 / aspect, 0.78, 1);
          camera.position.copy(cam.look).lerp(cam.pos, f); camera.position.y += Math.sin(t * 0.4) * 0.015; camera.lookAt(cam.look);
          var stand = STAND * (1 - AB.smooth(AB.range(p, 0.66, 1)));
          pivots[0].rotation.x = stand; pivots[1].rotation.x = stand;
          sweep.setProgress(0.15 + p * 0.5, Math.sin(t * 0.2) * 0.05);
          tagsOf(free, null, t, 0);
          tagsOf(house, function (k) { return AB.range(p, enter[k].s, enter[k].e); }, t, 3.2);
          if (t - idle.liftT0 > 8) { idle.liftT0 = t; var landed = []; for (var j = 0; j < HOUSE_BILLS.length; j++) if (p >= enter[j].e) landed.push(j); idle.index = landed.length ? landed[(idle.cursor++) % landed.length] : -1; }
          for (var c = 0; c < 2; c++) {
            if (!caps[c]) continue;
            var pr = ctl.project(capAnchor[c]);
            caps[c].style.transform = 'translate(-50%, 0) translate(' + pr.x.toFixed(1) + 'px,' + pr.y.toFixed(1) + 'px)';
            caps[c].style.opacity = pr.z < 1 ? '1' : '0';
          }
          return true;
        }
        return { update: update, dispose: function () {} };
      }
    }).then(function (ctl) {
      if (!ctl) { domFallback(true); return; }
      mount.classList.add('is-live');
      if (isCart || !window.gsap || !window.ScrollTrigger) return;
      var dock = doc.getElementById('plans-cards') || mount;
      var proxy = { p: 0 };
      gsap.to(proxy, {
        p: 1, ease: 'none',
        scrollTrigger: {
          trigger: mount, start: function () { return 0; },
          end: function () { var r = dock.getBoundingClientRect(); return Math.max(240, r.top + window.scrollY - window.innerHeight * 0.4); },
          scrub: 0.8, invalidateOnRefresh: true,
          onRefresh: function (st) { AB.qa.arc(st.start, st.end, 'Plans months (Free to Household, then flat)'); }
        },
        onUpdate: function () { state.p = proxy.p; }
      });
    });
  }).catch(function () { domFallback(true); });
})();
