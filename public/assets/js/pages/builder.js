/* Addabill Build your month: the six inputs, the live 2.5D DOM month (GSAP, no WebGL), the Added
   stamp, tags sliding onto their day, the heads-up arc drawing to the reminder day (wrapping into
   September as dimmed leading cells), the texts shelf in the exact product format, Remove per bill,
   screen reader announcements, the Free or Household logic and both result states with their CTAs,
   and the month tilting flat as the result arrives. State lives in memory only; nothing is stored. */
(function () {
  'use strict';
  var AB = window.AB, doc = document;
  if (!AB) return;
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MAX = 12;
  function octDow(d) { return DOW[(3 + d - 1) % 7]; }  /* the design's October: the 1st is a Wednesday */
  function sepDow(s) { return DOW[s % 7]; }            /* September 28 is a Sunday */
  function ordinal(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function fmtAmount(raw) {
    var t = String(raw || '').trim(); if (!t) return '';
    if (!/^\$?\s*\d[\d,]*(\.\d{0,2})?\s*$/.test(t)) return t;
    var n = parseFloat(t.replace(/[$,\s]/g, '')); if (isNaN(n)) return t;
    return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  /* cells: 0 to 6 September 21 to 27 (the leading week, shown only when a reminder needs it),
     7 to 9 September 28 to 30, 10 to 40 October 1 to 31, 41 November 1 */
  function reminderOf(day, lead) {
    var r = day - lead;
    if (r >= 1) return { month: 'Oct', day: r, index: 9 + r, needsLead: false, label: octDow(r) + ' Oct ' + r };
    var s = 30 + r; return { month: 'Sep', day: s, index: s - 21, needsLead: s < 28, label: sepDow(s) + ' Sep ' + s };
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  AB.onReady(function () {
    var form = doc.getElementById('bm-form'), grid = doc.getElementById('bm-grid'), month = doc.getElementById('bm-month');
    if (!form || !grid || !month) return;
    var motion = !AB.motion.rm && !!window.gsap;
    var biller = doc.getElementById('bm-biller'), amount = doc.getElementById('bm-amount'), dayIn = doc.getElementById('bm-day');
    var paper = doc.getElementById('bm-paper'), shared = doc.getElementById('bm-shared');
    var stampEl = doc.getElementById('bm-stamp'), countEl = doc.getElementById('bm-count'), emptyEl = doc.getElementById('bm-empty');
    var listWrap = doc.getElementById('bm-list-wrap'), list = doc.getElementById('bm-list');
    var result = doc.getElementById('bm-result'), resultIn = doc.getElementById('bm-result-in'), summaryEl = doc.getElementById('bm-summary');
    var recoTitle = doc.getElementById('bm-reco-title'), recoPara = doc.getElementById('bm-reco-para'), recoCta = doc.getElementById('bm-reco-cta');
    var shelf = doc.getElementById('bm-shelf'), shelfEmpty = doc.getElementById('bm-shelf-empty');
    var bills = [], nextId = 1, resultShown = false, tiltTrigger = null;
    var baseTilt = parseFloat(getComputedStyle(month).getPropertyValue('--tilt')) || 34;

    /* the month grid */
    var cells = [];
    for (var i = 0; i < 42; i++) {
      var li = doc.createElement('li'), n, cls = 'bm-cell';
      if (i < 7) { n = 21 + i; cls += ' dim lead'; }
      else if (i < 10) { n = 28 + (i - 7); cls += ' dim'; }
      else if (i < 41) { n = i - 9; }
      else { n = 1; cls += ' dim'; }
      li.className = cls; li.dataset.index = String(i);
      li.innerHTML = '<span class="bm-cell__n">' + n + '</span>';
      grid.appendChild(li); cells.push(li);
    }
    var arcs = doc.createElementNS('http://www.w3.org/2000/svg', 'svg'); arcs.setAttribute('class', 'bm__arcs'); arcs.setAttribute('aria-hidden', 'true'); grid.appendChild(arcs);

    function cellCenter(index) { var c = cells[index]; return { x: c.offsetLeft + c.offsetWidth / 2, y: c.offsetTop + c.offsetHeight / 2 }; }
    function syncArcsBox() { arcs.setAttribute('viewBox', '0 0 ' + grid.clientWidth + ' ' + grid.clientHeight); }
    function arcPath(b) {
      var a = cellCenter(b.reminder.index), d = cellCenter(9 + b.day);
      var ax = a.x, ay = a.y - 2, dx = d.x, dy = d.y - 10;
      var mx = (ax + dx) / 2, my = Math.min(ay, dy) - (Math.abs(dx - ax) * 0.28 + 26);
      return { d: 'M' + ax.toFixed(1) + ' ' + ay.toFixed(1) + ' Q ' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + dx.toFixed(1) + ' ' + dy.toFixed(1), end: d };
    }
    function drawArc(b, animate) {
      syncArcsBox();
      var g = doc.createElementNS('http://www.w3.org/2000/svg', 'g'); g.dataset.id = String(b.id);
      var p = doc.createElementNS('http://www.w3.org/2000/svg', 'path'), c = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
      var ap = arcPath(b);
      p.setAttribute('d', ap.d); p.setAttribute('pathLength', '1000');
      c.setAttribute('cx', ap.end.x.toFixed(1)); c.setAttribute('cy', (ap.end.y - 10).toFixed(1)); c.setAttribute('r', '3.5');
      g.appendChild(p); g.appendChild(c); arcs.appendChild(g); b.arc = g;
      if (animate && motion) {
        p.style.strokeDasharray = '1000'; p.style.strokeDashoffset = '1000'; gsap.set(c, { scale: 0, transformOrigin: '50% 50%' });
        gsap.to(p, { strokeDashoffset: 0, duration: AB.D.slow, ease: 'headsup', delay: 0.25 });
        gsap.to(c, { scale: 1, duration: AB.D.base, ease: 'headsup', delay: 0.25 + AB.D.slow * 0.8 });
      }
    }
    function relayoutArcs() {
      syncArcsBox();
      bills.forEach(function (b) { if (!b.arc) return; var ap = arcPath(b); b.arc.querySelector('path').setAttribute('d', ap.d); var c = b.arc.querySelector('circle'); c.setAttribute('cx', ap.end.x.toFixed(1)); c.setAttribute('cy', (ap.end.y - 10).toFixed(1)); });
    }
    function syncLeadRow() {
      var need = bills.some(function (b) { return b.reminder.needsLead; });
      if (grid.classList.contains('has-lead') !== need) { grid.classList.toggle('has-lead', need); relayoutArcs(); }
    }
    function restackCell(index) {
      AB.$$('.bm-tag-wrap', cells[index]).forEach(function (w, k) { w.style.bottom = (5 + k * 16) + 'px'; });
    }
    function markCells() {
      cells.forEach(function (c) { c.classList.remove('is-due', 'is-reminder'); });
      bills.forEach(function (b) { cells[9 + b.day].classList.add('is-due'); cells[b.reminder.index].classList.add('is-reminder'); });
    }

    /* the texts shelf */
    function bubbleFor(b) {
      var li = doc.createElement('li'); li.dataset.id = String(b.id);
      var div = doc.createElement('div'); div.className = 'bubble';
      var day = doc.createElement('span'); day.className = 'bubble__day'; day.textContent = b.reminder.label;
      var from = doc.createElement('span'); from.className = 'bubble__from'; from.textContent = 'Addabill:';
      var text = ' ' + b.biller + (b.amount ? ', ' + b.amount : '') + ', due ' + octDow(b.day) + ' Oct ' + b.day + ". Tap to open your biller's payment page: ";
      var lnk = doc.createElement('span'); lnk.className = 'lnk'; lnk.textContent = '[link]';
      div.appendChild(day); div.appendChild(from); div.appendChild(doc.createTextNode(text)); div.appendChild(lnk); div.appendChild(doc.createTextNode('. Reply HELP for help, STOP to cancel.'));
      li.appendChild(div); return li;
    }
    function renderShelf(newId) {
      var sorted = bills.slice().sort(function (a, b) { return a.reminder.index - b.reminder.index || a.id - b.id; });
      var existing = {}; AB.$$('li', shelf).forEach(function (li) { existing[li.dataset.id] = li; });
      sorted.forEach(function (b) { var li = existing[b.id] || bubbleFor(b); shelf.appendChild(li); });
      AB.$$('li', shelf).forEach(function (li) { if (!bills.some(function (b) { return String(b.id) === li.dataset.id; })) li.remove(); });
      shelfEmpty.hidden = bills.length > 0;
      if (newId != null) {
        var li = shelf.querySelector('li[data-id="' + newId + '"]');
        if (li) {
          if (motion) gsap.fromTo(li, { x: 48, scale: 0.92, opacity: 0 }, { x: 0, scale: 1, opacity: 1, duration: AB.D.base, ease: 'headsup', delay: 0.35 });
          var pad = parseFloat(getComputedStyle(shelf).paddingLeft) || 0;
          shelf.scrollTo({ left: Math.max(0, li.offsetLeft - pad), behavior: motion ? 'smooth' : 'auto' });
        }
      }
    }

    /* the list with Remove */
    function renderList() {
      list.innerHTML = '';
      bills.forEach(function (b) {
        var li = doc.createElement('li'); li.className = 'bm-list__item';
        var tag = doc.createElement('span'); tag.className = 'tag'; tag.textContent = b.biller;
        var meta = doc.createElement('span'); meta.className = 'bm-list__meta';
        meta.textContent = (b.amount ? b.amount + ', ' : '') + 'due Oct ' + b.day + ', text ' + (b.lead === 1 ? '1 day' : b.lead + ' days') + ' before' + (b.paper ? ', on paper' : '') + (b.shared ? ', someone else handles it' : '');
        var rm = doc.createElement('button'); rm.type = 'button'; rm.className = 'bm-remove'; rm.textContent = 'Remove'; rm.setAttribute('aria-label', 'Remove ' + b.biller); rm.dataset.id = String(b.id);
        li.appendChild(tag); li.appendChild(meta); li.appendChild(rm); list.appendChild(li);
      });
      listWrap.hidden = bills.length === 0;
    }

    /* the result */
    function link(href, text, planId, cls) { var a = doc.createElement('a'); a.href = href; a.className = cls; a.textContent = text; a.dataset.cartAdd = planId; return a; }
    function tagBtn(href, text, planId) { var a = doc.createElement('a'); a.href = href; a.className = 'tag-btn'; a.dataset.cartAdd = planId; a.innerHTML = '<span class="lbl"><span></span><span aria-hidden="true"></span></span>'; a.querySelector('.lbl').firstChild.textContent = text; a.querySelector('.lbl').lastChild.textContent = text; return a; }
    function setHeading(el, text) { el.textContent = text; delete el.dataset.split; AB.splitWords(el, 'hw').forEach(function (w) { AB.applyHover('added', w); }); }
    function renderResult() {
      var n = bills.length;
      if (!n) { result.hidden = true; resultShown = false; setTilt(baseTilt); if (tiltTrigger) { tiltTrigger.kill(); tiltTrigger = null; } return; }
      var paperN = bills.filter(function (b) { return b.paper; }).length, sharedN = bills.filter(function (b) { return b.shared; }).length;
      var household = n > 5 || paperN > 0 || sharedN > 0;
      var line = plural(n, 'bill', 'bills') + ' on the month, ' + plural(n, 'text', 'texts') + (n === 1 ? " before it's due." : " before they're due.");
      var ext = [];
      if (paperN) ext.push(paperN + ' arriving on paper');
      if (sharedN) ext.push(sharedN + ' handled by someone else');
      if (ext.length) line += ' ' + ext.join(', ') + '.';
      summaryEl.textContent = line;
      recoCta.innerHTML = '';
      if (household) {
        var reason = n > 5 ? "You've added " + n + ' bills, and Free holds five at a time.' : paperN ? 'At least one of these arrives on paper, and photographing it needs Household.' : 'Someone else handles at least one of these, and their text has to reach their phone.';
        setHeading(recoTitle, 'Household fits this house');
        recoPara.textContent = reason + " Unlimited bills, photo capture for the paper ones and a shared calendar for the people who handle their own are the three things Free doesn't do, and your month needs at least one of them. It's $5 a month or $40 a year, and every bill you just added comes with you.";
        recoCta.appendChild(tagBtn('/checkout?plan=household-monthly', 'Purchase the Household plan', 'household-monthly'));
        var p = doc.createElement('p'); p.className = 'bm-reco__links';
        p.appendChild(link('/checkout?plan=household-annual', 'or buy the annual plan, $40 a year', 'household-annual', 'link link--quiet'));
        p.appendChild(link('/checkout?plan=free', 'or use the Free plan', 'free', 'link link--quiet'));
        recoCta.appendChild(p);
      } else {
        setHeading(recoTitle, 'Free fits, for now');
        recoPara.textContent = n + (n === 1 ? ' bill' : ' bills') + ', all typed, all handled by you, is exactly what Free is for, and it stays free with no card and no time limit. The day the house passes five bills, or a paper one turns up, or someone else takes over the car insurance, Household picks up where Free leaves off and every bill comes along.';
        recoCta.appendChild(tagBtn('/checkout?plan=free', 'Use the Free plan', 'free'));
        var p2 = doc.createElement('p'); p2.className = 'bm-reco__links';
        p2.appendChild(link('/checkout?plan=household-monthly', 'or purchase the Household plan, $5 a month', 'household-monthly', 'link link--quiet'));
        recoCta.appendChild(p2);
      }
      AB.$$('a.link', recoCta).forEach(function (a) { AB.applyHover('added', a); });
      AB.$$('.tag-btn', recoCta).forEach(function (b) { b.style.setProperty('--tag-w', b.offsetWidth + 'px'); });
      if (!resultShown) {
        resultShown = true; result.hidden = false;
        if (motion) AB.revealNow(resultIn); else resultIn.classList.add('is-revealed');
        setupTilt();
      }
    }

    /* the month tilts from standing to flat as the result arrives (scrubbed; pinned by the sticky column) */
    function setTilt(deg) { month.style.setProperty('--tilt', deg.toFixed(2) + 'deg'); }
    function setupTilt() {
      if (!motion || !window.ScrollTrigger) { setTilt(0); return; }
      if (tiltTrigger) tiltTrigger.kill();
      tiltTrigger = ScrollTrigger.create({
        trigger: result, start: 'top 88%', end: 'top 34%', scrub: 0.8, invalidateOnRefresh: true,
        onUpdate: function (st) { setTilt(baseTilt * (1 - AB.smooth(st.progress))); },
        onRefresh: function (st) { AB.qa.arc(st.start, st.end, 'Builder month tilt'); }
      });
      ScrollTrigger.refresh();
    }

    /* add a bill */
    function updateCount() { countEl.textContent = bills.length ? plural(bills.length, 'bill', 'bills') + ', ' + plural(bills.length, 'text', 'texts') : 'No bills yet'; emptyEl.hidden = bills.length > 0; }
    function addBill(b) {
      bills.push(b);
      syncLeadRow();
      var cell = cells[9 + b.day], wrap = doc.createElement('span'); wrap.className = 'bm-tag-wrap'; wrap.dataset.id = String(b.id);
      var tag = doc.createElement('span'); tag.className = 'tag bm-tag'; tag.textContent = b.biller; wrap.appendChild(tag); cell.appendChild(wrap); b.tag = wrap;
      restackCell(9 + b.day); markCells();
      if (motion) gsap.fromTo(wrap, { x: -70, y: -44, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: AB.D.base, ease: 'headsup' });
      drawArc(b, true);
      renderShelf(b.id); renderList(); updateCount(); renderResult();
      AB.stamp(stampEl, 'Added', { check: true, replace: true, announce: false });
      AB.announce(b.biller + ' added, due on the ' + ordinal(b.day) + '.');
    }
    function removeBill(id) {
      var b = bills.filter(function (x) { return x.id === id; })[0]; if (!b) return;
      bills = bills.filter(function (x) { return x.id !== id; });
      var done = function () { if (b.tag) b.tag.remove(); restackCell(9 + b.day); };
      if (motion && b.tag) gsap.to(b.tag, { y: -30, opacity: 0, duration: AB.D.fast, ease: 'pageturn', onComplete: done }); else done();
      if (b.arc) b.arc.remove();
      syncLeadRow(); markCells(); relayoutArcs();
      renderShelf(null); renderList(); updateCount(); renderResult();
      AB.announce(b.biller + ' removed.');
      biller.focus();
    }
    list.addEventListener('click', function (e) { var btn = e.target.closest('.bm-remove'); if (btn) removeBill(+btn.dataset.id); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      form.dataset.submitted = '1';
      var errors = [];
      var name = biller.value.trim(), dayV = dayIn.value.trim(), day = parseInt(dayV, 10);
      if (!name) errors.push(AB.form.setError(biller, 'Enter the biller.')); else AB.form.clearError(biller);
      if (!dayV) errors.push(AB.form.setError(dayIn, 'Enter the due day of the month.'));
      else if (!/^\d+$/.test(dayV) || day < 1 || day > 31) errors.push(AB.form.setError(dayIn, 'Enter the due day as a number from 1 to 31.'));
      else AB.form.clearError(dayIn);
      AB.form.summary(form, errors, 'Check these before you add the bill');
      if (errors.length) return;
      if (bills.length >= MAX) { AB.announce("That's " + MAX + ' bills on the month, plenty to see which plan fits.'); stampEl.innerHTML = ''; return; }
      var lead = parseInt((form.querySelector('input[name="lead"]:checked') || {}).value || '3', 10);
      addBill({ id: nextId++, biller: name, amount: fmtAmount(amount.value), day: day, lead: lead, paper: paper.checked, shared: shared.checked, reminder: reminderOf(day, lead) });
      /* reset for the next bill; the visitor's bills stay on the month */
      biller.value = ''; amount.value = ''; dayIn.value = ''; paper.checked = false; shared.checked = false;
      var three = form.querySelector('input[name="lead"][value="3"]'); if (three) three.checked = true;
      delete form.dataset.submitted;
      biller.focus();
    });

    window.addEventListener('resize', relayoutArcs);
    updateCount();
    syncArcsBox();
  });
})();
