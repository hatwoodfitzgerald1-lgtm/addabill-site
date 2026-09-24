/* Addabill checkout: the plan from the query or the cart (empty cart redirects to /plans), the sticky
   summary with the monthly/annual switch, the Free path (Contact only, no billing or payment fields),
   field discipline and the GOV.UK error standard (validate on blur with a delay, never while typing,
   messages beside the field and in a summary linked to the fields, values never cleared), the card
   number grouped in fours with a Luhn check, the paper tag spinner on a valid submit, the order held
   in sessionStorage for /confirmation, and the day cell scene whose shadow shortens as the form is
   completed. Enter submits because this is a real form with a submit button. */
(function () {
  'use strict';
  var AB = window.AB, doc = document;
  if (!AB) return;
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function luhn(digits) {
    var sum = 0, alt = false;
    for (var i = digits.length - 1; i >= 0; i--) { var n = +digits[i]; if (alt) { n *= 2; if (n > 9) n -= 9; } sum += n; alt = !alt; }
    return sum % 10 === 0;
  }
  function groupCard(digits) {
    var amex = /^3[47]/.test(digits), out = [];
    if (amex) { out = [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)]; }
    else { for (var i = 0; i < digits.length; i += 4) out.push(digits.slice(i, i + 4)); }
    return out.filter(Boolean).join(' ');
  }

  AB.onReady(function () {
    var Cart = window.Cart, form = doc.getElementById('checkout-form');
    if (!Cart || !form) return;
    var placing = false;
    var line = Cart.ensureFromQuery();
    if (!line) { location.replace('/plans?cart=empty'); return; }
    try { if (location.search) history.replaceState(null, '', location.pathname); } catch (e) {}

    var h1 = doc.getElementById('co-title'), fsBilling = doc.getElementById('fs-billing'), fsPayment = doc.getElementById('fs-payment'), freeNote = doc.getElementById('co-free-note');
    var termBox = doc.getElementById('co-term'), cell = doc.getElementById('co-cell'), cellTag = doc.getElementById('co-cell-tag'), cellDate = doc.getElementById('co-cell-date');
    if (cellDate) cellDate.textContent = String(new Date().getDate());

    /* expiry years: this year to twelve ahead */
    var yearSel = doc.getElementById('co-exp-year'), now = new Date(), cy = now.getFullYear(), cm = now.getMonth() + 1;
    if (yearSel) { for (var y = cy; y <= cy + 12; y++) { var o = doc.createElement('option'); o.value = String(y); o.textContent = String(y); yearSel.appendChild(o); } }

    function setHeading(text) {
      if (!h1 || h1.textContent === text) return;
      h1.textContent = text; delete h1.dataset.split;
      AB.splitWords(h1, 'hw').forEach(function (w) { AB.applyHover('dated-underline', w); });
    }
    function setFieldsetActive(fs, on) {
      fs.hidden = !on;
      AB.$$('input, select, textarea, button', fs).forEach(function (c) { c.disabled = !on; });
    }
    function applyPlan(l) {
      var isFree = l.id === 'free', isHousehold = !isFree;
      setHeading(isFree ? 'Your Free plan' : 'Your Household plan');
      doc.getElementById('sum-plan').textContent = isFree ? 'Free' : l.title;
      doc.getElementById('sum-price').textContent = isFree ? '$0' : l.price;
      doc.getElementById('sum-renews').textContent = isFree ? 'Never' : l.renew;
      doc.getElementById('sum-total').textContent = isFree ? '$0' : l.price;
      doc.getElementById('sum-toggle-total').textContent = isFree ? '$0' : l.price;
      if (termBox) { termBox.hidden = !isHousehold; AB.$$('[data-term]', termBox).forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.term === l.term ? 'true' : 'false'); }); }
      setFieldsetActive(fsBilling, isHousehold); setFieldsetActive(fsPayment, isHousehold);
      freeNote.hidden = isHousehold;
      if (cellTag) cellTag.textContent = isFree ? 'Free' : 'Household';
      doc.title = (isFree ? 'Checkout, the Free plan' : 'Checkout, ' + l.title) + ' | Addabill';
      updateDone();
    }
    doc.addEventListener('cart:change', function (e) {
      if (placing) return;
      var l = e.detail && e.detail.line;
      if (!l) { location.replace('/plans?cart=empty'); return; }
      line = l; applyPlan(l);
      if (e.detail.reason === 'swap') AB.announce('Swapped to ' + l.title + '.');
    });
    if (termBox) termBox.addEventListener('click', function (e) { var b = e.target.closest('[data-term]'); if (b) Cart.setTerm(b.dataset.term); });

    /* the mobile summary toggle (always expanded on desktop) */
    var toggle = doc.querySelector('.co-sum__toggle'), body = doc.getElementById('co-sum-body');
    var mq = window.matchMedia('(max-width: 1099px)');
    function syncToggle() { if (!toggle || !body) return; if (mq.matches) { var open = toggle.getAttribute('aria-expanded') === 'true'; body.hidden = !open; } else { body.hidden = false; } }
    if (toggle) { toggle.setAttribute('aria-expanded', mq.matches ? 'false' : 'true'); toggle.addEventListener('click', function () { toggle.setAttribute('aria-expanded', toggle.getAttribute('aria-expanded') === 'true' ? 'false' : 'true'); syncToggle(); }); }
    syncToggle(); if (mq.addEventListener) mq.addEventListener('change', syncToggle);

    /* the CVV disclosure */
    var whats = doc.querySelector('.co-whats'), help = doc.getElementById('co-cvv-help');
    if (whats && help) whats.addEventListener('click', function () { var open = whats.getAttribute('aria-expanded') === 'true'; whats.setAttribute('aria-expanded', open ? 'false' : 'true'); help.hidden = open; });

    /* card number grouped in fours (4 6 5 for American Express) with the caret kept in place */
    var ccnum = doc.getElementById('co-ccnum');
    if (ccnum) ccnum.addEventListener('input', function () {
      var pos = ccnum.selectionStart || 0, before = ccnum.value.slice(0, pos).replace(/\D/g, '').length;
      var digits = ccnum.value.replace(/\D/g, '').slice(0, 19), v = groupCard(digits);
      ccnum.value = v;
      var caret = 0, seen = 0; while (caret < v.length && seen < before) { if (/\d/.test(v[caret])) seen++; caret++; }
      try { ccnum.setSelectionRange(caret, caret); } catch (e) {}
    });
    /* prefill the name on the card from Contact, still editable */
    var first = doc.getElementById('co-first'), last = doc.getElementById('co-last'), ccname = doc.getElementById('co-ccname'), autoName = '';
    function prefillName() { if (!ccname) return; var v = (first.value.trim() + ' ' + last.value.trim()).trim(); if (v && (ccname.value === '' || ccname.value === autoName)) { ccname.value = v; autoName = v; } }
    [first, last].forEach(function (f) { f.addEventListener('blur', prefillName); });

    /* validation rules: id -> message or null */
    var rules = {
      'co-first': function (v) { return v ? null : 'Enter your first name.'; },
      'co-last': function (v) { return v ? null : 'Enter your last name.'; },
      'co-email': function (v) { if (!v) return 'Enter your email address.'; return EMAIL.test(v) ? null : 'Enter an email address in the correct format, like name@example.com.'; },
      'co-phone': function (v) { if (!v) return 'Enter your phone number.'; var d = v.replace(/\D/g, ''); if (d.length === 11 && d[0] === '1') d = d.slice(1); return d.length === 10 ? null : 'Enter a 10 digit US phone number, like 214 555 0100.'; },
      'co-addr1': function (v) { return v ? null : 'Enter your street address.'; },
      'co-city': function (v) { return v ? null : 'Enter your city.'; },
      'co-state': function (v) { return v ? null : 'Enter your state.'; },
      'co-zip': function (v) { if (!v) return 'Enter your ZIP code.'; return /^\d{5}(-\d{4})?$/.test(v) ? null : 'Enter a ZIP code in the correct format, like 75244.'; },
      'co-country': function (v) { return v ? null : 'Enter your country.'; },
      'co-ccname': function (v) { return v ? null : 'Enter the name on the card.'; },
      'co-ccnum': function (v) { if (!v) return 'Enter the card number.'; var d = v.replace(/\D/g, ''); return (d.length >= 13 && d.length <= 19 && luhn(d) && /^\d+$/.test(v.replace(/\s/g, ''))) ? null : 'Enter the card number as it appears on your card, digits only.'; },
      'co-exp-month': function (v) { return v ? null : "Enter the card's expiry date."; },
      'co-exp-year': function (v) { if (!v) return "Enter the card's expiry date."; var m = +doc.getElementById('co-exp-month').value; if (!m) return null; return (+v > cy || (+v === cy && m >= cm)) ? null : "The card's expiry date must be in the future."; },
      'co-cvv': function (v) { if (!v) return "Enter the card's security code."; return /^\d{3,4}$/.test(v) ? null : "Enter the card's security code as 3 or 4 digits."; }
    };
    function active(id) { var el = doc.getElementById(id); return el && !el.disabled && !el.closest('[hidden]'); }
    function check(id) { var el = doc.getElementById(id); return rules[id](el.value.trim()); }
    function validateField(id, show) {
      var el = doc.getElementById(id), msg = check(id);
      if (show !== false) { if (msg) AB.form.setError(el, msg); else AB.form.clearError(el); }
      return msg ? { id: id, msg: msg } : null;
    }
    function validateAll() {
      var errors = [], seenExpiry = false;
      Object.keys(rules).forEach(function (id) {
        if (!active(id)) return;
        var er = validateField(id, true);
        if (er) {
          if ((id === 'co-exp-month' || id === 'co-exp-year') && er.msg === "Enter the card's expiry date.") { if (seenExpiry) return; seenExpiry = true; }
          errors.push(er);
        }
      });
      return errors;
    }
    /* blur with a delay, never while typing; a field untouched by typing is left alone until a submit */
    Object.keys(rules).forEach(function (id) {
      var el = doc.getElementById(id); if (!el) return;
      var t;
      el.addEventListener('input', function () { el.dataset.dirty = '1'; updateDone(); });
      el.addEventListener('change', function () { el.dataset.dirty = '1'; updateDone(); });
      el.addEventListener('blur', function () {
        clearTimeout(t);
        t = setTimeout(function () {
          if (!active(id)) return;
          if (el.dataset.dirty === '1' || form.dataset.submitted === '1') { validateField(id, true); refreshSummary(); }
          updateDone();
        }, 350);
      });
    });
    function refreshSummary() {
      if (form.dataset.submitted !== '1' || !form.querySelector('.error-summary')) return;
      var errors = [], seenExpiry = false;
      Object.keys(rules).forEach(function (id) { if (!active(id)) return; var msg = check(id); if (msg) { if ((id === 'co-exp-month' || id === 'co-exp-year') && msg === "Enter the card's expiry date.") { if (seenExpiry) return; seenExpiry = true; } errors.push({ id: id, msg: msg }); } });
      var s = form.querySelector('.error-summary');
      if (!errors.length) { if (s) s.remove(); return; }
      var ul = s.querySelector('ul'); ul.innerHTML = '';
      errors.forEach(function (er) { var li = doc.createElement('li'); var a = doc.createElement('a'); a.href = '#' + er.id; a.textContent = er.msg; a.addEventListener('click', function (ev) { ev.preventDefault(); var tg = doc.getElementById(er.id); if (tg) tg.focus(); }); li.appendChild(a); ul.appendChild(li); });
    }

    /* the day cell: the shadow shortens as required fields are completed */
    function updateDone() {
      if (!cell) return;
      var ids = Object.keys(rules).filter(active), ok = ids.filter(function (id) { return !check(id); }).length;
      var f = ids.length ? ok / ids.length : 0;
      cell.style.setProperty('--done', f.toFixed(3));
      cell.classList.toggle('is-done', f >= 1);
    }
    applyPlan(line);
    if (window.gsap && window.ScrollTrigger && !AB.motion.rm && cell) {
      ScrollTrigger.create({ trigger: form, start: 'top 70%', end: 'bottom 40%', scrub: 0.8, onUpdate: function (st) { cell.style.setProperty('--tilt', (22 - 14 * st.progress).toFixed(2) + 'deg'); }, onRefresh: function (st) { AB.qa.arc(st.start, st.end, 'Checkout day cell'); } });
    }

    /* fieldsets rise 8px on enter (JS only, so nothing is ever hidden without it) */
    if (window.gsap && window.ScrollTrigger && !AB.motion.rm) {
      AB.$$('.co-fieldset, .co-submit', form).forEach(function (fs, i) {
        gsap.set(fs, { y: 8, opacity: 0.001 });
        ScrollTrigger.create({ trigger: fs, start: 'top 96%', once: true, onEnter: function () { gsap.to(fs, { y: 0, opacity: 1, duration: AB.D.base, ease: 'headsup', delay: i * 0.06, clearProps: 'transform,opacity' }); } });
      });
      var sum = doc.getElementById('co-summary');
      if (sum && window.innerWidth >= 1100) gsap.fromTo(sum, { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: AB.D.slow, ease: 'headsup', clearProps: 'transform,opacity' });
    }

    /* submit */
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (placing) return;
      form.dataset.submitted = '1';
      var errors = validateAll();
      if (errors.length) {
        AB.form.summary(form, errors, 'Check these before you place the order');
        AB.announce(errors.length + (errors.length === 1 ? ' thing' : ' things') + ' to check before you place the order.');
        return;
      }
      AB.form.summary(form, [], '');
      placing = true;
      var btn = doc.getElementById('co-place');
      btn.disabled = true; btn.setAttribute('aria-disabled', 'true'); btn.innerHTML = '<span class="tag-spinner" aria-hidden="true"></span><span class="lbl"><span>Placing</span></span>';
      AB.announce('Placing your order.');
      var isFree = line.id === 'free';
      var order = {
        plan: line.id, name: line.name, title: isFree ? 'Free' : line.title, term: line.term || 'none', price: isFree ? '$0' : line.price, renew: isFree ? 'Never' : line.renew, renewLine: line.renewLine, amount: line.amount,
        firstName: first.value.trim(), lastName: last.value.trim(), email: doc.getElementById('co-email').value.trim(), phone: doc.getElementById('co-phone').value.trim(),
        placedAt: new Date().toISOString(), ref: 'AB' + Date.now().toString(36).toUpperCase().slice(-6)
      };
      try { sessionStorage.setItem('addabill.order', JSON.stringify(order)); } catch (er) { window.__abOrder = order; }
      Cart.clear();
      setTimeout(function () { location.assign('/confirmation?plan=' + encodeURIComponent(line.id) + '&term=' + encodeURIComponent(order.term)); }, AB.motion.rm ? 200 : 900);
    });
  });
})();
