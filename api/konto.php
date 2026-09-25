<?php
/**
 * Voksenkonti: oprette, logge ind og ud, glemt kodeord, slette.
 *
 *   GET  ?handling=mig          hvem er logget ind (også elever)
 *   POST opret                  ny skole- eller forældrekonto
 *   POST login / logud
 *   POST glemt                  send et link til et nyt kodeord
 *   POST nulstil                sæt nyt kodeord med linket
 *   POST skift_kodeord, ret, slet_konto
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
        fejl('Kodeordet skal være mindst 8 tegn.');
    }
    if (strlen($k) > 200) {
        fejl('Kodeordet er for langt.');
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
    $ud = ['ok' => true, 'logget_ind' => true, 'konto' => konto_ud($x['konto'])];
    if ($x['elev']) {
        $e = $x['elev'];
        $ud['hvem'] = 'elev';
        $ud['elev'] = ['id' => (int) $e['id'], 'kaldenavn' => $e['kaldenavn'], 'ikon' => $e['ikon'],
                       'gruppe' => $e['gruppe'], 'klassetrin' => $e['klassetrin'] !== null ? (int) $e['klassetrin'] : null];
        // Barnet skal ikke se de voksnes mailadresse
        unset($ud['konto']['email'], $ud['konto']['kontakt']);
    } else {
        $ud['hvem'] = 'voksen';
    }
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
    $type = felt('type', 20);
    $navn = felt('navn', 120);
    $kontakt = felt('kontakt', 120);
    $bynavn = felt('bynavn', 80);
    $email = lille(felt('email', 190));
    $kodeord = (string) (input()['kodeord'] ?? '');

    if (!in_array($type, ['skole', 'foraelder'], true)) {
        fejl('Vælg, om I er en skole eller en familie.');
    }
    if (laengde($navn) < 2) {
        fejl($type === 'skole' ? 'Skriv skolens navn.' : 'Skriv dit navn.');
    }
    if ($type === 'skole' && laengde($kontakt) < 2) {
        fejl('Skriv dit eget navn som kontaktperson.');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        fejl('Den mailadresse ser ikke rigtig ud.');
    }
    tjek_kodeord($kodeord);
    if (empty(input()['samtykke'])) {
        fejl('Sæt flueben ved, at du har læst, hvad vi gemmer.');
    }
    if (vaerdi('SELECT 1 FROM konti WHERE email = ?', [$email])) {
        fejl('Der findes allerede en konto med den mailadresse. Prøv at logge ind, eller brug "Glemt kodeord".', 409);
    }

    $nu = time();
    db()->beginTransaction();
    kør('INSERT INTO konti (type, navn, kontakt, bynavn, email, kodeord, status, oprettet)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [$type, $navn, $type === 'skole' ? $kontakt : $navn, $bynavn, $email,
         password_hash($kodeord, PASSWORD_DEFAULT), 'ny', $nu]);
    $id = (int) db()->lastInsertId();
    // En familie får sin gruppe med det samme, så der kun er børn at tilføje
    if ($type === 'foraelder') {
        kør('INSERT INTO grupper (konto_id, navn, klassetrin, kode, oprettet) VALUES (?, ?, NULL, ?, ?)',
            [$id, 'Familien', ny_kode(), $nu]);
    }
    db()->commit();

    log_ind($id, null, VOKSEN_LEVETID);
    kør('UPDATE konti SET sidst_inde = ? WHERE id = ?', [$nu, $id]);

    send_mail(MODTAGER, 'Ny testkonto: ' . $navn,
        "Der er oprettet en ny konto på Learnification.\n\n"
        . 'Type:      ' . ($type === 'skole' ? 'Skole' : 'Forælder') . "\n"
        . "Navn:      $navn\n"
        . ($type === 'skole' ? "Kontakt:   $kontakt\n" : '')
        . ($bynavn !== '' ? "By:        $bynavn\n" : '')
        . "Mail:      $email\n"
        . 'Tidspunkt: ' . date('d-m-Y H:i') . "\n\n"
        . "Godkend eller spær den i overblikket:\n" . adresse() . "/admin\n");

    svar(['ok' => true, 'besked' => 'Kontoen er oprettet.']);

case 'login':
    $email = lille(felt('email', 190));
    $kodeord = (string) (input()['kodeord'] ?? '');
    bremse('login-ip', ip(), 20, 900);
    bremse('login-mail', $email, 8, 900);
    $k = en('SELECT * FROM konti WHERE email = ?', [$email]);
    // Samme svar, uanset om det er mailen eller kodeordet, der er forkert
    if (!$k || !password_verify($kodeord, $k['kodeord'])) {
        fejl('Mailadressen eller kodeordet passer ikke.', 401);
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

case 'glemt':
    $email = lille(felt('email', 190));
    bremse('glemt-ip', ip(), 5, 3600);
    bremse('glemt-mail', $email, 3, 3600);
    $k = en('SELECT * FROM konti WHERE email = ? AND status != ?', [$email, 'spaerret']);
    if ($k) {
        $token = bin2hex(random_bytes(24));
        kør('DELETE FROM nulstil WHERE konto_id = ? OR udloeber < ?', [$k['id'], time()]);
        kør('INSERT INTO nulstil (token, konto_id, udloeber) VALUES (?, ?, ?)',
            [hash('sha256', $token), $k['id'], time() + 3600]);
        send_mail($k['email'], 'Nyt kodeord til Learnification',
            "Hej {$k['kontakt']}\n\n"
            . "Nogen (forhåbentlig dig) har bedt om et nyt kodeord til Learnification.\n"
            . "Klik her inden for en time for at vælge et nyt:\n\n"
            . adresse() . '/login#nulstil=' . $token . "\n\n"
            . "Var det ikke dig, så skal du ikke gøre noget — dit gamle kodeord virker stadig.\n\n"
            . "Venlig hilsen\nLearnification\n");
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
    svar(['ok' => true, 'besked' => 'Dit nye kodeord er gemt.']);
}

// ------------------------------------------------------ resten kræver login

$k = kraev_voksen();

switch ($h) {

case 'skift_kodeord':
    bremse('skift', (string) $k['id'], 10, 900);
    if (!password_verify((string) (input()['gammelt'] ?? ''), $k['kodeord'])) {
        fejl('Det nuværende kodeord passer ikke.', 401);
    }
    $nyt = (string) (input()['nyt'] ?? '');
    tjek_kodeord($nyt);
    kør('UPDATE konti SET kodeord = ? WHERE id = ?', [password_hash($nyt, PASSWORD_DEFAULT), $k['id']]);
    svar(['ok' => true, 'besked' => 'Kodeordet er skiftet.']);

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

case 'slet_konto':
    if ($k['type'] === 'admin') {
        fejl('Administratorkontoen kan ikke slettes herfra.', 403);
    }
    bremse('slet', (string) $k['id'], 5, 900);
    if (!password_verify((string) (input()['kodeord'] ?? ''), $k['kodeord'])) {
        fejl('Kodeordet passer ikke.', 401);
    }
    // Grupper, elever, spilletid og logins går med i faldet (ON DELETE CASCADE)
    log_ud();
    kør('DELETE FROM konti WHERE id = ?', [$k['id']]);
    send_mail(MODTAGER, 'Konto slettet: ' . $k['navn'],
        "{$k['navn']} ({$k['email']}) har selv slettet sin konto og alt, der hørte til.\n");
    svar(['ok' => true, 'besked' => 'Kontoen og alt, der hørte til, er slettet.']);
}

fejl('Ukendt handling.', 404);
