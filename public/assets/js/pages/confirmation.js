/* Addabill confirmation: the Household, annual and Free variants from the query and the order held in
   sessionStorage by checkout; the seal settling and the order check drawing (CUR-011); the order card;
   the what happens next timeline; the optional login offer (no real account is made); the DOM month
   for mobile and reduced motion. */
(function () {
  'use strict';
  var AB = window.AB, doc = document;
  if (!AB) return;
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  AB.onReady(function () {
    var qs = new URLSearchParams(location.search), order = null;
    try { order = JSON.parse(sessionStorage.getItem('addabill.order') || 'null'); } catch (e) { order = null; }
    if (!order && window.__abOrder) order = window.__abOrder;
    /* no order and no plan named: nothing was placed, so this is not a confirmation. Back to the plans. */
    if (!order && !qs.get('plan')) { location.replace('/plans'); return; }
    var PLANS = window.Cart ? window.Cart.PLANS : null;
    var planId = (order && order.plan) || qs.get('plan') || 'household-monthly';
    if (!PLANS || !PLANS[planId]) planId = 'household-monthly';
    var plan = PLANS ? PLANS[planId] : null;
    var term = (order && order.term) || qs.get('term') || (planId === 'household-annual' ? 'annual' : planId === 'free' ? 'none' : 'monthly');
    var isFree = planId === 'free', isAnnual = term === 'annual' || planId === 'household-annual';
    window.__abOrderView = { isFree: isFree, isAnnual: isAnnual, planId: planId };

    /* H1 and the paragraph */
    var h1 = doc.getElementById('confirm-title');
    function setHeading(el, text) { if (!el) return; el.textContent = text; delete el.dataset.split; AB.splitWords(el, 'hw').forEach(function (w) { AB.applyHover('settle', w); }); }
    setHeading(h1, isFree ? 'Sorted. Your Free plan starts now.' : 'Sorted. Your Household plan starts now.');
    var para = doc.getElementById('confirm-para');
    if (para && isFree) para.textContent = "Thanks for choosing the Free plan. Your receipt is on its way by email and by text to the number on your order, and the plan is attached to that email from this minute. Open the Addabill app, add the first bill the house gets, and its heads-up is on the calendar before you've set the phone down.";
    doc.title = 'Sorted, your ' + (isFree ? 'Free' : 'Household') + ' plan | Addabill';

    /* the order card */
    function set(id, v) { var el = doc.getElementById(id); if (el) el.textContent = v; }
    function hideRow(id) { var dd = doc.getElementById(id); if (dd) { var dt = dd.previousElementSibling; dd.remove(); if (dt) dt.remove(); } }
    set('order-plan', isFree ? 'Free' : (plan ? plan.title : 'Household'));
    set('order-price', isFree ? '$0' : (plan ? plan.price : ''));
    set('order-renews', isFree ? 'Never' : (plan ? plan.renew : ''));
    if (order && order.email) set('order-email', order.email); else hideRow('order-email');
    if (order && order.phone) set('order-phone', order.phone); else hideRow('order-phone');
    set('order-ref', order && order.ref ? order.ref : 'Preview');
    if (order && order.firstName) { var note = doc.getElementById('order-note'); if (note) note.textContent = 'Placed for ' + order.firstName + ' ' + order.lastName + '. No charge is made on this preview site.'; }

    /* what happens next: the renewal item by variant */
    var renewal = doc.getElementById('next-renewal');
    if (renewal) {
      if (isFree) renewal.remove();
      else if (isAnnual) { set('next-renewal-when', 'In a year: the renewal.'); set('next-renewal-what', '$40, same price, with a text and an email 7 days before.'); }
    }

    /* the seal settles and the order check draws */
    var seal = doc.getElementById('c-seal'), check = doc.getElementById('order-check');
    if (seal && check) {
      var dots = AB.$$('.d', seal), mark = check.querySelector('.order-check__mark');
      if (AB.motion.rm || !window.gsap) { check.classList.add('is-drawn'); }
      else {
        gsap.set(seal, { rotate: -6, transformOrigin: '50% 50%' });
        gsap.set(dots, { scale: 0, transformOrigin: '50% 50%' });
        gsap.set(check, { scale: 0.6, opacity: 0, transformOrigin: '50% 50%' });
        var len = 1000; mark.style.strokeDasharray = len; mark.style.strokeDashoffset = len;
        gsap.timeline({ delay: 0.2 })
          .to(seal, { rotate: 0, duration: AB.D.slow, ease: 'headsup' }, 0)
          .to(dots, { scale: 1, duration: AB.D.fast, ease: 'headsup', stagger: 0.02 }, 0.2)
          .to(check, { scale: 1, opacity: 1, duration: AB.D.base, ease: 'headsup' }, 0.9)
          .to(mark, { strokeDashoffset: 0, duration: AB.D.base, ease: 'headsup', onComplete: function () { check.classList.add('is-drawn'); AB.announce('Order placed. ' + (isFree ? 'Your Free plan starts now.' : 'Your Household plan starts now.')); } }, 1.15);
      }
    }

    /* the login offer: optional, no real account */
    var toggle = doc.querySelector('.account-offer__toggle'), aform = doc.getElementById('account-form'), done = doc.getElementById('account-done');
    if (toggle && aform) {
      var email = doc.getElementById('acct-email'), pass = doc.getElementById('acct-pass');
      if (order && order.email && email) email.value = order.email;
      toggle.addEventListener('click', function () { var open = toggle.getAttribute('aria-expanded') === 'true'; toggle.setAttribute('aria-expanded', open ? 'false' : 'true'); aform.hidden = open; if (!open) (email.value ? pass : email).focus(); });
      aform.addEventListener('submit', function (e) {
        e.preventDefault(); aform.dataset.submitted = '1';
        var errors = [];
        var ev = email.value.trim(); if (!ev) errors.push(AB.form.setError(email, 'Enter your email address.')); else if (!EMAIL.test(ev)) errors.push(AB.form.setError(email, 'Enter an email address in the correct format, like name@example.com.')); else AB.form.clearError(email);
        if (!pass.value) errors.push(AB.form.setError(pass, 'Enter a password.')); else if (pass.value.length < 8) errors.push(AB.form.setError(pass, 'Enter a password of at least 8 characters.')); else AB.form.clearError(pass);
        AB.form.summary(aform, errors, 'Check these before you create the login');
        if (errors.length) return;
        aform.hidden = true; toggle.hidden = true;
        AB.stamp(done, 'Login saved for ' + ev, { check: true, replace: true });
      });
      AB.form.blurValidate(email, function () { var v = email.value.trim(); if (!v) AB.form.setError(email, 'Enter your email address.'); else if (!EMAIL.test(v)) AB.form.setError(email, 'Enter an email address in the correct format, like name@example.com.'); else AB.form.clearError(email); });
      AB.form.blurValidate(pass, function () { if (!pass.value) AB.form.setError(pass, 'Enter a password.'); else if (pass.value.length < 8) AB.form.setError(pass, 'Enter a password of at least 8 characters.'); else AB.form.clearError(pass); });
    }

    /* the DOM month for mobile and reduced motion: this month, today marked, the plan tag landing */
    var grid = doc.getElementById('confirm-dom-grid'), monthName = doc.getElementById('confirm-dom-month');
    if (grid) {
      var now = new Date(), y = now.getFullYear(), m = now.getMonth(), today = now.getDate();
      var firstDow = new Date(y, m, 1).getDay(), daysIn = new Date(y, m + 1, 0).getDate(), prevDays = new Date(y, m, 0).getDate();
      var names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      if (monthName) monthName.textContent = names[m] + ' ' + y;
      var html = '', total = Math.ceil((firstDow + daysIn) / 7) * 7;
      for (var i = 0; i < total; i++) {
        if (i < firstDow) html += '<i data-n="' + (prevDays - firstDow + 1 + i) + '" class="dim"></i>';
        else if (i - firstDow + 1 > daysIn) html += '<i data-n="' + (i - firstDow + 1 - daysIn) + '" class="dim"></i>';
        else { var d = i - firstDow + 1; html += '<i data-n="' + d + '"' + (d === today ? ' class="today"' : '') + '>' + (d === today ? '<b class="tag confirm-dom__tag">' + (isFree ? 'Free' : 'Household') + ' plan</b>' : '') + '</i>'; }
      }
      grid.innerHTML = html;
      var dom = doc.getElementById('confirm-dom');
      if (dom && (AB.motion.mobileHero || AB.motion.rm)) { dom.hidden = false; setTimeout(function () { dom.classList.add('is-landed'); }, AB.motion.rm ? 0 : 500); }
    }
  });
})();
