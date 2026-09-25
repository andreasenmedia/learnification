<?php
/**
 * Overblikket for Learnification selv: alle testkonti og deres spilletid.
 *
 *   GET  ?handling=status       findes der en administrator? (til opsætning)
 *   POST opsaet                 opret den første administrator
 *   GET  ?handling=overblik     tal, konti og spilletid pr. dag
 *   GET  ?handling=konto&id=    én konto med klasser og elever
 *   POST saet_status            godkend / spær / åbn igen
 *   GET  ?handling=eksport      alle konti som CSV til Excel
 *
 * DEN FØRSTE ADMINISTRATOR. Første gang /admin bliver åbnet, skriver
 * serveren en tilfældig nøgle i opsaetningsnoegle.txt i datamappen
 * (learnification-data/ over public_html, eller public_html/data/). Den
 * hentes med File Manager eller FTP og skrives ind på siden. Så kan kun
 * den, der har adgang til webhotellet, blive administrator. Når der er
 * oprettet en, bliver filen slettet, og opsætningen lukker.
 */

declare(strict_types=1);
require __DIR__ . '/_kerne.php';

function noeglefil(): string
{
    return datamappe() . '/opsaetningsnoegle.txt';
}

function har_admin(): bool
{
    return (bool) vaerdi("SELECT 1 FROM konti WHERE type = 'admin'");
}

$h = handling();

if ($h === 'status') {
    $har = har_admin();
    if (!$har && !is_file(noeglefil())) {
        @file_put_contents(noeglefil(), strtoupper(bin2hex(random_bytes(6))) . "\n", LOCK_EX);
        @chmod(noeglefil(), 0640);
    }
    $mappe = datamappe();
    $rod = dirname(__DIR__);
    svar(['ok' => true, 'har_admin' => $har,
          'mappe' => strpos($mappe, $rod) === 0 ? 'public_html/data' : 'learnification-data (ved siden af public_html)']);
}

if ($h === 'opsaet') {
    kraev_egen_side();
    bremse('opsaet', ip(), 10, 3600);
    if (har_admin()) {
        fejl('Der er allerede en administrator.', 409);
    }
    $rigtig = trim((string) @file_get_contents(noeglefil()));
    $givet = strtoupper(trim(felt('noegle', 40)));
    if ($rigtig === '' || !hash_equals($rigtig, $givet)) {
        fejl('Nøglen passer ikke. Den står i opsaetningsnoegle.txt i datamappen.', 403);
    }
    $navn = felt('navn', 120);
    $email = lille(felt('email', 190));
    $kodeord = (string) (input()['kodeord'] ?? '');
    if (laengde($navn) < 2 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        fejl('Skriv navn og en rigtig mailadresse.');
    }
    if (strlen($kodeord) < 10) {
        fejl('Administratorens kodeord skal være mindst 10 tegn.');
    }
    if (vaerdi('SELECT 1 FROM konti WHERE email = ?', [$email])) {
        fejl('Mailadressen bruges allerede af en testkonto. Vælg en anden.', 409);
    }
    kør("INSERT INTO konti (type, navn, kontakt, bynavn, email, kodeord, status, oprettet)
         VALUES ('admin', ?, ?, '', ?, ?, 'godkendt', ?)",
        [$navn, $navn, $email, password_hash($kodeord, PASSWORD_DEFAULT), time()]);
    @unlink(noeglefil());
    log_ind((int) db()->lastInsertId(), null, VOKSEN_LEVETID);
    svar(['ok' => true]);
}

kraev_admin();

/** Én linje pr. konto med tal på. Administratorer er ikke testbrugere. */
function konti_med_tal(): array
{
    $tid = [];
    $uge = time() - 7 * 86400;
    foreach (alle("SELECT konto_id, SUM(sekunder) AS i_alt,
                          SUM(CASE WHEN start > $uge THEN sekunder ELSE 0 END) AS uge,
                          COUNT(*) AS gange, MAX(sidst) AS sidst
                   FROM sessioner WHERE sekunder > 0 GROUP BY konto_id") as $r) {
        $tid[(int) $r['konto_id']] = $r;
    }
    $spil = [];
    foreach (alle('SELECT konto_id, spil, SUM(sekunder) AS s FROM sessioner GROUP BY konto_id, spil') as $r) {
        $spil[(int) $r['konto_id']][$r['spil']] = (int) $r['s'];
    }
    $elever = [];
    foreach (alle('SELECT g.konto_id, COUNT(e.id) AS n, COUNT(DISTINCT g.id) AS g
                   FROM grupper g LEFT JOIN elever e ON e.gruppe_id = g.id GROUP BY g.konto_id') as $r) {
        $elever[(int) $r['konto_id']] = $r;
    }
    $aktive = [];
    foreach (alle('SELECT konto_id, COUNT(DISTINCT elev_id) AS n FROM sessioner
                   WHERE elev_id IS NOT NULL AND sekunder > 0 GROUP BY konto_id') as $r) {
        $aktive[(int) $r['konto_id']] = (int) $r['n'];
    }

    $ud = [];
    foreach (alle("SELECT * FROM konti WHERE type != 'admin' ORDER BY oprettet DESC") as $k) {
        $id = (int) $k['id'];
        $t = $tid[$id] ?? null;
        $ud[] = [
            'id' => $id, 'type' => $k['type'], 'navn' => $k['navn'], 'kontakt' => $k['kontakt'],
            'bynavn' => $k['bynavn'], 'email' => $k['email'], 'status' => $k['status'],
            'oprettet' => (int) $k['oprettet'],
            'sidst_inde' => $k['sidst_inde'] !== null ? (int) $k['sidst_inde'] : null,
            'grupper' => (int) ($elever[$id]['g'] ?? 0),
            'elever' => (int) ($elever[$id]['n'] ?? 0),
            'elever_spillet' => $aktive[$id] ?? 0,
            'i_alt' => (int) ($t['i_alt'] ?? 0),
            'uge' => (int) ($t['uge'] ?? 0),
            'gange' => (int) ($t['gange'] ?? 0),
            'sidst_spillet' => $t ? (int) $t['sidst'] : null,
            'spil' => $spil[$id] ?? (object) [],
        ];
    }
    return $ud;
}

switch ($h) {

case 'overblik':
    $konti = konti_med_tal();
    $uge = time() - 7 * 86400;
    svar(['ok' => true,
          'konti' => $konti,
          'tal' => [
              'skoler' => count(array_filter($konti, fn($k) => $k['type'] === 'skole')),
              'familier' => count(array_filter($konti, fn($k) => $k['type'] === 'foraelder')),
              'nye' => count(array_filter($konti, fn($k) => $k['status'] === 'ny')),
              'elever' => array_sum(array_column($konti, 'elever')),
              'elever_spillet' => array_sum(array_column($konti, 'elever_spillet')),
              // Elever, der har spillet, plus voksne, der har prøvet selv
              'aktive_uge' => (int) vaerdi('SELECT COUNT(DISTINCT elev_id) FROM sessioner
                                            WHERE start > ? AND sekunder > 0 AND elev_id IS NOT NULL', [$uge])
                            + (int) vaerdi("SELECT COUNT(DISTINCT konto_id) FROM sessioner
                                            WHERE start > ? AND sekunder > 0 AND hvem = 'voksen'", [$uge]),
          ],
          'tid' => spilletid("konto_id IN (SELECT id FROM konti WHERE type != 'admin')", []),
          'dage' => pr_dag("konto_id IN (SELECT id FROM konti WHERE type != 'admin')", [], 30),
          'spil' => SPIL]);

case 'konto':
    $k = en('SELECT * FROM konti WHERE id = ?', [tal('id')]);
    if (!$k) {
        fejl('Kontoen findes ikke.', 404);
    }
    $grupper = [];
    foreach (alle('SELECT * FROM grupper WHERE konto_id = ? ORDER BY klassetrin, navn', [$k['id']]) as $g) {
        $elever = [];
        foreach (alle('SELECT * FROM elever WHERE gruppe_id = ? ORDER BY kaldenavn', [$g['id']]) as $e) {
            $elever[] = ['id' => (int) $e['id'], 'kaldenavn' => $e['kaldenavn'], 'ikon' => $e['ikon'],
                         'sidst_inde' => $e['sidst_inde'] !== null ? (int) $e['sidst_inde'] : null,
                         'tid' => spilletid('elev_id = ?', [$e['id']])];
        }
        $grupper[] = ['id' => (int) $g['id'], 'navn' => $g['navn'],
                      'klassetrin' => $g['klassetrin'] !== null ? (int) $g['klassetrin'] : null,
                      'elever' => $elever];
    }
    svar(['ok' => true,
          'konto' => ['id' => (int) $k['id'], 'type' => $k['type'], 'navn' => $k['navn'], 'kontakt' => $k['kontakt'],
                      'bynavn' => $k['bynavn'], 'email' => $k['email'], 'status' => $k['status'],
                      'oprettet' => (int) $k['oprettet'],
                      'sidst_inde' => $k['sidst_inde'] !== null ? (int) $k['sidst_inde'] : null],
          'grupper' => $grupper,
          'tid' => spilletid('konto_id = ?', [$k['id']]),
          'voksen_tid' => spilletid("konto_id = ? AND hvem = 'voksen'", [$k['id']]),
          'slettede_tid' => spilletid("konto_id = ? AND hvem = 'elev' AND elev_id IS NULL", [$k['id']]),
          'dage' => pr_dag('konto_id = ?', [$k['id']], 30),
          'spil' => SPIL]);

case 'saet_status':
    kraev_egen_side();
    $status = felt('status', 20);
    if (!in_array($status, ['ny', 'godkendt', 'spaerret'], true)) {
        fejl('Ukendt status.');
    }
    $n = kør("UPDATE konti SET status = ? WHERE id = ? AND type != 'admin'", [$status, tal('id')]);
    if (!$n && !vaerdi("SELECT 1 FROM konti WHERE id = ? AND type != 'admin'", [tal('id')])) {
        fejl('Kontoen findes ikke.', 404);
    }
    if ($status === 'spaerret') {
        kør('DELETE FROM logins WHERE konto_id = ?', [tal('id')]);
    }
    svar(['ok' => true]);

case 'eksport':
    $konti = konti_med_tal();
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="learnification-testkonti-' . date('Y-m-d') . '.csv"');
    header('Cache-Control: no-store');
    $ud = fopen('php://output', 'w');
    fwrite($ud, "\xEF\xBB\xBF");      // så Excel læser æ, ø og å rigtigt
    $kol = ['Type', 'Navn', 'Kontakt', 'By', 'Mail', 'Status', 'Oprettet', 'Sidst logget ind',
            'Klasser', 'Elever', 'Elever der har spillet', 'Minutter i alt', 'Minutter sidste 7 dage',
            'Gange spillet', 'Sidst spillet'];
    foreach (SPIL as $navn) {
        $kol[] = "Minutter $navn";
    }
    fputcsv($ud, $kol, ';');
    $dato = fn($t) => $t ? date('d-m-Y H:i', $t) : '';
    foreach ($konti as $k) {
        $r = [$k['type'] === 'skole' ? 'Skole' : 'Familie', $k['navn'], $k['kontakt'], $k['bynavn'], $k['email'],
              $k['status'], $dato($k['oprettet']), $dato($k['sidst_inde']), $k['grupper'], $k['elever'],
              $k['elever_spillet'], round($k['i_alt'] / 60), round($k['uge'] / 60), $k['gange'],
              $dato($k['sidst_spillet'])];
        foreach (array_keys(SPIL) as $s) {
            $r[] = round((((array) $k['spil'])[$s] ?? 0) / 60);
        }
        fputcsv($ud, array_map(fn($v) => is_string($v) && preg_match('/^[=+\-@]/', $v) ? "'" . $v : $v, $r), ';');
    }
    exit;
}

fejl('Ukendt handling.', 404);
