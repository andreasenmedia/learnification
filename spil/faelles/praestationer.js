/* Learnification — præstationer (achievements)
   Kataloget her er det samme, som Eventyrbiblioteket viser i Trofærummet,
   så også de, man ikke har fået endnu, kan stå som låste. Hvert spil
   registrerer selv sine regler (test på spillets egen tilstand S), og
   LFPraes.tjek(spil, S) kaldes, hver gang spillet gemmer. Det, man allerede
   har fortjent i en gammel save, bliver altså givet første gang, spillet
   åbnes. De opnåede ligger i barnets fælles profil (LFProfil.opnaa).

     LFPraes.KATALOG              alle præstationer
     LFPraes.find(id), ids()      opslag
     LFPraes.registrer(spil, {id: function (S) { return true/false; }})
     LFPraes.tjek(spil, S)        giv det, der er fortjent nu
     LFPraes.antal(profil, spil)  {faerdig, ialt} (spil udeladt = alle)
     LFPraes.ikon(id, størrelse)  SVG-tekst med pixelikonet

   En ny præstation: tilføj den her, skriv testen i spillets content.js, og
   (hvis den skal låse tøj op) sæt laas til et id fra LFFigur.GENSTANDE. */
(function () {
  'use strict';
  var LFPraes = window.LFPraes = window.LFPraes || {};

  LFPraes.SPIL = { runeborg: 'Runeborg', regnehelten: 'Regnehelten', bib: 'Eventyrbiblioteket' };

  // id, spil, navn, tekst (hvad man skal gøre), ikon, laas (tøj) og skjult (teksten vises først, når man har den)
  var K = LFPraes.KATALOG = [
    // ---- Runeborg
    { id: 'rb_start', spil: 'runeborg', navn: 'Lærling i lauget', tekst: 'Læs laugets regler hos Brynja.', ikon: 'bog' },
    { id: 'rb_runer1', spil: 'runeborg', navn: 'Nysgerrig', tekst: 'Find alle otte runestykker i kapitel 1.', ikon: 'rune' },
    { id: 'rb_vedhold', spil: 'runeborg', navn: 'Aldrig give op', tekst: 'Klar en opgave i et nyt forsøg fem gange, efter du først svarede forkert.', ikon: 'stjerne' },
    { id: 'rb_mis', spil: 'runeborg', navn: 'Mis’ ven', tekst: 'Find katten Mis og lad hende følge dig.', ikon: 'kat' },
    { id: 'rb_kap1', spil: 'runeborg', navn: 'Den grønne brønd', tekst: 'Klar kapitel 1.', ikon: 'pokal' },
    { id: 'rb_kap2', spil: 'runeborg', navn: 'Skoven ved Mosekrogen', tekst: 'Klar kapitel 2.', ikon: 'pokal' },
    { id: 'rb_kap3', spil: 'runeborg', navn: 'Havnen i Saltvig', tekst: 'Klar kapitel 3.', ikon: 'pokal' },
    { id: 'rb_sider1', spil: 'runeborg', navn: 'Hjælper i byen', tekst: 'Klar alle ekstramissioner i kapitel 1.', ikon: 'bog' },
    { id: 'rb_sider2', spil: 'runeborg', navn: 'Hjælper i skoven', tekst: 'Klar alle ekstramissioner i kapitel 2.', ikon: 'bog' },
    { id: 'rb_sider3', spil: 'runeborg', navn: 'Hjælper i havnen', tekst: 'Klar alle ekstramissioner i kapitel 3.', ikon: 'bog' },
    { id: 'rb_skarp', spil: 'runeborg', navn: 'Skarpt blik', tekst: 'Svar rigtigt i første forsøg i mindst 85 % af mindst 10 opgaver.', ikon: 'stjerne' },
    { id: 'rb_evner', spil: 'runeborg', navn: 'Fuld værktøjskasse', tekst: 'Lær alle 20 evner.', ikon: 'taske' },
    { id: 'rb_runemester', spil: 'runeborg', navn: 'Runemester', tekst: 'Find alle 16 runestykker.', ikon: 'krone', laas: 'hat:krone' },
    // ---- Regnehelten
    { id: 'rh_start', spil: 'regnehelten', navn: 'Klar til skole', tekst: 'Klar den første mission.', ikon: 'tal' },
    { id: 'rh_kap1', spil: 'regnehelten', navn: 'En almindelig skoledag', tekst: 'Klar kapitel 1.', ikon: 'pokal' },
    { id: 'rh_kap2', spil: 'regnehelten', navn: 'Udflugten til Dyreparken', tekst: 'Klar kapitel 2.', ikon: 'pokal' },
    { id: 'rh_kap3', spil: 'regnehelten', navn: 'Lørdagsmarkedet', tekst: 'Klar kapitel 3.', ikon: 'pokal' },
    { id: 'rh_kraft50', spil: 'regnehelten', navn: 'Halvt oppe', tekst: 'Nå 50 % Regnekraft.', ikon: 'stjerne' },
    { id: 'rh_kraft100', spil: 'regnehelten', navn: 'Fuld Regnekraft', tekst: 'Nå 100 % Regnekraft.', ikon: 'stjerne', laas: 'hat:hovedbaand' },
    { id: 'rh_rent', spil: 'regnehelten', navn: 'Rent hav', tekst: 'Klar en hel mission uden en eneste fejl (mindst 3 opgaver).', ikon: 'tal' },
    { id: 'rh_vedhold', spil: 'regnehelten', navn: 'Aldrig give op', tekst: 'Klar en opgave i et nyt forsøg fem gange, efter du først svarede forkert.', ikon: 'stjerne' },
    { id: 'rh_taske', spil: 'regnehelten', navn: 'Samler', tekst: 'Få mindst fem ting i tasken.', ikon: 'taske' },
    { id: 'rh_pause', spil: 'regnehelten', navn: 'Pausen er tjent', tekst: 'Spil en pause fra tasken: Straffespark eller Klæd om.', ikon: 'pokal' },
    { id: 'rh_sider1', spil: 'regnehelten', navn: 'Hjælper i kvarteret', tekst: 'Klar alle ekstramissioner i kapitel 1.', ikon: 'bog' },
    { id: 'rh_sider2', spil: 'regnehelten', navn: 'Hjælper i Dyreparken', tekst: 'Klar alle ekstramissioner i kapitel 2.', ikon: 'bog' },
    { id: 'rh_sider3', spil: 'regnehelten', navn: 'Hjælper på markedet', tekst: 'Klar alle ekstramissioner i kapitel 3.', ikon: 'bog' },
    // ---- Eventyrbiblioteket
    { id: 'bib_velkommen', spil: 'bib', navn: 'Velkommen i biblioteket', tekst: 'Gå ind i Eventyrbiblioteket første gang.', ikon: 'bog' },
    { id: 'bib_stil', spil: 'bib', navn: 'Ny stil', tekst: 'Skift udseende i Klædeskabet.', ikon: 'stjerne' },
    { id: 'bib_begge', spil: 'bib', navn: 'Opdagelsesrejsende', tekst: 'Start både Runeborg og Regnehelten.', ikon: 'rune' },
    { id: 'bib_trofae', spil: 'bib', navn: 'Samler af trofæer', tekst: 'Besøg Trofærummet.', ikon: 'pokal' },
    { id: 'bib_mester', spil: 'bib', navn: 'Biblioteksmester', tekst: 'Få alle præstationer i ét af spillene.', ikon: 'krone', skjult: true }
  ];

  LFPraes.find = function (id) { for (var i = 0; i < K.length; i++) if (K[i].id === id) return K[i]; return null; };
  LFPraes.ids = function () { return K.map(function (p) { return p.id; }); };
  LFPraes.forSpil = function (spil) { return K.filter(function (p) { return p.spil === spil; }); };
  LFPraes.antal = function (profil, spil) {
    var liste = spil ? LFPraes.forSpil(spil) : K, har = (profil && profil.praes) || {};
    return { faerdig: liste.filter(function (p) { return Object.prototype.hasOwnProperty.call(har, p.id); }).length, ialt: liste.length };
  };

  // ---------------------------------------------------------------- regler og tjek
  var tests = {};
  LFPraes.registrer = function (spil, t) { tests[spil] = Object.assign(tests[spil] || {}, t); };

  LFPraes.tjek = function (spil, S) {
    var t = tests[spil]; if (!t || !window.LFProfil) return;
    LFProfil.hent().then(function (p) {
      if (!p) return;                                  // endnu ingen figur, så ingen at give det til
      Object.keys(t).forEach(function (id) {
        if (LFProfil.harPraes(p, id)) return;
        var ok = false;
        try { ok = !!t[id](S, p); } catch (e) { /* en halv tilstand (fx midt i en indlæsning) giver bare ingenting */ }
        if (ok) LFProfil.opnaa(id);
      });
    });
  };

  // ---------------------------------------------------------------- pixelikoner
  var ICONS = {
    stjerne: { c: { k: '#1a1420', y: '#ffcc4d', l: '#fff3b0', d: '#c8902a' }, r: ['.....kk.....', '....kyyk....', '....kylk....', 'kkkkkyyykkkk', 'kyyyylyyyyyk', '.kyyyyyyyyk.', '..kyyyyyyk..', '..kyyyyydk..', '.kyyykkyyyk.', '.kyykk.kkyk.', '.kkk.....kk.', '............'] },
    bog: { c: { k: '#1a1420', b: '#6c4c94', l: '#a896c4', w: '#eeeade' }, r: ['............', '.kkkkkkkkkk.', '.kbbbbkwwwk.', '.kbllbkwwwk.', '.kbbbbkwwwk.', '.kbllbkwwwk.', '.kbbbbkwwwk.', '.kbbbbkwwwk.', '.kbbbbkwwwk.', '.kbbbbkkkkk.', '.kkkkkkkkkk.', '............'] },
    rune: { c: { k: '#1a1420', b: '#5a9ee0', l: '#d4ecff' }, r: ['.....kk.....', '....kbbk....', '...kblbbk...', '..kbblbbbk..', '.kbbblbbbbk.', 'kbbbbllbbbbk', 'kbbbbbllbbbk', '.kbbbbbbbbk.', '..kbbbbbbk..', '...kbbbbk...', '....kbbk....', '.....kk.....'] },
    kat: { c: { k: '#1a1420', o: '#e8943a', e: '#7ad06a', p: '#f0a0b0' }, r: ['............', '.kk......kk.', '.kok....kok.', '.kooooooook.', '.kooooooook.', '.koekoookek.', '.kooooooook.', '.koooppoook.', '..kooooook..', '...kkkkkk...', '............', '............'] },
    krone: { c: { k: '#1a1420', y: '#f0c040', d: '#a87818', r: '#d03838' }, r: ['............', '.k...kk...k.', '.kk..kk..kk.', '.kyk.kk.kyk.', '.kyykyykyyk.', '.kyyyyyyyyk.', '.kyyryyryyk.', '.kddddddddk.', '.kkkkkkkkkk.', '............', '............', '............'] },
    tal: { c: { k: '#1a1420', w: '#d8d4e8', g: '#8ad0a0', b: '#6a60a0' }, r: ['..kkkkkkkk..', '..kwwwwwwk..', '..kwggggwk..', '..kwwwwwwk..', '..kwbwbwbk..', '..kwwwwwwk..', '..kwbwbwbk..', '..kwwwwwwk..', '..kwbwbwbk..', '..kwwwwwwk..', '..kkkkkkkk..', '............'] },
    taske: { c: { k: '#1a1420', b: '#c8803a', l: '#e8b060', y: '#ffcc4d' }, r: ['....kkkk....', '...k....k...', '...k....k...', '.kkkkkkkkkk.', 'kbbbbbbbbbbk', 'kblllllllbbk', 'kbbbbkkbbbbk', 'kbbbbkykbbbk', 'kbbbbbbbbbbk', 'kbbbbbbbbbbk', '.kkkkkkkkkk.', '............'] },
    pokal: { c: { k: '#1a1420', y: '#ecc65c', d: '#d0a63e', l: '#fff0b0' }, r: ['.kkkkkkkkkk.', 'kkyylyyyyykk', 'kyklyyyyykyk', 'kykyyyyyykyk', '.kkyyyyyykk.', '..kdyyyydk..', '...kddddk...', '....kddk....', '....kddk....', '..kkddddkk..', '..kddddddk..', '..kkkkkkkk..'] },
    laas: { c: { k: '#1a1420', g: '#8e84a8', d: '#5a5070', y: '#c8b060' }, r: ['....kkkk....', '...kggggk...', '...kg..gk...', '...kg..gk...', '..kkkkkkkk..', '..kyyyyyyk..', '..kyyykyyk..', '..kyyykyyk..', '..kyyyyyyk..', '..kkkkkkkk..', '............', '............'] }
  };
  LFPraes.ikon = function (id, size, graa) {
    var I = ICONS[id] || ICONS.stjerne;
    var s = '<svg viewBox="0 0 12 12" width="' + (size || 40) + '" height="' + (size || 40) + '" shape-rendering="crispEdges" aria-hidden="true"' + (graa ? ' style="filter:grayscale(1) brightness(.55)"' : '') + '>';
    I.r.forEach(function (row, y) { for (var x = 0; x < 12; x++) { var col = I.c[row[x]]; if (col) s += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + col + '"/>'; } });
    return s + '</svg>';
  };
  LFPraes.ikonLaas = function (size) { return LFPraes.ikon('laas', size, false); };
})();
