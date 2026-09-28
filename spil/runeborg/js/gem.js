/* Runeborg — gemning på serveren, så man kan spille videre på en anden skærm.

   Er man logget ind, bliver eventyret gemt hos /api/gem.php under barnets
   egen kode (eller den voksnes konto). Kopien i localStorage (game.js)
   bliver ved med at findes, så intet går tabt uden net, og uden login er
   det den eneste.

   TO SKÆRME PÅ ÉN GANG. Serveren giver hvert gemt eventyr et udgavenummer,
   og vi sender altid det nummer med, vi byggede videre på. Har en anden
   skærm gemt noget nyere i mellemtiden, svarer serveren 409 — så gemmer vi
   ikke mere herfra, og spillet beder spilleren hente det nyeste.

   "runeborg-synk-<spiller>" i localStorage husker, hvilken udgave den lokale
   kopi bygger på, og om den nåede op. Gamle eventyr fra før serveren (uden
   den) bliver sendt op første gang, hvis serveren ikke har noget.

     RB.gem.hent(lokalTekst)   -> løfte med den tekst, der skal fortsættes fra
     RB.gem.gem(tekst, nu)     gem (samlet op i 1,5 s, eller med det samme)
     RB.gem.nulstil()          -> løfte; "start forfra" også på serveren
     RB.gem.naarKonflikt(fn)   fn() kaldes, når en anden skærm har gemt nyere
     RB.gem.tagNyeste()        -> teksten fra den anden skærm */
(function () {
  'use strict';
  var RB = window.RB = window.RB || {};
  var SPIL = 'runeborg';
  var inde = (document.cookie.match(/(?:^|;\s*)lf_in=((?:elev|voksen)\.\d+)/) || [])[1] || '';
  var META = 'runeborg-synk' + (inde ? '-' + inde : '');
  var enhed = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  var server = !!inde, udgave = 0, venter = null, timer = null, sender = false;
  var konflikt = false, nyeste = '', nyesteUdgave = 0, lyttere = [];

  function laesMeta() {
    try {
      var m = JSON.parse(localStorage.getItem(META) || 'null');
      if (m && typeof m.udgave === 'number') return m;
    } catch (e) { /* ingenting */ }
    return { udgave: 0, synket: false };
  }
  function skrivMeta(synket) {
    try { localStorage.setItem(META, JSON.stringify({ udgave: udgave, synket: synket })); } catch (e) { /* privat vindue */ }
  }

  function kald(metode, krop, keepalive) {
    var o = { credentials: 'same-origin', cache: 'no-store' };
    if (metode === 'POST') {
      o.method = 'POST'; o.keepalive = !!keepalive;
      o.headers = { 'Content-Type': 'application/json', 'X-LF': '1' };
      o.body = JSON.stringify(krop);
    }
    var url = '/api/gem.php' + (metode === 'GET' ? '?handling=hent&spil=' + SPIL : '');
    return fetch(url, o).then(function (r) {
      return r.json().then(function (d) { return { status: r.status, d: d }; });
    });
  }

  function hent(lokal) {
    if (!server) return Promise.resolve(lokal || null);
    var svar = kald('GET').then(function (x) {
      if (x.status === 401) { server = false; return lokal || null; }
      if (!x.d.ok) throw new Error(x.d.besked);
      udgave = x.d.udgave || 0;
      var m = laesMeta();
      // Den lokale kopi vinder kun, hvis den bygger videre på netop den
      // udgave, serveren har, og aldrig nåede op (fx fordi nettet røg)
      if (lokal && !m.synket && m.udgave === udgave) { gem(lokal); return lokal; }
      return x.d.data || null;
    }).catch(function () { return lokal || null; });   // intet net: fortsæt lokalt
    // Svarer serveren ikke inden for et par sekunder, spiller vi lokalt
    return Promise.race([svar, new Promise(function (r) { setTimeout(function () { r(lokal || null); }, 6000); })]);
  }

  function send(keepalive) {
    if (!server || konflikt || venter === null || (sender && !keepalive)) return;
    var data = venter, fejlede = false;
    venter = null; sender = true;
    kald('POST', { handling: 'gem', spil: SPIL, data: data, udgave: udgave, enhed: enhed }, keepalive)
      .then(function (x) {
        if (x.d.ok) {
          udgave = x.d.udgave;
          if (venter === null) skrivMeta(true);
        } else if (x.status === 409 && x.d.konflikt) {
          konflikt = true; nyeste = x.d.data; nyesteUdgave = x.d.udgave;
          lyttere.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } });
        } else if (x.status === 401) {
          server = false;                             // logget ud: kun lokalt nu
        } else { fejlede = true; if (venter === null) venter = data; }
      })
      .catch(function () { fejlede = true; if (venter === null) venter = data; })
      .then(function () {
        sender = false;
        if (venter !== null && server && !konflikt) {
          clearTimeout(timer);
          timer = setTimeout(send, fejlede ? 20000 : 1500);
        }
      });
  }

  function gem(tekst, nu) {
    if (konflikt || typeof tekst !== 'string' || !tekst) return;
    venter = tekst;
    skrivMeta(false);
    clearTimeout(timer);
    if (nu) send(true);
    else timer = setTimeout(send, 1500);
  }

  RB.gem = {
    hent: hent,
    gem: gem,
    nulstil: function () {
      clearTimeout(timer); venter = null;
      try { localStorage.removeItem(META); } catch (e) { /* ingen sag */ }
      if (!server) return Promise.resolve();
      return kald('POST', { handling: 'gem', spil: SPIL, data: '{"slettet":true}', udgave: udgave, enhed: enhed })
        .catch(function () { /* så må den lokale sletning være nok */ });
    },
    naarKonflikt: function (fn) { lyttere.push(fn); },
    tagNyeste: function () {
      udgave = nyesteUdgave; venter = null; konflikt = false;
      skrivMeta(true);
      var d = nyeste; nyeste = '';
      return d;
    }
  };
})();
