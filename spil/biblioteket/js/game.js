/* Eventyrbiblioteket — motoren
   Samme motor som Runeborg (felter, kamera, lys, joystick, tryk-for-at-gå),
   men uden opgaver og kapitler: her går barnet rundt, skifter tøj og vælger
   en port. Figuren (navn + udseende) kommer fra den fælles profil
   (/spil/faelles/profil.js) og er den samme i alle spil. */
(function () {
  'use strict';
  var BB = window.BB, K, UI, T = 16, VW = 320, VH = 180, SCALE = 4;
  var SETTINGS = 'biblioteket-indstillinger';
  var FOTO = (location.hash.match(/foto=(\w+)/) || [])[1];   // tools/biblioteket-billeder.py tager skærmbilleder sådan

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

  var S = null, world = null, cache = {}, sheets = {}, profil = null;
  var player = { px: 0, py: 0, moving: false, fromX: 0, fromY: 0, t: 0, alt: false };
  var busy = false, started = false, tick = 0, heldOrder = [], misPop = 0;
  var cam = { x: 0, y: 0 }, particles = [], leaves = [], flies = [], tidSlutFlag = false;

  // Skoletest: når en voksen ser med, sender siden skærmbilledet + denne tekst (assets/elevskema.js)
  window.LFLive = { info: function () { return S && started ? 'Eventyrbiblioteket — ' + (mapNow() ? mapNow().name : '') : ''; } };

  // ---------------------------------------------------------------- profil og indstillinger
  // Profilen er barnets figur. Pladsen husker kun, hvilket spil man kom fra, og hvad man har set.
  function gemProfil(nu) {
    if (FOTO || !profil) return;
    profil.navn = S.name; profil.look = S.look;
    profil.bib.set = S.seen;
    LFProfil.gem(profil, nu === true);
    LFPraes.tjek('bib', S);          // fx at man har set Trofærummet
    hud();
  }
  BB.saveSettings = function () {
    try { localStorage.setItem(SETTINGS, JSON.stringify({ music: BB.audio.musicOn, sfx: BB.audio.sfxOn, voice: BB.voice.on, big: document.body.classList.contains('big') })); } catch (e) { }
  };
  function loadSettings() {
    try {
      var s = JSON.parse(localStorage.getItem(SETTINGS)); if (!s) return;
      BB.audio.setMusic(s.music !== false); BB.audio.setSfx(s.sfx !== false); BB.voice.on = s.voice !== false; document.body.classList.toggle('big', !!s.big);
    } catch (e) { }
  }

  // ---------------------------------------------------------------- verden
  function prerender(map) {
    var fr = [0, 1].map(function (f) {
      var c = BB.canvas(map.w * T, map.h * T), x = c.getContext('2d');
      for (var ty = 0; ty < map.h; ty++) for (var tx = 0; tx < map.w; tx++) BB.drawTile(x, map, tx, ty, f);
      return c;
    });
    cache[map.id] = fr;
  }
  function mapNow() { return world[S.map]; }
  function frames() { var m = mapNow(); if (!cache[m.id]) prerender(m); return cache[m.id]; }

  function sheetFor(id) {
    if (sheets[id]) return sheets[id];
    sheets[id] = K.npcs[id].cat ? BB.makeCat() : BB.makeSheet(K.npcs[id].look);
    return sheets[id];
  }
  function who(id) {
    if (!id) return null;
    if (id === 'player') return { id: 'player', name: S.name, sheet: sheets.player };
    var n = K.npcs[id]; return { id: id, name: n.name, sheet: sheetFor(id) };
  }

  function entities() {
    var list = [], m = S.map;
    Object.keys(K.npcs).forEach(function (id) {
      var p = K.npcs[id].pos(S); if (!p || p.map !== m) return;
      list.push({ id: id, kind: 'npc', x: p.x, y: p.y, dir: npcDir[id] || p.dir });
    });
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

  // ---------------------------------------------------------------- g: hjælpere til samtalerne
  var g = {
    get S() { return S; },
    say: function (id, text, speakText) { return UI.say(who(id), text, speakText); },
    ask: function (id, text, choices) { return UI.ask(who(id), text, choices); },
    seen: function (k) { if (S.seen[k]) return true; S.seen[k] = true; gemProfil(); return false; },
    toast: function (h) { UI.toast(h); },
    port: port,
    spejl: spejl,
    praestationer: async function (spil) { await UI.praestationer(spil, profil); }
  };

  // En port: vis, hvor langt barnet er i spillet, og gå ind, hvis det vil
  async function port(id) {
    var sp = K.SPIL[id], me = window.LF_SPILLER || {}, gemt = (me.gemt && me.gemt[id]) || null, status;
    if (gemt) status = gemt.faerdig ? 'Gennemført' : (gemt.tekst || 'Du er i gang');
    else status = 'Ikke startet endnu';
    var elevTrin = me.elev && me.elev.klassetrin;
    var passer = elevTrin != null && elevTrin >= sp.klasser[0] && elevTrin <= sp.klasser[1];
    var ja = await UI.port({ navn: sp.navn, tekst: sp.tekst, status: status, passer: passer, tidSlut: tidSlutFlag || (window.LFSpil && LFSpil.tidSlut()) });
    if (!ja) return;
    profil.bib.fra = id; gemProfil(true);
    var f = document.getElementById('fade'); f.classList.add('on');
    BB.audio.sfx('door');
    setTimeout(function () { location.href = sp.url; }, 350);
    await new Promise(function () { });     // siden skifter; ingen flere handlinger imens
  }

  // Spejlet i Klædeskabet (og "Skift udseende" i menuen)
  async function spejl() {
    var r = await UI.udseende({
      titel: 'Klædeskabet', tekst: 'Det er den samme figur, du spiller som i alle spil.', knap: 'Gem', kanLukke: true,
      look: S.look, oplaast: profil.oplaast
    });
    if (!r) return;
    S.look = r.look; sheets.player = LFFigur.makeSheet(S.look);
    S.seen.stil = true;
    gemProfil(true); BB.audio.sfx('pick'); UI.toast('<b>Nyt udseende!</b>');
  }

  async function run(fn) {
    if (busy) return;
    busy = true;
    try { await fn(); } catch (e) { console.error(e); }
    busy = false; lastClose = performance.now(); hud();
  }

  var lastClose = 0;
  function interact() {
    if (busy || UI.isOpen() || player.moving) return;
    if (performance.now() - lastClose < 300) return;   // lige kommet ud af en samtale
    var f = facing(); if (!f) return;
    if (f.ent) {
      var e = f.ent;
      var back = { up: 'down', down: 'up', left: 'right', right: 'left' }[S.dir]; npcDir[e.id] = back;
      return run(function () { return K.talk(g, e.id); });
    }
    if (f.place) return run(function () { return K.talk(g, f.place); });
  }

  // ---------------------------------------------------------------- bevægelse
  function tryMove(dir) {
    S.dir = dir;
    var nx = S.x + DX[dir], ny = S.y + DY[dir];
    if (blocked(nx, ny)) return;
    player.fromX = S.x; player.fromY = S.y; S.x = nx; S.y = ny;
    player.moving = true; player.t = 0; player.alt = !player.alt;
  }
  function arrive() {
    var d = mapNow().doorAt(S.x, S.y);
    if (d) { go(d.to, d.tx, d.ty, d.dir); return; }
  }
  function go(mapId, x, y, dir) {
    busy = true; BB.audio.sfx('door');
    var f = document.getElementById('fade'); f.classList.add('on');
    setTimeout(function () {
      S.map = mapId; S.x = x; S.y = y; S.dir = dir || S.dir;
      if (mapId === 'trofae' && !S.seen.trofae) { S.seen.trofae = true; gemProfil(); }
      player.px = x * T; player.py = y * T; player.moving = false;
      BB.audio.music(mapNow().music);
      snapCam(); hud();
      f.classList.remove('on'); busy = false;
    }, 230);
  }

  function update() {
    tick++; if (misPop > 0) misPop--;
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
    // folk kigger sig lidt omkring, når ingen taler med dem
    if (tick % 120 === 0 && !busy && !UI.isOpen()) {
      var es = entities();
      var e = es[(Math.random() * es.length) | 0];
      if (e && Math.random() < 0.5) npcDir[e.id] = ['down', 'left', 'right', 'down'][(Math.random() * 4) | 0];
    }
    if (tick % 20 === 0) updatePrompt();
  }

  // ---------------------------------------------------------------- kamera og tegning
  function snapCam() {
    var m = mapNow();
    cam.x = player.px + 8 - VW / 2;
    cam.y = player.py + 8 - VH / 2;
  }

  function render() {
    var m = mapNow(), fr = frames();
    var tx = player.px + 8 - VW / 2, ty = player.py + 8 - VH / 2;
    cam.x += (tx - cam.x) * 0.25; cam.y += (ty - cam.y) * 0.25;
    var cx = Math.round(cam.x), cy = Math.round(cam.y);
    ctx.fillStyle = '#140f1c'; ctx.fillRect(0, 0, VW, VH);
    ctx.drawImage(fr[Math.floor(tick / 32) % 2], -cx, -cy);

    smoke(m, cx, cy);

    // figurer, sorteret efter dybde
    var draw = [];
    entities().forEach(function (e) {
      if (K.npcs[e.id].cat) {
        // Mis dukker op med et lille glimt, første gang man kommer ind efter at have fundet hende
        draw.push({ y: e.y * T, fn: function () {
          var x = Math.round(e.x * T - cx), y = Math.round(e.y * T - cy);
          BB.drawShadow(ctx, x, y); ctx.drawImage(sheetFor(e.id), x, y + 1);
          if (misPop > 0) { BB.drawSparkle(ctx, x, y - 4, tick, '#ffe070'); BB.drawSparkle(ctx, x + 6, y + 2, tick + 20, '#9ad0ff'); }
        } });
        return;
      }
      draw.push({ y: e.y * T, fn: function () { drawChar(sheetFor(e.id), e.x * T - cx, e.y * T - cy, e.dir || 'down', 0); } });
    });
    if (started) draw.push({ y: player.py, fn: function () { drawChar(sheets.player, player.px - cx, player.py - cy, S.dir, player.moving ? (player.t < 0.5 ? (player.alt ? 1 : 2) : 0) : 0); } });
    draw.sort(function (a, b) { return a.y - b.y; });
    draw.forEach(function (d) { d.fn(); });

    // markører over folk
    var marks = K.markers(S);
    entities().forEach(function (e) { if (marks[e.id]) BB.drawMarker(ctx, e.x * T - cx, e.y * T - cy - 13, marks[e.id], tick); });

    lighting(m, cx, cy);
    if (m.outdoor) weather(cx, cy);
    arrow(cx, cy);
    if (started && tick % 6 === 0) minikort();
  }

  // Pil i kanten af skærmen, der viser vej til det sted, man har trykket på på kortet (M)
  var valgt = null;   // {navn, npc?, map, x, y}
  function valgtPos() {
    if (!valgt) return null;
    var p = null;
    if (valgt.npc) { var np = K.npcs[valgt.npc].pos(S); if (np) p = [np.map, np.x, np.y]; }
    else p = [valgt.map, valgt.x, valgt.y];
    if (!p) { valgt = null; hud(); return null; }
    if (p[0] === S.map && Math.abs(p[1] - S.x) + Math.abs(p[2] - S.y) <= 1) {
      UI.toast('Du er fremme: <b>' + BB.esc(valgt.navn) + '</b>'); valgt = null; hud(); return null;
    }
    return p;
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
    var p = valgtPos(); if (!p) return;
    var tp = p[0] === S.map ? [p[1], p[2]] : doorToward(S.map, p[0]); if (!tp) return;
    var x = tp[0] * T + 8 - cx, y = tp[1] * T + 8 - cy;
    if (x > 8 && x < VW - 8 && y > 8 && y < VH - 8) {
      var hop = Math.floor(tick / 15) % 2, rx = Math.round(x), ry = Math.round(y);
      ctx.fillStyle = '#1a1420'; ctx.beginPath(); ctx.moveTo(rx, ry - 6 + hop); ctx.lineTo(rx - 6, ry - 15 + hop); ctx.lineTo(rx + 6, ry - 15 + hop); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#9ad0ff'; ctx.beginPath(); ctx.moveTo(rx, ry - 8 + hop); ctx.lineTo(rx - 4, ry - 14 + hop); ctx.lineTo(rx + 4, ry - 14 + hop); ctx.closePath(); ctx.fill();
      return;
    }
    var ang = Math.atan2(y - VH / 2, x - VW / 2);
    var ex = VW / 2 + Math.cos(ang) * (VW / 2 - 12), ey = VH / 2 + Math.sin(ang) * (VH / 2 - 12);
    ex = Math.max(10, Math.min(VW - 10, ex)); ey = Math.max(22, Math.min(VH - 10, ey));
    var pulse = 1 + (Math.floor(tick / 15) % 2);
    ctx.save(); ctx.translate(Math.round(ex), Math.round(ey)); ctx.rotate(ang);
    ctx.fillStyle = '#1a1420'; ctx.beginPath(); ctx.moveTo(7 + pulse, 0); ctx.lineTo(-5, -6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#9ad0ff'; ctx.beginPath(); ctx.moveTo(5 + pulse, 0); ctx.lineTo(-3, -4); ctx.lineTo(-3, 4); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawChar(sheet, x, y, dir, frame) {
    x = Math.round(x); y = Math.round(y);
    BB.drawShadow(ctx, x, y);
    ctx.drawImage(sheet, frame * T, BB.DIR_ROW[dir] * T, T, T, x, y - 2, T, T);
  }

  var TINT = {
    morgen: { fill: 'rgba(255,236,190,0.07)', mul: null, lamp: 0, fly: 0 },
    eftermiddag: { fill: 'rgba(255,200,120,0.10)', mul: null, lamp: 0.08, fly: 0 },
    aften: { fill: 'rgba(255,140,70,0.16)', mul: 'rgb(235,190,170)', lamp: 0.42, fly: 6 },
    nat: { fill: null, mul: 'rgb(90,100,170)', lamp: 0.7, fly: 14 },
    fest: { fill: null, mul: 'rgb(130,115,185)', lamp: 0.75, fly: 12 }
  };
  function lighting(m, cx, cy) {
    var tod = K.timeOfDay(S), L = TINT[tod];
    if (!m.outdoor) L = { fill: 'rgba(255,170,90,0.08)', mul: 'rgb(245,225,200)', lamp: 0.55, fly: 0 };
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

  // ---------------------------------------------------------------- HUD
  function hud() {
    if (!S) return;
    document.querySelector('#hud-quest .hud-label').textContent = valgt ? 'Vej til' : 'Her er du';
    document.getElementById('hud-quest-title').textContent = valgt ? valgt.navn : 'Eventyrbiblioteket';
    document.getElementById('hud-quest-goal').textContent = valgt ? 'Tryk M for kortet' : 'Gå hen til en port og tryk E';
    var pa = LFPraes.antal(profil, null);
    document.getElementById('hud-praes-tekst').textContent = pa.faerdig + '/' + pa.ialt;
    var chip = document.getElementById('hud-tid'), t = window.LFSpil ? LFSpil.tilbage() : null;
    if (t === null || t === undefined) { chip.hidden = true; return; }
    chip.hidden = false;
    document.getElementById('hud-tid-tekst').textContent = t <= 0 ? 'Tiden er brugt' : Math.max(1, Math.round(t / 60)) + ' min tilbage';
  }
  function updatePrompt() {
    var el = document.getElementById('prompt');
    if (!started || busy || UI.isOpen() || player.moving) { el.hidden = true; return; }
    var f = facing();
    if (!f) { el.hidden = true; return; }
    var label = 'Undersøg';
    if (f.ent) label = 'Tal med ' + K.npcs[f.ent.id].name.split(',')[0];
    else if (/^port_/.test(f.place)) label = 'Se spillet bag porten';
    else if (f.place === 'spejl') label = 'Skift udseende';
    else if (/^vitrine_/.test(f.place) || f.place === 'sokkel') label = 'Se præstationerne';
    else if (/^skilt_/.test(f.place)) label = 'Læs skiltet';
    el.innerHTML = '<span class="key">E</span> ' + BB.esc(label);
    el.hidden = false;
  }

  // ---------------------------------------------------------------- input
  var KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
  function press(dir) { if (heldOrder.indexOf(dir) < 0) heldOrder.push(dir); }
  function release(dir) { var i = heldOrder.indexOf(dir); if (i >= 0) heldOrder.splice(i, 1); }
  document.addEventListener('keydown', function (e) {
    BB.audio.unlock();
    if (!started) return;
    var tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT') return;
    if (KEYS[e.key]) { if (!UI.isOpen()) { e.preventDefault(); press(KEYS[e.key]); } return; }
    // Et tryk, der lige har lukket en dialog, må ikke også starte en ny samtale
    if (e.defaultPrevented || e.repeat || UI.isOpen() || busy) return;
    if (e.key === 'e' || e.key === 'E' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); interact(); }
    else if (e.key === 'Escape') { e.preventDefault(); openMenu(); }
    else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); BB.toggleFullscreen(); }
    else if (e.key === 'm' || e.key === 'M') { e.preventDefault(); openMap(); }
    else if (e.key === 'l' || e.key === 'L') { BB.audio.setMusic(!BB.audio.musicOn); BB.saveSettings(); UI.toast('Musik ' + (BB.audio.musicOn ? 'til' : 'fra')); }
  });
  document.addEventListener('keyup', function (e) { if (KEYS[e.key]) release(KEYS[e.key]); });
  window.addEventListener('blur', function () { heldOrder = []; });
  document.addEventListener('visibilitychange', function () { heldOrder = []; });
  function openMenu() {
    if (busy || UI.isOpen()) return; heldOrder = [];
    run(async function () {
      var v = await UI.menu();
      if (v === 'udseende') await spejl();
      else if (v === 'guide') await visGuide(true);
    });
  }

  // ---------------------------------------------------------------- kortet (M)
  // Hele biblioteket set ovenfra: portene, Klædeskabet, Trofærummet og de tre, der går rundt.
  function kortData() {
    var R = world.hal, pins = [], steder = [], personer = [];
    if (!cache[R.id]) prerender(R);
    var flade = cache[R.id][0];
    function sted(navn, x, y, maal) {
      pins.push({ navn: navn, x: x * T + 8, y: y * T + 8, art: 'sted', maal: maal });
      steder.push({ navn: navn, maal: maal, valgt: !!valgt && !valgt.npc && valgt.navn === navn });
    }
    Object.keys(K.SPIL).forEach(function (id) {
      var pp = K.placePos['port_' + id];
      if (pp) sted(K.SPIL[id].navn, pp[1], pp[2], { map: pp[0], x: pp[1], y: pp[2] });
    });
    R.doors.forEach(function (d) {
      var inde = world[d.to];
      if (inde) sted(inde.name, d.x, d.y, { map: d.to, x: d.tx, y: d.ty });
    });
    var her = S.map === R.id ? [S.x, S.y] : doorToward(R.id, S.map);
    if (her) pins.push({ navn: 'Her er du', x: her[0] * T + 8, y: her[1] * T + 8, art: 'her' });
    Object.keys(K.npcs).forEach(function (id) {
      var n = K.npcs[id], p = n.pos(S);
      if (!p) return;
      personer.push({ navn: n.name.split(',')[0], sted: p.map === R.id ? 'i hallen' : world[p.map].name, maal: { npc: id, map: p.map, x: p.x, y: p.y }, valgt: !!valgt && valgt.npc === id });
    });
    return { titel: 'Kort: Eventyrbiblioteket', flade: flade, pins: pins, steder: steder, personer: personer, mission: null, valgt: valgt ? valgt.navn : '' };
  }
  // Minikortet oppe i venstre hjørne: hallen set ovenfra omkring spilleren; et tryk åbner det store kort
  var miniEl = document.getElementById('minikort'), miniCtx = miniEl.querySelector('canvas').getContext('2d');
  miniCtx.imageSmoothingEnabled = false;
  function minikort() {
    var R = world.hal; if (!cache[R.id]) prerender(R);
    var img = cache[R.id][0], W = 104, span = 26 * T, c = miniCtx, k = W / span;
    var her = S.map === R.id ? [S.x, S.y] : doorToward(R.id, S.map) || [S.x, S.y];
    var cx0 = her[0] * T + 8 - span / 2, cy0 = her[1] * T + 8 - span / 2;
    c.fillStyle = '#140f1c'; c.fillRect(0, 0, W, W);
    var sx = Math.max(0, cx0), sy = Math.max(0, cy0), ex = Math.min(img.width, cx0 + span), ey = Math.min(img.height, cy0 + span);
    if (ex > sx && ey > sy) c.drawImage(img, sx, sy, ex - sx, ey - sy, (sx - cx0) * k, (sy - cy0) * k, (ex - sx) * k, (ey - sy) * k);
    function prik(tx, ty, col, r) {
      var x = (tx * T + 8 - cx0) * k, y = (ty * T + 8 - cy0) * k;
      x = Math.max(r + 1, Math.min(W - r - 1, x)); y = Math.max(r + 1, Math.min(W - r - 1, y));
      c.fillStyle = '#1a1420'; c.fillRect(Math.round(x - r - 1), Math.round(y - r - 1), 2 * r + 2, 2 * r + 2);
      c.fillStyle = col; c.fillRect(Math.round(x - r), Math.round(y - r), 2 * r, 2 * r);
    }
    var p = valgtPos();
    if (p) { var xy = p[0] === R.id ? [p[1], p[2]] : doorToward(R.id, p[0]); if (xy) prik(xy[0], xy[1], '#9ad0ff', 3); }
    prik(her[0], her[1], '#ffffff', 3);
  }
  miniEl.addEventListener('click', function () { openMap(); });
  async function visKort() {
    var v = await UI.kort(kortData());
    if (!v || !v.maal) return;
    valgt = { navn: v.navn, npc: v.maal.npc, map: v.maal.map, x: v.maal.x, y: v.maal.y };
    UI.toast('Pilen viser vej til <b>' + BB.esc(v.navn) + '</b>.');
  }
  function openMap() { if (busy || UI.isOpen()) return; heldOrder = []; run(visKort); }

  // Den hurtige guide: første gang i biblioteket, og igen fra menuen
  async function visGuide(igen) {
    if (!igen && S.seen.guide) return;
    await UI.guide({ bog: false });
    S.seen.guide = true; gemProfil();
  }
  // Fuld skærm. Knappen skjules, hvor browseren ikke kan (fx iPhone-Safari).
  var root = document.documentElement;
  var canFull = !!(root.requestFullscreen || root.webkitRequestFullscreen);
  function isFull() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  BB.toggleFullscreen = function () {
    if (!canFull) return;
    if (isFull()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    var p = (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
    if (p && p.catch) p.catch(function () { });
  };
  BB.isFullscreen = isFull; BB.canFullscreen = canFull;
  var fullBtn = document.getElementById('btn-full');
  if (!canFull) fullBtn.hidden = true;
  fullBtn.addEventListener('click', function () { BB.toggleFullscreen(); fullBtn.blur(); });
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) {
    document.addEventListener(ev, function () { fullBtn.title = isFull() ? 'Forlad fuld skærm (F)' : 'Fuld skærm (F)'; setTimeout(resize, 50); });
  });
  document.getElementById('btn-menu').addEventListener('click', openMenu);
  document.getElementById('btn-map').addEventListener('click', openMap);

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
  BB.wakeTouch = wake;
  window.addEventListener('touchstart', wake, { capture: true, passive: true });
  window.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch') wake(); }, true);

  var zone = document.getElementById('stick-zone'), base = document.getElementById('stick-base'), knob = document.getElementById('stick-knob');
  function moveStick(dx, dy) {
    var dist = Math.sqrt(dx * dx + dy * dy), max = Math.round(base.offsetWidth * 0.34);
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
    e.preventDefault(); BB.audio.unlock(); wake();
    stickNed = { x: e.clientX, y: e.clientY, t: performance.now() };
    stickId = e.pointerId; try { zone.setPointerCapture(e.pointerId); } catch (x) { }
    zone.classList.add('active');
    // joysticket flytter sig derhen, hvor tommelfingeren lander
    var zr = zone.getBoundingClientRect();
    base.style.left = Math.max(4, e.clientX - zr.left - base.offsetWidth / 2) + 'px';
    base.style.bottom = Math.max(4, zr.bottom - e.clientY - base.offsetWidth / 2) + 'px';
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
  document.getElementById('t-act').addEventListener('pointerdown', function (e) { e.preventDefault(); BB.audio.unlock(); if (!UI.advance()) interact(); });
  document.getElementById('t-map').addEventListener('pointerdown', function (e) { e.preventDefault(); openMap(); });

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

  // Prøvetiden (LFSpil i /assets/spilletid.js) er fælles for alle spil. Her tæller den ikke,
  // men når den er brugt, er portene lukket.
  BB.tidSnart = function (sek) {
    if (UI) UI.toast('<b>Snart er din spilletid brugt.</b><br>Der er ' + Math.max(1, Math.round(sek / 60)) + ' minutter tilbage.');
  };
  BB.tidSlut = function () {
    tidSlutFlag = true;
    if (UI) { UI.toast('<b>Din spilletid er brugt.</b><br>Du kan stadig gå rundt og skifte tøj.'); hud(); }
  };

  // ---------------------------------------------------------------- start
  function begin(start, mapId) {
    started = true;
    var m = world.hal, sp = start || m.spots.start;
    S.map = mapId || 'hal'; S.x = sp[0]; S.y = sp[1]; S.dir = start ? 'down' : 'up';
    player.px = S.x * T; player.py = S.y * T;
    sheets.player = LFFigur.makeSheet(S.look);
    snapCam();
    document.getElementById('hud').hidden = false; hud();
    if (document.body.classList.contains('touching')) wake();
    BB.audio.music(mapNow().music);
    if (S.seen.mis && !S.seen.misPop && !FOTO) {
      misPop = 240; S.seen.misPop = true; gemProfil();
      UI.toast('<b>Mis er flyttet ind i biblioteket!</b><br>Hun sidder ved Brynjas skranke.');
    }
    if (!FOTO) LFPraes.tjek('bib', S);
  }

  // Svaret fra serveren (hvem er logget ind) kommer lidt efter siden: vent højst et par sekunder
  function venPaaBruger() {
    return new Promise(function (resolve) {
      var n = 0;
      (function tjek() { if (window.LF_SPILLER || FOTO || ++n > 40) resolve(); else setTimeout(tjek, 100); })();
    });
  }

  async function boot() {
    K = BB.content; UI = BB.ui; UI.init(); resize();
    loadSettings();
    world = BB.buildWorld();
    // bag indlæsningen: pladsen om morgenen
    S = { name: '', look: LFFigur.STD_LOOK, map: 'hal', x: 19, y: 21, dir: 'up', seen: {} }; BB.state = S;
    player.px = S.x * T; player.py = S.y * T; snapCam();
    requestAnimationFrame(loop);
    if (document.fonts && document.fonts.ready) { try { await Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 1500); })]); } catch (e) { } }
    if (FOTO) { foto(FOTO); return; }
    await venPaaBruger();
    LFProfil.paaPraes(function (pr) { BB.audio.sfx('quest'); UI.toast('<b>Ny præstation: ' + BB.esc(pr.navn) + '</b><br>' + BB.esc(pr.tekst)); hud(); });
    LFProfil.paaNyt(function (gen) { UI.toast('<b>Nyt tøj: ' + BB.esc(gen.navn) + '</b><br>Find det i Klædeskabet.'); });
    profil = await LFProfil.hent();
    var foerste = !profil;
    var me = window.LF_SPILLER || {}, kald = me.elev ? me.elev.kaldenavn : '';
    if (foerste) {
      // Første gang: lav din figur. Har man spillet Regnehelten før, bruges den figur som start.
      var gammel = await gammelRegnehelten();
      var r = await UI.udseende({
        titel: 'Hvem er du?', tekst: 'Lav din figur. Du spiller som den i alle spil og kan altid skifte tøj i Klædeskabet.', knap: 'Det er mig!',
        visNavn: true, navn: (gammel && gammel.navn) || kald, look: (gammel && gammel.look) || LFFigur.tilfaeldig(), oplaast: []
      });
      profil = LFProfil.ny(r.navn, r.look);
      S.name = profil.navn; S.look = profil.look;
      LFProfil.gem(profil, true);
    } else {
      S.name = profil.navn || kald || 'dig'; S.look = profil.look;
    }
    S.seen = profil.bib.set || {};
    if (window.LFSpil && LFSpil.tidSlut()) tidSlutFlag = true;
    var fra = profil.bib.fra, sp = fra && world.hal.spots[fra] ? world.hal.spots[fra] : null;
    begin(sp);
    if (foerste) await run(async function () { await visGuide(); await K.talk(g, 'brynja'); });
    else if (!S.seen.guide) await run(visGuide);
    else UI.toast('Velkommen tilbage, <b>' + BB.esc(S.name) + '</b>!');
  }

  // Et barn, der allerede har spillet Regnehelten, har navn og figur dér
  function gammelRegnehelten() {
    return fetch('/api/gem.php?handling=hent&spil=regnehelten', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var s = d && d.ok && d.data ? JSON.parse(d.data) : null;
        if (!s || !s.look) return null;
        return { navn: String(s.name || '').slice(0, 16), look: LFFigur.ren(s.look) };
      }).catch(function () { return null; });
  }

  // Fototilstand: stiller pladsen op til hjemmesidens skærmbilleder
  // Scener: hal (standard), trofae (med vitrinevinduet åbent)
  function foto(scene) {
    var trofae = scene === 'trofae';
    S = { name: 'Freja', look: { skin: '#f5cdaa', hair: '#d6a854', style: 'lang', cloth: '#e884a8', pants: '#4e5670', extra: 'taske', hatColor: '#c8282e', hat: '' }, map: trofae ? 'trofae' : 'hal', x: trofae ? 9 : 12, y: trofae ? 4 : 6, dir: 'up', seen: { hej: true } };
    BB.state = S;
    profil = { oplaast: [], praes: { rb_start: 261010, rb_runer1: 261010, rb_kap1: 261011, rb_vedhold: 261011, rh_start: 261012, rh_kap1: 261012, bib_velkommen: 261012 }, bib: {} };
    begin([S.x, S.y], S.map);
    if (trofae) run(function () { return g.praestationer('runeborg'); });
  }

  // Til test fra konsollen: BB.debug.S, BB.debug.tp('hal', 7, 4, 'up'), BB.debug.interact()
  BB.debug = {
    get S() { return S; }, g: g, interact: interact, entities: function () { return entities(); }, world: function () { return world; },
    tp: function (m, x, y, d) { S.map = m; S.x = x; S.y = y; if (d) S.dir = d; player.px = x * T; player.py = y * T; snapCam(); hud(); },
    face: function (d) { S.dir = d; }
  };

  window.addEventListener('pagehide', function () { gemProfil(true); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') gemProfil(true); });
  boot();
})();
