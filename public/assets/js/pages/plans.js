/* Addabill Plans page script: the empty cart line when checkout sent the visitor here with nothing
   in the cart, and a gentle scroll to a plan card when the footer's #free or #household anchor is used.
   The scene lives in plans-scene.js (lazy), the accordion and reveals in core.js. */
(function () {
  'use strict';
  var AB = window.AB, doc = document;
  if (!AB) return;
  AB.onReady(function () {
    var qs = new URLSearchParams(location.search);
    var note = doc.getElementById('plans-cart-note');
    if (note && qs.get('cart') === 'empty') {
      note.hidden = false;
      AB.announce('Your cart is empty. The plans are one tap away.');
      try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
    }
    /* the card the footer anchor points at gets a short lift so the eye lands on it */
    if (location.hash === '#free' || location.hash === '#household') {
      var card = doc.getElementById(location.hash.slice(1));
      if (card && window.gsap && !AB.motion.rm) {
        setTimeout(function () { gsap.fromTo(card, { y: 10, boxShadow: '0 2px 4px rgba(43,38,34,0.06), 0 22px 44px rgba(43,38,34,0.16)' }, { y: 0, boxShadow: '0 1px 2px rgba(43,38,34,0.06), 0 6px 18px rgba(43,38,34,0.08)', duration: AB.D.slow, ease: 'headsup', clearProps: 'boxShadow,transform' }); }, 300);
      }
    }
  });
})();
