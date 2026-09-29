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

/** Hvor langt kontoen er nået: elever i alt, og hvor mange der har spillet. */
function velkomst_status(int $konto_id): array
{
    return [
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
