/* Addabill Confirmation scene: this month on the counter, the camera held elevated. The new plan tag
   lands on today, then the first heads-up chip lifts from three days before and flies into the phone
   at the right edge. Time driven once the scene is in view, with a slow drift on scroll. Mobile and
   reduced motion show the DOM month instead (confirmation.js builds it). */
(function () {
  'use strict';
  var AB = window.AB, doc = document;
  if (!AB || !window.SceneLite) return;
  var mount = doc.getElementById('confirm-scene'), dom = doc.getElementById('confirm-dom');
  if (!mount) return;
  var order = window.__abOrderView || {};
  var planLabel = order.isFree ? 'Free' : 'Household';
  if (AB.motion.mobileHero || AB.motion.rm) { if (dom) { dom.hidden = false; dom.classList.add('is-settled'); } mount.classList.add('is-static'); return; }

  AB.loadScript('/assets/js/pages/month-kit.js').then(function () {
    var K = window.ABMonthKit; if (!K) return;
    var now = new Date(), y = now.getFullYear(), m = now.getMonth(), today = now.getDate();
    var firstDow = new Date(y, m, 1).getDay(), daysIn = new Date(y, m + 1, 0).getDate(), prevDays = new Date(y, m, 0).getDate();
    var rows = Math.ceil((firstDow + daysIn) / 7);
    var names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var chipDay = Math.max(1, today - 3);
    var bills = [{ name: planLabel + ' plan', day: today }];
    var state = { scroll: 0 };
    window.SceneLite.create({
      mount: mount, env: '/assets/hdri-interior-512.hdr', fov: 34, toneMapping: 'none', dpr: { desktop: 1.5, touch: 1 }, shadow: { desktop: 1024, touch: 512 }, settled: dom,
      setup: function (ctx, ctl) {
        var THREE = ctx.THREE, H = window.SceneLite.helpers, scene = ctx.scene, camera = ctx.camera;
        scene.fog = new THREE.Fog(0xFAF3E6, 10, 24);
        K.counter(THREE, scene, 60);
        var month = K.build(THREE, H, { title: names[m], firstDow: firstDow, daysInMonth: daysIn, prevDays: prevDays, today: today, rows: rows, pitch: 0.62, bills: bills });
        scene.add(month.group);
        var sweep = H.lightSweep(THREE, scene, { mapSize: ctx.shadowSize, span: 6, fill: 0.42, intensity: [1.0, 1.12] });
        /* the phone at the right edge */
        var phone = new THREE.Group();
        var body = new THREE.Mesh(H.roundedBox(THREE, 0.92, 1.9, 0.08, 0.14), new THREE.MeshStandardMaterial({ color: 0x2B2622, roughness: 0.45, metalness: 0.1, envMapIntensity: 0.9 })); body.castShadow = true; phone.add(body);
        var screenTex = H.phoneScreen(THREE, {});
        var screen = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.7), new THREE.MeshBasicMaterial({ map: screenTex.texture, toneMapped: false })); screen.position.z = 0.0625; phone.add(screen);
        var px = month.width / 2 + 1.35;
        phone.position.set(px, 0.98, -0.2); phone.rotation.set(-0.16, -0.36, 0); scene.add(phone);
        var phoneShadow = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9), new THREE.MeshBasicMaterial({ map: month.shadows.material.map, transparent: true, depthWrite: false, opacity: 0.9 })); phoneShadow.rotation.x = -Math.PI / 2; phoneShadow.position.set(px, 0.042, -0.15); scene.add(phoneShadow);
        /* the heads up chip */
        var chipCell = month.cellPos(chipDay);
        var chipMat = new THREE.MeshStandardMaterial({ color: 0xE9A825, roughness: 0.55, metalness: 0, transparent: true, opacity: 1 });
        var chip = new THREE.Mesh(H.roundedBox(THREE, 0.3, 0.14, 0.024, 0.04), chipMat); chip.rotation.x = -Math.PI / 2; chip.castShadow = true;
        var chipStart = new THREE.Vector3(chipCell.x + 0.02, chipCell.y + 0.02, chipCell.z + 0.14); chip.position.copy(chipStart); scene.add(chip);
        var chipEnd = new THREE.Vector3(px - 0.08, 1.02, -0.02), chipCtrl = new THREE.Vector3((chipStart.x + px) / 2, 2.6, -0.4), chipPos = new THREE.Vector3();
        var home = month.tagHome[0];
        var lookAt = new THREE.Vector3(0.9, 0.1, -0.2);
        var t0 = -1, phoneP = -1;
        function resize(ctx) { var aspect = ctx.width / ctx.height; camera.position.set(0.6, 6.4 + Math.max(0, 1.9 - aspect) * 2.2, 4.6); }
        resize(ctx);
        function update(t, dt, ctx) {
          if (t0 < 0) t0 = t;
          var e = t - t0;
          camera.position.x = 0.6 + Math.sin(t * 0.3) * 0.05; camera.position.y += 0; camera.lookAt(lookAt.x, lookAt.y - state.scroll * 0.6, lookAt.z);
          sweep.setProgress(0.3 + Math.sin(t * 0.15) * 0.06, 0);
          /* the plan tag lands on today between 0.4 s and 1.8 s */
          var u = AB.ease.headsup(AB.range(e, 0.4, 1.8));
          var yTag = home.y + (1 - u) * 1.6, lean = -(1 - u) * 0.5;
          month.placeTag(0, home.x, yTag, home.z, home.yaw, 0, lean, 1); month.commit();
          /* the chip lifts at 2.2 s and reaches the phone by 4.0 s */
          var b = AB.range(e, 2.2, 4.0);
          if (b <= 0) { chip.position.copy(chipStart); chip.rotation.set(-Math.PI / 2, 0, 0); chipMat.opacity = 1; chip.scale.setScalar(1); }
          else {
            var lift = AB.ease.headsup(AB.range(b, 0, 0.25));
            if (b < 0.25) { chip.position.set(chipStart.x, chipStart.y + lift * 0.6, chipStart.z); chip.rotation.set(-Math.PI / 2 + lift * 0.9, 0, 0); }
            else {
              var f = AB.ease.pageturn(AB.range(b, 0.25, 0.95));
              var ax = chipStart.x, ay = chipStart.y + 0.6, az = chipStart.z;
              chipPos.x = (1 - f) * (1 - f) * ax + 2 * (1 - f) * f * chipCtrl.x + f * f * chipEnd.x;
              chipPos.y = (1 - f) * (1 - f) * ay + 2 * (1 - f) * f * chipCtrl.y + f * f * chipEnd.y;
              chipPos.z = (1 - f) * (1 - f) * az + 2 * (1 - f) * f * chipCtrl.z + f * f * chipEnd.z;
              chip.position.copy(chipPos); chip.rotation.set(-Math.PI / 2 + 0.9 + f * 0.7, -f * 0.36, f * 0.2); chip.scale.setScalar(1 - f * 0.4);
              chipMat.opacity = 1 - AB.range(b, 0.9, 1);
            }
          }
          var pp = AB.range(e, 3.5, 4.4);
          if (Math.abs(pp - phoneP) > 0.01 || (pp === 1 && phoneP !== 1)) { phoneP = pp; screenTex.draw(AB.ease.headsup(pp)); }
          /* idle: after the flight, the tag breathes once every eight seconds */
          if (e > 5) { var it = (e - 5) % 8; if (it < AB.D.slow) { var li = Math.sin((it / AB.D.slow) * Math.PI); month.placeTag(0, home.x, home.y + li * 0.06, home.z, home.yaw + li * 0.04, 0, 0, 1); month.commit(); } }
          return true;
        }
        return { update: update, resize: resize, dispose: function () {} };
      }
    }).then(function (ctl) {
      if (!ctl) { if (dom) { dom.hidden = false; dom.classList.add('is-settled'); } return; }
      mount.classList.add('is-live');
      if (window.gsap && window.ScrollTrigger) {
        ScrollTrigger.create({ trigger: mount, start: 'top 60%', end: 'bottom top', scrub: 0.8, onUpdate: function (st) { state.scroll = st.progress; }, onRefresh: function (st) { AB.qa.arc(st.start, st.end, 'Confirmation month drift'); } });
      }
    });
  }).catch(function () { if (dom) { dom.hidden = false; dom.classList.add('is-settled'); } });
})();
