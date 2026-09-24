/* Contact: the form (field discipline, validation on blur with a delay, GOV.UK messages beside the field
   and in a summary, values never cleared, Enter submits, the stamped tag as the success state; no real send)
   and the settled DOM fridge used on mobile and under reduced motion (it tilts with the scroll on touch).
   The fridge door scene itself is contact-scene.js, loaded after first paint. */
(function () {
  'use strict';
  var AB = window.AB, doc = document;
  if (!AB) return;

  var MSG = {
    name: 'Enter your name.',
    email: 'Enter an email address in the correct format, like name@example.com.',
    phone: 'Enter a 10 digit US phone number, like 214 555 0100.',
    message: 'Enter your message.'
  };

  function form() {
    var f = doc.getElementById('contact-form'), sent = doc.getElementById('contact-sent');
    if (!f) return;
    var name = doc.getElementById('c-name'), email = doc.getElementById('c-email'), phone = doc.getElementById('c-phone'), message = doc.getElementById('c-message'), btn = doc.getElementById('contact-send');
    var checks = {
      name: function () { return name.value.trim() ? null : MSG.name; },
      email: function () { var v = email.value.trim(); return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? null : MSG.email; },
      phone: function () { var d = phone.value.replace(/\D/g, ''); if (!phone.value.trim()) return null; if (d.length === 11 && d[0] === '1') d = d.slice(1); return d.length === 10 ? null : MSG.phone; },
      message: function () { return message.value.trim() ? null : MSG.message; }
    };
    var fields = { name: name, email: email, phone: phone, message: message };
    function validateOne(key) {
      var msg = checks[key](), el = fields[key];
      if (msg) return AB.form.setError(el, msg);
      AB.form.clearError(el); return null;
    }
    Object.keys(fields).forEach(function (k) {
      AB.form.blurValidate(fields[k], function () { validateOne(k); if (f.dataset.submitted === '1') refreshSummary(); });
    });
    function refreshSummary() {
      var errors = [];
      Object.keys(fields).forEach(function (k) { var e = fields[k].closest('.field').querySelector('.field-error'); if (e) errors.push({ id: fields[k].id, msg: e.textContent }); });
      var s = f.querySelector('.error-summary');
      if (!errors.length && s) s.remove();
      else if (errors.length && s) { var ul = s.querySelector('ul'); ul.innerHTML = ''; errors.forEach(function (er) { var li = doc.createElement('li'); var a = doc.createElement('a'); a.href = '#' + er.id; a.textContent = er.msg; a.addEventListener('click', function (ev) { ev.preventDefault(); doc.getElementById(er.id).focus(); }); li.appendChild(a); ul.appendChild(li); }); }
    }
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      f.dataset.submitted = '1';
      var errors = [];
      Object.keys(fields).forEach(function (k) { var r = validateOne(k); if (r) errors.push(r); });
      AB.form.summary(f, errors, 'Check these before you send');
      if (errors.length) return;
      /* CUR-011: the paper tag spinner, then the stamped confirmation. No real send is made. */
      btn.setAttribute('aria-disabled', 'true'); btn.disabled = true;
      btn.innerHTML = '<span class="tag-spinner"></span><span class="lbl"><span>Sending</span></span>';
      var who = name.value.trim();
      setTimeout(function () {
        f.hidden = true; sent.hidden = false;
        sent.innerHTML = '';
        AB.stamp(sent, 'Sent. Support answers within one business day.', { check: true, announce: true });
        var p = doc.createElement('p'); p.textContent = 'Thanks, ' + who + '. The reply comes to ' + email.value.trim() + (phone.value.trim() ? ', or by text if that is what you asked for.' : '.'); sent.appendChild(p);
        sent.setAttribute('tabindex', '-1'); sent.focus({ preventScroll: true });
      }, AB.motion.rm ? 60 : 700);
    });
  }

  /* the settled DOM fridge: on touch it tilts with the scroll, under reduced motion it stays still */
  function domFridge() {
    var fr = doc.getElementById('contact-fridge'); if (!fr) return;
    if (!(AB.motion.rm || AB.motion.mobileHero)) return;
    fr.hidden = false;
    if (AB.motion.rm || !window.gsap || !window.ScrollTrigger) return;
    var paper = fr.querySelector('.fridge__paper'), hero = fr.closest('.contact-hero');
    fr.classList.add('is-tilt');
    ScrollTrigger.create({
      trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6,
      onUpdate: function (st) { var p = st.progress; gsap.set(fr, { rotateX: (0.5 - p) * 14, rotateY: (p - 0.5) * 10, transformPerspective: 1400 }); gsap.set(paper, { rotate: -2 + p * 3 }); },
      onRefresh: function (st) { AB.qa.arc(st.start, st.end, 'Contact fridge tilt (DOM)'); }
    });
  }

  /* the map shows the whole of north Dallas on desktop and zooms to the office on a phone */
  function map() {
    var svg = AB.$('.contact-map__svg'); if (!svg) return;
    function apply() { var m = window.matchMedia('(max-width: 699px)').matches; svg.setAttribute('viewBox', m ? svg.dataset.viewboxMobile : svg.dataset.viewboxDesktop); }
    apply(); window.addEventListener('resize', apply);
  }

  AB.onReady(function () { form(); domFridge(); map(); });
})();
