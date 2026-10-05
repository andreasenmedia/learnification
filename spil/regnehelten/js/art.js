/* Regnehelten — grafik
   Samme opskrift som Runeborg: alt er tegnet i kode, ingen billedfiler.
   Figurerne er 16x16 skabeloner, hvor hvert bogstav er en rolle (hår, hud,
   trøje ...), som farves pr. figur. Fliserne er små pixel-rutiner med en
   fast "tilfældighed" pr. felt, så græsset ser levende ud, men er det samme
   hver gang. Her er det bare et dansk kvarter i oktober i stedet for en
   fantasyby: rødstenshuse, fortov, en skole i gule mursten og gule blade. */
(function () {
  'use strict';
  var RH = window.RH = window.RH || {};
  var T = 16;

  var C = {
    k: '#1a1420', k2: '#2a2238',
    g0: '#24583a', g1: '#357a42', g2: '#4f9e4c', g3: '#86c864',
    d0: '#6b4a2f', d1: '#8f6a43', d2: '#b08a5a', d3: '#cfae7a',
    s0: '#3e3c4c', s1: '#62606e', s2: '#8e8c9a', s3: '#c2c0cc',
    w0: '#1b3a7a', w1: '#2a66b8', w2: '#5fa4e4', w3: '#c4e6ff',
    wd0: '#3e2618', wd1: '#633c22', wd2: '#8e5a32', wd3: '#b8804a',
    r0: '#5e1a26', r1: '#a02e38', r2: '#d8584a',
    b0: '#1a2860', b1: '#2c4a9c', b2: '#5a7ed4',
    p0: '#361a50', p1: '#643684', p2: '#9868c0',
    n0: '#1a4a2a', n1: '#2c7a3c', n2: '#58a858',
    y0: '#9a6a18', y1: '#e0a82c', y2: '#ffe070',
    pl: '#e8d8b4', pl2: '#c8b48c',
    wh: '#f4ecdc', rug: '#8a2a3a', rug2: '#c8a040',
    // det moderne kvarter
    as0: '#3a3a46', as1: '#4a4a56', as2: '#5c5c6a',
    fl0: '#8c8a98', fl1: '#a9a7b5', fl2: '#c4c2ce',
    br0: '#6e2a24', br1: '#9a3c30', br2: '#b8563e', brm: '#c4ae98',
    yb0: '#a8883a', yb1: '#c8a85a', yb2: '#e2c67c', ybm: '#ece0c4',
    sl0: '#2a3448', sl1: '#3e4c66', sl2: '#5a6c8a',
    lino0: '#7f8e7c', lino1: '#97a692', lino2: '#b1bdab',
    glas: '#6a9ad0', glas2: '#b4d8f4'
  };
  RH.C = C;

  // ---------------------------------------------------------------- hjælpere
  function canvas(w, h) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d'); x.imageSmoothingEnabled = false; return c;
  }
  RH.canvas = canvas;
  function hash(x, y, s) {
    var h = (x * 374761393 + y * 668265263 + (s || 0) * 1442695041) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  RH.hash = hash;
  function R(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }
  function P(c, x, y, col) { c.fillStyle = col; c.fillRect(x, y, 1, 1); }
  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (f < 1) { r = r * f | 0; g = g * f | 0; b = b * f | 0; }
    else { var a = f - 1; r = Math.min(255, r + (255 - r) * a | 0); g = Math.min(255, g + (255 - g) * a | 0); b = Math.min(255, b + (255 - b) * a | 0); }
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  RH.shade = shade;

  // ---------------------------------------------------------------- lille pixelskrift til skilte
  // Fem rækker pr. bogstav; M og N er bredere, så de ikke ligner hinanden
  var FONT = {
    A: '010/101/111/101/101', B: '110/101/110/101/110', C: '011/100/100/100/011', D: '110/101/101/101/110', E: '111/100/110/100/111',
    F: '111/100/110/100/100', G: '0110/1000/1011/1001/0110', H: '101/101/111/101/101', I: '111/010/010/010/111', J: '001/001/001/101/010',
    K: '101/101/110/101/101', L: '100/100/100/100/111', M: '10001/11011/10101/10001/10001', N: '1001/1101/1011/1001/1001', O: '0110/1001/1001/1001/0110',
    P: '110/101/110/100/100', R: '110/101/110/101/101', S: '011/100/010/001/110', T: '111/010/010/010/010', U: '101/101/101/101/111',
    V: '101/101/101/101/010', Y: '101/101/010/010/010', 'Ø': '0111/1011/1101/1001/1110', 'Æ': '01111/10100/11110/10100/10111', 'Å': '010/000/010/101/111',
    ' ': '00/00/00/00/00', '-': '000/000/111/000/000'
  };
  function glyph(ch) { return (FONT[ch] || FONT[' ']).split('/'); }
  RH.pixText = function (c, x, y, text, col) {
    c.fillStyle = col;
    for (var i = 0; i < text.length; i++) {
      var g = glyph(text[i]);
      for (var r = 0; r < 5; r++) for (var k = 0; k < g[r].length; k++) if (g[r][k] === '1') c.fillRect(x + k, y + r, 1, 1);
      x += g[0].length + 1;
    }
  };
  RH.pixTextWidth = function (text) { var w = -1; for (var i = 0; i < text.length; i++) w += glyph(text[i])[0].length + 1; return w; };

  // ---------------------------------------------------------------- figurer
  function r8(inner) { return '...k' + inner + 'k...'; }
  function r6(inner) { return '....k' + inner + 'k....'; }

  var HEAD_DOWN = ['................', '.....kkkkkk.....', r6('hhhhhh'), r8('hhhhhhhh'), r8('hhsssshh'), r8('hsessesh'), r8('ssssssss'), r6('ssssss')];
  var HEAD_UP = ['................', '.....kkkkkk.....', r6('hhhhhh'), r8('hhhhhhhh'), r8('hhhhhhhh'), r8('hhhhhhhh'), r8('hhhhhhhh'), r6('hhhhhh')];
  var HEAD_SIDE = ['................', '.....kkkkkk.....', r6('hhhhhh'), r8('hhhhhhhh'), r8('hhhhssss'), r8('hhhhsess'), r8('hhhsssss'), r6('hsssss')];
  // En almindelig T-shirt: mørkere sider og kant, hænderne ude i siden
  var BODY_DOWN = [r8('cccccccc'), '..kcccccccccck..', '..kdccccccccdk..', '..ksddddddddsk..', r8('pppppppp')];
  var BODY_UP = [r8('cccccccc'), '..kcccccccccck..', '..kdccccccccdk..', '..ksddddddddsk..', r8('pppppppp')];
  var BODY_SIDE = [r6('cccccc'), r6('cccccd'), r6('cccccd'), r6('ddsddd'), r6('pppppp')];
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

  // Frisurer og ekstra ting, lagt ovenpå skabelonen række for række.
  // '_' betyder "gennemsigtig", '.' betyder "rør ikke".
  var HAIR = {
    lang: {
      down: { 5: '..kh........hk..', 6: '..kh........hk..', 7: '...kh......hk...', 8: '..kh........hk..', 9: '..kh........hk..' },
      up: { 7: '....khhhhhhk....', 8: '...khhhhhhhhk...', 9: '...khhhhhhhhk...', 10: '....khhhhhhk....' },
      side: { 7: '...kh...........', 8: '...khh..........', 9: '...kh...........' }
    },
    kroeller: {
      down: { 1: '....kkkkkkkk....', 2: '...khHhhHhhHk...', 3: '..khhhHhhhhHhk..', 4: '..khhhsssshhhk..', 5: '..kh........hk..', 6: '...k........k...' },
      up: { 1: '....kkkkkkkk....', 2: '...khHhhHhhHk...', 3: '..khhhHhhhhHhk..', 4: '..khhhhhhhhhhk..', 5: '..khHhhhhhhHhk..', 6: '...khhhhhhhhk...' },
      side: { 1: '....kkkkkkkk....', 2: '...khHhhHhhk....', 3: '..khhhHhhhhhk...', 4: '..khhhhhssssk...', 5: '..khhhhhsessk...', 6: '...khhhsssssk...' }
    },
    knold: {
      down: { 0: '......kkkk......', 1: '.....khHhhk.....' },
      up: { 0: '......kkkk......', 1: '.....khHhhk.....' },
      side: { 0: '...kkk..........', 1: '..khHhkkkkk.....' }
    },
    skaldet: {
      down: { 1: '.....kkkkkk.....', 2: '....kssssssk....', 3: '...khsssssshk...' },
      up: { 2: '....kssssssk....', 3: '...khsssssshk...' },
      side: { 2: '....kssssssk....', 3: '...khhssssssk...' }
    },
    kasket: {
      down: { 1: '.....kkkkkk.....', 2: '....kttttttk....', 3: '...kttttttttk...', 4: '..kaaaaaaaaaak..' },
      up: { 1: '.....kkkkkk.....', 2: '....kttttttk....', 3: '...kttttttttk...', 4: '...kthhhhhhtk...' },
      side: { 1: '.....kkkkkk.....', 2: '....kttttttk....', 3: '...kttttttttaaak', 4: '...khhhhsssskkk.' }
    }
  };
  var EXTRA = {
    briller: { down: { 5: '.....kekkek.....' }, side: { 5: '.........kek....' } },
    taske: {
      down: { 8: '.....G....G.....', 9: '.....G....G.....' },
      up: { 8: '....kggggggk....', 9: '....kgGGGGgk....', 10: '....kggggggk....', 11: '....kkkkkkkk....' },
      side: { 8: '..kggk..........', 9: '..kgGk..........', 10: '..kggk..........', 11: '..kkkk..........' }
    },
    skaeg: { down: { 6: '...kyssssssyk...', 7: '....kyyyyyyk....' }, side: { 6: '...khhhyyyyy....', 7: '....kyyyyyk.....' } },
    fløjte: { down: { 8: '.......w........', 9: '.......y........' } },
    forklaede: { down: { 9: '..kcwwwwwwwwck..', 10: '..kdwwwwwwwwdk..', 11: '..kswwwwwwwwsk..' } }
  };

  function buildFrame(dir, step) {
    if (dir === 'down') return HEAD_DOWN.concat(BODY_DOWN, LEGS_FRONT[step]);
    if (dir === 'up') return HEAD_UP.concat(BODY_UP, LEGS_FRONT[step]);
    return HEAD_SIDE.concat(BODY_SIDE, LEGS_SIDE[step]);
  }

  function lookColors(L) {
    var cloth = L.cloth || '#487ac4', hair = L.hair || '#5c3a24', hat = L.hatColor || shade(cloth, 0.8);
    return {
      k: C.k, h: hair, H: shade(hair, 1.25), s: L.skin || '#f5cdaa', e: L.eye || C.k,
      c: cloth, d: shade(cloth, 0.72), p: L.pants || '#4e5670', b: L.shoes || '#2e2e3a',
      t: hat, a: shade(hat, 0.6), y: L.beardColor || hair, w: '#f4f4f0',
      g: L.bag || '#d0603a', G: shade(L.bag || '#d0603a', 0.65)
    };
  }

  // Et ark med 4 retninger x 3 skridt. Venstre er et spejlet højre.
  RH.makeSheet = function (L) {
    var col = lookColors(L);
    var sheet = canvas(T * 3, T * 4), c = sheet.getContext('2d');
    var style = L.style || 'kort', extras = (L.extra || '').split('+').filter(Boolean);
    ['down', 'up', 'right'].forEach(function (dir, di) {
      var view = dir === 'right' ? 'side' : dir;
      for (var step = 0; step < 3; step++) {
        var rows = buildFrame(dir, step).slice(), overs = [];
        if (HAIR[style] && HAIR[style][view]) overs.push(HAIR[style][view]);
        if (L.beard && EXTRA.skaeg[view]) overs.push(EXTRA.skaeg[view]);
        if (L.apron && EXTRA.forklaede[view]) overs.push(EXTRA.forklaede[view]);
        extras.forEach(function (ex) { var e = { briller: 'briller', taske: 'taske' }[ex]; if (e && EXTRA[e][view]) overs.push(EXTRA[e][view]); });
        if (L.whistle && EXTRA['fløjte'][view]) overs.push(EXTRA['fløjte'][view]);
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
        for (var x = 0; x < 16; x++) { var ch = o[y][x]; if (ch === '.') continue; row[x] = ch === '_' ? '.' : ch; }
      });
      for (var x2 = 0; x2 < 16; x2++) {
        var ch2 = row[x2];
        if (ch2 === '.' || ch2 === ' ' || !col[ch2]) continue;
        P(c, ox + (flip ? 15 - x2 : x2), oy + y, col[ch2]);
      }
    }
  }
  RH.DIR_ROW = { down: 0, up: 1, right: 2, left: 3 };

  // Sally, hundelufterens hund — to billeder, så halen logrer
  var DOG = [
    ['................', '................', '................', '................', '................', '..........kk....',
      '.........kook...', '..k......koeok..', '.kok.....koooonk', '..kkkkkkkooook..', '...koooooooook..', '...koowoooowok..',
      '...kook...kook..', '...kk.k...k.kk..', '................', '................'],
    ['................', '................', '................', '................', '................', '..........kk....',
      '.........kook...', '.........koeok..', '.kkk.....koooonk', '.kookkkkkooook..', '...koooooooook..', '...koowoooowok..',
      '...kook...kook..', '...kk.k...k.kk..', '................', '................']
  ];
  RH.makeDog = function () {
    var cv = canvas(32, 16), c = cv.getContext('2d');
    var col = { k: C.k, o: '#c8904a', w: '#f4e6cc', e: C.k, n: '#2a1a14' };
    DOG.forEach(function (fr, f) { fr.forEach(function (row, y) { for (var x = 0; x < 16; x++) if (col[row[x]]) P(c, f * 16 + x, y, col[row[x]]); }); });
    return cv;
  };

  // ---------------------------------------------------------------- fliser
  // Alt, man ikke kan gå igennem. Døre, låger og indvendige døre styres af kortet.
  var SOLID = 'ThFlBkcGPSmu1sRKLWYMOQAj~' + 'XbdqwHnvCioVy[eUpzr$NJ%&';
  RH.SOLID = SOLID;

  function grass(c, x, y, tx, ty) {
    R(c, x, y, T, T, C.g1);
    for (var i = 0; i < 6; i++) P(c, x + (hash(tx, ty, i) * 16 | 0), y + (hash(tx, ty, i + 20) * 16 | 0), i < 3 ? C.g2 : C.g0);
    if (hash(tx, ty, 99) < 0.45) {
      var ux = 2 + (hash(tx, ty, 7) * 11 | 0), uy = 4 + (hash(tx, ty, 8) * 10 | 0);
      P(c, x + ux, y + uy, C.g3); P(c, x + ux + 2, y + uy, C.g3); P(c, x + ux + 1, y + uy + 1, C.g2);
    }
    // nedfaldne blade — det er oktober
    if (hash(tx, ty, 41) < 0.22) {
      var lc = ['#e0a82c', '#d8584a', '#c86a2a', '#ffcc4d'][(hash(tx, ty, 42) * 4) | 0];
      var lx = x + 2 + (hash(tx, ty, 43) * 11 | 0), ly = y + 2 + (hash(tx, ty, 44) * 11 | 0);
      P(c, lx, ly, lc); P(c, lx + 1, ly, lc); P(c, lx, ly + 1, shade(lc, 0.75));
    }
  }
  function flowers(c, x, y, tx, ty) {
    grass(c, x, y, tx, ty);
    var cols = [C.wh, C.r2, C.y2, C.p2];
    for (var i = 0; i < 3; i++) {
      var fx = x + 2 + (hash(tx, ty, i + 40) * 11 | 0), fy = y + 2 + (hash(tx, ty, i + 50) * 11 | 0), fc = cols[(hash(tx, ty, i + 60) * 4) | 0];
      P(c, fx, fy - 1, fc); P(c, fx - 1, fy, fc); P(c, fx + 1, fy, fc); P(c, fx, fy + 1, fc); P(c, fx, fy, C.y1);
    }
  }
  function gravel(c, x, y, tx, ty) {
    R(c, x, y, T, T, '#b9a888');
    for (var i = 0; i < 9; i++) P(c, x + (hash(tx, ty, i) * 16 | 0), y + (hash(tx, ty, i + 9) * 16 | 0), i % 3 ? '#9e8c6c' : '#d6caa8');
  }
  function isRoad(ch) { return ch === 'a' || ch === '-' || ch === 'x' || ch === '1'; }
  function sidewalk(c, x, y, tx, ty, map) {
    R(c, x, y, T, T, C.fl1);
    R(c, x, y + 7, T, 1, C.fl0); R(c, x, y + 15, T, 1, C.fl0); R(c, x + 7, y, 1, T, C.fl0); R(c, x + 15, y, 1, T, C.fl0);
    R(c, x, y, 7, 1, C.fl2); R(c, x + 8, y + 8, 7, 1, C.fl2); R(c, x + 8, y, 7, 1, C.fl2); R(c, x, y + 8, 7, 1, C.fl2);
    if (hash(tx, ty, 3) < 0.3) P(c, x + 2 + (hash(tx, ty, 4) * 12 | 0), y + 2 + (hash(tx, ty, 5) * 12 | 0), C.fl0);
    if (map && isRoad(map.at(tx, ty + 1))) { R(c, x, y + 13, T, 2, '#d6d4de'); R(c, x, y + 15, T, 1, '#5a5866'); }
    if (map && isRoad(map.at(tx, ty - 1))) { R(c, x, y, T, 1, '#5a5866'); R(c, x, y + 1, T, 2, '#d6d4de'); }
  }
  function asphalt(c, x, y, tx, ty) {
    R(c, x, y, T, T, C.as1);
    for (var i = 0; i < 8; i++) P(c, x + (hash(tx, ty, i) * 16 | 0), y + (hash(tx, ty, i + 8) * 16 | 0), i % 2 ? C.as0 : C.as2);
  }
  function roadLine(c, x, y, tx, ty) { asphalt(c, x, y, tx, ty); if (tx % 2 === 0) R(c, x + 3, y + 7, 12, 2, '#e8e4cc'); }
  function zebra(c, x, y, tx, ty) { asphalt(c, x, y, tx, ty); R(c, x + 1, y, 5, T, '#ecebe2'); R(c, x + 9, y, 5, T, '#ecebe2'); }
  function sand(c, x, y, tx, ty) {
    R(c, x, y, T, T, '#e0c890');
    for (var i = 0; i < 8; i++) P(c, x + (hash(tx, ty, i) * 16 | 0), y + (hash(tx, ty, i + 30) * 16 | 0), i % 2 ? '#c8ae70' : '#f2e0b4');
  }
  function isWater(ch) { return ch === '~'; }
  function water(c, x, y, tx, ty, f, map) {
    var a = [C.w0, C.w1, C.w2, C.w3];
    R(c, x, y, T, T, a[1]);
    for (var i = 0; i < 3; i++) {
      var wx = ((hash(tx, ty, i) * 16 | 0) + f * 2) % 16, wy = (hash(tx, ty, i + 3) * 14 | 0) + 1;
      R(c, x + wx, y + wy, Math.min(4, 16 - wx), 1, a[2]);
    }
    if (hash(tx, ty, 77) < 0.18) { R(c, x + 4, y + 6, 4, 3, '#4f9e4c'); P(c, x + 5, y + 6, '#86c864'); }
    if (map && !isWater(map.at(tx, ty - 1))) { R(c, x, y, T, 2, '#8a7a5a'); R(c, x, y + 2, T, 1, a[3]); }
    if (map && !isWater(map.at(tx, ty + 1))) R(c, x, y + 14, T, 2, a[0]);
    if (map && !isWater(map.at(tx - 1, ty))) R(c, x, y, 2, T, '#8a7a5a');
    if (map && !isWater(map.at(tx + 1, ty))) R(c, x + 14, y, 2, T, '#8a7a5a');
  }

  // Træer i efterårsfarver: nogle er stadig grønne, andre gule og orange
  var LEAF = [[C.g0, C.g1, C.g2, C.g3], ['#7a3a12', '#b8601e', '#e08a2c', '#f4c04a'], ['#7a5a10', '#b8901e', '#e0c040', '#fff0a0'], ['#5a1a1a', '#9a2e24', '#c8503a', '#ee8a5a']];
  function tree(c, x, y, tx, ty, base) {
    (base || grass)(c, x, y, tx, ty);
    var pal = LEAF[(hash(tx, ty, 5) * LEAF.length) | 0], o = '#12201a';
    R(c, x + 3, y + 1, 10, 11, o); R(c, x + 1, y + 3, 14, 7, o); R(c, x + 2, y + 2, 12, 9, o);
    R(c, x + 3, y + 2, 10, 9, pal[0]); R(c, x + 2, y + 4, 12, 5, pal[0]);
    R(c, x + 4, y + 3, 6, 4, pal[1]); R(c, x + 5, y + 3, 3, 2, pal[2]); P(c, x + 5, y + 3, pal[3]);
    P(c, x + 10, y + 6, pal[1]); P(c, x + 7, y + 8, pal[1]); P(c, x + 11, y + 4, pal[2]);
    R(c, x + 7, y + 11, 2, 4, C.wd1); R(c, x + 6, y + 14, 4, 1, C.wd0);
  }
  function bush(c, x, y, tx, ty) {
    grass(c, x, y, tx, ty);
    R(c, x + 2, y + 6, 12, 8, '#12301e'); R(c, x + 3, y + 7, 10, 6, C.g0); R(c, x + 4, y + 7, 5, 3, C.g2); P(c, x + 5, y + 8, C.g3);
    if (hash(tx, ty, 4) < 0.5) { P(c, x + 10, y + 9, C.r2); P(c, x + 7, y + 11, C.r2); }
  }
  // Hæk: hænger sammen med naboerne, så den bliver én lang grøn mur
  function hedge(c, x, y, tx, ty, map) {
    grass(c, x, y, tx, ty);
    var up = map.at(tx, ty - 1) === 'h', dn = map.at(tx, ty + 1) === 'h', lf = map.at(tx - 1, ty) === 'h', rt = map.at(tx + 1, ty) === 'h';
    var x0 = lf ? 0 : 2, x1 = rt ? 16 : 14, y0 = up ? 0 : 3, y1 = dn ? 16 : 14;
    R(c, x + x0, y + y0, x1 - x0, y1 - y0, '#12301e');
    R(c, x + x0 + (lf ? 0 : 1), y + y0 + (up ? 0 : 1), x1 - x0 - (lf ? 0 : 1) - (rt ? 0 : 1), y1 - y0 - (up ? 0 : 1) - (dn ? 0 : 1), '#2a5a2e');
    for (var i = 0; i < 7; i++) {
      var px = x + x0 + 1 + (hash(tx, ty, i) * (x1 - x0 - 2) | 0), py = y + y0 + 1 + (hash(tx, ty, i + 7) * (y1 - y0 - 3) | 0);
      P(c, px, py, i % 2 ? '#3e7a3a' : '#58a050');
    }
    if (!dn) R(c, x + x0, y + y1 - 2, x1 - x0, 2, '#173a20');
  }

  // ---------------------------------------------------------------- huse
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
  // Fladt tag (supermarkedet): grus og en lys kant hele vejen rundt
  function flatRoof(c, x, y, tx, ty, map) {
    R(c, x, y, T, T, '#8a8a94');
    for (var i = 0; i < 8; i++) P(c, x + (hash(tx, ty, i) * 16 | 0), y + (hash(tx, ty, i + 4) * 16 | 0), i % 2 ? '#74747e' : '#a2a2ac');
    var up = map.at(tx, ty - 1) !== 'L', dn = map.at(tx, ty + 1) !== 'L', lf = map.at(tx - 1, ty) !== 'L', rt = map.at(tx + 1, ty) !== 'L';
    if (up) { R(c, x, y, T, 3, '#c8c8d0'); R(c, x, y, T, 1, C.k); }
    if (dn) { R(c, x, y + 12, T, 3, '#c8c8d0'); R(c, x, y + 15, T, 1, C.k); }
    if (lf) { R(c, x, y, 3, T, '#c8c8d0'); R(c, x, y, 1, T, C.k); }
    if (rt) { R(c, x + 13, y, 3, T, '#c8c8d0'); R(c, x + 15, y, 1, T, C.k); }
    if (hash(tx, ty, 9) < 0.08 && !up && !dn && !lf && !rt) { R(c, x + 5, y + 5, 6, 5, C.k); R(c, x + 6, y + 6, 4, 3, '#b0b0b8'); }
  }
  function bricks(c, x, y, tx, ty, mortar, dark, mid, light) {
    R(c, x, y, T, T, mortar);
    for (var row = 0; row < 4; row++) {
      var off = (row + ty) % 2 ? 0 : 4;
      for (var s = -1; s < 2; s++) {
        var bx = x + s * 8 + off, x0 = Math.max(bx, x), x1 = Math.min(bx + 7, x + 16);
        if (x1 <= x0) continue;
        var tone = hash(tx * 3 + s, ty * 4 + row, 11) < 0.2 ? dark : mid;
        R(c, x0, y + row * 4, x1 - x0, 3, tone); R(c, x0, y + row * 4, x1 - x0, 1, light);
      }
    }
  }
  function wallKind(map, tx, ty) {
    var n = [map.at(tx - 1, ty), map.at(tx + 1, ty), map.at(tx, ty + 1), map.at(tx, ty - 1)];
    for (var i = 0; i < n.length; i++) if ('WYM'.indexOf(n[i]) >= 0) return n[i];
    return 'W';
  }
  function wallBase(c, x, y, tx, ty, kind, map) {
    if (kind === 'Y') bricks(c, x, y, tx, ty, C.ybm, C.yb0, C.yb1, C.yb2);
    else if (kind === 'M') {
      R(c, x, y, T, T, '#ece6da');
      for (var i = 0; i < 4; i++) P(c, x + (hash(tx, ty, i) * 14 | 0) + 1, y + (hash(tx, ty, i + 4) * 10 | 0) + 2, '#d8d0c0');
      if (map && 'WYMOQDA'.indexOf(map.at(tx, ty + 1)) < 0) R(c, x, y + 13, T, 3, '#a8a49c');
    } else bricks(c, x, y, tx, ty, C.brm, C.br0, C.br1, C.br2);
    if (map) {
      if ('WYMOQDA'.indexOf(map.at(tx - 1, ty)) < 0) R(c, x, y, 1, T, C.k);
      if ('WYMOQDA'.indexOf(map.at(tx + 1, ty)) < 0) R(c, x + 15, y, 1, T, C.k);
    }
  }
  function windowT(c, x, y, tx, ty, map) {
    wallBase(c, x, y, tx, ty, wallKind(map, tx, ty), map);
    R(c, x + 2, y + 2, 12, 11, C.k); R(c, x + 3, y + 3, 10, 9, '#f4f4f0');
    R(c, x + 4, y + 4, 8, 7, C.glas); R(c, x + 4, y + 4, 3, 2, C.glas2);
    R(c, x + 7, y + 4, 2, 7, '#f4f4f0'); R(c, x + 4, y + 7, 8, 1, '#f4f4f0');
    R(c, x + 2, y + 13, 12, 2, '#d8d4cc');
    // gardiner
    P(c, x + 4, y + 5, '#e8c0c8'); P(c, x + 4, y + 6, '#e8c0c8'); P(c, x + 11, y + 5, '#e8c0c8'); P(c, x + 11, y + 6, '#e8c0c8');
  }
  // Butiksrude: stort glas med varer bagved
  function shopWindow(c, x, y, tx, ty, map) {
    R(c, x, y, T, T, '#3e3e4a');
    R(c, x + 1, y + 1, 14, 14, '#7aa8d8'); R(c, x + 1, y + 1, 14, 3, '#a8ccec');
    var cols = ['#d8584a', '#ffcc4d', '#5fd068', '#f4ecdc', '#c86a2a', '#5a7ed4'];
    for (var r = 0; r < 2; r++) {
      R(c, x + 1, y + 7 + r * 4, 14, 1, '#5a5a66');
      for (var b = 0; b < 4; b++) R(c, x + 2 + b * 3, y + 4 + r * 4, 2, 3, cols[(hash(tx * 4 + b, ty + r, 2) * cols.length) | 0]);
    }
    R(c, x, y, 1, T, C.k); R(c, x + 15, y, 1, T, '#2a2a34');
  }
  function door(c, x, y, tx, ty, map) {
    var kind = wallKind(map, tx, ty);
    wallBase(c, x, y, tx, ty, kind, map);
    if (kind === 'M') {     // glasdøre, der glider til side
      R(c, x + 1, y + 1, 14, 15, '#3e3e4a'); R(c, x + 2, y + 2, 12, 14, '#8ab8e4'); R(c, x + 7, y + 2, 2, 14, '#3e3e4a');
      R(c, x + 2, y + 2, 4, 3, '#c4e2f8'); R(c, x + 9, y + 2, 4, 3, '#c4e2f8');
      return;
    }
    var colors = ['#2c6a4a', '#2c4a8c', '#a02e38', '#e8e0d0', '#3a3a46'], dc = kind === 'Y' ? '#8e5a32' : colors[(hash(tx, ty, 13) * colors.length) | 0];
    R(c, x + 3, y + 1, 10, 15, C.k); R(c, x + 4, y + 2, 8, 14, dc); R(c, x + 4, y + 2, 8, 1, shade(dc, 1.3));
    R(c, x + 6, y + 4, 4, 5, '#9ac8f0'); P(c, x + 6, y + 4, '#d8eefc');
    P(c, x + 10, y + 10, C.y2); R(c, x + 2, y + 15, 12, 1, '#8a8a92');
  }
  // Kiosken: en lem med en stribet markise og en disk
  function kioskHatch(c, x, y, tx, ty, map) {
    wallBase(c, x, y, tx, ty, 'M', map);
    for (var i = 0; i < 4; i++) { R(c, x + i * 4, y, 2, 5, '#d0303a'); R(c, x + i * 4 + 2, y, 2, 5, '#f4f0e8'); }
    R(c, x, y + 5, T, 1, '#8a1a24');
    R(c, x + 1, y + 6, 14, 5, '#2a2230');
    R(c, x + 3, y + 7, 2, 3, '#ffcc4d'); R(c, x + 6, y + 8, 2, 2, '#d8584a'); R(c, x + 9, y + 7, 3, 3, '#5fd068');
    R(c, x, y + 11, T, 3, C.wd2); R(c, x, y + 11, T, 1, C.wd3); R(c, x, y + 14, T, 2, '#a8a49c');
  }
  function lamp(c, x, y, tx, ty, base) {
    base(c, x, y, tx, ty);
    R(c, x + 7, y + 5, 2, 11, C.s0); R(c, x + 6, y + 14, 4, 2, C.s0);
    R(c, x + 4, y + 1, 8, 4, C.k); R(c, x + 5, y + 2, 6, 2, C.s1); R(c, x + 5, y + 4, 6, 1, '#fff0b0');
  }
  function bench(c, x, y, tx, ty, map, base) {
    base(c, x, y, tx, ty);
    var lf = map.at(tx - 1, ty) !== 'B', rt = map.at(tx + 1, ty) !== 'B';
    var x0 = lf ? 2 : 0, x1 = rt ? 14 : 16;
    R(c, x + x0, y + 5, x1 - x0, 2, C.wd2); R(c, x + x0, y + 8, x1 - x0, 2, C.wd2); R(c, x + x0, y + 11, x1 - x0, 2, C.wd2);
    R(c, x + x0, y + 5, x1 - x0, 1, C.wd3); R(c, x + x0, y + 8, x1 - x0, 1, C.wd3);
    if (lf) { R(c, x + 2, y + 5, 2, 10, C.s0); }
    if (rt) { R(c, x + 12, y + 5, 2, 10, C.s0); }
  }
  function bikeRack(c, x, y, tx, ty, base) {
    base(c, x, y, tx, ty);
    for (var i = 0; i < 3; i++) { R(c, x + 2 + i * 5, y + 5, 1, 9, C.s2); R(c, x + 2 + i * 5, y + 5, 3, 1, C.s2); R(c, x + 4 + i * 5, y + 5, 1, 9, C.s2); }
    if (hash(tx, ty, 19) < 0.6) {        // en cykel i stativet
      var bc = ['#d8584a', '#3a6ab0', '#5fd068', '#ffcc4d'][(hash(tx, ty, 20) * 4) | 0];
      R(c, x + 6, y + 3, 1, 12, C.k); R(c, x + 6, y + 8, 4, 1, bc); R(c, x + 6, y + 4, 4, 1, bc); R(c, x + 9, y + 4, 1, 5, bc);
    }
  }
  function trash(c, x, y, tx, ty, base) {
    base(c, x, y, tx, ty);
    R(c, x + 4, y + 4, 8, 11, C.k); R(c, x + 5, y + 5, 6, 9, '#3a7a4a'); R(c, x + 5, y + 5, 2, 9, '#4e9a5e');
    R(c, x + 3, y + 3, 10, 2, '#2a5a36'); R(c, x + 3, y + 3, 10, 1, C.k);
  }
  // Fodboldmål set fra oven: hvidt stel ud mod banen, net bagved
  function goal(c, x, y, tx, ty, map) {
    asphalt(c, x, y, tx, ty);
    var openRight = map.at(tx + 1, ty) === 'a', up = map.at(tx, ty - 1) === 'G', dn = map.at(tx, ty + 1) === 'G';
    var nx = openRight ? x + 2 : x + 6, fx = openRight ? x + 11 : x + 3;
    for (var j = 0; j < 16; j += 2) for (var i = 0; i < 8; i += 2) P(c, nx + i, y + j, '#d8dce8');
    R(c, fx, y + (up ? 0 : 2), 2, (up ? 0 : -2) + (dn ? 16 : 14), '#f4f4f0');
    if (!up) R(c, Math.min(nx, fx), y + 2, 11, 2, '#f4f4f0');
    if (!dn) R(c, Math.min(nx, fx), y + 12, 11, 2, '#f4f4f0');
  }
  function slide(c, x, y, tx, ty) {
    sand(c, x, y, tx, ty);
    R(c, x + 2, y + 1, 4, 14, C.k); R(c, x + 3, y + 2, 2, 12, '#3a6ab0');
    for (var i = 0; i < 4; i++) R(c, x + 2, y + 3 + i * 3, 4, 1, '#d8dce8');
    R(c, x + 7, y + 1, 6, 14, C.k); R(c, x + 8, y + 2, 4, 12, '#e8b030'); R(c, x + 8, y + 2, 1, 12, '#ffe070');
  }
  function swing(c, x, y, tx, ty) {
    sand(c, x, y, tx, ty);
    R(c, x + 1, y + 1, 14, 2, '#d8584a'); R(c, x + 1, y + 1, 2, 14, '#d8584a'); R(c, x + 13, y + 1, 2, 14, '#d8584a');
    R(c, x + 5, y + 3, 1, 7, C.s2); R(c, x + 10, y + 3, 1, 7, C.s2); R(c, x + 4, y + 10, 8, 2, C.k);
  }
  // Den røde danske postkasse
  function mailbox(c, x, y, tx, ty, base) {
    base(c, x, y, tx, ty);
    R(c, x + 7, y + 10, 2, 6, C.s0);
    R(c, x + 4, y + 2, 8, 9, C.k); R(c, x + 5, y + 3, 6, 7, '#c8282e'); R(c, x + 5, y + 3, 6, 1, '#e8504a');
    R(c, x + 6, y + 5, 4, 1, C.k); P(c, x + 7, y + 7, '#ffd84a'); P(c, x + 8, y + 7, '#ffd84a'); P(c, x + 7, y + 8, '#ffd84a');
  }
  function busShelter(c, x, y, tx, ty, map) {
    sidewalk(c, x, y, tx, ty, map);
    var lf = map.at(tx - 1, ty) !== 'u', rt = map.at(tx + 1, ty) !== 'u';
    R(c, x, y + 1, T, 3, C.s0); R(c, x, y + 1, T, 1, C.k);
    R(c, x, y + 4, T, 8, 'rgba(160,210,240,.55)');
    if (lf) R(c, x, y + 1, 2, 14, C.s0);
    if (rt) R(c, x + 14, y + 1, 2, 14, C.s0);
    R(c, x + (lf ? 2 : 0), y + 10, 14 - (rt ? 0 : 0), 2, C.wd2);
    if (lf) { R(c, x + 3, y + 5, 7, 5, '#ffcc4d'); RH.pixText(c, x + 4, y + 5, 'BUS', C.k); }
  }
  // Parkerede biler: to felter, der hører sammen
  function car(c, x, y, tx, ty, map) {
    asphalt(c, x, y, tx, ty);
    var left = map.at(tx + 1, ty) === '1' && map.at(tx - 1, ty) !== '1';
    var ax = left ? tx : tx - 1, col = ['#c8282e', '#2c4a9c', '#e8e0d0', '#3a3a46', '#5fa05a', '#e0a82c'][(hash(ax, ty, 3) * 6) | 0];
    var ox = left ? x + 2 : x - 14;
    c.save(); c.beginPath(); c.rect(x, y, T, T); c.clip();
    R(c, ox, y + 3, 28, 11, C.k); R(c, ox + 1, y + 4, 26, 9, col); R(c, ox + 1, y + 4, 26, 2, shade(col, 1.3));
    R(c, ox + 8, y + 5, 12, 7, C.k); R(c, ox + 9, y + 6, 4, 5, '#9ac8f0'); R(c, ox + 15, y + 6, 4, 5, '#9ac8f0');
    R(c, ox + 3, y + 2, 4, 2, C.k); R(c, ox + 21, y + 2, 4, 2, C.k); R(c, ox + 3, y + 13, 4, 2, C.k); R(c, ox + 21, y + 13, 4, 2, C.k);
    c.restore();
  }
  function signPost(c, x, y, tx, ty, base) {
    base(c, x, y, tx, ty);
    R(c, x + 7, y + 8, 2, 8, C.s0);
    R(c, x + 1, y + 1, 14, 9, C.k); R(c, x + 2, y + 2, 12, 7, '#f4f0e4');
    R(c, x + 4, y + 4, 8, 1, C.s1); R(c, x + 4, y + 6, 6, 1, C.s1);
  }
  function fence(c, x, y, tx, ty, map) {
    var base = baseFor(map, tx, ty); base(c, x, y, tx, ty, map);
    var vert = map.at(tx, ty - 1) === 'F' || map.at(tx, ty + 1) === 'F' || map.at(tx, ty - 1) === 'g' || map.at(tx, ty + 1) === 'g';
    var horiz = 'Fg'.indexOf(map.at(tx - 1, ty)) >= 0 || 'Fg'.indexOf(map.at(tx + 1, ty)) >= 0;
    var col = '#2e5e3e', light = '#4a8a5a';
    if (horiz || !vert) {
      R(c, x, y + 5, T, 1, light); R(c, x, y + 12, T, 1, col);
      for (var i = 0; i < 16; i += 3) R(c, x + i, y + 5, 1, 8, col);
      R(c, x, y + 3, 2, 12, C.k); R(c, x + 1, y + 3, 1, 12, light);
    }
    if (vert) {
      R(c, x + 6, y, 1, T, light); R(c, x + 9, y, 1, T, col);
      for (var j = 0; j < 16; j += 3) R(c, x + 6, y + j, 4, 1, col);
      R(c, x + 5, y, 6, 2, C.k);
    }
  }
  function gate(c, x, y, tx, ty, open, map) {
    sidewalk(c, x, y, tx, ty, map);
    if (open) { R(c, x, y, 2, T, '#2e5e3e'); R(c, x + 14, y, 2, T, '#2e5e3e'); return; }
    R(c, x, y + 3, T, 11, C.k); R(c, x, y + 4, T, 2, '#4a8a5a'); R(c, x, y + 11, T, 2, '#2e5e3e');
    for (var i = 1; i < 16; i += 3) R(c, x + i, y + 4, 1, 9, '#4a8a5a');
    R(c, x + 12, y + 7, 2, 3, C.y1);
  }
  function planter(c, x, y, tx, ty, base) {
    base(c, x, y, tx, ty);
    R(c, x + 3, y + 8, 10, 8, C.k); R(c, x + 4, y + 9, 8, 6, '#b8603a'); R(c, x + 4, y + 9, 8, 1, '#d8805a');
    R(c, x + 3, y + 3, 10, 6, C.g0); R(c, x + 4, y + 2, 4, 3, C.g1); R(c, x + 8, y + 3, 4, 3, C.g2); P(c, x + 6, y + 3, C.g3);
    P(c, x + 5, y + 5, C.r2); P(c, x + 10, y + 4, C.y2);
  }

  // ---------------------------------------------------------------- indendørs gulve og vægge
  function woodFloor(c, x, y, tx, ty) {
    R(c, x, y, T, T, C.wd2);
    for (var i = 0; i < 4; i++) R(c, x, y + i * 4 + 3, T, 1, C.wd1);
    var j = (hash(tx, ty, 3) * 12 | 0) + 2; R(c, x + j, y, 1, 3, C.wd1); R(c, x + ((j + 7) % 14) + 1, y + 8, 1, 3, C.wd1);
    P(c, x + 3, y + 1, C.wd3); P(c, x + 11, y + 9, C.wd3);
  }
  function lino(c, x, y, tx, ty) {
    R(c, x, y, T, T, C.lino1);
    for (var i = 0; i < 6; i++) P(c, x + (hash(tx, ty, i) * 16 | 0), y + (hash(tx, ty, i + 6) * 16 | 0), i % 2 ? C.lino0 : C.lino2);
    R(c, x, y + 15, T, 1, C.lino0); R(c, x + 15, y, 1, T, C.lino0);
  }
  function shopFloor(c, x, y, tx, ty) {
    R(c, x, y, T, T, '#e4e2ea'); R(c, x, y + 7, T, 1, '#cbc9d4'); R(c, x + 7, y, 1, T, '#cbc9d4'); R(c, x, y + 15, T, 1, '#cbc9d4'); R(c, x + 15, y, 1, T, '#cbc9d4');
    if (hash(tx, ty, 2) < 0.2) P(c, x + 3, y + 3, '#f4f4f8');
  }
  function kitchenFloor(c, x, y) {
    R(c, x, y, T, T, '#ece4d4'); R(c, x, y, 8, 8, '#c9b9a0'); R(c, x + 8, y + 8, 8, 8, '#c9b9a0');
  }
  var WALL = {
    hjem: { base: '#e8d4b8', stripe: '#dcc3a2', top: C.wd1, skirt: '#a07850' },
    skole: { base: '#d6dae6', stripe: '#d6dae6', band: '#5a7ec8', top: '#8a92a8', skirt: '#6a7088' },
    butik: { base: '#eeedf2', stripe: '#eeedf2', band: '#3a9a5a', top: '#9a9aa8', skirt: '#6a6a78' },
    bib: { base: '#d8c8a4', stripe: '#ccba92', top: C.wd0, skirt: C.wd1 }
  };
  function iwall(c, x, y, tx, ty, map) {
    var W = WALL[map.wall] || WALL.hjem;
    R(c, x, y, T, T, W.base);
    if (W.stripe !== W.base) for (var i = 0; i < 16; i += 4) R(c, x + i, y, 2, T, W.stripe);
    if (W.band) R(c, x, y + 8, T, 2, W.band);
    if (map.at(tx, ty - 1) !== 'X' || ty === 0) R(c, x, y, T, 3, W.top);
    if (map.at(tx, ty + 1) !== 'X' && 'XEI'.indexOf(map.at(tx, ty + 1)) < 0) { R(c, x, y + 12, T, 4, W.skirt); R(c, x, y + 12, T, 1, shade(W.skirt, 1.4)); }
  }
  function exitMat(c, x, y, tx, ty, floor) {
    floor(c, x, y, tx, ty);
    R(c, x + 2, y + 4, 12, 10, C.r0); R(c, x + 3, y + 5, 10, 8, C.r1);
    R(c, x + 6, y + 7, 4, 1, C.y2); R(c, x + 7, y + 8, 2, 3, C.y2);
  }
  function rug(c, x, y, tx, ty, map) {
    var a = map.rug || [C.rug, C.rug2];
    R(c, x, y, T, T, a[0]);
    var up = map.at(tx, ty - 1) !== 'Z', dn = map.at(tx, ty + 1) !== 'Z', lf = map.at(tx - 1, ty) !== 'Z', rt = map.at(tx + 1, ty) !== 'Z';
    if (up) R(c, x, y + 1, T, 2, a[1]); if (dn) R(c, x, y + 13, T, 2, a[1]);
    if (lf) R(c, x + 1, y, 2, T, a[1]); if (rt) R(c, x + 13, y, 2, T, a[1]);
    if ((tx + ty) % 2) P(c, x + 8, y + 8, a[1]);
  }

  // ---------------------------------------------------------------- møbler
  function bed(c, x, y, tx, ty, map, fl) {
    fl(c, x, y, tx, ty);
    var top = map.at(tx, ty - 1) !== 'b';
    if (top) {
      R(c, x + 1, y + 1, 14, 15, C.k); R(c, x + 2, y + 2, 12, 3, C.wd2); R(c, x + 2, y + 5, 12, 11, '#f4f0e8');
      R(c, x + 4, y + 6, 8, 5, '#ffffff'); R(c, x + 4, y + 10, 8, 1, '#d8d4cc'); R(c, x + 2, y + 13, 12, 3, '#5a8ad8');
    } else {
      R(c, x + 1, y, 14, 15, C.k); R(c, x + 2, y, 12, 13, '#5a8ad8'); R(c, x + 2, y, 12, 2, '#8ab0ec');
      for (var i = 0; i < 3; i++) P(c, x + 4 + i * 4, y + 6, '#ffcc4d');
      R(c, x + 2, y + 13, 12, 1, C.wd1);
    }
  }
  function desk(c, x, y, tx, ty, map, fl) {
    fl(c, x, y, tx, ty);
    var lf = map.at(tx - 1, ty) !== 'd', rt = map.at(tx + 1, ty) !== 'd';
    R(c, x + (lf ? 1 : 0), y + 4, 16 - (lf ? 1 : 0) - (rt ? 1 : 0), 11, C.k);
    R(c, x + (lf ? 2 : 0), y + 5, 16 - (lf ? 2 : 0) - (rt ? 2 : 0), 4, C.wd3); R(c, x + (lf ? 2 : 0), y + 9, 16 - (lf ? 2 : 0) - (rt ? 2 : 0), 5, C.wd2);
    if (lf) { R(c, x + 3, y + 1, 2, 5, C.s0); R(c, x + 2, y + 1, 5, 2, '#ffcc4d'); R(c, x + 8, y + 5, 6, 3, '#f4f4f0'); P(c, x + 9, y + 6, C.b2); }
    if (rt) { R(c, x + 3, y + 3, 9, 6, C.k); R(c, x + 4, y + 4, 7, 4, '#d0603a'); R(c, x + 5, y + 2, 5, 2, '#a04a2a'); }
  }
  function chair(c, x, y, tx, ty, fl) {
    fl(c, x, y, tx, ty);
    R(c, x + 4, y + 2, 8, 6, C.k); R(c, x + 5, y + 3, 6, 4, C.wd2); R(c, x + 4, y + 8, 8, 3, C.wd1); R(c, x + 4, y + 11, 2, 4, C.wd0); R(c, x + 10, y + 11, 2, 4, C.wd0);
  }
  function table(c, x, y, tx, ty, map, fl, ch) {
    fl(c, x, y, tx, ty);
    ch = ch || 'w';
    var lf = map.at(tx - 1, ty) !== ch, rt = map.at(tx + 1, ty) !== ch;
    var x0 = lf ? 1 : 0, x1 = rt ? 15 : 16;
    R(c, x + x0, y + 3, x1 - x0, 9, C.k); R(c, x + x0 + (lf ? 1 : 0), y + 4, x1 - x0 - (lf ? 1 : 0) - (rt ? 1 : 0), 6, ch === '&' ? '#d8dce4' : C.wd3);
    R(c, x + x0 + (lf ? 1 : 0), y + 9, x1 - x0 - (lf ? 1 : 0) - (rt ? 1 : 0), 1, ch === '&' ? '#a8acb8' : C.wd1);
    if (lf) R(c, x + 2, y + 11, 2, 4, C.wd0);
    if (rt) R(c, x + 12, y + 11, 2, 4, C.wd0);
    var h = hash(tx, ty, 6);
    if (ch === '&') { if (h < 0.5) { R(c, x + 4, y + 5, 6, 4, '#f4f4f0'); R(c, x + 5, y + 6, 3, 2, ['#d8584a', '#ffcc4d', '#5fd068'][(h * 6) | 0]); } }
    else if (h < 0.35) { R(c, x + 5, y + 5, 3, 3, C.wh); P(c, x + 6, y + 6, C.y1); } else if (h < 0.6) R(c, x + 9, y + 4, 2, 4, C.y1);
  }
  function shelf(c, x, y, tx, ty) {
    R(c, x, y, T, T, C.wd1);
    R(c, x + 1, y + 1, 14, 15, C.wd0);
    for (var r = 0; r < 3; r++) {
      R(c, x + 1, y + 5 + r * 5, 14, 1, C.wd2);
      for (var b = 0; b < 5; b++) R(c, x + 2 + b * 3, y + 1 + r * 5, 2, 4, [C.r1, C.b1, C.n1, C.p1, C.y0, C.wd3, '#d8584a'][(hash(tx * 5 + b, ty + r) * 7) | 0]);
    }
  }
  function fridge(c, x, y) {
    R(c, x + 2, y, 12, 16, C.k); R(c, x + 3, y + 1, 10, 14, '#eef0f4'); R(c, x + 3, y + 6, 10, 1, '#b8bcc8');
    R(c, x + 11, y + 2, 1, 3, '#8a8e9a'); R(c, x + 11, y + 8, 1, 4, '#8a8e9a');
    R(c, x + 4, y + 8, 4, 4, '#ffcc4d'); P(c, x + 5, y + 9, '#d8584a'); P(c, x + 6, y + 10, '#3a6ab0');   // Idas tegning
  }
  function stove(c, x, y) {
    R(c, x + 1, y + 1, 14, 15, C.k); R(c, x + 2, y + 2, 12, 13, '#d8dce4');
    R(c, x + 3, y + 3, 4, 3, C.k); R(c, x + 9, y + 3, 4, 3, C.k); R(c, x + 3, y + 7, 4, 3, C.k); R(c, x + 9, y + 7, 4, 3, '#d8584a');
    R(c, x + 3, y + 11, 10, 3, C.k); R(c, x + 4, y + 12, 8, 1, '#ffcc4d');
  }
  function counter(c, x, y, tx, ty) {
    R(c, x, y, T, T, '#e8e0d0');
    R(c, x, y + 2, 16, 14, C.k); R(c, x, y + 3, 16, 3, '#c8c4bc'); R(c, x, y + 6, 16, 9, '#f0ece4');
    R(c, x + 7, y + 6, 1, 9, '#c8c4bc'); P(c, x + 5, y + 9, C.s1); P(c, x + 10, y + 9, C.s1);
    if (hash(tx, ty, 8) < 0.4) { R(c, x + 3, y, 3, 4, C.k); R(c, x + 4, y + 1, 1, 2, '#ffcc4d'); }
  }
  function sink(c, x, y, tx, ty) {
    counter(c, x, y, tx, ty);
    R(c, x + 3, y + 2, 10, 4, '#8a8e9a'); R(c, x + 4, y + 3, 8, 2, '#b8d8f0'); R(c, x + 7, y, 2, 3, '#8a8e9a');
  }
  function sofa(c, x, y, tx, ty, map, fl) {
    fl(c, x, y, tx, ty);
    var lf = map.at(tx - 1, ty) !== 'o', rt = map.at(tx + 1, ty) !== 'o', col = '#5a7a9a';
    R(c, x + (lf ? 1 : 0), y + 3, 16 - (lf ? 1 : 0) - (rt ? 1 : 0), 12, C.k);
    R(c, x + (lf ? 2 : 0), y + 4, 16 - (lf ? 2 : 0) - (rt ? 2 : 0), 5, shade(col, 0.8));
    R(c, x + (lf ? 2 : 0), y + 9, 16 - (lf ? 2 : 0) - (rt ? 2 : 0), 5, col);
    if (lf) R(c, x + 2, y + 4, 3, 10, shade(col, 0.7));
    if (rt) R(c, x + 11, y + 4, 3, 10, shade(col, 0.7));
    if (hash(tx, ty, 1) < 0.5) R(c, x + 6, y + 5, 4, 4, '#ffcc4d');
  }
  function tv(c, x, y, tx, ty, fl) {
    fl(c, x, y, tx, ty);
    R(c, x + 1, y + 9, 14, 6, C.k); R(c, x + 2, y + 10, 12, 4, C.wd2);
    R(c, x + 1, y + 1, 14, 9, C.k); R(c, x + 2, y + 2, 12, 7, '#2a2e3e'); R(c, x + 3, y + 3, 3, 2, '#4a5068');
  }
  function plant(c, x, y, tx, ty, fl) {
    fl(c, x, y, tx, ty);
    R(c, x + 5, y + 10, 6, 5, C.k); R(c, x + 6, y + 11, 4, 3, '#c86a3a');
    R(c, x + 3, y + 3, 10, 8, C.g0); R(c, x + 4, y + 2, 3, 4, C.g2); R(c, x + 9, y + 3, 3, 4, C.g1); P(c, x + 7, y + 4, C.g3); P(c, x + 5, y + 7, C.g3);
  }
  function locker(c, x, y, tx, ty) {
    var col = ['#3a6ab0', '#d8584a', '#e0a82c', '#3a9a5a'][(tx >> 1) % 4];
    R(c, x, y, T, T, C.k); R(c, x + 1, y + 1, 6, 15, col); R(c, x + 9, y + 1, 6, 15, col);
    R(c, x + 2, y + 3, 4, 1, shade(col, 0.6)); R(c, x + 2, y + 5, 4, 1, shade(col, 0.6)); R(c, x + 10, y + 3, 4, 1, shade(col, 0.6)); R(c, x + 10, y + 5, 4, 1, shade(col, 0.6));
    P(c, x + 5, y + 9, '#e8e8f0'); P(c, x + 13, y + 9, '#e8e8f0');
  }
  function whiteboard(c, x, y, tx, ty, map) {
    iwall(c, x, y, tx, ty, map);
    var lf = map.at(tx - 1, ty) !== '[', rt = map.at(tx + 1, ty) !== '[';
    R(c, x + (lf ? 1 : 0), y + 2, 16 - (lf ? 1 : 0) - (rt ? 1 : 0), 12, '#8a8e9a');
    R(c, x + (lf ? 2 : 0), y + 3, 16 - (lf ? 2 : 0) - (rt ? 2 : 0), 9, '#f8f8fa');
    if (map.cutscene || hash(tx, ty, 2) < 0.7) { R(c, x + 3, y + 5, 6, 1, '#3a6ab0'); R(c, x + 3, y + 8, 9, 1, '#3a6ab0'); P(c, x + 11, y + 5, '#d8584a'); }
    R(c, x, y + 13, 16, 1, '#6a6e7a');
  }
  function serviceDesk(c, x, y, tx, ty, map, fl) {
    fl(c, x, y, tx, ty);
    var lf = map.at(tx - 1, ty) !== 'e', rt = map.at(tx + 1, ty) !== 'e';
    R(c, x + (lf ? 1 : 0), y + 4, 16 - (lf ? 1 : 0) - (rt ? 1 : 0), 11, C.k);
    R(c, x + (lf ? 2 : 0), y + 5, 16 - (lf ? 2 : 0) - (rt ? 2 : 0), 3, C.wd3);
    R(c, x + (lf ? 2 : 0), y + 8, 16 - (lf ? 2 : 0) - (rt ? 2 : 0), 6, C.wd1);
    if (lf) { R(c, x + 4, y + 2, 5, 4, '#f4f4f0'); R(c, x + 5, y + 3, 3, 1, C.s1); }
    if (rt) { R(c, x + 6, y + 1, 6, 5, C.k); R(c, x + 7, y + 2, 4, 3, '#4a5068'); }
  }
  function studentDesk(c, x, y, tx, ty, map, fl) {
    fl(c, x, y, tx, ty);
    var lf = map.at(tx - 1, ty) !== 'U', rt = map.at(tx + 1, ty) !== 'U';
    R(c, x + (lf ? 1 : 0), y + 2, 16 - (lf ? 1 : 0) - (rt ? 1 : 0), 8, C.k);
    R(c, x + (lf ? 2 : 0), y + 3, 16 - (lf ? 2 : 0) - (rt ? 2 : 0), 5, '#d8b888');
    if (lf) R(c, x + 2, y + 10, 2, 5, C.s1);
    if (rt) R(c, x + 12, y + 10, 2, 5, C.s1);
    if (hash(tx, ty, 4) < 0.6) { R(c, x + 5, y + 4, 5, 3, '#f4f4f0'); P(c, x + 6, y + 5, C.s1); }
  }
  function shopShelf(c, x, y, tx, ty) {
    R(c, x, y, T, T, '#e4e2ea');
    R(c, x, y + 1, T, 14, C.k); R(c, x, y + 2, T, 12, '#c8c8d0');
    var cols = ['#d8584a', '#ffcc4d', '#5fd068', '#f4ecdc', '#c86a2a', '#5a7ed4', '#e884a8', '#8c60b8'];
    for (var r = 0; r < 2; r++) {
      R(c, x, y + 7 + r * 6, T, 1, '#8a8a96');
      for (var b = 0; b < 4; b++) R(c, x + 1 + b * 4, y + 3 + r * 6, 3, 4, cols[(hash(tx * 4 + b, ty * 2 + r, 1) * cols.length) | 0]);
    }
  }
  function freezer(c, x, y, tx, ty) {
    R(c, x, y, T, T, '#e4e2ea');
    R(c, x, y + 2, T, 13, C.k); R(c, x, y + 3, T, 11, '#f0f2f6'); R(c, x + 1, y + 4, 14, 6, '#9ad0f0'); R(c, x + 1, y + 4, 14, 1, '#d8f0fc');
    for (var b = 0; b < 4; b++) R(c, x + 2 + b * 3, y + 6, 2, 3, ['#f4ecdc', '#e884a8', '#ffcc4d', '#d8584a'][(hash(tx + b, ty, 3) * 4) | 0]);
  }
  function produce(c, x, y, tx, ty) {
    R(c, x, y, T, T, '#e4e2ea');
    R(c, x + 1, y + 3, 14, 12, C.k); R(c, x + 2, y + 4, 12, 10, C.wd2);
    var kind = (hash(tx, ty, 4) * 3) | 0, col = ['#d8303a', '#ffd84a', '#5fd068'][kind];
    for (var i = 0; i < 6; i++) { var px = x + 3 + (i % 3) * 4, py = y + 5 + (i / 3 | 0) * 4; R(c, px, py, 3, 3, col); P(c, px, py, shade(col, 1.4)); }
  }
  function checkout(c, x, y, tx, ty, map) {
    shopFloor(c, x, y, tx, ty);
    var lf = map.at(tx - 1, ty) !== '$';
    R(c, x, y + 3, T, 11, C.k); R(c, x, y + 4, T, 9, '#d8dce4');
    if (lf) { R(c, x + 2, y + 5, 12, 6, '#3e3e4a'); for (var i = 0; i < 12; i += 3) R(c, x + 2 + i, y + 5, 1, 6, '#5a5a68'); }
    else { R(c, x + 4, y, 8, 7, C.k); R(c, x + 5, y + 1, 6, 4, '#4a8a5a'); R(c, x + 5, y + 2, 4, 1, '#a8f0b8'); }
  }
  function noticeboard(c, x, y, tx, ty, map) {
    iwall(c, x, y, tx, ty, map);
    R(c, x + 1, y + 2, 14, 11, C.wd0); R(c, x + 2, y + 3, 12, 9, '#c89a5a');
    R(c, x + 3, y + 4, 4, 5, C.wh); R(c, x + 8, y + 4, 3, 4, '#f0d890'); R(c, x + 11, y + 5, 2, 5, '#a8d8f0');
    P(c, x + 4, y + 4, C.r1); P(c, x + 9, y + 4, C.r1); P(c, x + 11, y + 5, C.r1);
  }
  function picture(c, x, y, tx, ty, map) {
    iwall(c, x, y, tx, ty, map);
    R(c, x + 3, y + 2, 10, 8, C.wd0); R(c, x + 4, y + 3, 8, 6, '#9ad0f0'); R(c, x + 4, y + 6, 8, 3, '#5f9e4c'); P(c, x + 9, y + 4, '#ffe070');
  }
  function iwindow(c, x, y, tx, ty, map) {
    iwall(c, x, y, tx, ty, map);
    R(c, x + 2, y + 2, 12, 9, '#f4f4f0'); R(c, x + 3, y + 3, 10, 7, map.cutscene ? '#8a98b0' : '#9ad0f0'); R(c, x + 7, y + 3, 2, 7, '#f4f4f0');
    if (map.cutscene) for (var i = 0; i < 4; i++) P(c, x + 4 + i * 2, y + 4 + (i % 2) * 3, '#d8e0ee');   // regn på ruden i går
  }
  function idoor(c, x, y, tx, ty, map, open) {
    iwall(c, x, y, tx, ty, map);
    R(c, x + 2, y + 1, 12, 15, C.k);
    if (open) { R(c, x + 3, y + 2, 10, 14, '#4a4256'); return; }
    R(c, x + 3, y + 2, 10, 14, '#b8804a'); R(c, x + 3, y + 2, 10, 1, '#d8a06a'); R(c, x + 5, y + 4, 6, 4, '#c4e2f8');
    P(c, x + 11, y + 10, C.y2);
  }

  // Hvilket gulv ligger der under en ting ude i verden?
  function baseFor(map, tx, ty) {
    if (map.floor === 'wood') return woodFloor;
    if (map.floor === 'lino') return lino;
    if (map.floor === 'shop') return shopFloor;
    if (map.floor === 'kitchen') return kitchenFloor;
    var n = [map.at(tx, ty + 1), map.at(tx - 1, ty), map.at(tx + 1, ty), map.at(tx, ty - 1)];
    for (var i = 0; i < n.length; i++) {
      if (n[i] === '=') return function (c, x, y, a, b) { sidewalk(c, x, y, a, b, null); };
      if (n[i] === 'a') return asphalt;
      if (n[i] === ':') return gravel;
      if (n[i] === 'f') return sand;
      if (n[i] === '.' || n[i] === ',') return grass;
    }
    return grass;
  }
  // Indendørs kan gulvet skifte inden for samme rum (køkkenet har fliser)
  function floorAt(map, tx, ty) {
    if (map.id !== 'hjem') return baseFor(map, tx, ty);
    var n = [map.at(tx, ty + 1), map.at(tx - 1, ty), map.at(tx + 1, ty)];
    for (var i = 0; i < n.length; i++) { if (n[i] === '"') return kitchenFloor; if (n[i] === '_' || n[i] === 'Z') return woodFloor; }
    return woodFloor;
  }

  RH.drawTile = function (c, map, tx, ty, f) {
    var ch = map.at(tx, ty), x = tx * T, y = ty * T, fl = floorAt(map, tx, ty), base = baseFor(map, tx, ty);
    switch (ch) {
      case '.': grass(c, x, y, tx, ty); break;
      case ',': flowers(c, x, y, tx, ty); break;
      case ':': gravel(c, x, y, tx, ty); break;
      case '=': sidewalk(c, x, y, tx, ty, map); break;
      case 'a': asphalt(c, x, y, tx, ty); break;
      case '-': roadLine(c, x, y, tx, ty); break;
      case 'x': zebra(c, x, y, tx, ty); break;
      case 'f': sand(c, x, y, tx, ty); break;
      case '~': water(c, x, y, tx, ty, f, map); break;
      case 'T': tree(c, x, y, tx, ty, base); break;
      case 't': bush(c, x, y, tx, ty); break;
      case 'h': hedge(c, x, y, tx, ty, map); break;
      case 'F': fence(c, x, y, tx, ty, map); break;
      case 'g': gate(c, x, y, tx, ty, map.isOpen(tx, ty), map); break;
      case 'l': lamp(c, x, y, tx, ty, base); break;
      case 'B': bench(c, x, y, tx, ty, map, base); break;
      case 'k': bikeRack(c, x, y, tx, ty, base); break;
      case 'c': trash(c, x, y, tx, ty, base); break;
      case 'G': goal(c, x, y, tx, ty, map); break;
      case 'P': slide(c, x, y, tx, ty); break;
      case 'S': swing(c, x, y, tx, ty); break;
      case 'm': mailbox(c, x, y, tx, ty, base); break;
      case 'u': busShelter(c, x, y, tx, ty, map); break;
      case '1': car(c, x, y, tx, ty, map); break;
      case 's': signPost(c, x, y, tx, ty, base); break;
      case 'j': planter(c, x, y, tx, ty, map.outdoor ? base : fl); break;
      case 'R': roof(c, x, y, tx, ty, [C.r0, C.r1, C.r2], map, ch); break;
      case 'K': roof(c, x, y, tx, ty, [C.sl0, C.sl1, C.sl2], map, ch); break;
      case 'L': flatRoof(c, x, y, tx, ty, map); break;
      case 'W': case 'Y': case 'M': wallBase(c, x, y, tx, ty, ch, map); break;
      case 'O': windowT(c, x, y, tx, ty, map); break;
      case 'Q': shopWindow(c, x, y, tx, ty, map); break;
      case 'D': door(c, x, y, tx, ty, map); break;
      case 'A': kioskHatch(c, x, y, tx, ty, map); break;
      // indendørs
      case '_': woodFloor(c, x, y, tx, ty); break;
      case ';': lino(c, x, y, tx, ty); break;
      case '+': shopFloor(c, x, y, tx, ty); break;
      case '"': kitchenFloor(c, x, y); break;
      case 'X': iwall(c, x, y, tx, ty, map); break;
      case 'E': exitMat(c, x, y, tx, ty, fl); break;
      case 'Z': rug(c, x, y, tx, ty, map); break;
      case 'b': bed(c, x, y, tx, ty, map, fl); break;
      case 'd': desk(c, x, y, tx, ty, map, fl); break;
      case 'q': chair(c, x, y, tx, ty, fl); break;
      case 'w': table(c, x, y, tx, ty, map, fl, 'w'); break;
      case '&': table(c, x, y, tx, ty, map, fl, '&'); break;
      case 'H': shelf(c, x, y, tx, ty); break;
      case 'n': fridge(c, x, y); break;
      case 'v': stove(c, x, y); break;
      case 'C': counter(c, x, y, tx, ty); break;
      case 'i': sink(c, x, y, tx, ty); break;
      case 'o': sofa(c, x, y, tx, ty, map, fl); break;
      case 'V': tv(c, x, y, tx, ty, fl); break;
      case 'y': locker(c, x, y, tx, ty); break;
      case '[': whiteboard(c, x, y, tx, ty, map); break;
      case 'e': serviceDesk(c, x, y, tx, ty, map, fl); break;
      case 'U': studentDesk(c, x, y, tx, ty, map, fl); break;
      case 'p': shopShelf(c, x, y, tx, ty); break;
      case 'z': freezer(c, x, y, tx, ty); break;
      case 'r': produce(c, x, y, tx, ty); break;
      case '$': checkout(c, x, y, tx, ty, map); break;
      case 'N': noticeboard(c, x, y, tx, ty, map); break;
      case 'J': picture(c, x, y, tx, ty, map); break;
      case '%': iwindow(c, x, y, tx, ty, map); break;
      case 'I': idoor(c, x, y, tx, ty, map, map.isOpen(tx, ty)); break;
      default: R(c, x, y, T, T, '#000');
    }
  };

  // Skilte med pixelbogstaver (KØBMAND, SKOLE ...) lægges oven på kortet
  RH.drawSigns = function (c, map) {
    (map.signs || []).forEach(function (s) {
      var w = RH.pixTextWidth(s.text) + 6, x = Math.round(s.x - w / 2), y = s.y;
      R(c, x - 1, y - 1, w + 2, 9, C.k); R(c, x, y, w, 7, s.bg); R(c, x, y, w, 1, shade(s.bg, 1.3));
      RH.pixText(c, x + 3, y + 1, s.text, s.fg);
    });
  };

  // ---------------------------------------------------------------- effekter
  RH.drawMarker = function (c, x, y, kind, t) {
    var bob = Math.floor(t / 16) % 2;
    var col = kind === '!' ? C.y2 : kind === '?' ? '#9ad0ff' : C.wh;
    y -= bob;
    R(c, x + 5, y, 6, 9, C.k);
    R(c, x + 6, y + 1, 4, 7, col);
    if (kind === '!') { R(c, x + 7, y + 2, 2, 3, C.k); R(c, x + 7, y + 6, 2, 1, C.k); }
    else { R(c, x + 7, y + 2, 2, 1, C.k); P(c, x + 8, y + 3, C.k); R(c, x + 7, y + 4, 1, 1, C.k); R(c, x + 7, y + 6, 1, 1, C.k); }
  };
  RH.drawSparkle = function (c, x, y, t, col) {
    var f = Math.floor(t / 10) % 4, s = [1, 2, 3, 2][f];
    col = col || '#9ad0ff';
    R(c, x + 8, y + 8 - s, 1, s * 2 + 1, col); R(c, x + 8 - s, y + 8, s * 2 + 1, 1, col);
    P(c, x + 8, y + 8, C.wh);
  };
  RH.drawShadow = function (c, x, y) { c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x + 3, y + 14, 10, 2); };
  // En lille and, der vugger på søen
  RH.drawDuck = function (c, x, y, t, flip) {
    var b = Math.floor(t / 30) % 2;
    y += b;
    var px = function (dx, dy, col) { P(c, x + (flip ? 7 - dx : dx), y + dy, col); };
    [[1, 2], [2, 2], [3, 2], [4, 2], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3]].forEach(function (p) { px(p[0], p[1], '#f4ecdc'); });
    px(4, 1, '#2c7a3c'); px(5, 1, '#2c7a3c'); px(5, 0, '#2c7a3c'); px(6, 1, '#ffb030'); px(5, 1, C.k);
    px(2, 4, 'rgba(255,255,255,.5)');
  };

  // Portræt til dialogen: figuren forstørret, set forfra
  RH.portrait = function (sheet, size) {
    var cv = canvas(size, size), c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.fillStyle = '#2a2140'; c.fillRect(0, 0, size, size);
    c.drawImage(sheet, 0, 0, 16, 16, 0, size * 0.08, size, size);
    return cv;
  };

  // ---------------------------------------------------------------- ting i tasken
  // Små pixelikoner som SVG, så de er skarpe i bogen i alle størrelser
  var ICONS = {
    fodbold: { c: { k: C.k, w: '#f8f8f4', b: '#3a3a46' }, r: ['....kkkk....', '..kkwwwwkk..', '.kwwbbbwwwk.', '.kwbbbbbwwk.', 'kwwwbbbwwwwk', 'kbwwwwwwwbbk', 'kbbwwbwwbbbk', 'kwwwbbbwwwwk', '.kwwbbbwwwk.', '.kwwwwwwwwk.', '..kkwwwwkk..', '....kkkk....'] },
    toejpose: { c: { k: C.k, p: '#d6789a', d: '#a8527a', l: '#f0bed2' }, r: ['....kkkk....', '...kd..dk...', '...k....k...', '.kkkkkkkkkk.', '.kppppppppk.', '.kplllllppk.', '.kppppppppk.', '.kppppppppk.', '.kppppppppk.', '.kddddddddk.', '.kkkkkkkkkk.', '............'] },
    guldmoent: { c: { k: C.k, y: '#eec860', d: '#bc9438', l: '#fff0b0' }, r: ['....kkkk....', '..kkyyyykk..', '.kyylyyyyyk.', '.kylyyyyydk.', 'kyyyykkyyydk', 'kyyykyykyydk', 'kyyyyykyyydk', 'kyyyykyyyydk', '.kyykkkkydk.', '.kdyyyyyddk.', '..kkddddkk..', '....kkkk....'] },
    is: { c: { k: C.k, p: '#f8bac4', w: '#ece8d2', c: '#bc7060', v: '#d6b076', d: '#a8844a' }, r: ['....kkk.....', '...kccck....', '..kkcckkkk..', '.kpppkwwwwk.', '.kpppkwwwwk.', '.kkkkkkkkkk.', '..kvvdvvdk..', '..kdvvdvvk..', '...kvvdvk...', '...kvdvvk...', '....kvvk....', '.....kk.....'] },
    kridt: { c: { k: C.k, w: '#f6f4ee', g: '#cecac0' }, r: ['............', '.....kk.....', '....kwwk....', '....kwwk....', '....kwgk....', '....kwgk....', '....kwgk....', '....kwgk....', '....kwgk....', '....kggk....', '.....kk.....', '............'] },
    pokal: { c: { k: C.k, y: '#ecc65c', d: '#d0a63e', l: '#fff0b0' }, r: ['.kkkkkkkkkk.', 'kkyylyyyyykk', 'kyklyyyyykyk', 'kykyyyyyykyk', '.kkyyyyyykk.', '..kdyyyydk..', '...kddddk...', '....kddk....', '....kddk....', '..kkddddkk..', '..kddddddk..', '..kkkkkkkk..'] },
    bog: { c: { k: C.k, p: '#6c4c94', d: '#4e3470', w: '#eeeade', l: '#a896c4' }, r: ['............', '.kkkkkkkkkk.', '.kppppkwwwk.', '.kpllpkwwwk.', '.kppppkwwwk.', '.kpllpkwwwk.', '.kppppkwwwk.', '.kppppkwwwk.', '.kppppkwwwk.', '.kddddkkkkk.', '.kkkkkkkkkk.', '............'] },
    slik: { c: { k: C.k, r: '#e45c6c', l: '#faa0ac', p: '#f094a2' }, r: ['............', '............', '.k.......k..', '.kpk.kkkkpk.', '.kppkrrrkppk', '.kppkrlrrkpk', '.kppkrrrrkpk', '.kpk.krrrkpk', '.k...kkkk.k.', '............', '............', '............'] },
    hundeben: { c: { k: C.k, w: '#e8e2ce', g: '#c4bca6' }, r: ['............', '............', '.kk......kk.', 'kwwk....kwwk', 'kwwwkkkkkwwk', '.kwwwwwwwwk.', '.kwwwwwwwwk.', 'kwwgkkkkgwwk', 'kwwk....kwwk', '.kk......kk.', '............', '............'] },
    noegle: { c: { k: C.k, y: '#ceb060', d: '#967c3e' }, r: ['............', '..kkkk......', '.kyyyyk.....', 'kyykkyyk....', 'kyk..kyk....', 'kyykkyykkkkk', '.kyyyyyyyyyk', '..kkkkkkdkyk', '........kkdk', '..........kk', '............', '............'] }
  };
  RH.iconSvg = function (id, size) {
    var I = ICONS[id]; if (!I) return '';
    var s = '<svg viewBox="0 0 12 12" width="' + (size || 48) + '" height="' + (size || 48) + '" shape-rendering="crispEdges" aria-hidden="true">';
    I.r.forEach(function (row, y) { for (var x = 0; x < 12; x++) { var col = I.c[row[x]]; if (col) s += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + col + '"/>'; } });
    return s + '</svg>';
  };
})();
