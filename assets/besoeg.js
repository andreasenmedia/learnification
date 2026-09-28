/* Besøgsstatistik — vores egen.

   UDEN SAMTYKKE (alle): sender én lille besked til /api/besoeg.php, hver
   gang en side bliver vist: hvilken side, hvilken af vores egne sider man
   kom fra, hvilket andet site (kun navnet, fx "google.com") der linkede
   hertil, og en evt. kampagne fra ?utm_campaign=. Intet bliver gemt i
   browseren, og serveren kan ikke genkende nogen fra dag til dag.

   MED SAMTYKKE til statistik (assets/samtykke.js): der bliver også sat
   cookien lf_bes med et tilfældigt id i 12 måneder, og det id kommer med.
   Så kan vi se, om folk kommer igen, og hvilken kilde der førte til en
   tilmelding flere dage senere. Trækkes samtykket tilbage, bliver cookien
   slettet (af samtykke.js).

   MÅL: LFMaal('nyhedsbrev') osv. tæller en konvertering. Kaldes fra de
   sider, hvor det sker — se MAAL i api/besoeg.php for de gyldige navne.

   Har man bedt browseren om ikke at blive fulgt (Do Not Track eller Global
   Privacy Control), sender den ingenting. Hvad serveren gør med beskeden,
   står øverst i api/besoeg.php og på /privatliv. */
(function () {
  'use strict';
  var mig = document.currentScript;
  var slukket = false;

  function sigerNej() {
    return navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true
      || !navigator.sendBeacon || location.protocol === 'file:';
  }

  // Statistik-cookien — kun med samtykke
  function bid() {
    if (!window.LFSamtykke || !LFSamtykke.har('statistik')) return '';
    var m = document.cookie.match(/(?:^|;\s*)lf_bes=([0-9a-f]{16})/);
    var id = m ? m[1] : '';
    if (!id) {
      var a = new Uint8Array(8);
      crypto.getRandomValues(a);
      id = Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    }
    // Sættes igen ved hvert besøg, men aldrig længere end 12 måneder fra nu
    document.cookie = 'lf_bes=' + id + '; path=/; max-age=' + 365 * 86400 + '; SameSite=Lax'
      + (location.protocol === 'https:' ? '; Secure' : '');
    return id;
  }

  // 404-siden vises på den forkerte adresse, så den siger selv, hvad den er
  function side() {
    return (mig && mig.getAttribute('data-side')) || location.pathname;
  }

  window.LFMaal = function (navn) {
    try {
      if (window.LFSamtykke) LFSamtykke.konvertering(navn);
      if (slukket || sigerNej()) return;
      navigator.sendBeacon('/api/besoeg.php', JSON.stringify({ maal: navn, side: side(), bid: bid() }));
    } catch (e) { /* statistik må aldrig ødelægge en side */ }
  };

  try {
    if (sigerNej()) { slukket = true; return; }

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
    var kampagne = q.get('utm_campaign') || '';

    navigator.sendBeacon('/api/besoeg.php', JSON.stringify({
      side: side(), fra: fra, kilde: kilde, kampagne: kampagne, bid: bid()
    }));
  } catch (e) { /* statistik må aldrig ødelægge en side */ }
})();
