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
| `.htaccess` | — | Serveropsætning. **Læs den, før du retter i strukturen** |
| `spil/regnehelten/` | — | Spilpakken fra pygbag. **Overskrives ved hver bygning** |

`assets/billeder/*.png` er rigtige skærmbilleder fra spillet, lavet af
`tools/screenshots.py` i spillets eget projekt.

## Designsystemet

Siden er bygget på designsystemet **Learnification**, som ligger her:

<https://claude.ai/artifact/QZJgnbnsdavAoTLRKmer3y>

Systemet ejer farver, skrift, afstand, hjørner, skygger og de tre
komponenter (knap, badge, kort). Hjemmesiden ejer sit eget layout — og
ikke andet. Stilarkene er lagt i tre lag, og de skal indlæses i den
rækkefølge:

| Fil | Hvem ejer den | Hvad står der |
|---|---|---|
| `assets/tokens.css` | designsystemet | Alle tokens, begge temaer, skriftstilene. **Skrevet af `project/tokens.json`** |
| `assets/components.css` | delt | Øverst designsystemets `project/components/bundle.css` ord for ord. Nederst sidens egne tilføjelser, tydeligt adskilt |
| `assets/style.css` | hjemmesiden | Layout, navigation, hero, footer. Bruger kun tokens — ikke én farve eller afstand skrevet i hånden |

**Skal en farve eller en afstand laves om, sker det i designsystemet.**
Derefter skrives `tokens.css` af igen. Retter man den her, driver siden og
systemet fra hinanden, og næste gang nogen henter systemet ned, bliver
rettelsen kørt over.

### Sådan bruges systemet på siden

- **Knapper.** `l-btn` plus `l-btn--primary`, `--secondary` eller
  `--ghost`. Primary er den ene, der bærer `shadow-glow-brand`, så der er
  højst én af dem synlig ad gangen: forsiden har tre, men de står en hel
  skærm fra hinanden. Den faste "Spil nu" i navigationen er `--secondary`,
  fordi den altid står sammen med en primary — præcis det par, brand book
  beskriver. Størrelserne `--lg` og `--sm` er sidens egne: rammen vokser,
  mens teksten bliver stående i `label`.
- **Badges.** `l-badge l-badge--outline` til neutral metadata (aldersgruppe,
  spilletid). `--gold` er forbeholdt noget, spilleren har optjent, og
  bruges derfor ikke på hjemmesiden.
- **Kort.** `l-card` plus `l-card--wide` i et gitter og `l-card--frame`,
  når kortet kun rammer et billede ind. Systemets kort er questkort til et
  dashboard og har en fast maksimalbredde; de to varianter er sidens.
- **Mørke sektioner.** `class="theme-night"` sætter Night Quest-værdierne
  lokalt. Er hele siden i forvejen mørk, rykker sektionen op på
  `surface-200` og får to hårstreger, så den stadig kan ses.
- **Temaet følger brugerens system** via `prefers-color-scheme`.
  `data-theme="light"` eller `"dark"` på `<html>` tvinger det ene.

### Det, vi har gjort anderledes end brand book — og hvorfor

Fire steder følger siden ikke systemet til punkt og prikke. Alle fire står
som kommentarer i koden det sted, de gælder:

1. **Fokusringen er `brand`, ikke `outline`.** `outline` rammer 2,0:1 mod
   `surface-100` i det lyse tema og er dermed under de 3:1, en fokusring
   skal have. `brand` rammer 5,7:1. Samme sted: kanten på ghost-knappen og
   det neutrale badge er `ink-muted`.
2. **Knaptekst er ikke sat i versaler.** `label` skal ifølge brand book
   sættes i versaler eller næsten-versaler. Vægten og sporingen er med,
   men ikke versalerne: knapperne her læses af 7-12-årige og af forældre,
   og dansk i 14px versaler er hårdt for dem. Badges og eyebrows **er** i
   versaler.
3. **Faviconet er ikke mærket.** Mærket må ikke vises under 32×35px og må
   ikke beskæres ind i et kvadrat, så det kan ikke bruges som favicon.
   `assets/favicon.svg` er i stedet mærkets egen guldgnist på en
   brandviolet flade — begge dele tokens. **Kommer der et rigtigt favicon
   fra Andreasen Media, skal det skiftes ud.**
4. **Ikonerne er stadig en markeret stedfortræder.** Brand book siger selv,
   at der ikke er leveret et ikonsæt endnu. Sidens ikoner er
   stregikoner i én vægt og én familie, farvet `brand` på `surface-300`,
   indtil der kommer et rigtigt sæt.

**Teksten på siden er ikke skrevet om.** Brand book beskriver også en
stemme — quest, mission, XP, "Make Learning Great Again" — som er tænkt til
produktets egne skærme og til et engelsksproget publikum. Hjemmesidens
danske tekst er rettet mod børn, forældre og lærere og er ladt urørt. Skal
den også lægges om, er det et stykke arbejde for sig.

### Kontrasten er målt, ikke gættet

Alle farvepar, siden faktisk bruger, er regnet igennem i begge temaer og
består WCAG AA (4,5:1 for tekst, 3:1 for ikoner, kanter og fokusringe).
Det laveste, der står tilbage, er fluebenene i `success` på den lyse flade
med 3,2:1 — og de bærer aldrig betydningen alene, der står altid tekst i
`ink` ved siden af.

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

Upload derefter de fire filer i `spil/regnehelten/` igen. Nye
skærmbilleder til hjemmesiden:

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

**`.tar.gz` må ikke leveres med `Content-Encoding: gzip`.** Spillet pakker
selv filen ud med Pythons `tarfile`. Pakker serveren den ud undervejs,
fejler spillet. `RemoveEncoding .gz` i `.htaccess` er dét, der forhindrer
det — fjern den ikke.

**Sæt aldrig `Cross-Origin-Embedder-Policy` på spilsiden.** Spillet henter
sin Python-motor fra `pygame-web.github.io`, og `require-corp` ville blokere
den hentning.

## Afhængigheder udefra

- **Google Fonts** (Baloo 2 + Nunito Sans) til hjemmesiden. De to
  skriftsnit er designsystemets, og linket skal se ud, som det gør i
  `<head>` — begge vægtsæt skal med.
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
| `FTP_USERNAME` | brugernavnet fra oprettelsesmailen fra Simply.com |
| `FTP_PASSWORD` | adgangskoden til den samme FTP-konto |

Vil serveren ikke tale FTPS, så skift `protocol: ftps` til `ftp` i
workflow-filen — men så sendes adgangskoden ukrypteret.

Spilpakken i `spil/regnehelten/` **er** med i repoet med vilje. Den bliver
bygget i spillets eget projekt, ikke her, så uden den er der ikke noget at
lægge op.
