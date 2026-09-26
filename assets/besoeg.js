/* Besøgsstatistik — vores egen, uden cookies.

   Sender én lille besked til /api/besoeg.php, hver gang en side bliver
   vist: hvilken side, hvilken af vores egne sider man kom fra, og hvilket
   andet site (kun navnet, fx "google.com") der linkede hertil. Intet andet,
   og der bliver ikke gemt noget i browseren.

   Har man bedt browseren om ikke at blive fulgt (Do Not Track eller Global
   Privacy Control), sender den ingenting. Hvad serveren gør med beskeden,
   står øverst i api/besoeg.php og på /privatliv. */
(function () {
  'use strict';
  try {
    if (navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl) return;
    if (!navigator.sendBeacon || location.protocol === 'file:') return;

    // 404-siden vises på den forkerte adresse, så den siger selv, hvad den er
    var mig = document.currentScript;
    var side = (mig && mig.getAttribute('data-side')) || location.pathname;

    var fra = '', kilde = '';
    if (document.referrer) {
      var r = new URL(document.referrer);
      if (r.host === location.host) fra = r.pathname;
      else kilde = r.hostname;
    }
    // Links i nyhedsbreve, opslag og på visitkort kan få ?ref=navn på
    var q = new URLSearchParams(location.search);
    var ref = q.get('ref') || q.get('utm_source');
    if (ref) kilde = ref;

    navigator.sendBeacon('/api/besoeg.php', JSON.stringify({ side: side, fra: fra, kilde: kilde }));
  } catch (e) { /* statistik må aldrig ødelægge en side */ }
})();
