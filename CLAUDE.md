# Learnification.dk — til Claude

Læs `README.md`, før du laver om. Den beskriver sider, spil, login, mails og
udgivelse.

## Skriv en nyhed, når noget nyt går live

Brugeren vil have, at `/nyheder` altid er opdateret — også med det, Claude
laver. Når en ændring er noget, en besøgende kan mærke, skal den have en
nyhed i samme commit:

- nyt spil, nyt kapitel, nye missioner eller opgavetyper
- nye funktioner for børn eller voksne (login, gemning, mails, konto, admin, der rører de voksne)
- ændringer i, hvad der bliver gemt eller sendt (privatliv)
- tydelige forbedringer eller rettelser, som spillerne vil opdage

Ikke for rent tekniske ting (refaktorering, værktøjer, tests, intern admin/statistik),
med mindre de ændrer noget for brugerne.

Sådan:

1. Tilføj øverst i `tools/nyheder.json` (dagens dato, `ÅÅÅÅ-MM-DD`). Mærket
   (`maerke`) er et af: Nyt spil, Nyt kapitel, Spil, Til voksne, Privatliv, Siden.
2. Kør `python tools/nyheder.py`.
3. Commit `tools/nyheder.json`, `nyheder.html`, `index.html`, `nyheder.xml`
   og `sitemap.xml` sammen med selve ændringen.

Skriv på dansk til en forælder eller lærer: hvad er nyt, og hvad betyder det
for barnet eller klassen. Kort, varmt og konkret — ingen filnavne, ingen
tekniske detaljer, og ingen løfter, koden ikke holder. Nævn gerne i dit svar
til brugeren, hvilken nyhed du har skrevet, så de kan rette i den.
