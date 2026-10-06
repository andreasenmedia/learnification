<?php
/**
 * Velkomstmailen til de voksne: sådan kommer I i gang, og husk at logge ind.
 *
 * Går af sig selv, når en konto bliver oprettet (api/konto.php), og kan
 * sendes til dem, der ikke har fået den, fra /admin#velkomst.
 *
 * Det er en SERVICEMAIL om den konto, de selv har oprettet — de har sagt ja
 * til, at vi må skrive til dem om testen. Den må derfor ikke gøre reklame
 * for noget (tilbud, andre produkter): så er den markedsføring og må kun gå
 * til dem, der står på nyhedsbrevet.
 */

declare(strict_types=1);
require_once __DIR__ . '/_nyhedsbrev.php';

const VELKOMST_EMNE = 'Velkommen til Learnification — sådan kommer I i gang';

/** Hvor langt kontoen er nået: elever i alt, hvor mange der har spillet, og om den voksne selv har. */
function velkomst_status(int $konto_id): array
{
    return [
        'selv' => (bool) vaerdi('SELECT 1 FROM sessioner WHERE konto_id = ? AND elev_id IS NULL
                                 AND hvem = \'voksen\' AND sekunder > 0', [$konto_id]),
        'elever' => (int) vaerdi('SELECT COUNT(*) FROM elever e JOIN grupper g ON g.id = e.gruppe_id
                                  WHERE g.konto_id = ?', [$konto_id]),
        'spillet' => (int) vaerdi('SELECT COUNT(DISTINCT elev_id) FROM sessioner
                                   WHERE konto_id = ? AND elev_id IS NOT NULL AND sekunder > 0', [$konto_id]),
    ];
}

/** Mailen til én konto: [tekst, html, headere]. */
function velkomst_mail(array $k): array
{
    $skole = $k['type'] === 'skole';
    $st = velkomst_status((int) ($k['id'] ?? 0));
    $fornavn = trim(explode(' ', trim($skole ? $k['kontakt'] : $k['navn']))[0] ?? '');
    if (preg_match('/^famili/i', $fornavn)) {
        $fornavn = '';              // "Familien Hansen" er ikke et fornavn
    }
    $side = adresse();

    if ($k['type'] === 'privat') {
        // En voksen, der selv vil spille — ingen børn, koder eller login-kort
        $tekst = ($fornavn !== '' ? "Hej $fornavn" : 'Hej') . ",\n\n"
            . "Tak, fordi du er med i testen af Learnification. Kontoen er klar:\n\n"
            . "1. Log ind på $side/login med " . $k['email'] . ".\n"
            . "2. Vælg Runeborg eller Regnehelten under Min konto.\n"
            . "3. Spillet gemmer af sig selv, så du kan fortsætte på en anden computer eller tablet.\n\n"
            . ($st['selv'] ? "Du er allerede i gang — god fornøjelse med resten.\n\n" : '')
            . "Skal dine børn også spille, eller vil du bruge spillene i en klasse? Det sætter du op under Min konto.\n\n";
    } else {
        $tekst = ($fornavn !== '' ? "Hej $fornavn" : 'Hej') . ",\n\n"
            . ($skole ? 'Tak, fordi ' . $k['navn'] . ' er med i testen af Learnification.'
                      : 'Tak, fordi I er med i testen af Learnification.')
            . " Kontoen er klar, og det tager kun et par minutter at komme i gang:\n\n"
            . "1. Log ind på $side/login med " . $k['email'] . ".\n"
            . ($skole ? "2. Opret en klasse under Min konto, og skriv elevernes fornavne — ét pr. linje.\n"
                      : "2. Tilføj børnene under Min konto — fornavn eller kaldenavn er nok.\n")
            . "3. Udskriv login-kortene. Hvert barn får sin egen kode, fx RAVN-4827.\n"
            . "4. " . ($skole ? 'Eleverne' : 'Børnene') . " går ind på $side/login, skriver koden og vælger Runeborg eller Regnehelten.\n\n";

        if ($st['elever'] === 0) {
            $tekst .= ($skole ? 'Der er ingen elever på kontoen endnu, så trin 2 er det næste.'
                              : 'Der er ingen børn på kontoen endnu, så trin 2 er det næste.') . "\n\n";
        } elseif ($st['spillet'] === 0) {
            $tekst .= 'I har ' . $st['elever'] . ($st['elever'] === 1 ? ($skole ? ' elev' : ' barn') : ($skole ? ' elever' : ' børn'))
                . " på kontoen, men ingen har spillet endnu — så mangler kun trin 3 og 4.\n\n";
        } else {
            $tekst .= $st['spillet'] . ' af ' . $st['elever'] . ($skole ? ' elever' : ' børn')
                . " har allerede spillet. Under Min konto kan I følge spilletiden og se, hvor langt de er nået.\n\n";
        }
    }

    $tekst .= "Har du glemt kodeordet, så tryk på \"Glemt kodeord\" på login-siden.\n"
        . "Spørgsmål, eller driller noget? Svar bare på denne mail.\n\n"
        . "Venlig hilsen\nLearnification";

    $hvorfor = 'Du får denne mail, fordi du har oprettet en konto på learnification.dk.';
    $ren = nyhedsbrev_maerk_links($tekst, 'velkomst', 'velkomstmail')
        . "\n\n-- \n" . $hvorfor . "\n" . NYHEDSBREV_AFSENDER . "\n";

    $e = fn(string $s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
    $html = mail_ramme(VELKOMST_EMNE,
        nyhedsbrev_html_afsnit($tekst, 'velkomst', 'velkomstmail')
        . '<p style="margin:8px 0 0;"><a href="' . $e(nyhedsbrev_maerk_links($side . '/login', 'velkomst', 'velkomstmail'))
        . '" style="display:inline-block;background:#ce8a2e;color:#ffffff;font-weight:700;text-decoration:none;'
        . 'padding:12px 22px;border-radius:999px;">Log ind</a></p>',
        $e($hvorfor) . '<br>' . $e(NYHEDSBREV_AFSENDER));

    return [$ren, $html, ['Reply-To' => MODTAGER]];
}

/** Send den til én konto og husk det. Svarer, om den gik af sted. */
function velkomst_send(array $k): bool
{
    [$tekst, $html, $headere] = velkomst_mail($k);
    if (!send_mail($k['email'], VELKOMST_EMNE, $tekst, $html, $headere)) {
        return false;
    }
    kør('UPDATE konti SET velkomst_sendt = ? WHERE id = ?', [time(), $k['id']]);
    return true;
}

/** Hvem kan få den fra /admin: aldrig administratoren eller spærrede konti. */
const VELKOMST_GRUPPER = [
    'mangler' => 'Alle, der ikke har fået den',
    'ikke_spillet' => 'Kun dem, hvor ingen har spillet endnu',
];

function velkomst_hvor(string $gruppe): string
{
    $hvor = "k.type != 'admin' AND k.status != 'spaerret' AND k.velkomst_sendt IS NULL";
    if ($gruppe === 'ikke_spillet') {
        $hvor .= ' AND NOT EXISTS (SELECT 1 FROM sessioner s WHERE s.konto_id = k.id AND s.sekunder > 0)';
    }
    return $hvor;
}

// ------------------------------------------------------------ påmindelsen

/*
 * Én påmindelse til en konto, hvor intet barn har spillet endnu, et par
 * dage efter oprettelsen. Den går af sted fra api/paamind.php, som Simply.coms
 * cronjob åbner hver time (adressen står på /admin#velkomst). Kun én gang
 * pr. konto — det står i mailen, og det skal blive ved med at være sandt.
 */

const PAAMIND_EMNE = 'Er I kommet i gang med Learnification?';
const PAAMIND_EFTER = 3 * 86400;        // så længe efter oprettelsen
const PAAMIND_HOEJST = 30 * 86400;      // ældre konti får ingen
const PAAMIND_TIMER = [9, 19];          // kun mellem kl. 9 og 19

/**
 * SQL: intet barn på kontoen har spillet endnu (den voksnes egne spil tæller
 * ikke) — på en konto "til mig selv" er det den voksne selv, der tæller.
 */
const PAAMIND_IKKE_SPILLET = "NOT EXISTS (SELECT 1 FROM sessioner s WHERE s.konto_id = k.id
                              AND (s.elev_id IS NOT NULL OR k.type = 'privat') AND s.sekunder > 0)";

/** De konti, der skal have den nu. */
function paamind_hvor(): string
{
    $nu = time();
    return "k.type != 'admin' AND k.status != 'spaerret' AND k.paamindelse_sendt IS NULL
            AND k.paamindelse_fejl < 3
            AND k.oprettet <= " . ($nu - PAAMIND_EFTER) . ' AND k.oprettet > ' . ($nu - PAAMIND_HOEJST)
        . ' AND ' . PAAMIND_IKKE_SPILLET;
}

/** Konti, der får den senere, hvis ingen spiller inden da. */
function paamind_venter(): int
{
    return (int) vaerdi("SELECT COUNT(*) FROM konti k WHERE k.type != 'admin' AND k.status != 'spaerret'
                         AND k.paamindelse_sendt IS NULL AND k.oprettet > ? AND " . PAAMIND_IKKE_SPILLET,
                        [time() - PAAMIND_EFTER]);
}

/** Mailen til én konto: [tekst, html, headere]. */
function paamind_mail(array $k): array
{
    $skole = $k['type'] === 'skole';
    $st = velkomst_status((int) ($k['id'] ?? 0));
    $fornavn = trim(explode(' ', trim($skole ? $k['kontakt'] : $k['navn']))[0] ?? '');
    if (preg_match('/^famili/i', $fornavn)) {
        $fornavn = '';
    }
    $side = adresse();
    $boern = $skole ? 'elever' : 'børn';

    if ($k['type'] === 'privat') {
        $tekst = ($fornavn !== '' ? "Hej $fornavn" : 'Hej') . ",\n\n"
            . "For et par dage siden oprettede du en konto på Learnification, men du har ikke prøvet spillene endnu.\n\n"
            . "Log ind på $side/login, og vælg Runeborg eller Regnehelten under Min konto. "
            . "Spillet gemmer af sig selv, så du kan stoppe, når du vil, og fortsætte en anden dag.\n\n"
            . "Driller noget, eller passer det bare ikke lige nu? Svar på denne mail, så hjælper vi gerne.\n\n"
            . "Venlig hilsen\nLearnification";
    } else {
        $tekst = ($fornavn !== '' ? "Hej $fornavn" : 'Hej') . ",\n\n"
            . 'For et par dage siden oprettede du en konto' . ($skole ? ' til ' . $k['navn'] : '')
            . " på Learnification, men der er ingen $boern, der har spillet endnu.\n\n";
        if ($st['elever'] === 0) {
            $tekst .= ($skole ? 'Det næste skridt er at oprette en klasse under Min konto og skrive elevernes fornavne — ét pr. linje.'
                              : 'Det næste skridt er at tilføje børnene under Min konto — fornavn eller kaldenavn er nok.')
                . " Så får hvert barn sin egen kode, og I kan gå i gang. Det tager et par minutter.\n\n";
        } else {
            $tekst .= 'I har ' . $st['elever'] . ' ' . ($st['elever'] === 1 ? ($skole ? 'elev' : 'barn') : $boern)
                . ' på kontoen, så I er næsten i mål. Udskriv login-kortene under Min konto, og lad '
                . ($skole ? 'eleverne' : 'børnene') . " gå ind på $side/login og skrive deres kode. "
                . "Så kan de vælge Runeborg eller Regnehelten.\n\n";
        }
        $tekst .= "Driller noget, eller passer det bare ikke lige nu? Svar på denne mail, så hjælper vi gerne.\n\n"
            . "Venlig hilsen\nLearnification";
    }

    $hvorfor = 'Du får denne påmindelse én gang, fordi du har oprettet en konto på learnification.dk, '
        . 'og ingen har spillet endnu. Vi sender ikke flere.';
    $ren = nyhedsbrev_maerk_links($tekst . "\n\nLog ind: $side/login", 'paamindelse', 'velkomstmail')
        . "\n\n-- \n" . $hvorfor . "\n" . NYHEDSBREV_AFSENDER . "\n";

    $e = fn(string $s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
    $html = mail_ramme(PAAMIND_EMNE,
        nyhedsbrev_html_afsnit($tekst, 'paamindelse', 'velkomstmail')
        . '<p style="margin:8px 0 0;"><a href="' . $e(nyhedsbrev_maerk_links($side . '/login', 'paamindelse', 'velkomstmail'))
        . '" style="display:inline-block;background:#ce8a2e;color:#ffffff;font-weight:700;text-decoration:none;'
        . 'padding:12px 22px;border-radius:999px;">Log ind</a></p>',
        $e($hvorfor) . '<br>' . $e(NYHEDSBREV_AFSENDER));

    return [$ren, $html, ['Reply-To' => MODTAGER]];
}

/**
 * Send påmindelsen til dem, der skal have den nu — højst $max. Kontoen
 * bliver markeret, FØR mailen går, så to kørsler ikke sender den samme.
 * Fejler den, tæller paamindelse_fejl op, og den bliver prøvet igen ved en
 * senere kørsel (højst 3 gange i alt).
 */
function paamind_koer(string $hvem, int $max = 25): array
{
    $sendt = $fejlet = 0;
    $sidste_fejl = '';
    $stop = microtime(true) + 20;
    foreach (alle('SELECT * FROM konti k WHERE ' . paamind_hvor() . ' ORDER BY k.oprettet LIMIT ' . $max) as $k) {
        if (!kør('UPDATE konti SET paamindelse_sendt = ? WHERE id = ? AND paamindelse_sendt IS NULL', [time(), $k['id']])) {
            continue;
        }
        [$tekst, $html, $headere] = paamind_mail($k);
        if (send_mail($k['email'], PAAMIND_EMNE, $tekst, $html, $headere)) {
            $sendt++;
        } else {
            kør('UPDATE konti SET paamindelse_sendt = NULL, paamindelse_fejl = paamindelse_fejl + 1 WHERE id = ?', [$k['id']]);
            $fejlet++;
            $sidste_fejl = post_fejl();
        }
        if (microtime(true) > $stop) {
            break;
        }
    }
    $koersel = ['tid' => time(), 'hvem' => $hvem, 'sendt' => $sendt, 'fejlet' => $fejlet, 'fejl' => $sidste_fejl];
    paamind_gem_status(['koersel' => $koersel]);
    return $koersel;
}

/**
 * {cron: sidste gang cronjobbet kaldte (også om natten), koersel: den sidste
 * rigtige kørsel} — til /admin, så man kan se, at det virker.
 */
function paamind_status(): array
{
    $d = json_decode((string) @file_get_contents(datamappe() . '/paamindelse-status.json'), true);
    return is_array($d) ? $d : [];
}

function paamind_gem_status(array $nyt): void
{
    @file_put_contents(datamappe() . '/paamindelse-status.json',
        json_encode(array_merge(paamind_status(), $nyt), JSON_UNESCAPED_UNICODE), LOCK_EX);
}

/** Nøglen i cronjobbets adresse. Laves første gang, den skal bruges. */
function paamind_noegle(): string
{
    $fil = datamappe() . '/cron-noegle.txt';
    if (!is_file($fil)) {
        @file_put_contents($fil, bin2hex(random_bytes(16)), LOCK_EX);
        @chmod($fil, 0640);
    }
    return trim((string) @file_get_contents($fil));
}
