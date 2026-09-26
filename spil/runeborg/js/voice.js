/* Runeborg — oplæsning
   Replikkerne er læst ind på forhånd med Piper (lokal, open source tale-
   syntese) af tools/runeborg-stemmer.py og ligger som lyd/<nøgle>.mp3.
   Nøglen er en hash af personen + den rensede tekst, så den samme replik
   altid finder den samme fil. Spillerens navn læses som "lærling", fordi
   det ikke kan indtales på forhånd.

   Mangler en fil, bruges enhedens egen danske stemme, hvis den har en.
   Har den ingen, er der stille — hellere det end en engelsk stemme, der
   læser dansk. clean() og hash() SKAL svare til dem i runeborg-stemmer.py. */
(function () {
  'use strict';
  var RB = window.RB = window.RB || {};
  var on = true, have = {}, audio = null, synth = window.speechSynthesis || null, daVoice = null, token = 0;

  function clean(text) {
    return String(text)
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\{navn\}/g, 'lærling')
      .replace(/[«»"♪]/g, '')
      .replace(/\s*—\s*/g, ', ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function hash(s) {                       // FNV-1a, 32 bit, som hex
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  function key(profile, text) { return hash(profile + '|' + clean(text)); }

  // Hvilke filer findes? (lille liste, hentes én gang)
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
  var PITCH = { brynja: 0.8, gorm: 0.7, bjorn: 0.7, durin: 0.7, ole: 0.8, troels: 0.8, ulf: 0.75, aldrik: 0.8, baron: 0.85, esben: 0.85, karl: 0.85,
    sigrid: 1.35, aksel: 1.35, laerke: 1.15, liv: 1.15, mira: 1.1, agnete: 1.05, bodil: 1.05, ugla: 1.05, zara: 1.0, hilde: 0.95, knud: 1.0 };

  function stop() {
    token++;
    if (audio) { try { audio.pause(); } catch (e) { } audio = null; }
    if (synth) try { synth.cancel(); } catch (e) { }
    if (RB.audio && RB.audio.duck) RB.audio.duck(false);
  }

  function speak(text, profile) {
    stop();
    if (!on || !text) return;
    profile = profile || 'fortaeller';
    var my = token, k = key(profile, text);
    if (RB.audio && RB.audio.duck) RB.audio.duck(true);
    var done = function () { if (my === token && RB.audio && RB.audio.duck) RB.audio.duck(false); };
    if (have[k]) {
      audio = new Audio('lyd/' + k + '.mp3');
      audio.volume = 1;
      audio.onended = done; audio.onerror = function () { done(); };
      var p = audio.play(); if (p && p.catch) p.catch(done);
      return;
    }
    if (synth && daVoice) {
      var u = new SpeechSynthesisUtterance(clean(text));
      u.lang = daVoice.lang; u.voice = daVoice; u.rate = 0.95; u.pitch = PITCH[profile] || 1;
      u.onend = done; u.onerror = done;
      synth.speak(u);
      return;
    }
    done();
  }

  RB.voice = {
    speak: speak, stop: stop, clean: clean, key: key,
    get on() { return on; }, set on(v) { on = !!v; if (!on) stop(); },
    // Kan der overhovedet læses op i denne browser?
    available: function () { return Object.keys(have).length > 0 || !!daVoice; }
  };
})();
