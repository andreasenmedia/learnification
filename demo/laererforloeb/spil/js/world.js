/* Lærerens forløb (demo) — kortene
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
  // ------------------------------------------------------------------ indendørs
  function room(id, w, h, floor, music, name) {
    var m = new Map(id, w, h, floor === 'stone' ? ';' : '_');
    m.floor = floor; m.music = music; m.name = name;
    m.rect(0, 0, w, 2, 'X'); m.rect(0, h - 1, w, 1, 'X'); m.rect(0, 0, 1, h, 'X'); m.rect(w - 1, 0, 1, h, 'X');
    return m;
  }
  function exitTo(m, x, y, tx, ty, to) { m.set(x, y, 'E'); m.door(x, y, to || 'by', tx, ty, 'down'); m.spots.exit = [x, y]; }

  // ------------------------------------------------------------------ Naturskolen (udendørs)
  function skole() {
    var W = 36, H = 26, m = new Map('skole', W, H, '.');
    m.name = 'Naturskolen'; m.music = 'skov'; m.outdoor = true;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) { if (RB.hash(x, y, 31) < 0.07) m.set(x, y, ','); }
    m.rect(0, 0, W, 2, 'T'); m.rect(0, H - 2, W, 2, 'T'); m.rect(0, 0, 2, H, 'T'); m.rect(W - 2, 0, 2, H, 'T');

    // søen og åen, der løber fra den
    m.rect(3, 3, 10, 5, '~');
    m.rect(7, 8, 2, 16, 'z');
    // stier og gårdsplads
    m.rect(2, 13, 32, 2, ':');
    m.rect(21, 10, 7, 3, '=');
    m.rect(14, 8, 1, 6, ':');
    m.rect(28, 15, 2, 1, ':');
    m.rect(7, 13, 2, 2, 'H');

    // skolen
    house(m, 20, 4, 9, 6, 'B', 'S', 4, { windows: [1, 2, 6, 7], chimney: 7 });
    // vandværket
    house(m, 26, 16, 6, 5, 'G', 'W', 2, { windows: [0, 4], chimney: 1 });

    // småting
    m.set(21, 12, 's');                    // skilt ved gårdspladsen
    m.set(14, 5, 's');                     // skilt ved søen
    m.set(16, 9, 'N');                     // målestationens tavle
    m.set(11, 17, 'w');                    // brønd
    m.set(22, 10, 'j'); m.set(27, 10, 'j');
    m.set(19, 5, 'b'); m.set(19, 7, 'c');
    m.set(24, 12, 'l'); m.lamps.push([24, 12]);
    m.set(15, 12, 'l'); m.lamps.push([15, 12]);
    [[3, 9], [4, 11], [5, 16], [12, 20], [16, 18], [30, 7], [32, 11], [18, 21], [33, 19], [23, 20], [4, 20]].forEach(function (p) { m.set(p[0], p[1], 'T'); });
    [[13, 10], [17, 16], [31, 13], [10, 22], [24, 19]].forEach(function (p) { m.set(p[0], p[1], 't'); });
    [[10, 9], [20, 16], [5, 14]].forEach(function (p) { m.set(p[0], p[1], 'r'); });

    m.door(24, 9, 'stue', 6, 8, 'up');
    m.spots = { start: [24, 11] };
    return m;
  }

  // ------------------------------------------------------------------ klasseværelset
  function stue() {
    var m = room('stue', 13, 10, 'wood', 'bog', 'Klasseværelset');
    m.set(3, 1, 'J'); m.set(9, 1, 'J'); m.set(6, 1, 'M'); m.set(1, 1, 'U'); m.set(11, 1, 'L');
    m.rect(4, 4, 5, 1, 'Q'); m.set(4, 5, 'q'); m.set(8, 5, 'q');
    m.rect(3, 6, 7, 2, 'Z');
    m.set(1, 5, 'b'); m.set(11, 5, 'c'); m.set(11, 6, 'c');
    exitTo(m, 6, 9, 24, 10, 'skole');
    m.lamps.push([1, 1]);
    return m;
  }

  RB.buildWorld = function () { return { skole: skole(), stue: stue() }; };
})();
