/* Learnification — den fælles figur
   Barnet har ÉN figur (navn + udseende), der bruges i Eventyrbiblioteket og i
   alle spil. Derfor ligger tegningen her ét sted og ikke i hvert spils art.js.

   Figuren er en 16x16 skabelon, hvor hvert bogstav er en rolle (hår, hud,
   trøje ...), som farves pr. figur — samme opskrift som spillenes NPC'er.
   Hatte kan lægges ovenpå (Runeborgs klasser giver fx en hat), og noget tøj
   er låst, til man har fortjent det i et spil.

     LFFigur.makeSheet(look, {hat})  -> canvas 48x64: 3 skridt x 4 retninger
     LFFigur.portrait(sheet, size)   -> canvas til dialogen
     LFFigur.STD_LOOK, tilfaeldig()  -> startudseende
     LFFigur.GENSTANDE               -> tøj, der kan låses op
     LFFigur.ren(look)               -> et look, der kun indeholder kendte værdier */
(function () {
  'use strict';
  var LFFigur = window.LFFigur = window.LFFigur || {};
  var T = 16, INK = '#1a1420';

  // ---------------------------------------------------------------- udseender
  var SKIN = ['#ffe0c4', '#f5cdaa', '#deb088', '#be8b62', '#8e6242', '#60402c'];
  var HAIRC = ['#2c221e', '#5c3a24', '#966230', '#d6a854', '#be4e34', '#464650'];
  var CLOTH = ['#487ac4', '#ce5460', '#56a86e', '#de963e', '#8c60b8', '#40b0b4', '#e884a8', '#5a6474'];
  var PANTS = ['#4e5670', '#3e4048', '#806048', '#364c6c', '#966078', '#5c6c5a'];
  var STYLES = [['kort', 'Kort'], ['lang', 'Langt'], ['kroeller', 'Krøller'], ['kasket', 'Kasket'], ['knold', 'Knold'], ['skaldet', 'Skaldet']];
  var EXTRAS = [['ingen', 'Ingen'], ['taske', 'Skoletaske'], ['briller', 'Briller'], ['briller+taske', 'Briller og taske']];
  var HATCOL = ['#c8282e', '#487ac4', '#56a86e', '#6a3a8e', '#de963e', '#2c221e'];
  LFFigur.SKIN = SKIN; LFFigur.HAIRC = HAIRC; LFFigur.CLOTH = CLOTH; LFFigur.PANTS = PANTS;
  LFFigur.STYLES = STYLES; LFFigur.EXTRAS = EXTRAS; LFFigur.HATCOL = HATCOL;
  LFFigur.STD_LOOK = { skin: SKIN[1], hair: HAIRC[3], style: 'lang', cloth: CLOTH[6], pants: PANTS[0], extra: 'taske', hatColor: '#c8282e', hat: '' };

  // Tøj, der først kan bruges, når man har fået det. "kilde" vises i klædeskabet.
  LFFigur.GENSTANDE = [
    { id: 'hat:beret', hat: 'beret', navn: 'Baret', kilde: 'Fås i Regnehelten, når du finder Tøjposen' },
    { id: 'hat:tophat', hat: 'tophat', navn: 'Høj hat', kilde: 'Fås i Regnehelten, når du klarer kapitel 1' },
    { id: 'hat:hood', hat: 'hood', navn: 'Hætte', kilde: 'Fås i Regnehelten, når du klarer kapitel 3' },
    { id: 'hat:wizard', hat: 'wizard', navn: 'Troldmandshat', kilde: 'Fås i Runeborg, når du klarer kapitel 1' },
    { id: 'hat:feather', hat: 'feather', navn: 'Fjerhat', kilde: 'Fås i Runeborg, når du klarer kapitel 2' },
    { id: 'hat:helmet', hat: 'helmet', navn: 'Hjelm', kilde: 'Fås i Runeborg, når du klarer kapitel 3' },
    { id: 'hat:krone', hat: 'krone', navn: 'Krone', kilde: 'Fås i Runeborg, når du finder alle runestykkerne' },
    { id: 'hat:hovedbaand', hat: 'hovedbaand', navn: 'Hovedbånd', kilde: 'Fås i Regnehelten, når du får fuld Regnekraft' }
  ];

  // ---------------------------------------------------------------- skabeloner
  function r8(inner) { return '...k' + inner + 'k...'; }
  function r6(inner) { return '....k' + inner + 'k....'; }

  var HEAD_DOWN = ['................', '.....kkkkkk.....', r6('hhhhhh'), r8('hhhhhhhh'), r8('hhsssshh'), r8('hsessesh'), r8('ssssssss'), r6('ssssss')];
  var HEAD_UP = ['................', '.....kkkkkk.....', r6('hhhhhh'), r8('hhhhhhhh'), r8('hhhhhhhh'), r8('hhhhhhhh'), r8('hhhhhhhh'), r6('hhhhhh')];
  var HEAD_SIDE = ['................', '.....kkkkkk.....', r6('hhhhhh'), r8('hhhhhhhh'), r8('hhhhssss'), r8('hhhhsess'), r8('hhhsssss'), r6('hsssss')];
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

  // Frisurer og ekstra ting lagt ovenpå skabelonen række for række.
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
    }
  };
  // Hatte (fra Runeborgs klasser). Ligger øverst, så de dækker frisuren.
  var HAT = {
    wizard: { 0: '.......kk.......', 1: '....._ktak_.....', 2: '...._kttttk_....', 3: '..kkttttttttkk..' },
    helmet: { 1: '.....kkkkkk.....', 2: '....ktaatttk....', 3: r8('tttttttt') },
    beret: { 1: '....kkkkkkkka...', 2: '...kttttttttak..', 3: '..kttttttttttk..' },
    tophat: { 0: '....kkkkkkkk....', 1: '....kttttttk....', 2: '....kaaaaaak....', 3: '..kkkkkkkkkkkk..' },
    feather: { 0: '..........aa....', 1: '....kkkkkkkaa...', 2: '...kttttttttk...', 3: '..kttttttttttk..' },
    hood: { 0: '......kkkk......', 1: '....kkttttkk....' },
    krone: { 0: '....k..kk..k....', 1: '...kttttttttk...', 2: '...ktatttattk...', 3: '...kkkkkkkkkk...' },
    hovedbaand: { 3: '...kttttttttk...' }
  };
  LFFigur.HATTE = Object.keys(HAT);

  function buildFrame(dir, step) {
    if (dir === 'down') return HEAD_DOWN.concat(BODY_DOWN, LEGS_FRONT[step]);
    if (dir === 'up') return HEAD_UP.concat(BODY_UP, LEGS_FRONT[step]);
    return HEAD_SIDE.concat(BODY_SIDE, LEGS_SIDE[step]);
  }

  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (f < 1) { r = r * f | 0; g = g * f | 0; b = b * f | 0; }
    else { var a = f - 1; r = Math.min(255, r + (255 - r) * a | 0); g = Math.min(255, g + (255 - g) * a | 0); b = Math.min(255, b + (255 - b) * a | 0); }
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function lookColors(L, hat) {
    var cloth = L.cloth || '#487ac4', hair = L.hair || '#5c3a24', hc = L.hatColor || shade(cloth, 0.8);
    var o = {
      k: INK, h: hair, H: shade(hair, 1.25), s: L.skin || '#f5cdaa', e: INK,
      c: cloth, d: shade(cloth, 0.72), p: L.pants || '#4e5670', b: L.shoes || '#2e2e3a',
      t: hc, a: shade(hc, 0.6), y: hair, w: '#f4f4f0',
      g: '#d0603a', G: shade('#d0603a', 0.65)
    };
    if (hat === 'hood') o.h = o.t;                               // hætten dækker håret
    if (hat === 'helmet') { o.t = '#9aa0b4'; o.a = '#e0c04a'; }  // en hjelm er af jern
    if (hat === 'wizard') { o.t = '#6a3a8e'; o.a = '#ffe070'; }
    if (hat === 'feather') { o.a = '#e8564a'; }
    if (hat === 'krone') { o.t = '#f0c040'; o.a = '#d03838'; }
    return o;
  }

  function canvas(w, h) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').imageSmoothingEnabled = false; return c;
  }
  LFFigur.canvas = canvas;

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
        c.fillStyle = col[ch2];
        c.fillRect(ox + (flip ? 15 - x2 : x2), oy + y, 1, 1);
      }
    }
  }

  // Et ark med 4 retninger x 3 skridt. Venstre er et spejlet højre.
  // opt.hat er en hat, der gælder lige nu (Runeborgs klasse) og går forud for look.hat.
  LFFigur.makeSheet = function (L, opt) {
    L = L || LFFigur.STD_LOOK;
    var hat = (opt && opt.hat) || L.hat || '';
    if (!HAT[hat]) hat = '';
    var col = lookColors(L, hat);
    var sheet = canvas(T * 3, T * 4), c = sheet.getContext('2d');
    var style = L.style || 'kort', extras = (L.extra || '').split('+').filter(Boolean);
    ['down', 'up', 'right'].forEach(function (dir, di) {
      var view = dir === 'right' ? 'side' : dir;
      for (var step = 0; step < 3; step++) {
        var rows = buildFrame(dir, step).slice(), overs = [];
        if (HAIR[style] && HAIR[style][view]) overs.push(HAIR[style][view]);
        extras.forEach(function (ex) { if (EXTRA[ex] && EXTRA[ex][view]) overs.push(EXTRA[ex][view]); });
        if (hat) overs.push(HAT[hat]);
        drawRows(c, rows, overs, col, step * T, di * T, false);
        if (dir === 'right') drawRows(c, rows, overs, col, step * T, 3 * T, true);
      }
    });
    return sheet;
  };

  // Portræt til dialogen: figuren forstørret, set forfra
  LFFigur.portrait = function (sheet, size) {
    var cv = canvas(size, size), c = cv.getContext('2d');
    c.fillStyle = '#2a2140'; c.fillRect(0, 0, size, size);
    c.drawImage(sheet, 0, 0, 16, 16, 0, size * 0.08, size, size);
    return cv;
  };

  function vaelg(a) { return a[(Math.random() * a.length) | 0]; }
  LFFigur.tilfaeldig = function () {
    return { skin: vaelg(SKIN), hair: vaelg(HAIRC), style: vaelg(STYLES)[0], cloth: vaelg(CLOTH), pants: vaelg(PANTS), extra: vaelg(EXTRAS)[0], hatColor: vaelg(HATCOL), hat: '' };
  };

  // Et look med kun kendte værdier — så en rodet eller gammel gemning aldrig tegner noget mærkeligt
  LFFigur.ren = function (L) {
    L = L || {};
    function iListe(v, liste, std) { return liste.indexOf(v) >= 0 ? v : std; }
    var std = LFFigur.STD_LOOK;
    return {
      skin: iListe(L.skin, SKIN, std.skin), hair: iListe(L.hair, HAIRC, std.hair),
      style: iListe(L.style, STYLES.map(function (s) { return s[0]; }), std.style),
      cloth: iListe(L.cloth, CLOTH, std.cloth), pants: iListe(L.pants, PANTS, std.pants),
      extra: iListe(L.extra, EXTRAS.map(function (s) { return s[0]; }), 'ingen'),
      hatColor: /^#[0-9a-f]{6}$/i.test(L.hatColor || '') ? L.hatColor : std.hatColor,
      hat: HAT[L.hat] ? L.hat : ''
    };
  };
})();
