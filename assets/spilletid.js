/* Login foran spillene, og måling af spilletid.

   Bruges af spillersiderne (/spil/ og /spil/runeborg/):

     LFSpil.start({
       spil: 'regnehelten',           // skal stå i SPIL i api/_kerne.php
       kraevLogin: true,              // sendes til /login, hvis ingen er logget ind
       bruger: function (mig) {},     // kaldes med svaret fra /api/konto.php?handling=mig
       aktiv: false                   // tæl først, når siden siger LFSpil.aktiv(true)
     });
     LFSpil.lyt(iframe.contentWindow) // tastatur og klik inde i en ramme tæller også

   HVAD DER TÆLLER SOM SPILLETID. Et sekund tæller, når siden er fremme på
   skærmen, spillet er i gang, og nogen har rørt tastatur, mus eller skærm
   inden for de sidste to minutter. Et barn, der går fra computeren med
   spillet åbent, bliver altså ikke ved med at tælle. Tiden bliver sendt
   hvert halve minut, og resten med sendBeacon, når fanen lukkes.

   Login-kravet er lavet i JavaScript og er ikke en lås: filerne kan stadig
   hentes direkte. Det er til at vide, hvem der tester — ikke til at
   beskytte noget. */

var LFSpil = (function () {
  var TOMGANG = 120 * 1000;     // ms uden berøring, før tiden holder pause
  var HVER = 30;                // sekunder mellem hver sending

  var spil = '', aktiv = true, logget_ind = false;
  var omgang = 0, venter = 0, sidstRoert = Date.now(), siden = 0;

  function roert() { sidstRoert = Date.now(); }

  function lyt(win) {
    try {
      ['keydown', 'pointerdown', 'pointermove', 'touchstart', 'wheel'].forEach(function (t) {
        win.addEventListener(t, roert, { passive: true, capture: true });
      });
    } catch (e) { /* en ramme fra et andet domæne — så må det være */ }
  }

  function login(til) {
    location.replace('/login?til=' + encodeURIComponent(til || location.pathname + location.search));
  }

  function krop(sek) {
    return JSON.stringify({ handling: 'puls', spil: spil, id: omgang, sek: sek });
  }

  function send() {
    if (!logget_ind || venter <= 0) return;
    var sek = venter;
    venter = 0;
    fetch('/api/spilletid.php', {
      method: 'POST', credentials: 'same-origin', keepalive: true,
      headers: { 'Content-Type': 'application/json' }, body: krop(sek)
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d.ok) omgang = d.id;
      else if (d.besked === 'Ikke logget ind.') { logget_ind = false; }
    }).catch(function () { venter += sek; });   // prøv igen næste gang
  }

  // Når fanen forsvinder, er der ikke tid til at vente på et svar
  function sendNu() {
    if (!logget_ind || venter <= 0) return;
    var data = krop(venter);
    venter = 0;
    try {
      if (navigator.sendBeacon) navigator.sendBeacon('/api/spilletid.php', data);
      else fetch('/api/spilletid.php', { method: 'POST', body: data, keepalive: true, credentials: 'same-origin' });
    } catch (e) { /* så er det tabt — det er højst et halvt minut */ }
  }

  function tik() {
    if (!logget_ind || !aktiv) return;
    if (document.visibilityState !== 'visible') return;
    if (Date.now() - sidstRoert > TOMGANG) return;
    venter++;
    if (++siden >= HVER) { siden = 0; send(); }
  }

  function start(o) {
    spil = o.spil;
    if (o.aktiv === false) aktiv = false;
    var harCookie = /(?:^|;\s*)lf_in=/.test(document.cookie);

    // Uden cookie er der ingen grund til at spørge serveren først
    if (o.kraevLogin && !harCookie) { login(); return; }

    lyt(window);
    if (!harCookie) return;

    fetch('/api/konto.php?handling=mig', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.logget_ind) { if (o.kraevLogin) login(); return; }
        logget_ind = true;
        sidstRoert = Date.now();
        if (o.bruger) o.bruger(d);
      })
      .catch(function () {
        // Serveren svarer ikke. Så lader vi hellere barnet spille end at
        // spærre af — tiden bliver bare ikke talt.
      });

    setInterval(tik, 1000);
    window.addEventListener('pagehide', sendNu);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') sendNu();
    });
  }

  function logUd(til) {
    sendNu();
    fetch('/api/konto.php', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-LF': '1' },
      body: JSON.stringify({ handling: 'logud' })
    }).catch(function () {}).then(function () { location.replace(til || '/login'); });
  }

  return {
    start: start,
    lyt: lyt,
    aktiv: function (v) { aktiv = !!v; if (v) roert(); },
    logUd: logUd
  };
})();
