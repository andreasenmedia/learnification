/* Runeborg — motoren
   Tilstand, gemning, bevægelse på felter, samtaler, døre, kamera, tegning og
   stemning (lys efter tid på dagen, røg fra skorstene, blade, ildfluer). */
(function () {
  'use strict';
  var RB = window.RB, K, UI, T = 16, VW = 320, VH = 180, SCALE = 4;
  var SAVE = 'runeborg-v1', SETTINGS = 'runeborg-indstillinger';

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
    return { v: 1, name: name, cls: cls, map: 'laug', x: 6, y: 5, dir: 'up', q: { q0: 'active' }, flags: {}, clues: [], skills: [], runes: [], gold: 0, solved: {}, stats: {}, persist: 0, seen: {}, talks: 0 };
  }
  var FOTO = (location.hash.match(/foto=(\w+)/) || [])[1];   // tools/runeborg-billeder.py tager skærmbilleder sådan
  // Gem først, når et rigtigt spil er i gang — titelskærmens baggrundsby må
  // aldrig overskrive det, man har gemt.
  function save() { if (!S || FOTO || !started) return; try { localStorage.setItem(SAVE, JSON.stringify(S)); } catch (e) { /* privat vindue */ } }
  function load() { try { var s = JSON.parse(localStorage.getItem(SAVE)); return s && s.v === 1 ? s : null; } catch (e) { return null; } }
  RB.saveSettings = function () {
    try { localStorage.setItem(SETTINGS, JSON.stringify({ music: RB.audio.musicOn, sfx: RB.audio.sfxOn, voice: RB.voice.on, big: document.body.classList.contains('big') })); } catch (e) { }
  };
  function loadSettings() {
    try {
      var s = JSON.parse(localStorage.getItem(SETTINGS)); if (!s) return;
      RB.audio.setMusic(s.music !== false); RB.audio.setSfx(s.sfx !== false); RB.voice.on = s.voice !== false; document.body.classList.toggle('big', !!s.big);
    } catch (e) { }
  }
  RB.resetGame = function () { try { localStorage.removeItem(SAVE); } catch (e) { } location.reload(); };

  // ---------------------------------------------------------------- verden
  function applyWorldFlags() {
    world.by.flags.gateOpen = !!S.flags.gateOpen;
    world.farveri.flags.valveClosed = !!S.flags.f_valve;
    world.by.flags.green = !S.flags.clean; world.farveri.flags.green = !S.flags.clean;
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
  function facing() {
    var fx = S.x + DX[S.dir], fy = S.y + DY[S.dir], m = mapNow();
    var e = entityAt(fx, fy);
    if (e) return { ent: e };
    if (THROUGH.indexOf(m.at(fx, fy)) >= 0) { var e2 = entityAt(fx + DX[S.dir], fy + DY[S.dir]); if (e2) return { ent: e2 }; }
    var key = S.map + ':' + fx + ',' + fy;
    if (K.places[key]) return { place: K.places[key] };
    if (K.lockedDoors[key]) return { locked: K.lockedDoors[key] };
    return null;
  }

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
    epilogue: epilogue
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
    UI.toast('<b>Runestykker: ' + S.runes.length + ' af ' + K.runes.length + '</b>');
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
    if (!player.moving && !blockedInput) {
      var d = stickDir || (heldOrder.length ? heldOrder[heldOrder.length - 1] : null);
      if (d) tryMove(d);
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
    if (m.id === 'by') weather(cx, cy);
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
    } else if (e.kind === 'sample') {
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
    if (m.id !== 'by') L = { fill: 'rgba(255,170,90,0.08)', mul: m.id === 'farveri' ? 'rgb(170,175,210)' : 'rgb(245,225,200)', lamp: 0.55, fly: 0 };
    ctx.save();
    if (L.mul) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = L.mul; ctx.fillRect(0, 0, VW, VH); }
    if (L.fill) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = L.fill; ctx.fillRect(0, 0, VW, VH); }
    if (L.lamp > 0) {
      ctx.globalCompositeOperation = 'lighter';
      var flick = 0.92 + Math.sin(tick / 7) * 0.04 + Math.sin(tick / 3.3) * 0.03;
      m.lamps.forEach(function (p) { glow(p[0] * T + 8 - cx, p[1] * T + 4 - cy, 34, L.lamp * flick, '255,170,80'); });
      if (m.id === 'by') m.windows.forEach(function (p) {
        var a = L.lamp * 0.8; if (a <= 0.1) return;
        ctx.fillStyle = 'rgba(255,190,90,' + a + ')'; ctx.fillRect(p[0] * T + 4 - cx, p[1] * T + 4 - cy, 8, 7);
        glow(p[0] * T + 8 - cx, p[1] * T + 10 - cy, 16, a * 0.5, '255,180,90');
      });
      if (tod === 'fest' && m.id === 'by') festLights(cx, cy);
    }
    ctx.restore();
    if (L.fly && m.id === 'by') fireflies(L.fly);
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
  function weather(cx, cy) {
    var cols = ['#e0a82c', '#d8584a', '#c86a2a', '#ffe070'];
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
    var m = mapNow();
    if (S.map !== 'by') return m.spots.exit || null;
    for (var i = 0; i < m.doors.length; i++) if (m.doors[i].to === p[0]) return [m.doors[i].x, m.doors[i].y];
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
    document.getElementById('hud-quest-title').textContent = mt ? mt.q.title : (S.flags.clean ? 'Høstfest i Runeborg' : '');
    document.getElementById('hud-quest-goal').textContent = mt ? K.goal(mt.q.id) : (S.flags.clean ? 'Nyd festen — og find de sidste runestykker' : '');
    document.getElementById('hud-gold').textContent = S.gold;
    document.getElementById('hud-runes').textContent = S.runes.length + '/' + K.runes.length;
  }
  function updatePrompt() {
    var el = document.getElementById('prompt');
    if (!started || busy || UI.isOpen() || player.moving) { el.hidden = true; return; }
    var f = facing();
    if (!f) { el.hidden = true; return; }
    var label = 'Undersøg';
    if (f.ent) label = f.ent.kind === 'npc' ? (K.npcs[f.ent.id].dragon ? 'Klap Glød' : 'Tal med ' + K.npcs[f.ent.id].name.split(',')[0]) : f.ent.kind === 'rune' ? 'Saml runestykket op' : f.ent.kind === 'cat' ? 'Kald på katten' : 'Tag en vandprøve';
    else if (f.place && /^sign/.test(f.place)) label = 'Læs skiltet';
    else if (f.place === 'tavle') label = 'Læs opslagene';
    el.innerHTML = '<span class="key">E</span> ' + RB.esc(label);
    el.hidden = false;
  }

  // ---------------------------------------------------------------- slutningen
  async function epilogue() {
    var f = document.getElementById('fade'); f.classList.add('on');
    await new Promise(function (r) { setTimeout(r, 400); });
    S.map = 'by'; S.x = 24; S.y = 22; S.dir = 'up';
    player.px = S.x * T; player.py = S.y * T; cat.trail = [[24, 23]]; cat.x = 24; cat.y = 23; cat.px = cat.x * T; cat.py = cat.y * T;
    refresh(); snapCam(); RB.audio.music('fest'); save(); hud();
    f.classList.remove('on');
    await g.say(null, 'Samme aften hælder Hilde og Zara Klarvandseliksiren i Månebrønden. Vandet bruser, bobler — og bliver klart som en efterårshimmel.');
    await g.say(null, 'Hele Runeborg samles på torvet. Nogen hænger lygter op. Gorm deler græskarsuppe ud. Lærke spiller sin nye vise.');
    await g.say('brynja', 'Det her, {navn} — det var ikke et sværd, der reddede byen. Det var spørgsmål, målinger og mod til at sige imod. Du er en rigtig eventyrer nu.');
    await g.say('hilde', 'Og husk: der er altid te i min kedel.');
    var rows = K.CANDO.map(function (c) {
      var st = S.stats[c[0]]; if (!st || !st.n) return null;
      var r = st.first / st.n; return { t: c[1], stars: r >= 0.85 ? 3 : r >= 0.5 ? 2 : 1 };
    }).filter(Boolean);
    var sides = ['s1', 's2', 's3'].filter(function (id) { return S.q[id] === 'done'; }).length;
    var badges = [
      'Vedholdenhed: du prøvede igen og klarede det ' + S.persist + ' ' + (S.persist === 1 ? 'gang' : 'gange'),
      'Nysgerrighed: ' + S.runes.length + ' af ' + K.runes.length + ' runestykker',
      'Ekstramissioner: ' + sides + ' af 3'
    ];
    if (S.flags.catFollow) badges.push('Mis fulgte dig hele vejen');
    await UI.ending(rows, badges);
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
  function openMenu() { if (busy || UI.isOpen()) return; heldOrder = []; run(function () { return UI.menu(); }); }
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
  zone.addEventListener('pointerdown', function (e) {
    e.preventDefault(); RB.audio.unlock(); wake();
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
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { zone.addEventListener(ev, function (e) { if (e.pointerId === stickId) endStick(); }); });
  document.getElementById('t-act').addEventListener('pointerdown', function (e) { e.preventDefault(); RB.audio.unlock(); interact(); });
  document.getElementById('t-book').addEventListener('pointerdown', function (e) { e.preventDefault(); openBook(); });

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

  function begin() {
    started = true;
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
    loadSettings();
    world = RB.buildWorld();
    catSheet = RB.makeCat(); dragonSheet = makeDragon();
    // bag titelskærmen: byen om morgenen
    S = fresh('', 0); S.map = 'by'; S.x = 24; S.y = 21; RB.state = S;
    player.px = S.x * T; player.py = S.y * T; snapCam();
    requestAnimationFrame(loop);
    if (document.fonts && document.fonts.ready) { try { await Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 1500); })]); } catch (e) { } }
    if (FOTO) { foto(FOTO); return; }
    var saved = load();
    var choice = await UI.title(!!saved);
    if (choice === 'continue' && saved) {
      S = saved; RB.state = S; if (!S.q.q0) S.q.q0 = 'active'; begin();
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
    tp: function (m, x, y, d) { S.map = m; S.x = x; S.y = y; if (d) S.dir = d; player.px = x * T; player.py = y * T; snapCam(); hud(); },
    face: function (d) { S.dir = d; }
  };

  window.addEventListener('pagehide', save);
  boot();
})();
