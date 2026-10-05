/* Regnehelten — kortene
   Bygget som Runeborgs: små hjælpefunktioner (hus, butik, hæk ...) i stedet
   for tegn-gitre, så et hus kan flyttes ved at rette ét tal. Hvem der står
   hvor, bestemmer content.js — her er kun jorden, husene og dørene.

   Kvarteret er ét stort udendørs kort med vejen gennem midten: hjemmet,
   supermarkedet, kiosken, biblioteket og skolen på nordsiden, parken og et
   par huse på sydsiden. Indenfor er der fem rum. */
(function () {
  'use strict';
  var RH = window.RH = window.RH || {};

  function Map(id, w, h, fill) {
    this.id = id; this.w = w; this.h = h;
    this.rows = []; for (var y = 0; y < h; y++) { var r = []; for (var x = 0; x < w; x++) r.push(fill); this.rows.push(r); }
    this.doors = []; this.chimneys = []; this.lamps = []; this.windows = []; this.signs = []; this.flags = {}; this.spots = {};
    this.floor = 'grass'; this.locked = {}; this.lockMsg = {}; this.zones = [];
  }
  Map.prototype.at = function (x, y) { return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? '#' : this.rows[y][x]; };
  Map.prototype.set = function (x, y, ch) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.rows[y][x] = ch; };
  Map.prototype.rect = function (x, y, w, h, ch) { for (var j = y; j < y + h; j++) for (var i = x; i < x + w; i++) this.set(i, j, ch); };
  Map.prototype.door = function (x, y, to, tx, ty, dir) { this.doors.push({ x: x, y: y, to: to, tx: tx, ty: ty, dir: dir || 'down' }); };
  Map.prototype.doorAt = function (x, y) { for (var i = 0; i < this.doors.length; i++) if (this.doors[i].x === x && this.doors[i].y === y) return this.doors[i]; return null; };
  // En lås er et flag i spillets tilstand: døren går op, når flaget er sat
  Map.prototype.lock = function (x, y, flag, msg) { this.locked[x + ',' + y] = flag; this.lockMsg[x + ',' + y] = msg; };
  Map.prototype.isOpen = function (x, y) { var f = this.locked[x + ',' + y]; return f ? !!(RH.state && RH.state.flags[f]) : true; };
  Map.prototype.solid = function (x, y) {
    var ch = this.at(x, y);
    if (!this.isOpen(x, y)) return true;
    if (ch === 'D' || ch === 'I') return !this.doorAt(x, y);
    if (ch === 'g') return false;
    return ch === '#' || RH.SOLID.indexOf(ch) >= 0;
  };
  Map.prototype.zoneAt = function (x, y) {
    for (var i = 0; i < this.zones.length; i++) { var z = this.zones[i]; if (x >= z[0] && y >= z[1] && x < z[0] + z[2] && y < z[1] + z[3]) return z[4]; }
    return this.music;
  };

  // Et hus: tag foroven, mur forneden, dør og vinduer i nederste rækker
  function house(m, x, y, w, h, roof, wall, doorX, opts) {
    opts = opts || {};
    var roofH = h - 2;
    m.rect(x, y, w, roofH, roof);
    m.rect(x, y + roofH, w, 2, wall);
    (opts.windows || []).forEach(function (wx) { m.set(x + wx, y + roofH, 'O'); m.windows.push([x + wx, y + roofH]); });
    if (doorX != null) m.set(x + doorX, y + h - 1, 'D');
    if (opts.chimney != null) m.chimneys.push([x + opts.chimney, y]);
  }
  // En hæk hele vejen rundt om et område
  function hedgeBox(m, x, y, w, h) { m.rect(x, y, w, 1, 'h'); m.rect(x, y + h - 1, w, 1, 'h'); m.rect(x, y, 1, h, 'h'); m.rect(x + w - 1, y, 1, h, 'h'); }
  function sign(m, tx, ty, text, bg, fg, dy) { m.signs.push({ x: tx * 16, y: ty * 16 + (dy || 0), text: text, bg: bg, fg: fg }); }

  // ------------------------------------------------------------------ kvarteret
  function kvarter() {
    var W = 60, H = 34, m = new Map('by', W, H, '.');
    m.name = 'Kvarteret'; m.music = 'by'; m.outdoor = true;

    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) if (RH.hash(x, y, 77) < 0.05) m.set(x, y, ',');
    // skovkant mod nord, syd og i siderne (vejen løber videre ud af kortet)
    m.rect(0, 0, W, 2, 'T'); m.rect(0, H - 2, W, 2, 'T'); m.rect(0, 0, 2, 15, 'T'); m.rect(W - 2, 0, 2, 15, 'T'); m.rect(0, 22, 2, 12, 'T'); m.rect(W - 2, 22, 2, 12, 'T');

    // Vejen: fortov, kørebane med midterstribe, fortov — og to fodgængerovergange
    m.rect(0, 15, W, 2, '='); m.rect(0, 17, W, 1, 'a'); m.rect(0, 18, W, 1, '-'); m.rect(0, 19, W, 1, 'a'); m.rect(0, 20, W, 2, '=');
    m.rect(11, 17, 2, 3, 'x'); m.rect(40, 17, 2, 3, 'x');
    m.set(30, 19, '1'); m.set(31, 19, '1'); m.set(54, 17, '1'); m.set(55, 17, '1'); m.set(3, 17, '1'); m.set(4, 17, '1');
    [[15, 15], [30, 15], [45, 15], [6, 21], [25, 21], [50, 21]].forEach(function (p) { m.set(p[0], p[1], 'l'); m.lamps.push(p); });

    // Hjemme: rødstenshus med have og hæk
    hedgeBox(m, 2, 2, 13, 13);
    house(m, 4, 4, 9, 6, 'R', 'W', 4, { windows: [1, 2, 6, 7], chimney: 6 });
    m.rect(8, 10, 1, 5, '=');
    m.set(9, 14, 'm');
    [[12, 11], [4, 12], [3, 3]].forEach(function (p) { m.set(p[0], p[1], 'T'); });
    [[10, 12], [11, 12], [13, 4]].forEach(function (p) { m.set(p[0], p[1], 't'); });
    m.rect(5, 11, 2, 2, ','); m.rect(10, 10, 3, 1, ',');

    // Supermarkedet: fladt tag, store ruder og glasdøre
    m.rect(17, 6, 12, 5, 'L'); m.rect(17, 11, 12, 2, 'M');
    [18, 19, 20, 25, 26, 27].forEach(function (x) { m.set(x, 11, 'Q'); m.set(x, 12, 'Q'); });
    m.set(22, 12, 'D'); m.set(23, 12, 'D');
    sign(m, 23, 10, 'KØBMAND', '#2c8a4e', '#f4f4f0', 3);
    m.rect(16, 13, 14, 2, '=');
    m.set(17, 13, 'k'); m.set(18, 13, 'k'); m.set(28, 13, 'c');
    [[17, 3], [20, 2], [24, 4], [28, 2], [15, 7], [29, 6]].forEach(function (p) { m.set(p[0], p[1], 'T'); });

    // Kiosken
    house(m, 31, 9, 4, 4, 'R', 'M', null, {});
    m.set(32, 12, 'A'); m.set(33, 12, 'A');
    sign(m, 33, 10, 'KIOSK', '#ffcc4d', '#1a1420', 4);
    m.rect(30, 13, 6, 2, '=');
    m.set(34, 13, 's');

    // Biblioteket
    house(m, 36, 4, 10, 9, 'K', 'W', 4, { windows: [1, 2, 3, 6, 7, 8] });
    sign(m, 41, 10, 'BIBLIOTEK', '#2c4a9c', '#f4f4f0', 6);
    m.rect(36, 13, 10, 2, '=');
    m.set(37, 13, 'B'); m.set(38, 13, 'B'); m.set(44, 13, 'k');
    [[33, 3], [34, 6]].forEach(function (p) { m.set(p[0], p[1], 'T'); });

    // Skolen i gule mursten, skolegården foran og et grønt hegn med en låge
    m.rect(46, 2, 1, 13, 'F'); m.rect(46, 14, 12, 1, 'F');
    house(m, 47, 2, 10, 5, 'K', 'Y', null, { windows: [1, 2, 3, 6, 7, 8] });
    m.set(51, 6, 'D'); m.set(52, 6, 'D');
    m.set(57, 2, 'T'); m.set(57, 3, 'T'); m.set(57, 4, 'T'); m.set(57, 5, 't'); m.set(57, 6, 't');
    sign(m, 52, 4, 'SKOLE', '#a02e38', '#f4f4f0', 8);
    m.rect(47, 7, 11, 7, 'a');
    m.set(47, 9, 'G'); m.set(47, 10, 'G'); m.set(47, 11, 'G'); m.set(57, 9, 'G'); m.set(57, 10, 'G'); m.set(57, 11, 'G');
    m.set(55, 7, 'k'); m.set(56, 7, 'k'); m.set(48, 13, 'B'); m.set(49, 13, 'B'); m.set(56, 13, 'c');
    m.set(51, 14, 'g'); m.set(52, 14, 'g');

    // Parken: hæk rundt om, grusstier, andedam og legeplads
    hedgeBox(m, 2, 22, 29, 10);
    m.set(11, 22, ':'); m.set(12, 22, ':');
    m.rect(5, 24, 23, 1, ':'); m.rect(5, 29, 23, 1, ':'); m.rect(5, 24, 1, 6, ':'); m.rect(27, 24, 1, 6, ':'); m.rect(11, 23, 2, 1, ':');
    m.rect(9, 25, 10, 4, '~');
    m.rect(21, 25, 5, 4, 'f'); m.set(22, 26, 'P'); m.set(24, 26, 'S');
    m.set(7, 23, 'B'); m.set(8, 23, 'B'); m.set(15, 30, 'B'); m.set(16, 30, 'B');
    [[3, 23], [29, 23], [3, 30], [29, 30], [19, 23], [26, 30], [4, 27], [16, 23]].forEach(function (p) { m.set(p[0], p[1], 'T'); });
    m.set(6, 30, 'l'); m.lamps.push([6, 30]); m.set(26, 23, 'l'); m.lamps.push([26, 23]); m.set(20, 23, 'c'); m.set(13, 23, 's');
    sign(m, 12, 21, 'PARKEN', '#2c7a3c', '#f4f4f0', 9);
    m.zones.push([2, 22, 29, 10, 'park']);

    // Sydøst: busstoppested, en sti og to huse
    m.set(36, 21, 'u'); m.set(37, 21, 'u');
    m.rect(33, 22, 1, 6, ':'); m.rect(33, 27, 25, 1, ':');
    house(m, 37, 22, 7, 5, 'R', 'W', 3, { windows: [1, 5], chimney: 1 });
    house(m, 47, 22, 7, 5, 'K', 'M', 3, { windows: [1, 5], chimney: 5 });
    m.rect(35, 28, 22, 1, 'F');
    [[35, 29], [44, 30], [55, 29], [50, 30], [39, 30], [34, 23], [56, 23]].forEach(function (p) { m.set(p[0], p[1], 'T'); });
    m.rect(36, 30, 2, 1, ','); m.rect(52, 29, 2, 2, ',');

    // Døre ind
    m.door(8, 9, 'hjem', 11, 12, 'up');
    m.door(22, 12, 'butik', 11, 11, 'up'); m.door(23, 12, 'butik', 11, 11, 'up');
    m.door(40, 12, 'bibliotek', 10, 11, 'up');
    m.door(51, 6, 'skole', 13, 11, 'up'); m.door(52, 6, 'skole', 13, 11, 'up');
    m.lock(51, 14, 'skolegaard', 'Far venter i supermarkedet — I skulle jo lige handle først.');
    m.lock(52, 14, 'skolegaard', 'Far venter i supermarkedet — I skulle jo lige handle først.');
    m.lock(51, 6, 'skoleInd', 'Oskar vinker ovre i gården — han vil vise dig noget først.');
    m.lock(52, 6, 'skoleInd', 'Oskar vinker ovre i gården — han vil vise dig noget først.');

    m.zones.push([46, 2, 12, 13, 'skolegaard']);
    m.spots = { home: [8, 10] };
    return m;
  }

  // ------------------------------------------------------------------ indendørs
  function room(id, w, h, floor, music, name, wall) {
    var ch = { wood: '_', lino: ';', shop: '+' }[floor];
    var m = new Map(id, w, h, ch);
    m.floor = floor; m.music = music; m.name = name; m.wall = wall;
    m.rect(0, 0, w, 2, 'X'); m.rect(0, h - 1, w, 1, 'X'); m.rect(0, 0, 1, h, 'X'); m.rect(w - 1, 0, 1, h, 'X');
    return m;
  }
  function exitTo(m, x, y, tx, ty) { m.set(x, y, 'E'); m.door(x, y, 'by', tx, ty, 'down'); m.spots.exit = [x, y]; }

  function hjem() {
    var m = room('hjem', 22, 14, 'wood', 'hjem', 'Hjemme', 'hjem');
    m.rect(10, 2, 11, 5, '"');                       // køkkenet har fliser
    m.rect(9, 1, 1, 5, 'X');                         // væggen mellem værelset og køkkenet
    // værelset
    m.set(1, 2, 'b'); m.set(1, 3, 'b');
    m.set(4, 2, 'd'); m.set(5, 2, 'd'); m.set(5, 1, '%'); m.set(2, 1, 'J'); m.set(7, 1, 'H'); m.set(8, 2, 'j');
    m.rect(3, 4, 4, 2, 'Z');
    // køkkenet
    m.set(11, 1, 'n'); m.set(12, 1, 'C'); m.set(13, 1, 'v'); m.set(14, 1, 'C'); m.set(15, 1, 'i'); m.set(16, 1, 'C'); m.set(18, 1, '%'); m.set(20, 1, 'J');
    m.set(15, 4, 'w'); m.set(16, 4, 'w'); m.set(14, 4, 'q'); m.set(17, 4, 'q');
    // stuen
    m.set(4, 8, 'V'); m.rect(3, 9, 3, 2, 'Z'); m.set(3, 11, 'o'); m.set(4, 11, 'o'); m.set(5, 11, 'o');
    m.set(20, 8, 'H'); m.set(20, 9, 'H'); m.set(1, 12, 'j'); m.set(20, 12, 'j'); m.set(14, 10, 'w'); m.set(15, 10, 'w'); m.set(13, 10, 'q');
    m.set(1, 8, 'H'); m.set(1, 9, 'H'); m.set(8, 7, 'j'); m.set(16, 10, 'q'); m.rect(13, 11, 4, 1, 'Z'); m.set(9, 12, 'o'); m.set(10, 12, 'o');
    m.rug = ['#3a6a8a', '#c8a040'];
    exitTo(m, 11, 13, 8, 10);
    m.lock(11, 13, 'hjemUd', 'Du er ikke klar endnu — Mor står i køkkenet.');
    m.lamps.push([4, 2], [15, 2], [4, 9]);
    return m;
  }
  function butik() {
    var m = room('butik', 22, 13, 'shop', 'butik', 'Supermarkedet', 'butik');
    m.rect(2, 3, 6, 1, 'p'); m.rect(2, 6, 6, 1, 'p');
    m.rect(14, 2, 6, 1, 'z'); m.rect(15, 6, 5, 1, 'p');
    m.rect(10, 5, 3, 1, 'r');
    m.set(3, 9, '$'); m.set(4, 9, '$'); m.set(7, 9, '$'); m.set(8, 9, '$');
    m.set(9, 1, 'N'); m.set(20, 11, 'j'); m.set(19, 11, 'c');
    exitTo(m, 11, 12, 22, 13);
    return m;
  }
  function bibliotek() {
    var m = room('bibliotek', 20, 13, 'wood', 'bibliotek', 'Biblioteket', 'bib');
    m.rect(1, 1, 6, 1, 'H'); m.rect(13, 1, 6, 1, 'H'); m.set(9, 1, 'N'); m.set(11, 1, '%');
    m.rect(2, 5, 4, 1, 'H'); m.rect(14, 5, 4, 1, 'H'); m.rect(2, 8, 4, 1, 'H'); m.rect(14, 8, 4, 1, 'H');
    m.set(9, 4, 'e'); m.set(10, 4, 'e');
    m.rect(8, 8, 4, 1, 'w'); m.set(10, 9, 'q'); m.set(11, 9, 'q');
    m.rect(7, 10, 6, 1, 'Z'); m.rug = ['#2c5a4a', '#c8a040'];
    m.set(1, 11, 'j'); m.set(18, 11, 'j');
    exitTo(m, 10, 12, 40, 13);
    m.lamps.push([10, 3]);
    return m;
  }
  function skole() {
    var m = room('skole', 26, 13, 'lino', 'skole', 'Skolen', 'skole');
    m.rect(1, 1, 6, 1, 'y'); m.rect(19, 1, 6, 1, 'y'); m.set(8, 1, 'N'); m.set(10, 1, '%'); m.set(16, 1, '%'); m.set(11, 1, 'J');
    m.set(13, 1, 'I'); m.door(13, 1, 'klasse', 10, 10, 'up');
    m.lock(13, 1, 'klasseInd', 'Der er stadig frikvarter — Emma sidder i kantinen.');
    m.rect(3, 5, 4, 1, '&'); m.rect(16, 5, 4, 1, '&'); m.rect(3, 8, 4, 1, '&'); m.rect(16, 8, 4, 1, '&');
    m.set(1, 11, 'j'); m.set(24, 11, 'j'); m.set(10, 11, 'c');
    exitTo(m, 13, 12, 51, 7);
    return m;
  }
  function klasse() {
    var m = room('klasse', 20, 12, 'lino', 'klasse', 'Klasselokalet', 'skole');
    m.rect(6, 1, 6, 1, '['); m.set(2, 1, '%'); m.set(15, 1, '%'); m.set(17, 1, 'H'); m.set(18, 1, 'H');
    m.set(3, 3, 'e'); m.set(4, 3, 'e');
    [2, 5, 8, 11, 14, 17].forEach(function (x) { m.set(x, 5, 'U'); m.set(x + 1, 5, 'U'); m.set(x, 8, 'U'); m.set(x + 1, 8, 'U'); });
    m.set(18, 10, 'j'); m.set(1, 10, 'c');
    exitTo(m, 10, 11, 0, 0);
    m.doors[0].to = 'skole'; m.doors[0].tx = 13; m.doors[0].ty = 2;
    return m;
  }

  RH.buildWorld = function () {
    return { by: kvarter(), hjem: hjem(), butik: butik(), bibliotek: bibliotek(), skole: skole(), klasse: klasse() };
  };
})();
