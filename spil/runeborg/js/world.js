/* Runeborg — kortene
   Kortene bygges af små hjælpefunktioner (hus, gade, å ...) i stedet for at
   være tastet ind som tegn-gitre. Så kan et hus flyttes ved at rette ét tal.
   Hvem der står hvor, bestemmer content.js — her er kun jorden og husene. */
(function () {
  'use strict';
  var RB = window.RB = window.RB || {};

  function Map(id, w, h, fill) {
    this.id = id; this.w = w; this.h = h;
    this.rows = []; for (var y = 0; y < h; y++) { var r = []; for (var x = 0; x < w; x++) r.push(fill); this.rows.push(r); }
    this.doors = []; this.chimneys = []; this.lamps = []; this.windows = []; this.flags = {}; this.spots = {};
    this.floor = 'grass'; this.locked = {};
  }
  Map.prototype.at = function (x, y) { return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? '#' : this.rows[y][x]; };
  Map.prototype.set = function (x, y, ch) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.rows[y][x] = ch; };
  Map.prototype.rect = function (x, y, w, h, ch) { for (var j = y; j < y + h; j++) for (var i = x; i < x + w; i++) this.set(i, j, ch); };
  Map.prototype.door = function (x, y, to, tx, ty, dir) { this.doors.push({ x: x, y: y, to: to, tx: tx, ty: ty, dir: dir || 'down' }); };
  Map.prototype.doorAt = function (x, y) { for (var i = 0; i < this.doors.length; i++) if (this.doors[i].x === x && this.doors[i].y === y) return this.doors[i]; return null; };
  Map.prototype.isOpen = function (x, y) { var f = this.locked[x + ',' + y]; return f ? !!(RB.state && RB.state.flags[f]) : true; };
  Map.prototype.solid = function (x, y) {
    var ch = this.at(x, y);
    if (ch === '/') return !this.isOpen(x, y);
    if (ch === 'g') return !this.flags.gateOpen;
    if (ch === 'D') return !this.doorAt(x, y);
    return RB.SOLID.indexOf(ch) >= 0 || ch === '~' || ch === 'z';
  };

  // Et hus: tag foroven, mur forneden, dør og vinduer i nederste rækker.
  function house(m, x, y, w, h, roof, wall, doorX, opts) {
    opts = opts || {};
    var roofH = h - 2;
    m.rect(x, y, w, roofH, roof);
    m.rect(x, y + roofH, w, 2, wall);
    (opts.windows || []).forEach(function (wx) { m.set(x + wx, y + roofH, 'O'); m.windows.push([x + wx, y + roofH]); });
    if (doorX != null) m.set(x + doorX, y + h - 1, 'D');
    if (opts.chimney != null) m.chimneys.push([x + opts.chimney, y]);
  }

  // ------------------------------------------------------------------ byen
  function town() {
    var W = 48, H = 36, m = new Map('by', W, H, '.');
    m.name = 'Runeborg'; m.music = 'by'; m.outdoor = true;

    // blomster og buske strøet ud med fast tilfældighed
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var r = RB.hash(x, y, 77);
      if (r < 0.07) m.set(x, y, ',');
    }
    // skovkant hele vejen rundt
    m.rect(0, 0, W, 2, 'T'); m.rect(0, H - 2, W, 2, 'T'); m.rect(0, 0, 2, H, 'T'); m.rect(W - 2, 0, 2, H, 'T');
    [[2, 2], [3, 2], [2, 3], [44, 2], [45, 3], [2, 33], [3, 33], [44, 33], [2, 12], [2, 13]].forEach(function (p) { m.set(p[0], p[1], 'T'); });

    // Åen: Nordbækken (klar) kommer ned fra nord, Farvebækken (grøn) kommer fra farveriet i øst.
    m.rect(10, 0, 2, 8, '~');
    m.rect(0, 8, 12, 2, 'z'); m.rect(12, 8, W, 2, 'z');
    m.rect(10, 8, 2, 2, 'z');
    // bro over åen på hovedgaden
    m.rect(24, 8, 2, 2, 'H');

    // Engen nord for åen: Hildes hytte, en have og nogle træer
    house(m, 29, 2, 5, 4, 'P', 'W', 2, { windows: [0, 4], chimney: 3 });
    m.rect(35, 4, 4, 2, 'F'); m.set(34, 4, 'f'); m.set(34, 5, 'f'); m.rect(35, 3, 4, 1, 'f'); m.rect(35, 6, 4, 1, 'f'); m.set(39, 4, 'f'); m.set(39, 5, 'f');
    m.rect(24, 2, 2, 6, ':'); m.rect(26, 6, 5, 1, ':'); m.set(31, 6, ':');
    [[15, 3], [18, 5], [21, 3], [41, 2], [42, 5], [16, 6], [6, 4], [4, 6], [7, 2]].forEach(function (p) { m.set(p[0], p[1], 'T'); });
    [[13, 6], [20, 6], [37, 2]].forEach(function (p) { m.set(p[0], p[1], 't'); });
    [[19, 2], [8, 6]].forEach(function (p) { m.set(p[0], p[1], 'r'); });

    // Østmuren med porten til farveriet
    m.rect(45, 2, 1, H - 4, '#');
    m.set(45, 8, 'z'); m.set(45, 9, 'z');
    m.set(45, 17, 'g'); m.set(45, 18, 'g');
    m.rect(46, 17, 2, 2, '=');

    // Stien langs åen og gaderne
    m.rect(2, 11, 43, 1, ':');
    m.rect(24, 10, 2, 24, '=');           // hovedgaden nord-syd
    m.rect(2, 17, 43, 2, '=');            // øvre gade (mod porten)
    m.rect(2, 30, 43, 2, '=');            // nedre gade
    m.rect(17, 19, 16, 6, '=');           // torvet
    m.rect(24, 32, 2, 2, ':');

    // Øvre række huse (døre i række 16)
    house(m, 3, 12, 9, 5, 'B', 'S', 4, { windows: [1, 2, 6, 7], chimney: 7 });    // Eventyrerlauget
    house(m, 14, 12, 6, 5, 'R', 'W', 2, { windows: [0, 4], chimney: 1 });         // Sigrids hus
    house(m, 27, 13, 4, 4, 'G', 'W', 1, { windows: [3], chimney: 2 });            // lille hus
    house(m, 32, 12, 9, 5, 'R', 'W', 4, { windows: [1, 2, 6, 7], chimney: 1 });   // Den Gyldne Drage

    // Nedre række (døre i række 29)
    house(m, 3, 24, 8, 6, 'P', 'S', 3, { windows: [1, 2, 5, 6] });                // Biblioteket
    house(m, 13, 25, 6, 5, 'R', 'S', 2, { windows: [4], chimney: 1 });            // Smedjen
    house(m, 33, 25, 7, 5, 'G', 'W', 3, { windows: [1, 5], chimney: 5 });         // Alkymisten
    house(m, 41, 25, 4, 5, 'B', 'W', 1, { windows: [3] });                        // hus

    // Småting: brønd, tavle, skilte, tønder, lygter, markedsboder
    m.set(21, 21, 'w');
    [[17, 19], [32, 19], [17, 24], [32, 24], [23, 24], [26, 24]].forEach(function (p) { m.set(p[0], p[1], 'j'); });   // blomsterkasser på torvet
    m.set(28, 19, 'N');
    m.rect(18, 23, 2, 1, 'm'); m.rect(27, 23, 2, 1, 'm'); m.rect(30, 23, 2, 1, 'm');
    m.set(20, 29, 'a');
    m.set(12, 16, 's'); m.set(41, 15, 's'); m.set(11, 29, 's'); m.set(32, 29, 's'); m.set(23, 33, 's'); m.set(43, 19, 's');
    m.set(43, 13, 'b'); m.set(43, 15, 'b'); m.set(42, 12, 'c');
    m.set(31, 15, 'b'); m.set(21, 15, 'c');
    m.set(12, 26, 'b'); m.set(12, 27, 'c');
    [[16, 19], [33, 19], [16, 24], [33, 24], [23, 11], [26, 11], [6, 19], [40, 20]].forEach(function (p) { m.set(p[0], p[1], 'l'); m.lamps.push(p); });
    m.lamps.push([21, 21]);
    m.set(43, 10, 'x');                   // farveriets rør ud i åen
    [[13, 21], [14, 22], [36, 21], [38, 22], [8, 21], [42, 22], [4, 21]].forEach(function (p) { m.set(p[0], p[1], 't'); });
    [[11, 21], [9, 22], [39, 21], [35, 22], [42, 21]].forEach(function (p) { m.set(p[0], p[1], ','); });

    // Døre ind
    m.door(7, 16, 'laug', 6, 8, 'up');
    m.door(36, 16, 'kro', 8, 9, 'up');
    m.door(6, 29, 'bibliotek', 7, 9, 'up');
    m.door(36, 29, 'alkymist', 6, 8, 'up');
    m.door(46, 17, 'farveri', 11, 15, 'up'); m.door(46, 18, 'farveri', 11, 15, 'up');

    m.spots = { start: [7, 17], hut: [31, 6], catHide: [43, 14], sampleA: [12, 5], sampleB: [42, 10], well: [21, 21], stocks: [31, 20] };
    m.set(43, 14, '.');
    return m;
  }

  // ------------------------------------------------------------------ indendørs
  function room(id, w, h, floor, music, name) {
    var m = new Map(id, w, h, floor === 'stone' ? ';' : '_');
    m.floor = floor; m.music = music; m.name = name;
    m.rect(0, 0, w, 2, 'X'); m.rect(0, h - 1, w, 1, 'X'); m.rect(0, 0, 1, h, 'X'); m.rect(w - 1, 0, 1, h, 'X');
    return m;
  }
  function exitTo(m, x, y, tx, ty, to) { m.set(x, y, 'E'); m.door(x, y, to || 'by', tx, ty, 'down'); m.spots.exit = [x, y]; }

  function laug() {
    var m = room('laug', 13, 10, 'wood', 'by', 'Eventyrerlauget');
    m.set(3, 1, 'J'); m.set(9, 1, 'J'); m.set(6, 1, 'M'); m.set(1, 1, 'U'); m.set(11, 1, 'L');
    m.rect(4, 4, 5, 1, 'Q'); m.set(4, 5, 'q'); m.set(8, 5, 'q');
    m.rect(3, 6, 7, 2, 'Z');
    m.set(1, 5, 'b'); m.set(11, 5, 'c'); m.set(11, 6, 'c');
    exitTo(m, 6, 9, 7, 17);
    m.lamps.push([1, 1]);
    return m;
  }
  function kro() {
    var m = room('kro', 17, 11, 'wood', 'kro', 'Den Gyldne Drage');
    m.set(1, 1, 'Y'); m.set(2, 1, 'Y'); m.set(3, 1, 'Y'); m.set(13, 1, 'U'); m.set(8, 1, 'J');
    m.rect(1, 3, 6, 1, 'C');
    m.set(10, 4, 'Q'); m.set(9, 4, 'q'); m.set(11, 4, 'q');
    m.set(13, 6, 'Q'); m.set(12, 6, 'q'); m.set(14, 6, 'q');
    m.set(4, 7, 'Q'); m.set(3, 7, 'q'); m.set(5, 7, 'q');
    m.rect(7, 6, 3, 3, 'Z');
    m.set(15, 3, 'b'); m.set(15, 4, 'b'); m.set(1, 9, 'c');
    exitTo(m, 8, 10, 36, 17);
    m.lamps.push([13, 1]);
    return m;
  }
  function bibliotek() {
    var m = room('bibliotek', 15, 11, 'wood', 'bog', 'Biblioteket');
    for (var x = 1; x < 14; x++) if (x !== 7) m.set(x, 1, 'L');
    m.set(7, 1, 'U');
    m.rect(2, 4, 3, 1, 'L'); m.rect(10, 4, 3, 1, 'L');
    m.rect(2, 7, 3, 1, 'L'); m.rect(10, 7, 3, 1, 'L');
    m.set(7, 3, 'n');
    m.rect(6, 5, 3, 3, 'Z');
    exitTo(m, 7, 10, 6, 30);
    m.lamps.push([7, 1]);
    return m;
  }
  function alkymist() {
    var m = room('alkymist', 13, 10, 'stone', 'alk', 'Alkymistens værksted');
    m.set(1, 1, 'Y'); m.set(2, 1, 'Y'); m.set(10, 1, 'Y'); m.set(11, 1, 'Y'); m.set(6, 1, 'L');
    m.set(6, 4, 'V');
    m.rect(1, 6, 3, 1, 'Q'); m.rect(9, 6, 3, 1, 'Q');
    m.set(11, 3, 'c'); m.set(1, 3, 'b');
    exitTo(m, 6, 9, 36, 30);
    m.lamps.push([6, 4]);
    return m;
  }
  // Farveriet: indgangshal, ventilrum og baronens kontor — låste jerndøre imellem
  function farveri() {
    var m = room('farveri', 23, 17, 'stone', 'farve', 'Grimmarks Farveri');
    m.rect(1, 6, 21, 1, 'X'); m.rect(1, 11, 21, 1, 'X');
    m.set(11, 6, '/'); m.locked['11,6'] = 'f_valve';
    m.set(11, 11, '/'); m.locked['11,11'] = 'f_guard';
    // hallen med farvekar
    [[3, 13], [5, 13], [3, 14], [17, 13], [19, 13], [19, 14]].forEach(function (p) { m.set(p[0], p[1], 'v'); });
    m.set(1, 15, 'c'); m.set(21, 15, 'b'); m.set(21, 12, 'c');
    // ventilrummet
    m.set(5, 7, 'p'); m.set(14, 7, 'Y'); m.set(17, 7, 'p'); m.set(8, 7, 'p');
    m.set(2, 9, 'c'); m.set(20, 9, 'b');
    // kontoret
    m.set(11, 3, 'n'); m.set(5, 1, 'L'); m.set(6, 1, 'L'); m.set(16, 1, 'L'); m.set(17, 1, 'L'); m.set(11, 1, 'J');
    m.rect(9, 4, 5, 1, 'Z'); m.rect(9, 5, 5, 1, 'Z');
    m.set(2, 3, '%'); m.set(20, 3, 'b');
    exitTo(m, 11, 16, 44, 17);
    m.doors[0].tx = 44; m.doors[0].ty = 18;
    m.lamps.push([11, 1]);
    return m;
  }

  // ------------------------------------------------------------------ kapitel 2: Mosekrogen
  // Skovlandsbyen øst for Runeborg. Mølleåen kommer fra nord, bliver samlet bag mølledæmningen
  // og løber derfra ned til mosen i sydvest — hvor træerne er blevet grå.
  var SKOV_SVAMPE = [[18, 6], [22, 6], [19, 8], [21, 8], [17, 4], [23, 4]];
  function skov() {
    var W = 40, H = 32, m = new Map('skov', W, H, '.');
    m.name = 'Mosekrogen'; m.music = 'skov'; m.outdoor = true;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) { var r = RB.hash(x, y, 91); if (r < 0.06) m.set(x, y, ','); else if (r < 0.09) m.set(x, y, 't'); }
    m.rect(0, 0, W, 2, 'T'); m.rect(0, H - 2, W, 2, 'T'); m.rect(0, 0, 2, H, 'T'); m.rect(W - 2, 0, 2, H, 'T');
    // stier
    m.rect(19, 2, 2, 28, ':');                // hovedstien nord-syd
    m.rect(5, 12, 33, 2, ':');                // landsbyvejen
    m.rect(14, 9, 1, 3, ':');                 // op til Fenjas hus
    m.rect(10, 7, 2, 5, ':');                 // op til kulmilen
    m.rect(17, 3, 6, 6, ':');                 // stencirklen
    // mølleåen: dam, dæmning, løb ned til mosen
    m.rect(27, 6, 8, 5, '~'); m.rect(30, 0, 2, 6, '~');
    m.rect(27, 11, 8, 1, '#'); m.set(30, 11, '1');
    m.rect(30, 12, 2, 2, 'H');                // bro, hvor landsbyvejen krydser åen
    m.rect(30, 14, 2, 9, '~'); m.rect(15, 22, 17, 2, '~');
    m.rect(19, 22, 2, 2, 'H');                // bro, hvor hovedstien krydser åen
    // mosen med de grå træer
    m.rect(6, 19, 10, 8, '~');
    [[5, 18], [7, 18], [10, 18], [13, 18], [5, 21], [5, 24], [5, 27], [8, 27], [12, 27], [14, 27], [16, 19], [17, 21], [16, 27], [17, 24], [9, 17], [4, 22]].forEach(function (p) { m.set(p[0], p[1], 'd'); });
    // levende skov rundt om
    [[3, 4], [5, 3], [7, 5], [4, 8], [6, 10], [12, 3], [15, 3], [25, 3], [28, 3], [24, 9], [26, 8], [22, 10], [26, 13], [27, 14], [24, 16], [25, 19], [28, 18], [27, 24], [24, 26], [34, 18], [35, 22], [36, 26], [9, 30], [14, 30], [26, 29], [31, 28]].forEach(function (p) { m.set(p[0], p[1], 'T'); });
    [[8, 9], [13, 14], [15, 15], [23, 13], [22, 17], [34, 16], [8, 14]].forEach(function (p) { m.set(p[0], p[1], 't'); });
    [[17, 15], [24, 21], [10, 21]].forEach(function (p) { m.set(p[0], p[1], 'r'); });
    // Fenjas hus, møllen, kulmilen, stencirklen
    house(m, 12, 4, 6, 5, 'G', 'W', 2, { windows: [0, 4], chimney: 4 });          // dør (14,8)
    house(m, 35, 6, 4, 6, 'R', 'S', 1, { windows: [3], chimney: 2 });             // møllen, dør (36,11)
    m.set(9, 5, 'k');
    [[18, 3], [22, 3], [17, 5], [23, 5], [18, 7], [22, 7]].forEach(function (p) { m.set(p[0], p[1], 'r'); });
    m.set(20, 5, 'U');                         // bålet i stencirklen
    // skilte og småting
    m.set(21, 28, 's'); m.set(13, 9, 's'); m.set(37, 12, 's');
    m.set(32, 15, 'b'); m.set(33, 15, 'c'); m.set(8, 7, 'c'); m.set(11, 5, 'b');
    m.lamps = []; m.lamps.push([20, 5]);
    m.door(14, 8, 'skovfoged', 7, 8, 'up');
    m.spots = { start: [20, 28], stA: [16, 25], stB: [8, 8], stC: [24, 6], sluse: [30, 12] };
    // Lysesvampene: kun der, når Mosekrogen har det godt igen (flag k2_lys)
    m.applyFlags = function (S, mm) {
      var on = !!(S.flags && S.flags.k2_lys);
      SKOV_SVAMPE.forEach(function (p) { mm.set(p[0], p[1], on ? 'u' : '.'); });
      mm.lamps = [[20, 5]]; if (on) SKOV_SVAMPE.forEach(function (p) { mm.lamps.push([p[0], p[1], '90,240,215', 16]); });
      mm.flags.sluiceOpen = !!(S.flags && S.flags.k2_sluse);
    };
    return m;
  }
  function skovfoged() {
    var m = room('skovfoged', 14, 10, 'wood', 'skov', 'Fenjas feltstation');
    m.set(2, 1, 'L'); m.set(3, 1, 'L'); m.set(10, 1, 'L'); m.set(11, 1, 'L'); m.set(6, 1, 'J'); m.set(7, 1, 'M');
    m.rect(2, 4, 4, 1, 'Q'); m.rect(8, 4, 4, 1, 'Q');            // arbejdsborde med potteplanter
    m.set(2, 5, 'j'); m.set(4, 5, 'j'); m.set(9, 5, 'j'); m.set(11, 5, 'j');
    m.set(12, 7, 'n'); m.set(1, 7, 'b'); m.set(1, 8, 'c');
    m.rect(5, 7, 4, 2, 'Z');
    exitTo(m, 7, 9, 14, 9, 'skov');
    m.lamps.push([7, 1]);
    return m;
  }

  // ------------------------------------------------------------------ kapitel 3: Saltvig
  // Havnebyen. Havet i nord, kajen og moleerne, torvet, havnekontoret og fyret på næsset i øst.
  function havn() {
    var W = 44, H = 30, m = new Map('havn', W, H, '.');
    m.name = 'Saltvig'; m.music = 'hav'; m.outdoor = true; m.weather = 'hav';
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) { var r = RB.hash(x, y, 55); if (r < 0.05) m.set(x, y, ','); }
    m.rect(0, 0, W, 9, '~');                                       // havet
    m.rect(34, 0, 10, 10, '.');                                    // næsset med fyret
    m.rect(0, H - 2, W, 2, 'T'); m.rect(0, 9, 2, H - 9, 'T'); m.rect(W - 2, 9, 2, H - 9, 'T');
    // kajen og moler
    m.rect(2, 9, 32, 2, '_');
    m.rect(6, 5, 3, 4, '_'); m.rect(16, 3, 3, 6, '_'); m.rect(26, 6, 3, 3, '_');
    [[5, 6], [9, 5], [15, 4], [19, 5], [25, 7], [29, 7]].forEach(function (p) { m.set(p[0], p[1], 'e'); });
    [[10, 11], [20, 11], [31, 11]].forEach(function (p) { m.set(p[0], p[1], 'i'); });
    // torv og gader
    m.rect(12, 12, 20, 7, '=');                                    // torvet
    m.rect(2, 19, 41, 2, '=');                                     // strandgaden
    m.rect(40, 9, 2, 11, ':');                                     // stien til fyret
    m.rect(34, 19, 8, 1, ':');
    // hus: havnekontoret, Ranes pakhus, kroen, fiskehallen
    house(m, 4, 12, 6, 6, 'B', 'S', 2, { windows: [0, 4], chimney: 4 });         // havnekontoret, dør (6,17)
    house(m, 33, 13, 6, 5, 'R', 'W', 3, { windows: [1, 5], chimney: 1 });        // Ranes pakhus, dør (36,17)
    house(m, 4, 22, 7, 5, 'P', 'W', 3, { windows: [1, 5] });                     // kroen
    house(m, 14, 22, 6, 5, 'G', 'S', 2, { windows: [4] });                       // fiskehallen
    house(m, 24, 22, 7, 5, 'R', 'W', 3, { windows: [0, 6] });                    // hus
    house(m, 34, 22, 6, 5, 'B', 'W', 2, { windows: [4] });                       // hus
    // torvet
    [[14, 13], [18, 13], [22, 13], [26, 13], [30, 13]].forEach(function (p) { m.set(p[0], p[1], 'm'); });   // markedsboder
    m.set(22, 11, 'N');                                              // tavlen med skibene
    [[13, 17], [30, 17]].forEach(function (p) { m.set(p[0], p[1], 'b'); });
    m.set(17, 17, 'c'); m.set(27, 17, 'c'); m.set(11, 20, 's'); m.set(33, 20, 's');
    [[12, 12], [31, 12], [12, 18], [31, 18], [3, 11], [32, 10]].forEach(function (p) { m.set(p[0], p[1], 'l'); m.lamps.push(p); });
    [[8, 24], [12, 25], [21, 28], [30, 28], [40, 25], [41, 22]].forEach(function (p) { m.set(p[0], p[1], 't'); });
    [[44 - 8, 3], [43 - 8, 6], [41, 2]].forEach(function (p) { m.set(p[0], p[1], 'r'); });
    // fyret
    m.rect(38, 2, 3, 1, 'R'); m.set(39, 3, 'y'); m.lamps.push([39, 3]);
    m.rect(38, 4, 3, 5, 'S'); m.set(39, 8, 'D'); m.set(38, 6, 'O');
    m.door(6, 17, 'havnekontor', 6, 8, 'up');
    m.door(39, 8, 'fyr', 4, 8, 'up');
    m.spots = { start: [21, 20], tavle: [22, 12], fyr: [39, 9], kaj: [20, 10] };
    return m;
  }
  function havnekontor() {
    var m = room('havnekontor', 13, 10, 'wood', 'hav', 'Havnekontoret');
    m.set(1, 1, 'L'); m.set(2, 1, 'L'); m.set(10, 1, 'L'); m.set(11, 1, 'L'); m.set(6, 1, 'M'); m.set(4, 1, 'J');
    m.rect(3, 4, 7, 1, 'C');                                      // disken med vægten
    m.set(6, 3, 'n'); m.set(10, 6, 'b'); m.set(11, 6, 'c'); m.set(1, 6, 'c');
    m.rect(4, 6, 4, 2, 'Z');
    exitTo(m, 6, 9, 6, 18, 'havn');
    m.lamps.push([6, 1]);
    return m;
  }
  function fyr() {
    var m = room('fyr', 9, 10, 'stone', 'hav', 'Fyret');
    m.set(4, 1, 'y'); m.set(1, 1, 'Y'); m.set(7, 1, 'Y');
    m.set(4, 4, 'n'); m.set(1, 6, 'b'); m.set(2, 6, 'b'); m.set(7, 6, 'c');
    exitTo(m, 4, 9, 39, 9, 'havn');
    m.lamps.push([4, 1]);
    return m;
  }

  RB.buildWorld = function () {
    var maps = { by: town(), laug: laug(), kro: kro(), bibliotek: bibliotek(), alkymist: alkymist(), farveri: farveri(),
                 skov: skov(), skovfoged: skovfoged(), havn: havn(), havnekontor: havnekontor(), fyr: fyr() };
    maps.by.flags.green = true; maps.farveri.flags.green = true;
    return maps;
  };
})();
