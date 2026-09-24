/* Addabill month-kit.js (store pages). A small month in 3D built from the SceneLite helpers:
   the paper page with its title, instanced day cells, standing paper tags (with an optional
   initial medallion for the people on a Household calendar) and their contact shadows.
   Used by plans-scene.js (two months side by side, also dimmed behind /cart) and
   confirmation-scene.js (one month, the plan tag landing on today). Exposed as window.ABMonthKit. */
(function () {
  'use strict';
  var doc = document;
  var K = window.ABMonthKit = window.ABMonthKit || {};

  /* Tag atlas with initials: labels[i] = { text, initial, paid }. Same region interface as
     SceneLite.helpers.tagAtlas (white and ink regions after the labels). */
  K.tagAtlas = function (THREE, labels) {
    var W = 320, Hh = 176, n = labels.length + 2, c = doc.createElement('canvas');
    c.width = W; c.height = Hh * n; var g = c.getContext('2d');
    for (var i = 0; i < n; i++) {
      var y = i * Hh;
      if (i === labels.length) { g.fillStyle = '#FFFFFF'; g.fillRect(0, y, W, Hh); continue; }
      if (i === labels.length + 1) { g.fillStyle = '#2B2622'; g.fillRect(0, y, W, Hh); continue; }
      var l = labels[i];
      g.fillStyle = '#FFFFFF'; g.fillRect(0, y, W, Hh);
      g.fillStyle = l.paid ? 'rgba(43,38,34,0.42)' : '#2B2622'; g.fillRect(0, y, W, Math.round(Hh * 0.075));
      g.strokeStyle = 'rgba(43,38,34,0.35)'; g.lineWidth = 3; g.strokeRect(1.5, y + 1.5, W - 3, Hh - 3);
      var textW = l.initial ? W - 110 : W - 40;
      g.fillStyle = l.paid ? '#6B6058' : '#2B2622'; g.font = '600 ' + Math.round(Hh * 0.27) + 'px Figtree, system-ui, sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'left';
      var words = String(l.text).split(' '), lines = [], cur = '';
      words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > textW && cur) { lines.push(cur); cur = w; } else cur = t; }); lines.push(cur);
      var lh = Hh * 0.3, y0 = y + Hh * 0.55 - (lines.length - 1) * lh / 2;
      lines.forEach(function (t, k) { g.fillText(t, 20, y0 + k * lh); });
      if (l.initial) {
        g.strokeStyle = '#2B2622'; g.lineWidth = 3; g.beginPath(); g.arc(W - 48, y + Hh * 0.55, 30, 0, Math.PI * 2); g.stroke();
        g.fillStyle = '#2B2622'; g.font = '700 ' + Math.round(Hh * 0.26) + 'px Figtree, system-ui, sans-serif'; g.textAlign = 'center'; g.fillText(l.initial, W - 48, y + Hh * 0.56);
      }
      if (l.paid) { g.strokeStyle = '#3F6B4B'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(W - 64, y + Hh * 0.55); g.lineTo(W - 50, y + Hh * 0.68); g.lineTo(W - 26, y + Hh * 0.4); g.stroke(); }
    }
    var tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
    var reg = function (i) { return [0, 1 - (i + 1) / n, 1, 1 / n]; };
    return { texture: tex, canvas: c, region: reg, white: reg(labels.length), ink: reg(labels.length + 1), count: n };
  };

  /* build(THREE, H, spec): spec = { title, firstDow (0 Sunday), daysInMonth, prevDays, today, rows (5 or 6),
     pitch, bills: [{ name, day, initial, paid }], caption }. Returns the month object. */
  K.build = function (THREE, H, spec) {
    var COLS = 7, ROWS = spec.rows || 5, PITCH = spec.pitch || 0.5, SIZE = PITCH * 0.92, THICK = PITCH * 0.034;
    var firstDow = spec.firstDow || 0, days = spec.daysInMonth || 31, prevDays = spec.prevDays || 30;
    var group = new THREE.Group();
    function cellOfIndex(i) { var c = i % COLS, r = Math.floor(i / COLS); return { c: c, r: r, x: (c - 3) * PITCH, z: (r - (ROWS - 1) / 2) * PITCH }; }
    function indexOfDay(d) { return d + firstDow - 1; }
    function cellLabel(i) {
      if (i < firstDow) return { label: prevDays - firstDow + 1 + i, dim: true };
      var d = i - firstDow + 1;
      if (d > days) return { label: d - days, dim: true };
      return { label: d, dim: false, today: d === spec.today, paid: false };
    }
    /* the paper page under the cells, with the title and the weekday letters in the header strip */
    var CELL_Z0 = PITCH * 0.55; /* the cells are shifted toward the near edge to leave the header strip */
    var cellsTop = (0 - (ROWS - 1) / 2) * PITCH + CELL_Z0 - SIZE / 2, cellsBottom = ((ROWS - 1) - (ROWS - 1) / 2) * PITCH + CELL_Z0 + SIZE / 2;
    var header = PITCH * 1.6, pageTop = cellsTop - header, pageBottom = cellsBottom + PITCH * 0.3;
    var pw = COLS * PITCH + PITCH * 0.5, pd = pageBottom - pageTop;
    var pc = doc.createElement('canvas'); pc.width = 1024; pc.height = Math.round(1024 * pd / pw); var pg = pc.getContext('2d');
    pg.fillStyle = '#FFFFFF'; pg.fillRect(0, 0, pc.width, pc.height);
    var unit = pc.height / pd; /* canvas px per world unit */
    pg.fillStyle = '#2B2622'; pg.font = '600 ' + Math.round(pc.width * 0.062) + 'px Fraunces, Georgia, serif'; pg.textBaseline = 'top'; pg.fillText(spec.title || 'October', pc.width * 0.045, PITCH * 0.22 * unit);
    pg.font = '600 ' + Math.round(pc.width * 0.024) + 'px Figtree, system-ui, sans-serif'; pg.fillStyle = '#6B6058'; pg.textAlign = 'center';
    var colW = pc.width * (PITCH / pw), x0 = pc.width * (PITCH * 0.25 / pw) + colW / 2, headY = (header - PITCH * 0.42) * unit;
    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(function (l, i) { pg.fillText(l, x0 + i * colW, headY); });
    pg.fillStyle = 'rgba(43,38,34,0.25)'; pg.fillRect(0, 0, pc.width, Math.max(3, pc.height * 0.006));
    var pageTex = new THREE.CanvasTexture(pc); pageTex.encoding = THREE.sRGBEncoding; pageTex.anisotropy = 4;
    var page = new THREE.Mesh(new THREE.PlaneGeometry(pw, pd), new THREE.MeshStandardMaterial({ map: pageTex, roughness: 0.95, metalness: 0, envMapIntensity: 0.5 }));
    page.rotation.x = -Math.PI / 2; page.position.set(0, 0.004, (pageTop + pageBottom) / 2); page.receiveShadow = true; group.add(page);
    /* the cells */
    var cells = []; for (var i = 0; i < COLS * ROWS; i++) cells.push(cellLabel(i));
    var atlas = H.monthAtlas(THREE, { cols: COLS, rows: ROWS, cell: 192, cells: cells });
    var cellMesh = H.dayCells(THREE, atlas, COLS * ROWS, function (i) { var c = cellOfIndex(i); return { x: c.x, z: c.z + CELL_Z0, y: 0.01 + THICK / 2 }; }, { size: SIZE, thick: THICK });
    group.add(cellMesh);
    /* the tags */
    var bills = spec.bills || [];
    var tagAtlas = K.tagAtlas(THREE, bills.map(function (b) { return { text: b.name, initial: b.initial, paid: b.paid }; }));
    var TW = PITCH * 0.64, TH = PITCH * 0.34, TD = PITCH * 0.022;
    var tags = H.standingTags(THREE, tagAtlas, Math.max(1, bills.length), { w: TW, h: TH, d: TD });
    var shadows = H.contactShadows(THREE, Math.max(1, bills.length), { alpha: 0.3 });
    group.add(tags); group.add(shadows);
    var tagHome = bills.map(function (b, k) { var c = cellOfIndex(indexOfDay(b.day)); return { x: c.x, y: 0.01 + THICK + TH / 2, z: c.z + CELL_Z0 + PITCH * 0.19, yaw: (k % 3 - 1) * 0.02 }; });
    var m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(1, 1, 1);
    function placeTag(k, x, y, z, yaw, roll, lean, sc) {
      e.set(lean || 0, yaw || 0, roll || 0); q.setFromEuler(e); v3.set(x, y, z); s3.set(sc || 1, sc || 1, sc || 1); m4.compose(v3, q, s3); tags.setMatrixAt(k, m4);
      var lift = Math.max(0, y - tagHome[k].y); var sh = Math.max(0.15, 1 + lift * 0.6 - lift * lift * 0.5);
      if ((sc || 1) < 0.01) sh = 0.0001; /* a hidden tag casts no contact shadow */
      e.set(0, yaw || 0, 0); q.setFromEuler(e); v3.set(x, 0.012 + THICK, z); s3.set(PITCH * 0.9 * sh, 1, PITCH * 0.52 * sh); m4.compose(v3, q, s3); shadows.setMatrixAt(k, m4);
    }
    function hide(k) { s3.set(0.0001, 0.0001, 0.0001); v3.set(0, -5, 0); q.identity(); m4.compose(v3, q, s3); tags.setMatrixAt(k, m4); shadows.setMatrixAt(k, m4); }
    if (!bills.length) hide(0);
    bills.forEach(function (b, k) { placeTag(k, tagHome[k].x, tagHome[k].y, tagHome[k].z, tagHome[k].yaw, 0, 0, 1); });
    tags.instanceMatrix.needsUpdate = true; shadows.instanceMatrix.needsUpdate = true;
    function commit() { tags.instanceMatrix.needsUpdate = true; shadows.instanceMatrix.needsUpdate = true; }
    function cellPos(day) { var c = cellOfIndex(indexOfDay(day)); return { x: c.x, y: 0.01 + THICK, z: c.z + CELL_Z0 }; }
    return { group: group, cells: cellMesh, tags: tags, shadows: shadows, page: page, bills: bills, tagHome: tagHome, placeTag: placeTag, hide: hide, commit: commit,
      cellPos: cellPos, cellOfIndex: cellOfIndex, indexOfDay: indexOfDay, width: pw, depth: pd, pitch: PITCH, tagH: TH, thick: THICK, near: pageBottom, far: pageTop };
  };

  /* The oat counter with the wood grain blended lightly, as on Home. */
  K.counter = function (THREE, scene, size) {
    var mat = new THREE.MeshStandardMaterial({ color: 0xEDE2CF, roughness: 1, metalness: 0, envMapIntensity: 0.35 });
    var img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = function () {
      var c = doc.createElement('canvas'); c.width = c.height = 512; var g = c.getContext('2d');
      g.fillStyle = '#EDE2CF'; g.fillRect(0, 0, 512, 512); g.globalAlpha = 0.22; g.drawImage(img, 0, 0, 512, 512); g.globalAlpha = 1;
      var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(7, 7); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
      mat.map = t; mat.color.set(0xFFFFFF); mat.needsUpdate = true;
    };
    img.src = '/assets/tex-counter.jpg';
    var counter = new THREE.Mesh(new THREE.PlaneGeometry(size || 60, size || 60), mat); counter.rotation.x = -Math.PI / 2; counter.receiveShadow = true; scene.add(counter);
    return counter;
  };

  /* Camera keyframe interpolation: keys = [{ p, pos: [x,y,z], look: [x,y,z] }]. */
  K.camPath = function (THREE, keys, smooth) {
    var pos = new THREE.Vector3(), look = new THREE.Vector3(), ta = new THREE.Vector3(), tb = new THREE.Vector3();
    return {
      pos: pos, look: look,
      at: function (p) {
        var a = keys[0], b = keys[keys.length - 1];
        for (var i = 0; i < keys.length - 1; i++) { if (p >= keys[i].p && p <= keys[i + 1].p) { a = keys[i]; b = keys[i + 1]; break; } }
        var t = (p - a.p) / (b.p - a.p || 1); t = Math.max(0, Math.min(1, t)); t = smooth ? smooth(t) : t;
        pos.set(a.pos[0], a.pos[1], a.pos[2]).lerp(ta.set(b.pos[0], b.pos[1], b.pos[2]), t);
        look.set(a.look[0], a.look[1], a.look[2]).lerp(tb.set(b.look[0], b.look[1], b.look[2]), t);
      }
    };
  };
})();
