/* Learnification — barnets fælles profil
   Navn, udseende og låst tøj, som gælder i Eventyrbiblioteket og i alle spil.
   Gemmes hos /api/profil.php under barnets egen kode (eller den voksnes
   konto) og i en kopi i localStorage, så intet går tabt uden net. Uden login
   er det kun localStorage.

     LFProfil.hent()            -> løfte med profilen ({navn, look, oplaast, praes, bib}) eller null
     LFProfil.gem(profil, nu)   gem (samlet op i 1 s, eller med det samme)
     LFProfil.laasOp(id)        -> løfte: true, hvis tøjet var nyt (så vises en besked)
     LFProfil.tilgaengelige(p)  -> tøj, der er låst op (til klædeskabet)
     LFProfil.ny(navn, look)    -> en frisk profil
     LFProfil.paaNyt(fn)        fn(genstand) kaldes, når noget nyt er låst op
     LFProfil.opnaa(id)         -> løfte: true, hvis præstationen var ny (se praestationer.js)
     LFProfil.harPraes(p, id)   har profilen opnået præstationen?
     LFProfil.paaPraes(fn)      fn(præstation) kaldes, når en præstation er opnået */
(function () {
  'use strict';
  var LFProfil = window.LFProfil = window.LFProfil || {};
  var inde = (document.cookie.match(/(?:^|;\s*)lf_in=((?:elev|voksen)\.\d+)/) || [])[1] || '';
  var NOEGLE = 'lf-profil' + (inde ? '-' + inde : '');
  var server = !!inde, cache, venter = null, timer = null, sender = false, lyttere = [], praesLyttere = [];

  function laesLokal() {
    try {
      var p = JSON.parse(localStorage.getItem(NOEGLE) || 'null');
      if (p && typeof p === 'object') return p;
    } catch (e) { /* ingenting */ }
    return null;
  }
  function skrivLokal(p) {
    try { localStorage.setItem(NOEGLE, JSON.stringify(p)); } catch (e) { /* privat vindue */ }
  }

  // Hvad barnet har set i biblioteket (fx at Brynja har budt velkommen): højst nogle få nøgler
  function rensSet(o) {
    var ud = {};
    if (o && typeof o === 'object') Object.keys(o).slice(0, 20).forEach(function (k) { if (/^\w{1,20}$/.test(k) && o[k]) ud[k] = true; });
    return ud;
  }

  // Opnåede præstationer: {id: dato (ÅMMDD)}. Kendes kataloget, filtreres der til dets id'er.
  function rensPraes(o, kendte) {
    var ud = {};
    if (o && typeof o === 'object') Object.keys(o).slice(0, 120).forEach(function (k) {
      if (/^[a-z0-9_]{1,30}$/.test(k) && (!kendte || kendte.indexOf(k) >= 0)) ud[k] = Math.max(0, Math.min(999999, o[k] | 0));
    });
    return ud;
  }

  // En profil med kun kendte værdier (en gammel eller rodet gemning må ikke vælte noget)
  function rens(p) {
    if (!p || typeof p !== 'object') return null;
    var F = window.LFFigur;
    var ids = F ? F.GENSTANDE.map(function (g) { return g.id; }) : [];
    var pk = window.LFPraes ? LFPraes.ids() : null;
    return {
      v: 1,
      navn: String(p.navn || '').slice(0, 16),
      look: F ? F.ren(p.look) : (p.look || {}),
      oplaast: (Array.isArray(p.oplaast) ? p.oplaast : []).filter(function (id) { return ids.indexOf(id) >= 0; }),
      praes: rensPraes(p.praes, pk),
      bib: {
        fra: p.bib && typeof p.bib.fra === 'string' ? p.bib.fra.slice(0, 20) : '',
        set: rensSet(p.bib && p.bib.set)
      }
    };
  }

  function kald(metode, krop, keepalive) {
    var o = { credentials: 'same-origin', cache: 'no-store' };
    if (metode === 'POST') {
      o.method = 'POST'; o.keepalive = !!keepalive;
      o.headers = { 'Content-Type': 'application/json', 'X-LF': '1' };
      o.body = JSON.stringify(krop);
    }
    var url = '/api/profil.php' + (metode === 'GET' ? '?handling=hent' : '');
    return fetch(url, o).then(function (r) {
      return r.json().then(function (d) { return { status: r.status, d: d }; });
    });
  }

  LFProfil.ny = function (navn, look) {
    return rens({ navn: navn, look: look, oplaast: [], praes: {}, bib: { fra: '', set: {} } });
  };

  LFProfil.hent = function () {
    if (cache !== undefined) return Promise.resolve(cache);
    var lokal = rens(laesLokal());
    if (!server) { cache = lokal; return Promise.resolve(cache); }
    var svar = kald('GET').then(function (x) {
      if (x.status === 401) { server = false; return lokal; }
      if (!x.d.ok) throw new Error(x.d.besked);
      var s = null;
      try { s = rens(JSON.parse(x.d.data || 'null')); } catch (e) { /* tom */ }
      // Serveren har altid det nyeste; findes kun en lokal kopi, sendes den op
      if (!s && lokal) { LFProfil.gem(lokal, true); return lokal; }
      return s;
    }).catch(function () { return lokal; });    // intet net: brug den lokale
    var s6 = new Promise(function (r) { setTimeout(function () { r(lokal); }, 6000); });
    return Promise.race([svar, s6]).then(function (p) {
      if (cache === undefined) { cache = p; if (p) skrivLokal(p); }
      return cache;
    });
  };

  function send(keepalive) {
    if (!server || venter === null || (sender && !keepalive)) return;
    var data = venter, fejlede = false;
    venter = null; sender = true;
    kald('POST', { handling: 'gem', data: data, hvem: inde }, keepalive)
      .then(function (x) {
        if (x.status === 401) server = false;            // logget ud: kun lokalt nu
        else if (!x.d.ok) { fejlede = true; if (venter === null) venter = data; }
      })
      .catch(function () { fejlede = true; if (venter === null) venter = data; })
      .then(function () {
        sender = false;
        if (venter !== null && server) { clearTimeout(timer); timer = setTimeout(send, fejlede ? 15000 : 1000); }
      });
  }

  LFProfil.gem = function (p, nu) {
    var r = rens(p); if (!r) return;
    // Der er ét profilobjekt pr. side: det, hent() gav. Det bliver renset på stedet, så alle, der holder
    // det, ser det samme (ellers kunne en gammel kopi skrive en nyligt opnået præstation væk).
    Object.assign(p, r); p = cache = p; skrivLokal(p);
    venter = JSON.stringify(p);
    clearTimeout(timer);
    if (nu) send(true); else timer = setTimeout(send, 1000);
  };

  LFProfil.tilgaengelige = function (p) {
    var F = window.LFFigur, har = (p && p.oplaast) || [];
    return F.GENSTANDE.map(function (g) {
      return { id: g.id, hat: g.hat, navn: g.navn, kilde: g.kilde, laast: har.indexOf(g.id) < 0 };
    });
  };

  LFProfil.paaNyt = function (fn) { lyttere.push(fn); };
  LFProfil.paaPraes = function (fn) { praesLyttere.push(fn); };

  LFProfil.harPraes = function (p, id) { return !!(p && p.praes && Object.prototype.hasOwnProperty.call(p.praes, id)); };

  // Præstationen er opnået nu. Idempotent. Giver true, hvis den var ny.
  LFProfil.opnaa = function (id) {
    var P = window.LFPraes, pr = P && P.find(id);
    if (!pr) return Promise.resolve(false);
    return LFProfil.hent().then(function (p) {
      if (!p || LFProfil.harPraes(p, id)) return false;
      var d = new Date(); p.praes[id] = (d.getFullYear() % 100) * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
      LFProfil.gem(p, true);
      praesLyttere.forEach(function (fn) { try { fn(pr); } catch (e) { console.error(e); } });
      if (pr.laas) LFProfil.laasOp(pr.laas);        // nogle præstationer låser tøj op
      return true;
    });
  };

  LFProfil.laasOp = function (id) {
    var F = window.LFFigur;
    var g = F && F.GENSTANDE.filter(function (x) { return x.id === id; })[0];
    if (!g) return Promise.resolve(false);
    return LFProfil.hent().then(function (p) {
      if (!p || p.oplaast.indexOf(id) >= 0) return false;
      p.oplaast.push(id);
      LFProfil.gem(p, true);
      lyttere.forEach(function (fn) { try { fn(g); } catch (e) { console.error(e); } });
      return true;
    });
  };

  // Når fanen lukkes, skal det sidste gå med
  function skyl() { clearTimeout(timer); send(true); }
  window.addEventListener('pagehide', skyl);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') skyl(); });
})();
