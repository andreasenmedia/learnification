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
 *   Sende nyhedsbreve (fra /admin#nyhedsbrev):
 *   GET  ?handling=udsendelser                           modtagere pr. gruppe + det, der er sendt
 *   POST forhaandsvis {emne, tekst, maalgruppe, hilsen}  mailen som HTML
 *   POST test {emne, tekst, maalgruppe, hilsen}          send den til administratoren selv
 *   POST opret {emne, tekst, maalgruppe, hilsen}         gem udsendelsen -> {id}
 *   POST send {id}                                       send en bunke; kaldes igen til tilbage = 0
 *   POST slet_udsendelse {id}                            kun hvis den ikke er sendt til nogen
 *
 * Reglerne står i _nyhedsbrev.php.
 */

declare(strict_types=1);
require __DIR__ . '/_kerne.php';
require_once __DIR__ . '/_nyhedsbrev.php';

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

case 'udsendelser':
    $tal = [];
    foreach (NYHEDSBREV_MAALGRUPPER as $g => [$navn]) {
        $tal[$g] = ['navn' => $navn, 'antal' => (int) vaerdi('SELECT COUNT(*) FROM nyhedsbrev WHERE ' . nyhedsbrev_aktive($g))];
    }
    $ud = [];
    foreach (alle('SELECT u.*, (SELECT COUNT(*) FROM udsendelse_modtagere m WHERE m.udsendelse_id = u.id AND m.ok = 1) AS sendt,
                          (SELECT COUNT(*) FROM udsendelse_modtagere m WHERE m.udsendelse_id = u.id AND (m.ok = 0 OR m.ok IS NULL)) AS fejlet
                   FROM udsendelser u ORDER BY u.oprettet DESC') as $u) {
        $ud[] = ['id' => (int) $u['id'], 'emne' => $u['emne'], 'tekst' => $u['tekst'],
                 'maalgruppe' => NYHEDSBREV_MAALGRUPPER[$u['maalgruppe']][0] ?? $u['maalgruppe'],
                 'kampagne' => $u['kampagne'], 'oprettet' => (int) $u['oprettet'],
                 'faerdig' => $u['faerdig'] !== null ? (int) $u['faerdig'] : null,
                 'sendt' => (int) $u['sendt'], 'fejlet' => (int) $u['fejlet'],
                 'tilbage' => $u['faerdig'] !== null ? 0 : tilbage($u)];
    }
    svar(['ok' => true, 'grupper' => $tal, 'udsendelser' => $ud, 'mig' => kraev_admin()['email'],
          'smtp' => smtp_opsaetning() !== null]);

case 'forhaandsvis':
case 'test':
    kraev_egen_side();
    $u = udkast();
    $mig = kraev_admin();
    [$tekst, $html, $headere] = nyhedsbrev_mail($u, ['navn' => $mig['navn'], 'noegle' => '']);
    if (handling() === 'forhaandsvis') {
        svar(['ok' => true, 'html' => $html]);
    }
    bremse('nyhedsbrev-test', (string) $mig['id'], 20, 3600);
    if (!send_mail($mig['email'], '[TEST] ' . $u['emne'], $tekst, $html, $headere)) {
        fejl('Mailen blev ikke sendt: ' . (post_fejl() ?: 'ukendt fejl'), 502);
    }
    svar(['ok' => true, 'til' => $mig['email']]);

case 'opret':
    // Gemmer udsendelsen. Selve mailene går af sted med "send" bagefter.
    kraev_egen_side();
    $u = udkast();
    if (!(int) vaerdi('SELECT COUNT(*) FROM nyhedsbrev WHERE ' . nyhedsbrev_aktive($u['maalgruppe']))) {
        fejl('Der er ingen aktive modtagere i den gruppe.');
    }
    kør('INSERT INTO udsendelser (emne, tekst, maalgruppe, hilsen, kampagne, oprettet) VALUES (?, ?, ?, ?, ?, ?)',
        [$u['emne'], $u['tekst'], $u['maalgruppe'], $u['hilsen'], $u['kampagne'], time()]);
    svar(['ok' => true, 'id' => (int) db()->lastInsertId()]);

case 'send':
    // Sender en lille bunke ad gangen, så en lang liste ikke løber ind i
    // webhotellets tidsgrænse. Siden kalder igen, til der ikke er flere.
    // Hvem der allerede har fået den, står i udsendelse_modtagere — så en
    // afbrudt udsendelse kan bare startes igen. De aktive bliver slået op
    // hver gang, så den, der afmelder sig undervejs, ikke får den.
    kraev_egen_side();
    $u = en('SELECT * FROM udsendelser WHERE id = ?', [tal('id')]);
    if (!$u) {
        fejl('Udsendelsen findes ikke.', 404);
    }
    @set_time_limit(60);
    $sendt = $fejlet = 0;
    $stop = microtime(true) + 20;
    foreach (alle('SELECT * FROM nyhedsbrev n WHERE ' . nyhedsbrev_aktive($u['maalgruppe']) . '
                   AND NOT EXISTS (SELECT 1 FROM udsendelse_modtagere m WHERE m.udsendelse_id = ? AND m.nyhedsbrev_id = n.id)
                   ORDER BY n.id LIMIT 25', [$u['id']]) as $r) {
        try {
            // Først skrive, så sende: kom en anden fane først, springes den over
            kør('INSERT INTO udsendelse_modtagere (udsendelse_id, nyhedsbrev_id, tid) VALUES (?, ?, ?)',
                [$u['id'], $r['id'], time()]);
        } catch (PDOException $e) {
            continue;
        }
        [$tekst, $html, $headere] = nyhedsbrev_mail($u, $r);
        $ok = send_mail($r['email'], $u['emne'], $tekst, $html, $headere);
        kør('UPDATE udsendelse_modtagere SET ok = ? WHERE udsendelse_id = ? AND nyhedsbrev_id = ?',
            [$ok ? 1 : 0, $u['id'], $r['id']]);
        $ok ? $sendt++ : $fejlet++;
        if (microtime(true) > $stop) {
            break;
        }
    }
    $tilbage = tilbage($u);
    if ($tilbage === 0) {
        kør('UPDATE udsendelser SET faerdig = ? WHERE id = ? AND faerdig IS NULL', [time(), $u['id']]);
    }
    svar(['ok' => true, 'sendt' => $sendt, 'fejlet' => $fejlet, 'tilbage' => $tilbage]);

case 'slet_udsendelse':
    // Kun kladder, der aldrig er sendt til nogen — resten er historik
    kraev_egen_side();
    $id = tal('id');
    if ((int) vaerdi('SELECT COUNT(*) FROM udsendelse_modtagere WHERE udsendelse_id = ?', [$id])) {
        fejl('Den er allerede sendt til nogen og bliver stående i historikken.');
    }
    kør('DELETE FROM udsendelser WHERE id = ?', [$id]);
    svar(['ok' => true]);
}

/** Aktive i udsendelsens gruppe, som ikke har fået den endnu. */
function tilbage(array $u): int
{
    return (int) vaerdi('SELECT COUNT(*) FROM nyhedsbrev n WHERE ' . nyhedsbrev_aktive($u['maalgruppe']) . '
                         AND NOT EXISTS (SELECT 1 FROM udsendelse_modtagere m WHERE m.udsendelse_id = ? AND m.nyhedsbrev_id = n.id)',
                        [$u['id']]);
}

/** Emne, tekst og målgruppe fra formularen i /admin — tjekket. */
function udkast(): array
{
    $emne = felt('emne', 150);
    $tekst = input()['tekst'] ?? '';
    $tekst = is_string($tekst) ? trim(str_replace("\r\n", "\n", $tekst)) : '';
    $tekst = preg_replace('/[\x00-\x08\x0B-\x1F\x7F]/u', '', $tekst) ?? '';
    $gruppe = felt('maalgruppe', 20);
    if ($emne === '') {
        fejl('Skriv et emne.');
    }
    if ($tekst === '') {
        fejl('Skriv noget i mailen.');
    }
    if (laengde($tekst) > 20000) {
        fejl('Mailen er for lang — hold den under 20.000 tegn.');
    }
    if (!isset(NYHEDSBREV_MAALGRUPPER[$gruppe])) {
        fejl('Vælg, hvem den skal sendes til.');
    }
    return ['emne' => $emne, 'tekst' => $tekst, 'maalgruppe' => $gruppe,
            'hilsen' => empty(input()['hilsen']) ? 0 : 1,
            'kampagne' => 'nyhedsbrev-' . date('Y-m-d')];
}

fejl('Ukendt handling.', 404);
