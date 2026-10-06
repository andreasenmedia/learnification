/* Runeborg — motoren
   Tilstand, gemning, bevægelse på felter, samtaler, døre, kamera, tegning og
   stemning (lys efter tid på dagen, røg fra skorstene, blade, ildfluer). */
(function () {
  'use strict';
  var RB = window.RB, K, UI, T = 16, VW = 320, VH = 180, SCALE = 4;
  // Er man logget ind, har hvert barn sit eget eventyr — ellers ville en
  // klasse, der deler computere, spille videre i hinandens. Id'et står i
  // cookien lf_in (fx "elev.12"), som sættes sammen med login.
  var SPILLER = (document.cookie.match(/(?:^|;\s*)lf_in=((?:elev|voksen)\.\d+)/) || [])[1];
  var SAVE = 'runeborg-v1' + (SPILLER ? '-' + SPILLER : ''), SETTINGS = 'runeborg-indstillinger';

  var canvas = document.getElementById('screen');
  var ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;

  // Lærredet følger vinduet: en hel pixelskala, så den korte side viser ca.
  // 11 felter. Så fylder verden hele skærmen — også på en telefon på højkant.
  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    SCALE = Math.max(1, Math.floor(Math.min(w, h) / 176));
    VW = Math.ceil(w / SCALE); VH = Math.ceil(h / SCALE);
    canvas.width = VW; canvas.height = VH;
    canvas.style.width = VW * SCALE + 'px'; canvas.style.height = VH * SCALE + 'px';
    ctx.imageSmoothingEnabled = false;
    flies = []; leaves = [];
    if (S) snapCam();
  }
  window.addEventListener('resize', resize);

  var S = null, world = null, cache = {}, sheets = {}, catSheet = null, dragonSheet = null;
  var player = { px: 0, py: 0, moving: false, fromX: 0, fromY: 0, t: 0, alt: false };
  var cat = { x: 0, y: 0, px: 0, py: 0, trail: [] };
  var busy = false, started = false, tick = 0, held = {}, heldOrder = [];
  var cam = { x: 0, y: 0 }, particles = [], leaves = [], flies = [];

  // ---------------------------------------------------------------- tilstand
  function fresh(name, cls) {
    // kap = kapitlet, man spiller nu; klaret = de kapitler, man har gennemført (låser det næste op)
    return { v: 2, kap: 1, klaret: [], name: name, cls: cls, map: 'laug', x: 6, y: 5, dir: 'up', q: { q0: 'active' }, flags: {}, clues: [], skills: [], runes: [], gold: 0, solved: {}, stats: {}, persist: 0, seen: {}, talks: 0 };
  }
  var FOTO = (location.hash.match(/foto=(\w+)/) || [])[1];   // tools/runeborg-billeder.py tager skærmbilleder sådan
  // Gem først, når et rigtigt spil er i gang — titelskærmens baggrundsby må
  // aldrig overskrive det, man har gemt. Det gemte ligger i localStorage og,
  // når man er logget ind, også på serveren (js/gem.js), så man kan spille
  // videre på en anden skærm. `nu` sender med det samme (når fanen lukkes).
  // `laast` bliver sat, når en anden skærm har gemt noget nyere: så må den
  // her fane ikke gemme mere, før spilleren har hentet det nyeste.
  var laast = false;
  function save(nu) {
    if (!S || FOTO || !started || laast) return;
    var d = JSON.stringify(S);
    try { localStorage.setItem(SAVE, d); } catch (e) { /* privat vindue */ }
    RB.gem.gem(d, nu === true);
  }
  function lokal() { try { return localStorage.getItem(SAVE); } catch (e) { return null; } }
  // v1 (før kapitlerne) bliver til kapitel 1; var det klaret, er kapitel 1 klaret
  function parse(tekst) {
    try {
      var s = JSON.parse(tekst);
      if (!s || (s.v !== 1 && s.v !== 2)) return null;
      if (s.v === 1) { s.v = 2; s.kap = 1; s.klaret = s.q && s.q.q10 === 'done' ? [1] : []; }
      s.klaret = s.klaret || []; s.kap = s.kap || 1;
      return s;
    } catch (e) { return null; }
  }
  RB.saveSettings = function () {
    try { localStorage.setItem(SETTINGS, JSON.stringify({ music: RB.audio.musicOn, sfx: RB.audio.sfxOn, voice: RB.voice.on, big: document.body.classList.contains('big') })); } catch (e) { }
  };
  function loadSettings() {
    try {
      var s = JSON.parse(localStorage.getItem(SETTINGS)); if (!s) return;
      RB.audio.setMusic(s.music !== false); RB.audio.setSfx(s.sfx !== false); RB.voice.on = s.voice !== false; document.body.classList.toggle('big', !!s.big);
    } catch (e) { }
  }
  RB.resetGame = function () {
    laast = true;
    try { localStorage.removeItem(SAVE); } catch (e) { }
    RB.gem.nulstil().then(function () { location.reload(); });
  };
  RB.gem.naarKonflikt(function () {
    laast = true;
    UI.konflikt().then(function () {
      var d = RB.gem.tagNyeste();
      try { if (parse(d)) localStorage.setItem(SAVE, d); else localStorage.removeItem(SAVE); } catch (e) { }
      location.reload();
    });
  });

  // ---------------------------------------------------------------- verden
  function applyWorldFlags() {
    world.by.flags.gateOpen = !!S.flags.gateOpen;
    world.farveri.flags.valveClosed = !!S.flags.f_valve;
    world.by.flags.green = !S.flags.clean; world.farveri.flags.green = !S.flags.clean;
    Object.keys(world).forEach(function (id) { if (world[id].applyFlags) world[id].applyFlags(S, world[id]); });   // kapitel 2 og 3
  }
  function prerender(map) {
    var fr = [0, 1].map(function (f) {
      var c = RB.canvas(map.w * T, map.h * T), x = c.getContext('2d');
      for (var ty = 0; ty < map.h; ty++) for (var tx = 0; tx < map.w; tx++) RB.drawTile(x, map, tx, ty, f);
      return c;
    });
    cache[map.id] = fr;
  }
  function refresh() { applyWorldFlags(); cache = {}; }
  function mapNow() { return world[S.map]; }
  function frames() { var m = mapNow(); if (!cache[m.id]) prerender(m); return cache[m.id]; }

  function sheetFor(id) {
    if (sheets[id]) return sheets[id];
    var n = K.npcs[id];
    sheets[id] = n.dragon ? dragonSheet : RB.makeSheet(n.look);
    return sheets[id];
  }
  function who(id) {
    if (!id) return null;
    if (id === 'player') return { id: 'player', name: S.name, sheet: sheets.player };
    var n = K.npcs[id]; return { id: id, name: n.name, sheet: sheetFor(id) };
  }

  // Alt, der står på kortet lige nu: personer, ting, runestykker, katten.
  function entities() {
    var list = [], m = S.map;
    Object.keys(K.npcs).forEach(function (id) {
      var p = K.npcs[id].pos(S); if (!p || p.map !== m) return;
      list.push({ id: id, kind: 'npc', x: p.x, y: p.y, dir: npcDir[id] || p.dir });
    });
    K.things.forEach(function (t) { if (t.map === m && t.visible(S)) list.push({ id: t.id, kind: t.kind, x: t.x, y: t.y }); });
    if (S.skills.indexOf('laeselup') >= 0) K.runes.forEach(function (r) { if (r.map === m && S.runes.indexOf(r.id) < 0) list.push({ id: r.id, kind: 'rune', x: r.x, y: r.y }); });
    return list;
  }
  var npcDir = {};
  function entityAt(x, y) { var es = entities(); for (var i = 0; i < es.length; i++) if (es[i].x === x && es[i].y === y) return es[i]; return null; }
  function blocked(x, y) { return mapNow().solid(x, y) || !!entityAt(x, y); }

  var DX = { up: 0, down: 0, left: -1, right: 1 }, DY = { up: -1, down: 1, left: 0, right: 0 };
  var THROUGH = 'CmQnV';

  // Hvad står man over for? Personer bag en disk tæller med.
  function facingFrom(x, y, dir) {
    var fx = x + DX[dir], fy = y + DY[dir], m = mapNow();
    var e = entityAt(fx, fy);
    if (e) return { ent: e, x: fx, y: fy };
    if (THROUGH.indexOf(m.at(fx, fy)) >= 0) { var e2 = entityAt(fx + DX[dir], fy + DY[dir]); if (e2) return { ent: e2, x: e2.x, y: e2.y }; }
    var key = S.map + ':' + fx + ',' + fy;
    if (K.places[key]) return { place: K.places[key], x: fx, y: fy };
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
    task: function (key, T0) {
      if (S.solved[key]) return Promise.resolve(true);
      var n = 0; for (var k in S.solved) n++;
      return UI.task(T0, {}).then(function (r) {
        if (!r) return false;
        S.solved[key] = true;
        var area = areaKey(T0.area);
        if (area) { var st = S.stats[area] || (S.stats[area] = { n: 0, first: 0 }); st.n++; if (r.first) st.first++; }
        if (!r.first) { S.persist++; if (S.persist === 1 || S.persist % 5 === 0) UI.toast('<b>Vedholdenhed!</b> Du gav ikke op — det er sådan, man bliver god.'); }
        save(); return true;
      });
    },
    start: function (id, quiet) {
      S.q[id] = 'active'; save(); hud();
      if (!quiet) { RB.audio.sfx('quest'); UI.toast('<b>Ny mission:</b> ' + RB.esc(K.quest(id).title)); }
    },
    finish: function (id) { S.q[id] = 'done'; save(); hud(); UI.toast('<b>Mission fuldført:</b> ' + RB.esc(K.quest(id).title)); },
    clue: function (id) { if (S.clues.indexOf(id) < 0) { S.clues.push(id); UI.toast('<b>Nyt spor i dagbogen</b>'); save(); } },
    skill: function (id) {
      if (S.skills.indexOf(id) < 0) { S.skills.push(id); RB.audio.sfx('skill'); UI.toast('<b>Ny evne: ' + RB.esc(K.skills[id].name) + '</b><br>' + RB.esc(K.skills[id].desc)); save(); }
      return Promise.resolve();
    },
    gold: function (n) { S.gold = Math.max(0, S.gold + n); if (n > 0) UI.toast('<b>+' + n + ' guld</b>'); hud(); save(); },
    flag: function (k, v) { S.flags[k] = v === undefined ? true : v; save(); },
    seen: function (k) { if (S.seen[k]) return true; S.seen[k] = true; return false; },
    toast: function (h) { UI.toast(h); },
    refresh: refresh,
    epilogue: epilogue,
    flyt: flyt,
    naesteKapitel: naesteKapitel
  };
  function areaKey(label) { for (var k in K.AREA) if (K.AREA[k] === label) return k; return null; }

  async function run(fn) {
    if (busy) return;
    busy = true;
    try { await fn(); } catch (e) { console.error(e); }
    busy = false; lastClose = performance.now(); hud(); save();
  }

  var lastClose = 0;
  function interact() {
    if (busy || UI.isOpen() || player.moving) return;
    if (performance.now() - lastClose < 300) return;   // lige kommet ud af en samtale
    var f = facing(); if (!f) return;
    if (f.ent) {
      var e = f.ent;
      if (e.kind === 'npc') { var back = { up: 'down', down: 'up', left: 'right', right: 'left' }[S.dir]; if (!K.npcs[e.id].dragon) npcDir[e.id] = back; }
      if (e.kind === 'rune') return run(function () { return findRune(e.id); });
      return run(function () { return K.talk(g, e.id); });
    }
    if (f.place) return run(function () { return K.talk(g, f.place); });
    if (f.locked) return run(function () { return g.say(null, f.locked); });
  }
  async function findRune(id) {
    var r = K.runes.filter(function (x) { return x.id === id; })[0];
    S.runes.push(id); RB.audio.sfx('pick'); save(); hud();
    await g.say(null, '<b>Runestykke: ' + RB.esc(r.title) + '</b><br>' + RB.esc(r.t), 'Runestykke: ' + r.title + '. ' + r.t);
    UI.toast('<b>Runestykker: ' + S.runes.length + ' af ' + K.runesNu().length + '</b>');
  }

  // ---------------------------------------------------------------- bevægelse
  function tryMove(dir) {
    S.dir = dir;
    var nx = S.x + DX[dir], ny = S.y + DY[dir];
    if (blocked(nx, ny)) return;
    player.fromX = S.x; player.fromY = S.y; S.x = nx; S.y = ny;
    player.moving = true; player.t = 0; player.alt = !player.alt;
    if (S.flags.catFollow) { cat.trail.push([player.fromX, player.fromY]); if (cat.trail.length > 1) cat.trail.shift(); }
  }
  function arrive() {
    var d = mapNow().doorAt(S.x, S.y);
    if (d) { go(d.to, d.tx, d.ty, d.dir); return; }
  }
  function go(mapId, x, y, dir) {
    busy = true; RB.audio.sfx('door');
    var f = document.getElementById('fade'); f.classList.add('on');
    setTimeout(function () {
      S.map = mapId; S.x = x; S.y = y; S.dir = dir || S.dir;
      player.px = x * T; player.py = y * T; player.moving = false;
      cat.trail = [[x - DX[S.dir], y - DY[S.dir]]]; cat.x = cat.trail[0][0]; cat.y = cat.trail[0][1]; cat.px = cat.x * T; cat.py = cat.y * T;
      RB.audio.music(mapNow().music === 'by' && S.flags.clean ? 'fest' : mapNow().music);
      snapCam(); save(); hud();
      f.classList.remove('on'); busy = false;
    }, 230);
  }

  function update() {
    tick++;
    if (!started) return;
    var blockedInput = busy || UI.isOpen();
    if (blockedInput) heldOrder = [];
    document.body.classList.toggle('ui-open', UI.isOpen());      // en tast, der blev holdt nede ind i en dialog, må ikke gå videre bagefter
    if (player.moving) {
      player.t += 1 / 8;
      var k = Math.min(1, player.t);
      player.px = (player.fromX + (S.x - player.fromX) * k) * T;
      player.py = (player.fromY + (S.y - player.fromY) * k) * T;
      if (player.t >= 1) {
        player.moving = false; player.px = S.x * T; player.py = S.y * T; arrive();
      }
    }
    if (blockedInput) auto = null;
    if (!player.moving && !blockedInput) {
      var d = stickDir || (heldOrder.length ? heldOrder[heldOrder.length - 1] : null);
      if (d) { auto = null; tryMove(d); }      // joystick og taster vinder over et tryk
      else if (auto) autoSkridt();
    }
    // katten går i sporet efter spilleren
    if (S.flags.catFollow && cat.trail.length) {
      var tgt = cat.trail[0];
      if (cat.x !== tgt[0] || cat.y !== tgt[1]) { cat.x = tgt[0]; cat.y = tgt[1]; }
      cat.px += (cat.x * T - cat.px) * 0.2; cat.py += (cat.y * T - cat.py) * 0.2;
    }
    // folk kigger sig lidt omkring, når ingen taler med dem
    if (tick % 120 === 0 && !busy && !UI.isOpen()) {
      var es = entities().filter(function (e) { return e.kind === 'npc' && !K.npcs[e.id].dragon; });
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

    smoke(m, cx, cy);

    // figurer og ting, sorteret efter dybde
    var draw = [];
    entities().forEach(function (e) { draw.push({ y: e.y * T, fn: function () { drawEntity(e, cx, cy); } }); });
    if (S.flags.catFollow && S.map) draw.push({ y: cat.py - 1, fn: function () { RB.drawShadow(ctx, Math.round(cat.px) - cx, Math.round(cat.py) - cy); ctx.drawImage(catSheet, Math.round(cat.px) - cx, Math.round(cat.py) - cy + 1); } });
    if (started) draw.push({ y: player.py, fn: function () { drawChar(sheets.player, player.px - cx, player.py - cy, S.dir, player.moving ? (player.t < 0.5 ? (player.alt ? 1 : 2) : 0) : 0); } });
    if (S.map === 'by' && !S.flags.hildeFree) draw.push({ y: 20 * T - 1, fn: function () { stocks(31 * T - cx, 20 * T - cy); } });
    draw.sort(function (a, b) { return a.y - b.y; });
    draw.forEach(function (d) { d.fn(); });

    // markører over folk
    var marks = K.markers(S);
    entities().forEach(function (e) { if (marks[e.id]) RB.drawMarker(ctx, e.x * T - cx, e.y * T - cy - 13, marks[e.id], tick); });
    Object.keys(K.placePos).forEach(function (p) { var pp = K.placePos[p]; if (marks[p] && pp[0] === S.map) RB.drawMarker(ctx, pp[1] * T - cx, pp[2] * T - cy - 12, marks[p], tick); });

    lighting(m, cx, cy);
    if (m.outdoor) weather(cx, cy, m.weather);
    if (started) arrow(cx, cy);
  }

  function drawChar(sheet, x, y, dir, frame) {
    x = Math.round(x); y = Math.round(y);
    RB.drawShadow(ctx, x, y);
    ctx.drawImage(sheet, frame * T, RB.DIR_ROW[dir] * T, T, T, x, y - 2, T, T);
  }
  function drawEntity(e, cx, cy) {
    var x = e.x * T - cx, y = e.y * T - cy;
    if (e.kind === 'npc') {
      if (K.npcs[e.id].dragon) { RB.drawShadow(ctx, x, y); var b = Math.floor(tick / 40) % 2; ctx.drawImage(dragonSheet, 0, 0, T, T, x, y - b, T, T); if (tick % 200 < 60) { var p = (tick % 200) / 60; ctx.fillStyle = 'rgba(200,200,210,' + (1 - p) + ')'; ctx.fillRect(x + 7, y + 2 - p * 10, 2, 2); } return; }
      drawChar(sheetFor(e.id), x, y, e.dir || 'down', 0);
    } else if (e.kind === 'sample' || e.kind === 'station') {
      ctx.fillStyle = '#633c22'; ctx.fillRect(x + 7, y + 6, 2, 9);
      ctx.fillStyle = '#e8d8b4'; ctx.fillRect(x + 4, y + 4, 8, 4);
      RB.drawSparkle(ctx, x, y - 6, tick, '#9ad0ff');
    } else if (e.kind === 'cat') {
      RB.drawShadow(ctx, x, y); ctx.drawImage(catSheet, x, y);
    } else if (e.kind === 'rune') {
      RB.drawScroll(ctx, x, y, tick);
    }
  }
  function stocks(x, y) {
    ctx.fillStyle = '#3e2618'; ctx.fillRect(x + 1, y + 4, 2, 12); ctx.fillRect(x + 13, y + 4, 2, 12);
    ctx.fillStyle = '#8e5a32'; ctx.fillRect(x - 1, y + 7, 18, 4); ctx.fillStyle = '#b8804a'; ctx.fillRect(x - 1, y + 7, 18, 1);
  }

  // ---------------------------------------------------------------- stemning
  var TINT = {
    morgen: { fill: 'rgba(255,236,190,0.07)', mul: null, lamp: 0, fly: 0 },
    eftermiddag: { fill: 'rgba(255,200,120,0.10)', mul: null, lamp: 0.08, fly: 0 },
    aften: { fill: 'rgba(255,140,70,0.16)', mul: 'rgb(235,190,170)', lamp: 0.42, fly: 6 },
    nat: { fill: null, mul: 'rgb(90,100,170)', lamp: 0.7, fly: 14 },
    fest: { fill: null, mul: 'rgb(130,115,185)', lamp: 0.75, fly: 12 }
  };
  function lighting(m, cx, cy) {
    var tod = K.timeOfDay(S), L = TINT[tod];
    if (!m.outdoor) L = { fill: 'rgba(255,170,90,0.08)', mul: m.id === 'farveri' ? 'rgb(170,175,210)' : 'rgb(245,225,200)', lamp: 0.55, fly: 0 };
    ctx.save();
    if (L.mul) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = L.mul; ctx.fillRect(0, 0, VW, VH); }
    if (L.fill) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = L.fill; ctx.fillRect(0, 0, VW, VH); }
    if (L.lamp > 0) {
      ctx.globalCompositeOperation = 'lighter';
      var flick = 0.92 + Math.sin(tick / 7) * 0.04 + Math.sin(tick / 3.3) * 0.03;
      m.lamps.forEach(function (p) { glow(p[0] * T + 8 - cx, p[1] * T + 4 - cy, p[3] || 34, L.lamp * flick, p[2] || '255,170,80'); });   // p[2]/p[3]: egen farve og størrelse (fx lysende svampe)
      if (m.windows.length) m.windows.forEach(function (p) {
        var a = L.lamp * 0.8; if (a <= 0.1) return;
        ctx.fillStyle = 'rgba(255,190,90,' + a + ')'; ctx.fillRect(p[0] * T + 4 - cx, p[1] * T + 4 - cy, 8, 7);
        glow(p[0] * T + 8 - cx, p[1] * T + 10 - cy, 16, a * 0.5, '255,180,90');
      });
      if (tod === 'fest' && m.id === 'by') festLights(cx, cy);
    }
    ctx.restore();
    if (L.fly && m.outdoor) fireflies(L.fly);
    // blød vignet — hyggeligt, og øjet søger mod midten
    var v = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.45, VW / 2, VH / 2, VW * 0.62);
    v.addColorStop(0, 'rgba(20,10,30,0)'); v.addColorStop(1, 'rgba(20,10,30,0.38)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, VW, VH);
  }
  function glow(x, y, r, a, rgb) {
    if (x < -r || y < -r || x > VW + r || y > VH + r) return;
    var gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function festLights(cx, cy) {
    var strands = [[[16, 19], [33, 19]], [[16, 24], [33, 24]], [[16, 19], [16, 24]], [[33, 19], [33, 24]]];
    var cols = ['255,90,90', '255,220,90', '120,220,255', '160,255,140', '255,140,220'];
    strands.forEach(function (s, si) {
      var x0 = s[0][0] * T + 8 - cx, y0 = s[0][1] * T + 2 - cy, x1 = s[1][0] * T + 8 - cx, y1 = s[1][1] * T + 2 - cy;
      var n = 12;
      for (var i = 0; i <= n; i++) {
        var t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * 6;
        var c = cols[(i + si) % cols.length], on = ((i + Math.floor(tick / 20)) % 3) !== 0;
        ctx.fillStyle = 'rgba(' + c + ',' + (on ? 0.95 : 0.35) + ')'; ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
        if (on) glow(x + 1, y + 1, 6, 0.35, c);
      }
    });
  }
  function fireflies(n) {
    while (flies.length < n) flies.push({ x: Math.random() * VW, y: Math.random() * VH, p: Math.random() * 6.28, s: 0.2 + Math.random() * 0.3 });
    flies.length = n;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    flies.forEach(function (f) {
      f.p += 0.03; f.x += Math.cos(f.p * 0.7) * f.s; f.y += Math.sin(f.p) * f.s * 0.6;
      if (f.x < 0) f.x += VW; if (f.x > VW) f.x -= VW; if (f.y < 0) f.y += VH; if (f.y > VH) f.y -= VH;
      var a = 0.4 + Math.sin(f.p * 2.3) * 0.4; if (a < 0.1) return;
      ctx.fillStyle = 'rgba(230,255,140,' + a + ')'; ctx.fillRect(Math.round(f.x), Math.round(f.y), 1, 1);
      glow(f.x, f.y, 5, a * 0.35, '200,255,120');
    });
    ctx.restore();
  }
  function smoke(m, cx, cy) {
    if (tick % 26 === 0) m.chimneys.forEach(function (c) { particles.push({ x: c[0] * T + 10, y: c[1] * T - 1, age: 0, dx: (Math.random() - 0.3) * 0.15 }); });
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i]; p.age++; p.y -= 0.18; p.x += p.dx + Math.sin((p.age + i) / 18) * 0.08;
      if (p.age > 170) { particles.splice(i, 1); continue; }
      var a = 0.5 * (1 - p.age / 170), r = 1 + p.age / 55;
      ctx.fillStyle = 'rgba(214,208,222,' + a + ')';
      ctx.fillRect(Math.round(p.x - r - cx), Math.round(p.y - r - cy), Math.ceil(r * 2), Math.ceil(r * 2));
    }
  }
  function weather(cx, cy, slags) {
    var cols = slags === 'hav' ? ['#e8f0f8', '#c8d8e8', '#ffffff'] : ['#e0a82c', '#d8584a', '#c86a2a', '#ffe070'];   // havnen: måger og skumsprøjt i stedet for blade
    while (leaves.length < 14) leaves.push({ x: Math.random() * (VW + 40), y: -Math.random() * VH, s: 0.25 + Math.random() * 0.35, p: Math.random() * 6.28, c: cols[(Math.random() * 4) | 0] });
    leaves.forEach(function (l) {
      l.p += 0.04; l.y += l.s; l.x += Math.sin(l.p) * 0.45 - 0.18;
      if (l.y > VH + 4 || l.x < -6) { l.y = -4; l.x = Math.random() * (VW + 40); }
      ctx.fillStyle = l.c; var w = Math.sin(l.p) > 0 ? 2 : 1;
      ctx.fillRect(Math.round(l.x), Math.round(l.y), w, 1); ctx.fillRect(Math.round(l.x) + (w === 2 ? 1 : 0), Math.round(l.y) + 1, 1, 1);
    });
  }

  // Pil i kanten af skærmen, der viser vej til missionen
  function targetPos() {
    var mt = K.mainTarget(S); if (!mt || !mt.t) return null;
    var t = mt.t, p = null;
    if (K.npcs[t]) { var np = K.npcs[t].pos(S); if (np) p = [np.map, np.x, np.y]; }
    if (!p) K.things.forEach(function (th) { if (th.id === t) p = [th.map, th.x, th.y]; });
    if (!p && K.placePos[t]) p = K.placePos[t];
    if (!p) return null;
    if (p[0] === S.map) return [p[1], p[2]];
    return doorToward(S.map, p[0]);
  }
  // Første dør på kortet, man står på, der fører mod kortet `til` (bredde-først over alle døre)
  function doorToward(fra, til) {
    var seen = {}, queue = [], m0 = world[fra];
    seen[fra] = true;
    m0.doors.forEach(function (d) { queue.push({ map: d.to, first: [d.x, d.y] }); });
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
    var mt = K.mainTarget(S);
    var kp = K.kapNu(), klaret = (S.klaret || []).indexOf(S.kap || 1) >= 0;
    document.getElementById('hud-quest-title').textContent = mt ? mt.q.title : (klaret ? kp.efterTitel : '');
    document.getElementById('hud-quest-goal').textContent = mt ? K.goal(mt.q.id) : (klaret ? kp.efterMaal : '');
    document.getElementById('hud-gold').textContent = S.gold;
    document.getElementById('hud-runes').textContent = S.runes.length + '/' + K.runesNu().length;
  }
  function updatePrompt() {
    var el = document.getElementById('prompt');
    if (!started || busy || UI.isOpen() || player.moving) { el.hidden = true; return; }
    var f = facing();
    if (!f) { el.hidden = true; return; }
    var label = 'Undersøg';
    if (f.ent) label = f.ent.kind === 'npc' ? (K.npcs[f.ent.id].dragon ? 'Klap Glød' : 'Tal med ' + K.npcs[f.ent.id].name.split(',')[0]) : f.ent.kind === 'rune' ? 'Saml runestykket op' : f.ent.kind === 'cat' ? 'Kald på katten' : f.ent.kind === 'station' ? 'Undersøg stedet' : 'Tag en vandprøve';
    else if (f.place && /^sign/.test(f.place)) label = 'Læs skiltet';
    else if (f.place === 'tavle') label = 'Læs opslagene';
    el.innerHTML = '<span class="key">E</span> ' + RB.esc(label);
    el.hidden = false;
  }

  // ---------------------------------------------------------------- slutningen og kapitlerne
  // Et kapitel slutter med sin egen scene (kapitel 1 her, de andre i kapitler[n].slut.scene),
  // og så kommer "Jeg kan …"-skærmen. Er der et næste kapitel, er det nu låst op.
  async function flyt(map, x, y, dir, musik) {
    var f = document.getElementById('fade'); f.classList.add('on');
    await new Promise(function (r) { setTimeout(r, 400); });
    S.map = map; S.x = x; S.y = y; S.dir = dir || 'down';
    player.px = S.x * T; player.py = S.y * T; player.moving = false;
    cat.trail = [[x, y + 1]]; cat.x = x; cat.y = y + 1; cat.px = cat.x * T; cat.py = cat.y * T;
    refresh(); snapCam();
    if (musik !== null) RB.audio.music(musik || (mapNow().music === 'by' && S.flags.clean ? 'fest' : mapNow().music));
    save(); hud();
    f.classList.remove('on');
  }

  async function epilogue() { await kapSlut(); }
  async function kapSlut() {
    var n = S.kap || 1, kp = K.kapitler[n];
    if (n === 1) {
      await flyt('by', 24, 22, 'up', 'fest');
      await g.say(null, 'Samme aften hælder Hilde og Zara Klarvandseliksiren i Månebrønden. Vandet bruser, bobler — og bliver klart som en efterårshimmel.');
      await g.say(null, 'Hele Runeborg samles på torvet. Nogen hænger lygter op. Gorm deler græskarsuppe ud. Lærke spiller sin nye vise.');
      await g.say('brynja', 'Det her, {navn} — det var ikke et sværd, der reddede byen. Det var spørgsmål, målinger og mod til at sige imod. Du er en rigtig eventyrer nu.');
      await g.say('hilde', 'Og husk: der er altid te i min kedel.');
    } else {
      await kp.slut.scene(g);
    }
    if (S.klaret.indexOf(n) < 0) S.klaret.push(n);
    save(true); hud();
    var rows = K.CANDO.filter(function (c) { return (c[2] || 1) === n; }).map(function (c) {
      var st = S.stats[c[0]]; if (!st || !st.n) return null;
      var r = st.first / st.n; return { t: c[1], stars: r >= 0.85 ? 3 : r >= 0.5 ? 2 : 1 };
    }).filter(Boolean);
    var sider = (kp.sider || []).filter(function (id) { return S.q[id] === 'done'; }).length;
    var rk = K.runesIKap(n), fundet = rk.filter(function (r) { return S.runes.indexOf(r.id) >= 0; }).length;
    var badges = [
      'Vedholdenhed: du prøvede igen og klarede det ' + S.persist + ' ' + (S.persist === 1 ? 'gang' : 'gange'),
      'Nysgerrighed: ' + fundet + ' af ' + rk.length + ' runestykker',
      'Ekstramissioner: ' + sider + ' af ' + (kp.sider || []).length
    ];
    if (S.flags.catFollow) badges.push('Mis fulgte dig hele vejen');
    var nxt = K.kapitler[n + 1];
    var valg = await UI.ending(rows, badges, { titel: kp.slut.titel, tekst: kp.slut.tekst, rundt: kp.slut.rundt, naeste: nxt ? nxt.navn : null });
    if (valg === 'naeste') await naesteKapitel();
  }

  // Det næste kapitel er låst op, når det før er klaret
  function kapStatus(n) {
    if ((S.klaret || []).indexOf(n) >= 0) return 'klaret';
    if ((S.kap || 1) === n) return 'igang';
    if (n === 1 || (S.klaret || []).indexOf(n - 1) >= 0) return 'klar';
    return 'laast';
  }
  async function naesteKapitel() { await startKapitel((S.kap || 1) + 1); }
  async function startKapitel(n) {
    var kp = K.kapitler[n];
    if (!kp || kapStatus(n) === 'laast') return;
    var f = document.getElementById('fade'); f.classList.add('on');
    await new Promise(function (r) { setTimeout(r, 400); });
    S.kap = n;
    var st = kp.start || {};
    S.map = st.map; S.x = st.x; S.y = st.y; S.dir = st.dir || 'down';
    player.px = S.x * T; player.py = S.y * T; player.moving = false;
    cat.trail = [[S.x, S.y + 1]]; cat.x = S.x; cat.y = S.y + 1; cat.px = cat.x * T; cat.py = cat.y * T;
    refresh(); snapCam(); RB.audio.music(mapNow().music); hud();
    f.classList.remove('on');
    save(true);
    await UI.kapitelkort(n, kp.navn, kp.kort);
    await kp.intro(g);
  }
  // Kapitel-menuen (Pause → Kapitler): ✓ klaret, ► i gang, "Start" når det er låst op
  async function kapitelMenu() {
    var liste = [];
    for (var n = 1; n <= K.KAPITLER; n++) liste.push({ n: n, navn: K.kapitler[n] ? K.kapitler[n].navn : '…', status: K.kapitler[n] ? kapStatus(n) : 'laast' });
    var valg = await UI.kapitler(liste);
    if (valg && kapStatus(valg) === 'klar' && valg !== (S.kap || 1)) await startKapitel(valg);
  }

  // ---------------------------------------------------------------- input
  var KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
  function press(dir) { if (heldOrder.indexOf(dir) < 0) heldOrder.push(dir); }
  function release(dir) { var i = heldOrder.indexOf(dir); if (i >= 0) heldOrder.splice(i, 1); }
  document.addEventListener('keydown', function (e) {
    RB.audio.unlock();
    if (!started) return;
    var tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT') return;
    if (KEYS[e.key]) { if (!UI.isOpen()) { e.preventDefault(); press(KEYS[e.key]); } return; }
    // Et tryk, der lige har lukket en dialog, må ikke også starte en ny samtale.
    // (Dialogen lukker, historien bliver færdig, og så når den samme tast
    // hertil — uden det her tjek starter samtalen forfra i det uendelige.)
    if (e.defaultPrevented || e.repeat || UI.isOpen() || busy) return;
    if (e.key === 'e' || e.key === 'E' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); interact(); }
    else if (e.key === 'b' || e.key === 'B' || e.key === 'Tab') { e.preventDefault(); openBook(); }
    else if (e.key === 'Escape') { e.preventDefault(); openMenu(); }
    else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); RB.toggleFullscreen(); }
    else if (e.key === 'm' || e.key === 'M') { RB.audio.setMusic(!RB.audio.musicOn); RB.saveSettings(); UI.toast('Musik ' + (RB.audio.musicOn ? 'til' : 'fra')); }
  });
  document.addEventListener('keyup', function (e) { if (KEYS[e.key]) release(KEYS[e.key]); });
  window.addEventListener('blur', function () { heldOrder = []; });
  document.addEventListener('visibilitychange', function () { heldOrder = []; });
  function openBook() { if (busy || UI.isOpen()) return; heldOrder = []; run(function () { return UI.book(); }); }
  function openMenu() {
    if (busy || UI.isOpen()) return; heldOrder = [];
    run(async function () { if ((await UI.menu()) === 'kapitler') await kapitelMenu(); });
  }
  // Fuld skærm. Knappen skjules, hvor browseren ikke kan (fx iPhone-Safari).
  var root = document.documentElement;
  var canFull = !!(root.requestFullscreen || root.webkitRequestFullscreen);
  function isFull() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  RB.toggleFullscreen = function () {
    if (!canFull) return;
    if (isFull()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    var p = (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
    if (p && p.catch) p.catch(function () { });
  };
  RB.isFullscreen = isFull; RB.canFullscreen = canFull;
  var fullBtn = document.getElementById('btn-full');
  if (!canFull) fullBtn.hidden = true;
  fullBtn.addEventListener('click', function () { RB.toggleFullscreen(); fullBtn.blur(); });
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) {
    document.addEventListener(ev, function () { fullBtn.title = isFull() ? 'Forlad fuld skærm (F)' : 'Fuld skærm (F)'; setTimeout(resize, 50); });
  });
  document.getElementById('btn-book').addEventListener('click', openBook);
  document.getElementById('btn-menu').addEventListener('click', openMenu);

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
  RB.wakeTouch = wake;
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
    e.preventDefault(); RB.audio.unlock(); wake();
    stickNed = { x: e.clientX, y: e.clientY, t: performance.now() };
    stickId = e.pointerId; try { zone.setPointerCapture(e.pointerId); } catch (x) { }
    zone.classList.add('active');
    // joysticket flytter sig derhen, hvor tommelfingeren lander
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
  document.getElementById('t-act').addEventListener('pointerdown', function (e) { e.preventDefault(); RB.audio.unlock(); if (!UI.advance()) interact(); });
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
    if (!started || busy || UI.isOpen() || player.moving) return false;
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

  // ---------------------------------------------------------------- start
  function makeDragon() {
    var rows = ['................', '................', '................', '................',
      '........kk......', '.......krek.....', '..kk..krrrrk....', '.kook.krrrrk....', '.kooookkrrrrk...', '..kookrrrrrrk...',
      '...krrrrrrrrrk..', '..krrrbbbbrrrrk.', '..krrbbbbbbrrkk.', '...kkkkkkkkkkrk.', '..............k.', '................'];
    var col = { k: '#1a1420', r: '#c83a3a', e: '#ffe070', o: '#e8943a', b: '#f0c070' };
    var c = RB.canvas(48, 64), x = c.getContext('2d');
    rows.forEach(function (row, y) { for (var i = 0; i < 16; i++) if (col[row[i]]) { x.fillStyle = col[row[i]]; x.fillRect(i, y, 1, 1); } });
    return c;
  }

  // Prøvetiden (LFSpil i /assets/spilletid.js): en venlig besked 4 minutter før,
  // og når den er brugt, gemmes spillet og en slutskærm lukker det ned.
  var tidSlutVist = false;
  RB.tidSnart = function (sek) {
    if (UI) UI.toast('<b>Snart er din spilletid brugt.</b><br>Der er ' + Math.max(1, Math.round(sek / 60)) + ' minutter tilbage.');
  };
  RB.tidSlut = function () {
    if (tidSlutVist || !UI) return;       // før boot() har lavet UI: boot() spørger selv
    tidSlutVist = true;
    save(true);
    UI.tidSlut();
  };

  function begin() {
    started = true;
    if (window.LFSpil) LFSpil.aktiv(true);   // først nu tæller tiden (ikke på titelskærmen)
    player.px = S.x * T; player.py = S.y * T;
    sheets.player = RB.makeSheet(K.classes[S.cls].look);
    cat.trail = [[S.x, S.y + 1]]; cat.x = S.x; cat.y = S.y + 1; cat.px = cat.x * T; cat.py = cat.y * T;
    refresh(); snapCam();
    document.getElementById('hud').hidden = false; hud();
    if (document.body.classList.contains('touching')) wake();
    RB.audio.music(mapNow().music === 'by' && S.flags.clean ? 'fest' : mapNow().music);
  }

  async function boot() {
    K = RB.content; UI = RB.ui; UI.init(); resize();
    // Spørg serveren med det samme — svaret skal bruges, når titlen kommer
    var hentning = FOTO ? null : RB.gem.hent(lokal());
    loadSettings();
    world = RB.buildWorld();
    catSheet = RB.makeCat(); dragonSheet = makeDragon();
    // bag titelskærmen: byen om morgenen
    S = fresh('', 0); S.map = 'by'; S.x = 24; S.y = 21; RB.state = S;
    player.px = S.x * T; player.py = S.y * T; snapCam();
    requestAnimationFrame(loop);
    if (document.fonts && document.fonts.ready) { try { await Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 1500); })]); } catch (e) { } }
    if (FOTO) { foto(FOTO); return; }
    var saved = parse(await hentning);
    if ((window.LFSpil && LFSpil.tidSlut()) || tidSlutVist) { RB.tidSlut(); return; }   // prøvetiden er allerede brugt
    var info = null;
    if (saved) {
      var nk = (saved.kap || 1) + 1;
      info = { kap: saved.kap, kapnavn: saved.kap > 1 && K.kapitler[saved.kap] ? K.kapitler[saved.kap].navn : '',
               naeste: saved.klaret.indexOf(saved.kap) >= 0 && K.kapitler[nk] ? K.kapitler[nk].navn : '' };
    }
    var choice = await UI.title(saved ? saved.name || 'Lærling' : '', info);
    if ((choice === 'continue' || choice === 'naeste') && saved) {
      S = saved; RB.state = S; if (!S.q.q0) S.q.q0 = 'active'; begin();
      if (choice === 'naeste') { await run(naesteKapitel); return; }
      UI.toast('Velkommen tilbage, <b>' + RB.esc(S.name) + '</b>!');
      return;
    }
    RB.audio.music('by');
    var who0 = await UI.create(K.classes);
    S = fresh(who0.name, who0.cls); RB.state = S;
    begin(); save();
    await run(function () { return K.script.intro(g); });
  }

  // Fototilstand: stiller en scene op til hjemmesidens skærmbilleder
  function foto(scene) {
    S = fresh('Freja', 1); RB.state = S;
    var done = function (ids) { ids.forEach(function (id) { S.q[id] = 'done'; }); };
    if (scene === 'by') { done(['q0']); S.q.q1 = 'active'; S.map = 'by'; S.x = 25; S.y = 18; S.dir = 'down'; S.skills = ['laeselup']; }
    if (scene === 'kro') { done(['q0', 'q1']); S.q.q2 = 'active'; S.map = 'kro'; S.x = 8; S.y = 8; S.dir = 'up'; }
    if (scene === 'fest') { done(['q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 's1']); S.flags = { clean: true, hildeFree: true, gateOpen: true, f_guard: true, f_valve: true, catFollow: true }; S.map = 'by'; S.x = 24; S.y = 22; S.dir = 'up'; }
    if (scene === 'opgave') { done(['q0', 'q1', 'q2', 'q3', 'q4']); S.q.q5 = 'active'; S.flags = { sA: true, sB: true, sC: true }; S.seen = { q5a: true }; S.map = 'alkymist'; S.x = 6; S.y = 5; S.dir = 'up'; }
    if (scene === 'dialog') { S.map = 'laug'; S.x = 6; S.y = 5; S.dir = 'up'; }
    begin();
    if (scene === 'opgave') run(function () { return K.talk(g, 'zara'); });
    if (scene === 'dialog') run(function () { return K.talk(g, 'brynja'); });
  }

  // Til test fra konsollen: RB.debug.S, RB.debug.tp('by', 24, 20), RB.debug.face('up')
  RB.debug = {
    get S() { return S; }, get held() { return heldOrder; }, g: g, interact: interact, refresh: refresh, entities: function () { return entities(); },
    kapitel: function (n) { if (S.klaret.indexOf(n - 1) < 0 && n > 1) S.klaret.push(n - 1); return run(function () { return startKapitel(n); }); },
    kapSlut: function () { return run(kapSlut); }, world: function () { return world; },
    tp: function (m, x, y, d) { S.map = m; S.x = x; S.y = y; if (d) S.dir = d; player.px = x * T; player.py = y * T; snapCam(); hud(); },
    face: function (d) { S.dir = d; }
  };

  window.addEventListener('pagehide', function () { save(true); });
  // På en telefon skifter man app i stedet for at lukke fanen
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') save(true);
  });
  boot();
})();
