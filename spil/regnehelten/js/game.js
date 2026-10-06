/* Regnehelten — motoren
   Samme motor som Runeborg: tilstand, gemning, bevægelse på felter,
   samtaler, døre, kamera, tegning og stemning (lyset følger dagen — tidlig
   morgen med gadelygterne tændt, formiddag, eftermiddag — blade, der
   falder, røg fra skorstene og ænder på dammen). Det, der er Regneheltens
   eget, er opgavesættene (g.saet), tingene i tasken og pausespillene. */
(function () {
  'use strict';
  var RH = window.RH, K, UI, O, T = 16, VW = 320, VH = 180, SCALE = 4;
  // Er man logget ind, har hvert barn sit eget spil — ellers ville en klasse,
  // der deler computere, spille videre i hinandens. Id'et står i cookien lf_in.
  var SPILLER = (document.cookie.match(/(?:^|;\s*)lf_in=((?:elev|voksen)\.\d+)/) || [])[1];
  var SAVE = 'regnehelten-v2' + (SPILLER ? '-' + SPILLER : ''), SETTINGS = 'regnehelten-indstillinger';

  var canvas = document.getElementById('screen');
  var ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;

  // Lærredet følger vinduet: en hel pixelskala, så den korte side viser ca. 11 felter
  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    SCALE = Math.max(1, Math.floor(Math.min(w, h) / 176));
    VW = Math.ceil(w / SCALE); VH = Math.ceil(h / SCALE);
    canvas.width = VW; canvas.height = VH;
    canvas.style.width = VW * SCALE + 'px'; canvas.style.height = VH * SCALE + 'px';
    ctx.imageSmoothingEnabled = false;
    leaves = [];
    if (S) snapCam();
  }
  window.addEventListener('resize', resize);

  var S = null, world = null, cache = {}, sheets = {}, dogSheet = null;
  var player = { px: 0, py: 0, moving: false, fromX: 0, fromY: 0, t: 0, alt: false };
  var busy = false, started = false, tick = 0, heldOrder = [];
  var cam = { x: 0, y: 0 }, particles = [], leaves = [];

  // ---------------------------------------------------------------- tilstand
  function fresh(name, klasse, look) {
    return {
      // kap = kapitlet, man spiller nu; klaret = de kapitler, man har gennemført; klasse følger kapitlet (startKlasse + kap − 1, højst 6)
      v: 3, kap: 1, klaret: [], startKlasse: klasse, name: name, klasse: klasse, look: look, map: 'klasse', x: 8, y: 9, dir: 'up', cut: true, tom: false,
      q: {}, flags: {}, sets: {}, loest: {}, runde: {}, mastery: {}, kraft: 10, total: { n: 0, first: 0 }, persist: 0,
      bag: { owned: [], counts: {}, plays: { fodbold: 0, dressup: 0 } }, seen: {}, talks: 0, res: RH.resultat.nyOmgang()
    };
  }
  var FOTO = (location.hash.match(/foto=(\w+)/) || [])[1];   // tools/regnehelten-billeder.py tager skærmbilleder sådan
  // Gem først, når et rigtigt spil er i gang — titelskærmens baggrund må aldrig
  // overskrive det, man har gemt. `laast` bliver sat, når en anden skærm har
  // gemt noget nyere: så må den her fane ikke gemme mere.
  var laast = false;
  function save(nu) {
    if (!S || FOTO || !started || laast) return;
    var d = JSON.stringify(S);
    try { localStorage.setItem(SAVE, d); } catch (e) { /* privat vindue */ }
    RH.gem.gem(d, nu === true);
  }
  function lokal() {
    try {
      var d = localStorage.getItem(SAVE);
      if (d) return d;
      // Et spil fra den første udgave (Python i browseren) lå et andet sted
      var gl = JSON.parse(localStorage.getItem('regnehelten-gem:' + (RH.gem.inde || 'gaest')) || 'null');
      return gl && gl.data ? (typeof gl.data === 'string' ? gl.data : JSON.stringify(gl.data)) : null;
    } catch (e) { return null; }
  }
  function parse(tekst) {
    try {
      var s = typeof tekst === 'string' ? JSON.parse(tekst) : tekst;
      if (!s || s.slettet) return null;
      if (s.v === 2) { s.v = 3; s.kap = 1; s.klaret = s.q && s.q.q5 === 'done' ? [1] : []; s.startKlasse = s.klasse; }
      if (s.v === 3) { s.klaret = s.klaret || []; s.kap = s.kap || 1; s.startKlasse = s.startKlasse || s.klasse; return s; }
      if (s.navn !== undefined && s.chapter !== undefined) return parse(fraFoersteUdgave(s));
    } catch (e) { /* ødelagt */ }
    return null;
  }
  // Et gemt spil fra Python-udgaven: navn, klasse, udseende, ting og hvor
  // langt man nåede kommer med over. Man fortsætter ved den næste mission.
  function fraFoersteUdgave(d) {
    var A = d.appearance || {}, hex = function (v, std) { return Array.isArray(v) ? '#' + v.map(function (n) { return ('0' + (n | 0).toString(16)).slice(-2); }).join('') : std; };
    var look = {
      skin: hex(A.skin, K.STD_LOOK.skin), hair: hex(A.hair, K.STD_LOOK.hair), cloth: hex(A.shirt, K.STD_LOOK.cloth), pants: hex(A.pants, K.STD_LOOK.pants),
      style: ['kort', 'lang', 'kroeller', 'kasket'].indexOf(A.hair_style) >= 0 ? A.hair_style : 'kort', extra: A.extra || 'ingen', hatColor: '#c8282e'
    };
    var s = fresh(String(d.navn || '').slice(0, 12) || 'Regnehelt', O.KLASSER.indexOf(d.klasse) >= 0 ? d.klasse : O.STANDARD_KLASSE, look);
    s.cut = false; s.map = 'hjem'; s.x = 4; s.y = 3; s.dir = 'up';
    var kap = Math.max(0, Math.min(6, d.chapter | 0)), ids = ['q0', 'q1', 'q2', 'q3', 'q4', 'q5'], flags = [null, 'hjemUd', 'skolegaard', 'skoleInd', 'klasseInd', null];
    for (var i = 0; i < kap; i++) { s.q[ids[i]] = 'done'; if (flags[i]) s.flags[flags[i]] = true; }
    if (kap < 6) s.q[ids[kap]] = 'active';
    var side = { kioskmand: 's1', bibliotekar: 's2', viggo: 's3', hundelufter: 's4', sportslaerer: 's5', pedel: 's6' };
    (d.done_quests || []).forEach(function (id) { if (side[id]) s.q[side[id]] = 'done'; });
    s.kraft = Math.max(0, Math.min(100, d.confidence | 0)) || 10;
    s.total = { n: d.total_questions | 0, first: d.total_first_try | 0 };
    var bl = { 'HUSK': 1, 'FORSTÅ': 1, 'ANVEND': 1, 'ANALYSÉR': 1, 'VURDÉR': 1, 'SKAB': 1 };
    Object.keys(d.mastery || {}).forEach(function (k) { if (bl[k]) s.mastery[k] = d.mastery[k] | 0; });
    var bag = d.bag || {};
    (bag.owned || []).forEach(function (id) { if (K.ITEMS[id] && s.bag.owned.indexOf(id) < 0) { s.bag.owned.push(id); s.bag.counts[id] = (bag.counts || {})[id] | 0 || 1; } });
    Object.keys(bag.plays || {}).forEach(function (k) { if (k in s.bag.plays) s.bag.plays[k] = Math.max(0, Math.min(K.MAX_PLAYS, bag.plays[k] | 0)); });
    if (d.resultat && d.resultat.id) { s.res.id = String(d.resultat.id); s.res.svar = d.resultat.svar || []; s.res.sek = d.resultat.sekunder | 0; s.res.faerdig = !!d.resultat.faerdig; }
    // Kom man helt i mål i Python-udgaven, står man i klassen bagefter
    if (kap >= 6) { s.map = 'klasse'; s.x = 6; s.y = 4; s.dir = 'up'; s.klaret = [1]; }
    else if (kap >= 2) { var steder = { 2: ['by', 8, 10], 3: ['by', 22, 13], 4: ['by', 51, 15], 5: ['skole', 13, 11] }[kap]; s.map = steder[0]; s.x = steder[1]; s.y = steder[2]; s.dir = 'down'; }
    return s;
  }
  RH.saveSettings = function () {
    try { localStorage.setItem(SETTINGS, JSON.stringify({ music: RH.audio.musicOn, sfx: RH.audio.sfxOn, voice: RH.voice.on, big: document.body.classList.contains('big') })); } catch (e) { }
  };
  function loadSettings() {
    try {
      var s = JSON.parse(localStorage.getItem(SETTINGS)); if (!s) return;
      RH.audio.setMusic(s.music !== false); RH.audio.setSfx(s.sfx !== false); RH.voice.on = s.voice !== false; document.body.classList.toggle('big', !!s.big);
    } catch (e) { }
  }
  RH.resetGame = function () {
    laast = true;
    // også kopien fra Python-udgaven, ellers dukker den op igen som "Fortsæt"
    try { localStorage.removeItem(SAVE); localStorage.removeItem('regnehelten-gem:' + (RH.gem.inde || 'gaest')); } catch (e) { }
    RH.gem.nulstil().then(function () { location.reload(); });
  };
  RH.gem.naarKonflikt(function () {
    laast = true;
    UI.konflikt().then(function () {
      var d = RH.gem.tagNyeste();
      try { if (parse(d)) localStorage.setItem(SAVE, d); else localStorage.removeItem(SAVE); } catch (e) { }
      location.reload();
    });
  });

  // ---------------------------------------------------------------- verden
  function prerender(map) {
    var fr = [0, 1].map(function (f) {
      var c = RH.canvas(map.w * T, map.h * T), x = c.getContext('2d');
      for (var ty = 0; ty < map.h; ty++) for (var tx = 0; tx < map.w; tx++) RH.drawTile(x, map, tx, ty, f);
      RH.drawSigns(x, map);
      return c;
    });
    cache[map.id] = fr;
  }
  function refresh() { world.klasse.cutscene = !!S.cut; cache = {}; }
  function mapNow() { return world[S.map]; }
  function frames() { var m = mapNow(); if (!cache[m.id]) prerender(m); return cache[m.id]; }

  function sheetFor(id) { return sheets[id] || (sheets[id] = RH.makeSheet(K.npcs[id].look)); }
  function who(id) {
    if (!id) return null;
    if (id === 'player') return { id: 'player', name: S.name, sheet: sheets.player };
    var n = K.npcs[id]; return { id: id, name: n.name, sheet: sheetFor(id) };
  }

  // Alt, der står på kortet lige nu: personer og ting (Sally)
  function entities() {
    var list = [], m = S.map;
    Object.keys(K.npcs).forEach(function (id) {
      if (S.cut && S.tom && id !== 'poulsen') return;            // bagefter, da klassen var tom
      var p = K.npcs[id].pos(S); if (!p || p.map !== m) return;
      list.push({ id: id, kind: 'npc', x: p.x, y: p.y, dir: npcDir[id] || p.dir });
    });
    K.things.forEach(function (t) { if (t.map === m && t.visible(S)) list.push({ id: t.id, kind: t.kind, x: t.x, y: t.y }); });
    return list;
  }
  var npcDir = {};
  function entityAt(x, y) { var es = entities(); for (var i = 0; i < es.length; i++) if (es[i].x === x && es[i].y === y) return es[i]; return null; }
  function blocked(x, y) { return mapNow().solid(x, y) || !!entityAt(x, y); }

  var DX = { up: 0, down: 0, left: -1, right: 1 }, DY = { up: -1, down: 1, left: 0, right: 0 };
  var THROUGH = 'A$e&wC';          // man kan tale hen over en disk, et bord eller en kasse

  function facingFrom(x, y, dir) {
    var fx = x + DX[dir], fy = y + DY[dir], m = mapNow();
    var e = entityAt(fx, fy);
    if (e) return { ent: e, x: fx, y: fy };
    if (THROUGH.indexOf(m.at(fx, fy)) >= 0) { var e2 = entityAt(fx + DX[dir], fy + DY[dir]); if (e2) return { ent: e2, x: e2.x, y: e2.y }; }
    var key = S.map + ':' + fx + ',' + fy;
    if (K.places[key]) return { place: K.places[key], x: fx, y: fy };
    if (!m.isOpen(fx, fy) && m.lockMsg[fx + ',' + fy]) return { locked: m.lockMsg[fx + ',' + fy], x: fx, y: fy };
    if (K.lockedDoors[key]) return { locked: K.lockedDoors[key], x: fx, y: fy };
    return null;
  }
  function facing() { return facingFrom(S.x, S.y, S.dir); }

  // ---------------------------------------------------------------- g: hjælpere til historien
  var g = {
    get S() { return S; },
    get world() { return world; },
    say: function (id, text, speakText) { return UI.say(who(id), text, speakText); },
    ask: function (id, text, choices) { return UI.ask(who(id), text, choices); },
    // Et helt opgavesæt. Giver {ratio} tilbage, eller null, hvis man trykkede "Senere".
    saet: async function (qid, saetNoegle, scene) {
      var specs = S.sets[qid];
      if (!specs) { specs = S.sets[qid] = O.lav(saetNoegle, S.klasse); save(); }
      var bloom = O.SAET[saetNoegle].bloom;
      for (var i = 0; i < specs.length; i++) {
        var key = qid + ':' + i;
        if (S.loest[key]) continue;
        var sp = specs[i], side = K.BOG.filter(function (p) { return p.id === sp.book; })[0];
        var r = await UI.opgave(sp, {
          who: sp.who ? who(sp.who) : null, area: 'Matematik · ' + (side ? side.title : ''), count: 'Opgave ' + (i + 1) + ' af ' + specs.length, kraft: S.kraft,
          onBook: function (id) { UI.book('regnebogen', id, true); }
        });
        if (!r) return null;
        S.loest[key] = true;
        var rd = S.runde[qid] || (S.runde[qid] = { n: 0, first: 0 }); rd.n++; if (r.first) rd.first++;
        S.total.n++; if (r.first) S.total.first++;
        if (r.klaret) S.kraft = Math.min(100, S.kraft + (r.first ? 6 : 3));
        if (r.klaret && !r.first) { S.persist++; if (S.persist === 1 || S.persist % 5 === 0) UI.toast('<b>Vedholdenhed!</b> Du gav ikke op — det er sådan, man bliver god.'); }
        RH.resultat.noter(S, scene, bloom, sp, r);
        RH.resultat.send(S, true);
        save(); hud();
      }
      var runde = S.runde[qid] || { n: 1, first: 0 }, ratio = runde.first / Math.max(1, runde.n);
      if (!K.quest(qid).side) S.mastery[bloom] = ratio >= 0.8 ? 3 : ratio >= 0.45 ? 2 : 1;
      delete S.sets[qid];
      RH.audio.sfx('quest');
      RH.resultat.send(S, true); save(); hud();
      return { ratio: ratio };
    },
    // Mindst 85 % rigtige i første forsøg giver en ting i tasken
    belonning: async function (qid, ratio) {
      var pct = Math.round(ratio * 100), id = K.REWARDS[qid];
      if (ratio < K.REWARD_PCT || !id) {
        if (ratio >= 0.6) await g.say(null, 'Du ramte ' + pct + ' % i første forsøg. Fra 85 % giver det en ting i tasken.');
        return;
      }
      var bag = S.bag, first = !bag.counts[id], it = K.ITEMS[id];
      if (first) bag.owned.push(id);
      bag.counts[id] = (bag.counts[id] || 0) + 1;
      if (it.unlocks) bag.plays[it.unlocks] = Math.min(K.MAX_PLAYS, (bag.plays[it.unlocks] || 0) + K.PLAYS_PER_ITEM);
      RH.audio.sfx('item'); save(); hud();
      UI.toast('<b>' + pct + ' % rigtige</b> — du fik ' + RH.esc(it.name) + '!');
      await g.say(null, pct + ' % rigtige i første forsøg. ' + it.name + ' er lagt i din taske.');
      if (it.unlocks) {
        var label = K.PAUSESPIL[it.unlocks], ture = bag.plays[it.unlocks];
        if (first) await g.say(null, label + ' er låst op! Du kan spille det fra tasken i Dagbogen (tryk <span class="key">B</span>). Du har ' + ture + ' ture.', label + ' er låst op! Du kan spille det fra tasken i Dagbogen. Du har ' + ture + ' ture.');
        else await g.say(null, 'Du har nu ' + ture + ' ture til ' + label + '.');
      }
    },
    start: function (id, quiet) {
      S.q[id] = 'active'; save(); hud();
      if (!quiet) { RH.audio.sfx('quest'); UI.toast('<b>Ny mission:</b> ' + RH.esc(K.quest(id).title)); }
    },
    finish: function (id) { S.q[id] = 'done'; save(); hud(); UI.toast('<b>Mission fuldført:</b> ' + RH.esc(K.quest(id).title)); },
    flag: function (k, v) { S.flags[k] = v === undefined ? true : v; save(); },
    seen: function (k) { if (S.seen[k]) return true; S.seen[k] = true; return false; },
    toast: function (h) { UI.toast(h); },
    // Hvordan går det med regningen? Folk siger noget forskelligt efter det.
    perf: function () { var t = S.total; if (t.n < 3) return 'mid'; var r = t.first / t.n; return r >= 0.75 ? 'good' : r < 0.5 ? 'low' : 'mid'; },
    tid: function () { return K.timeOfDay(S); },
    refresh: refresh,
    epilogue: epilogue,
    flyt: flyt,
    naesteKapitel: function () { return naesteKapitel(); },
    // Åbningsscenen: klassen tømmes ...
    tomKlasse: function () { return fadeTo(function () { S.tom = true; npcDir = {}; }); },
    // ... og så er det i morgen
    morgen: function () {
      return fadeTo(function () {
        S.cut = false; S.tom = false; S.map = 'hjem'; S.x = 4; S.y = 3; S.dir = 'up';
        player.px = S.x * T; player.py = S.y * T; refresh(); snapCam(); musik(); save(); hud();
      }, 900);
    }
  };
  function fadeTo(fn, hold) {
    return new Promise(function (resolve) {
      var f = document.getElementById('fade'); f.classList.add('on');
      setTimeout(function () { fn(); setTimeout(function () { f.classList.remove('on'); setTimeout(resolve, 250); }, hold || 300); }, 260);
    });
  }

  async function run(fn) {
    if (busy) return;
    busy = true;
    try { await fn(); } catch (e) { console.error(e); }
    busy = false; lastClose = performance.now(); hud(); save();
  }

  var lastClose = 0;
  function interact() {
    if (busy || UI.isOpen() || player.moving || S.cut) return;
    if (performance.now() - lastClose < 300) return;   // lige kommet ud af en samtale
    var f = facing(); if (!f) return;
    if (f.ent) {
      var e = f.ent;
      if (e.kind === 'npc') npcDir[e.id] = { up: 'down', down: 'up', left: 'right', right: 'left' }[S.dir];
      return run(function () { return K.talk(g, e.id); });
    }
    if (f.place) return run(function () { return K.talk(g, f.place); });
    if (f.locked) return run(function () { return g.say(null, f.locked); });
  }

  // ---------------------------------------------------------------- bevægelse
  var lastBump = 0;
  function tryMove(dir) {
    S.dir = dir;
    var nx = S.x + DX[dir], ny = S.y + DY[dir], m = mapNow();
    if (blocked(nx, ny)) {
      // går man ind i en låst dør, får man at vide hvorfor
      var msg = !m.isOpen(nx, ny) && m.lockMsg[nx + ',' + ny];
      if (msg && performance.now() - lastBump > 2500) { lastBump = performance.now(); UI.toast(RH.esc(msg)); }
      return;
    }
    player.fromX = S.x; player.fromY = S.y; S.x = nx; S.y = ny;
    player.moving = true; player.t = 0; player.alt = !player.alt;
  }
  function arrive() {
    var d = mapNow().doorAt(S.x, S.y);
    if (d) { go(d.to, d.tx, d.ty, d.dir); return; }
    if (mapNow().outdoor) musik();
  }
  function musik() { var m = mapNow(); RH.audio.music(S.cut ? 'cutscene' : m.outdoor ? m.zoneAt(S.x, S.y) : m.music); }
  function go(mapId, x, y, dir) {
    busy = true; RH.audio.sfx('door');
    var f = document.getElementById('fade'); f.classList.add('on');
    setTimeout(function () {
      S.map = mapId; S.x = x; S.y = y; S.dir = dir || S.dir;
      player.px = x * T; player.py = y * T; player.moving = false;
      musik(); snapCam(); save(); hud();
      f.classList.remove('on'); busy = false;
    }, 230);
  }

  function update() {
    tick++;
    if (!started) return;
    var blockedInput = busy || UI.isOpen();
    if (blockedInput) heldOrder = [];
    document.body.classList.toggle('ui-open', UI.isOpen());
    if (player.moving) {
      player.t += 1 / 8;
      var k = Math.min(1, player.t);
      player.px = (player.fromX + (S.x - player.fromX) * k) * T;
      player.py = (player.fromY + (S.y - player.fromY) * k) * T;
      if (player.t >= 1) { player.moving = false; player.px = S.x * T; player.py = S.y * T; arrive(); }
    }
    if (blockedInput) auto = null;
    if (!player.moving && !blockedInput && !S.cut) {
      var d = stickDir || (heldOrder.length ? heldOrder[heldOrder.length - 1] : null);
      if (d) { auto = null; tryMove(d); }      // joystick og taster vinder over et tryk
      else if (auto) autoSkridt();
    }
    // folk kigger sig lidt omkring, når ingen taler med dem
    if (tick % 120 === 0 && !busy && !UI.isOpen() && !S.cut) {
      var es = entities().filter(function (e) { return e.kind === 'npc'; });
      var e = es[(Math.random() * es.length) | 0];
      if (e && Math.random() < 0.5) npcDir[e.id] = ['down', 'left', 'right', 'down'][(Math.random() * 4) | 0];
    }
    if (tick % 20 === 0) updatePrompt();
  }

  // ---------------------------------------------------------------- kamera og tegning
  function snapCam() {
    var m = mapNow();
    cam.x = clampCam(player.px + 8 - VW / 2, m.w * T - VW);
    cam.y = clampCam(player.py + 8 - VH / 2, m.h * T - VH);
  }
  function clampCam(v, max) { return max < 0 ? max / 2 : Math.max(0, Math.min(max, v)); }

  function render() {
    var m = mapNow(), fr = frames();
    var tx = clampCam(player.px + 8 - VW / 2, m.w * T - VW), ty = clampCam(player.py + 8 - VH / 2, m.h * T - VH);
    cam.x += (tx - cam.x) * 0.25; cam.y += (ty - cam.y) * 0.25;
    var cx = Math.round(cam.x), cy = Math.round(cam.y);
    ctx.fillStyle = '#140f1c'; ctx.fillRect(0, 0, VW, VH);
    ctx.drawImage(fr[Math.floor(tick / 32) % 2], -cx, -cy);
    if (m.id === 'by') ducks(cx, cy);
    smoke(m, cx, cy);

    var draw = [];
    entities().forEach(function (e) { draw.push({ y: e.y * T, fn: function () { drawEntity(e, cx, cy); } }); });
    if (started) draw.push({ y: player.py, fn: function () { drawChar(sheets.player, player.px - cx, player.py - cy, S.dir, player.moving ? (player.t < 0.5 ? (player.alt ? 1 : 2) : 0) : 0); } });
    draw.sort(function (a, b) { return a.y - b.y; });
    draw.forEach(function (d) { d.fn(); });

    var marks = K.markers(S);
    entities().forEach(function (e) { if (marks[e.id]) RH.drawMarker(ctx, e.x * T - cx, e.y * T - cy - 13, marks[e.id], tick); });
    Object.keys(K.placePos).forEach(function (p) { var pp = K.placePos[p]; if (marks[p] && pp[0] === S.map) RH.drawMarker(ctx, pp[1] * T - cx, pp[2] * T - cy - 12, marks[p], tick); });

    lighting(m, cx, cy);
    if (m.outdoor) weather();
    if (started && !S.cut) arrow(cx, cy);
  }

  function drawChar(sheet, x, y, dir, frame) {
    x = Math.round(x); y = Math.round(y);
    RH.drawShadow(ctx, x, y);
    ctx.drawImage(sheet, frame * T, RH.DIR_ROW[dir] * T, T, T, x, y - 2, T, T);
  }
  function drawEntity(e, cx, cy) {
    var x = e.x * T - cx, y = e.y * T - cy;
    if (e.kind === 'npc') drawChar(sheetFor(e.id), x, y, e.dir || 'down', 0);
    else if (e.kind === 'dog') { RH.drawShadow(ctx, x, y); ctx.drawImage(dogSheet, (Math.floor(tick / 14) % 2) * 16, 0, 16, 16, x, y, 16, 16); }
    else if (e.kind.indexOf('dyr_') === 0) { RH.drawShadow(ctx, x, y); RH.drawAnimal(ctx, e.kind.slice(4), x, y, tick + e.x * 11); }
  }

  // ---------------------------------------------------------------- stemning
  var TINT = {
    tidlig: { fill: 'rgba(90,110,200,0.06)', mul: 'rgb(140,150,205)', lamp: 0.7, win: 0.75 },
    morgen: { fill: 'rgba(255,220,160,0.08)', mul: null, lamp: 0, win: 0 },
    formiddag: { fill: null, mul: null, lamp: 0, win: 0 },
    eftermiddag: { fill: 'rgba(255,180,100,0.10)', mul: 'rgb(250,226,200)', lamp: 0, win: 0 }
  };
  var INDE = {
    hjem: function (t) { return t === 'tidlig' ? { mul: 'rgb(240,212,182)', lamp: 0.55 } : { mul: 'rgb(252,242,228)', lamp: 0.12 }; },
    butik: function () { return { mul: null, lamp: 0 }; },
    bibliotek: function () { return { mul: 'rgb(246,230,204)', lamp: 0.4 }; },
    skole: function () { return { mul: 'rgb(238,240,250)', lamp: 0 }; },
    klasse: function (t) { return t === 'igaar' ? { mul: 'rgb(186,192,214)', lamp: 0 } : { mul: 'rgb(240,240,250)', lamp: 0 }; },
    standard: function () { return { mul: 'rgb(248,240,228)', lamp: 0.3 }; }
  };
  function lighting(m, cx, cy) {
    var tod = K.timeOfDay(S), L = m.outdoor ? TINT[tod] || TINT.formiddag : (INDE[m.id] || INDE.standard)(tod);
    ctx.save();
    if (L.mul) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = L.mul; ctx.fillRect(0, 0, VW, VH); }
    if (L.fill) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = L.fill; ctx.fillRect(0, 0, VW, VH); }
    ctx.globalCompositeOperation = 'lighter';
    if (L.lamp > 0) {
      var flick = 0.95 + Math.sin(tick / 9) * 0.03;
      m.lamps.forEach(function (p) { glow(p[0] * T + 8 - cx, p[1] * T + 3 - cy, m.outdoor ? 36 : 30, L.lamp * flick, '255,190,110'); });
    }
    if (L.win) m.windows.forEach(function (p) {
      ctx.fillStyle = 'rgba(255,200,110,' + L.win + ')'; ctx.fillRect(p[0] * T + 4 - cx, p[1] * T + 4 - cy, 8, 7);
      glow(p[0] * T + 8 - cx, p[1] * T + 10 - cy, 16, L.win * 0.45, '255,190,100');
    });
    ctx.restore();
    // blød vignet — hyggeligt, og øjet søger mod midten
    var v = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.45, VW / 2, VH / 2, VW * 0.62);
    v.addColorStop(0, 'rgba(20,10,30,0)'); v.addColorStop(1, 'rgba(20,10,30,0.32)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, VW, VH);
  }
  function glow(x, y, r, a, rgb) {
    if (x < -r || y < -r || x > VW + r || y > VH + r) return;
    var gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Røg fra skorstenene i den kolde morgen
  function smoke(m, cx, cy) {
    var tod = K.timeOfDay(S);
    if (tod !== 'tidlig' && tod !== 'morgen') { particles.length = 0; return; }
    if (tick % 30 === 0) m.chimneys.forEach(function (c) { particles.push({ x: c[0] * T + 9, y: c[1] * T + 2, age: 0, dx: (Math.random() - 0.3) * 0.15 }); });
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i]; p.age++; p.y -= 0.16; p.x += p.dx + Math.sin((p.age + i) / 18) * 0.08;
      if (p.age > 160) { particles.splice(i, 1); continue; }
      var a = 0.45 * (1 - p.age / 160), r = 1 + p.age / 55;
      ctx.fillStyle = 'rgba(214,210,224,' + a + ')';
      ctx.fillRect(Math.round(p.x - r - cx), Math.round(p.y - r - cy), Math.ceil(r * 2), Math.ceil(r * 2));
    }
  }
  // Gule og røde blade, der daler ned — det er oktober
  function weather() {
    var cols = ['#e0a82c', '#d8584a', '#c86a2a', '#ffe070'];
    while (leaves.length < 12) leaves.push({ x: Math.random() * (VW + 40), y: -Math.random() * VH, s: 0.22 + Math.random() * 0.3, p: Math.random() * 6.28, c: cols[(Math.random() * 4) | 0] });
    leaves.forEach(function (l) {
      l.p += 0.04; l.y += l.s; l.x += Math.sin(l.p) * 0.45 - 0.15;
      if (l.y > VH + 4 || l.x < -6) { l.y = -4; l.x = Math.random() * (VW + 40); }
      ctx.fillStyle = l.c; var w = Math.sin(l.p) > 0 ? 2 : 1;
      ctx.fillRect(Math.round(l.x), Math.round(l.y), w, 1); ctx.fillRect(Math.round(l.x) + (w === 2 ? 1 : 0), Math.round(l.y) + 1, 1, 1);
    });
  }
  // Tre ænder, der svømmer langsomt rundt på dammen i parken
  function ducks(cx, cy) {
    for (var i = 0; i < 3; i++) {
      var ph = tick / (240 + i * 70) + i * 2.1;
      var x = (9 + 0.6 + (Math.sin(ph) + 1) * 4.0 + i * 0.8) * T, y = (25.6 + i * 1.1 + Math.sin(ph * 1.7) * 0.3) * T;
      RH.drawDuck(ctx, Math.round(x - cx), Math.round(y - cy), tick + i * 13, Math.cos(ph) < 0);
    }
  }

  // Pil i kanten af skærmen, der viser vej til missionen
  function targetPos() {
    var mt = K.mainTarget(S); if (!mt || !mt.t) return null;
    var t = mt.t, p = null;
    if (K.npcs[t]) { var np = K.npcs[t].pos(S); if (np) p = [np.map, np.x, np.y]; }
    if (!p && K.placePos[t]) p = K.placePos[t];
    if (!p) return null;
    if (p[0] === S.map) return [p[1], p[2]];
    return doorToward(S.map, p[0]);
  }
  // Første dør på kortet, man står på, der fører mod kortet `til` (bredde-først over alle døre)
  function doorToward(fra, til) {
    var seen = {}, queue = [];
    seen[fra] = true;
    world[fra].doors.forEach(function (d) { queue.push({ map: d.to, first: [d.x, d.y] }); });
    while (queue.length) {
      var it = queue.shift();
      if (it.map === til) return it.first;
      if (seen[it.map] || !world[it.map]) continue;
      seen[it.map] = true;
      world[it.map].doors.forEach(function (d) { queue.push({ map: d.to, first: it.first }); });
    }
    return null;
  }
  function arrow(cx, cy) {
    var tp = targetPos(); if (!tp) return;
    var x = tp[0] * T + 8 - cx, y = tp[1] * T + 8 - cy;
    if (x > 8 && x < VW - 8 && y > 8 && y < VH - 8) return;
    var ang = Math.atan2(y - VH / 2, x - VW / 2);
    var ex = VW / 2 + Math.cos(ang) * (VW / 2 - 12), ey = VH / 2 + Math.sin(ang) * (VH / 2 - 12);
    ex = Math.max(10, Math.min(VW - 10, ex)); ey = Math.max(22, Math.min(VH - 10, ey));
    var pulse = 1 + (Math.floor(tick / 15) % 2);
    ctx.save(); ctx.translate(Math.round(ex), Math.round(ey)); ctx.rotate(ang);
    ctx.fillStyle = '#1a1420'; ctx.beginPath(); ctx.moveTo(7 + pulse, 0); ctx.lineTo(-5, -6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#9ad0ff'; ctx.beginPath(); ctx.moveTo(5 + pulse, 0); ctx.lineTo(-3, -4); ctx.lineTo(-3, 4); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------- HUD
  function hud() {
    if (!S) return;
    var mt = K.mainTarget(S), kp = K.kapNu(), slut = (S.klaret || []).indexOf(S.kap || 1) >= 0;
    document.getElementById('hud').classList.toggle('cut', !!S.cut);
    document.getElementById('hud-quest-title').textContent = mt ? mt.q.title : (slut ? kp.efterTitel : '');
    document.getElementById('hud-quest-goal').textContent = mt ? K.goal(mt.q.id) : (slut ? kp.efterMaal : '');
    document.getElementById('hud-kraft').textContent = S.kraft + ' %';
    document.getElementById('hud-kraft-bar').style.width = S.kraft + '%';
    document.getElementById('hud-ting').textContent = S.bag.owned.length;
  }
  function updatePrompt() {
    var el = document.getElementById('prompt');
    if (!started || busy || UI.isOpen() || player.moving || S.cut) { el.hidden = true; return; }
    var f = facing();
    if (!f) { el.hidden = true; return; }
    var label = 'Undersøg';
    if (f.ent) label = f.ent.kind === 'dog' ? 'Hils på Sally' : f.ent.kind.indexOf('dyr_') === 0 ? 'Kig på dyret' : 'Tal med ' + K.npcs[f.ent.id].name;
    else if (f.place === 'skrivebord') label = 'Kig på skrivebordet';
    else if (f.place && /opslag|tilbud/.test(f.place)) label = 'Læs opslaget';
    else if (f.place && /skilt/.test(f.place)) label = 'Læs skiltet';
    else if (f.place === 'tavle') label = 'Kig på tavlen';
    else if (f.locked) label = 'Prøv døren';
    el.innerHTML = '<span class="key">E</span> ' + RH.esc(label);
    el.hidden = false;
  }

  // ---------------------------------------------------------------- slutningen
  function laererensOrd() {
    var r = S.total.first / Math.max(1, S.total.n);
    if (r >= 0.8) return 'Det der var ikke held. Du regnede det meste rigtigt i første forsøg — og du tænkte dig om undervejs. Sådan der.';
    if (r >= 0.5) return 'Du er et helt andet sted end i går. Du gik i gang med det samme, og du fandt fejlene, da du kiggede efter. Bliv ved med det.';
    return 'Det vigtigste er ikke, hvor mange du ramte. Det er, at du blev ved — også da det var svært. Det er præcis sådan, man lærer det her.';
  }
  // Et kapitel slutter med sin egen scene (kapitler[n].slut.scene), og så kommer "Jeg kan …"-skærmen.
  // Er der et næste kapitel, er det nu låst op.
  async function flyt(map, x, y, dir) {
    await fadeTo(function () {
      S.map = map; S.x = x; S.y = y; S.dir = dir || 'down'; player.px = x * T; player.py = y * T; player.moving = false;
      refresh(); snapCam(); musik(); save(); hud();
    }, 500);
  }
  async function epilogue() { await kapSlut(); }
  async function kapSlut() {
    var n = S.kap || 1, kp = K.kapitler[n], sidste = n >= K.KAPITLER;
    if (kp.slut && kp.slut.scene) await kp.slut.scene(g);
    if (S.klaret.indexOf(n) < 0) S.klaret.push(n);
    S.res.faerdig = sidste; RH.resultat.send(S, true); save(true);
    RH.audio.music('slut'); RH.audio.sfx('fanfare');
    var cand = (O.CAN_KAP && O.CAN_KAP[n]) || O.CAN;
    var rows = cand.map(function (c) { return S.mastery[c[0]] ? { t: c[1], stars: S.mastery[c[0]] } : null; }).filter(Boolean);
    var sider = (kp.sider || []).filter(function (id) { return S.q[id] === 'done'; }).length;
    var badges = [
      'Vedholdenhed: du prøvede igen og klarede det ' + S.persist + ' ' + (S.persist === 1 ? 'gang' : 'gange'),
      'Regnekraft: ' + S.kraft + ' %',
      'Ekstramissioner: ' + sider + ' af ' + (kp.sider || []).length,
      'Ting i tasken: ' + S.bag.owned.length
    ];
    var nxt = K.kapitler[n + 1];
    var valg = await UI.ending(rows, badges, laererensOrd(), who(kp.slut.ordFra || 'poulsen'), { titel: kp.slut.titel, tekst: kp.slut.tekst, rundt: kp.slut.rundt, naeste: nxt ? nxt.navn : null });
    musik();
    if (valg === 'naeste') await naesteKapitel();
  }

  // Det næste kapitel er låst op, når det før er klaret
  function kapStatus(n) {
    if ((S.klaret || []).indexOf(n) >= 0) return 'klaret';
    if ((S.kap || 1) === n) return 'igang';
    if (n === 1 || (S.klaret || []).indexOf(n - 1) >= 0) return 'klar';
    return 'laast';
  }
  function klasseFor(n) { return Math.min(6, (S.startKlasse || S.klasse) + n - 1); }
  async function naesteKapitel() { await startKapitel((S.kap || 1) + 1); }
  async function startKapitel(n) {
    var kp = K.kapitler[n];
    if (!kp || kapStatus(n) === 'laast') return;
    await fadeTo(function () {
      S.kap = n; S.klasse = klasseFor(n); S.cut = false; S.tom = false;
      var st = kp.start || {};
      S.map = st.map; S.x = st.x; S.y = st.y; S.dir = st.dir || 'down';
      player.px = S.x * T; player.py = S.y * T; player.moving = false;
      npcDir = {}; refresh(); snapCam(); musik(); hud(); save(true);
    }, 700);
    await UI.kapitelkort(n, kp.navn, kp.kort, O.trin(S.klasse).navn + ': opgaverne er nu på ' + O.trin(S.klasse).navn + 's niveau.');
    await kp.intro(g);
  }
  // Kapitel-menuen (Pause → Kapitler): ✓ klaret, ► i gang, "Start" når det er låst op
  async function kapitelMenu() {
    var liste = [];
    for (var n = 1; n <= K.KAPITLER; n++) liste.push({ n: n, navn: K.kapitler[n] ? K.kapitler[n].navn : '…', status: K.kapitler[n] ? kapStatus(n) : 'laast' });
    var valg = await UI.kapitler(liste);
    if (valg && kapStatus(valg) === 'klar' && valg !== (S.kap || 1)) await startKapitel(valg);
  }

  // ---------------------------------------------------------------- pausespil og bogen
  async function openBookAt(tab, side) {
    var r = await UI.book(tab, side);
    if (r && r.spil) await pausespil(r.spil);
  }
  async function pausespil(kind) {
    if (!(S.bag.plays[kind] > 0)) { UI.toast('Du har ingen ture tilbage'); return; }
    S.bag.plays[kind]--; save();
    if (kind === 'dressup') {
      var look = await UI.dressup(S.look);
      if (look) { S.look = look; sheets.player = RH.makeSheet(look); RH.audio.sfx('item'); UI.toast('<b>Nyt tøj på.</b>'); }
      else UI.toast('Du beholdt dit tøj.');
    } else {
      var res = await UI.straffespark(S.look);
      UI.toast(RH.esc(res));
    }
    save(); hud();
  }

  // ---------------------------------------------------------------- input
  var KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
  function press(dir) { if (heldOrder.indexOf(dir) < 0) heldOrder.push(dir); }
  function release(dir) { var i = heldOrder.indexOf(dir); if (i >= 0) heldOrder.splice(i, 1); }
  document.addEventListener('keydown', function (e) {
    RH.audio.unlock();
    if (!started) return;
    var tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT') return;
    if (KEYS[e.key]) { if (!UI.isOpen()) { e.preventDefault(); press(KEYS[e.key]); } return; }
    // Et tryk, der lige har lukket en dialog, må ikke også starte en ny samtale
    if (e.defaultPrevented || e.repeat || UI.isOpen() || busy) return;
    if (e.key === 'e' || e.key === 'E' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); interact(); }
    else if (e.key === 'b' || e.key === 'B' || e.key === 'Tab') { e.preventDefault(); openBook(); }
    else if (e.key === 'i' || e.key === 'I') { e.preventDefault(); openBook('tasken'); }
    else if (e.key === 'j' || e.key === 'J') { e.preventDefault(); openBook('regnebogen'); }
    else if (e.key === 'Escape') { e.preventDefault(); openMenu(); }
    else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); RH.toggleFullscreen(); }
    else if (e.key === 'm' || e.key === 'M') { RH.audio.setMusic(!RH.audio.musicOn); RH.saveSettings(); UI.toast('Musik ' + (RH.audio.musicOn ? 'til' : 'fra')); }
  });
  document.addEventListener('keyup', function (e) { if (KEYS[e.key]) release(KEYS[e.key]); });
  window.addEventListener('blur', function () { heldOrder = []; });
  document.addEventListener('visibilitychange', function () { heldOrder = []; });
  function openBook(tab) { if (busy || UI.isOpen() || S.cut) return; heldOrder = []; run(function () { return openBookAt(tab || 'missioner'); }); }
  function openMenu() {
    if (busy || UI.isOpen()) return; heldOrder = [];
    run(async function () { if ((await UI.menu()) === 'kapitler') await kapitelMenu(); });
  }
  // Fuld skærm. Knappen skjules, hvor browseren ikke kan (fx iPhone-Safari).
  var root = document.documentElement;
  var canFull = !!(root.requestFullscreen || root.webkitRequestFullscreen);
  function isFull() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  RH.toggleFullscreen = function () {
    if (!canFull) return;
    if (isFull()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    var p = (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
    if (p && p.catch) p.catch(function () { });
  };
  RH.isFullscreen = isFull; RH.canFullscreen = canFull;
  var fullBtn = document.getElementById('btn-full');
  if (!canFull) fullBtn.hidden = true;
  fullBtn.addEventListener('click', function () { RH.toggleFullscreen(); fullBtn.blur(); });
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) {
    document.addEventListener(ev, function () { fullBtn.title = isFull() ? 'Forlad fuld skærm (F)' : 'Fuld skærm (F)'; setTimeout(resize, 50); });
  });
  document.getElementById('btn-book').addEventListener('click', function () { openBook(); });
  document.getElementById('btn-menu').addEventListener('click', openMenu);
  document.getElementById('hud-bag').addEventListener('click', function () { openBook('tasken'); });

  // Berøring: joystick og knapper dukker op første gang, nogen rører
  // skærmen — og gemmer sig igen efter 5 sekunder uden berøring.
  var idleTimer = null, stickId = null, stickDir = null;
  function wake() {
    document.body.classList.add('touching'); document.body.classList.remove('touch-idle');
    if (started) document.getElementById('touch').hidden = false;
    clearTimeout(idleTimer); idleTimer = setTimeout(sleepTouch, 5000);
  }
  function sleepTouch() {
    if (stickId !== null) { idleTimer = setTimeout(sleepTouch, 1000); return; }   // man holder stadig på joysticket
    document.body.classList.add('touch-idle');
  }
  RH.wakeTouch = wake;
  window.addEventListener('touchstart', wake, { capture: true, passive: true });
  window.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch') wake(); }, true);

  var zone = document.getElementById('stick-zone'), base = document.getElementById('stick-base'), knob = document.getElementById('stick-knob');
  function moveStick(dx, dy) {
    var dist = Math.sqrt(dx * dx + dy * dy), max = 44;
    if (dist > max) { dx = dx / dist * max; dy = dy / dist * max; }
    knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    stickDir = dist < 14 ? null : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  }
  function endStick() {
    stickId = null; stickDir = null; zone.classList.remove('active');
    base.style.left = ''; base.style.bottom = ''; knob.style.transform = '';
  }
  var stickNed = null;   // hvor og hvornår fingeren landede — et kort tryk er et tryk på verden
  zone.addEventListener('pointerdown', function (e) {
    e.preventDefault(); RH.audio.unlock(); wake();
    stickNed = { x: e.clientX, y: e.clientY, t: performance.now() };
    stickId = e.pointerId; try { zone.setPointerCapture(e.pointerId); } catch (x) { }
    zone.classList.add('active');
    var zr = zone.getBoundingClientRect();
    base.style.left = Math.max(4, e.clientX - zr.left - 64) + 'px';
    base.style.bottom = Math.max(4, zr.bottom - e.clientY - 64) + 'px';
    moveStick(0, 0);
  });
  zone.addEventListener('pointermove', function (e) {
    if (e.pointerId !== stickId) return;
    var br = base.getBoundingClientRect();
    moveStick(e.clientX - (br.left + br.width / 2), e.clientY - (br.top + br.height / 2));
  });
  zone.addEventListener('pointerup', function (e) {
    if (e.pointerId === stickId && erTryk(stickNed, e)) trykPaaVerden(e.clientX, e.clientY);
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { zone.addEventListener(ev, function (e) { if (e.pointerId === stickId) endStick(); }); });
  document.getElementById('t-act').addEventListener('pointerdown', function (e) { e.preventDefault(); RH.audio.unlock(); if (!UI.advance()) interact(); });
  document.getElementById('t-book').addEventListener('pointerdown', function (e) { e.preventDefault(); openBook(); });

  // ---------------------------------------------------------------- tryk på verden
  // Tryk på en person eller ting: står man lige ved den, vender man sig og
  // taler med den, som med E. Står man længere væk, går man selv derhen ad
  // korteste vej først. Joystick og taster afbryder turen.
  var auto = null;   // { vej: [retninger], dir, map }
  function erTryk(ned, e) {
    return !!ned && Math.abs(e.clientX - ned.x) < 14 && Math.abs(e.clientY - ned.y) < 14 && performance.now() - ned.t < 600;
  }
  // Pladserne (felt + retning), hvorfra man ser på feltet (tx, ty)
  function pladserVed(tx, ty) {
    var ud = [];
    ['up', 'down', 'left', 'right'].forEach(function (dir) {
      for (var n = 1; n <= 2; n++) {           // 2: hen over en disk
        var x = tx - DX[dir] * n, y = ty - DY[dir] * n, f = facingFrom(x, y, dir);
        if (f && f.x === tx && f.y === ty) ud.push({ x: x, y: y, dir: dir });
      }
    });
    return ud;
  }
  // Korteste vej (bredde først) til en af pladserne. Døre går man uden om.
  function vejTil(pladser) {
    var m = mapNow(), fra = {}, koe = [[S.x, S.y]], set = 0;
    fra[S.x + ',' + S.y] = null;
    while (koe.length && set++ < 3000) {
      var p = koe.shift(), k = p[0] + ',' + p[1];
      for (var i = 0; i < pladser.length; i++) {
        if (pladser[i].x === p[0] && pladser[i].y === p[1]) {
          var vej = [];
          while (fra[k]) { vej.unshift(fra[k].dir); k = fra[k].k; }
          return { vej: vej, dir: pladser[i].dir, map: S.map };
        }
      }
      ['up', 'down', 'left', 'right'].forEach(function (dir) {
        var nx = p[0] + DX[dir], ny = p[1] + DY[dir], nk = nx + ',' + ny;
        if (nk in fra || nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) return;
        if (blocked(nx, ny) || m.doorAt(nx, ny)) return;
        fra[nk] = { k: k, dir: dir }; koe.push([nx, ny]);
      });
    }
    return null;
  }
  function trykPaaVerden(cx, cy) {
    if (!started || busy || UI.isOpen() || player.moving || S.cut) return false;
    var r = canvas.getBoundingClientRect();
    var wx = (cx - r.left) * canvas.width / r.width + Math.round(cam.x);
    var wy = (cy - r.top) * canvas.height / r.height + Math.round(cam.y);
    var bx = Math.floor(wx / T), by = Math.floor(wy / T), felter = [];
    // Feltet under fingeren først, så naboerne, hvis fingeren rammer tæt på kanten
    for (var j = -1; j <= 1; j++) for (var i = -1; i <= 1; i++) {
      var x = bx + i, y = by + j, dx = (x + 0.5) * T - wx, dy = (y + 0.5) * T - wy;
      if (Math.sqrt(dx * dx + dy * dy) <= T * 0.95) felter.push({ x: x, y: y, d: dx * dx + dy * dy });
    }
    felter.sort(function (a, b) { return a.d - b.d; });
    for (var n = 0; n < felter.length; n++) {
      if (felter[n].x === S.x && felter[n].y === S.y) continue;
      var pladser = pladserVed(felter[n].x, felter[n].y);
      if (!pladser.length) continue;
      var tur = vejTil(pladser);
      if (!tur) continue;
      auto = tur;
      return true;
    }
    return false;
  }
  function autoSkridt() {
    if (auto.map !== S.map) { auto = null; return; }
    if (auto.vej.length) {
      tryMove(auto.vej.shift());
      if (!player.moving) auto = null;          // noget stod i vejen
      return;
    }
    S.dir = auto.dir; auto = null;
    interact();
  }
  var verdenNed = null;
  canvas.addEventListener('pointerdown', function (e) { verdenNed = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  canvas.addEventListener('pointerup', function (e) {
    if (e.button > 0 || !erTryk(verdenNed, e)) return;
    verdenNed = null;
    trykPaaVerden(e.clientX, e.clientY);
  });
  // Teksten nederst ("E Tal med …") kan man også trykke på
  document.getElementById('prompt').addEventListener('click', function () { interact(); });

  // ---------------------------------------------------------------- løkken
  var last = 0, acc = 0;
  function loop(ts) {
    acc += Math.min(100, ts - (last || ts)); last = ts;
    while (acc >= 1000 / 60) { update(); acc -= 1000 / 60; }
    render();
    requestAnimationFrame(loop);
  }
  // Spilletid til resultatet: kun den tid, fanen er synlig og spillet i gang
  setInterval(function () { if (started && S && S.res && document.visibilityState === 'visible') S.res.sek += 5; }, 5000);

  // ---------------------------------------------------------------- start
  // Prøvetiden (LFSpil i /assets/spilletid.js): en venlig besked 4 minutter før,
  // og når den er brugt, gemmes spillet og en slutskærm lukker det ned.
  var tidSlutVist = false;
  RH.tidSnart = function (sek) {
    if (UI) UI.toast('<b>Snart er din spilletid brugt.</b><br>Der er ' + Math.max(1, Math.round(sek / 60)) + ' minutter tilbage.');
  };
  RH.tidSlut = function () {
    if (tidSlutVist || !UI) return;       // før boot() har lavet UI: boot() spørger selv
    tidSlutVist = true;
    save(true);
    if (S && S.res && started) RH.resultat.send(S, true);
    UI.tidSlut();
  };

  function begin() {
    started = true;
    if (window.LFSpil) LFSpil.aktiv(true);   // først nu tæller tiden (ikke på titelskærmen)
    RH.state = S;
    player.px = S.x * T; player.py = S.y * T;
    sheets.player = RH.makeSheet(S.look);
    refresh(); snapCam();
    document.getElementById('hud').hidden = false; hud();
    if (document.body.classList.contains('touching')) wake();
    musik();
  }

  async function boot() {
    K = RH.content; UI = RH.ui; O = RH.opgaver; UI.init(); resize();
    var hentning = FOTO ? null : RH.gem.hent(lokal());
    loadSettings();
    world = RH.buildWorld();
    dogSheet = RH.makeDog();
    // bag titelskærmen: kvarteret en tidlig morgen, med lygterne tændt
    S = fresh('', O.STANDARD_KLASSE, K.STD_LOOK); S.cut = false; S.map = 'by'; S.x = 20; S.y = 16; RH.state = S;
    player.px = S.x * T; player.py = S.y * T; snapCam();
    requestAnimationFrame(loop);
    if (document.fonts && document.fonts.ready) { try { await Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 1500); })]); } catch (e) { } }
    if (FOTO) { foto(FOTO); return; }
    var saved = parse(await hentning);
    if ((window.LFSpil && LFSpil.tidSlut()) || tidSlutVist) { RH.tidSlut(); return; }   // prøvetiden er allerede brugt
    var info = null;
    if (saved) {
      var nk = (saved.kap || 1) + 1;
      info = { kap: saved.kap, kapnavn: saved.kap > 1 && K.kapitler[saved.kap] ? K.kapitler[saved.kap].navn : '',
               naeste: saved.klaret.indexOf(saved.kap) >= 0 && K.kapitler[nk] ? K.kapitler[nk].navn : '' };
    }
    var choice = await UI.title(saved ? saved.name : '', info);
    if ((choice === 'continue' || choice === 'naeste') && saved) {
      S = saved;
      // Lukkede man fanen midt i åbningsscenen, springer vi frem til morgenen
      if (S.cut) { S.cut = false; S.tom = false; S.map = 'hjem'; S.x = 4; S.y = 3; S.dir = 'up'; if (!S.q.q0) S.q.q0 = 'active'; }
      begin();
      if (choice === 'naeste') { await run(naesteKapitel); return; }
      UI.toast('Velkommen tilbage, <b>' + RH.esc(S.name) + '</b>! Du står lige der, hvor du slap.');
      return;
    }
    RH.audio.music('by');
    var ny = await UI.create(saved ? { name: saved.name, klasse: saved.klasse, look: saved.look } : null);
    S = fresh(ny.name, ny.klasse, ny.look);
    begin(); save();
    await run(function () { return K.script.intro(g); });
  }

  // Fototilstand: stiller en scene op til hjemmesidens skærmbilleder
  function foto(scene) {
    var look = { skin: '#f5cdaa', hair: '#be4e34', style: 'lang', cloth: '#487ac4', pants: '#4e5670', extra: 'taske' };
    S = fresh('Freja', 3, look); S.cut = false; RH.state = S;
    var done = function (ids) { ids.forEach(function (id) { S.q[id] = 'done'; }); };
    S.kraft = 46;
    if (scene === 'hjem') { S.q.q0 = 'active'; S.map = 'hjem'; S.x = 6; S.y = 4; S.dir = 'up'; }
    if (scene === 'by') { done(['q0', 'q1']); S.q.q2 = 'active'; S.flags = { hjemUd: true }; S.map = 'by'; S.x = 12; S.y = 15; S.dir = 'right'; }
    if (scene === 'morgen') { done(['q0']); S.q.q1 = 'active'; S.map = 'by'; S.x = 9; S.y = 15; S.dir = 'down'; }
    if (scene === 'skolegaard') { done(['q0', 'q1', 'q2']); S.q.q3 = 'active'; S.flags = { hjemUd: true, skolegaard: true }; S.map = 'by'; S.x = 52; S.y = 12; S.dir = 'up'; }
    if (scene === 'park') { done(['q0', 'q1', 'q2']); S.q.q3 = 'active'; S.flags = { hjemUd: true, skolegaard: true }; S.map = 'by'; S.x = 12; S.y = 24; S.dir = 'down'; }
    if (scene === 'opgave' || scene === 'dialog' || scene === 'moenter') { done(['q0', 'q1']); S.q.q2 = 'active'; S.flags = { hjemUd: true }; S.map = 'butik'; S.x = 12; S.y = 9; S.dir = 'up'; S.seen = { 'q2:intro': true }; }
    if (scene === 'klasse') { S.cut = true; S.map = 'klasse'; S.x = 8; S.y = 9; S.dir = 'up'; }
    if (scene === 'titel') { S.map = 'by'; S.x = 20; S.y = 16; player.px = S.x * T; player.py = S.y * T; snapCam(); UI.title(''); return; }
    if (scene === 'regnebogen') { done(['q0', 'q1', 'q2']); S.q.q3 = 'active'; S.flags = { hjemUd: true, skolegaard: true }; S.map = 'by'; S.x = 52; S.y = 12; S.dir = 'up'; S.bag = { owned: ['toejpose', 'is', 'fodbold'], counts: { toejpose: 1, is: 1, fodbold: 1 }, plays: { fodbold: 2, dressup: 2 } }; }
    begin();
    if (scene === 'regnebogen') UI.book('regnebogen', 'gange');
    if (scene === 'opgave') { S.sets.q2 = O.lav('anvend', 3); S.loest['q2:0'] = true; S.sets.q2[1] = { kind: 'findall', who: 'far', q: 'Jeg har skrevet prisskilte. Hvilke af dem giver 24?', target: 24, tiles: [['20 + 4', 24], ['3 x 8', 24], ['30 - 5', 25], ['4 x 6', 24], ['19 + 6', 25], ['28 - 3', 25], ['2 x 11', 22], ['26 - 4', 22]], hint: '', book: 'gange' }; run(function () { return K.talk(g, 'far'); }); }
    if (scene === 'moenter') { S.sets.q2 = O.lav('anvend', 3); S.loest['q2:0'] = true; S.sets.q2[1] = { kind: 'coins', who: 'far', q: 'Bollerne koster 45 kr, og manden vil helst have det præcist. Vil du lægge pengene op?', target: 45, hint: '', book: 'penge' }; run(function () { return K.talk(g, 'far'); }); }
    if (scene === 'dialog') { S.seen = {}; run(function () { return K.talk(g, 'far'); }); }
    if (scene === 'klasse') run(function () { return g.say('poulsen', 'Og hvem kan så svare på den her?'); });
  }

  // Til test fra konsollen: RH.debug.S, RH.debug.tp('by', 24, 20), RH.debug.face('up')
  RH.debug = {
    get S() { return S; }, g: g, interact: interact, refresh: refresh, entities: function () { return entities(); },
    tp: function (m, x, y, d) { S.map = m; S.x = x; S.y = y; if (d) S.dir = d; player.moving = false; player.px = x * T; player.py = y * T; snapCam(); hud(); musik(); },
    face: function (d) { S.dir = d; }, hud: hud, save: save,
    kapitel: function (n) { if (n > 1 && S.klaret.indexOf(n - 1) < 0) S.klaret.push(n - 1); return run(function () { return startKapitel(n); }); },
    kapSlut: function () { return run(kapSlut); }, world: function () { return world; }
  };

  window.addEventListener('pagehide', function () { save(true); RH.resultat.send(S, true); });
  // På en telefon skifter man app i stedet for at lukke fanen
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { save(true); if (started) RH.resultat.send(S, true); }
  });
  boot();
})();
