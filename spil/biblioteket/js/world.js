/* Eventyrbiblioteket — kortene
   Hovedsalen har portene til spillene i nordvæggen: Runeborgs runeport,
   Regneheltens klasselokaledør og en afspærret dør til de næste spil. Fra
   salen er der dør til Klædeskabet (vest) og Trofærummet (øst). Fliserne er
   Runeborgs (art.js), plus portalfliserne dér. */
(function () {
  'use strict';
  var BB = window.BB = window.BB || {};

  function Map(id, w, h, fill) {
    this.id = id; this.w = w; this.h = h;
    this.rows = []; for (var y = 0; y < h; y++) { var r = []; for (var x = 0; x < w; x++) r.push(fill); this.rows.push(r); }
    this.doors = []; this.chimneys = []; this.lamps = []; this.windows = []; this.flags = {}; this.spots = {};
    this.floor = 'wood'; this.locked = {};
  }
  Map.prototype.at = function (x, y) { return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? '#' : this.rows[y][x]; };
  Map.prototype.set = function (x, y, ch) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.rows[y][x] = ch; };
  Map.prototype.rect = function (x, y, w, h, ch) { for (var j = y; j < y + h; j++) for (var i = x; i < x + w; i++) this.set(i, j, ch); };
  Map.prototype.door = function (x, y, to, tx, ty, dir) { this.doors.push({ x: x, y: y, to: to, tx: tx, ty: ty, dir: dir || 'down' }); };
  Map.prototype.doorAt = function (x, y) { for (var i = 0; i < this.doors.length; i++) if (this.doors[i].x === x && this.doors[i].y === y) return this.doors[i]; return null; };
  Map.prototype.isOpen = function () { return true; };
  Map.prototype.solid = function (x, y) {
    var ch = this.at(x, y);
    if (ch === 'D') return !this.doorAt(x, y);       // en dør uden rum bag er en port, man taler med
    return BB.SOLID.indexOf(ch) >= 0 || ch === '~' || ch === 'z';
  };

  function room(id, w, h, music, name) {
    var m = new Map(id, w, h, '_');
    m.music = music; m.name = name;
    m.rect(0, 0, w, 2, 'X'); m.rect(0, h - 1, w, 1, 'X'); m.rect(0, 0, 1, h, 'X'); m.rect(w - 1, 0, 1, h, 'X');
    return m;
  }

  // ------------------------------------------------------------------ hovedsalen
  function hal() {
    var W = 38, H = 26, m = room('hal', W, H, 'bog', 'Eventyrbiblioteket');
    m.rect(1, 2, W - 2, 2, 'X');                           // nordvæggen er fire fliser tyk (række 0-3)
    var i;

    // Reoler langs nordvæggen, bannere og pejs mellem dem (række 2 og 3 danner ét højt reol)
    function stak(x, ch) { m.set(x, 2, ch); m.set(x, 3, ch); }
    for (i = 1; i <= 36; i++) stak(i, 'L');
    [11, 13, 18, 20, 27].forEach(function (x) { stak(x, 'J'); });
    m.set(12, 2, 'X'); m.set(12, 3, 'U');                  // pejsen
    m.lamps.push([12, 3]);

    // Runeporten til Runeborg: overligger foroven, søjler på siderne, den lysende port i midten
    m.set(6, 1, 'Ð'); m.set(7, 1, 'Ð'); m.set(8, 1, 'Ð');
    [2, 3].forEach(function (y) { m.set(6, y, 'Þ'); m.set(7, y, 'Ø'); m.set(8, y, 'Þ'); });
    m.lamps.push([7, 3, '120,170,255', 46]);

    // Den afspærrede dør: her bygges de næste spil
    stak(19, 'X'); m.set(19, 3, 'Å');
    m.lamps.push([19, 3, '255,200,90', 26]);

    // Regneheltens dør
    stak(31, 'X'); m.set(31, 3, 'Æ'); stak(30, 'Þ'); stak(32, 'Þ');
    m.lamps.push([31, 3, '255,210,120', 30]);

    // Skranken, hvor Brynja står, og tæppet midt i salen
    m.rect(17, 8, 5, 1, 'C');
    m.rect(13, 11, 12, 7, 'Z');
    m.rect(15, 13, 2, 1, 'Q'); m.set(15, 14, 'q'); m.set(16, 14, 'q');      // læsebord
    m.rect(21, 13, 2, 1, 'Q'); m.set(21, 14, 'q'); m.set(22, 14, 'q');
    // reolgange i de to sider
    m.rect(3, 15, 7, 1, 'L'); m.rect(3, 19, 7, 1, 'L');
    m.rect(28, 15, 7, 1, 'L'); m.rect(28, 19, 7, 1, 'L');
    [[2, 6], [35, 6], [2, 22], [35, 22]].forEach(function (p) { m.set(p[0], p[1], 'j'); });
    m.set(22, 5, 'c'); m.set(23, 5, 'b');                  // byggematerialer ved den afspærrede dør
    [[10, 9], [28, 9], [10, 22], [28, 22], [19, 14]].forEach(function (p) { m.lamps.push(p); });

    // Døre i sydvæggen: Klædeskabet (vest) og Trofærummet (øst)
    m.set(5, H - 1, 'D'); m.door(5, H - 1, 'skab', 5, 6, 'up');
    m.set(32, H - 1, 'D'); m.door(32, H - 1, 'trofae', 9, 10, 'up');
    m.set(7, H - 1, 's'); m.set(30, H - 1, 's');           // skiltene ved dørene

    // hvor man står, når man kommer tilbage fra et spil eller et rum
    m.spots = { start: [19, 21], runeborg: [7, 4], regnehelten: [31, 4], skab: [5, 24], trofae: [32, 24] };
    return m;
  }

  // ------------------------------------------------------------------ klædeskabet
  function skab() {
    var w = 11, h = 8, m = room('skab', w, h, 'bog', 'Klædeskabet');
    m.set(1, 1, 'L'); m.set(2, 1, 'L'); m.set(8, 1, 'L'); m.set(9, 1, 'L');
    m.set(5, 1, 'M');                                   // spejlet (der tales med det)
    m.set(3, 1, 'J'); m.set(7, 1, 'J');
    m.rect(4, 3, 3, 2, 'Z');
    m.set(1, 5, 'b'); m.set(9, 5, 'c');
    m.set(5, 7, 'E'); m.door(5, 7, 'hal', 5, 24, 'up'); m.spots.exit = [5, 7];
    m.lamps.push([5, 1]);
    return m;
  }

  // ------------------------------------------------------------------ trofærummet
  function trofae() {
    var w = 19, h = 12, m = room('trofae', w, h, 'bog', 'Trofærummet');
    m.set(4, 2, 'Ý'); m.set(9, 2, 'Ý'); m.set(14, 2, 'Ý');     // vitrinerne: Runeborg, Regnehelten, Biblioteket
    m.set(2, 1, 'J'); m.set(16, 1, 'J'); m.set(9, 1, 'J');
    m.rect(5, 5, 9, 4, 'Z');
    m.set(9, 6, 'n');                                    // sokkelen med det samlede antal
    m.set(1, 9, 'b'); m.set(17, 9, 'c');
    m.set(9, 11, 'E'); m.door(9, 11, 'hal', 32, 24, 'up'); m.spots.exit = [9, 11];
    [[4, 2, '255,220,120', 22], [9, 2, '255,220,120', 22], [14, 2, '255,220,120', 22], [9, 6]].forEach(function (p) { m.lamps.push(p); });
    return m;
  }

  BB.buildWorld = function () {
    return { hal: hal(), skab: skab(), trofae: trofae() };
  };
})();
