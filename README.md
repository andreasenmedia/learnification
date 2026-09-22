# Learnification.dk

Statisk hjemmeside for Learnification — danske læringsspil til børn. Første
spil er **Regnehelten**, som kan spilles direkte i browseren.

Hostes på **Simply.com** (Apache-webhotel). Alt ligger i `public_html`.

## Sider

| Fil | URL | Hvad |
|---|---|---|
| `index.html` | `/` | Forside: hvad Learnification er, spilkort, skærmbilleder |
| `regnehelten.html` | `/regnehelten` | Om spillet: steder, opgavetyper, Regnebogen, Regnekraft |
| `spil/index.html` | `/spil/` | Selve spilleren — spillet i en ramme med tastaturhjælp |
| `for-voksne.html` | `/for-voksne` | Forældre og lærere: hvad barnet øver, data, FAQ |
| `om.html` | `/om` | Om Learnification |
| `404.html` | — | Vises ved forkert adresse |
| `tilmeld.php` | — | Tager imod tilmeldinger til spørgeskemaet |
| `resultat.php` | — | Tager imod resultater fra testomgangene |
| `.htaccess` | — | Serveropsætning. **Læs den, før du retter i strukturen** |
| `spil/regnehelten/` | — | Spilpakken fra pygbag. **Overskrives ved hver bygning** |

`assets/billeder/*.png` er rigtige skærmbilleder fra spillet, lavet af
`tools/screenshots.py` i spillets eget projekt.

## Udseende

Siden har ét stilark, `assets/style.css`, skrevet i hånden. Farverne er
papir og blæk med en varm orange til knapper og links — de samme toner som
i spillet, så rammen om Regnehelten ligner det, der kører indeni.

Skriften er **Fraunces** til overskrifter og **Inter** til brødtekst, begge
fra Google Fonts. Linket i `<head>` skal se ud, som det gør nu, på alle
sider, ellers skifter overskrifterne udseende midt i et klik.

Der lå på et tidspunkt et større designsystem henover siden med `tokens.css`
og `components.css` i et mørkt tema. Det blev rullet tilbage igen, fordi det
lyse udtryk klæder spillet bedre. Vil man se på det, ligger det i historikken
under `Laeg designsystemet Learnification ned over hele siden`.

## Porten foran spillet, og listen over testere

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

## Resultater fra testomgangene

Mens spillet er til test, sender det hjem, hvad spilleren nåede at løse.
`resultat.php` tager imod og skriver to steder, ved siden af tilmeldingerne:

| Fil | Hvad |
|---|---|
| `resultater.csv` | Én linje pr. omgang — navn, klassetrin, opgaver, hvor mange i første forsøg, procent, regnekraft, minutter, hvor langt de nåede, og om spillet blev spillet færdigt |
| `resultater/<id>.json` | Hele omgangen, opgave for opgave: spørgsmål, emne, facit, antal forsøg |

**Hvornår der bliver sendt.** Spillet sender selv, hver gang en runde er
ovre, og når spillet er færdigt. Lukker nogen fanen midt i en opgave, når
Python ikke at gøre noget — derfor lægger spillet hele tiden den nyeste
udgave i sit `window.lfResultat`, og siden omkring spillet sender den med
`navigator.sendBeacon`, som netop overlever, at siden forsvinder.

Den samme omgang melder sig altså flere gange. Den bliver kendt på sit id
og **opdateret** i CSV-filen, ikke lagt til igen. Der kommer kun mail, når
en omgang er spillet helt færdig — ellers ville det blive en strøm af mails
om den samme omgang.

**Det er et barns oplysninger.** Fornavnet kommer fra det, barnet skrev i
spillet. Filerne hører derfor til uden for `public_html` sammen med
tilmeldingerne, og teksten på `/for-voksne` fortæller præcis, hvad der
bliver sendt, og at det slettes, når testen er slut. Ændres der på, hvad
spillet sender, **skal den tekst rettes samtidig** — den er et løfte.

**Sådan slukkes det igen:** når testen er slut, fjernes afsendelsen ved at
sætte `KRAEV_TILMELDING = false` i `spil/index.html` (så forsvinder porten)
og slette `resultat.send(...)`-kaldene i spillets `main.py`. Så kører
spillet igen uden at sende noget som helst.

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

## Sådan bliver spillet opdateret

Spillet ligger i `Claude/Projects/matematik-eventyr`:

```bash
cd ~/Claude/Projects/matematik-eventyr
python tools/build_web.py
cp build/web/* ~/Claude/Projects/learnification/spil/regnehelten/
```

Upload derefter de fire filer i `spil/regnehelten/` igen.

**Spilleren behøver ikke gøre noget for at få den nye udgave.** Alt under
`/spil/` bliver leveret med `Cache-Control: no-cache` (afsnit 6 i
`.htaccess`), så browseren spørger serveren hver gang, om pakken er lavet
om. Er den ikke det, svarer serveren `304` uden at sende noget, så det
koster ikke noget at spørge. Før den regel lå spilpakken en time i Chromes
lager, uden at browseren spurgte, og en ny bygning blev først set bagefter
— eller efter en hård genindlæsning.

Nye skærmbilleder til hjemmesiden:

```bash
cd ~/Claude/Projects/matematik-eventyr
python tools/screenshots.py
cp build/billeder/*.png ~/Claude/Projects/learnification/assets/billeder/
```

## Ting man skal vide, før man laver om

**`/spil/` er en mappe, ikke `spil.html`.** Det er med vilje. Ligger der
både en fil `spil.html` og en mappe `spil/`, sender Apache folk i ring.
Derfor hedder spillersiden `spil/index.html`.

**Spillet skal hentes ind i rammen, før nogen klikker.** Browseren giver
først et spil lyd og tastatur, når brugeren har rørt ved siden, og den
tilstand gælder kun for rammer, der allerede findes på klikketidspunktet.
Derfor har `<iframe id="game">` sin `src` fra start, og startskærmen ligger
_oven på_ den. Laver man rammen først, når der trykkes "Spil", starter
spillet aldrig.

**Retter du `style.css` eller `script.js`, så tæl `?v=` op.** Begge filer
ligger en måned i de besøgendes browser, og uden et nyt tal i adressen får
de, der har været her før, den gamle udgave. Tallet står i `<head>` på alle
sider — de skal følges ad.

**`.tar.gz` må ikke leveres med `Content-Encoding: gzip`.** Spillet pakker
selv filen ud med Pythons `tarfile`. Pakker serveren den ud undervejs,
fejler spillet. `RemoveEncoding .gz` i `.htaccess` er dét, der forhindrer
det — fjern den ikke.

**Sæt aldrig `Cross-Origin-Embedder-Policy` på spilsiden.** Spillet henter
sin Python-motor fra `pygame-web.github.io`, og `require-corp` ville blokere
den hentning.

## Afhængigheder udefra

- **Google Fonts** (Fraunces + Inter) til hjemmesiden. Linket skal se ud,
  som det gør i `<head>` — begge vægtsæt skal med.
- **pygame-web.github.io** leverer Python-motoren til spillet (ca. 20-30 MB,
  som browseren gemmer efter første besøg). Går den ned, kan spillet ikke
  starte. Skal det undgås, kan motoren lægges på eget webhotel og pygbag
  køres med `--cdn https://learnification.dk/motor/`.

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

Spilpakken i `spil/regnehelten/` **er** med i repoet med vilje. Den bliver
bygget i spillets eget projekt, ikke her, så uden den er der ikke noget at
lægge op.
