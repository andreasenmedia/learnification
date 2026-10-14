# Learnification.dk

Statisk hjemmeside for Learnification — danske læringsspil til børn. Spillene
er **Runeborg** og **Regnehelten**. Begge er skrevet i ren JavaScript, bygget
på samme måde og spilles direkte i browseren.

Hostes på **Simply.com** (Apache-webhotel). Alt ligger i `public_html`.

## Sider

| Fil | URL | Hvad |
|---|---|---|
| `index.html` | `/` | Forside: hvad Learnification er, spilkort, skærmbilleder |
| `regnehelten.html` | `/regnehelten` | Om spillet: steder, opgavetyper, Regnebogen, Regnekraft |
| `spil/index.html` | `/spil/` | Spiloversigten "Vælg et spil" — her lander man efter login og oprettelse, og "Spil nu" peger hertil. Kræver login |
| `for-voksne.html` | `/for-voksne` | Forældre og lærere: hvad barnet øver, data, FAQ |
| `om.html` | `/om` | Om Learnification |
| `nyheder.html` | `/nyheder` | Nyheder: hvad der er sket på sitet, nyeste øverst. **Bygges af `tools/nyheder.py`** |
| `privatliv.html` | `/privatliv` | Privatlivs- og cookiepolitik. **Ret den, når noget nyt gemmes** |
| `404.html` | — | Vises ved forkert adresse |
| `tilmeld.php` | — | Tager imod tilmeldinger til spørgeskemaet |
| `resultat.php` | — | Tager imod resultater fra testomgangene |
| `.htaccess` | — | Serveropsætning. **Læs den, før du retter i strukturen** |
| `spil/regnehelten/` | `/spil/regnehelten/` | Selve Regnehelten — bygget som Runeborg, ingen bygning |
| `runeborg.html` | `/runeborg` | Om Runeborg: historien, PISA-grundlaget, missionerne |
| `spil/runeborg/` | `/spil/runeborg/` | Selve Runeborg — skrevet direkte her, ingen bygning |
| `login.html` | `/login` | Log ind: elev med sin egen kode, voksen med mail og kodeord, glemt kodeord |
| `opret.html` | `/opret` | Opret konto som et lille spørgeskema (hvem skal spille? → børnenes navne og klassetrin / skolens navn → om dig) |
| `konto.html` | `/konto` | Den voksnes side: klasser, elever, koder og spilletid |
| `login-kort.html` | `/login-kort?g=<id>` | Login-kort til udskrift, ét pr. elev |
| `admin.html` | `/admin` | Overblikket over alle testbrugere (kun administrator) |
| `statistik.html` | `/statistik` | Besøgsstatistik: kilder, landingssider, vejen rundt (kun administrator) |
| `api/` | — | PHP bag login-systemet. Se "Login og testkonti" |

## Runeborg

8-bit fantasyspil for 5.-9. klasse, skrevet i ren JavaScript uden
biblioteker og uden bygning: filerne i `spil/runeborg/` **er** spillet.
Retter man i dem, er det bare at uploade. Tæl `?v=` op i
`spil/runeborg/index.html`, når en `.js`- eller `.css`-fil er lavet om.

Indholdet er valgt ud fra de områder, hvor danske elever klarede sig
dårligst i PISA 2025 (offentliggjort 8. september 2026): læsning (finde
information, fakta/holdning, kildekritik), naturfag (planlægge undersøgelser
og især fortolke data og evidens) og hverdagsmatematik (forhold, procent,
målestok). Computationel problemløsning er udeladt — der lå danske elever
over OECD-gennemsnittet. Kilderne står nederst i PISA-afsnittet på
`/runeborg`.

| Fil | Hvad |
|---|---|
| `js/content.js` | **Alt indhold**: personer, missioner, opgaver, spor, evner, runestykker. Her retter man tekster og opgaver |
| `js/world.js` | Kortene, bygget med små hjælpefunktioner (hus, gade, å) |
| `js/art.js` | Al grafik, tegnet i kode — ingen billedfiler |
| `js/game.js` | Motoren: bevægelse, samtaler, døre, gemning, lys og stemning, joystick |
| `js/ui.js` | Dialog, opgavetyper, dagbogen, menu, skærmtastatur, grafer |
| `js/audio.js` | Lyd og musik, lavet med WebAudio i browseren |
| `js/voice.js` | Oplæsning af replikker: indtalte filer i `lyd/`, ellers browserens danske stemme |

**Missionerne bygger på hinanden.** Hver mission giver en evne og spor i
dagbogen, og senere missioner bruger dem — fx er de spor, man fremlægger for
borgmesteren, præcis dem, der står i spillerens dagbog. Tilføjer man en
mission, skal den have `requires` og gerne `uses` (vises i dagbogen).

**Spillet sender spilletid og det gemte eventyr** (se "Gemte spil").
Eventyret gemmes i `localStorage` (`runeborg-v1[-elev.<id>]` og
`runeborg-indstillinger`) og, når man er logget ind, også på serveren via
`js/gem.js`. Der er intet `resultat.php`-kald. Skal det ændres, skal
`/privatliv#gemte-spil` rettes samtidig.

**Berøringsskærme:** joystick, E-knap og skærmtastatur (QWERTY med æøå til
navnet, taltastatur til regneopgaver) dukker op ved første berøring og
gemmer sig efter 5 sekunders stilhed.

**Oplæsning:** alle replikker (og opgavernes spørgsmål) er læst ind på
forhånd med Piper — lokal, open source talesyntese med den danske stemme
`da_DK-talesyntese-medium` — og ligger som `spil/runeborg/lyd/<nøgle>.mp3`
med listen `lyd/stemmer.json`. Hver person har sin egen klang (tonehøjde og
tempo i `PROFIL` øverst i værktøjet). **Retter man en replik, skal lyden
laves igen**, ellers er den replik tavs (eller læses af browserens egen
danske stemme, hvis den har en):

```bash
python tools/runeborg-stemmer.py
```

Kun nye og ændrede replikker bliver indtalt, og overflødige filer slettes.
Spillerens navn kan ikke indtales på forhånd og læses derfor som "lærling".
Kræver `pip install piper-tts`, stemmen (`python -m piper.download_voices
da_DK-talesyntese-medium`, lægges i `%LOCALAPPDATA%/piper-voices`) og
ffmpeg. Nøglen er en hash af person + renset tekst, så `clean()` og `fnv()`
i værktøjet skal svare præcis til dem i `js/voice.js`.

**Test fra konsollen:** `RB.debug.tp('by', 24, 20)` teleporterer,
`RB.debug.S` er hele tilstanden.

**Nye skærmbilleder til siden:** `python tools/runeborg-billeder.py`
starter den lokale server, åbner spillet i en usynlig Chrome med
`#foto=<scene>` og gemmer `assets/billeder/runeborg-*.png`. Fototilstanden
gemmer intet.

## Regnehelten

Matematikspil for 1.-6. klasse. Det var oprindeligt skrevet i Python
(pygame) og kørte i browseren som WebAssembly. I oktober 2026 blev det bygget
om, så det er **bygget og spilles præcis som Runeborg**: samme motor, samme
styring (piletaster/WASD eller joystick, `E`, `B` for Dagbogen, `Esc`), samme
vinduer, skrift, gemning og oplæsning. Filerne i `spil/regnehelten/` **er**
spillet — ingen bygning. Tæl `?v=` op i `spil/regnehelten/index.html`, når en
`.js`- eller `.css`-fil er lavet om. Python-udgaven ligger stadig i
`Claude/Projects/matematik-eventyr`, men er ikke længere den, siden kører.

| Fil | Hvad |
|---|---|
| `js/opgaver.js` | **Matematikken**: klassetrinnene (Fælles Mål), regneloftet og de tolv opgavesæt. Oversat linje for linje fra `content.py` i Python-udgaven |
| `js/content.js` | Historien: personer, missioner, opgavesættenes replikker, Regnebogens sider, tingene i tasken |
| `js/world.js` | Kvarteret (hjem, supermarked, kiosk, bibliotek, skole, park) og de fem rum |
| `js/art.js` | Grafikken — et dansk kvarter i oktober, tegnet i kode som Runeborgs |
| `js/game.js` | Motoren (Runeborgs) plus opgavesæt, belønninger og pausespil |
| `js/ui.js` | Dialog, de otte måder at svare på, Dagbogen (missioner, Regnebogen, tasken), Klæd om og Straffespark |
| `js/audio.js` | De samme rolige temaer som i Python-udgaven, spillet på Runeborgs bløde klang |
| `js/voice.js`, `js/gem.js` | Som i Runeborg |
| `js/resultat.js` | Sender resultatet til `resultat.php` i samme format som før |

**Klassetrinnene skal holde.** Efter enhver ændring i `js/opgaver.js`:

```bash
python tools/regnehelten-tjek.py
```

Den laver ca. 88.000 opgaver i en usynlig Chrome og måler hver eneste mod
trinnenes regler (de samme som `tjek_klassetrin.py` i Python-udgaven:
regningsarter, talområde, regneloft, fortegn) — og tjekker, at alle
byg-selv-opgaver kan løses, og at hvert facit bliver godkendt.

**Oplæsning:** `python tools/regnehelten-stemmer.py`, som i Runeborg.

**Læs opgaver op** (begge spil, 2026-10-13): `elever.oplaes` (DB-trin 16) slås til af den voksne på
/konto (`klasse.php` `oplaes`) eller af barnet i spillets menu (`profil.php` `oplaes`); spillene læser det
fra `LF_SPILLER.elev.oplaes` (voksne spillere: kun localStorage). `voice.raekke()` læser spørgsmål +
svarmuligheder efter hinanden, `.laeses` fremhæver, og hver mulighed har et `.lyt`-højttalerknap
(`spil/faelles/vinduer.css`). Svarmulighederne er indtalt af stemme-værktøjerne; mangler en fil, læser
enhedens egen danske stemme (Regnehelten: stykker), ellers er der stille.
Opgaverne bliver lavet på stedet med nye tal hver gang, så de kan ikke
indtales på forhånd; dem læser enhedens egen danske stemme op, hvis den har
en (fx iPad). Ellers vises knappen "Læs op" ikke ved opgaven.

**Gemte spil:** `regnehelten-v2[-elev.<id>]`, `regnehelten-synk-<id>` og
`regnehelten-indstillinger` i `localStorage` og serveren via `js/gem.js`.
Et spil gemt med Python-udgaven bliver læst og ført over
(`fraFoersteUdgave()` i game.js): navn, klassetrin, udseende, hvor langt man
nåede, Regnekraft, tasken og omgangens resultater. `gemt_status()` i
`api/_kerne.php` kender begge formater.

**Test fra konsollen:** `RH.debug.tp('by', 52, 10)` teleporterer,
`RH.debug.S` er hele tilstanden. **Skærmbilleder:**
`python tools/regnehelten-billeder.py` → `assets/billeder/regnehelten-*.png`
(fototilstanden `#foto=<scene>`).

## Eventyrbiblioteket, den fælles figur og præstationer

Børn lander efter login i **Eventyrbiblioteket** (`/spil/biblioteket/`): en stor hal i Runeborgs pixelstil, hvor man går rundt og vælger en port. Mod nord står Runeborgs lysende runeport og Regneheltens brune dør, og en afspærret dør er til de næste spil. Vest for hallen ligger Klædeskabet (spejl = figureditor), øst for den Trofærummet (præstationer). Ved en port vises, hvor langt barnet er (`gemt` fra `konto.php?handling=mig`) og om spillet passer til klassen; "Gå ind" sender til `/spil/<spil>/`.

**Begge veje ind:** børn lander i biblioteket (`login.html` kodelogin og `konto.html` "Log ind som barn" sender til `/spil/biblioteket/`), men `/spil/` viser spilkortene til alle, også børn, med et bredt kort til biblioteket øverst og "★ x af y præstationer" pr. spil. Knapperne på forsiden, `runeborg.html` og `regnehelten.html` går direkte ind i spillet som før. Voksne lander stadig på `/spil/`.

- **Motoren** er en kopi af Runeborgs (`spil/biblioteket/js/`, namespace `BB`), uden opgaver og kapitler. Portalfliserne (`Ø Þ Ð Æ Å Ý` i `art.js`) er nye; resten af fliserne er Runeborgs. Biblioteket tæller ikke som spilletid (`LFSpil.start` kaldes med `aktiv:false`, kun for login og prøvetid); er tiden brugt, er portene låst. Stemmerne laves med `python tools/biblioteket-stemmer.py` (samme værktøj som Runeborgs, kør igen efter tekstændringer i `content.js`). Skærmbilleder: `python tools/biblioteket-billeder.py` (scenerne `hal` og `trofae` via `#foto=`) → `assets/billeder/biblioteket-*.png`.
- **Figuren** er barnets og fælles for alle spil: tegning, paletter og låst tøj i `spil/faelles/figur.js` (`LFFigur`), profilen i `spil/faelles/profil.js` (`LFProfil`, localStorage + `api/profil.php`, tabellen `profiler`, DB-trin 12) og editoren i `spil/faelles/editor.js` + `figur.css` (`LFEditor`). Spillene bruger kun figuren til spilleren; NPC'er tegnes af hvert spils egen `art.js`. Profilen er `{navn, look, oplaast, praes, bib:{fra,set}}`. Der er ét delt profilobjekt pr. side (det `hent()` giver); `gem()` renser det på stedet.
- **Runeborg**: klassen giver kun en hat (`classes[i].hat`) ovenpå barnets figur. **Regnehelten**: "Klæd om" åbner den fælles editor og ændrer profilen.
- **Låst tøj** (`GENSTANDE` i `figur.js`): `LFProfil.laasOp('hat:beret')` osv. (Regnehelten: Tøjposen → baret, kapitel 1 → høj hat, kapitel 3 → hætte; Runeborg: kapitel 1/2/3 → troldmandshat/fjerhat/hjelm). Nyt tøj skal stå i `GENSTANDE`, og en ny hat skal have et overlay i `HAT`.
- **Præstationer** (`spil/faelles/praestationer.js`, `LFPraes`): kataloget (`KATALOG`) er det samme, Trofærummet viser. Hvert spil registrerer sine regler som `test(S)` i `js/praes.js` (Runeborg, Regnehelten) eller i `biblioteket/js/content.js`. `LFPraes.tjek(spil, S)` kaldes fra `save()` og `begin()`, så en gammel save også får det, den har fortjent. `LFProfil.opnaa(id)` er idempotent, gemmer med det samme, viser en toast og låser tøj op, hvis præstationen har `laas`. **En ny præstation:** føj den til `KATALOG`, skriv testen, og (hvis den giver tøj) sæt `laas`. Bump `?v=` på de ændrede filer.
- **Første gang**: hvert sted uden profil åbner "Hvem er du?" (navn + figur). Har barnet en Regnehelten-save, bruges dens navn og udseende som start.
- **Test lokalt**: biblioteket kræver login, så brug `learnification-php`-opsætningen i "Test lokalt med PHP". `BB.debug.tp('hal', 7, 4, 'up')` og `BB.debug.interact()` flytter og trykker E (rAF står stille i et skjult browserpane, så tag skærmbilleder). `LFProfil.opnaa('rb_runemester')` giver en præstation med det samme.

### "Start eventyret her" (`/start/`) og "kun ét spil"

Menuen har ingen spil-links, kun den glimtende knap `.glimt` ("Start eventyret her", `/start/`; også i mobilmenuen, på forsiden i stedet for "Spil nu", og ved siden af burgeren under 960 px). `start/index.html` spørger `konto.php?handling=mig` og sender videre: ikke logget ind -> `/login?til=/start/` (login og `/opret` husker `?til=`), **forælder (familiekonto) -> "Hvem skal spille?"** (hvert barn eller "Mig selv"; barnet logges ind via `klasse.php log_ind_som` og `/start/` sender det videre; spørges hver gang), barn -> `konti.kun_spil` -> testrundens `test_start` -> `/spil/biblioteket/`.
**Kun ét spil** (DB-version 14, `konti.kun_spil` = `''`/`runeborg`/`regnehelten`): valgt på `/opret` (børnetrinnet) og under Min konto (`konto.php kun_spil`, kun familiekonti). Gælder børnene, ikke den voksne (`mig` giver `konto.kun_spil`, klienterne bruger den kun når `hvem === 'elev'`). Håndhævelse er i JavaScript som login-kravet: `assets/spilletid.js` sender barnet fra det andet spil til det tilladte (biblioteket sætter `bibliotek: true`), porten i Eventyrbiblioteket er låst, `/spil/` skjuler det andet kort, og `elev.php login` giver `til`. Et barn uden figur sendes stadig først til biblioteket (`game.js`), så figuren kan laves.
Berøringsknapperne (joystick, E, Bog, Kort) er mindre på telefon i `spil/faelles/vinduer.css` (nederst); spillenes `game.js` læser joystickets størrelse fra `#stick-base`.

## Udseende

Siden har ét stilark, `assets/style.css`, skrevet i hånden. Farverne er
papir og blæk med en varm orange til knapper og links — de samme toner som
i spillet, så rammen om Regnehelten ligner det, der kører indeni.

Skriften er **Fraunces** til overskrifter og **Inter** til brødtekst.
De ligger på vores eget webhotel i `assets/skrifter/` (Runeborgs Atkinson
Hyperlegible og Pixelify Sans ligger samme sted) og bliver linket med
`/assets/skrifter/site.css` eller `runeborg.css`. **Link aldrig direkte til
fonts.googleapis.com igen**: så sender hver besøgendes browser sin IP til
Google uden samtykke, og det er set som et GDPR-brud. Skal der flere vægte
med, så ret `tools/hent-skrifter.py` og kør den.

Der lå på et tidspunkt et større designsystem henover siden med `tokens.css`
og `components.css` i et mørkt tema. Det blev rullet tilbage igen, fordi det
lyse udtryk klæder spillet bedre. Vil man se på det, ligger det i historikken
under `Laeg designsystemet Learnification ned over hele siden`.

## Den gamle tilmeldingsport (afløst af login)

**Porten er fjernet fra `/spil/` og afløst af login-systemet nedenfor.**
`tilmeld.php` og de gamle tilmeldinger i `tilmeldinger.csv` ligger der
stadig, men ingen side sender til den længere. Resten af afsnittet
beskriver, hvordan den virkede.


Mens Regnehelten er til test, skal en voksen skrive **navn, mailadresse og
eventuelt mobilnummer**, før spillet kan gå i gang. Porten er en dialog, der
lægger sig over `/spil/`, og den er stilet til den voksne — ikke til barnet,
der sidder ved skærmen. Den samme formular ligger også som en almindelig
tilmelding nederst på `/for-voksne`.

**Sådan slukkes porten, når testen er slut:** i `spil/index.html` står

```js
var KRAEV_TILMELDING = true;
```

Sæt den til `false`. Så er porten væk, og spillet starter som før. Resten —
formularen på `/for-voksne`, `tilmeld.php`, listen — bliver ved med at virke.

Porten spørger kun én gang pr. browser: efter en tilmelding står der
`lf-tester` i `localStorage`, og så kommer den ikke igen. Den er lavet i
JavaScript og er ikke en lås — den, der vil, kan komme uden om den. Den er
til at samle testere, ikke til at beskytte noget.

`tilmeld.php` tager imod og gemmer **kun** tidspunkt, navn, mailadresse,
mobilnummer og hvilken side tilmeldingen kom fra. Ingen IP-adresser, ingen
cookies, ingen tredjeparter. Der ryger også en mail til adressen øverst i
filen, så listen findes to steder.

**Hvor listen ligger.** Helst i `learnification-data/tilmeldinger.csv` én
mappe **over** `public_html`, hvor den ikke kan hentes ned fra nettet. Kan
PHP ikke skrive der, ryger den i `public_html/data/` i stedet, og den mappe
er spærret af sin egen `.htaccess`. Hvilken af de to der blev brugt, står i
beskeden, du får på mail.

**Kolonnerne står i `KOLONNER` øverst i `tilmeld.php`.** Laves de om, bliver
den gamle fil automatisk lagt til side som `tilmeldinger-tidligere-<dato>.csv`,
og der bliver startet en ny. Så bliver to formater aldrig blandet sammen, og
ingenting går tabt.

**Sådan får du fat i listen:** File Manager i Simply.coms kontrolpanel, eller
FTP. Filen er almindelig CSV og kan åbnes i Excel eller Numbers.

**Sletning.** Beder nogen om at blive slettet, fjerner du linjen i CSV-filen.
Der er ikke andre steder, oplysningerne ligger.

**Teksten om privatliv på `/for-voksne` skal passe.** Der står, hvad vi beder
den voksne om, hvad det bruges til, og at spørgsmålet falder væk, når testen
er slut. Laves opsamlingen om — en tredjepartstjeneste, flere felter, andre
formål — skal den tekst rettes samtidig.

## Login og testkonti

Mens spillene er til test, skal man være logget ind for at spille. Det
giver et overblik over, hvem der tester, og hvor meget de spiller.

**Hvem logger ind hvordan**

- **Den voksne** opretter en konto på `/opret` med navn, mail og kodeord og
  logger ind på `/login` (mail og kodeord er det første, man ser dér; børnenes
  kode-login står i en mindre boks under, og `/login#elev` går direkte til den).
- **/opret er et spørgeskema** (trin i samme panel): 1) *Hvem skal spille?*
  Mig selv / Mine børn / En klasse, 2) børnenes fornavne med valgfrit klassetrin
  (`boern: [{navn, klassetrin}]` → `opret_konto()` → `nye_elever()` skriver
  `elever.klassetrin`) eller skolens navn, 3) om dig. Familie oprettes direkte som
  `foraelder` med gruppen "Familien" og børnene; skole som `skole`. På
  `/spil/` viser en familiekonto bagefter "Hvem skal spille?" med et kort pr.
  barn (`log_ind_som`) og "Mig selv" (huskes i fanen). Det der står herunder om
  "alle konti starter som til mig selv" gælder nu kun valget *Mig selv*.
- **Konti til mig selv** (`konti.type = 'privat'`): den
  voksne spiller selv og har sin egen prøvetid. Kontoen er til
  folk, der er fyldt 15 år (det står på /opret og /login, og man bekræfter det i det påkrævede
  flueben på /opret); yngre sættes på
  af en voksen som barn med kode. Skal der børn på, vælger man
  det bagefter under `/konto` → "Skal andre også spille?" (`skift_type` i
  `api/konto.php`): **Familie** får én gruppe, "Familien", og børnenes navne;
  **Skole** får skolens navn (den voksne bliver kontaktperson) og laver så
  klasser (fx 4.B) med elevernes fornavne. `/opret?type=skole` (eller
  `familie`) åbner det rigtige valg på `/konto` lige efter oprettelsen.
  Det går kun den vej — vil man tilbage, gør administratoren det. Begge
  valg kræver fluebenet "Jeg er fyldt 15 år" (tjekkes også i PHP).
- **Hvert barn** får sin egen **kode** som `RAVN-4827` (dyr + fire cifre),
  går ind på `/login` og skriver den — så er det inde. Der er ingen navne at
  trykke på, så et barn kan ikke komme ind som en klassekammerat. Ingen mail
  og intet kodeord til børn. Små bogstaver, mellemrum og manglende bindestreg
  er ligegyldige. Koden står i tabellen under `/konto` og på login-kortene;
  "Ny kode" ud for barnet laver en ny og logger barnet ud.
- **Den voksne kan gå ind som et barn** fra `/konto` ("Log ind som Emma",
  `log_ind_som` i `api/klasse.php`) og lander på `/spil/`. Den voksnes eget
  login bliver parkeret i den httponly cookie `lf_voksen` (`log_ind_som_barn`
  i `_kerne.php`), så "Tilbage til <navn>" på `/spil/` og `/login` henter det
  igen uden kodeord (`tilbage` i `api/konto.php`, `tilbage_til` i `mig`).
  Spillenes Esc-menu (og "tiden er brugt") linker til `/spil/?tilbage=1`, så
  spillet gemmer som barnet (pagehide), før skiftet sker; skiftet kører før
  siden spørger `mig` (`LF_SKIFTER`), ellers sletter et sent svar `lf_in`.
  `gem.js` sender `hvem` med, og `gem.php` afviser (401), hvis loginnet er
  skiftet imens — så barnets spil aldrig lander hos den voksne.
  Knappen findes KUN, når den voksne selv gik ind som barnet — logger barnet
  ind med sin kode, er der ingen vej til den voksnes side. Logger barnet ud,
  eller logger nogen ind på en anden måde, bliver det parkerede login slettet.
  Administratoren kan ikke gå ind som andres børn.
- Grupperne har stadig en klassekode (`UGLE-472`) i databasen, men den
  bruges ikke til login længere. Skriver et barn en gammel klassekode, får
  det besked om at spørge efter sit nye login-kort.
- Nye konti kan bruges med det samme, står som **Ny** i overblikket og kan
  godkendes eller spærres derfra. En spærret konto og alle dens elever bliver
  logget ud med det samme.
- **Administratoren kan oprette og rette konti** i `/admin`: "Opret konto"
  (`#ny-konto`) laver en godkendt konto af enhver type (med påkrævet flueben
  for, at personen er fyldt 15 år) — med et kodeord, eller
  uden, så får personen en mail med et link til selv at vælge et (7 dage).
  Under en konto: ret navn, mail, by, type og status (skiftes typen, skal
  15-års-fluebenet sættes igen); sæt et nyt kodeord eller
  send et link (24 timer); slet kontoen (mailadressen skal skrives som
  bekræftelse); og sæt børn og klasser på, omdøb, giv ny kode og slet — det
  går gennem `api/klasse.php` med `"konto": <id>`, som kun en administrator
  må sende. Administratorkonti kan ikke rettes herfra.

**Spilletid** bliver målt af `assets/spilletid.js` på begge spillersider. Et
sekund tæller, når spillet er fremme på skærmen, og nogen har rørt tastatur, mus
eller skærm inden for to minutter. Tiden sendes til `api/spilletid.php` hvert
halve minut og med `sendBeacon`, når fanen lukkes. Serveren lægger aldrig
mere tid til, end der faktisk er gået siden sidste puls (højst 90 sek. ad
gangen), og en pause på over en halv time starter en ny "omgang". Det gælder
på tværs af faner: hver fane er sin egen omgang, men har en anden omgang for
samme spiller sendt en puls inden for 90 sek., tæller kun tiden siden den —
ellers løb tiden dobbelt så hurtigt med spillet åbent to steder (rettet
2026-10-07). Det gælder kun **børn med egen kode**; på den voksnes login kan
flere børn spille samtidig, så dér tæller hver fane fuldt (fra 2026-10-13).
Tidslinjen i /admin har "Tæl tiden fuldt igen" (`fortryd_overlap`), som giver
overlappende omgange på den voksnes login deres egen tid på uret tilbage
(modsat "Ret den dobbelttalte tid").

**Spilletid i /admin**: overblikket viser stablede søjler pr. dag pr. spil
(Runeborg blå, Regnehelten guld — klasserne `spil-<id>` i `konto.css`), en
spillertragt (oprettet → spillet → halv/hel prøvetid → skema sendt/besvaret)
og prøvetiden som bjælke pr. konto (`proeve_sek`: den voksne selv på "til sig
selv", ellers den spiller, der har brugt mest; ⚠ når der er talt mere end
grænsen). Én konto har en tidslinje over omgangene (`admin.php?handling=omgange`):
én bane pr. spiller, overlappende omgange i hver sin række med ⚠.

**Sådan slukkes login-kravet**, når testen er slut: sæt
`var KRAEV_LOGIN = true;` til `false` i både `spil/regnehelten/index.html`
og `spil/runeborg/index.html`. Så kan alle spille, og tiden bliver stadig talt
for dem, der er logget ind. Login-kravet er lavet i JavaScript og er ikke en
lås — spilfilerne kan hentes direkte. Skal spillene en dag bag betaling, skal
de leveres gennem PHP i stedet.

**Runeborg gemmer hvert barns eventyr for sig.** Nøglen i `localStorage` er
`runeborg-v1-elev.<id>`, når et barn er logget ind (id'et læses fra cookien
`lf_in`), ellers `runeborg-v1` som før. Så spiller en klasse, der deler
computere, ikke videre i hinandens eventyr. Menuen i Runeborg har "Log ud".

### Første gang på Simply.com: opret administratoren

1. Læg siden op som altid (push til `main`).
2. Åbn `learnification.dk/admin`. Siden skriver en nøgle i
   `opsaetningsnoegle.txt` i datamappen — `learnification-data/` ved siden af
   `public_html`, eller `public_html/data/`, hvis PHP ikke må skrive der.
   Siden fortæller hvilken.
3. Hent nøglen med File Manager i kontrolpanelet, skriv den på siden sammen
   med navn, mail og kodeord (mindst 10 tegn). Filen slettes, og opsætningen
   lukker. Der kan kun oprettes én administrator på den måde.

Administratorens egen spilletid tæller ikke med i overblikket.

### Hvor data ligger

Alt ligger i SQLite-filen `learnification.sqlite` i datamappen (samme mappe
som `tilmeldinger.csv`). Den opretter sig selv. Ved siden af ligger
`hemmelighed.txt` (bruges til at hashe IP-adresser i gætte-bremsen) —
**slet ikke de to filer**, og tag gerne en kopi af databasen med File Manager
en gang imellem.

Har webhotellet ikke SQLite slået til (så siger `/admin` det), kan MySQL fra
kontrolpanelet bruges i stedet: læg en `database.php` i datamappen — se
kommentaren øverst i `api/_kerne.php`. Den fil må aldrig i repoet.

Tabellerne står i `opret_tabeller()` i `api/_kerne.php`. Skal de ændres,
tilføjes et nyt trin nederst i `$trin`, så eksisterende databaser bliver
løftet op af sig selv.

**Hvad der gemmes** (og står på `/for-voksne#data` — ret teksten der, hvis
det ændres): den voksnes navn, skolens navn, by, mail og kodeordet som hash;
børnenes kaldenavn, login-kode, gruppe og spilletid pr. spil og dag. IP-adresser kun som
HMAC-hash i højst en time til gætte-bremsen. Én login-cookie `lf_session`
(tilfældig nøgle, kun dens SHA-256 står i databasen) og en harmløs
`lf_in=elev.<id>`, som siderne bruger til at vide, at nogen er logget ind.

**Sletning:** den voksne kan selv slette børn og hele kontoen under
`/konto`. Slettes et barn, bliver dets spilletid stående på kontoen uden navn,
så tallene i overblikket ikke hopper. Slettes kontoen, forsvinder alt.

**Sikkerhed, kort:** kodeord med `password_hash`; alt, der ændrer noget,
kræver headeren `X-LF: 1` (en fremmed side kan ikke sætte den); `api/_*.php`
og `data/` er spærret; forkerte elevkoder bremses til 30 pr. kvarter pr.
adresse (rigtige tæller ikke, så en hel klasse bag én IP kan logge ind), login til 8 pr. kvarter pr. mail. Glemt kodeord sender et link med
`mail()` til den voksne, gyldigt i en time.

### API

| Fil | Handlinger |
|---|---|
| `api/konto.php` | `mig`, `opret`, `login`, `logud`, `glemt`, `nulstil`, `skift_kodeord`, `ret`, `slet_konto` |
| `api/klasse.php` | `oversigt`, `ny_gruppe`, `ret_gruppe`, `slet_gruppe`, `nye_elever`, `ret_elev`, `ny_elevkode`, `slet_elev` |
| `api/elev.php` | `login` |
| `api/spilletid.php` | `puls` |
| `api/admin.php` | `status`, `opsaet`, `overblik`, `konto`, `omgange`, `saet_status`, `ny_konto`, `ret_konto`, `kodeord`, `slet_konto`, `eksport` (CSV til Excel) |

### Test lokalt med PHP

Der er ingen PHP installeret på maskinen som standard. Med en portabel PHP
(zip fra windows.php.net, `extension=pdo_sqlite` slået til i `php.ini`):

```bash
php -S 127.0.0.1:8792 tools/lokal-router.php
```

fra projektets rodmappe. Routeren opfører sig som `.htaccess` og lægger
databasen i systemets midlertidige mappe, så testdata aldrig havner i repoet.

## Skoletest (testrunder)

Når spillene skal testes på en skole: **/admin#skoletest** (`#test`) → "Ny testrunde", skriv
antal spillere. Der oprettes en almindelig skolekonto med `konti.test = 1` og fri adgang
(ingen tidsgrænse) og elever, der hedder Spiller 1, 2, 3 … med hver sin kode (RAVN-4827).
"Udskriv koder" åbner `/login-kort?konto=<id>&g=<gruppe>` (samme side som lærernes login-kort).

- **Live overblik** (`api/test.php?handling=status`, opdateres hvert 10. sek.): prik pr. spiller
  (grøn = puls/gem inden for 80 sek., gul < 5 min), hvilket spil, kapitel, hovedmissioner i kapitlet,
  **sted** og **mission**. Sted og mission står i det gemte spil som `S.hud` (`hudInfo()` i
  `spil/*/js/game.js`, læses af `gemt_status()`), så de opdateres ved hver gemning.
- **Spørgeskema til eleverne:** knappen "Vis spørgeskemaet nu" opretter en række i `testskema`.
  Børn på en testrunde har cookien `lf_test` (sat i `log_ind()`), og `assets/elevskema.js` (indlæst af
  /spil/ og begge spil) spørger hvert 8. sek. `api/test.php?handling=skema_aktuel`. Vinduet har seks
  spørgsmål med store knapper (`ELEV_SKEMA` i `api/test.php` — ret dem dér), tastaturgenveje 1-9, og
  blokerer tastetryk til spillet, mens det er åbent. Svar: tabel `testsvar` (ét pr. barn pr. skema).
  Resultater tælles op i admin og kan hentes som CSV (`handling=csv`, semikolon + BOM).
- **Hvor starter børnene?** "Børnene starter i" (Eventyrbiblioteket / Runeborg / Regnehelten) ved oprettelsen og som
  vælger i runden (`konti.test_start`, `indstil` i `api/test.php`). `api/elev.php login` giver `til`, og `login.html` sender barnet
  dertil (et `?til=` vinder stadig). Tom = Eventyrbiblioteket.
- **Se live** (DB-version 13: `elever.sidst_sted`, tabel `testlive`): knappen "👁 Se live" på et spillerkort åbner et vindue i
  /admin#test. Vinduet kalder `live_hent` hvert 1,5 sek., og det sætter `testlive.set_af`. Barnets `assets/elevskema.js` spørger
  hvert 5. sek. `skema_aktuel&spil=…` (det er også pulsen, der gør, at børn i Eventyrbiblioteket kan ses), får `se: true` tilbage og
  sender så hvert 1,5 sek. et JPEG af `#screen` + teksten fra `#layer` (`handling=live`). Intet sendes, når ingen ser med; billedet
  slettes, når vinduet lukkes (`live_stop`). Hvert spil sætter `window.LFLive.info()` som tekst-reserve.
- Testrunder holdes ude af /admins almindelige tal, velkomstmail, påmindelse og skema-mail (`test = 0`
  i forespørgslerne). Slet runden, når testen er slut (sletter også svarene).
- DB-version 10 (`test`, `testskema`, `testsvar`).
- **Testrunde → rigtig konto:** "Gør til rigtig konto" (`goer_rigtig` i `api/test.php`) sætter skole, ansvarlig og mail,
  slår `test`/fri adgang fra og sender et link til at vælge adgangskode (7 dage). Eleverne, koderne og de gemte spil bliver stående.
  Den ansvarlige kan bagefter rette navnene under /konto → "Ret alle navne" (`ret_navne` i `api/klasse.php`).

## Kort (M), hurtig guide og vinduer uden scroll

Fælles for de tre spil, i `spil/faelles/`: `kort.js` (kortvinduet), `guide.js` ("Sådan spiller du", 4 kort, vises første gang i hvert spil
via `S.seen.guide` og kan åbnes fra pausemenuen) og `vinduer.css` (indlæses sidst i hvert spil).

- **M** åbner kortet (musik er flyttet til **L**), også knapperne "Kort" i HUD'en og på berøringsskærmen. Kortet er områdets
  forudtegnede bane (`cache[...]`) med nåle ved husenes døre, missionen og "Her er du", og en liste over steder og personer.
  Man trykker på et sted: kortet flytter ikke barnet, men `valgt` i `game.js` får pilen i kanten af skærmen (`arrow()`) til at vise vej
  dér i stedet for til missionen (HUD'en skriver "Vej til …"). Pilen forsvinder, når man er fremme. Hvert spil har sin egen
  `kortData()`; Eventyrbiblioteket fik `doorToward()` og `arrow()` fra Runeborg.
- **Vinduerne følger pladsen:** `max-height: 100%` i stedet for `calc(100vh - 32px)`, overskrift (`.book-head`) sticky, Dagbogens
  missioner i flere spalter, pausemenuen i to rækker, kompakte regler under 720/560/420/380 px højde og for 560 px bredde. Rigtigt
  lange lister (Regnebogen, personlisten på en telefon på langs, alle præstationer) ruller stadig, men overskrift og Luk står fast.
  Test af alle opgavetyper: se `Object.keys(RH.opgaver.SAET)` i konsollen og mål `.task`s `scrollHeight` mod `clientHeight`.

## Klassetrin

`assets/klassetrin.js` (på /spil/ og i begge spil) spørger børn uden klassetrin "Hvilket klassetrin går du i?" (0.-9.) én gang.
Gemmes i `elever.klassetrin` (DB v11) via `konto.php?handling=saet_klassetrin`; har klassen et klassetrin, bruges det og der spørges ikke.
`mig` giver `elev.klassetrin` (null = spørg). Regnehelten bruger det som startklasse (1-6) i oprettelsesskærmen, /spil/ som "Passer til din klasse",
og passer det ikke til spillet (Runeborg 5-9, Regnehelten 1-6) får barnet en venlig besked. Runeborg har ingen niveauer — det er stadig ét sæt opgaver.

## Resultater fra testomgangene

Mens spillet er til test, sender det hjem, hvad spilleren nåede at løse.
`resultat.php` tager imod og skriver to steder, ved siden af tilmeldingerne:

| Fil | Hvad |
|---|---|
| `resultater.csv` | Én linje pr. omgang — navn, klassetrin, opgaver, hvor mange i første forsøg, procent, regnekraft, minutter, hvor langt de nåede, og om spillet blev spillet færdigt |
| `resultater/<id>.json` | Hele omgangen, opgave for opgave: spørgsmål, emne, facit, antal forsøg |

**Hvornår der bliver sendt.** Spillet sender efter hver opgave (højst hvert
8. sekund), når et opgavesæt er færdigt, når spillet er slut, og når fanen
bliver lukket eller skjult — med `navigator.sendBeacon`, som netop
overlever, at siden forsvinder (`js/resultat.js`). Omgangen ligger i det
gemte spil, så en omgang, der fortsættes på en anden skærm, er den samme.

Den samme omgang melder sig altså flere gange. Den bliver kendt på sit id
og **opdateret** i CSV-filen, ikke lagt til igen. Der kommer kun mail, når
en omgang er spillet helt færdig — ellers ville det blive en strøm af mails
om den samme omgang.

**Det er et barns oplysninger.** Fornavnet kommer fra det, barnet skrev i
spillet. Filerne hører derfor til uden for `public_html` sammen med
tilmeldingerne, og teksten på `/for-voksne` fortæller præcis, hvad der
bliver sendt, og at det slettes, når testen er slut. Ændres der på, hvad
spillet sender, **skal den tekst rettes samtidig** — den er et løfte.

**Sådan slukkes det igen:** når testen er slut, slettes
`RH.resultat.send(...)`-kaldene i `spil/regnehelten/js/game.js`. Så sender
spillet ikke noget som helst.

## Læg siden op på Simply.com

Webroden hedder `public_html`. Indholdet af **denne mappe** skal ligge
direkte derinde — ikke i en undermappe.

**Første gang (FTP):** FTP-oplysningerne står i oprettelsesmailen fra
Simply.com, og der er kun én FTP-konto pr. webhotel. Med FileZilla: værtsnavn
`ftp.simply.com`, og træk hele indholdet over i `public_html`.

**Små rettelser:** File Manager i Simply.coms kontrolpanel er hurtigere end
at fyre en FTP-klient op.

**Husk `.htaccess`.** Filer der starter med punktum er skjulte som
udgangspunkt — i FileZilla skal "Vis skjulte filer" slås til under
Server-menuen, ellers bliver den ikke uploadet, og så virker hverken de pæne
adresser eller spillet.

### Efter upload — tjek de fem her

1. `learnification.dk` viser forsiden
2. `learnification.dk/regnehelten` virker (uden `.html` bagefter)
3. `learnification.dk/spil/` — tryk **Spil**, og spillet starter
4. `learnification.dk/findes-ikke` giver 404-siden, ikke Apaches egen
5. Hængelåsen i adresselinjen er der

Får du **500 Internal Server Error**, er det så godt som altid én linje i
`.htaccess`, som netop den server ikke kender. Sæt `#` foran den i stedet
for at slette hele filen — `Options -Indexes` og `RemoveEncoding` er de
sædvanlige syndere.

### SSL

Simply.com udsteder selv et Let's Encrypt-certifikat kort efter, domænet er
oprettet. **Vent med at uploade `.htaccess`, til certifikatet er aktivt** —
eller kommentér de to `RewriteRule`-linjer under "HTTPS" ud indtil videre.
Ellers bliver de første besøgende sendt over på https, før der er noget
gyldigt certifikat at møde dem med.

### DNS

Bruger du Simply.coms eget webhotel, peger domænet allerede på deres
servere, og der skal ikke røres ved DNS.

## Nyheder

`/nyheder` fortæller forældre og lærere, hvad der er kommet til: nye spil,
nye kapitler, forbedringer og ændringer i, hvad der bliver gemt. Hver gang
noget, en besøgende kan mærke, går live, skal der en nyhed med — også når
ændringen er lavet af Claude (se `CLAUDE.md`).

Nyhederne står i `tools/nyheder.json` (nyeste øverst; `id`, `dato`,
`maerke`, `titel`, `tekst` som afsnit med lidt HTML, og frivilligt `kort`,
`billede` og `link`). Ret der og kør

```
python tools/nyheder.py
```

som skriver listen ind i `nyheder.html`, de tre nyeste i "Seneste nyt" på
forsiden (mellem `<!-- SENESTE-NYT:START/SLUT -->`), RSS-feedet
`nyheder.xml` og datoen i `sitemap.xml`. Commit det hele sammen med selve
ændringen. Skriv til en voksen, der ikke kender koden: hvad er nyt, og hvad
betyder det for barnet eller klassen — ikke filnavne eller tekniske detaljer.

## Google og søgemaskiner

- `sitemap.xml` lister de sider, der skal findes. `robots.txt` peger på den
  og holder `/api/`, `/konto`, `/admin` og `/login-kort` ude.
- Spilsiderne `/spil/runeborg/` og `/spil/regnehelten/` kræver login, så
  Google ville kun se låsen. De har `noindex, follow` og står ikke i
  sitemap'en — det er `/runeborg` og `/regnehelten`, der skal i
  søgeresultaterne. Det samme gælder `/spil/`, biblioteket, konto- og
  adminsiderne. Et nyt spil får en offentlig side (som `runeborg.html`) med
  VideoGame-data, og den side kommer i sitemap'en.
- Hver offentlig side har `<title>`, `description`, `canonical` og
  `og:`-tags (billedet bruges, når siden deles på Facebook, LinkedIn og i
  beskeder). Forsiden har Organization- og WebSite-data med logoet.
- Ikonerne (`favicon.ico`, `apple-touch-icon.png`, `assets/ikon-192.png`,
  `assets/logo-512.png`) laves ud fra favicon'et med `python tools/ikoner.py`.
- Google Search Console: tilmeld siden som domæne-ejendom (TXT-post i DNS
  hos Simply.com) og send `https://learnification.dk/sitemap.xml` ind dér.
  Bing Webmaster Tools kan hente det hele fra Search Console.

## Sådan bliver spillene opdateret

Begge spil ligger direkte i repoet: ret filerne, tæl `?v=` op i spillets
`index.html`, og skub til `main`. Alt under `/spil/` bliver leveret med
`Cache-Control: no-cache` (afsnit 6 i `.htaccess`), så browseren spørger
serveren, om en fil er lavet om — og `?v=` sørger for, at en ny `.js`-fil
aldrig blandes med en gammel.

## Ting man skal vide, før man laver om

**`/spil/` er en mappe, ikke `spil.html`.** Det er med vilje. Ligger der
både en fil `spil.html` og en mappe `spil/`, sender Apache folk i ring.
`spil/index.html` er spiloversigten. Den skal blive liggende, for gamle
links og QR-koder på tryksager peger på `/spil/` (dengang Regnehelten).

**Efter login lander man på `/spil/`** og vælger selv spil: børn med kode,
voksne (admin går til `/admin`), en ny konto fra `/opret` (`/spil/?ny=1`
viser en velkomst) og "Log ind som <barn>" fra `/konto`. Kun hvis man kom
fra `/opret?type=familie|skole`, går det til `/konto` for at sætte det op.
Et `?til=` vinder stadig — kommer man fra et bestemt spil, går det tilbage
dertil. Oversigten viser, hvor langt spilleren er nået i hvert spil
(`gemt` i `konto.php?handling=mig`), og menuen i begge spil har
"Vælg et andet spil". Nye spil skal have et kort her, før kortet
"Flere spil på vej" (`.kommer`, sidst i `.spilkort`). Det kort viser kun
nyhedsbrev og "Skriv til os" for voksne — børn ser ingen markedsføring.

**Retter du `style.css` eller `script.js`, så tæl `?v=` op.** Begge filer
ligger en måned i de besøgendes browser, og uden et nyt tal i adressen får
de, der har været her før, den gamle udgave. Tallet står i `<head>` på alle
sider — de skal følges ad.

## Afhængigheder udefra

Ingen. Begge spil, skrifterne og oplæsningen ligger på vores eget webhotel.
(Indtil oktober 2026 hentede Regnehelten sin Python-motor fra
`pygame-web.github.io` hos GitHub; reglerne for `.tar.gz` i `.htaccess` er
fra dengang og gør ingen skade.)

## Cookies og privatliv

**Cookie-banneret** (`assets/samtykke.js`, siden 2026-09-28) spørger kun om
det, der ikke er nødvendigt. Tre kategorier:

- **Nødvendige** — `lf_session`, `lf_in` (login) og `lf_samtykke` (selve
  valget, 12 måneder). Altid tændt; undtaget fra samtykkekravet (ePrivacy
  art. 5, stk. 3).
- **Statistik** — `lf_bes`, et tilfældigt id i 12 måneder, som `besoeg.js`
  sender med, så `/statistik` kan se tilbagevendende besøgende og give en
  konvertering til den FØRSTE kilde/kampagne, vi så for id'et.
- **Markedsføring** — Meta Pixel, Google (gtag) og LinkedIn Insight. Slås til
  ved at skrive et id i `PIXELS` øverst i `samtykke.js`. Står der intet id,
  bliver kategorien slet ikke vist (man må ikke spørge om noget, der ikke
  bruges). Husk at tælle `VERSION` op, når der kommer en pixel til — så
  bliver alle spurgt igen — og at skrive den på `/privatliv#cookies`.

Reglerne, banneret er bygget efter (Datatilsynets cookievejledning): intet
før ja; "Afvis alle" lige så stor som "Tillad alle"; intet slået til på
forhånd; siden virker uden svar; "Cookie-indstillinger" i sidefoden på hver
side (sættes ind af scriptet), og et nej sletter de cookies, der er sat;
hvert valg logges som bevis i tabellen `samtykker` via `api/samtykke.php`
(uden IP, slettes efter 3 år); nyt spørgsmål efter 12 måneder. DNT/GPC
tæller som nej, og så vises banneret ikke.

**Børn får aldrig andet end det nødvendige.** `samtykke.js` er ikke med på
`/spil/*`, `/login` og `/login-kort`, og den svarer altid nej, når et barn
er logget ind (`lf_in = elev.*`). `api/besoeg.php` smider også `bid` væk på
de sider. Hold det sådan — børn under 13 kan ikke selv give samtykke.

Runeborgs oplæsning bruger kun stemmer, der kører på enheden
(`localService`), fordi Chromes "Google Dansk" sender teksten til Google.

**Besøgsstatistikken er vores egen** (`assets/besoeg.js` → `api/besoeg.php`
→ tabellerne `besoeg` og `maal`, vist på `/statistik`). Grundtallene kører
uden samtykke, og det holder kun, så længe disse ting er sande for dem, der
IKKE har sagt ja:

- ingen cookies og intet i `localStorage` — heller ikke "bare et id";
- IP-adressen gemmes aldrig; besøgskoden er en HMAC af IP + browser med et
  salt i `besoegssalt.txt`, der skiftes ved datoskift og skrives over, så
  ingen kan følges fra dag til dag;
- kun sti, forrige egen side, henvisende værtsnavn (ikke hele adressen),
  `utm_campaign`, mobil ja/nej og mål; aldrig forespørgsler (`?token=`,
  `?g=`) — `besoeg.js` sender kun `pathname`;
- DNT og GPC respekteres (i både JS og PHP);
- tallene deles ikke med nogen og bruges kun samlet; linjer slettes efter
  400 dage.

**Mål (konverteringer)** tælles med `LFMaal('navn')` fra siderne:
`nyhedsbrev` (nyhedsbrev.js), `opret_konto` (opret.html),
`spil_regnehelten` og `spil_runeborg` (første tryk eller tast i hvert
spil). Nye navne skal også i `MAAL` i `api/besoeg.php`
og `MAALRAEKKE` i `statistik.html`. Har den besøgende sagt ja til
markedsføring, sendes målet også videre til pixels (`konvertering()` i
`samtykke.js`).

Tilføj `?ref=navn` eller `?utm_source=navn&utm_campaign=kampagne` på links i
opslag, annoncer, nyhedsbreve og visitkort, så dukker de op under "Kilder" og
"Kampagner". Ændres noget af ovenstående, skal `/privatliv` rettes.

## Nyhedsbrevet

Tilmelding på `/nyhedsbrev`, forsiden og `/for-voksne` (boksen er
`form[data-nyhedsbrev]` + `assets/nyhedsbrev.js/.css`) og som frivilligt
flueben på `/opret`. **Dobbelt tilmelding**: man får en mail med et link
(`/nyhedsbrev?bekraeft=<nøgle>`) og står først som aktiv, når man har
klikket. Ubekræftede slettes efter 30 dage. Samtykketeksten gemmes ved hver
tilmelding (`NYHEDSBREV_SAMTYKKE` i `api/_nyhedsbrev.php` — ændres den, så
ret datoen i teksten).

Listen ses under **/admin → Nyhedsbrev**; "Hent aktive som CSV" giver kun
dem, der må få mails, med et personligt afmeldingslink
(`/nyhedsbrev?afmeld=<nøgle>`), som SKAL med i hver mail (flet det ind fra
CSV'en i jeres mailprogram). Afmelding kræver et klik på en knap, så
mailprogrammer, der åbner links af sig selv, ikke afmelder folk.

**Sende nyhedsbreve** gøres samme sted: vælg modtagere (alle aktive,
forældre, lærere eller andet), skriv emne og tekst, forhåndsvis, send en test
til dig selv, og send. Hver mail er personlig ("Hej Anna,"), kommer som både
tekst og HTML og har afmeldingslink, `List-Unsubscribe` og afsenderens
CVR/adresse i bunden; svar går til `kontakt@learnification.dk`. Links til
learnification.dk får `utm_source=nyhedsbrev&utm_campaign=nyhedsbrev-<dato>`,
så /statistik viser, hvad hvert brev fører til. Siden sender 25 ad gangen
(`api/nyhedsbrev.php?handling=send`), til der ikke er flere; hvem der har fået
den, står i `udsendelse_modtagere` (DB v6), så en afbrudt udsendelse kan
sendes færdig fra historikken, uden at nogen får den to gange. Lokalt havner
mailene i `post.txt` i datamappen (`LF_POSTKASSE`).

## XP-tavlen og fremskridtsmailen

`api/_xp.php` + `api/xp.php`. Forældre med en familiekonto får en **XP-tavle** øverst
på `/konto` (`#xp`) og kan få en **mail om børnenes fremskridt**. XP bliver
**regnet ud af det, spillene allerede gemmer** — ingen XP-tæller i spillene, så intet
kan komme ud af takt: præstation 100 (fra `profiler.praes`), klaret kapitel 75
(`gemte_spil.klaret`), hovedmission 20, ekstramission 10, runestykke 5, og Regnekraft
over de 10 %, man starter med, 1 pr. procent. **Spilletid giver bevidst ingen XP.**
Tallene står som konstanter øverst i `_xp.php`; ændres de, ændres alles XP med det samme.
Familiens XP = summen af børnenes; niveau n begynder ved 60·(n−1)² XP, titlerne står i
`XP_TITLER`. Præstationernes navne læses ud af `spil/faelles/praestationer.js` med et
regex (`xp_katalog()`) — hold den linjeform, ellers står mailen med id'er.

**Ugens fremskridt** = forskellen på nu og et *stand* (tabellen `xp_stand`, DB v15: ét
lille JSON-objekt pr. barn pr. dag). Stand gemmes første gang, nogen ser tavlen eller
cronjobbet kører den dag, og overskrives altid, lige når en mail går — så næste mail
kun fortæller om det nye. Uden stand ved vi ikke, hvad der er nyt, og viser ingen "+".

**Mailen** er en **servicemail** om børnenes fremskridt på en konto, forældrene selv har
oprettet — IKKE markedsføring og uafhængig af nyhedsbrevet. Den går til familiekonti
(`type = 'foraelder'`, ikke test, ikke spærret) hvor `konti.xp_mail = 1` — sat fra start,
dvs. opt-out. **Den må aldrig rumme tilbud, reklame eller nyhedsbrevsstof**; det er det,
der gør, at den må sendes til alle uden nyhedsbrevssamtykke. Hver mail har et
afmeldingslink (`/fremskridtsmail?afmeld=<konti.xp_noegle>`, kræver et tryk, rører hverken
kontoen eller nyhedsbrevet) + `List-Unsubscribe`; forældrene kan også slå den til/fra
med afkrydsningsfeltet under XP-tavlen. `konti.xp_mail_afmeldt` husker hvornår.

**Udsendelse, /admin → Fremskridtsmail:**
- *Send nu:* til alle, der får mailen — som standard springes familier uden nyt siden
  sidste mail over (afkrydsning). Højst én mail pr. døgn pr. familie herfra. En bunke ad
  gangen med cursor (`efter`), som velkomstmailen. Plus test til sig selv, forhåndsvisning
  og "Send nu" pr. familie. En test/forhåndsvisning bruger altid en død afmeldingsnøgle.
- *Automatisk hver uge:* slås til og fra under Fremskridtsmail (fil `fremskridtsmail.json`
  i datamappen, **slået fra som standard**). Kører med det samme Simply.com-cronjob som
  påmindelsen (`api/paamind.php`, hver time): `xp_stand_alle()` gemmer dagens stand, og
  `xp_mail_cron()` sender på den valgte ugedag kl. 10-18 til familier med nyt, højst én
  mail på 6 dage. Claim-mønstret er som velkomstmailen: `xp_mail_sendt` sættes FØR
  mailen går og rulles tilbage ved fejl.

| Fil | Handlinger |
|---|---|
| `api/xp.php` | `tavle` (voksen), `mail {til}` (voksen), `afmeld` / `tilmeld {noegle}` (fra mailens link) |
| `api/admin.php` | `xp_oversigt`, `xp_indstil`, `xp_vis`, `xp_test`, `xp_send`, `xp_en` |

Test lokalt som resten: kør `php -S` med `tools/lokal-router.php`; mails havner i `post.txt`.

## Velkomstmailen

`api/_velkomst.php`: "sådan kommer I i gang" + en Log ind-knap til den voksne
på en konto. Går af sig selv ved oprettelse (`api/konto.php`), og under
**/admin → Velkomstmail** kan den sendes til alle, der ikke har fået den, eller
kun til dem, hvor ingen har spillet — plus til én konto ad gangen (også igen).
Teksten tilpasser sig: skole/familie, ingen elever endnu / elever, der ikke har
spillet / X af Y har spillet. `konti.velkomst_sendt` (DB v7) husker, hvem der
har fået den; spærrede konti og administratoren får den aldrig. Links får
`utm_source=velkomstmail`. Det er en **servicemail** om deres egen konto
(de sagde ja til, at vi må skrive om testen) — kommer der tilbud eller reklame
i den, er den markedsføring og må kun gå til nyhedsbrevets aktive.

**Påmindelsen** (også `_velkomst.php`): én mail til konti, hvor børnene (eller
den voksne selv på en privat konto) har spillet under 5 minutter i alt
(`PAAMIND_MAKS_SEK`, også 0) 3 dage efter oprettelsen (højst 30 dage gamle),
kun fra kl. 16:30 til 19 (`PAAMIND_FRA`) og kun én gang pr. konto — det lover
mailen. Teksten er en anden for "slet ikke spillet" og "få minutter". Den
sendes af `api/paamind.php?noegle=<nøgle>`, som **Simply.coms cronjob** åbner
**hver halve time** (minut 0 og 30, ellers rammer den ikke 16:30)
(Kontrolpanel → Website → Cronjobs; adressen med nøglen står på
/admin → Velkomstmail, nøglen i `cron-noegle.txt` i datamappen). Siden viser,
hvornår cronjobbet sidst kaldte (`paamindelse-status.json`), og advarer, hvis
det er mere end 3 timer siden. `konti.paamindelse_sendt` / `paamindelse_fejl`
(DB v8): en fejlet mail bliver prøvet igen ved de næste kørsler, højst 3 gange.

**Spørgeskemaet til de voksne** (`api/_spoergeskema.php`, `/spoergeskema?n=<nøgle>`):
én mail pr. konto (`konti.skema_sendt` er claim), første gang ét barn (eller den
voksne selv) har spillet mindst en halv time (`SKEMA_EFTER_SEK`, årsag `halv`),
har brugt hele prøvetiden (`tid`) eller har klaret et helt spil (`faerdig`).
`api/spilletid.php` udløser det live; `skema_indhent()` (kaldt fra
`api/paamind.php`, kl. 9-19, højst 25 pr. kørsel) sender til konti, der allerede
havde nået en halv time, og prøver fejlede mails igen. Servicemail, ingen reklame;
/opret og /privatliv fortæller, at den må sendes, fordi testen er gratis.

## Mails fra siden

DNS for learnification.dk er Simply.coms standard og skal ikke røres:
SPF `v=spf1 include:spf.simply.com -all`, DKIM som CNAME'erne
`simplycom1._domainkey → dkim1.simply.com` og `simplycom2._domainkey →
dkim2.simply.com`, og DMARC `_dmarc → dmarc.simply.com` med **p=reject**.

Netop p=reject gør, at mails fra PHP's `mail()` bliver afvist mange steder:
de bliver ikke DKIM-signeret. Kun mails gennem **websmtp.simply.com** (port
587, STARTTLS, login med en postkasse på domænet) bliver signeret. Derfor
sender `send_mail()` i `api/_kerne.php` gennem SMTP (`api/_post.php`), når der
ligger en fil `smtp.php` i datamappen `learnification-data/` (ved siden af
public_html — ALDRIG i repoet):

    <?php return ['bruger' => 'no-reply@learnification.dk', 'kode' => '...'];

Postkassen oprettes under Mail i Simply.coms kontrolpanel. Mangler filen,
bruges `mail()` som før, og /admin → Nyhedsbrev viser en rød advarsel. Går
noget galt, står mailserverens svar i fejlbeskeden ved "Send en test til mig".
Et forkert kodeord bliver kun prøvet én gang pr. forespørgsel, så postkassen
ikke bliver spærret. (De gamle `tilmeld.php` og `resultat.php` bruger stadig
`mail()` til beskeder til kontakt@.)

## Gemte spil

Begge spil gemmer på serveren, når man er logget ind, så man kan fortsætte
på en anden enhed. **Runeborg** (`spil/runeborg/js/gem.js`, siden
2026-09-28): `save()` i game.js skriver som før til `localStorage` og giver
det samme videre til `RB.gem`, som sender det op efter 1,5 s (med det samme,
når fanen lukkes eller skjules). `runeborg-synk-<spiller>` husker udgaven og
om kopien nåede op; gamle eventyr, der kun lå i browseren, bliver sendt op
første gang, hvis serveren intet har. "Start forfra" gemmer
`{"slettet":true}` på serveren, så "Fortsæt" ikke kommer igen. Konflikt →
`UI.konflikt()` → det nyeste hentes, og siden genindlæses.

**Regnehelten** (`spil/regnehelten/js/gem.js`, siden 2026-10-05) gemmer
præcis som Runeborg — efter hver opgave, ved dørskift og når fanen lukkes
eller skjules. Et spil gemt med Python-udgaven (`gemning.py`) bliver ført
over første gang.

## Test lokalt som på Simply.com

`tools/lokal-server.py` opfører sig som Apache med denne `.htaccess` (pæne
adresser, mappe-index, rigtig filtype på `.tar.gz`). Almindelig
`python -m http.server` gør ikke, og så opdager man ikke fejlene før efter
upload:

```bash
python tools/lokal-server.py . 8790
```

Åbn så `http://127.0.0.1:8790/`.

## Udgivelse fra GitHub

`.github/workflows/deploy.yml` lægger siden op i `public_html` over FTPS,
hver gang der bliver skubbet til `main`. Den sender kun de filer, der er
lavet om.

Før første kørsel skal der ligge to hemmeligheder i repoet under
**Settings → Secrets and variables → Actions**:

| Navn | Værdi |
|---|---|
| `FTP_USERNAME` | FTP-brugernavnet fra Simply.com — det er domænenavnet |
| `FTP_PASSWORD` | FTP-adgangskoden til den samme konto |

**Navnet er kun en etiket.** Det skal staves præcis som i tabellen, for det
er dét, `deploy.yml` slår op i, og GitHub tillader kun bogstaver, tal og
understreg dér — derfor kan brugernavnet ikke stå i navnefeltet. Selve
oplysningen hører hjemme i den store **Secret**-boks nedenunder. Skriver
man dem omvendt, fejler kørslen med `Input required and not supplied:
username`, og intet bliver lagt op.

Oplysningerne findes i Simply.coms kontrolpanel under FTP. De må **aldrig**
skrives ind i denne fil — repoet er offentligt.

Vil serveren ikke tale FTPS, så skift `protocol: ftps` til `ftp` i
workflow-filen — men så sendes adgangskoden ukrypteret.

Begge spil ligger direkte i repoet — der er ingen bygning og intet at
hente fra andre projekter.
