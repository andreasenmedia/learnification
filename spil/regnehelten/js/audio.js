/* Regnehelten — lyd
   Som i Runeborg laves alt med WebAudio i browseren: ingen lydfiler.
   Melodierne er de samme rolige temaer som i den første udgave af
   Regnehelten — ét pr. sted, langsomme, med god luft imellem tonerne og
   lav lydstyrke — spillet på Runeborgs bløde "plukkede" klang. Musikken
   skal kunne køre i en time uden at blive en plage. */
(function () {
  'use strict';
  var RH = window.RH = window.RH || {};
  var ctx = null, master = null, musicBus = null, sfxBus = null;
  var musicOn = true, sfxOn = true;
  var current = null, timer = null, melT = 0, padT = 0, melI = 0, padI = 0, parsed = {};

  function ensure() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = musicOn ? 0.5 : 0; musicBus.connect(master);
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
  // "C4:3 - E4:2" -> [[midi|null, slag]] ('-' er en pause)
  function seq(s) {
    return s.split(/\s+/).filter(Boolean).map(function (tok) {
      var p = tok.split(':'), n = p[0], d = p[1] ? parseFloat(p[1]) : 1;
      return [n === '-' ? null : midi(n), d];
    });
  }

  function pluck(t, n, dur, vol, bus, type) {
    var o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = type || 'triangle'; o.frequency.value = freq(n);
    f.type = 'lowpass'; f.frequency.setValueAtTime(2400, t); f.frequency.exponentialRampToValueAtTime(650, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
  }
  function pad(t, n, dur, vol) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq(n);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(2.5, dur * 0.35));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + dur + 0.05);
  }

  // Ét tema pr. sted. Langsomt tempo, få toner, god plads imellem dem.
  var THEMES = {
    cutscene: { bpm: 60, vol: 0.40, mel: 'A4:3 - G4:2 E4:4 - F4:3 - E4:2 D4:5 - C4:3 - E4:2 A4:4 - G4:6 -:2', pad: 'A2:8 F2:8 C3:8 E2:8 A2:8 D3:8 E3:8 A2:8' },
    hjem: { bpm: 68, vol: 0.34, mel: 'F4:3 - A4:2 C5:4 - - A4:2 G4:2 F4:4 - Bb4:3 - A4:2 G4:4 - - F4:4 -:3', pad: 'F2:8 F2:8 Bb2:8 C3:8 F2:8 Bb2:8 C3:8 F2:8' },
    by: { bpm: 80, vol: 0.30, mel: 'G4:2 B4:2 D5:3 - B4:2 A4:3 - G4:4 - C5:2 B4:2 A4:3 - G4:2 E4:3 - G4:4 -:2', pad: 'G2:8 D3:8 E3:8 C3:8 G2:8 C3:8 D3:8 G2:8' },
    butik: { bpm: 84, vol: 0.28, mel: 'C5:2 - E5:2 - D5:3 - C5:2 A4:3 - F4:2 - A4:2 - G4:3 - E4:2 C4:3 - -:2', pad: 'C3:8 A2:8 F2:8 G2:8 C3:8 F2:8 G2:8 C3:8' },
    skolegaard: { bpm: 88, vol: 0.30, mel: 'E5:2 - C5:2 - G4:3 - A4:2 C5:3 - D5:2 - B4:2 - G4:3 - A4:2 G4:4 - -:2', pad: 'C3:8 G2:8 A2:8 F2:8 C3:8 G2:8 F2:8 C3:8' },
    skole: { bpm: 72, vol: 0.26, mel: 'D4:3 - F4:2 A4:4 - - G4:2 F4:4 - E4:3 - G4:2 F4:4 - - D4:4 -:3', pad: 'D3:8 D3:8 Bb2:8 F2:8 C3:8 A2:8 D3:8 D3:8' },
    klasse: { bpm: 64, vol: 0.26, mel: 'G4:4 - - E4:3 - C4:4 - - F4:4 - - E4:3 - D4:4 - - -:2', pad: 'C3:8 C3:8 A2:8 F2:8 G2:8 C3:8 G2:8 C3:8' },
    park: { bpm: 66, vol: 0.30, mel: 'A4:3 - C5:2 E5:4 - - D5:2 C5:4 - G4:3 - A4:2 C5:4 - - A4:4 -:3', pad: 'A2:8 E3:8 F2:8 C3:8 G2:8 D3:8 A2:8 A2:8' },
    bibliotek: { bpm: 58, vol: 0.22, mel: 'E4:4 - - G4:4 - - A4:4 - - G4:4 - - E4:4 - - D4:4 - - E4:6 -:4', pad: 'A2:8 A2:8 E3:8 E3:8 F2:8 C3:8 A2:8 A2:8' },
    slut: { bpm: 74, vol: 0.42, mel: 'C5:3 - E5:2 G5:4 - - E5:2 F5:3 - E5:4 - D5:3 - C5:2 E5:4 - - C5:5 -:3', pad: 'C3:8 G2:8 A2:8 F2:8 F2:8 C3:8 G2:8 C3:8' }
  };
  function theme(name) {
    if (!parsed[name]) { var th = THEMES[name]; parsed[name] = { bpm: th.bpm, vol: th.vol, mel: seq(th.mel), pad: seq(th.pad) }; }
    return parsed[name];
  }

  function tick() {
    if (!ctx || !current) return;
    var th = theme(current), beat = 60 / th.bpm, ahead = ctx.currentTime + 0.3, v = th.vol;
    while (melT < ahead) {
      var ev = th.mel[melI % th.mel.length];
      if (ev[0] != null) pluck(melT, ev[0], Math.max(0.6, beat * ev[1] * 1.3), 0.07 * v / 0.3, musicBus);
      melT += beat * ev[1]; melI++;
    }
    while (padT < ahead) {
      var pv = th.pad[padI % th.pad.length];
      if (pv[0] != null) { pad(padT, pv[0], beat * pv[1], 0.022 * v / 0.3); pad(padT, pv[0] + 7, beat * pv[1], 0.012 * v / 0.3); pluck(padT, pv[0] + 12, beat * 3, 0.03 * v / 0.3, musicBus, 'sine'); }
      padT += beat * pv[1]; padI++;
    }
  }

  RH.audio = {
    unlock: function () { var c = ensure(); if (c && c.state === 'suspended') c.resume(); },
    music: function (name) {
      if (name === current || !THEMES[name]) return;
      current = name; melI = 0; padI = 0;
      if (!ensure()) return;
      melT = padT = ctx.currentTime + 0.4;
      if (!timer) timer = setInterval(tick, 100);
    },
    get current() { return current; },
    // Musikken dæmpes, mens en replik bliver læst op
    duck: function (down) { if (musicBus && musicOn) musicBus.gain.setTargetAtTime(down ? 0.14 : 0.5, ctx.currentTime, 0.15); },
    setMusic: function (on) { musicOn = on; if (musicBus) musicBus.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, 0.2); },
    setSfx: function (on) { sfxOn = on; if (sfxBus) sfxBus.gain.setTargetAtTime(on ? 0.8 : 0, ctx.currentTime, 0.05); },
    get musicOn() { return musicOn; }, get sfxOn() { return sfxOn; },
    sfx: function (kind) {
      if (!sfxOn || !ensure()) return;
      var t = ctx.currentTime;
      var seqs = {
        blip: [[76, 0, 0.06, 0.05]],
        open: [[67, 0, 0.12, 0.07], [74, 0.06, 0.16, 0.06]],
        good: [[72, 0, 0.18, 0.09], [76, 0.08, 0.18, 0.09], [79, 0.16, 0.4, 0.1]],
        soft: [[60, 0, 0.22, 0.07], [57, 0.1, 0.3, 0.06]],
        pick: [[84, 0, 0.1, 0.07], [88, 0.06, 0.1, 0.07], [91, 0.12, 0.25, 0.07]],
        quest: [[67, 0, 0.2, 0.09], [71, 0.12, 0.2, 0.09], [74, 0.24, 0.2, 0.09], [79, 0.36, 0.6, 0.1]],
        door: [[48, 0, 0.12, 0.08], [43, 0.08, 0.2, 0.06]],
        item: [[74, 0, 0.15, 0.08], [78, 0.1, 0.15, 0.08], [81, 0.2, 0.15, 0.08], [86, 0.3, 0.7, 0.09]],
        fanfare: [[72, 0, 0.2, 0.09], [76, 0.18, 0.2, 0.09], [79, 0.36, 0.2, 0.09], [84, 0.54, 0.9, 0.1]]
      };
      (seqs[kind] || seqs.blip).forEach(function (s) { pluck(t + s[1], s[0], s[2] * 2, s[3], sfxBus, 'square'); });
    }
  };
})();
