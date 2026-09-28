<?php
/**
 * Nyhedsbrevet — fælles for api/nyhedsbrev.php og oprettelsen i api/konto.php.
 *
 * REGLERNE (markedsføringslovens § 10 og GDPR): der må kun sendes
 * markedsføring på mail til folk, der selv har sagt ja på forhånd, og det
 * skal kunne bevises. Derfor:
 *
 *   * fluebenet er aldrig sat på forhånd, og det er et selvstændigt ja —
 *     ikke gemt i en accept af noget andet,
 *   * man kommer først på listen, når man har klikket på linket i
 *     bekræftelsesmailen (dobbelt tilmelding), så ingen kan skrive andres
 *     adresse på,
 *   * den præcise tekst, der blev sagt ja til, og tidspunkterne gemmes,
 *   * alle mails skal have et afmeldingslink — "noegle" er det, der står i
 *     det link. Den giver kun lov til at bekræfte og afmelde, intet andet.
 *
 * Kun for voksne. Børnenes login har ingen mailadresse og kommer aldrig her.
 */

declare(strict_types=1);

// Ændres teksten, så tæl datoen op — den gamle tekst står stadig ved dem,
// der sagde ja til den.
const NYHEDSBREV_SAMTYKKE = 'Ja tak, send mig nyt fra Learnification på mail — nye spil, '
    . 'opdateringer og tilbud til skoler og familier. Højst et par gange om måneden. '
    . 'Jeg kan altid afmelde igen med et klik. (tekst af 28-09-2026)';

const NYHEDSBREV_ROLLER = ['foraelder' => 'Forælder', 'laerer' => 'Lærer / skole', 'andet' => 'Andet'];

// Ubekræftede tilmeldinger bliver slettet efter så lang tid
const NYHEDSBREV_UBEKRAEFTET = 30 * 86400;

/**
 * Skriv en adresse op og send bekræftelsesmailen. Svarer ikke, om adressen
 * fandtes i forvejen — så kan formularen ikke bruges til at slå op, hvem
 * der står på listen.
 */
function nyhedsbrev_tilmeld(string $email, string $navn, string $rolle, string $kilde): void
{
    $email = lille(trim($email));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        fejl('Den mailadresse ser ikke rigtig ud.');
    }
    if (!isset(NYHEDSBREV_ROLLER[$rolle])) {
        $rolle = '';
    }
    $nu = time();
    if (random_int(1, 10) === 1) {
        kør('DELETE FROM nyhedsbrev WHERE bekraeftet IS NULL AND oprettet < ?', [$nu - NYHEDSBREV_UBEKRAEFTET]);
    }

    $r = en('SELECT * FROM nyhedsbrev WHERE email = ?', [$email]);
    if ($r && $r['bekraeftet'] !== null && $r['afmeldt'] === null) {
        return;                         // står der allerede — intet at gøre
    }
    if ($r) {
        // Afmeldt før, eller aldrig bekræftet: start forfra med et nyt ja
        kør('UPDATE nyhedsbrev SET navn = ?, rolle = ?, kilde = ?, samtykke = ?, oprettet = ?,
             bekraeftet = NULL, afmeldt = NULL WHERE id = ?',
            [$navn, $rolle, $kilde, NYHEDSBREV_SAMTYKKE, $nu, $r['id']]);
        $noegle = $r['noegle'];
    } else {
        $noegle = bin2hex(random_bytes(20));
        kør('INSERT INTO nyhedsbrev (email, navn, rolle, kilde, samtykke, noegle, oprettet)
             VALUES (?, ?, ?, ?, ?, ?, ?)',
            [$email, $navn, $rolle, $kilde, NYHEDSBREV_SAMTYKKE, $noegle, $nu]);
    }

    $hej = $navn !== '' ? "Hej $navn" : 'Hej';
    send_mail($email, 'Bekræft din tilmelding til Learnification', $hej . ",\n\n"
        . "Du (eller nogen med din mailadresse) har bedt om nyt fra Learnification.\n\n"
        . "Klik her for at bekræfte, at det er dig:\n"
        . adresse() . '/nyhedsbrev?bekraeft=' . $noegle . "\n\n"
        . "Klikker du ikke, sker der ingenting — så bliver adressen slettet igen om 30 dage.\n\n"
        . "Venlig hilsen\nLearnification\n" . adresse() . "\n");
}

function nyhedsbrev_afmeldlink(string $noegle): string
{
    return adresse() . '/nyhedsbrev?afmeld=' . $noegle;
}
