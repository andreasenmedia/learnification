/* Eventyrbiblioteket — personer, porte og replikker
   Her er ingen opgaver: biblioteket er stedet, man går rundt, vælger et spil
   gennem en port og kigger på sine præstationer. Hvad en port siger, kommer
   fra svaret fra serveren (konto.php?handling=mig): hvor langt man er i
   spillet, og om det passer til ens klasse. */
(function () {
  'use strict';
  var BB = window.BB = window.BB || {};

  // De spil, der har en port. Rækkefølgen er Runeborg først (som resten af siden).
  var SPIL = {
    runeborg: {
      navn: 'Runeborg', url: '/spil/runeborg/', klasser: [5, 9],
      tekst: 'Et fantasyeventyr for 5.-9. klasse. Opklar mysteriet om den grønne brønd med læsning, kildekritik, undersøgelser og data.'
    },
    regnehelten: {
      navn: 'Regnehelten', url: '/spil/regnehelten/', klasser: [1, 6],
      tekst: 'En dag i dit kvarter, hvor regning bliver til noget, man faktisk bruger. For 1.-6. klasse.'
    }
  };

  function at(map, x, y, dir) { return function () { return { map: map, x: x, y: y, dir: dir || 'down' }; }; }

  // Personerne bruger Runeborgs udseendeformat (art.js makeSheet)
  var npcs = {
    brynja: { name: 'Brynja Jernskæg, bibliotekar', look: { hair: '#c8502a', beard: true, beardColor: '#c8502a', hat: 'helmet', hatColor: '#c0a040', accent: '#ffe070', cloth: '#3a5aa8', skin: '#f0b890' }, pos: at('hal', 19, 7, 'down') },
    mira: { name: 'Mira, lærling', look: { hair: '#2a1a1a', cloth: '#5a8a4a', skin: '#8a5a3a' }, pos: at('hal', 14, 13, 'right') },
    mis: { name: 'Mis, kat', cat: true, pos: function (S) { return S.seen && S.seen.mis ? { map: 'hal', x: 21, y: 8, dir: 'down' } : null; } },
    bygge: { name: 'Sigrid, byggeleder', look: { hair: '#e8d8a8', cloth: '#d8a028', hat: 'helmet', hatColor: '#e8c030', accent: '#fff3a0', skin: '#e0a878' }, pos: at('hal', 21, 5, 'left') }
  };

  // Felter man kan tale med eller læse: 'kort:x,y' -> id
  var places = {
    'hal:7,2': 'port_runeborg', 'hal:7,3': 'port_runeborg',
    'hal:31,3': 'port_regnehelten',
    'hal:19,3': 'byggedoer',
    'hal:7,25': 'skilt_skab', 'hal:30,25': 'skilt_trofae',
    'skab:5,1': 'spejl',
    'trofae:4,2': 'vitrine_runeborg', 'trofae:9,2': 'vitrine_regnehelten', 'trofae:14,2': 'vitrine_bib',
    'trofae:9,6': 'sokkel'
  };
  var placePos = { port_runeborg: ['hal', 7, 3], port_regnehelten: ['hal', 31, 3], spejl: ['skab', 5, 1] };

  // g er hjælperen fra game.js: say, ask, port(spilId), spejl(), praestationer(spil)
  var K = BB.content = {
    SPIL: SPIL, npcs: npcs, places: places, placePos: placePos, lockedDoors: {},
    talk: async function (g, id) {
      switch (id) {
        case 'brynja':
          if (!g.seen('hej')) {
            await g.say('brynja', 'Velkommen til Eventyrbiblioteket, {navn}! Her mødes alle Learnifications eventyr.');
            await g.say('brynja', 'Hver port fører ind i sit eget eventyr. Den lysende runeport mod nord er til Runeborg, og den brune dør er til Regnehelten. Gå hen til en port og tryk <span class="key">E</span>.');
            await g.say('brynja', 'Mod vest ligger Klædeskabet, hvor du kan skifte udseende. Det er den samme figur, du spiller som i alle spil. Og mod øst ligger Trofærummet, hvor dine præstationer står.');
          } else {
            var v = await g.ask('brynja', 'Hvad kan jeg hjælpe med?', ['Hvor er spillene?', 'Hvordan får jeg præstationer og mere tøj?', 'Ingenting, tak']);
            if (v === 0) await g.say('brynja', 'Runeporten mod nord er til Runeborg, og den brune dør mod nordøst er til Regnehelten. Bag den afspærrede dør bygger vi det næste.');
            else if (v === 1) await g.say('brynja', 'Du får præstationer, når du klarer noget i spillene. Nogle af dem giver dig nyt tøj til Klædeskabet. Dem kan du se i Trofærummet.');
          }
          return;
        case 'mira':
          await g.say('mira', g.seen('mira') ? 'Jeg har aldrig set Runeborgs port stå åben, men den lukker alle ind, der vil læse og tænke sig om!' : 'Hej! Jeg læser om Runeborg, før jeg går ind. Runeporten er den lysende mod nord.');
          return;
        case 'mis':
          if (!g.seen('misHilst')) { await g.say(null, 'Mis løfter hovedet og kigger på dig med sine grønne øjne.'); await g.say('brynja', 'Hun dukkede op ved min skranke, lige efter du havde fundet hende i Runeborg. Hun kan åbenbart godt lide at læse med.'); }
          await g.say(null, ['«Mjav.»', 'Mis maver sig sammen og begynder at spinde.', 'Mis slikker sin pote og kigger på de store bøger.'][(Math.random() * 3) | 0]);
          return;
        case 'bygge':
          await g.say('bygge', 'Pas på bræddedøren! Vi bygger nye spil derinde. Kom tilbage en anden dag, så er der måske en ny port.');
          return;
        case 'port_runeborg': return g.port('runeborg');
        case 'port_regnehelten': return g.port('regnehelten');
        case 'spejl': return g.spejl();
        case 'byggedoer': return g.say(null, '<b>Flere spil på vej</b><br>Her bygger vi nye eventyr til Eventyrbiblioteket.');
        case 'skilt_skab': return g.say(null, '<b>Klædeskabet</b><br>Her kan du skifte udseende. Det gælder i alle spil.');
        case 'skilt_trofae': return g.say(null, '<b>Trofærummet</b><br>Her står dine præstationer fra alle spil.');
        case 'vitrine_runeborg': return g.praestationer('runeborg');
        case 'vitrine_regnehelten': return g.praestationer('regnehelten');
        case 'vitrine_bib': return g.praestationer('bib');
        case 'sokkel': return g.praestationer(null);
      }
    },
    // Hvem skal have et "!" over hovedet
    markers: function (S) {
      var m = {};
      if (!S.seen.hej) m.brynja = '!';
      return m;
    },
    // Lyset følger klokken, men indendørs er det næsten altid hyggeligt
    timeOfDay: function () {
      var h = new Date().getHours();
      return h < 10 ? 'morgen' : h < 16 ? 'eftermiddag' : h < 20 ? 'aften' : 'nat';
    }
  };

  // Præstationerne, biblioteket selv giver (kataloget ligger i /spil/faelles/praestationer.js)
  LFPraes.registrer('bib', {
    bib_velkommen: function () { return true; },
    bib_stil: function (S) { return !!S.seen.stil; },
    bib_begge: function () { var g = (window.LF_SPILLER || {}).gemt || {}; return !!(g.runeborg && g.regnehelten); },
    bib_trofae: function (S) { return !!S.seen.trofae; },
    bib_mester: function (S, p) {
      return ['runeborg', 'regnehelten', 'bib'].some(function (spil) {
        return LFPraes.forSpil(spil).every(function (pr) { return pr.id === 'bib_mester' || LFProfil.harPraes(p, pr.id); });
      });
    }
  });
})();
