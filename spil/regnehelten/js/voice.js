/* Regnehelten — oplæsning
   Som i Runeborg er replikkerne læst ind på forhånd med Piper (lokal, open
   source talesyntese) af tools/regnehelten-stemmer.py og ligger som
   lyd/<nøgle>.mp3. Nøglen er en hash af personen + den rensede tekst, så
   den samme replik altid finder den samme fil.

   Opgaverne bliver lavet på stedet (tallene er nye hver gang), så dem kan
   der ikke ligge filer til. De bliver læst op af enhedens egen danske
   stemme, hvis den har en (fx iPad), og ellers vises knappen ikke.
   clean() og hash() SKAL svare til dem i regnehelten-stemmer.py. */
(function () {
  'use strict';
  var RH = window.RH = window.RH || {};
  var on = true, have = {}, audio = null, synth = window.speechSynthesis || null, daVoice = null, token = 0;

  function clean(text) {
    return String(text)
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\{navn\}[!?,.]?\s*/g, '')
      .replace(/[«»"♪]/g, '')
      .replace(/\s*—\s*/g, ', ')
      .replace(/\.\.\.\s*/g, '... ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function hash(s) {                       // FNV-1a, 32 bit, som hex
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  function key(profile, text) { return hash(profile + '|' + clean(text)); }

  fetch('lyd/stemmer.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : { keys: [] }; })
    .then(function (j) { (j.keys || []).forEach(function (k) { have[k] = true; }); }).catch(function () { });

  // ---- Opgaver samlet af små lydstykker
  // Opgavernes tal er nye hver gang, så de kan ikke indtales hele. I stedet er sætningsstykkerne mellem tallene
  // og alle tal fra nul til nioghalvfems indtalt hver for sig (tools/regnehelten-stemmer.py), og her samles de.
  var stykker = null;   // {s: {tekst: nøgle}, o: {ord: nøgle}}
  fetch('lyd/brikker.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { if (j) stykker = j; }).catch(function () { });

  var ONES = ['nul', 'en', 'to', 'tre', 'fire', 'fem', 'seks', 'syv', 'otte', 'ni', 'ti', 'elleve', 'tolv', 'tretten', 'fjorten', 'femten', 'seksten', 'sytten', 'atten', 'nitten'];
  var TENS = ['', '', 'tyve', 'tredive', 'fyrre', 'halvtreds', 'treds', 'halvfjerds', 'firs', 'halvfems'];
  function tal2(n) { return n < 20 ? ONES[n] : (n % 10 ? ONES[n % 10] + 'og' : '') + TENS[(n / 10) | 0]; }
  function talOrd(n) {                     // heltal -> danske talord (som tekst)
    if (n < 100) return tal2(n);
    if (n < 1000) { var h = (n / 100) | 0, r = n % 100; return (h === 1 ? 'hundrede' : ONES[h] + ' hundrede') + (r ? ' og ' + tal2(r) : ''); }
    if (n < 1000000) { var t = (n / 1000) | 0, r2 = n % 1000; return (t === 1 ? 'tusind' : talOrd(t) + ' tusind') + (r2 ? (r2 < 100 ? ' og ' : ' ') + talOrd(r2) : ''); }
    return String(n).split('').map(function (c) { return ONES[+c]; }).join(' ');
  }
  function talTekst(str) {                 // "12,5" -> "tolv komma fem"; "05" -> "nul fem"
    var m = /^(\d+)(?:[.,](\d+))?$/.exec(str); if (!m) return '';
    var h = m[1], ud = '';
    if (h.length > 1 && h.charAt(0) === '0') ud = h.split('').map(function (c) { return ONES[+c]; }).join(' ');
    else ud = talOrd(parseInt(h, 10));
    if (m[2]) ud += ' komma ' + m[2].split('').map(function (c) { return ONES[+c]; }).join(' ');
    return ud;
  }
  var ENHED = { kr: 'kroner', m: 'meter', cm: 'centimeter', mm: 'millimeter', km: 'kilometer', kg: 'kilo', g: 'gram', l: 'liter', dl: 'deciliter', min: 'minutter', stk: 'stykker', sek: 'sekunder', 't': 'timer' };
  // En opgavetekst -> liste af dele: {t: "sætningsstykke"} og {n: "tal"}
  function dele(text) {
    var t = clean(text);
    t = t.replace(/(\d)\.(\d{3})(?!\d)/g, '$1$2')
      .replace(/(\d):(\d)/g, '$1 $2')
      .replace(/(^|[\s(])[-−](?=\d)/g, '$1minus ')
      .replace(/(\d)\s+[-−]\s+(?=\d)/g, '$1 minus ')
      .replace(/(\d)\s*[·×]\s*/g, '$1 gange ')
      .replace(/(\d)\s+x\s+(?=[\dx])/g, '$1 gange ')
      .replace(/\s*=\s*/g, ' er lig med ')
      .replace(/\s*\+\s*/g, ' plus ')
      .replace(/\s*%/g, ' procent')
      .replace(/[()]/g, ', ')
      .replace(/([A-Za-zÆØÅæøå])-(?=[A-Za-zÆØÅæøå])/g, '$1 ')
      .replace(/\bpr\./g, 'per')
      .replace(/\b(kr|cm|mm|km|kg|dl|min|stk|sek|m|g|l)\b\.?/g, function (_, u) { return ENHED[u]; });
    var out = [], re = /\d+(?:[.,]\d+)?/g, last = 0, m;
    function tekst(x) { x = x.replace(/\s+/g, ' ').replace(/^[\s,.:;]+/, '').replace(/\s+([,.?!:;])/g, '$1').trim(); if (x && /[A-Za-zÆØÅæøå]/.test(x)) out.push({ t: x }); }
    while ((m = re.exec(t))) { tekst(t.slice(last, m.index)); out.push({ n: m[0] }); last = m.index + m[0].length; }
    tekst(t.slice(last));
    return out;
  }
  function ordene(x) { return (x.toLowerCase().match(/[a-zæøåéü]+/g) || []); }
  // Nøglerne til lydfilerne, der skal afspilles i rækkefølge — eller null, hvis noget mangler
  function stykkeKoe(text) {
    if (!stykker || !text) return null;
    var koe = [], dd = dele(text);
    for (var i = 0; i < dd.length; i++) {
      var d = dd[i], k;
      if (d.n != null) {
        var ws = ordene(talTekst(d.n)); if (!ws.length) return null;
        for (var a = 0; a < ws.length; a++) { k = stykker.o[ws[a]]; if (!k) return null; koe.push(k); }
      } else if (stykker.s[d.t]) koe.push(stykker.s[d.t]);
      else {
        var ow = ordene(d.t); if (!ow.length) continue;
        for (var b = 0; b < ow.length; b++) { k = stykker.o[ow[b]]; if (!k) return null; koe.push(k); }
      }
    }
    return koe.length ? koe : null;
  }
  function spilKoe(koe, my, done) {
    var i = 0;
    (function naeste() {
      if (my !== token || i >= koe.length) { if (my === token) done(); return; }
      audio = new Audio('lyd/' + koe[i++] + '.mp3');
      audio.onended = naeste; audio.onerror = done;
      var p = audio.play(); if (p && p.catch) p.catch(done);
    })();
  }

  function pickVoice() {
    if (!synth) return;
    var vs = synth.getVoices();
    // Kun stemmer, der kører på selve enheden. Chromes "Google Dansk" sender
    // teksten til Googles servere, og så får en tredjepart barnets IP-adresse.
    daVoice = vs.filter(function (v) { return /^da([-_]|$)/i.test(v.lang) && v.localService !== false; })[0] || null;
  }
  if (synth) { pickVoice(); if (synth.addEventListener) synth.addEventListener('voiceschanged', pickVoice); else synth.onvoiceschanged = pickVoice; }

  // Browserstemmen får lidt forskellig tonehøjde pr. person, ligesom filerne
  var PITCH = { far: 0.8, poulsen: 0.8, pedel: 0.75, kioskmand: 0.85, nabo: 0.8, hundelufter: 0.9, sportslaerer: 0.9,
    mor: 1.1, bibliotekar: 1.05, ekspedient: 1.1, emma: 1.25, sofie: 1.3, ida: 1.4, oskar: 1.25, viggo: 1.35, bogorm: 1.3, player: 1.3 };

  function stop() {
    token++;
    if (audio) { try { audio.pause(); } catch (e) { } audio = null; }
    if (synth) try { synth.cancel(); } catch (e) { }
    if (RH.audio && RH.audio.duck) RH.audio.duck(false);
  }

  function speak(text, profile) {
    stop();
    if (!on || !text) return;
    profile = profile || 'fortaeller';
    var my = token, k = key(profile, text);
    if (RH.audio && RH.audio.duck) RH.audio.duck(true);
    var done = function () { if (my === token && RH.audio && RH.audio.duck) RH.audio.duck(false); };
    if (have[k]) {
      audio = new Audio('lyd/' + k + '.mp3');
      audio.onended = done; audio.onerror = function () { done(); };
      var p = audio.play(); if (p && p.catch) p.catch(done);
      return;
    }
    var koe = !(synth && daVoice) && stykkeKoe(text);
    if (koe) { spilKoe(koe, my, done); return; }
    if (synth && daVoice) {
      var u = new SpeechSynthesisUtterance(clean(text));
      u.lang = daVoice.lang; u.voice = daVoice; u.rate = 0.92; u.pitch = PITCH[profile] || 1;
      u.onend = done; u.onerror = done;
      synth.speak(u);
      return;
    }
    done();
  }

  // ---- "Læs opgaver op": spørgsmål + svarmuligheder efter hinanden
  // Barnets valg ligger på serveren (LF_SPILLER.elev.oplaes, sat af den voksne på /konto eller i menuen).
  // Voksne, der spiller selv, har kun en lokal indstilling.
  var opgLokal = false;
  function opgaverOn() {
    var me = window.LF_SPILLER;
    if (me && me.elev) return !!me.elev.oplaes;
    return opgLokal;
  }
  function sætOpgaver(v) {
    v = !!v;
    var me = window.LF_SPILLER;
    if (me && me.elev) {
      me.elev.oplaes = v ? 1 : 0;
      try { fetch('/api/profil.php', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-LF': '1' }, body: JSON.stringify({ handling: 'oplaes', til: v ? 1 : 0 }) }); } catch (e) { }
    } else opgLokal = v;
    if (v) on = true;
  }
  // Én tekst; kalder naeste() når den er læst (eller ikke kan læses)
  function en(text, profile, my, naeste) {
    profile = profile || 'fortaeller';
    var k = key(profile, text);
    if (have[k]) {
      audio = new Audio('lyd/' + k + '.mp3');
      audio.onended = naeste; audio.onerror = naeste;
      var p = audio.play(); if (p && p.catch) p.catch(naeste);
      return;
    }
    var koe = !(synth && daVoice) && stykkeKoe(text);
    if (koe) { spilKoe(koe, my, naeste); return; }
    if (synth && daVoice) {
      var u = new SpeechSynthesisUtterance(clean(text));
      u.lang = daVoice.lang; u.voice = daVoice; u.rate = 0.92; u.pitch = PITCH[profile] || 1;
      u.onend = naeste; u.onerror = naeste;
      synth.speak(u);
      return;
    }
    naeste();
  }
  // liste: [{tekst, hvem?, start?: fn}] — start() kaldes lige før hvert stykke (til fremhævning)
  function raekke(liste, done) {
    stop();
    if (!(on || opgaverOn()) || !liste || !liste.length) { if (done) done(); return; }
    var my = token, i = 0;
    if (RH.audio && RH.audio.duck) RH.audio.duck(true);
    (function naeste() {
      if (my !== token) return;
      if (i >= liste.length) { if (RH.audio && RH.audio.duck) RH.audio.duck(false); if (done) done(); return; }
      var x = liste[i++];
      if (!x || !x.tekst) { naeste(); return; }
      if (x.start) x.start();
      en(String(x.tekst), x.hvem, my, function () { setTimeout(naeste, 250); });
    })();
  }

  RH.voice = {
    speak: speak, stop: stop, clean: clean, key: key, dele: dele, ordene: ordene, talTekst: talTekst, raekke: raekke,
    get opgaver() { return opgaverOn(); }, set opgaver(v) { sætOpgaver(v); },
    setLokalOpgaver: function (v) { opgLokal = !!v; },
    get on() { return on; }, set on(v) { on = !!v; if (!on) stop(); },
    // Kan netop den her tekst læses op?
    has: function (text, profile) { return !!text && (!!have[key(profile || 'fortaeller', text)] || !!daVoice || !!stykkeKoe(text)); }
  };
})();
