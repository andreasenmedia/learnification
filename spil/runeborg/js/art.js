/* Runeborg — grafik
   Alt er tegnet i kode: ingen billedfiler. Figurerne er 16x16 skabeloner,
   hvor hvert bogstav er en rolle (hår, hud, tøj ...), som farves pr. figur.
   Fliserne tegnes med små pixel-rutiner og en fast "tilfældighed" pr. felt,
   så græsset ser levende ud, men er det samme hver gang. */
(function () {
  'use strict';
  var RB = window.RB = window.RB || {};
  var T = 16;

  var C = {
    k: '#1a1420', k2: '#2a2238',
    g0: '#24583a', g1: '#357a42', g2: '#4f9e4c', g3: '#86c864',
    d0: '#6b4a2f', d1: '#8f6a43', d2: '#b08a5a', d3: '#cfae7a',
    s0: '#3e3c4c', s1: '#62606e', s2: '#8e8c9a', s3: '#c2c0cc',
    w0: '#1b3a7a', w1: '#2a66b8', w2: '#5fa4e4', w3: '#c4e6ff',
    z0: '#2a5a2a', z1: '#4a8a2c', z2: '#8cc43c', z3: '#d4f07a',
    wd0: '#3e2618', wd1: '#633c22', wd2: '#8e5a32', wd3: '#b8804a',
    r0: '#5e1a26', r1: '#a02e38', r2: '#d8584a',
    b0: '#1a2860', b1: '#2c4a9c', b2: '#5a7ed4',
    p0: '#361a50', p1: '#643684', p2: '#9868c0',
    n0: '#1a4a2a', n1: '#2c7a3c', n2: '#58a858',
    y0: '#9a6a18', y1: '#e0a82c', y2: '#ffe070',
    pl: '#e8d8b4', pl2: '#c8b48c',
    wh: '#f4ecdc', rug: '#8a2a3a', rug2: '#c8a040',
    cv0: '#141018', cv1: '#2a2230', cv2: '#3e3446'
  };
  RB.C = C;

  // ---------------------------------------------------------------- helpers
  function canvas(w, h) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d'); x.imageSmoothingEnabled = false; return c;
  }
  RB.canvas = canvas;
  function hash(x, y, s) {
    var h = (x * 374761393 + y * 668265263 + (s || 0) * 1442695041) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  RB.hash = hash;
  function R(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }
  function P(c, x, y, col) { c.fillStyle = col; c.fillRect(x, y, 1, 1); }

  // ---------------------------------------------------------------- figurer
  function r8(inner) { return '...k' + inner + 'k...'; }
  function r6(inner) { return '....k' + inner + 'k....'; }

  var HEAD_DOWN = ['................', '.....kkkkkk.....', r6('hhhhhh'), r8('hhhhhhhh'), r8('hhsssshh'), r8('hsessesh'), r8('ssssssss'), r6('ssssss')];
  var HEAD_UP = ['................', '.....kkkkkk.....', r6('hhhhhh'), r8('hhhhhhhh'), r8('hhhhhhhh'), r8('hhhhhhhh'), r8('hhhhhhhh'), r6('hhhhhh')];
  var HEAD_SIDE = ['................', '.....kkkkkk.....', r6('hhhhhh'), r8('hhhhhhhh'), r8('hhhhssss'), r8('hhhhsess'), r8('hhhsssss'), r6('hsssss')];
  var BODY_DOWN = [r8('cccddccc'), '..kccccddcccck..', '..kccccddcccck..', '..ksllllllllsk..', r8('pppppppp')];
  var BODY_UP = [r8('cccccccc'), '..kcccccccccck..', '..kcccccccccck..', '..ksllllllllsk..', r8('pppppppp')];
  var BODY_SIDE = [r6('cccccc'), r6('ccdccc'), r6('ccdccc'), r6('llslll'), r6('pppppp')];
  var LEGS_FRONT = [
    ['....kpppkpppk...', '....kbbbkbbbk...', '....kkkkkkkkk...'],
    ['....kpppkpppk...', '....kbbbkpppk...', '....kkkkkbbbk...'],
    ['....kpppkpppk...', '....kpppkbbbk...', '....kbbbkkkkk...']
  ];
  var LEGS_SIDE = [
    ['....kppkppk.....', '....kbbkbbk.....', '....kkkkkkk.....'],
    ['...kppk.kppk....', '...kbbk.kbbk....', '...kkkk.kkkk....'],
    ['....kppkppk.....', '...kbbk..kbbk...', '...kkkk..kkkk...']
  ];

  var OVER = {
    wizard: { 0: '.......kk.......', 1: '....._ktak_.....', 2: '...._kttttk_....', 3: '..kkttttttttkk..' },
    helmet: { 1: '.....kkkkkk.....', 2: '....ktaatttk....', 3: r8('tttttttt') },
    beret: { 1: '....kkkkkkkka...', 2: '...kttttttttak..', 3: '..kttttttttttk..' },
    tophat: { 0: '....kkkkkkkk....', 1: '....kttttttk....', 2: '....kaaaaaak....', 3: '..kkkkkkkkkkkk..' },
    horns: { 0: '...kk......kk...', 1: '...ka......ak...' },
    beard: { 6: '...kyssssssyk...', 7: r6('yyyyyy'), 8: '....kyyyyyyk....', 9: '.....kyyyyk.....' },
    ears: { 5: '..s..........s..' },
    tusks: { 7: '......w..w......' },
    feather: { 0: '..........aa....', 1: '....kkkkkkkaa...', 2: '...kttttttttk...', 3: '..kttttttttttk..' },
    hood: { 0: '......kkkk......', 1: '....kkttttkk....' }
  };

  function buildFrame(dir, step) {
    var head, body, legs;
    if (dir === 'down') { head = HEAD_DOWN; body = BODY_DOWN; legs = LEGS_FRONT[step]; }
    else if (dir === 'up') { head = HEAD_UP; body = BODY_UP; legs = LEGS_FRONT[step]; }
    else { head = HEAD_SIDE; body = BODY_SIDE; legs = LEGS_SIDE[step]; }
    return head.concat(body, legs);
  }

  function lookColors(L) {
    return {
      k: C.k, h: L.hair || '#5a3a22', s: L.skin || '#f0c090', e: L.eye || C.k,
      c: L.cloth || '#3a5aa8', d: L.dark || shade(L.cloth || '#3a5aa8'),
      l: L.belt || C.wd1, p: L.pants || '#3a3048', b: L.boots || C.wd0,
      t: L.hatColor || '#6a3a8e', a: L.accent || C.y2, y: L.beardColor || L.hair || '#8a6a4a',
      w: C.wh
    };
  }
  function shade(hex) {
    var n = parseInt(hex.slice(1), 16), r = (n >> 16) * 0.66 | 0, g = ((n >> 8) & 255) * 0.66 | 0, b = (n & 255) * 0.66 | 0;
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // Et ark med 4 retninger x 3 skridt. Venstre er et spejlet højre.
  RB.makeSheet = function (L) {
    var col = lookColors(L);
    var sheet = canvas(T * 3, T * 4);
    var c = sheet.getContext('2d');
    var dirs = ['down', 'up', 'right'];
    dirs.forEach(function (dir, di) {
      for (var step = 0; step < 3; step++) {
        var rows = buildFrame(dir, step).slice();
        var overs = [];
        if (L.hat === 'hood') col.h = col.t;
        if (L.hat && OVER[L.hat] && !(L.hat === 'hood')) overs.push(OVER[L.hat]);
        if (L.hat === 'hood') overs.push(OVER.hood);
        if (L.horns) overs.push(OVER.horns);
        if (L.beard && dir !== 'up') overs.push(OVER.beard);
        if (L.ears && dir === 'down') overs.push(OVER.ears);
        if (L.tusks && dir === 'down') overs.push(OVER.tusks);
        drawRows(c, rows, overs, col, step * T, di * T, false);
        if (dir === 'right') drawRows(c, rows, overs, col, step * T, 3 * T, true);
      }
    });
    return sheet;
  };
  function drawRows(c, rows, overs, col, ox, oy, flip) {
    for (var y = 0; y < 16; y++) {
      var row = rows[y].split('');
      overs.forEach(function (o) {
        if (!o[y]) return;
        for (var x = 0; x < 16; x++) {
          var ch = o[y][x];
          if (ch === '.') continue;
          row[x] = ch === '_' ? '.' : ch;
        }
      });
      for (var x2 = 0; x2 < 16; x2++) {
        var ch2 = row[x2];
        if (ch2 === '.' || !col[ch2]) continue;
        P(c, ox + (flip ? 15 - x2 : x2), oy + y, col[ch2]);
      }
    }
  }
  RB.DIR_ROW = { down: 0, up: 1, right: 2, left: 3 };

  // Små skabeloner til dyr og ting
  var CAT = [
    '................', '................', '................', '................',
    '....kk...kk.....', '....kok.kok.....', '....kooooook....', '....koeooeok....',
    '....koowwook....', '.....kooook.....', '....kooooook....', '...kooooooook.k.',
    '...kooooooook.k.', '...kooooooookk..', '....kkkkkkkk....', '................'
  ];
  RB.makeCat = function () {
    var cv = canvas(16, 16), c = cv.getContext('2d');
    var col = { k: C.k, o: '#e8943a', e: '#5fd068', w: C.wh };
    CAT.forEach(function (row, y) { for (var x = 0; x < 16; x++) if (col[row[x]]) P(c, x, y, col[row[x]]); });
    return cv;
  };

  // ---------------------------------------------------------------- fliser
  // En flise kan se på sine naboer (fx vand, der møder land, og tagskæg).
  var SOLID = '#TtrRBPGWSODsNbcwlmfgxaXLCQqUVYnvIpMJ/%j';
  RB.SOLID = SOLID;

  function grass(c, x, y, tx, ty) {
    R(c, x, y, T, T, C.g1);
    for (var i = 0; i < 6; i++) {
      var px = hash(tx, ty, i) * 16 | 0, py = hash(tx, ty, i + 20) * 16 | 0;
      P(c, x + px, y + py, i < 3 ? C.g2 : C.g0);
    }
    if (hash(tx, ty, 99) < 0.45) {
      var ux = 2 + (hash(tx, ty, 7) * 11 | 0), uy = 4 + (hash(tx, ty, 8) * 10 | 0);
      P(c, x + ux, y + uy, C.g3); P(c, x + ux + 2, y + uy, C.g3); P(c, x + ux + 1, y + uy + 1, C.g2);
    }
  }
  function dirt(c, x, y, tx, ty) {
    R(c, x, y, T, T, C.d1);
    for (var i = 0; i < 7; i++) P(c, x + (hash(tx, ty, i) * 16 | 0), y + (hash(tx, ty, i + 9) * 16 | 0), i % 2 ? C.d0 : C.d2);
  }
  function cobble(c, x, y, tx, ty) {
    R(c, x, y, T, T, C.s0);
    for (var row = 0; row < 2; row++) {
      var off = (ty + row) % 2 ? 4 : 0;
      for (var s = -1; s < 2; s++) {
        var sx = x + s * 8 + off, sy = y + row * 8;
        var x0 = Math.max(sx + 1, x), x1 = Math.min(sx + 7, x + 16);
        if (x1 <= x0) continue;
        var tone = hash(tx * 3 + s, ty * 2 + row, 5) < 0.3 ? C.s2 : C.s1;
        R(c, x0, sy + 1, x1 - x0, 6, tone);
        R(c, x0, sy + 1, x1 - x0, 1, C.s3);
      }
    }
  }
  function woodFloor(c, x, y, tx, ty) {
    R(c, x, y, T, T, C.wd2);
    for (var i = 0; i < 4; i++) R(c, x, y + i * 4 + 3, T, 1, C.wd1);
    var j = (hash(tx, ty, 3) * 12 | 0) + 2; R(c, x + j, y, 1, 3, C.wd1); R(c, x + ((j + 7) % 14) + 1, y + 8, 1, 3, C.wd1);
    P(c, x + 3, y + 1, C.wd3); P(c, x + 11, y + 9, C.wd3);
  }
  function stoneFloor(c, x, y, tx, ty) {
    R(c, x, y, T, T, C.s1);
    R(c, x, y + 7, T, 1, C.s0); R(c, x + ((ty % 2) ? 4 : 11), y, 1, 7, C.s0); R(c, x + ((ty % 2) ? 11 : 4), y + 8, 1, 8, C.s0);
    P(c, x + (hash(tx, ty) * 14 | 0) + 1, y + 3, C.s2);
  }
  function caveFloor(c, x, y, tx, ty) {
    R(c, x, y, T, T, C.cv1);
    for (var i = 0; i < 5; i++) P(c, x + (hash(tx, ty, i) * 16 | 0), y + (hash(tx, ty, i + 5) * 16 | 0), i % 2 ? C.cv2 : C.cv0);
  }
  function water(c, x, y, tx, ty, f, green, map) {
    var a = green ? [C.z0, C.z1, C.z2, C.z3] : [C.w0, C.w1, C.w2, C.w3];
    R(c, x, y, T, T, a[1]);
    for (var i = 0; i < 3; i++) {
      var wx = ((hash(tx, ty, i) * 16 | 0) + f * 2) % 16, wy = (hash(tx, ty, i + 3) * 14 | 0) + 1;
      R(c, x + wx, y + wy, Math.min(4, 16 - wx), 1, a[2]);
    }
    if (map && !isWater(map.at(tx, ty - 1))) { R(c, x, y, T, 2, a[3]); R(c, x, y + 2, T, 1, a[2]); }
    if (map && !isWater(map.at(tx, ty + 1))) R(c, x, y + 14, T, 2, a[0]);
    if (map && !isWater(map.at(tx - 1, ty))) R(c, x, y, 1, T, a[3]);
    if (map && !isWater(map.at(tx + 1, ty))) R(c, x + 15, y, 1, T, a[0]);
  }
  function isWater(ch) { return ch === '~' || ch === 'z' || ch === 'H'; }

  function tree(c, x, y, tx, ty) {
    grass(c, x, y, tx, ty);
    var o = '#12301e';
    R(c, x + 3, y + 1, 10, 11, o); R(c, x + 1, y + 3, 14, 7, o); R(c, x + 2, y + 2, 12, 9, o);
    R(c, x + 3, y + 2, 10, 9, C.g0); R(c, x + 2, y + 4, 12, 5, C.g0);
    R(c, x + 4, y + 3, 6, 4, C.g1); R(c, x + 5, y + 3, 3, 2, C.g2); P(c, x + 5, y + 3, C.g3);
    P(c, x + 10, y + 6, C.g1); P(c, x + 7, y + 8, C.g1);
    R(c, x + 7, y + 11, 2, 4, C.wd1); R(c, x + 6, y + 14, 4, 1, C.wd0);
  }
  function bush(c, x, y, tx, ty) {
    grass(c, x, y, tx, ty);
    R(c, x + 2, y + 6, 12, 8, '#12301e'); R(c, x + 3, y + 7, 10, 6, C.g0); R(c, x + 4, y + 7, 5, 3, C.g2); P(c, x + 5, y + 8, C.g3);
    if (hash(tx, ty, 4) < 0.5) { P(c, x + 10, y + 9, C.r2); P(c, x + 7, y + 11, C.r2); }
  }
  function flowers(c, x, y, tx, ty) {
    grass(c, x, y, tx, ty);
    var cols = [C.wh, C.r2, C.y2, C.p2];
    for (var i = 0; i < 3; i++) {
      var fx = x + 2 + (hash(tx, ty, i + 40) * 11 | 0), fy = y + 2 + (hash(tx, ty, i + 50) * 11 | 0), fc = cols[(hash(tx, ty, i + 60) * 4) | 0];
      P(c, fx, fy - 1, fc); P(c, fx - 1, fy, fc); P(c, fx + 1, fy, fc); P(c, fx, fy + 1, fc); P(c, fx, fy, C.y1);
    }
  }
  function rock(c, x, y, tx, ty) {
    grass(c, x, y, tx, ty);
    R(c, x + 3, y + 6, 10, 8, C.k); R(c, x + 4, y + 7, 8, 6, C.s1); R(c, x + 5, y + 7, 4, 2, C.s2); R(c, x + 4, y + 11, 8, 2, C.s0);
  }
  function wallStone(c, x, y, tx, ty, light) {
    R(c, x, y, T, T, light ? C.s1 : C.s0);
    for (var row = 0; row < 4; row++) {
      var off = (row + ty) % 2 ? 0 : 4;
      for (var s = -1; s < 2; s++) {
        var bx = x + s * 8 + off + 1, x0 = Math.max(bx, x), x1 = Math.min(bx + 7, x + 16);
        if (x1 > x0) { R(c, x0, y + row * 4 + 1, x1 - x0, 3, light ? C.s2 : C.s1); R(c, x0, y + row * 4 + 1, x1 - x0, 1, light ? C.s3 : C.s2); }
      }
    }
  }
  function roof(c, x, y, tx, ty, pal, map, ch) {
    R(c, x, y, T, T, pal[1]);
    for (var i = 0; i < 4; i++) {
      R(c, x, y + i * 4 + 3, T, 1, pal[0]);
      var off = (i + ty) % 2 ? 2 : 6;
      R(c, x + off, y + i * 4, 1, 3, pal[0]); R(c, x + off + 8, y + i * 4, 1, 3, pal[0]);
      R(c, x + off + 1, y + i * 4, 3, 1, pal[2]);
    }
    if (map && map.at(tx, ty - 1) !== ch) { R(c, x, y, T, 2, pal[2]); R(c, x, y, T, 1, C.k); }
    if (map && map.at(tx, ty + 1) !== ch) { R(c, x, y + 13, T, 3, pal[0]); R(c, x, y + 15, T, 1, C.k); }
    if (map && map.at(tx - 1, ty) !== ch) R(c, x, y, 1, T, C.k);
    if (map && map.at(tx + 1, ty) !== ch) R(c, x + 15, y, 1, T, C.k);
  }
  function plaster(c, x, y, tx, ty, map) {
    R(c, x, y, T, T, C.pl);
    for (var i = 0; i < 4; i++) P(c, x + (hash(tx, ty, i) * 14 | 0) + 1, y + (hash(tx, ty, i + 4) * 12 | 0) + 2, C.pl2);
    R(c, x, y, T, 2, C.wd1); R(c, x, y + 14, T, 2, C.wd1);
    if (tx % 3 === 0) R(c, x, y, 2, T, C.wd1);
    wallEdges(c, x, y, tx, ty, map);
  }
  function wallEdges(c, x, y, tx, ty, map) {
    if (!map) return;
    var wall = 'WSODsw'.indexOf(map.at(tx - 1, ty)) < 0 && 'WSOD'.indexOf(map.at(tx - 1, ty)) < 0;
    if ('WSOD'.indexOf(map.at(tx - 1, ty)) < 0) R(c, x, y, 1, T, C.k);
    if ('WSOD'.indexOf(map.at(tx + 1, ty)) < 0) R(c, x + 15, y, 1, T, C.k);
    return wall;
  }
  function stoneWallB(c, x, y, tx, ty, map) { wallStone(c, x, y, tx, ty, true); wallEdges(c, x, y, tx, ty, map); }
  function wallFor(map, tx, ty) {
    var l = map ? map.at(tx - 1, ty) : 'W', r = map ? map.at(tx + 1, ty) : 'W';
    if (l === 'S' || r === 'S') return 'S';
    return 'W';
  }
  function door(c, x, y, tx, ty, map) {
    if (wallFor(map, tx, ty) === 'S') stoneWallB(c, x, y, tx, ty, map); else plaster(c, x, y, tx, ty, map);
    R(c, x + 3, y + 1, 10, 15, C.wd0); R(c, x + 4, y + 2, 8, 14, C.wd1);
    R(c, x + 7, y + 2, 1, 14, C.wd0); R(c, x + 4, y + 2, 8, 1, C.wd2);
    P(c, x + 10, y + 9, C.y2);
  }
  function windowT(c, x, y, tx, ty, map) {
    if (wallFor(map, tx, ty) === 'S') stoneWallB(c, x, y, tx, ty, map); else plaster(c, x, y, tx, ty, map);
    R(c, x + 3, y + 3, 10, 9, C.wd0); R(c, x + 4, y + 4, 8, 7, C.w2);
    R(c, x + 4, y + 4, 3, 2, C.w3); R(c, x + 7, y + 4, 1, 7, C.wd0); R(c, x + 4, y + 7, 8, 1, C.wd0);
    R(c, x + 2, y + 12, 12, 2, C.wd2);
  }
  function sign(c, x, y, tx, ty, base) {
    base(c, x, y, tx, ty);
    R(c, x + 7, y + 9, 2, 7, C.wd0);
    R(c, x + 1, y + 2, 14, 8, C.k); R(c, x + 2, y + 3, 12, 6, C.wd3);
    R(c, x + 4, y + 5, 7, 1, C.wd1); R(c, x + 4, y + 7, 5, 1, C.wd1);
  }
  function board(c, x, y, tx, ty, base) {
    base(c, x, y, tx, ty);
    R(c, x + 2, y + 10, 2, 6, C.wd0); R(c, x + 12, y + 10, 2, 6, C.wd0);
    R(c, x, y + 1, 16, 11, C.k); R(c, x + 1, y + 2, 14, 9, C.wd2);
    R(c, x + 2, y + 3, 4, 5, C.wh); R(c, x + 7, y + 3, 3, 4, '#f0d890'); R(c, x + 11, y + 4, 3, 5, C.wh);
    P(c, x + 3, y + 3, C.r1); P(c, x + 8, y + 3, C.r1); P(c, x + 12, y + 4, C.r1);
  }
  function barrel(c, x, y, tx, ty, base) {
    base(c, x, y, tx, ty);
    R(c, x + 3, y + 3, 10, 12, C.k); R(c, x + 4, y + 4, 8, 10, C.wd2);
    R(c, x + 4, y + 6, 8, 1, C.s1); R(c, x + 4, y + 11, 8, 1, C.s1); R(c, x + 5, y + 4, 2, 10, C.wd3);
  }
  function crate(c, x, y, tx, ty, base) {
    base(c, x, y, tx, ty);
    R(c, x + 2, y + 4, 12, 11, C.k); R(c, x + 3, y + 5, 10, 9, C.wd2);
    R(c, x + 3, y + 5, 10, 1, C.wd3); R(c, x + 3, y + 9, 10, 1, C.wd1); R(c, x + 7, y + 5, 2, 9, C.wd1);
  }
  function well(c, x, y, tx, ty, green) {
    cobble(c, x, y, tx, ty);
    R(c, x + 2, y + 1, 12, 4, C.k); R(c, x + 3, y + 1, 10, 3, C.r1); R(c, x + 3, y + 1, 10, 1, C.r2);
    R(c, x + 3, y + 4, 2, 6, C.wd0); R(c, x + 11, y + 4, 2, 6, C.wd0);
    R(c, x + 1, y + 9, 14, 7, C.k); R(c, x + 2, y + 10, 12, 5, C.s2);
    R(c, x + 4, y + 10, 8, 3, green ? C.z2 : C.w1); R(c, x + 2, y + 10, 12, 1, C.s3);
    R(c, x + 7, y + 5, 2, 3, C.wd2);
  }
  function lamp(c, x, y, tx, ty, base) {
    base(c, x, y, tx, ty);
    R(c, x + 7, y + 6, 2, 10, C.s0); R(c, x + 5, y + 1, 6, 6, C.k); R(c, x + 6, y + 2, 4, 4, C.y2); P(c, x + 7, y + 3, C.wh);
  }
  function stall(c, x, y, tx, ty, color) {
    cobble(c, x, y, tx, ty);
    R(c, x, y, 16, 7, C.k);
    for (var i = 0; i < 4; i++) R(c, x + i * 4, y + 1, 2, 5, color); for (var j = 0; j < 4; j++) R(c, x + j * 4 + 2, y + 1, 2, 5, C.wh);
    R(c, x + 1, y + 7, 2, 4, C.wd0); R(c, x + 13, y + 7, 2, 4, C.wd0);
    R(c, x, y + 10, 16, 6, C.k); R(c, x + 1, y + 11, 14, 4, C.wd2); R(c, x + 1, y + 11, 14, 1, C.wd3);
    R(c, x + 3, y + 9, 3, 2, C.y1); R(c, x + 9, y + 9, 3, 2, '#cfe8ff');
  }
  function fence(c, x, y, tx, ty) {
    grass(c, x, y, tx, ty);
    R(c, x, y + 6, 16, 2, C.wd2); R(c, x, y + 11, 16, 2, C.wd2);
    R(c, x + 2, y + 4, 2, 11, C.wd1); R(c, x + 12, y + 4, 2, 11, C.wd1);
  }
  function field(c, x, y, tx, ty) {
    R(c, x, y, T, T, C.d0);
    for (var i = 0; i < 4; i++) { R(c, x, y + i * 4 + 2, T, 1, C.d1); for (var j = 0; j < 4; j++) if (hash(tx * 4 + j, ty * 4 + i) < 0.7) { P(c, x + j * 4 + 1, y + i * 4 + 1, C.g2); P(c, x + j * 4 + 2, y + i * 4, C.g3); } }
  }
  function gate(c, x, y, tx, ty, open) {
    if (open) { cobble(c, x, y, tx, ty); R(c, x, y, 2, T, C.s0); R(c, x + 14, y, 2, T, C.s0); return; }
    R(c, x, y, T, T, C.k); R(c, x + 1, y, 14, 16, C.wd1);
    for (var i = 0; i < 4; i++) R(c, x + 1 + i * 4, y, 1, 16, C.wd0);
    R(c, x, y + 3, 16, 2, C.s0); R(c, x, y + 11, 16, 2, C.s0); P(c, x + 12, y + 8, C.y1);
  }
  function pipe(c, x, y, tx, ty, clean) {
    grass(c, x, y, tx, ty);
    R(c, x + 1, y + 3, 14, 9, C.k); R(c, x + 2, y + 4, 12, 7, C.s1); R(c, x + 2, y + 4, 12, 2, C.s2);
    R(c, x + 12, y + 5, 3, 5, C.s0);
    if (!clean) { R(c, x + 13, y + 10, 2, 6, C.z2); P(c, x + 13, y + 15, C.z3); }
  }
  function planter(c, x, y, tx, ty) {
    cobble(c, x, y, tx, ty);
    R(c, x + 1, y + 8, 14, 8, C.k); R(c, x + 2, y + 9, 12, 6, C.wd2); R(c, x + 2, y + 9, 12, 1, C.wd3); R(c, x + 2, y + 12, 12, 1, C.wd1);
    R(c, x + 2, y + 4, 12, 5, C.g0); R(c, x + 3, y + 3, 4, 3, C.g1); R(c, x + 9, y + 3, 4, 3, C.g1); R(c, x + 6, y + 2, 4, 3, C.g2);
    var cols = [C.r2, C.y2, C.p2, C.wh];
    for (var i = 0; i < 5; i++) { var fx = x + 3 + (hash(tx, ty, i) * 10 | 0), fy = y + 2 + (hash(tx, ty, i + 9) * 5 | 0); P(c, fx, fy, cols[i % 4]); P(c, fx + 1, fy, cols[i % 4]); P(c, fx, fy + 1, cols[i % 4]); }
  }
  function anvil(c, x, y, tx, ty) {
    cobble(c, x, y, tx, ty);
    R(c, x + 2, y + 5, 12, 4, C.k); R(c, x + 3, y + 6, 10, 2, C.s2); R(c, x + 6, y + 9, 4, 4, C.s0); R(c, x + 4, y + 13, 8, 3, C.s0);
  }
  // indendørs
  function iwall(c, x, y, tx, ty, map) {
    R(c, x, y, T, T, C.wd1);
    for (var i = 0; i < 16; i += 4) R(c, x + i, y, 1, T, C.wd0);
    if (map && map.at(tx, ty + 1) !== 'X') { R(c, x, y + 12, T, 4, C.wd0); R(c, x, y + 12, T, 1, C.wd3); }
  }
  function cwall(c, x, y, tx, ty, map) {
    R(c, x, y, T, T, C.cv0);
    for (var i = 0; i < 4; i++) R(c, x + (hash(tx, ty, i) * 12 | 0), y + (hash(tx, ty, i + 8) * 12 | 0), 4, 3, C.cv2);
    if (map && map.at(tx, ty + 1) !== 'I') { R(c, x, y + 12, T, 4, C.s0); R(c, x, y + 12, T, 1, C.s1); }
  }
  function shelf(c, x, y, tx, ty, potions) {
    iwall(c, x, y, tx, ty, null);
    R(c, x + 1, y + 1, 14, 15, C.wd0);
    for (var r = 0; r < 3; r++) {
      R(c, x + 1, y + 5 + r * 5, 14, 1, C.wd2);
      for (var b = 0; b < 5; b++) {
        var col = potions ? [C.r2, C.z2, C.b2, C.p2, C.y2][(hash(tx * 5 + b, r) * 5) | 0] : [C.r1, C.b1, C.n1, C.p1, C.y0, C.wd3][(hash(tx * 5 + b, ty + r) * 6) | 0];
        if (potions) { R(c, x + 2 + b * 3, y + 2 + r * 5, 2, 3, col); P(c, x + 2 + b * 3, y + 1 + r * 5, C.wh); }
        else R(c, x + 2 + b * 3, y + 1 + r * 5, 2, 4, col);
      }
    }
  }
  function counter(c, x, y, tx, ty) {
    woodFloor(c, x, y, tx, ty);
    R(c, x, y + 2, 16, 14, C.k); R(c, x, y + 3, 16, 3, C.wd3); R(c, x, y + 6, 16, 9, C.wd1);
    R(c, x, y + 8, 16, 1, C.wd0); R(c, x, y + 12, 16, 1, C.wd0);
  }
  function table(c, x, y, tx, ty, floor) {
    floor(c, x, y, tx, ty);
    R(c, x + 1, y + 3, 14, 9, C.k); R(c, x + 2, y + 4, 12, 6, C.wd3); R(c, x + 2, y + 9, 12, 1, C.wd1);
    R(c, x + 2, y + 11, 2, 4, C.wd0); R(c, x + 12, y + 11, 2, 4, C.wd0);
    if (hash(tx, ty) < 0.5) { R(c, x + 5, y + 5, 3, 3, C.wh); P(c, x + 6, y + 6, C.y1); } else { R(c, x + 9, y + 4, 2, 4, C.y1); }
  }
  function chair(c, x, y, tx, ty, floor) {
    floor(c, x, y, tx, ty);
    R(c, x + 4, y + 2, 8, 6, C.k); R(c, x + 5, y + 3, 6, 4, C.wd2); R(c, x + 4, y + 8, 8, 3, C.wd1); R(c, x + 4, y + 11, 2, 4, C.wd0); R(c, x + 10, y + 11, 2, 4, C.wd0);
  }
  function fireplace(c, x, y, tx, ty, f) {
    wallStone(c, x, y, tx, ty, true);
    R(c, x + 2, y + 5, 12, 11, C.k); R(c, x + 3, y + 7, 10, 9, '#2a1010');
    R(c, x + 4, y + 11 - f, 8, 4 + f, C.r2); R(c, x + 6, y + 10 - f, 4, 5, C.y1); R(c, x + 7, y + 12, 2, 2, C.y2);
    R(c, x + 3, y + 15, 10, 1, C.wd1);
  }
  function cauldron(c, x, y, tx, ty, f, floor) {
    floor(c, x, y, tx, ty);
    R(c, x + 2, y + 5, 12, 10, C.k); R(c, x + 3, y + 6, 10, 8, C.s0); R(c, x + 3, y + 6, 10, 2, f ? C.z3 : C.z2);
    P(c, x + 5 + f * 3, y + 4 - f, C.z3); P(c, x + 9 - f, y + 3, C.z2);
    R(c, x + 4, y + 14, 2, 2, C.r2); R(c, x + 10, y + 14, 2, 2, C.y1);
  }
  function rug(c, x, y, tx, ty, map) {
    R(c, x, y, T, T, C.rug);
    var up = map.at(tx, ty - 1) !== 'Z', dn = map.at(tx, ty + 1) !== 'Z', lf = map.at(tx - 1, ty) !== 'Z', rt = map.at(tx + 1, ty) !== 'Z';
    if (up) R(c, x, y + 1, T, 2, C.rug2); if (dn) R(c, x, y + 13, T, 2, C.rug2);
    if (lf) R(c, x + 1, y, 2, T, C.rug2); if (rt) R(c, x + 13, y, 2, T, C.rug2);
    if ((tx + ty) % 2) P(c, x + 8, y + 8, C.rug2);
  }
  function exitMat(c, x, y, tx, ty, floor) {
    floor(c, x, y, tx, ty);
    R(c, x + 2, y + 4, 12, 10, C.r0); R(c, x + 3, y + 5, 10, 8, C.r1);
    R(c, x + 6, y + 7, 4, 1, C.y2); R(c, x + 7, y + 8, 2, 3, C.y2);
  }
  function banner(c, x, y, tx, ty) {
    iwall(c, x, y, tx, ty, null);
    R(c, x + 3, y + 1, 10, 13, C.k); R(c, x + 4, y + 1, 8, 11, C.b1); R(c, x + 4, y + 12, 3, 2, C.b1); R(c, x + 9, y + 12, 3, 2, C.b1);
    R(c, x + 6, y + 4, 4, 4, C.y1); P(c, x + 7, y + 5, C.y2);
  }
  function wallMap(c, x, y, tx, ty) {
    iwall(c, x, y, tx, ty, null);
    R(c, x + 1, y + 2, 14, 10, C.k); R(c, x + 2, y + 3, 12, 8, C.pl);
    R(c, x + 3, y + 5, 5, 1, C.w1); R(c, x + 4, y + 6, 6, 1, C.w1); R(c, x + 9, y + 4, 3, 3, C.n1); P(c, x + 11, y + 8, C.r1);
  }
  function desk(c, x, y, tx, ty, floor) {
    floor(c, x, y, tx, ty);
    R(c, x, y + 4, 16, 11, C.k); R(c, x + 1, y + 5, 14, 4, C.wd2); R(c, x + 1, y + 9, 14, 5, C.wd1);
    R(c, x + 3, y + 3, 5, 3, C.wh); R(c, x + 10, y + 2, 2, 4, C.y1);
  }
  function vat(c, x, y, tx, ty, f, clean) {
    stoneFloor(c, x, y, tx, ty);
    R(c, x + 1, y + 2, 14, 13, C.k); R(c, x + 2, y + 3, 12, 11, C.wd1);
    R(c, x + 2, y + 3, 12, 3, clean ? C.w2 : (hash(tx, ty) < 0.5 ? C.b2 : C.z2));
    R(c, x + 2, y + 8, 12, 1, C.s1); R(c, x + 2, y + 12, 12, 1, C.s1);
    if (!clean) P(c, x + 4 + f * 5, y + 4, C.wh);
  }
  function valve(c, x, y, tx, ty, open) {
    wallStone(c, x, y, tx, ty, false);
    R(c, x + 6, y, 4, 16, C.s2); R(c, x + 6, y, 1, 16, C.s3);
    R(c, x + 3, y + 5, 10, 6, C.k); R(c, x + 4, y + 6, 8, 4, open ? C.r1 : C.n1);
    R(c, x + 7, y + 3, 2, 3, C.k);
  }
  function ironDoor(c, x, y, tx, ty, open) {
    if (open) { stoneFloor(c, x, y, tx, ty); R(c, x, y, 2, T, C.s0); R(c, x + 14, y, 2, T, C.s0); return; }
    R(c, x, y, T, T, C.k); R(c, x + 1, y + 1, 14, 15, C.s1);
    for (var i = 0; i < 3; i++) R(c, x + 1, y + 3 + i * 5, 14, 1, C.s0);
    R(c, x + 7, y + 1, 2, 15, C.s0); P(c, x + 11, y + 9, C.y1);
  }
  function crystal(c, x, y, tx, ty) {
    caveFloor(c, x, y, tx, ty);
    R(c, x + 6, y + 3, 4, 11, C.k); R(c, x + 7, y + 4, 2, 9, '#9ad0ff'); P(c, x + 7, y + 5, C.wh);
    R(c, x + 3, y + 8, 3, 6, C.k); R(c, x + 4, y + 9, 1, 4, '#c89aff');
  }

  // floorOf: hvilket gulv der ligger under en møbelflise (fra kortets egen indstilling)
  RB.drawTile = function (c, map, tx, ty, f) {
    var ch = map.at(tx, ty), x = tx * T, y = ty * T;
    var fl = map.floor === 'stone' ? stoneFloor : map.floor === 'cave' ? caveFloor : woodFloor;
    var green = map.flags && map.flags.green;
    switch (ch) {
      case '.': grass(c, x, y, tx, ty); break;
      case ',': flowers(c, x, y, tx, ty); break;
      case ':': dirt(c, x, y, tx, ty); break;
      case '=': cobble(c, x, y, tx, ty); break;
      case '~': water(c, x, y, tx, ty, f, false, map); break;
      case 'z': water(c, x, y, tx, ty, f, green, map); break;
      case 'H': water(c, x, y, tx, ty, f, green && tx > 12, map); R(c, x, y, T, T, C.wd2); for (var i = 0; i < 4; i++) R(c, x, y + i * 4 + 3, T, 1, C.wd1); R(c, x, y, 2, T, C.wd0); R(c, x + 14, y, 2, T, C.wd0); break;
      case 'T': tree(c, x, y, tx, ty); break;
      case 't': bush(c, x, y, tx, ty); break;
      case 'r': rock(c, x, y, tx, ty); break;
      case '#': wallStone(c, x, y, tx, ty, false); break;
      case 'R': roof(c, x, y, tx, ty, [C.r0, C.r1, C.r2], map, ch); break;
      case 'B': roof(c, x, y, tx, ty, [C.b0, C.b1, C.b2], map, ch); break;
      case 'P': roof(c, x, y, tx, ty, [C.p0, C.p1, C.p2], map, ch); break;
      case 'G': roof(c, x, y, tx, ty, [C.n0, C.n1, C.n2], map, ch); break;
      case 'W': plaster(c, x, y, tx, ty, map); break;
      case 'S': stoneWallB(c, x, y, tx, ty, map); break;
      case 'D': door(c, x, y, tx, ty, map); break;
      case 'O': windowT(c, x, y, tx, ty, map); break;
      case 's': sign(c, x, y, tx, ty, baseFor(map, tx, ty)); break;
      case 'N': board(c, x, y, tx, ty, cobble); break;
      case 'b': barrel(c, x, y, tx, ty, baseFor(map, tx, ty)); break;
      case 'c': crate(c, x, y, tx, ty, baseFor(map, tx, ty)); break;
      case 'w': well(c, x, y, tx, ty, green); break;
      case 'l': lamp(c, x, y, tx, ty, baseFor(map, tx, ty)); break;
      case 'm': stall(c, x, y, tx, ty, [C.r1, C.b1, C.n1][tx % 3]); break;
      case 'f': fence(c, x, y, tx, ty); break;
      case 'F': field(c, x, y, tx, ty); break;
      case 'g': gate(c, x, y, tx, ty, map.flags && map.flags.gateOpen); break;
      case 'x': pipe(c, x, y, tx, ty, !green); break;
      case 'a': anvil(c, x, y, tx, ty); break;
      case 'j': planter(c, x, y, tx, ty); break;
      case '_': woodFloor(c, x, y, tx, ty); break;
      case ';': stoneFloor(c, x, y, tx, ty); break;
      case 'A': caveFloor(c, x, y, tx, ty); break;
      case 'X': iwall(c, x, y, tx, ty, map); break;
      case 'I': cwall(c, x, y, tx, ty, map); break;
      case 'L': shelf(c, x, y, tx, ty, false); break;
      case 'Y': shelf(c, x, y, tx, ty, true); break;
      case 'C': counter(c, x, y, tx, ty); break;
      case 'Q': table(c, x, y, tx, ty, fl); break;
      case 'q': chair(c, x, y, tx, ty, fl); break;
      case 'U': fireplace(c, x, y, tx, ty, f); break;
      case 'V': cauldron(c, x, y, tx, ty, f, fl); break;
      case 'Z': rug(c, x, y, tx, ty, map); break;
      case 'E': exitMat(c, x, y, tx, ty, fl); break;
      case 'J': banner(c, x, y, tx, ty); break;
      case 'M': wallMap(c, x, y, tx, ty); break;
      case 'n': desk(c, x, y, tx, ty, fl); break;
      case 'v': vat(c, x, y, tx, ty, f, !green); break;
      case 'p': valve(c, x, y, tx, ty, !(map.flags && map.flags.valveClosed)); break;
      case '/': ironDoor(c, x, y, tx, ty, map.isOpen && map.isOpen(tx, ty)); break;
      case '%': crystal(c, x, y, tx, ty); break;
      default: R(c, x, y, T, T, '#000');
    }
  };
  function baseFor(map, tx, ty) {
    if (map.floor === 'wood') return woodFloor;
    if (map.floor === 'stone') return stoneFloor;
    var n = [map.at(tx, ty + 1), map.at(tx - 1, ty), map.at(tx + 1, ty), map.at(tx, ty - 1)];
    for (var i = 0; i < n.length; i++) { if (n[i] === '=') return cobble; if (n[i] === ':') return dirt; if (n[i] === '.' || n[i] === ',') return grass; }
    return grass;
  }
  RB.isAnimated = function (ch) { return 'zH~UVv'.indexOf(ch) >= 0; };

  // ---------------------------------------------------------------- effekter
  RB.drawMarker = function (c, x, y, kind, t) {
    var bob = Math.floor(t / 16) % 2;
    var col = kind === '!' ? C.y2 : kind === '?' ? '#9ad0ff' : C.wh;
    y -= bob;
    R(c, x + 5, y, 6, 9, C.k);
    R(c, x + 6, y + 1, 4, 7, col);
    if (kind === '!') { R(c, x + 7, y + 2, 2, 3, C.k); R(c, x + 7, y + 6, 2, 1, C.k); }
    else { R(c, x + 7, y + 2, 2, 1, C.k); P(c, x + 8, y + 3, C.k); R(c, x + 7, y + 4, 1, 1, C.k); R(c, x + 7, y + 6, 1, 1, C.k); }
  };
  RB.drawSparkle = function (c, x, y, t, col) {
    var f = Math.floor(t / 10) % 4;
    col = col || '#9ad0ff';
    var s = [1, 2, 3, 2][f];
    R(c, x + 8, y + 8 - s, 1, s * 2 + 1, col); R(c, x + 8 - s, y + 8, s * 2 + 1, 1, col);
    P(c, x + 8, y + 8, C.wh);
  };
  RB.drawScroll = function (c, x, y, t) {
    var b = Math.floor(t / 20) % 2;
    R(c, x + 4, y + 7 - b, 8, 6, C.k); R(c, x + 5, y + 8 - b, 6, 4, C.pl); R(c, x + 3, y + 7 - b, 2, 6, C.pl2); R(c, x + 11, y + 7 - b, 2, 6, C.pl2);
    R(c, x + 6, y + 9 - b, 4, 1, C.wd1);
    RB.drawSparkle(c, x + 4, y - 4 - b, t, C.y2);
  };
  RB.drawShadow = function (c, x, y) {
    c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x + 3, y + 14, 10, 2);
  };

  // Portræt til dialogen: figuren forstørret, set forfra
  RB.portrait = function (sheet, size) {
    var cv = canvas(size, size), c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.fillStyle = '#2a2140'; c.fillRect(0, 0, size, size);
    c.drawImage(sheet, 0, 0, 16, 16, 0, size * 0.08, size, size);
    return cv;
  };
})();
