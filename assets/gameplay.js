/* Gameplay-klip på forsiden og i spiloversigten.
   <video data-klip="a.mp4 b.mp4"> afspiller klippene efter hinanden i loop, kun mens
   videoen er på skærmen. Uden JS, ved "reducer bevægelse" eller datasparetilstand
   bliver plakatbilledet stående. Klippene har ingen lyd. */
(function () {
  var videoer = document.querySelectorAll('video[data-klip]');
  if (!videoer.length) return;
  var stille = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var spar = navigator.connection && navigator.connection.saveData;
  if (stille || spar) return;

  videoer.forEach(function (v) {
    var liste = v.dataset.klip.split(/\s+/).filter(Boolean), nr = 0, synlig = false;
    v.muted = true; v.playsInline = true; v.loop = liste.length === 1;
    function load() { v.src = liste[nr]; if (synlig) afspil(); }
    function afspil() { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    v.addEventListener('ended', function () { nr = (nr + 1) % liste.length; load(); });
    v.addEventListener('playing', function () { v.classList.add('spiller'); });
    load();
    if (!('IntersectionObserver' in window)) { synlig = true; afspil(); return; }
    new IntersectionObserver(function (poster) {
      synlig = poster[0].isIntersecting;
      if (synlig) afspil(); else v.pause();
    }, { threshold: 0.25 }).observe(v);
  });
})();
