/* Cookie-samtykke — banneret og det, der styres af det.

   KATEGORIER
     Nødvendige     login (lf_session, lf_in, lf_voksen) og selve valget (lf_samtykke).
                    Altid tændt — de er undtaget fra kravet om samtykke.
     Statistik      cookien lf_bes med et tilfældigt id, så besøgsstatistikken
                    kan se, om man kommer igen, og hvilken kilde eller kampagne
                    der til sidst førte til en tilmelding (se besoeg.js).
     Markedsføring  annonce-pixels fra Meta, Google og LinkedIn. Vises KUN,
                    når der står et id i PIXELS herunder — man må ikke bede om
                    samtykke til noget, der ikke bliver brugt.

   REGLERNE, DET ER BYGGET EFTER (cookiebekendtgørelsen, GDPR og
   Datatilsynets vejledning om cookies):
     * intet bliver sat eller hentet, før der er sagt ja,
     * "Afvis alle" er lige så stor og lige så nem som "Tillad alle",
     * intet er slået til på forhånd, og siden kan bruges uden at svare,
     * valget kan altid laves om via "Cookie-indstillinger" nederst på siden,
       og et nej sletter de cookies, der allerede er sat,
     * hvert valg bliver logget som bevis (api/samtykke.php), uden IP,
     * der bliver spurgt igen efter 12 måneder, eller når VERSION tælles op.

   BØRN. Spillene, elev-login og alt, mens et barn er logget ind (lf_in
   = elev.*), får hverken banner eller andet end den cookiefri statistik.
   Børn under 13 kan ikke selv give samtykke.

   Andre scripts spørger med LFSamtykke.har('statistik') og kan lytte på
   hændelsen 'lf-samtykke' på window. LFSamtykke.aabn() viser indstillingerne. */

var LFSamtykke = (function () {
  'use strict';

  // Tæl op, når teksten eller kategorierne ændres — så bliver alle spurgt igen
  var VERSION = 1;
  var LEVETID = 365;               // dage, før vi spørger igen

  // Annonce-pixels. Står der ikke et id, bliver kategorien slet ikke vist.
  var PIXELS = {
    meta: '',       // Meta Pixel-id, fx '123456789012345'
    google: '',     // Google Ads- eller GA4-id, fx 'AW-123456789' / 'G-ABC123'
    linkedin: ''    // LinkedIn Insight Tag partner-id, fx '1234567'
  };

  var harPixels = !!(PIXELS.meta || PIXELS.google || PIXELS.linkedin);
  var valg = null;                 // {s: bool, m: bool, id, tid}
  var boks = null;

  // ------------------------------------------------------------ cookies

  function laesCookie(navn) {
    var m = document.cookie.match(new RegExp('(?:^|;\\s*)' + navn + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }
  function saetCookie(navn, vaerdi, dage) {
    document.cookie = navn + '=' + encodeURIComponent(vaerdi) + '; path=/; max-age=' + Math.round(dage * 86400)
      + '; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
  }
  function sletCookie(navn) {
    var d = location.hostname, domaener = ['', d, '.' + d, '.' + d.split('.').slice(-2).join('.')];
    domaener.forEach(function (dom) {
      document.cookie = navn + '=; path=/; max-age=0' + (dom ? '; domain=' + dom : '');
    });
  }
  function nytId() {
    var a = new Uint8Array(8);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }

  // "1.1.0.<id>.<tid>" = version, statistik, markedsføring, id, tidspunkt
  function hentValg() {
    var p = laesCookie('lf_samtykke').split('.');
    if (p.length !== 5 || +p[0] !== VERSION) return null;
    var tid = +p[4];
    if (!tid || Date.now() / 1000 - tid > LEVETID * 86400) return null;
    return { s: p[1] === '1', m: p[2] === '1' && harPixels, id: p[3], tid: tid };
  }

  // ------------------------------------------------------------ hvor

  function erBarneside() {
    var sti = location.pathname;
    if (/^\/(spil\/|login|admin|statistik)/.test(sti)) return true;
    return /^elev\./.test(laesCookie('lf_in'));
  }
  function sigerNej() {
    return navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1';
  }

  // ------------------------------------------------------------ valget

  function gem(s, m, hvordan) {
    var id = (valg && valg.id) || nytId();
    var tid = Math.floor(Date.now() / 1000);
    valg = { s: !!s, m: !!m && harPixels, id: id, tid: tid };
    saetCookie('lf_samtykke', [VERSION, valg.s ? 1 : 0, valg.m ? 1 : 0, id, tid].join('.'), LEVETID);
    try {
      var data = JSON.stringify({ id: id, valg: hvordan, s: valg.s ? 1 : 0, m: valg.m ? 1 : 0, v: VERSION, side: location.pathname });
      if (navigator.sendBeacon) navigator.sendBeacon('/api/samtykke.php', data);
    } catch (e) { /* beviset er vigtigt, men siden må ikke gå i stykker */ }
    ryd();
    brug();
    luk();
    try { window.dispatchEvent(new CustomEvent('lf-samtykke', { detail: { statistik: valg.s, markedsfoering: valg.m } })); }
    catch (e) { /* meget gamle browsere */ }
  }

  // Et nej (eller et ja, der bliver trukket tilbage) sletter det, der er sat
  function ryd() {
    if (!valg || !valg.s) sletCookie('lf_bes');
    if (!valg || !valg.m) ['_fbp', '_fbc', '_gcl_au', '_ga', '_gid', 'li_fat_id', 'lidc', 'bcookie', 'UserMatchHistory', 'AnalyticsSyncHistory']
      .forEach(sletCookie);
  }

  // ------------------------------------------------------------ pixels

  var hentet = false;
  function brug() {
    if (!valg || !valg.m || hentet) return;
    hentet = true;
    if (PIXELS.meta) {
      /* Meta Pixel — Metas egen kode, uforandret bortset fra id'et */
      !function (f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0;
        t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
      }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', PIXELS.meta);
      window.fbq('track', 'PageView');
    }
    if (PIXELS.google) {
      var g = document.createElement('script');
      g.async = true;
      g.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(PIXELS.google);
      document.head.appendChild(g);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', PIXELS.google, { anonymize_ip: true });
    }
    if (PIXELS.linkedin) {
      window._linkedin_partner_id = PIXELS.linkedin;
      window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
      window._linkedin_data_partner_ids.push(PIXELS.linkedin);
      var l = document.createElement('script');
      l.async = true;
      l.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
      document.head.appendChild(l);
    }
  }

  /** En konvertering til pixels (kaldes af besoeg.js' LFMaal). */
  function konvertering(navn) {
    if (!valg || !valg.m) return;
    try {
      var meta = { nyhedsbrev: 'Lead', opret_konto: 'CompleteRegistration' }[navn];
      if (meta && window.fbq) window.fbq('track', meta);
      if (window.gtag) window.gtag('event', navn);
      if (window.lintrk) window.lintrk('track', { conversion_id: navn });
    } catch (e) { /* ingen sag */ }
  }

  // ------------------------------------------------------------ banneret

  var CSS = '\
.lfs{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:680px;margin:0 auto;\
background:var(--paper,#faf7f0);color:var(--ink,#26222c);border:2.5px solid var(--ink,#26222c);\
border-radius:var(--r,18px);box-shadow:0 6px 0 var(--ink,#26222c),0 18px 50px rgba(20,16,30,.28);\
padding:22px 22px 18px;font:400 .97rem/1.5 var(--sans,system-ui,sans-serif);max-height:calc(100vh - 32px);overflow:auto}\
.lfs h2{font:600 1.3rem/1.2 var(--display,Georgia,serif);margin:0 0 .4em}\
.lfs p{margin:0 0 12px;color:var(--ink-soft,#5d566a)}\
.lfs a{color:var(--gold-dark,#4b3a78)}\
.lfs .lfs-knapper{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}\
.lfs button{font:650 1rem var(--sans,system-ui,sans-serif);border-radius:var(--r,0);padding:13px 16px;cursor:pointer;\
border:2.5px solid var(--ink,#26222c);background:var(--ink,#26222c);color:var(--paper,#faf7f0)}\
.lfs button:focus-visible{outline:3px solid var(--gold-dark,#4b3a78);outline-offset:2px}\
.lfs .lfs-link{grid-column:1/-1;background:none;border:0;color:var(--ink,#26222c);text-decoration:underline;padding:6px}\
.lfs .lfs-gem{grid-column:1/-1;background:var(--gold,#ffcc4d);border-color:var(--gold-edge,#b8862a);color:var(--ink-deep,#140f1c)}\
.lfs-kat{border:2px solid var(--paper-edge,#e6dcc8);border-radius:var(--r,0);padding:12px 14px;margin:0 0 10px;display:flex;gap:12px;align-items:flex-start}\
.lfs-kat strong{display:block;color:var(--ink,#26222c)}\
.lfs-kat small{display:block;color:var(--ink-soft,#5d566a);font-size:.88rem;line-height:1.45}\
.lfs-kat input{width:20px;height:20px;margin-top:3px;accent-color:var(--gold-dark,#4b3a78);flex:none}\
.lfs-lille{font-size:.85rem}\
@media (max-width:520px){.lfs{left:10px;right:10px;bottom:10px;padding:18px 16px 14px}}\
.lfs-fod{background:none;border:0;padding:0;font:inherit;color:inherit;opacity:.85;text-decoration:underline;cursor:pointer;text-align:left}';

  function el(html) {
    var d = document.createElement('div');
    d.innerHTML = html;
    return d.firstElementChild;
  }

  function kat(id, titel, tekst, laast, til) {
    return '<label class="lfs-kat"><input type="checkbox" id="' + id + '"' + (til ? ' checked' : '') + (laast ? ' checked disabled' : '')
      + '><span><strong>' + titel + '</strong><small>' + tekst + '</small></span></label>';
  }

  function vis(detaljer) {
    luk();
    if (!document.getElementById('lfs-css')) {
      var st = document.createElement('style');
      st.id = 'lfs-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    var nu = valg || { s: false, m: false };
    var mark = harPixels ? ' og til at måle, om vores annoncer virker' : '';
    var html = '<div class="lfs" role="dialog" aria-labelledby="lfs-titel" aria-live="polite">'
      + '<h2 id="lfs-titel">' + (harPixels ? 'Må vi bruge cookies?' : 'Må vi tælle dit besøg lidt mere præcist?') + '</h2>';
    if (!detaljer) {
      html += '<p>Vi bruger kun de cookies, der skal til for at logge ind. Siger du ja, sætter vi også en cookie til vores egen statistik'
        + mark + ', så vi kan se, om folk kommer igen, og hvad der får dem til at prøve spillene. '
        + 'Du kan altid ændre det under <em>Cookie-indstillinger</em> nederst på siden. <a href="/privatliv#cookies">Læs mere</a></p>'
        + '<p class="lfs-lille">Er du under 13 år, så tryk <strong>Afvis alle</strong> — eller spørg en voksen.</p>'
        + '<div class="lfs-knapper">'
        + '<button type="button" data-lfs="afvis">Afvis alle</button>'
        + '<button type="button" data-lfs="tillad">Tillad alle</button>'
        + '<button type="button" class="lfs-link" data-lfs="detaljer">Vælg selv</button>'
        + '</div>';
    } else {
      html += '<p>Vælg, hvad du vil sige ja til. Intet er slået til, før du selv gør det. <a href="/privatliv#cookies">Se alle cookies</a></p>'
        + kat('lfs-n', 'Nødvendige', 'Holder dig logget ind og husker dit valg her. Kan ikke slås fra.', true, true)
        + kat('lfs-s', 'Statistik', 'Vores egen besøgsstatistik med en cookie (lf_bes) med et tilfældigt nummer, i 12 måneder. '
          + 'Så kan vi se, om du kommer igen, og hvilken vej du fandt os. Kun hos os — ingen andre får tallene.', false, nu.s)
        + (harPixels ? kat('lfs-m', 'Markedsføring', 'Cookies fra ' + [PIXELS.meta && 'Meta (Facebook og Instagram)', PIXELS.google && 'Google', PIXELS.linkedin && 'LinkedIn'].filter(Boolean).join(', ')
          + ', så vi kan måle vores annoncer og vise dem til folk, der kender os. De får at vide, at du har besøgt siden.', false, nu.m) : '')
        + '<div class="lfs-knapper">'
        + '<button type="button" class="lfs-gem" data-lfs="gem">Gem mine valg</button>'
        + '<button type="button" data-lfs="afvis">Afvis alle</button>'
        + '<button type="button" data-lfs="tillad">Tillad alle</button>'
        + '</div>';
    }
    boks = el(html + '</div>');
    boks.addEventListener('click', function (e) {
      var b = e.target.closest('[data-lfs]');
      if (!b) return;
      var h = b.getAttribute('data-lfs');
      if (h === 'afvis') gem(false, false, 'afvis_alle');
      else if (h === 'tillad') gem(true, true, 'tillad_alle');
      else if (h === 'detaljer') vis(true);
      else if (h === 'gem') {
        var m = document.getElementById('lfs-m');
        gem(document.getElementById('lfs-s').checked, m ? m.checked : false, 'valgt');
      }
    });
    document.body.appendChild(boks);
    var f = boks.querySelector(detaljer ? '#lfs-s' : 'button');
    if (f && detaljer) f.focus({ preventScroll: true });
  }

  function luk() {
    if (boks && boks.parentNode) boks.parentNode.removeChild(boks);
    boks = null;
  }

  // Linket i sidefoden, så valget altid kan laves om
  function fodlink() {
    var navs = document.querySelectorAll('footer nav');
    var nav = navs[navs.length - 1];
    if (!nav || nav.querySelector('.lfs-fod')) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'lfs-fod';
    b.textContent = 'Cookie-indstillinger';
    b.addEventListener('click', function () { aabn(); });
    var efter = nav.querySelector('a[href="/privatliv"]');
    if (efter && efter.nextSibling) nav.insertBefore(b, efter.nextSibling);
    else nav.appendChild(b);
    if (!document.getElementById('lfs-css')) {
      var st = document.createElement('style');
      st.id = 'lfs-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    }
  }

  function aabn() { vis(true); }

  // ------------------------------------------------------------ start

  valg = hentValg();
  var barn = erBarneside();

  function start() {
    document.querySelectorAll('[data-cookie-indstillinger]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.preventDefault(); aabn(); });
    });
    if (barn) return;
    fodlink();
    if (valg) { brug(); return; }
    if (sigerNej()) return;        // browseren har allerede sagt nej for dig
    vis(false);
  }
  if (!barn) ryd();                // fx efter et nej på en anden fane
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  return {
    har: function (kategori) {
      if (barn || !valg) return false;
      return kategori === 'statistik' ? valg.s : kategori === 'markedsfoering' ? valg.m : kategori === 'noedvendige';
    },
    aabn: aabn,
    konvertering: konvertering,
    version: VERSION
  };
})();
