/* Addabill cart.js. One plan line at most (Free, Household monthly, Household annual).
   localStorage with an in memory fallback, the header count badge, the cart drawer,
   ?plan= helpers and the designed empty states. Exposed as window.Cart.
   Page scripts call Cart.add(planId), Cart.get(), Cart.remove(), Cart.open(), Cart.close(),
   Cart.setTerm('monthly'|'annual'), Cart.planFromQuery(), Cart.PLANS. Every change dispatches
   'cart:change' on document with detail { line, previous, reason }. */
(function () {
  'use strict';
  var KEY = 'addabill.cart.v1', doc = document, mem = null;
  var PLANS = {
    'free': { id: 'free', name: 'Free', title: 'Free plan', term: null, termLabel: 'No term', price: '$0', priceLine: '$0. No card, no time limit.', renew: 'Never', renewLine: 'Never renews. Free is $0 with no card on file and no time limit.', amount: 0, fees: 'None', checkout: '/checkout?plan=free', cta: 'Use the Free plan' },
    'household-monthly': { id: 'household-monthly', name: 'Household', title: 'Household, monthly', term: 'monthly', termLabel: 'Monthly', price: '$5 a month', priceLine: '$5 a month', renew: 'On this date each month, same price', renewLine: 'Renews on this date each month at $5, same price. Cancel any time.', amount: 5, fees: 'None', checkout: '/checkout?plan=household-monthly', cta: 'Purchase the Household plan' },
    'household-annual': { id: 'household-annual', name: 'Household', title: 'Household, annual', term: 'annual', termLabel: 'Annual', price: '$40 a year', priceLine: '$40 a year', renew: 'In a year, same price, with a text and an email 7 days before', renewLine: 'Renews in a year at $40, same price, with a text and an email 7 days before. Cancel any time.', amount: 40, fees: 'None', checkout: '/checkout?plan=household-annual', cta: 'Buy the annual plan' }
  };
  function store() { try { var t = '__t'; localStorage.setItem(t, '1'); localStorage.removeItem(t); return localStorage; } catch (e) { return null; } }
  var ls = store();
  function read() {
    if (ls) { try { var raw = ls.getItem(KEY); if (raw) { var o = JSON.parse(raw); if (o && PLANS[o.plan]) return o; } } catch (e) {} return null; }
    return mem;
  }
  function write(line) {
    if (ls) { try { if (line) ls.setItem(KEY, JSON.stringify(line)); else ls.removeItem(KEY); } catch (e) { mem = line; } }
    else mem = line;
  }
  function emit(line, previous, reason) {
    doc.dispatchEvent(new CustomEvent('cart:change', { detail: { line: line, previous: previous, reason: reason } }));
    renderBadge(); renderDrawer(reason, previous);
  }
  var Cart = window.Cart = {
    PLANS: PLANS,
    get: function () { var l = read(); return l ? Object.assign({}, PLANS[l.plan], { addedAt: l.at }) : null; },
    count: function () { return read() ? 1 : 0; },
    add: function (planId, opts) {
      if (!PLANS[planId]) return null;
      var prev = read(), line = { plan: planId, at: Date.now() };
      write(line);
      var reason = prev ? (prev.plan === planId ? 'same' : 'swap') : 'add';
      emit(PLANS[planId], prev ? PLANS[prev.plan] : null, reason);
      if (opts && opts.open) Cart.open();
      var tag = doc.querySelector('.cart-tag'); if (tag) { tag.classList.remove('is-bumped'); void tag.offsetWidth; tag.classList.add('is-bumped'); }
      return PLANS[planId];
    },
    setTerm: function (term) { var l = read(); if (!l || l.plan === 'free') return; Cart.add(term === 'annual' ? 'household-annual' : 'household-monthly'); },
    remove: function () { var prev = read(); write(null); emit(null, prev ? PLANS[prev.plan] : null, 'remove'); },
    clear: function () { write(null); emit(null, null, 'clear'); },
    planFromQuery: function () { var p = new URLSearchParams(location.search).get('plan'); return p && PLANS[p] ? p : null; },
    ensureFromQuery: function () { var p = Cart.planFromQuery(); if (p) { var cur = read(); if (!cur || cur.plan !== p) Cart.add(p); } return Cart.get(); },
    open: function () { setOpen(true); },
    close: function () { setOpen(false); },
    isOpen: function () { var d = doc.getElementById('cart-drawer'); return !!(d && d.classList.contains('is-open')); }
  };

  /* badge */
  function renderBadge() {
    var n = Cart.count();
    doc.querySelectorAll('.cart-count').forEach(function (el) { el.textContent = n; });
    doc.querySelectorAll('.cart-tag').forEach(function (el) { el.setAttribute('aria-label', 'Cart, ' + n + (n === 1 ? ' item' : ' items')); });
  }

  /* drawer */
  var lastFocus = null;
  function setOpen(open) {
    var d = doc.getElementById('cart-drawer'), s = doc.getElementById('cart-scrim');
    if (!d) return;
    d.classList.toggle('is-open', open); if (s) s.classList.toggle('is-open', open);
    d.setAttribute('aria-hidden', open ? 'false' : 'true');
    doc.body.classList.toggle('drawer-open', open);
    if (open) { lastFocus = doc.activeElement; renderDrawer(); var c = d.querySelector('.drawer__close'); if (c) c.focus(); }
    else if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function renderDrawer(reason, previous) {
    var body = doc.getElementById('cart-body'), foot = doc.getElementById('cart-foot'), note = doc.getElementById('cart-note');
    if (!body) return;
    var line = Cart.get();
    if (!line) {
      body.innerHTML = '<div class="cart-empty"><p class="lead">Your cart is empty. The plans are one tap away.</p><a class="tag-btn tag-btn--secondary" href="/plans"><span class="lbl">See the plans</span></a></div>';
      if (foot) foot.innerHTML = '';
    } else {
      var isHousehold = line.name === 'Household';
      body.innerHTML =
        '<div class="cart-line">' +
          '<p class="plan-title">' + esc(line.title) + '</p>' +
          '<dl><dt>Price</dt><dd>' + esc(line.price) + '</dd><dt>Renews</dt><dd>' + esc(line.renew) + '</dd><dt>Fees on your bills</dt><dd>None</dd></dl>' +
          (isHousehold ? '<div class="term-switch" role="group" aria-label="Household term"><button type="button" data-term="monthly" aria-pressed="' + (line.term === 'monthly') + '">Monthly, $5</button><button type="button" data-term="annual" aria-pressed="' + (line.term === 'annual') + '">Annual, $40</button></div>' : '') +
          '<p class="u-mt-4 u-mb-0"><button type="button" class="remove-btn" data-cart-remove>Remove</button></p>' +
        '</div>';
      if (foot) foot.innerHTML = '<a class="tag-btn tag-btn--block" href="/checkout"><span class="lbl">Checkout</span></a><p class="small muted u-mb-0">' + esc(line.renewLine) + '</p>';
    }
    if (note) {
      var msg = '';
      if (reason === 'swap' && line) msg = 'Swapped to ' + line.title.replace('Household, ', 'Household, ') + '.';
      else if (reason === 'add' && line) msg = 'Added ' + line.title + '.';
      else if (reason === 'remove') msg = 'Removed. Your cart is empty.';
      note.textContent = msg;
    }
    doc.querySelectorAll('.tag-btn').forEach(function (b) { var l = b.querySelector('.lbl'); if (l && !l.querySelector('span')) { var t = l.textContent; l.innerHTML = '<span></span><span aria-hidden="true"></span>'; l.firstChild.textContent = t; l.lastChild.textContent = t; } });
  }

  doc.addEventListener('click', function (e) {
    var t = e.target.closest('[data-cart-add]'); if (t) { Cart.add(t.dataset.cartAdd, { open: t.hasAttribute('data-cart-open-after') }); if (t.hasAttribute('data-cart-open-after')) e.preventDefault(); return; }
    if (e.target.closest('[data-cart-open]')) { e.preventDefault(); Cart.open(); return; }
    if (e.target.closest('[data-cart-close]')) { e.preventDefault(); Cart.close(); return; }
    if (e.target.closest('[data-cart-remove]')) { e.preventDefault(); Cart.remove(); return; }
    var term = e.target.closest('[data-term]'); if (term && term.closest('#cart-drawer')) { Cart.setTerm(term.dataset.term); return; }
  });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && Cart.isOpen()) Cart.close(); });
  window.addEventListener('storage', function (e) { if (e.key === KEY) { renderBadge(); renderDrawer(); } });
  if (doc.readyState !== 'loading') { renderBadge(); renderDrawer(); } else doc.addEventListener('DOMContentLoaded', function () { renderBadge(); renderDrawer(); });
})();
