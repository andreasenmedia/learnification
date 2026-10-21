/* Hjælpeboblen — nederst til højre for voksne, der er logget ind.

   Spørger serveren (api/support.php?handling=start), om boblen skal vises. Børn, administratoren og alle,
   der ikke er logget ind, får aldrig noget at se — og script.js henter slet ikke filen uden en voksen-cookie.
   Boblen har tre dele: svar på de mest stillede spørgsmål (kan søges i), "Skriv til os" (opretter en
   supportsag) og "Mine sager" (svar fra os). Ingen tredjepart; alt bliver på learnification.dk. */
(function () {
  'use strict';
  if (window.LF_HJAELP) return;
  window.LF_HJAELP = true;

  var FAQ = [
    { k: 'Konto og login', q: 'Hvordan logger børnene ind?', a: 'Hvert barn har sin egen kode, fx RAVN-4827. Børnene går på learnification.dk/login og skriver koden i feltet “Log ind som barn”. Koden står på login-kortet: Min konto → Udskriv login-kort. Har du glemt koden, kan du lave en ny under Min konto → Ny kode.' },
    { k: 'Konto og login', q: 'Jeg har glemt min adgangskode', a: 'Gå til Log ind og tryk “Glemt adgangskode?”. Skriv din mailadresse, så får du en mail med et link til at vælge en ny. Kommer mailen ikke, så kig i spam — eller opret en supportsag her.' },
    { k: 'Konto og login', q: 'Hvordan logger jeg ind som mit barn?', a: 'Under Min konto står der “Log ind som …” ud for hvert barn. Du kommer ind med barnets eget gemte spil, og en knap i spillets menu bringer dig tilbage til din konto uden at skrive adgangskoden igen.' },
    { k: 'Konto og login', q: 'Kan jeg slette mit barn eller min konto?', a: 'Et barn slettes under Min konto → Slet ud for barnet. Navnet forsvinder, og barnet kan ikke logge ind mere. Vil du slette hele kontoen, så opret en supportsag her, så gør vi det.' },
    { k: 'Børn og koder', q: 'Hvordan tilføjer jeg flere børn eller elever?', a: 'Under Min konto: åbn “Tilføj børn” (eller “Tilføj elever”) under klassen, og skriv ét navn pr. linje. De får hver deres kode med det samme.' },
    { k: 'Børn og koder', q: 'Barnet er logget ud eller kommer ikke ind', a: 'Tjek at koden er skrevet præcis som på kortet (bogstaver, streg og fire tal). Hjælper det ikke, så lav en ny kode under Min konto → Ny kode og udskriv et nyt login-kort.' },
    { k: 'Spillene', q: 'Hvilke spil findes, og hvilket klassetrin passer de til?', a: 'Regnehelten er matematik for 1.–10. klasse. Runeborg handler om læsning, kildekritik og data for 5.–9. klasse. Eventyrbiblioteket er indgangen, hvor børnene vælger spil.' },
    { k: 'Spillene', q: 'Gemmer spillet, hvor vi nåede til?', a: 'Ja, det gemmer selv undervejs, og barnet kan fortsætte på en anden computer eller tablet ved at logge ind igen. Spiller barnet to steder samtidig, henter spillet det nyeste, så intet går tabt.' },
    { k: 'Spillene', q: 'Hvor lang tid må barnet spille?', a: 'Under testen har hvert barn 60 minutters prøvetid på tværs af spillene. Når tiden er gået, kan vi åbne for mere — skriv til os her, eller hold øje med mailen om spørgeskemaet.' },
    { k: 'Spillene', q: 'Kan barnet få læst opgaverne højt?', a: 'Ja. Under Min konto kan du slå “Læs op” til for barnet. Så bliver spørgsmål og svarmuligheder læst højt i spillene, fx til børn med ordblindhed.' },
    { k: 'Spillene', q: 'Kan barnet kun spille ét af spillene?', a: 'Ja. Under Min konto → Indstillinger kan du vælge, at børnene kun må spille Regnehelten eller Runeborg.' },
    { k: 'Niveau og klassetrin', q: 'Hvad betyder “Tilpas niveau”?', a: 'I Regnehelten kan opgaverne blive lettere eller sværere, efter hvor godt og hurtigt barnet løser dem. Det starter på barnets klassetrin og skifter i halve trin. Slå det til under Min konto → “Tilpas niveau” ud for barnet, eller lad barnet vælge “★ Tilpas til mig” ved spilstart.' },
    { k: 'Niveau og klassetrin', q: 'Hvordan ser jeg, hvilket niveau barnet ligger på?', a: 'Under Min konto → “Børnenes læring” (eller “Elevernes læring” for en klasse) kan du se det gennemsnitlige klassetrin i Regnehelten, en oversigt over hvor mange opgaver der er løst på hvert klassetrin, og hvert barns enkelte opgaver. Der er også en Excel-fil med rådata.' },
    { k: 'Niveau og klassetrin', q: 'Barnet har valgt det forkerte klassetrin', a: 'Det kan barnet rette ved at starte et nyt spil og vælge igen. Vil du beholde det gemte spil, så skriv til os, så hjælper vi.' },
    { k: 'Klasser og elever', q: 'Hvordan ser jeg, hvordan eleverne klarer sig?', a: 'Under Min konto finder du knappen “Elevernes læring” ved klassen: rigtige i første forsøg, tid uden opgaver, svageste emner og de enkelte opgaver. Rådata kan hentes som Excel.' },
    { k: 'Data og privatliv', q: 'Hvilke oplysninger gemmer I om børnene?', a: 'Kun kaldenavn, kode, spilletid og det gemte spil — ingen e-mails eller adresser på børn. Børnenes sider har hverken cookie-banner eller sporing. Alt står på siderne Privatliv og For voksne.' },
    { k: 'Data og privatliv', q: 'Hvordan afmelder jeg nyhedsbrevet eller fremskridtsmailen?', a: 'Hver mail har et afmeldingslink nederst. Fremskridtsmailen kan du også slå fra under Min konto → XP-tavle. De to ting er uafhængige af hinanden.' },
  ];

  var css = document.createElement('style');
  css.textContent =
    '#lf-hj-knap{position:fixed;right:18px;bottom:18px;z-index:9000;width:58px;height:58px;border:3px solid #140f1c;background:#ffcc4d;color:#140f1c;' +
    'font:700 26px/1 "Atkinson Hyperlegible","Segoe UI",system-ui,sans-serif;cursor:pointer;box-shadow:4px 4px 0 #140f1c;display:grid;place-items:center;padding:0}' +
    '#lf-hj-knap:hover{background:#ffd978}#lf-hj-knap:focus-visible{outline:3px solid #4b3a78;outline-offset:3px}' +
    '#lf-hj-knap .pr{position:absolute;top:-8px;right:-8px;min-width:22px;height:22px;background:#c4423b;color:#fff;border:2px solid #140f1c;font:700 13px/18px sans-serif;text-align:center}' +
    '#lf-hj{position:fixed;right:18px;bottom:88px;z-index:9000;width:min(390px,calc(100vw - 24px));max-height:min(620px,calc(100vh - 110px));display:flex;flex-direction:column;' +
    'background:#fdf5e2;color:#231a2e;border:3px solid #140f1c;box-shadow:6px 6px 0 #140f1c;font:16px/1.45 "Atkinson Hyperlegible","Segoe UI",system-ui,sans-serif}' +
    '#lf-hj[hidden]{display:none}' +
    '#lf-hj .hoved{background:#140f1c;color:#f4ecdc;padding:12px 14px;display:flex;align-items:center;gap:10px}' +
    '#lf-hj .hoved b{flex:1;font-size:1.05em}#lf-hj .hoved button{background:none;border:0;color:#f4ecdc;font:700 22px/1 sans-serif;cursor:pointer;padding:2px 6px}' +
    '#lf-hj .faner{display:flex;border-bottom:3px solid #140f1c}' +
    '#lf-hj .faner button{flex:1;padding:9px 6px;border:0;border-right:2px solid #140f1c;background:#f3e3bf;font:inherit;font-weight:700;cursor:pointer;color:#231a2e}' +
    '#lf-hj .faner button:last-child{border-right:0}#lf-hj .faner button[aria-selected=true]{background:#ffcc4d}' +
    '#lf-hj .krop{padding:14px;overflow:auto;flex:1}' +
    '#lf-hj input[type=search],#lf-hj textarea,#lf-hj select{width:100%;box-sizing:border-box;font:inherit;padding:9px 10px;border:2px solid #231a2e;background:#fff;color:#231a2e;border-radius:0}' +
    '#lf-hj textarea{min-height:120px;resize:vertical}' +
    '#lf-hj label{display:block;font-weight:700;margin:12px 0 4px}#lf-hj label:first-child{margin-top:0}' +
    '#lf-hj details{border:2px solid #d8c08f;background:#fff;margin:8px 0;padding:0}' +
    '#lf-hj summary{cursor:pointer;padding:9px 10px;font-weight:700;list-style-position:inside}#lf-hj details p{margin:0;padding:0 12px 12px}' +
    '#lf-hj .grp{font-size:.78em;letter-spacing:.1em;text-transform:uppercase;color:#4b3a78;margin:14px 0 2px;font-weight:700}' +
    '#lf-hj .knap{display:inline-block;margin-top:12px;padding:10px 16px;border:3px solid #140f1c;background:#ffcc4d;color:#140f1c;font:inherit;font-weight:700;cursor:pointer;box-shadow:3px 3px 0 #140f1c}' +
    '#lf-hj .knap:disabled{opacity:.6;cursor:wait}#lf-hj .lille{font-size:.88em;color:#5b4d6b}' +
    '#lf-hj .fejl{color:#a02e38;font-weight:700;margin:8px 0 0}#lf-hj .ok{color:#2f7d4c;font-weight:700;margin:8px 0 0}' +
    '#lf-hj .sag{border:2px solid #d8c08f;background:#fff;margin:8px 0;padding:10px 12px}' +
    '#lf-hj .sag .st{display:inline-block;padding:1px 8px;border:2px solid #231a2e;font-size:.8em;font-weight:700;background:#f3e3bf}#lf-hj .sag .st.loest{background:#cfe9d4}#lf-hj .sag .st.i_gang{background:#ffe9a8}' +
    '#lf-hj .msg{margin:8px 0 0;padding:8px 10px;white-space:pre-wrap;word-break:break-word}#lf-hj .msg.bruger{background:#f3e3bf}#lf-hj .msg.admin{background:#e3ecff;border-left:4px solid #2c4a9c}' +
    '#lf-hj .honning{position:absolute;left:-9999px;opacity:0;height:0;overflow:hidden}' +
    '@media(max-width:560px){#lf-hj{right:8px;left:8px;width:auto;bottom:80px;max-height:calc(100vh - 100px)}#lf-hj-knap{right:12px;bottom:12px}}' +
    '@media print{#lf-hj-knap,#lf-hj{display:none!important}}';
  document.head.appendChild(css);

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function dato(t) { var d = new Date(t * 1000); return d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }); }
  function hent(handling) {
    return fetch('/api/support.php?handling=' + handling, { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.json().then(function (d) { if (!d.ok) throw new Error(d.besked || 'Det lykkedes ikke.'); return d; }); });
  }
  function send(handling, data) {
    return fetch('/api/support.php', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-LF': '1' }, body: JSON.stringify(Object.assign({ handling: handling }, data)) })
      .then(function (r) { return r.json().then(function (d) { if (!d.ok) throw new Error(d.besked || 'Det lykkedes ikke.'); return d; }); });
  }

  hent('start').then(function (s) {
    if (!s.vis) return;
    bygg(s);
  }).catch(function () { /* ingen bobler uden server */ });

  function bygg(s) {
    var knap = el('button', null, '?');
    knap.id = 'lf-hj-knap'; knap.type = 'button';
    knap.setAttribute('aria-label', 'Hjælp og support'); knap.setAttribute('aria-expanded', 'false'); knap.setAttribute('aria-controls', 'lf-hj');
    if (s.aabne) knap.appendChild(el('span', 'pr', String(s.aabne)));
    var panel = el('div'); panel.id = 'lf-hj'; panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Hjælp og support');
    var hoved = el('div', 'hoved', '<b>Hjælp og support</b>'), luk = el('button', null, '×'); luk.type = 'button'; luk.setAttribute('aria-label', 'Luk');
    hoved.appendChild(luk);
    var faner = el('div', 'faner'); faner.setAttribute('role', 'tablist');
    var krop = el('div', 'krop');
    panel.appendChild(hoved); panel.appendChild(faner); panel.appendChild(krop);
    document.body.appendChild(panel); document.body.appendChild(knap);

    var NAVNE = [['svar', 'Svar'], ['skriv', 'Skriv til os'], ['sager', 'Mine sager']], aktiv = 'svar';
    NAVNE.forEach(function (n) {
      var b = el('button', null, n[1]); b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.fane = n[0];
      b.addEventListener('click', function () { vaelg(n[0]); });
      faner.appendChild(b);
    });
    function vaelg(f) {
      aktiv = f;
      [].forEach.call(faner.children, function (b) { b.setAttribute('aria-selected', b.dataset.fane === f ? 'true' : 'false'); });
      krop.innerHTML = '';
      if (f === 'svar') svar(); else if (f === 'skriv') skriv(); else sager();
    }

    // ---- svar på de mest stillede spørgsmål
    function svar() {
      var sog = el('input'); sog.type = 'search'; sog.placeholder = 'Søg, fx “kode” eller “niveau”'; sog.setAttribute('aria-label', 'Søg i svarene');
      var liste = el('div'), ingen = el('p', 'lille', '');
      krop.appendChild(sog); krop.appendChild(liste); krop.appendChild(ingen);
      function tegn() {
        var ord = sog.value.trim().toLowerCase().split(/\s+/).filter(Boolean), sidste = '', n = 0;
        liste.innerHTML = '';
        FAQ.forEach(function (f) {
          var tekst = (f.q + ' ' + f.a + ' ' + f.k).toLowerCase();
          if (!ord.every(function (o) { return tekst.indexOf(o) >= 0; })) return;
          if (f.k !== sidste) { liste.appendChild(el('div', 'grp', esc(f.k))); sidste = f.k; }
          var d = el('details', null, '<summary>' + esc(f.q) + '</summary><p>' + esc(f.a) + '</p>');
          if (ord.length && n === 0) d.open = true;
          liste.appendChild(d); n++;
        });
        ingen.innerHTML = n ? '' : 'Ingen svar passer. <a href="#" data-skriv>Skriv til os</a>, så hjælper vi.';
        var a = ingen.querySelector('[data-skriv]'); if (a) a.addEventListener('click', function (e) { e.preventDefault(); vaelg('skriv'); });
      }
      sog.addEventListener('input', tegn); tegn();
      var link = el('p', 'lille', 'Fandt du ikke svaret? <a href="#" data-skriv2>Skriv til os</a>.');
      link.querySelector('a').addEventListener('click', function (e) { e.preventDefault(); vaelg('skriv'); });
      krop.appendChild(link);
    }

    // ---- ny supportsag
    function skriv() {
      var kat = '<select id="lf-hj-kat">' + Object.keys(s.kategorier).map(function (k) { return '<option value="' + k + '">' + esc(s.kategorier[k]) + '</option>'; }).join('') + '</select>';
      krop.innerHTML = '<p class="lille" style="margin-top:0">Vi svarer på mail til <b>' + esc(s.email) + '</b>, som regel inden for en hverdag.</p>'
        + '<label for="lf-hj-kat">Hvad handler det om?</label>' + kat
        + '<label for="lf-hj-tekst">Din besked</label><textarea id="lf-hj-tekst" maxlength="3000" placeholder="Beskriv, hvad du har brug for hjælp til"></textarea>'
        + '<div class="honning" aria-hidden="true"><label>Hjemmeside <input id="lf-hj-hp" tabindex="-1" autocomplete="off"></label></div>'
        + '<p class="lille">Skriv ikke adgangskoder. Vi gemmer sagen, til den har været løst i 2 år.</p>'
        + '<button type="button" class="knap" id="lf-hj-send">Opret supportsag</button><p id="lf-hj-besked" role="status"></p>';
      var b = krop.querySelector('#lf-hj-send'), besked = krop.querySelector('#lf-hj-besked');
      b.addEventListener('click', function () {
        var tekst = krop.querySelector('#lf-hj-tekst').value.trim();
        if (tekst.length < 5) { besked.className = 'fejl'; besked.textContent = 'Skriv lidt om, hvad du har brug for hjælp til.'; return; }
        b.disabled = true; besked.className = 'lille'; besked.textContent = 'Sender …';
        send('opret', { kategori: krop.querySelector('#lf-hj-kat').value, tekst: tekst, side: location.pathname, hjemmeside: krop.querySelector('#lf-hj-hp').value })
          .then(function (d) {
            s.aabne++; opdaterPrik();
            krop.innerHTML = '<p class="ok">Tak — vi har modtaget din sag' + (d.id ? ' (nr. ' + d.id + ')' : '') + '.</p><p>Du får svar på mail. Du kan følge den under “Mine sager”.</p>';
            var k2 = el('button', 'knap', 'Se mine sager'); k2.type = 'button'; k2.addEventListener('click', function () { vaelg('sager'); }); krop.appendChild(k2);
          }).catch(function (e) { b.disabled = false; besked.className = 'fejl'; besked.textContent = e.message; });
      });
    }

    // ---- mine sager
    function sager() {
      krop.innerHTML = '<p class="lille">Henter …</p>';
      hent('mine').then(function (d) {
        krop.innerHTML = '';
        if (!d.sager.length) { krop.innerHTML = '<p>Du har ikke skrevet til os endnu.</p>'; return; }
        var NAVN = { ny: 'Modtaget', i_gang: 'Besvaret', loest: 'Løst' };
        d.sager.forEach(function (sg) {
          var box = el('div', 'sag');
          box.innerHTML = '<b>' + esc(sg.emne) + '</b><br><span class="st ' + sg.status + '">' + NAVN[sg.status] + '</span> <span class="lille">' + esc(sg.kategori_navn) + ' · ' + dato(sg.oprettet) + '</span>'
            + sg.beskeder.map(function (m) { return '<div class="msg ' + m.fra + '"><span class="lille">' + (m.fra === 'admin' ? 'Learnification' : 'Dig') + ' · ' + dato(m.tid) + '</span><br>' + esc(m.tekst) + '</div>'; }).join('');
          var t = el('textarea'); t.placeholder = 'Skriv mere i sagen'; t.maxLength = 3000; t.style.marginTop = '8px'; t.style.minHeight = '60px';
          var b = el('button', 'knap', 'Send'); b.type = 'button'; var fb = el('p', null, '');
          b.addEventListener('click', function () {
            if (!t.value.trim()) return;
            b.disabled = true;
            send('svar_bruger', { id: sg.id, tekst: t.value.trim() }).then(function () { sager(); }, function (e) { b.disabled = false; fb.className = 'fejl'; fb.textContent = e.message; });
          });
          box.appendChild(t); box.appendChild(b); box.appendChild(fb); krop.appendChild(box);
        });
      }).catch(function (e) { krop.innerHTML = '<p class="fejl">' + esc(e.message) + '</p>'; });
    }

    function opdaterPrik() {
      var p = knap.querySelector('.pr');
      if (s.aabne) { if (!p) { p = el('span', 'pr'); knap.appendChild(p); } p.textContent = String(s.aabne); } else if (p) p.remove();
    }
    function aabn(vis) {
      panel.hidden = !vis; knap.setAttribute('aria-expanded', vis ? 'true' : 'false');
      if (vis) { vaelg(aktiv); (panel.querySelector('input,textarea,select') || luk).focus(); } else knap.focus();
    }
    knap.addEventListener('click', function () { aabn(panel.hidden); });
    luk.addEventListener('click', function () { aabn(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) aabn(false); });
    vaelg('svar');
  }
})();
