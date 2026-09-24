/* Addabill scene-lite.js. The shared factory for every page's Three.js scene.
   One lazy canvas per page, pixel ratio capped (1.5 desktop, 1 touch), paused offscreen and
   on hidden tabs, torn down on navigation, reduced motion renders nothing and shows a poster
   or the settled DOM. Three.js r128 and RGBELoader are loaded from /assets/vendor on demand.
   Helpers build the kit in 3D: the month atlas and instanced day cells, standing paper tags,
   contact shadows, the light sweep, a phone screen texture, a rounded box.
   Exposed as window.SceneLite. See BUILD_GUIDE.md for the page contract. */
(function () {
  'use strict';
  var doc = document, AB = window.AB || { motion: { rm: false, touch: false } };
  var threePromise = null, envCache = {};
  var SL = window.SceneLite = { active: null, version: 1 };

  SL.loadThree = function () {
    if (window.THREE && window.THREE.RGBELoader) return Promise.resolve(window.THREE);
    if (threePromise) return threePromise;
    var load = function (src) { return new Promise(function (res, rej) { var s = doc.createElement('script'); s.src = src; s.async = true; s.onload = res; s.onerror = rej; doc.head.appendChild(s); }); };
    threePromise = (window.THREE ? Promise.resolve() : load('/assets/vendor/three.min.js'))
      .then(function () { return window.THREE.RGBELoader ? null : load('/assets/vendor/RGBELoader.js'); })
      .then(function () { return window.THREE; });
    return threePromise;
  };

  SL.loadEnv = function (THREE, renderer, url) {
    if (envCache[url]) return Promise.resolve(envCache[url]);
    return new Promise(function (res) {
      var pmrem = new THREE.PMREMGenerator(renderer); pmrem.compileEquirectangularShader();
      new THREE.RGBELoader().setDataType(THREE.UnsignedByteType).load(url, function (tex) {
        var env = pmrem.fromEquirectangular(tex).texture; tex.dispose(); pmrem.dispose(); envCache[url] = env; res(env);
      }, undefined, function () { pmrem.dispose(); res(null); });
    });
  };

  /* create(opts): mount, poster, settled (selector or element), env, dpr, shadow, alpha,
     setup(ctx) -> { update(t, dt, ctx), resize(ctx), dispose() }. Returns a promise of the controller
     (null when reduced motion or WebGL is unavailable: the poster or settled DOM is shown). */
  SL.create = function (opts) {
    var mount = typeof opts.mount === 'string' ? doc.querySelector(opts.mount) : opts.mount;
    if (!mount) return Promise.resolve(null);
    function showStatic(reason) {
      mount.classList.add('is-static'); mount.dataset.static = reason || 'static';
      if (opts.poster) { mount.style.backgroundImage = 'url("' + opts.poster + '")'; mount.style.backgroundSize = 'cover'; mount.style.backgroundPosition = 'center'; }
      var settled = typeof opts.settled === 'string' ? doc.querySelector(opts.settled) : opts.settled;
      if (settled) settled.hidden = false;
      if (opts.onStatic) opts.onStatic(reason);
      return null;
    }
    if (AB.motion.rm) return Promise.resolve(showStatic('reduced-motion'));
    if (SL.active) SL.active.dispose();
    var touch = AB.motion.touch;
    return SL.loadThree().then(function (THREE) {
      var renderer;
      try { renderer = new THREE.WebGLRenderer({ antialias: !touch, alpha: opts.alpha !== false, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.preserve }); }
      catch (e) { return showStatic('no-webgl'); }
      var dprCap = touch ? (opts.dpr && opts.dpr.touch) || 1 : (opts.dpr && opts.dpr.desktop) || 1.5;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
      renderer.shadowMap.enabled = opts.shadows !== false;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = opts.toneMapping === 'none' ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = opts.exposure || 1.0;
      renderer.physicallyCorrectLights = false;
      if (opts.alpha !== false) renderer.setClearColor(0x000000, 0);
      var canvas = renderer.domElement; canvas.className = 'scene-canvas'; canvas.setAttribute('aria-hidden', 'true');
      mount.appendChild(canvas); mount.classList.add('has-scene');
      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(opts.fov || 40, 1, 0.1, 100);
      var ctx = { THREE: THREE, renderer: renderer, scene: scene, camera: camera, mount: mount, width: 1, height: 1, dpr: renderer.getPixelRatio(), isTouch: touch, env: null, shadowSize: touch ? (opts.shadow && opts.shadow.touch) || 512 : (opts.shadow && opts.shadow.desktop) || 1024, time: 0 };
      var hooks = null, running = false, visible = true, raf = 0, last = 0, disposed = false, needs = true, frames = 0;
      function size() {
        var w = mount.clientWidth || 1, h = mount.clientHeight || 1;
        ctx.width = w; ctx.height = h; renderer.setSize(w, h, false);
        canvas.style.width = '100%'; canvas.style.height = '100%';
        camera.aspect = w / h; camera.updateProjectionMatrix();
        if (hooks && hooks.resize) hooks.resize(ctx);
        needs = true;
      }
      function frame(now) {
        raf = 0;
        if (!running || disposed) return;
        var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now; ctx.time += dt;
        if (hooks && hooks.update) { var r = hooks.update(ctx.time, dt, ctx); if (r !== false) needs = true; }
        if (needs) { renderer.render(scene, camera); needs = false; }
        frames++;
        raf = requestAnimationFrame(frame);
      }
      var ctl = {
        ctx: ctx, THREE: THREE, renderer: renderer, scene: scene, camera: camera, mount: mount,
        start: function () { if (running || disposed) return; running = true; last = 0; if (!raf) raf = requestAnimationFrame(frame); },
        stop: function () { running = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } },
        invalidate: function () { needs = true; },
        stats: function () { return { running: running, visible: visible, frames: frames, hidden: doc.hidden, time: ctx.time }; },
        render: function () { renderer.render(scene, camera); },
        resize: size,
        project: function (v3) { var v = v3.clone().project(camera); return { x: (v.x + 1) / 2 * ctx.width, y: (1 - v.y) / 2 * ctx.height, z: v.z }; },
        snapshot: function () { try { renderer.render(scene, camera); return canvas.toDataURL('image/png'); } catch (e) { return null; } },
        dispose: function () {
          if (disposed) return; disposed = true; ctl.stop();
          if (hooks && hooks.dispose) hooks.dispose(ctx);
          scene.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) { var m = Array.isArray(o.material) ? o.material : [o.material]; m.forEach(function (mm) { for (var k in mm) { if (mm[k] && mm[k].isTexture) mm[k].dispose(); } mm.dispose(); }); } });
          renderer.dispose(); if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
          if (SL.active === ctl) SL.active = null;
          ro && ro.disconnect(); io && io.disconnect();
        }
      };
      SL.active = ctl;
      var ro = 'ResizeObserver' in window ? new ResizeObserver(function () { size(); }) : null;
      if (ro) ro.observe(mount); else window.addEventListener('resize', size);
      var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (en) { visible = en[en.length - 1].isIntersecting; if (visible && !doc.hidden) ctl.start(); else ctl.stop(); }, { threshold: 0 }) : null;
      if (io) io.observe(mount);
      doc.addEventListener('visibilitychange', function () { if (doc.hidden) ctl.stop(); else if (visible) ctl.start(); });
      window.addEventListener('pagehide', function () { ctl.dispose(); }, { once: true });
      size();
      var envP = opts.env ? SL.loadEnv(THREE, renderer, opts.env) : Promise.resolve(null);
      return envP.then(function (env) {
        if (disposed) return null;
        ctx.env = env; if (env) scene.environment = env;
        hooks = opts.setup ? (opts.setup(ctx, ctl) || {}) : {};
        size();
        if (opts.autoStart !== false && visible && !doc.hidden) ctl.start();
        return ctl;
      });
    }).catch(function (e) { console.warn('SceneLite: falling back to the static poster.', e); return showStatic('load-failed'); });
  };

  /* ---- helpers (the kit in 3D) --------------------------------------------- */
  var H = SL.helpers = {};
  H.COL = { cream: 0xFAF3E6, paper: 0xFFFFFF, oat: 0xEDE2CF, graphite: 0x2B2622, shadow: 0x6B6058, marigold: 0xE9A825, moss: 0x3F6B4B };

  /* Per instance UV region so one InstancedMesh can show a different atlas cell per instance.
     Adds attributes uvOffset (x, y, w, h) and uvMode (1 = use the offset, 0 = keep the geometry uv). */
  H.atlasMaterial = function (THREE, params) {
    var m = new THREE.MeshStandardMaterial(params);
    m.onBeforeCompile = function (shader) {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec4 uvOffset;\nattribute float uvMode;')
        .replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_UV\nvUv = mix(vUv, vUv * uvOffset.zw + uvOffset.xy, uvMode);\n#endif');
    };
    m.customProgramCacheKey = function () { return 'ab-atlas-' + (params.map ? 'map' : 'nomap'); };
    return m;
  };
  H.addAtlasAttributes = function (THREE, geometry, count, regions, modeForVertex) {
    var off = new Float32Array(count * 4);
    for (var i = 0; i < count; i++) { var r = regions(i); off[i * 4] = r[0]; off[i * 4 + 1] = r[1]; off[i * 4 + 2] = r[2]; off[i * 4 + 3] = r[3]; }
    geometry.setAttribute('uvOffset', new THREE.InstancedBufferAttribute(off, 4));
    var n = geometry.attributes.position.count, mode = new Float32Array(n);
    for (var v = 0; v < n; v++) mode[v] = modeForVertex ? modeForVertex(v, geometry) : 1;
    geometry.setAttribute('uvMode', new THREE.BufferAttribute(mode, 1));
    return geometry;
  };

  /* The month atlas: cols x rows day cells drawn to one canvas. cells[i] = { label, dim, today, paidCheck } */
  H.monthAtlas = function (THREE, opts) {
    var cols = opts.cols || 7, rows = opts.rows || 5, S = opts.cell || 256, c = doc.createElement('canvas');
    c.width = cols * S; c.height = rows * S; var g = c.getContext('2d');
    var ui = "600 " + Math.round(S * 0.17) + "px Figtree, system-ui, sans-serif";
    for (var i = 0; i < cols * rows; i++) {
      var cell = opts.cells[i] || {}, x = (i % cols) * S, y = Math.floor(i / cols) * S;
      g.fillStyle = cell.dim ? '#F3EBDD' : '#FFFFFF'; g.fillRect(x, y, S, S);
      g.strokeStyle = cell.dim ? 'rgba(43,38,34,0.16)' : 'rgba(43,38,34,0.34)'; g.lineWidth = Math.max(2, S * 0.014);
      g.strokeRect(x + g.lineWidth / 2, y + g.lineWidth / 2, S - g.lineWidth, S - g.lineWidth);
      if (cell.label != null) { g.fillStyle = cell.dim ? 'rgba(107,96,88,0.55)' : '#2B2622'; g.font = ui; g.textBaseline = 'top'; g.textAlign = 'left'; g.fillText(String(cell.label), x + S * 0.1, y + S * 0.1); }
      if (cell.today) { g.fillStyle = '#E9A825'; var tw = S * 0.05, th = S * 0.16; roundRect(g, x + S - S * 0.1 - tw, y + S * 0.1, tw, th, tw / 2); g.fill(); }
      if (cell.paid) { g.strokeStyle = '#3F6B4B'; g.lineWidth = S * 0.02; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + S * 0.7, y + S * 0.19); g.lineTo(x + S * 0.76, y + S * 0.25); g.lineTo(x + S * 0.88, y + S * 0.12); g.stroke(); }
    }
    var tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4; tex.flipY = true;
    /* regions are measured from the bottom of the canvas (flipY true), so row 0 sits at v 0.8 to 1 */
    return { texture: tex, canvas: c, region: function (i) { return [(i % cols) / cols, 1 - (Math.floor(i / cols) + 1) / rows, 1 / cols, 1 / rows]; } };
  };
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  H.roundRect = roundRect;

  /* The tag atlas: N label regions plus a white region and an ink region. labels[i] = { text, paid } */
  H.tagAtlas = function (THREE, labels, opts) {
    opts = opts || {}; var W = opts.w || 320, Hh = opts.h || 176, n = labels.length + 2, c = doc.createElement('canvas');
    c.width = W; c.height = Hh * n; var g = c.getContext('2d');
    for (var i = 0; i < n; i++) {
      var y = i * Hh;
      if (i === labels.length) { g.fillStyle = '#FFFFFF'; g.fillRect(0, y, W, Hh); continue; }
      if (i === labels.length + 1) { g.fillStyle = '#2B2622'; g.fillRect(0, y, W, Hh); continue; }
      var l = labels[i];
      g.fillStyle = '#FFFFFF'; g.fillRect(0, y, W, Hh);
      g.fillStyle = l.paid ? 'rgba(43,38,34,0.42)' : '#2B2622'; g.fillRect(0, y, W, Math.round(Hh * 0.075));
      g.strokeStyle = 'rgba(43,38,34,0.35)'; g.lineWidth = 3; g.strokeRect(1.5, y + 1.5, W - 3, Hh - 3);
      g.fillStyle = l.paid ? '#6B6058' : '#2B2622'; g.font = '600 ' + Math.round(Hh * 0.27) + 'px Figtree, system-ui, sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'left';
      var words = String(l.text).split(' '), lines = [], cur = '';
      words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > W - 40 && cur) { lines.push(cur); cur = w; } else cur = t; }); lines.push(cur);
      var lh = Hh * 0.3, y0 = y + Hh * 0.55 - (lines.length - 1) * lh / 2;
      lines.forEach(function (t, k) { g.fillText(t, 20, y0 + k * lh); });
      if (l.paid) { g.strokeStyle = '#3F6B4B'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(W - 64, y + Hh * 0.55); g.lineTo(W - 50, y + Hh * 0.68); g.lineTo(W - 26, y + Hh * 0.4); g.stroke(); }
    }
    var tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
    var reg = function (i) { return [0, 1 - (i + 1) / n, 1, 1 / n]; };
    return { texture: tex, canvas: c, region: reg, white: reg(labels.length), ink: reg(labels.length + 1), count: n };
  };

  /* Instanced day cells: thin paper slabs laid on the counter. layout(i) -> { x, z, y } */
  H.dayCells = function (THREE, atlas, count, layout, opts) {
    opts = opts || {}; var size = opts.size || 0.94, thick = opts.thick || 0.03;
    var geo = new THREE.BoxGeometry(size, thick, size);
    /* map only the top face (+y, vertices 8..11) to the atlas cell; other faces use the white corner */
    var uv = geo.attributes.uv, mode = new Float32Array(uv.count);
    for (var v = 0; v < uv.count; v++) { var top = v >= 8 && v <= 11; mode[v] = top ? 1 : 0; if (!top) { uv.setXY(v, 0.02, 0.98); } }
    var off = new Float32Array(count * 4);
    for (var i = 0; i < count; i++) { var r = atlas.region(i); off.set(r, i * 4); }
    geo.setAttribute('uvOffset', new THREE.InstancedBufferAttribute(off, 4));
    geo.setAttribute('uvMode', new THREE.BufferAttribute(mode, 1));
    var mat = H.atlasMaterial(THREE, { map: atlas.texture, roughness: 0.92, metalness: 0, envMapIntensity: opts.envIntensity || 0.6 });
    var mesh = new THREE.InstancedMesh(geo, mat, count);
    var m = new THREE.Matrix4();
    for (var k = 0; k < count; k++) { var p = layout(k); m.makeTranslation(p.x, p.y != null ? p.y : thick / 2, p.z); mesh.setMatrixAt(k, m); }
    mesh.instanceMatrix.needsUpdate = true; mesh.receiveShadow = true; mesh.castShadow = false;
    return mesh;
  };

  /* Standing paper tags: white slabs with the ink stripe on the front and an inked top edge. */
  H.standingTags = function (THREE, atlas, count, opts) {
    opts = opts || {}; var w = opts.w || 0.64, h = opts.h || 0.36, d = opts.d || 0.022;
    var geo = new THREE.BoxGeometry(w, h, d);
    var uv = geo.attributes.uv, mode = new Float32Array(uv.count);
    /* BoxGeometry face order: px(0-3) nx(4-7) py(8-11) ny(12-15) pz(16-19) nz(20-23). Front = pz. */
    for (var v = 0; v < uv.count; v++) {
      var front = v >= 16 && v <= 19, top = v >= 8 && v <= 11, back = v >= 20;
      if (front || back) mode[v] = 1; else { mode[v] = 0; var r = top ? atlas.ink : atlas.white; uv.setXY(v, r[0] + r[2] * 0.5, r[1] + r[3] * 0.5); }
    }
    var off = new Float32Array(count * 4);
    for (var i = 0; i < count; i++) off.set(atlas.region(i), i * 4);
    geo.setAttribute('uvOffset', new THREE.InstancedBufferAttribute(off, 4));
    geo.setAttribute('uvMode', new THREE.BufferAttribute(mode, 1));
    var mat = H.atlasMaterial(THREE, { map: atlas.texture, roughness: 0.85, metalness: 0, envMapIntensity: opts.envIntensity || 0.7 });
    var mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData.size = { w: w, h: h, d: d };
    return mesh;
  };

  /* Soft contact shadows under standing things: instanced transparent planes with a radial gradient. */
  H.contactShadows = function (THREE, count, opts) {
    opts = opts || {}; var c = doc.createElement('canvas'); c.width = c.height = 128; var g = c.getContext('2d');
    var grd = g.createRadialGradient(64, 64, 4, 64, 64, 62); grd.addColorStop(0, 'rgba(43,38,34,' + (opts.alpha || 0.28) + ')'); grd.addColorStop(0.55, 'rgba(43,38,34,' + ((opts.alpha || 0.28) * 0.35) + ')'); grd.addColorStop(1, 'rgba(43,38,34,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    var tex = new THREE.CanvasTexture(c);
    var geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
    var mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 1 });
    var mesh = new THREE.InstancedMesh(geo, mat, count); mesh.renderOrder = 1;
    return mesh;
  };

  /* The light sweep: one shadow casting DirectionalLight travelling from low east to high south,
     cool early light warming to golden. setProgress(p, drift) positions it. */
  H.lightSweep = function (THREE, scene, opts) {
    opts = opts || {}; var size = opts.mapSize || 1024, span = opts.span || 5.5;
    var light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.castShadow = true; light.shadow.mapSize.set(size, size);
    light.shadow.camera.left = -span; light.shadow.camera.right = span; light.shadow.camera.top = span; light.shadow.camera.bottom = -span;
    light.shadow.camera.near = 0.5; light.shadow.camera.far = 40; light.shadow.bias = -0.0008; light.shadow.normalBias = 0.02; light.shadow.radius = 3;
    var target = new THREE.Object3D(); target.position.set(0, 0, 0); scene.add(target); light.target = target; scene.add(light);
    var cool = new THREE.Color(0xE2E8F2), gold = new THREE.Color(0xFFF2E2), col = new THREE.Color();
    var fill = new THREE.HemisphereLight(0xFFF6E6, 0xEDE2CF, opts.fill != null ? opts.fill : 0.55); scene.add(fill);
    var api = {
      light: light, fill: fill, azimuth: 0, elevation: 0,
      setProgress: function (p, drift) {
        drift = drift || 0;
        var az = THREE.MathUtils.lerp(0.35, 1.45, p) + drift;        /* radians around +y, from the east side toward the south */
        var el = THREE.MathUtils.lerp(0.22, 1.05, p) + drift * 0.4;  /* low to high */
        var r = 14;
        light.position.set(Math.cos(az) * Math.cos(el) * r, Math.sin(el) * r, Math.sin(az) * Math.cos(el) * r);
        col.copy(cool).lerp(gold, Math.min(1, p * 1.15)); light.color.copy(col);
        light.intensity = THREE.MathUtils.lerp(opts.intensity ? opts.intensity[0] : 1.0, opts.intensity ? opts.intensity[1] : 1.35, p);
        api.azimuth = az; api.elevation = el;
      }
    };
    api.setProgress(0, 0);
    return api;
  };

  /* A phone screen texture: cream screen with the Addabill header and the reminder as a bubble.
     draw(progress) redraws with the bubble sliding in; progress 0 shows the lock screen line. */
  H.phoneScreen = function (THREE, opts) {
    var W = 384, Hh = 832, c = doc.createElement('canvas'); c.width = W; c.height = Hh; var g = c.getContext('2d');
    var tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding;
    var lines = opts.lines || ['Addabill: Water bill, $64.20, due Thu Oct 2.', 'Tap to open your utility\'s payment page:', '[link]. Reply HELP for help, STOP to cancel.'];
    function wrap(text, maxW, font) { g.font = font; var words = text.split(' '), out = [], cur = ''; words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; }); out.push(cur); return out; }
    function draw(p) {
      p = Math.max(0, Math.min(1, p));
      g.fillStyle = '#FAF3E6'; g.fillRect(0, 0, W, Hh);
      g.fillStyle = '#2B2622'; g.font = '600 26px Figtree, system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'top';
      g.fillText('7:40', 34, 28);
      g.font = '600 20px Fraunces, Georgia, serif'; g.fillStyle = '#2B2622'; g.fillText('Addabill', 34, 84);
      g.fillStyle = 'rgba(43,38,34,0.18)'; g.fillRect(34, 120, W - 68, 2);
      g.font = '500 20px Figtree, system-ui, sans-serif'; g.fillStyle = '#6B6058'; g.fillText('Thursday, October 2', 34, 138);
      if (p > 0.02) {
        var text = lines.join(' '), font = '500 22px Figtree, system-ui, sans-serif', ls = wrap(text, W - 68 - 44, font), lh = 30, bh = ls.length * lh + 44, bw = W - 68;
        var x = 34 + (1 - p) * (W * 0.9), y = 190;
        g.save(); g.globalAlpha = Math.min(1, p * 1.4);
        g.shadowColor = 'rgba(43,38,34,0.18)'; g.shadowBlur = 24; g.shadowOffsetY = 8; g.fillStyle = '#FFFFFF'; roundRect(g, x, y, bw, bh, 22); g.fill(); g.shadowColor = 'transparent';
        g.fillStyle = '#E9A825'; roundRect(g, x + 22, y + 22, 6, 18, 3); g.fill();
        g.fillStyle = '#2B2622'; g.font = font; g.textBaseline = 'top';
        ls.forEach(function (t, i) { g.fillText(t, x + 22, y + 48 + i * lh); });
        g.restore();
        if (p > 0.6) { g.fillStyle = '#6B6058'; g.font = '500 18px Figtree, system-ui, sans-serif'; g.fillText('Text 1 of 3 for this bill', 34, y + bh + 18); }
      }
      g.fillStyle = 'rgba(43,38,34,0.35)'; roundRect(g, W / 2 - 60, Hh - 26, 120, 6, 3); g.fill();
      tex.needsUpdate = true;
    }
    draw(0);
    return { texture: tex, draw: draw, canvas: c, width: W, height: Hh };
  };

  H.roundedBox = function (THREE, w, h, d, r) {
    var s = new THREE.Shape(); var x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    var geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: Math.min(0.02, d * 0.3), bevelSize: Math.min(0.02, r * 0.5), bevelSegments: 2, curveSegments: 8 });
    geo.translate(0, 0, -d / 2);
    return geo;
  };

  /* A texture from an image url with the cream fallback color (the counter). */
  H.loadTexture = function (THREE, url, onDone) {
    var loader = new THREE.TextureLoader();
    return loader.load(url, function (t) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; if (onDone) onDone(t); }, undefined, function () { if (onDone) onDone(null); });
  };
})();
