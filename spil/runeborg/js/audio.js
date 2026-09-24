/* Runeborg — lyd
   Alt lyd laves med WebAudio i browseren: ingen lydfiler. Musikken er
   plukkede "lut"-toner over en blød bund — roligt tempo, masser af luft og
   lav lydstyrke. Den skal kunne køre i baggrunden uden at blive en plage. */
(function () {
  'use strict';
  var RB = window.RB = window.RB || {};
  var ctx = null, master = null, musicBus = null, sfxBus = null;
  var musicOn = true, sfxOn = true;
  var current = null, timer = null, nextTime = 0, step = 0;

  function ensure() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = musicOn ? 0.55 : 0; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = sfxOn ? 0.8 : 0; sfxBus.connect(master);
    // en lille rumklang, så tonerne ikke står helt nøgne
    var delay = ctx.createDelay(); delay.delayTime.value = 0.23;
    var fb = ctx.createGain(); fb.gain.value = 0.28;
    var wet = ctx.createGain(); wet.gain.value = 0.35;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    musicBus.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(wet); wet.connect(master);
    return ctx;
  }

  function freq(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  var NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function midi(s) { // "D4", "F#3", "Bb4"
    var m = /^([A-G])([#b]?)(\d)$/.exec(s); if (!m) return null;
    return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  }

  function pluck(t, n, dur, vol, bus, type) {
    var o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = type || 'triangle'; o.frequency.value = freq(n);
    f.type = 'lowpass'; f.frequency.setValueAtTime(2600, t); f.frequency.exponentialRampToValueAtTime(700, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
  }
  function pad(t, n, dur, vol) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq(n);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.35);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + dur + 0.05);
  }

  // Temaer: melodi i ottendedele ("-" = pause, "." = hold), akkorder pr. takt.
  var THEMES = {
    by: { bpm: 84, mel: 'D5 . F#5 A5 . F#5 G5 . E5 D5 . - - - - - E5 . F#5 G5 . B5 A5 . F#5 E5 . - - - - - F#5 . A5 D6 . A5 B5 . G5 F#5 . E5 D5 . - - E5 . G5 F#5 . D5 E5 . C#5 D5 . - - - - -', ch: ['D3 A3', 'G2 D3', 'E3 B3', 'A2 E3', 'D3 A3', 'B2 F#3', 'G2 D3', 'A2 D3'] },
    kro: { bpm: 104, mel: 'A4 C#5 E5 . C#5 A4 B4 D5 F#5 . D5 B4 A4 C#5 E5 A5 . E5 F#5 E5 D5 C#5 B4 . A4 . - - - - - -', ch: ['A2 E3', 'D3 A3', 'A2 E3', 'E3 B3'] },
    bog: { bpm: 70, mel: 'E5 . - G5 . - B5 . A5 . - - - - - - D5 . - F#5 . - A5 . G5 . - - - - - -', ch: ['E3 B3', 'C3 G3', 'D3 A3', 'B2 F#3'] },
    alk: { bpm: 76, mel: 'A4 . C5 . E5 . D#5 . E5 . - - - - - - G4 . B4 . D5 . C#5 . D5 . - - - - - -', ch: ['A2 E3', 'F2 C3', 'G2 D3', 'E2 B2'] },
    farve: { bpm: 72, mel: 'D5 . - - C5 . - - Bb4 . A4 . - - - - D5 . - - F5 . E5 . D5 . - - - - - -', ch: ['D3 A3', 'Bb2 F3', 'C3 G3', 'A2 E3'] },
    fest: { bpm: 112, mel: 'G5 . E5 C5 . E5 G5 . C6 . - - B5 . A5 . F5 . A5 . C6 . B5 . G5 . - - - - - -', ch: ['C3 G3', 'F2 C3', 'D3 A3', 'G2 D3'] }
  };

  function tick() {
    if (!ctx || !current) return;
    var th = THEMES[current], eighth = 60 / th.bpm / 2;
    var mel = th.mel.split(' ');
    while (nextTime < ctx.currentTime + 0.25) {
      var i = step % mel.length, tok = mel[i];
      if (tok !== '-' && tok !== '.') {
        var len = 1; while (mel[(i + len) % mel.length] === '.' && len < 8) len++;
        pluck(nextTime, midi(tok), Math.max(0.5, eighth * len * 1.6), 0.07, musicBus);
      }
      if (i % 8 === 0) {
        var bar = (i / 8 | 0) % th.ch.length, notes = th.ch[bar].split(' ');
        notes.forEach(function (n, k) { pluck(nextTime + k * 0.03, midi(n), eighth * 7, 0.05, musicBus, 'sine'); });
        pad(nextTime, midi(notes[0]) + 12, eighth * 8, 0.018);
      }
      if (i % 8 === 4) { var nb = th.ch[(i / 8 | 0) % th.ch.length].split(' '); pluck(nextTime, midi(nb[1]), eighth * 3, 0.035, musicBus, 'sine'); }
      nextTime += eighth; step++;
    }
  }

  RB.audio = {
    unlock: function () { var c = ensure(); if (c && c.state === 'suspended') c.resume(); },
    music: function (name) {
      if (name === current) return;
      current = name; step = 0;
      if (!ensure()) return;
      nextTime = ctx.currentTime + 0.3;
      if (!timer) timer = setInterval(tick, 90);
    },
    // Musikken dæmpes, mens en replik bliver læst op
    duck: function (down) { if (musicBus && musicOn) musicBus.gain.setTargetAtTime(down ? 0.16 : 0.55, ctx.currentTime, 0.15); },
    setMusic: function (on) { musicOn = on; if (musicBus) musicBus.gain.setTargetAtTime(on ? 0.55 : 0, ctx.currentTime, 0.2); },
    setSfx: function (on) { sfxOn = on; if (sfxBus) sfxBus.gain.setTargetAtTime(on ? 0.8 : 0, ctx.currentTime, 0.05); },
    get musicOn() { return musicOn; }, get sfxOn() { return sfxOn; },
    sfx: function (kind) {
      if (!sfxOn || !ensure()) return;
      var t = ctx.currentTime;
      var seqs = {
        blip: [[76, 0, 0.06, 0.05]],
        step: [[40, 0, 0.04, 0.02]],
        open: [[67, 0, 0.12, 0.08], [74, 0.06, 0.16, 0.07]],
        good: [[72, 0, 0.18, 0.09], [76, 0.08, 0.18, 0.09], [79, 0.16, 0.4, 0.1]],
        soft: [[60, 0, 0.22, 0.07], [57, 0.1, 0.3, 0.06]],
        pick: [[84, 0, 0.1, 0.07], [88, 0.06, 0.1, 0.07], [91, 0.12, 0.25, 0.07]],
        quest: [[67, 0, 0.2, 0.09], [71, 0.12, 0.2, 0.09], [74, 0.24, 0.2, 0.09], [79, 0.36, 0.6, 0.1]],
        door: [[48, 0, 0.12, 0.08], [43, 0.08, 0.2, 0.06]],
        skill: [[74, 0, 0.15, 0.08], [78, 0.1, 0.15, 0.08], [81, 0.2, 0.15, 0.08], [86, 0.3, 0.7, 0.09]]
      };
      (seqs[kind] || seqs.blip).forEach(function (s) { pluck(t + s[1], s[0], s[2] * 2, s[3], sfxBus, kind === 'step' ? 'sine' : 'square'); });
    }
  };
})();
