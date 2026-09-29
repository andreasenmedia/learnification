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

// ------------------------------------------------------------ udsendelser

// Hvem en udsendelse kan gå til. "andet" tager også dem, der ikke har sagt,
// hvem de er.
const NYHEDSBREV_MAALGRUPPER = [
    'alle' => ['Alle aktive', "1 = 1"],
    'foraelder' => ['Forældre', "rolle = 'foraelder'"],
    'laerer' => ['Lærere / skoler', "rolle = 'laerer'"],
    'andet' => ['Andet / ikke oplyst', "rolle IN ('andet', '')"],
];

// Afsenderen skal kunne ses i hver markedsføringsmail
const NYHEDSBREV_AFSENDER = 'Learnification · Andreasen Media · CVR 40908757 · Lindegaarden 12, 1., 9400 Nørresundby';

/** SQL for de aktive i en målgruppe: bekræftet, ikke afmeldt. */
function nyhedsbrev_aktive(string $maalgruppe): string
{
    $hvor = NYHEDSBREV_MAALGRUPPER[$maalgruppe][1] ?? '1 = 0';
    return "bekraeftet IS NOT NULL AND afmeldt IS NULL AND $hvor";
}

/**
 * Links til vores egen side får utm_source og utm_campaign på, så
 * /statistik kan vise, hvad nyhedsbrevet fører til. Andres links får lov
 * at være i fred.
 */
function nyhedsbrev_maerk_links(string $tekst, string $kampagne, string $kilde = 'nyhedsbrev'): string
{
    return preg_replace_callback('#https?://(www\.)?learnification\.dk[^\s<>"\')\]]*#i', function ($m) use ($kampagne, $kilde) {
        $url = rtrim($m[0], '.,;:!?');
        $rest = substr($m[0], strlen($url));
        if (preg_match('/[?&]utm_/', $url)) {
            return $m[0];
        }
        [$url, $anker] = explode('#', $url, 2) + ['', null];
        $url .= (strpos($url, '?') === false ? '?' : '&')
            . 'utm_source=' . rawurlencode($kilde) . '&utm_campaign=' . rawurlencode($kampagne);
        return $url . ($anker !== null ? '#' . $anker : '') . $rest;
    }, $tekst) ?? $tekst;
}

/**
 * Almindelig tekst til HTML: tom linje = nyt afsnit, links bliver klikbare.
 * Linkteksten er adressen, som den blev skrevet; kampagnemærket står kun i href.
 */
function nyhedsbrev_html_afsnit(string $tekst, string $kampagne, string $kilde = 'nyhedsbrev'): string
{
    $ud = '';
    foreach (preg_split('/\n\s*\n/', trim($tekst)) ?: [] as $afsnit) {
        $h = htmlspecialchars(trim($afsnit), ENT_QUOTES, 'UTF-8');
        $h = preg_replace_callback('#https?://[^\s<>"]+#', function ($m) use ($kampagne, $kilde) {
            $url = rtrim($m[0], '.,;:!?)');
            $rest = substr($m[0], strlen($url));
            $href = htmlspecialchars(nyhedsbrev_maerk_links(htmlspecialchars_decode($url), $kampagne, $kilde), ENT_QUOTES, 'UTF-8');
            return '<a href="' . $href . '" style="color:#8f5b18;">' . $url . '</a>' . $rest;
        }, $h) ?? $h;
        $ud .= '<p style="margin:0 0 16px;">' . nl2br($h, false) . "</p>\n";
    }
    return $ud;
}

/**
 * Mailens HTML-skal i Learnifications farver: logo, et hvidt kort med
 * indholdet og en lille tekst nederst. Bruges også af velkomstmailen.
 */
function mail_ramme(string $titel, string $indhold, string $fod): string
{
    return '<!DOCTYPE html><html lang="da"><head><meta charset="utf-8">'
        . '<meta name="viewport" content="width=device-width, initial-scale=1"><title>'
        . htmlspecialchars($titel, ENT_QUOTES, 'UTF-8') . '</title></head>'
        . '<body style="margin:0;padding:0;background:#faf7f0;">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f0;"><tr><td align="center" style="padding:28px 14px;">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">'
        . '<tr><td style="padding:0 6px 16px;font:700 20px Georgia,serif;color:#2a2118;">'
        . '<span style="display:inline-block;width:14px;height:14px;background:#ce8a2e;border-radius:4px;margin-right:8px;"></span>Learnification</td></tr>'
        . '<tr><td style="background:#ffffff;border:2px solid #eadfca;border-radius:14px;padding:28px 26px;'
        . 'font:16px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#2a2118;">'
        . $indhold
        . '</td></tr>'
        . '<tr><td style="padding:18px 6px 0;font:13px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#6b5d4d;">'
        . $fod
        . '</td></tr></table></td></tr></table></body></html>';
}

/**
 * Selve mailen til én modtager: [tekst, html, headere]. $r er en linje fra
 * nyhedsbrev-tabellen (eller en falsk til test og forhåndsvisning).
 */
function nyhedsbrev_mail(array $u, array $r): array
{
    $tekst = str_replace("\r\n", "\n", $u['tekst']);
    if ($u['hilsen']) {
        $fornavn = trim(explode(' ', trim($r['navn']))[0] ?? '');
        $tekst = ($fornavn !== '' ? "Hej $fornavn" : 'Hej') . ",\n\n" . $tekst;
    }
    $afmeld = $r['noegle'] !== '' ? nyhedsbrev_afmeldlink($r['noegle']) : adresse() . '/nyhedsbrev';
    $hvorfor = 'Du får denne mail, fordi du har meldt dig til nyt fra Learnification.';

    $ren = nyhedsbrev_maerk_links($tekst, $u['kampagne']) ."\n\n-- \n" . $hvorfor . "\nAfmeld med ét klik: " . $afmeld . "\n" . NYHEDSBREV_AFSENDER . "\n";

    $e = fn(string $s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
    $html = mail_ramme($u['emne'], nyhedsbrev_html_afsnit($tekst, $u['kampagne']),
        $e($hvorfor) . ' <a href="' . $e($afmeld) . '" style="color:#6b5d4d;">Afmeld med ét klik</a>.<br>'
        . $e(NYHEDSBREV_AFSENDER));

    $headere = ['Reply-To' => MODTAGER, 'List-Unsubscribe' => '<' . $afmeld . '>'];
    return [$ren, $html, $headere];
}
