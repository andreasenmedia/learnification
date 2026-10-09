<?php
/**
 * Voksenkonti: oprette, logge ind og ud, glemt kodeord, slette.
 *
 *   GET  ?handling=mig          hvem er logget ind (også elever)
 *   POST opret                  ny konto: til mig selv, familie eller skole
 *   POST login / logud
 *   POST tilbage                fra barnet tilbage til den voksne, der gik ind som det
 *   POST glemt                  send et link til en ny adgangskode
 *   POST nulstil                sæt nyt kodeord med linket
 *   POST skift_kodeord, ret, slet_konto
 *   POST skift_type {type, skolenavn?}  en konto "til mig selv" bliver familie eller skole
 *
 * Nye konti kan bruges med det samme. De står som "ny" i admin-overblikket,
 * til de er godkendt, og kan spærres derfra.
 */

declare(strict_types=1);
require __DIR__ . '/_kerne.php';

function konto_ud(array $k): array
{
    return ['id' => (int) $k['id'], 'type' => $k['type'], 'navn' => $k['navn'],
            'kontakt' => $k['kontakt'], 'bynavn' => $k['bynavn'], 'email' => $k['email'],
            'status' => $k['status'], 'oprettet' => (int) $k['oprettet']];
}

function tjek_kodeord(string $k): void
{
    if (strlen($k) < 8) {
        fejl('Adgangskoden skal være mindst 8 tegn.');
    }
    if (strlen($k) > 200) {
        fejl('Adgangskoden er for lang.');
    }
}

$h = handling();

if ($h === 'mig') {
    $x = hvem();
    if (!$x) {
        // Cookien er udløbet eller ugyldig — så skal lillebroren også væk
        if (isset($_COOKIE['lf_in'])) {
            saet_cookie('lf_in', '', time() - 3600, false);
        }
        svar(['ok' => true, 'logget_ind' => false]);
    }
    $ud = ['ok' => true, 'logget_ind' => true, 'konto' => konto_ud($x['konto']), 'tid' => tid_status($x)];
    if (!empty($x['konto']['test'])) {
        $ud['test'] = true;   // en testrunde (api/test.php)
    }
    if ($x['elev']) {
        $e = $x['elev'];
        $ud['hvem'] = 'elev';
        $ud['elev'] = ['id' => (int) $e['id'], 'kaldenavn' => $e['kaldenavn'], 'ikon' => $e['ikon'],
                       'gruppe' => $e['gruppe'],
                       // Barnets eget svar, ellers klassens. null = ingen ved det endnu, så spillene spørger.
                       'klassetrin' => $e['klassetrin'] !== null ? (int) $e['klassetrin']
                           : ($e['gruppe_klassetrin'] !== null ? (int) $e['gruppe_klassetrin'] : null)];
        // Barnet skal ikke se de voksnes mailadresse
        unset($ud['konto']['email'], $ud['konto']['kontakt']);
        // Gik den voksne selv ind som barnet, kan den voksne komme tilbage
        if (parkeret_voksen()) {
            $ud['tilbage_til'] = explode(' ', trim($x['konto']['kontakt'] ?: $x['konto']['navn']))[0];
        }
    } else {
        $ud['hvem'] = 'voksen';
    }
    // Hvor langt er spilleren nået i hvert spil? Bruges på spiloversigten (/spil/)
    $gemt = (object) [];
    $noegle = $x['elev'] ? 'elev.' . (int) $x['elev']['id'] : 'voksen.' . (int) $x['konto']['id'];
    foreach (alle('SELECT spil, data, opdateret FROM gemte_spil WHERE hvem = ?', [$noegle]) as $g) {
        if (isset(SPIL[$g['spil']]) && ($st = gemt_status($g['spil'], $g['data'], (int) $g['opdateret']))) {
            $gemt->{$g['spil']} = $st;
        }
    }
    $ud['gemt'] = $gemt;
    svar($ud);
}

kraev_egen_side();

switch ($h) {

case 'opret':
    bremse('opret', ip(), 5, 3600);
    // Fælden: et felt, kun en robot udfylder
    if (felt('hjemmeside') !== '') {
        svar(['ok' => true]);
    }
    $f = tjek_kontofelter(['type' => felt('type', 20), 'navn' => felt('navn', 120), 'kontakt' => felt('kontakt', 120),
                           'bynavn' => felt('bynavn', 80), 'email' => felt('email', 190)]);
    ['type' => $type, 'navn' => $navn, 'kontakt' => $kontakt, 'bynavn' => $bynavn, 'email' => $email] = $f;
    $kodeord = (string) (input()['kodeord'] ?? '');
    tjek_kodeord($kodeord);
    if (empty(input()['samtykke'])) {
        fejl('Sæt flueben ved, at du er fyldt 15 år og har læst, hvad vi gemmer.');
    }

    // En familie får sin gruppe med det samme — og børnene, hvis de er skrevet på
    $nu = time();
    $id = opret_konto($f, password_hash($kodeord, PASSWORD_DEFAULT), 'ny',
                      $type === 'foraelder' ? (string) (input()['boern'] ?? '') : '');

    log_ind($id, null, VOKSEN_LEVETID);
    kør('UPDATE konti SET sidst_inde = ? WHERE id = ?', [$nu, $id]);

    send_mail(MODTAGER, 'Ny testkonto: ' . $navn,
        "Der er oprettet en ny konto på Learnification.\n\n"
        . 'Type:      ' . KONTOTYPER[$type] . "\n"
        . "Navn:      $navn\n"
        . ($type === 'skole' ? "Kontakt:   $kontakt\n" : '')
        . ($bynavn !== '' ? "By:        $bynavn\n" : '')
        . "Mail:      $email\n"
        . 'Tidspunkt: ' . date('d-m-Y H:i') . "\n\n"
        . "Godkend eller spær den i overblikket:\n" . adresse() . "/admin\n");

    // Velkomstmailen: sådan kommer I i gang. Går den ikke igennem, kan den
    // sendes igen fra /admin#velkomst — kontoen er oprettet under alle omstændigheder.
    require_once __DIR__ . '/_velkomst.php';
    velkomst_send(en('SELECT * FROM konti WHERE id = ?', [$id]));

    // Nyhedsbrevet er sit eget flueben — aldrig en del af at oprette kontoen
    if (!empty(input()['nyhedsbrev'])) {
        require_once __DIR__ . '/_nyhedsbrev.php';
        nyhedsbrev_tilmeld($email, $kontakt,
                           ['skole' => 'laerer', 'foraelder' => 'foraelder'][$type] ?? 'andet', '/opret');
    }

    svar(['ok' => true, 'besked' => 'Kontoen er oprettet.']);

case 'login':
    $email = lille(felt('email', 190));
    $kodeord = (string) (input()['kodeord'] ?? '');
    bremse('login-ip', ip(), 20, 900);
    bremse('login-mail', $email, 8, 900);
    $k = en('SELECT * FROM konti WHERE email = ?', [$email]);
    // Samme svar, uanset om det er mailen eller kodeordet, der er forkert
    if (!$k || !password_verify($kodeord, $k['kodeord'])) {
        fejl('Mailadressen eller adgangskoden passer ikke.', 401);
    }
    if ($k['status'] === 'spaerret') {
        fejl('Kontoen er lukket. Skriv til ' . MODTAGER . ', hvis det er en fejl.', 403);
    }
    if (password_needs_rehash($k['kodeord'], PASSWORD_DEFAULT)) {
        kør('UPDATE konti SET kodeord = ? WHERE id = ?', [password_hash($kodeord, PASSWORD_DEFAULT), $k['id']]);
    }
    log_ind((int) $k['id'], null, VOKSEN_LEVETID);
    kør('UPDATE konti SET sidst_inde = ? WHERE id = ?', [time(), $k['id']]);
    svar(['ok' => true, 'type' => $k['type']]);

case 'logud':
    log_ud();
    svar(['ok' => true]);

case 'saet_klassetrin':
    kraev_egen_side();
    $x = hvem();
    if (!$x || !$x['elev']) {
        fejl('Det er kun for børn, der er logget ind.', 401);
    }
    $t = input()['klassetrin'] ?? null;
    if (!is_numeric($t) || (int) $t < 0 || (int) $t > 9) {
        fejl('Vælg et klassetrin.');
    }
    kør('UPDATE elever SET klassetrin = ? WHERE id = ?', [(int) $t, $x['elev']['id']]);
    svar(['ok' => true, 'klassetrin' => (int) $t]);

case 'tilbage':
    $p = parkeret_voksen();
    if (!$p) {
        fejl('Log ind med din mail og din adgangskode.', 401);
    }
    // Barnets login slutter, og den voksnes eget login kommer tilbage
    kør('DELETE FROM logins WHERE token = ?', [hash('sha256', (string) $_COOKIE['lf_session'])]);
    $udloeber = (int) $p['login']['udloeber'];
    saet_cookie('lf_session', $p['token'], $udloeber, true);
    saet_cookie('lf_in', 'voksen.' . (int) $p['konto']['id'], $udloeber, false);
    saet_cookie('lf_voksen', '', time() - 3600, true);
    svar(['ok' => true]);

case 'glemt':
    $email = lille(felt('email', 190));
    bremse('glemt-ip', ip(), 5, 3600);
    bremse('glemt-mail', $email, 3, 3600);
    $k = en('SELECT * FROM konti WHERE email = ? AND status != ?', [$email, 'spaerret']);
    if ($k) {
        require_once __DIR__ . '/_nyhedsbrev.php';
        $link = nulstil_link((int) $k['id'], 3600);
        $hej = trim((string) $k['kontakt']) !== '' ? 'Hej ' . $k['kontakt'] : 'Hej';
        $tekst = "$hej

"
            . "Nogen (forhåbentlig dig) har bedt om en ny adgangskode til Learnification.
"
            . "Klik her inden for en time for at vælge en ny:

$link

"
            . "Var det ikke dig, så skal du ikke gøre noget — din gamle adgangskode virker stadig.

"
            . "Venlig hilsen
Learnification
";
        $e = fn(string $x) => htmlspecialchars($x, ENT_QUOTES, 'UTF-8');
        $html = mail_ramme('Ny adgangskode til Learnification',
            '<p style="margin:0 0 16px;">' . $e($hej) . ',</p>'
            . '<p style="margin:0 0 16px;">Nogen (forhåbentlig dig) har bedt om en ny adgangskode til Learnification. Linket virker i en time.</p>'
            . '<p style="margin:0 0 20px;"><a href="' . $e($link) . '" style="display:inline-block;background:#ffcc4d;color:#140f1c;'
            . 'font-weight:700;text-decoration:none;padding:12px 22px;border:3px solid #b8862a;border-radius:0;">Vælg ny adgangskode</a></p>'
            . '<p style="margin:0;color:#6b5d4d;">Var det ikke dig, så skal du ikke gøre noget — din gamle adgangskode virker stadig.</p>',
            'Du får denne mail, fordi nogen har trykket "Glemt adgangskode" på learnification.dk med din mailadresse.');
        send_mail($k['email'], 'Ny adgangskode til Learnification', $tekst, $html);
    }
    // Samme svar uanset hvad, så man ikke kan bruge siden til at finde ud
    // af, hvem der har en konto
    svar(['ok' => true, 'besked' => 'Hvis der findes en konto med den mailadresse, er der sendt et link nu. Kig også i spam.']);

case 'nulstil':
    bremse('nulstil', ip(), 10, 900);
    $token = (string) (input()['token'] ?? '');
    $kodeord = (string) (input()['kodeord'] ?? '');
    tjek_kodeord($kodeord);
    $n = en('SELECT * FROM nulstil WHERE token = ? AND udloeber > ?', [hash('sha256', $token), time()]);
    if (!$n) {
        fejl('Linket er udløbet eller allerede brugt. Bed om et nyt.', 410);
    }
    kør('UPDATE konti SET kodeord = ? WHERE id = ?', [password_hash($kodeord, PASSWORD_DEFAULT), $n['konto_id']]);
    kør('DELETE FROM nulstil WHERE konto_id = ?', [$n['konto_id']]);
    // Alle andre steder, kontoen var logget ind, bliver logget ud
    kør('DELETE FROM logins WHERE konto_id = ? AND elev_id IS NULL', [$n['konto_id']]);
    log_ind((int) $n['konto_id'], null, VOKSEN_LEVETID);
    svar(['ok' => true, 'besked' => 'Din nye adgangskode er gemt.']);
}

// ------------------------------------------------------ resten kræver login

$k = kraev_voksen();

switch ($h) {

case 'skift_kodeord':
    bremse('skift', (string) $k['id'], 10, 900);
    if (!password_verify((string) (input()['gammelt'] ?? ''), $k['kodeord'])) {
        fejl('Den nuværende adgangskode passer ikke.', 401);
    }
    $nyt = (string) (input()['nyt'] ?? '');
    tjek_kodeord($nyt);
    kør('UPDATE konti SET kodeord = ? WHERE id = ?', [password_hash($nyt, PASSWORD_DEFAULT), $k['id']]);
    svar(['ok' => true, 'besked' => 'Adgangskoden er skiftet.']);

case 'ret':
    $navn = felt('navn', 120);
    $kontakt = felt('kontakt', 120);
    $bynavn = felt('bynavn', 80);
    if (laengde($navn) < 2) {
        fejl('Navnet skal være mindst to tegn.');
    }
    if ($k['type'] !== 'skole') {
        $kontakt = $navn;
    }
    kør('UPDATE konti SET navn = ?, kontakt = ?, bynavn = ? WHERE id = ?',
        [$navn, $kontakt !== '' ? $kontakt : $k['kontakt'], $bynavn, $k['id']]);
    svar(['ok' => true, 'besked' => 'Gemt.']);

case 'skift_type':
    // Man opretter altid en konto til sig selv. Skal der børn på, gør man den
    // bagefter til en familie (gruppen "Familien") eller en skole (klasser).
    if ($k['type'] !== 'privat') {
        fejl('Kontoen er allerede sat op til ' . (KONTOTYPER[$k['type']] ?? $k['type']) . '.');
    }
    $type = felt('type', 20);
    // Som på /opret: den voksne bekræfter igen at være fyldt 15 år
    if (in_array($type, ['foraelder', 'skole'], true) && empty(input()['alder'])) {
        fejl('Sæt flueben ved, at du er fyldt 15 år.');
    }
    if ($type === 'foraelder') {
        db()->beginTransaction();
        kør("UPDATE konti SET type = 'foraelder' WHERE id = ?", [$k['id']]);
        kør('INSERT INTO grupper (konto_id, navn, klassetrin, kode, oprettet) VALUES (?, ?, NULL, ?, ?)',
            [$k['id'], 'Familien', ny_kode(), time()]);
        $gid = (int) db()->lastInsertId();
        db()->commit();
        svar(['ok' => true, 'gruppe' => $gid]);
    }
    if ($type === 'skole') {
        $skole = felt('skolenavn', 120);
        if (laengde($skole) < 2) {
            fejl('Skriv skolens navn.');
        }
        // Skolens navn bliver kontoens navn, den voksne bliver kontaktperson
        kør("UPDATE konti SET type = 'skole', navn = ?, kontakt = ? WHERE id = ?", [$skole, $k['navn'], $k['id']]);
        svar(['ok' => true]);
    }
    fejl('Vælg familie eller skole.');

case 'slet_konto':
    if ($k['type'] === 'admin') {
        fejl('Administratorkontoen kan ikke slettes herfra.', 403);
    }
    bremse('slet', (string) $k['id'], 5, 900);
    if (!password_verify((string) (input()['kodeord'] ?? ''), $k['kodeord'])) {
        fejl('Adgangskoden passer ikke.', 401);
    }
    // Grupper, elever, spilletid og logins går med i faldet (ON DELETE CASCADE)
    log_ud();
    kør('DELETE FROM konti WHERE id = ?', [$k['id']]);
    send_mail(MODTAGER, 'Konto slettet: ' . $k['navn'],
        "{$k['navn']} ({$k['email']}) har selv slettet sin konto og alt, der hørte til.\n");
    svar(['ok' => true, 'besked' => 'Kontoen og alt, der hørte til, er slettet.']);
}

fejl('Ukendt handling.', 404);
