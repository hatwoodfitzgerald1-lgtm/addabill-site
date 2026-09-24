/* Addabill sms.js. Validation and the success state for the verbatim "Join Our SMS List"
   block in the footer (design doc Section 6). Errors appear beneath their control and in a
   summary above the button, never while typing. Success replaces the form with a paper tag
   stamping in, announced by aria-live. No real send is made. */
(function () {
  'use strict';
  var doc = document;
  function init(form) {
    var phone = form.querySelector('input[type="tel"]'), c1 = form.querySelector('input[name="sms-terms"]'), c2 = form.querySelector('input[name="sms-consent"]');
    if (!phone || !c1 || !c2) return;
    var F = window.AB && window.AB.form;
    function digits(v) { return (v || '').replace(/\D/g, ''); }
    function checkPhone() {
      var d = digits(phone.value);
      if (d.length === 11 && d.charAt(0) === '1') d = d.slice(1);
      if (d.length !== 10) { return F.setError(phone, 'Enter a 10 digit US phone number, like 214 555 0100.'); }
      F.clearError(phone); return null;
    }
    function checkC1() { if (!c1.checked) return F.setError(c1, 'Tick the box to agree to the Terms & Privacy Policy.'); F.clearError(c1); return null; }
    function checkC2() { if (!c2.checked) return F.setError(c2, 'Tick the box to agree to receive texts from Addabill.'); F.clearError(c2); return null; }
    [phone, c1, c2].forEach(function (f) { F.blurValidate(f, function () { if (f === phone) checkPhone(); else if (f === c1) checkC1(); else checkC2(); refreshSummary(); }); });
    c1.addEventListener('change', function () { if (form.dataset.submitted === '1') { checkC1(); refreshSummary(); } });
    c2.addEventListener('change', function () { if (form.dataset.submitted === '1') { checkC2(); refreshSummary(); } });
    function refreshSummary() {
      var errs = [];
      [phone, c1, c2].forEach(function (f) { var w = f.closest('.field') || f.parentNode; var e = w.querySelector('.field-error'); if (e) errs.push({ id: f.id, msg: e.textContent }); });
      F.summary(form, errs, 'Check these before you submit');
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      form.dataset.submitted = '1';
      var errs = [checkPhone(), checkC1(), checkC2()].filter(Boolean);
      F.summary(form, errs, 'Check these before you submit');
      if (errs.length) return;
      var btn = form.querySelector('[type="submit"]');
      btn.setAttribute('aria-disabled', 'true');
      btn.innerHTML = '<span class="tag-spinner" aria-hidden="true"></span><span class="lbl"><span>Submitting</span></span>';
      setTimeout(function () {
        var wrap = form.parentNode, box = doc.createElement('div');
        box.className = 'sms-success';
        wrap.replaceChild(box, form);
        window.AB.stamp(box, "You're on the list. Reply HELP for help, STOP to cancel.", { check: true, announce: true });
      }, window.AB && window.AB.motion.rm ? 50 : 480);
    });
  }
  function boot() { doc.querySelectorAll('form[data-sms-form]').forEach(init); }
  if (doc.readyState !== 'loading') boot(); else doc.addEventListener('DOMContentLoaded', boot);
})();
