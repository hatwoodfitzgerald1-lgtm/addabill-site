/* Addabill blog index: topic chips as plain client side filters (aria-pressed), whole card
   click through, and the settled DOM year strip shown wherever the WebGL year does not run
   (mobile, reduced motion, no WebGL). The scene itself is blog-scene.js, lazy loaded by core.js. */
(function () {
  'use strict';
  var AB = window.AB, doc = document;
  if (!AB) return;

  /* the four posts and the months they belong to (also read by blog-scene.js) */
  var POSTS = window.__blogPosts = [
    { key: 'a', month: 9, topic: 'Getting organized', short: 'One evening', href: '/blog/every-bill-on-one-calendar-in-an-evening' },
    { key: 'b', month: 8, topic: 'Autopay', short: 'Autopay', href: '/blog/autopay-is-not-a-plan' },
    { key: 'c', month: 7, topic: 'Systems', short: 'Four systems', href: '/blog/sticky-notes-spreadsheet-reminder-app' },
    { key: 'd', month: 6, topic: 'Late fees', short: 'The late fee', href: '/blog/what-a-late-fee-costs' }
  ];

  function filters() {
    var chips = AB.$$('.topic-chip'), grid = doc.getElementById('blog-masonry'), status = doc.getElementById('topics-status');
    var empty = doc.getElementById('blog-empty'), reset = doc.getElementById('blog-empty-reset');
    if (!chips.length || !grid) return;
    var cards = AB.$$('.post-card', grid);
    function apply(topic, label) {
      var shown = 0;
      cards.forEach(function (c) { var on = !topic || c.dataset.topic === topic; c.hidden = !on; if (on) shown++; });
      chips.forEach(function (ch) { ch.setAttribute('aria-pressed', ch.dataset.topic === topic ? 'true' : 'false'); });
      grid.classList.toggle('is-filtered', !!topic);
      if (empty) empty.hidden = shown > 0;
      if (status) status.textContent = !topic ? 'Showing all four pieces.' : (shown === 1 ? 'Showing one piece about ' + label.toLowerCase() + '.' : 'Showing ' + shown + ' pieces about ' + label.toLowerCase() + '.');
      /* re play the flip for the cards that just came back into view */
      if (!AB.motion.rm && window.gsap) {
        var vis = cards.filter(function (c) { return !c.hidden; });
        gsap.fromTo(vis, { rotateX: -40, opacity: 0, transformOrigin: '50% 0%' }, { rotateX: 0, opacity: 1, duration: AB.D.base, ease: 'headsup', stagger: 0.08, clearProps: 'transform' });
      }
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    }
    chips.forEach(function (ch) {
      ch.addEventListener('click', function () {
        var t = ch.dataset.topic;
        var already = ch.getAttribute('aria-pressed') === 'true';
        if (already && t) { apply('', ''); return; }
        apply(t, ch.textContent.trim());
      });
    });
    if (reset) reset.addEventListener('click', function () { apply('', ''); chips[0].focus(); });
  }

  /* the whole card opens the piece; the headline link is the real link */
  function cardClicks() {
    AB.$$('.post-card').forEach(function (card) {
      var link = card.querySelector('h2 a, h3 a'); if (!link) return;
      card.addEventListener('click', function (e) {
        if (e.target.closest('a, button')) return;
        if (e.metaKey || e.ctrlKey) { window.open(link.href, '_blank', 'noopener'); return; }
        link.click();
      });
    });
  }

  /* the settled year: twelve small months with a tag standing on each post's month */
  function settledYear() {
    var host = doc.getElementById('blog-year-settled'); if (!host || host.dataset.built) return;
    host.dataset.built = '1';
    var now = new Date(), y = now.getFullYear(), names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var html = '<div class="yr">';
    for (var m = 0; m < 12; m++) {
      var first = new Date(y, m, 1).getDay(), n = new Date(y, m + 1, 0).getDate(), cells = '';
      for (var p = 0; p < first; p++) cells += '<i class="pad"></i>';
      for (var d = 1; d <= n; d++) cells += '<i' + (m === now.getMonth() && d === now.getDate() ? ' class="today"' : '') + '></i>';
      var post = POSTS.filter(function (pp) { return pp.month === m + 1; })[0];
      html += '<div class="yr-month' + (m === now.getMonth() ? ' is-current' : '') + '">' + (post ? '<span class="tag">' + post.short + '</span>' : '') + '<p class="yr-month__name"><span>' + names[m] + '</span></p><div class="yr-month__grid">' + cells + '</div></div>';
    }
    host.innerHTML = html + '</div>';
    /* scroll the strip so the post months are in view */
    var yr = host.firstChild, target = yr.children[5]; if (target && yr.scrollTo) { try { yr.scrollTo({ left: Math.max(0, target.offsetLeft - 16), behavior: 'auto' }); } catch (e) {} }
  }
  AB.blogSettledYear = settledYear;

  AB.onReady(function () {
    filters();
    cardClicks();
    if (AB.motion.rm || AB.motion.mobileHero) { settledYear(); var h = doc.getElementById('blog-year-settled'); if (h) h.hidden = false; }
  });
})();
