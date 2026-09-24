/* About: the seal settling on the pull quote interlude and the settled DOM wall calendar used on
   mobile and under reduced motion. The wall calendar scene itself is about-scene.js (after first paint). */
(function () {
  'use strict';
  var AB = window.AB, doc = document;
  if (!AB) return;
  AB.onReady(function () {
    var wall = doc.getElementById('about-wall');
    if (wall && (AB.motion.rm || AB.motion.mobileHero)) { wall.hidden = false; var m = doc.getElementById('about-scene'); if (m) m.classList.add('is-dom'); }
    var seal = doc.getElementById('about-seal');
    if (seal) {
      if (AB.motion.rm || !window.ScrollTrigger) { seal.classList.add('is-in'); }
      else ScrollTrigger.create({ trigger: seal, start: 'top 80%', once: true, onEnter: function () { seal.classList.add('is-in'); } });
    }
  });
})();
