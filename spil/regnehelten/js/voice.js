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
    if (synth && daVoice) {
      var u = new SpeechSynthesisUtterance(clean(text));
      u.lang = daVoice.lang; u.voice = daVoice; u.rate = 0.92; u.pitch = PITCH[profile] || 1;
      u.onend = done; u.onerror = done;
      synth.speak(u);
      return;
    }
    done();
  }

  RH.voice = {
    speak: speak, stop: stop, clean: clean, key: key,
    get on() { return on; }, set on(v) { on = !!v; if (!on) stop(); },
    // Kan netop den her tekst læses op?
    has: function (text, profile) { return !!text && (!!have[key(profile || 'fortaeller', text)] || !!daVoice); }
  };
})();
