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
 *   GET  ?handling=besoeg&dage= besøgsstatistikken til /statistik
 *
 *   Velkomstmailen (_velkomst.php), fra /admin#velkomst:
 *   GET  ?handling=velkomst     hvem der har fået den, og hvor mange der mangler
 *   POST velkomst_vis {id?}     mailen som HTML for en konto
 *   POST velkomst_test {id?}    send den til administratoren selv
 *   POST velkomst_en {id}       send den til én konto (også igen)
 *   POST velkomst_send {gruppe, spring_over}  en bunke; kaldes igen til tilbage = 0
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

/** Et værtsnavn eller en ?ref=-kode som et navn, man kan læse. */
function kildenavn(string $k): string
{
    if ($k === '') {
        return 'Direkte eller ukendt';
    }
    $kendte = [
        'google' => 'Google', 'bing' => 'Bing', 'duckduckgo' => 'DuckDuckGo', 'ecosia' => 'Ecosia',
        'yahoo' => 'Yahoo', 'facebook' => 'Facebook', 'fb' => 'Facebook', 'instagram' => 'Instagram',
        'linkedin' => 'LinkedIn', 'lnkd' => 'LinkedIn', 't.co' => 'X / Twitter', 'twitter' => 'X / Twitter',
        'x.com' => 'X / Twitter', 'youtube' => 'YouTube', 'tiktok' => 'TikTok', 'reddit' => 'Reddit',
        'chatgpt' => 'ChatGPT', 'openai' => 'ChatGPT', 'perplexity' => 'Perplexity', 'claude.ai' => 'Claude',
        'gemini' => 'Gemini', 'copilot' => 'Copilot', 'aula' => 'Aula', 'mail.' => 'Webmail',
        'outlook' => 'Outlook', 'andreasenmedia' => 'Andreasen Media',
    ];
    foreach ($kendte as $noegle => $navn) {
        if (strpos($k, $noegle) !== false) {
            return $navn;
        }
    }
    return $k;
}

/** [[navn, antal], ...] sorteret, højst $n. */
function top(array $taelling, int $n = 12): array
{
    arsort($taelling);
    $ud = [];
    foreach (array_slice($taelling, 0, $n, true) as $k => $v) {
        $ud[] = [(string) $k, (int) $v];
    }
    return $ud;
}

switch ($h) {

case 'besoeg':
    $dage = in_array(tal('dage'), [1, 7, 30, 90, 365], true) ? tal('dage') : 30;
    $fra = strtotime('today') - ($dage - 1) * 86400;

    // Alle sidevisninger i perioden, sorteret, så de kan lægges i besøg.
    // Et besøg er én besøgskode på én dag — koden skifter hver nat.
    $besoeg = [];
    $sider = $sidebesoeg = $kilder = $ind = $ud = $veje = [];
    $pr_dag = [];
    for ($i = 0; $i < $dage; $i++) {
        $pr_dag[date('Y-m-d', $fra + $i * 86400 + 7200)] = ['b' => [], 'v' => 0];
    }
    $visninger = 0;
    $s = db()->prepare('SELECT dag, besoeger, side, fra, kilde, mobil, kampagne, bid FROM besoeg WHERE tid >= ? ORDER BY id');
    $s->execute([$fra]);
    while ($r = $s->fetch()) {
        $noegle = $r['dag'] . $r['besoeger'];
        $visninger++;
        if (!isset($besoeg[$noegle])) {
            $besoeg[$noegle] = ['ind' => $r['side'], 'kilde' => $r['kilde'], 'mobil' => (int) $r['mobil'],
                                'sider' => 0, 'sidst' => '', 'spil' => false,
                                'kampagne' => $r['kampagne'], 'bid' => $r['bid']];
        }
        $b = &$besoeg[$noegle];
        $b['sider']++;
        // Kom de ind direkte og senere via et link, er det linket, der tæller
        if ($b['kilde'] === '' && $r['kilde'] !== '') {
            $b['kilde'] = $r['kilde'];
        }
        if ($b['kampagne'] === '' && $r['kampagne'] !== '') {
            $b['kampagne'] = $r['kampagne'];
        }
        if ($b['bid'] === '' && $r['bid'] !== '') {
            $b['bid'] = $r['bid'];
        }
        if ($b['sidst'] !== '' && $b['sidst'] !== $r['side']) {
            $vej = $b['sidst'] . ' → ' . $r['side'];
            $veje[$vej] = ($veje[$vej] ?? 0) + 1;
        }
        $b['sidst'] = $r['side'];
        if (strpos($r['side'], '/spil/') === 0) {
            $b['spil'] = true;
        }
        unset($b);
        $sider[$r['side']] = ($sider[$r['side']] ?? 0) + 1;
        $sidebesoeg[$r['side']][$noegle] = true;
        if (isset($pr_dag[$r['dag']])) {
            $pr_dag[$r['dag']]['b'][$r['besoeger']] = true;
            $pr_dag[$r['dag']]['v']++;
        }
    }

    $mobil = $spil = $en_side = 0;
    foreach ($besoeg as $b) {
        $k = kildenavn($b['kilde']);
        $kilder[$k] = ($kilder[$k] ?? 0) + 1;
        $ind[$b['ind']] = ($ind[$b['ind']] ?? 0) + 1;
        $ud[$b['sidst']] = ($ud[$b['sidst']] ?? 0) + 1;
        $mobil += $b['mobil'];
        $spil += $b['spil'] ? 1 : 0;
        $en_side += $b['sider'] === 1 ? 1 : 0;
    }
    $antal = count($besoeg);
    $side_liste = [];
    foreach (top($sider, 40) as [$side, $v]) {
        $side_liste[] = [$side, $v, count($sidebesoeg[$side])];
    }

    // --- konverteringer ---------------------------------------------------
    // Et mål bliver givet til den kilde, besøget kom fra. Har den besøgende
    // sagt ja til statistik (bid), er det den FØRSTE kilde, vi nogensinde
    // har set for id'et — så tæller en annonce i mandags, selv om
    // tilmeldingen først kom torsdag, direkte.
    $foerste_kilde = $foerste_kampagne = [];
    $bids = array_values(array_unique(array_filter(array_column($besoeg, 'bid'))));
    $mrows = alle('SELECT dag, besoeger, bid, navn FROM maal WHERE tid >= ?', [$fra]);
    foreach ($mrows as $m) {
        if ($m['bid'] !== '') {
            $bids[] = $m['bid'];
        }
    }
    $bids = array_values(array_unique($bids));
    foreach (array_chunk($bids, 400) as $del) {
        $pl = implode(',', array_fill(0, count($del), '?'));
        foreach (alle("SELECT bid, kilde, kampagne FROM besoeg WHERE bid IN ($pl) ORDER BY id", $del) as $r) {
            if (!isset($foerste_kilde[$r['bid']]) && $r['kilde'] !== '') {
                $foerste_kilde[$r['bid']] = $r['kilde'];
            }
            if (!isset($foerste_kampagne[$r['bid']]) && $r['kampagne'] !== '') {
                $foerste_kampagne[$r['bid']] = $r['kampagne'];
            }
        }
    }
    $maal_tal = $maal_kilde = $maal_kampagne = [];
    foreach ($mrows as $m) {
        $v = $besoeg[$m['dag'] . $m['besoeger']] ?? null;
        $k = $m['bid'] !== '' && isset($foerste_kilde[$m['bid']]) ? $foerste_kilde[$m['bid']] : ($v['kilde'] ?? '');
        $kamp = $m['bid'] !== '' && isset($foerste_kampagne[$m['bid']]) ? $foerste_kampagne[$m['bid']] : ($v['kampagne'] ?? '');
        $maal_tal[$m['navn']] = ($maal_tal[$m['navn']] ?? 0) + 1;
        $kn = kildenavn($k);
        $maal_kilde[$kn][$m['navn']] = ($maal_kilde[$kn][$m['navn']] ?? 0) + 1;
        if ($kamp !== '') {
            $maal_kampagne[$kamp][$m['navn']] = ($maal_kampagne[$kamp][$m['navn']] ?? 0) + 1;
        }
    }
    // Kilder og kampagner med besøg, mål og konverteringsrate
    $kilde_besoeg = $kampagne_besoeg = [];
    foreach ($besoeg as $b) {
        $kn = kildenavn($b['kilde']);
        $kilde_besoeg[$kn] = ($kilde_besoeg[$kn] ?? 0) + 1;
        if ($b['kampagne'] !== '') {
            $kampagne_besoeg[$b['kampagne']] = ($kampagne_besoeg[$b['kampagne']] ?? 0) + 1;
        }
    }
    $konv = function (array $besoeg_pr, array $maal_pr): array {
        $ud = [];
        foreach (array_unique(array_merge(array_keys($besoeg_pr), array_keys($maal_pr))) as $k) {
            $ud[] = ['navn' => (string) $k, 'besoeg' => $besoeg_pr[$k] ?? 0, 'maal' => $maal_pr[$k] ?? (object) []];
        }
        usort($ud, fn($a, $b) => (array_sum((array) $b['maal']) <=> array_sum((array) $a['maal'])) ?: ($b['besoeg'] <=> $a['besoeg']));
        return array_slice($ud, 0, 20);
    };

    // --- samtykke og tilbagevendende ---------------------------------------
    $samtykke = ['i_alt' => 0, 'tillad_alle' => 0, 'afvis_alle' => 0, 'valgt' => 0, 'statistik' => 0, 'markedsfoering' => 0];
    foreach (alle('SELECT valg, statistik, markedsfoering FROM samtykker WHERE tid >= ?', [$fra]) as $r) {
        $samtykke['i_alt']++;
        $samtykke[$r['valg']]++;
        $samtykke['statistik'] += (int) $r['statistik'];
        $samtykke['markedsfoering'] += (int) $r['markedsfoering'];
    }
    $med_id = array_values(array_unique(array_filter(array_column($besoeg, 'bid'))));
    $tilbage = 0;
    foreach (array_chunk($med_id, 400) as $del) {
        $pl = implode(',', array_fill(0, count($del), '?'));
        $tilbage += (int) vaerdi("SELECT COUNT(*) FROM (SELECT bid FROM besoeg WHERE bid IN ($pl)
                                  GROUP BY bid HAVING COUNT(DISTINCT dag) > 1) x", $del);
    }

    svar(['ok' => true, 'dage' => $dage,
          'maal' => top($maal_tal, 10),
          'maal_kilder' => $konv($kilde_besoeg, $maal_kilde),
          'maal_kampagner' => $konv($kampagne_besoeg, $maal_kampagne),
          'samtykke' => $samtykke,
          'genkendte' => ['med_id' => count($med_id), 'tilbage' => $tilbage],
          'tal' => ['besoeg' => $antal, 'visninger' => $visninger,
                    'sider_pr_besoeg' => $antal ? round($visninger / $antal, 1) : 0,
                    'mobil' => $antal ? round($mobil / $antal * 100) : 0,
                    'spil' => $antal ? round($spil / $antal * 100) : 0,
                    'en_side' => $antal ? round($en_side / $antal * 100) : 0],
          'pr_dag' => array_map(fn($x) => count($x['b']), $pr_dag),
          'visninger_pr_dag' => array_map(fn($x) => $x['v'], $pr_dag),
          'kilder' => top($kilder), 'ind' => top($ind), 'ud' => top($ud),
          'sider' => $side_liste, 'veje' => top($veje, 20)]);


case 'overblik':
    $konti = konti_med_tal();
    $uge = time() - 7 * 86400;
    // Gemte spil pr. spil: hvor mange, og hvor mange der er gennemført
    $gemte = [];
    foreach (array_keys(SPIL) as $s) {
        $gemte[$s] = ['i_alt' => 0, 'faerdige' => 0];
    }
    foreach (alle("SELECT g.spil, g.data, g.opdateret FROM gemte_spil g JOIN konti k ON k.id = g.konto_id
                   WHERE k.type != 'admin'") as $g) {
        $st = isset($gemte[$g['spil']]) ? gemt_status($g['spil'], $g['data'], (int) $g['opdateret']) : null;
        if ($st) {
            $gemte[$g['spil']]['i_alt']++;
            $gemte[$g['spil']]['faerdige'] += $st['faerdig'] ? 1 : 0;
        }
    }
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
          'gemte' => $gemte,
          'spil' => SPIL]);

case 'konto':
    $k = en('SELECT * FROM konti WHERE id = ?', [tal('id')]);
    if (!$k) {
        fejl('Kontoen findes ikke.', 404);
    }
    [$gemt, $voksen_gemt] = gemte_spil_paa_konto((int) $k['id']);
    $grupper = [];
    foreach (alle('SELECT * FROM grupper WHERE konto_id = ? ORDER BY klassetrin, navn', [$k['id']]) as $g) {
        $elever = [];
        foreach (alle('SELECT * FROM elever WHERE gruppe_id = ? ORDER BY kaldenavn', [$g['id']]) as $e) {
            $elever[] = ['id' => (int) $e['id'], 'kaldenavn' => $e['kaldenavn'], 'ikon' => $e['ikon'],
                         'sidst_inde' => $e['sidst_inde'] !== null ? (int) $e['sidst_inde'] : null,
                         'tid' => spilletid('elev_id = ?', [$e['id']]),
                         'gemt' => $gemt[(int) $e['id']] ?? (object) []];
        }
        $grupper[] = ['id' => (int) $g['id'], 'navn' => $g['navn'],
                      'klassetrin' => $g['klassetrin'] !== null ? (int) $g['klassetrin'] : null,
                      'elever' => $elever];
    }
    svar(['ok' => true,
          'konto' => ['id' => (int) $k['id'], 'type' => $k['type'], 'navn' => $k['navn'], 'kontakt' => $k['kontakt'],
                      'bynavn' => $k['bynavn'], 'email' => $k['email'], 'status' => $k['status'],
                      'oprettet' => (int) $k['oprettet'],
                      'sidst_inde' => $k['sidst_inde'] !== null ? (int) $k['sidst_inde'] : null,
                      'velkomst_sendt' => $k['velkomst_sendt'] !== null ? (int) $k['velkomst_sendt'] : null],
          'grupper' => $grupper,
          'tid' => spilletid('konto_id = ?', [$k['id']]),
          'voksen_tid' => spilletid("konto_id = ? AND hvem = 'voksen'", [$k['id']]),
          'voksen_gemt' => $voksen_gemt,
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

// ---- velkomstmailen (se _velkomst.php) ----

case 'velkomst':
    require_once __DIR__ . '/_velkomst.php';
    $grupper = [];
    foreach (VELKOMST_GRUPPER as $g => $navn) {
        $grupper[$g] = ['navn' => $navn, 'antal' => (int) vaerdi('SELECT COUNT(*) FROM konti k WHERE ' . velkomst_hvor($g))];
    }
    $konti = [];
    foreach (alle("SELECT k.id, k.type, k.navn, k.email, k.status, k.oprettet, k.velkomst_sendt,
                          EXISTS (SELECT 1 FROM sessioner s WHERE s.konto_id = k.id AND s.sekunder > 0) AS spillet
                   FROM konti k WHERE k.type != 'admin' ORDER BY k.oprettet DESC") as $k) {
        $konti[] = ['id' => (int) $k['id'], 'type' => $k['type'], 'navn' => $k['navn'], 'email' => $k['email'],
                    'status' => $k['status'], 'oprettet' => (int) $k['oprettet'], 'spillet' => (bool) $k['spillet'],
                    'velkomst_sendt' => $k['velkomst_sendt'] !== null ? (int) $k['velkomst_sendt'] : null];
    }
    svar(['ok' => true, 'grupper' => $grupper, 'konti' => $konti,
          'mig' => kraev_admin()['email'], 'smtp' => smtp_opsaetning() !== null]);

case 'velkomst_vis':
case 'velkomst_test':
    // Vist eller sendt til administratoren selv — som den ser ud for en
    // bestemt konto, eller for en ny familie, hvis der ikke er valgt nogen
    kraev_egen_side();
    require_once __DIR__ . '/_velkomst.php';
    $mig = kraev_admin();
    $k = tal('id') ? en("SELECT * FROM konti WHERE id = ? AND type != 'admin'", [tal('id')]) : null;
    $k = $k ?: ['id' => 0, 'type' => 'foraelder', 'navn' => $mig['navn'], 'kontakt' => $mig['navn'], 'email' => $mig['email']];
    [$tekst, $html, $headere] = velkomst_mail($k);
    if ($h === 'velkomst_vis') {
        svar(['ok' => true, 'html' => $html, 'til' => $k['email']]);
    }
    bremse('velkomst-test', (string) $mig['id'], 20, 3600);
    if (!send_mail($mig['email'], '[TEST] ' . VELKOMST_EMNE, $tekst, $html, $headere)) {
        fejl('Mailen blev ikke sendt: ' . (post_fejl() ?: 'ukendt fejl'), 502);
    }
    svar(['ok' => true, 'til' => $mig['email']]);

case 'velkomst_en':
    // Én konto, også hvis den har fået den før (fx efter en fejl)
    kraev_egen_side();
    require_once __DIR__ . '/_velkomst.php';
    $k = en("SELECT * FROM konti WHERE id = ? AND type != 'admin'", [tal('id')]);
    if (!$k) {
        fejl('Kontoen findes ikke.', 404);
    }
    if ($k['status'] === 'spaerret') {
        fejl('Kontoen er spærret.');
    }
    if (!velkomst_send($k)) {
        fejl('Mailen blev ikke sendt: ' . (post_fejl() ?: 'ukendt fejl'), 502);
    }
    svar(['ok' => true]);

case 'velkomst_send':
    // En bunke ad gangen, som nyhedsbrevet. "velkomst_sendt" bliver sat,
    // før mailen går, så to faner ikke sender den samme. Fejler den, bliver
    // den sat tilbage — og siden sender id'et med i spring_over, så den
    // ikke bliver prøvet igen og igen i samme runde.
    kraev_egen_side();
    require_once __DIR__ . '/_velkomst.php';
    $gruppe = felt('gruppe', 20);
    if (!isset(VELKOMST_GRUPPER[$gruppe])) {
        fejl('Vælg, hvem den skal sendes til.');
    }
    $spring = array_slice(array_values(array_filter(array_map('intval', (array) (input()['spring_over'] ?? [])))), 0, 1000);
    $ikke = $spring ? ' AND k.id NOT IN (' . implode(',', $spring) . ')' : '';
    @set_time_limit(60);
    $sendt = $fejlet = 0;
    $nye_fejl = [];
    $sidste_fejl = '';
    $stop = microtime(true) + 20;
    foreach (alle('SELECT * FROM konti k WHERE ' . velkomst_hvor($gruppe) . $ikke . ' ORDER BY k.id LIMIT 25') as $k) {
        if (!kør('UPDATE konti SET velkomst_sendt = ? WHERE id = ? AND velkomst_sendt IS NULL', [time(), $k['id']])) {
            continue;
        }
        if (velkomst_send($k)) {
            $sendt++;
        } else {
            kør('UPDATE konti SET velkomst_sendt = NULL WHERE id = ?', [$k['id']]);
            $fejlet++;
            $nye_fejl[] = (int) $k['id'];
            $sidste_fejl = post_fejl();
        }
        if (microtime(true) > $stop) {
            break;
        }
    }
    $spring = array_merge($spring, $nye_fejl);
    $tilbage = (int) vaerdi('SELECT COUNT(*) FROM konti k WHERE ' . velkomst_hvor($gruppe)
                            . ($spring ? ' AND k.id NOT IN (' . implode(',', $spring) . ')' : ''));
    svar(['ok' => true, 'sendt' => $sendt, 'fejlet' => $fejlet, 'fejl' => $sidste_fejl,
          'spring_over' => $spring, 'tilbage' => $tilbage]);

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
