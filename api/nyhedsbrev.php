<?php
/**
 * Nyhedsbrevet: tilmelding, bekræftelse, afmelding — og listen til /admin.
 *
 *   POST tilmeld {email, navn, rolle, kilde, samtykke}   sender bekræftelsesmailen
 *   POST bekraeft {noegle}                               fra linket i mailen
 *   POST afmeld {noegle}                                 fra linket i hver mail
 *
 *   Kun administratoren:
 *   GET  ?handling=liste                                 alle, med tal
 *   GET  ?handling=eksport                               de aktive som CSV
 *   POST fjern {id}                                      slet helt (retten til at blive glemt)
 *
 * Reglerne står i _nyhedsbrev.php.
 */

declare(strict_types=1);
require __DIR__ . '/_kerne.php';
require __DIR__ . '/_nyhedsbrev.php';

function skjul_mail(string $email): string
{
    [$navn, $domaene] = explode('@', $email, 2) + ['', ''];
    return substr($navn, 0, 1) . str_repeat('•', max(2, strlen($navn) - 1)) . '@' . $domaene;
}

function efter_noegle(): array
{
    $noegle = preg_replace('/[^0-9a-f]/', '', felt('noegle', 80)) ?? '';
    $r = strlen($noegle) === 40 ? en('SELECT * FROM nyhedsbrev WHERE noegle = ?', [$noegle]) : null;
    if (!$r) {
        fejl('Linket virker ikke længere. Måske er tilmeldingen slettet — du kan altid skrive dig op igen.', 404);
    }
    return $r;
}

switch (handling()) {

case 'tilmeld':
    kraev_egen_side();
    bremse('nyhedsbrev', ip(), 5, 3600);
    if (felt('hjemmeside') !== '') {        // fælden: kun robotter udfylder den
        svar(['ok' => true]);
    }
    if (empty(input()['samtykke'])) {
        fejl('Sæt flueben ved, at du gerne vil have mails fra os.');
    }
    $kilde = felt('kilde', 60);
    if (!preg_match('#^/[a-z0-9/\-]*$#', $kilde)) {
        $kilde = '';
    }
    nyhedsbrev_tilmeld(felt('email', 190), felt('navn', 80), felt('rolle', 20), $kilde);
    svar(['ok' => true]);

case 'bekraeft':
    kraev_egen_side();
    bremse('nyhedsbrev-link', ip(), 30, 3600);
    $r = efter_noegle();
    if ($r['afmeldt'] !== null) {
        fejl('Du har afmeldt dig. Vil du have nyt fra os igen, så skriv dig op på ny.', 410);
    }
    if ($r['bekraeftet'] === null) {
        kør('UPDATE nyhedsbrev SET bekraeftet = ? WHERE id = ?', [time(), $r['id']]);
    }
    svar(['ok' => true, 'email' => skjul_mail($r['email'])]);

case 'afmeld':
    kraev_egen_side();
    bremse('nyhedsbrev-link', ip(), 30, 3600);
    $r = efter_noegle();
    if ($r['afmeldt'] === null) {
        kør('UPDATE nyhedsbrev SET afmeldt = ? WHERE id = ?', [time(), $r['id']]);
    }
    svar(['ok' => true, 'email' => skjul_mail($r['email'])]);
}

// ------------------------------------------------------------ administratoren

kraev_admin();

function status(array $r): string
{
    if ($r['afmeldt'] !== null) {
        return 'afmeldt';
    }
    return $r['bekraeftet'] !== null ? 'aktiv' : 'venter';
}

switch (handling()) {

case 'liste':
    $ud = [];
    $tal = ['aktiv' => 0, 'venter' => 0, 'afmeldt' => 0, 'nye_30' => 0];
    $maaned = time() - 30 * 86400;
    foreach (alle('SELECT * FROM nyhedsbrev ORDER BY oprettet DESC') as $r) {
        $s = status($r);
        $tal[$s]++;
        if ($s === 'aktiv' && (int) $r['bekraeftet'] > $maaned) {
            $tal['nye_30']++;
        }
        $ud[] = ['id' => (int) $r['id'], 'email' => $r['email'], 'navn' => $r['navn'],
                 'rolle' => NYHEDSBREV_ROLLER[$r['rolle']] ?? '', 'kilde' => $r['kilde'],
                 'status' => $s, 'oprettet' => (int) $r['oprettet'],
                 'bekraeftet' => $r['bekraeftet'] !== null ? (int) $r['bekraeftet'] : null,
                 'afmeldt' => $r['afmeldt'] !== null ? (int) $r['afmeldt'] : null,
                 'samtykke' => $r['samtykke']];
    }
    svar(['ok' => true, 'tal' => $tal, 'liste' => $ud]);

case 'eksport':
    // Kun dem, der må få mails: bekræftet og ikke afmeldt. Afmeldingslinket
    // står med, så det kan flettes ind i hver mail fra et mailprogram.
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="learnification-nyhedsbrev-' . date('Y-m-d') . '.csv"');
    header('Cache-Control: no-store');
    $f = fopen('php://output', 'w');
    fwrite($f, "\xEF\xBB\xBF");
    fputcsv($f, ['Mail', 'Navn', 'Rolle', 'Tilmeldt fra', 'Bekræftet', 'Afmeldingslink', 'Samtykke'], ';');
    $csv = fn($v) => is_string($v) && preg_match('/^[=+\-@]/', $v) ? "'" . $v : $v;
    foreach (alle('SELECT * FROM nyhedsbrev WHERE bekraeftet IS NOT NULL AND afmeldt IS NULL ORDER BY bekraeftet') as $r) {
        fputcsv($f, array_map($csv, [$r['email'], $r['navn'], NYHEDSBREV_ROLLER[$r['rolle']] ?? '', $r['kilde'],
                                      date('d-m-Y H:i', (int) $r['bekraeftet']), nyhedsbrev_afmeldlink($r['noegle']),
                                      $r['samtykke']]), ';');
    }
    exit;

case 'fjern':
    kraev_egen_side();
    kør('DELETE FROM nyhedsbrev WHERE id = ?', [tal('id')]);
    svar(['ok' => true]);
}

fejl('Ukendt handling.', 404);
