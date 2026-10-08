<?php
/**
 * Spørgeskemaet til de voksne, når et barn har prøvet Learnification færdig.
 *
 * Det går af sted ÉN gang pr. konto, første gang
 *   - et barn (eller den voksne selv) har brugt hele prøvetiden (api/spilletid.php), eller
 *   - et barn har klaret sidste kapitel i et spil (api/gem.php).
 * Kontoen bliver markeret (konti.skema_sendt), FØR mailen går, så to samtidige
 * kald ikke sender den dobbelt; fejler afsendelsen, bliver markeringen
 * fjernet igen, og api/paamind.php (cron) prøver et par gange mere.
 *
 * Det er en SERVICEMAIL om testen, de selv er med i — ingen reklame (se _velkomst.php).
 * Svarene ligger i tabellen spoergeskemaer og vises i /admin#spoergeskema.
 */

declare(strict_types=1);
require_once __DIR__ . '/_nyhedsbrev.php';

const SKEMA_EMNE = 'Hvordan gik det med Learnification? Et kort spørgeskema';
const SKEMA_MAKS_FEJL = 3;

/** Hvem der kan få skemaet: aldrig administratoren eller spærrede konti. */
function skema_kan_sendes(array $k): bool
{
    return $k['type'] !== 'admin' && $k['status'] !== 'spaerret'
        && $k['skema_sendt'] === null && (int) $k['skema_fejl'] < SKEMA_MAKS_FEJL;
}

/** Mailen: [tekst, html, headere]. $s er rækken i spoergeskemaer, $kaldenavn barnet (eller ''). */
function skema_mail(array $k, array $s, string $kaldenavn): array
{
    $skole = $k['type'] === 'skole';
    $fornavn = trim(explode(' ', trim($skole ? $k['kontakt'] : $k['navn']))[0] ?? '');
    if (preg_match('/^famili/i', $fornavn)) {
        $fornavn = '';
    }
    $spil = SPIL[$s['spil']] ?? 'Learnification';
    // Den voksne selv (en konto "til mig selv", eller en voksen, der har spillet) — ellers et barn
    $selv = $s['elev_id'] === null && ($k['type'] === 'privat' || $kaldenavn === '');
    $barn = $kaldenavn !== '' ? $kaldenavn : ($skole ? 'en af eleverne' : 'et af børnene');
    $link = adresse() . '/spoergeskema?n=' . $s['noegle'];

    $tekst = ($fornavn !== '' ? "Hej $fornavn" : 'Hej') . ",\n\n"
        . ($selv
            ? ($s['aarsag'] === 'faerdig'
                ? "Du har klaret hele $spil. Tak, fordi du har prøvet det!"
                : 'Du har brugt hele prøvetiden på en time i Learnification. Tak, fordi du har prøvet det!')
            : ($s['aarsag'] === 'faerdig'
                ? "$barn har klaret hele $spil. Tak, fordi I har prøvet det!"
                : "$barn har brugt hele prøvetiden på en time i Learnification. Tak, fordi I har prøvet det!"))
        . "\n\nVi vil rigtig gerne vide, hvordan det gik. Spørgeskemaet tager to minutter, "
        . "og I får det kun denne ene gang. Jeres svar hjælper os med at gøre spillene bedre.\n\n"
        . ($s['aarsag'] === 'tid'
            ? "Vil I gerne have lov at spille videre, så skriv til os — så åbner vi for mere tid.\n\n"
            : '')
        . "Venlig hilsen\nLearnification";

    $hvorfor = 'Du får denne mail én gang, fordi du har oprettet en konto på learnification.dk, '
        . 'og et barn på kontoen har prøvet spillene færdig. Vi sender ikke flere spørgeskemaer.';
    $ren = nyhedsbrev_maerk_links($tekst . "\n\nSpørgeskemaet: $link", 'spoergeskema', 'servicemail')
        . "\n\n-- \n" . $hvorfor . "\n" . NYHEDSBREV_AFSENDER . "\n";

    $e = fn(string $x) => htmlspecialchars($x, ENT_QUOTES, 'UTF-8');
    $html = mail_ramme(SKEMA_EMNE,
        nyhedsbrev_html_afsnit($tekst, 'spoergeskema', 'servicemail')
        . '<p style="margin:8px 0 0;"><a href="' . $e(nyhedsbrev_maerk_links($link, 'spoergeskema', 'servicemail'))
        . '" style="display:inline-block;background:#ffcc4d;color:#140f1c;font-weight:700;text-decoration:none;'
        . 'padding:12px 22px;border-radius:999px;">Besvar spørgeskemaet</a></p>',
        $e($hvorfor) . '<br>' . $e(NYHEDSBREV_AFSENDER));

    return [$ren, $html, ['Reply-To' => MODTAGER]];
}

/** Send skemaet, der allerede ligger som række $s. Svarer, om mailen gik af sted. */
function skema_send_raekke(array $k, array $s): bool
{
    $kaldenavn = $s['elev_id'] ? (string) vaerdi('SELECT kaldenavn FROM elever WHERE id = ?', [$s['elev_id']]) : '';
    [$tekst, $html, $headere] = skema_mail($k, $s, $kaldenavn);
    if (!send_mail($k['email'], SKEMA_EMNE, $tekst, $html, $headere)) {
        return false;
    }
    kør('UPDATE spoergeskemaer SET sendt = ? WHERE id = ?', [time(), $s['id']]);
    return true;
}

/**
 * Noget har udløst skemaet for $konto_id. Gør ingenting, hvis kontoen allerede
 * har fået det. $aarsag er 'tid' eller 'faerdig'. Svarer, om der blev sendt en mail.
 */
function skema_udloes(int $konto_id, string $aarsag, ?int $elev_id, string $spil): bool
{
    $k = en('SELECT * FROM konti WHERE id = ?', [$konto_id]);
    if (!$k || !skema_kan_sendes($k)) {
        return false;
    }
    // Claim kontoen først: kun ét kald vinder
    if (!kør('UPDATE konti SET skema_sendt = ? WHERE id = ? AND skema_sendt IS NULL', [time(), $konto_id])) {
        return false;
    }
    $noegle = bin2hex(random_bytes(16));
    kør('INSERT INTO spoergeskemaer (konto_id, noegle, aarsag, elev_id, spil) VALUES (?, ?, ?, ?, ?)',
        [$konto_id, $noegle, $aarsag, $elev_id, $spil]);
    $s = en('SELECT * FROM spoergeskemaer WHERE noegle = ?', [$noegle]);
    if ($s && skema_send_raekke($k, $s)) {
        return true;
    }
    // Mailen gik ikke: frigiv kontoen, og tæl fejlen, så cron prøver igen
    kør('UPDATE konti SET skema_sendt = NULL, skema_fejl = skema_fejl + 1 WHERE id = ?', [$konto_id]);
    kør('DELETE FROM spoergeskemaer WHERE noegle = ? AND sendt IS NULL', [$noegle]);
    return false;
}

/**
 * Cron: prøv igen for konti, hvor mailen fejlede, og hvor grunden stadig
 * holder (barnet er stadig færdigt). Højst SKEMA_MAKS_FEJL forsøg i alt.
 */
function skema_genforsoeg(): int
{
    $sendt = 0;
    foreach (alle("SELECT * FROM konti WHERE skema_sendt IS NULL AND skema_fejl > 0 AND skema_fejl < ?
                   AND type != 'admin' AND status != 'spaerret'", [SKEMA_MAKS_FEJL]) as $k) {
        // Find et barn (eller den voksne), der er færdig, så vi kender årsagen
        $elev = alle('SELECT e.id FROM elever e JOIN grupper g ON g.id = e.gruppe_id WHERE g.konto_id = ?', [$k['id']]);
        foreach ($elev as $e) {
            $h = ['konto' => $k, 'elev' => ['id' => $e['id']]];
            if (tid_status($h)['slut']) {
                $sendt += skema_udloes((int) $k['id'], 'tid', (int) $e['id'], '') ? 1 : 0;
                continue 2;
            }
        }
        foreach (alle('SELECT elev_id, spil, data, opdateret FROM gemte_spil WHERE konto_id = ?', [$k['id']]) as $g) {
            $st = gemt_status($g['spil'], $g['data'], (int) $g['opdateret']);
            if ($st && $st['faerdig']) {
                $sendt += skema_udloes((int) $k['id'], 'faerdig', $g['elev_id'] !== null ? (int) $g['elev_id'] : null, $g['spil']) ? 1 : 0;
                continue 2;
            }
        }
    }
    return $sendt;
}

/** Spørgsmålene — ét sted, så siden, serveren og admin er enige. [nøgle => [slags, tekst, valg]] */
const SKEMA_SPOERGSMAAL = [
    'rolle' => ['valg', 'Hvem er du?', ['foraelder' => 'Forælder', 'laerer' => 'Lærer', 'andet' => 'Andet']],
    'klassetrin' => ['valg', 'Hvilket klassetrin spillede barnet/børnene på?',
                     ['0-2' => '0.-2. klasse', '3-4' => '3.-4. klasse', '5-6' => '5.-6. klasse', '7-9' => '7.-9. klasse']],
    'spil' => ['flere', 'Hvilke spil blev prøvet?', ['runeborg' => 'Runeborg', 'regnehelten' => 'Regnehelten']],
    'sjovt' => ['skala', 'Barnet havde det sjovt.', null],
    'forstod' => ['skala', 'Barnet forstod, hvad det skulle gøre.', null],
    'laerte' => ['skala', 'Jeg tror, barnet lærte noget.', null],
    'videre' => ['skala', 'Barnet ville gerne have spillet videre.', null],
    'bedst' => ['fri', 'Hvad var bedst?', null],
    'aendre' => ['fri', 'Hvad skal vi ændre?', null],
    'betaling' => ['valg', 'Hvis spillene bliver gode, hvem skal så betale?',
                   ['skolen' => 'Skolen', 'foraeldre' => 'Forældrene', 'ingen' => 'Det skal være gratis', 'ved_ikke' => 'Ved ikke']],
    'kontakt' => ['valg', 'Må vi kontakte dig med et par uddybende spørgsmål?', ['ja' => 'Ja', 'nej' => 'Nej']],
];

/** Gør indsendte svar rene: kun kendte spørgsmål, kun gyldige værdier, fritekst kortet ned. */
function skema_rens(array $rå): array
{
    $ud = [];
    foreach (SKEMA_SPOERGSMAAL as $nøgle => [$slags, , $valg]) {
        $v = $rå[$nøgle] ?? null;
        if ($slags === 'valg' && is_string($v) && isset($valg[$v])) {
            $ud[$nøgle] = $v;
        } elseif ($slags === 'flere' && is_array($v)) {
            $ud[$nøgle] = array_values(array_filter($v, fn($x) => is_string($x) && isset($valg[$x])));
        } elseif ($slags === 'skala' && is_numeric($v) && (int) $v >= 1 && (int) $v <= 5) {
            $ud[$nøgle] = (int) $v;
        } elseif ($slags === 'fri' && is_string($v) && trim($v) !== '') {
            $ud[$nøgle] = mb_substr(trim($v), 0, 2000);
        }
    }
    return $ud;
}
