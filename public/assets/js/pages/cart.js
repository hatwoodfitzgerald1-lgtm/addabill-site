/* Addabill /cart page: the drawer's content rendered full width from window.Cart, with the
   monthly/annual switch, Remove, the Checkout paper tag and the designed empty state.
   The dimmed small months scene behind it comes from plans-scene.js. */
(function () {
  'use strict';
  var AB = window.AB, doc = document;
  if (!AB) return;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function labelButtons(root) {
    AB.$$('.tag-btn', root).forEach(function (b) { var l = b.querySelector('.lbl'); if (l && !l.querySelector('span')) { var t = l.textContent; l.innerHTML = '<span></span><span aria-hidden="true"></span>'; l.firstChild.textContent = t; l.lastChild.textContent = t; } b.style.setProperty('--tag-w', b.offsetWidth + 'px'); });
  }
  function render(reason) {
    var Cart = window.Cart; if (!Cart) return;
    var line = Cart.get(), panel = doc.getElementById('cart-page-line'), aside = doc.getElementById('cart-page-aside'), note = doc.getElementById('cart-page-note'), grid = doc.getElementById('cart-page-grid');
    if (!panel || !aside) return;
    if (!line) {
      panel.innerHTML = '<div class="cart-page__empty"><p class="lead">Your cart is empty. The plans are one tap away.</p><a class="tag-btn tag-btn--secondary" href="/plans"><span class="lbl">See the plans</span></a></div>';
      aside.innerHTML = '<p class="small muted">Free is $0 with no card. Household is $5 a month or $40 a year, no fees on your bills, cancel any time.</p>';
      grid.classList.add('is-empty');
    } else {
      var isHousehold = line.name === 'Household';
      panel.innerHTML =
        '<p class="plan-title">' + esc(line.title) + '</p>' +
        '<dl><dt>Price</dt><dd>' + esc(line.price) + '</dd><dt>Renews</dt><dd>' + esc(line.renew) + '</dd><dt>Fees on your bills</dt><dd>None</dd><dt>Total</dt><dd>' + esc(line.price) + '</dd></dl>' +
        (isHousehold ? '<div class="term-switch" role="group" aria-label="Household term"><button type="button" data-term="monthly" aria-pressed="' + (line.term === 'monthly') + '">Monthly, $5</button><button type="button" data-term="annual" aria-pressed="' + (line.term === 'annual') + '">Annual, $40</button></div>' : '') +
        '<p class="u-mb-0"><button type="button" class="remove-btn" data-cart-remove>Remove</button></p>';
      aside.innerHTML = '<a class="tag-btn tag-btn--block" href="/checkout"><span class="lbl">Checkout</span></a><p class="small muted">' + esc(line.renewLine) + '</p><p class="small muted">No account needed. Pay for the plan, get your receipt, and we\'ll offer you a login afterward if you want one.</p>';
      grid.classList.remove('is-empty');
    }
    if (note) {
      var msg = '';
      if (reason === 'swap' && line) msg = 'Swapped to ' + line.title + '.';
      else if (reason === 'remove') msg = 'Removed. Your cart is empty.';
      note.textContent = msg;
    }
    labelButtons(panel); labelButtons(aside);
  }
  AB.onReady(function () {
    render();
    doc.addEventListener('cart:change', function (e) { render(e.detail && e.detail.reason); });
    doc.addEventListener('click', function (e) {
      var t = e.target.closest('#cart-page-line [data-term]'); if (t && window.Cart) { window.Cart.setTerm(t.dataset.term); }
    });
  });
})();
