<?php
/**
 * Overblikket for Learnification selv: alle testkonti og deres spilletid.
 *
 *   GET  ?handling=status       findes der en administrator? (til opsætning)
 *   POST opsaet                 opret den første administrator
 *   GET  ?handling=overblik     tal, konti og spilletid pr. dag
 *   GET  ?handling=konto&id=    én konto med klasser og elever
 *   POST saet_status            godkend / spær / åbn igen
 *   POST ny_konto               opret en konto (med kodeord, eller send et link, så de selv vælger)
 *   POST ret_konto {id}         ret type, navn, mail, by og status
 *   POST kodeord {id, kodeord?} sæt et nyt kodeord — eller send et link til at vælge et
 *   POST slet_konto {id, email} slet kontoen og alt, der hører til
 *   Børnene og klasserne på en konto rettes gennem api/klasse.php med "konto": <id>.
 *   GET  ?handling=eksport      alle konti som CSV til Excel
 *   GET  ?handling=besoeg&dage= besøgsstatistikken til /statistik
 *
 *   Velkomstmailen (_velkomst.php), fra /admin#velkomst:
 *   GET  ?handling=velkomst     hvem der har fået den, og hvor mange der mangler
 *   POST velkomst_vis {id?}     mailen som HTML for en konto
 *   POST velkomst_test {id?}    send den til administratoren selv
 *   POST velkomst_en {id}       send den til én konto (også igen)
 *   POST velkomst_send {gruppe, spring_over}  en bunke; kaldes igen til tilbage = 0
 *   POST paamind_vis / paamind_test {id?}  påmindelsen (api/paamind.php kører den selv)
 *   POST paamind_koer           send påmindelserne, der er klar, nu
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

    // Det barn på kontoen, der har brugt mest af prøvetiden
    $mest = [];
    foreach (alle('SELECT konto_id, MAX(s) AS s FROM (SELECT konto_id, elev_id, SUM(sekunder) AS s FROM sessioner
                   WHERE elev_id IS NOT NULL GROUP BY konto_id, elev_id) x GROUP BY konto_id') as $r) {
        $mest[(int) $r['konto_id']] = (int) $r['s'];
    }
    // Den voksnes egen tid (det, prøvetiden måles på for "til mig selv")
    $voksen = [];
    foreach (alle("SELECT konto_id, SUM(sekunder) AS s FROM sessioner
                   WHERE elev_id IS NULL AND hvem = 'voksen' GROUP BY konto_id") as $r) {
        $voksen[(int) $r['konto_id']] = (int) $r['s'];
    }

    $ud = [];
    foreach (alle("SELECT * FROM konti WHERE type != 'admin' ORDER BY oprettet DESC") as $k) {
        $id = (int) $k['id'];
        $t = $tid[$id] ?? null;
        $ud[] = [
            'maks_barn_sek' => $mest[$id] ?? 0,
            'voksen_sek' => $voksen[$id] ?? 0,
            // Prøvetiden for kontoen: den voksne selv på "til mig selv", ellers det barn, der har brugt mest
            'proeve_sek' => $k['type'] === 'privat' ? ($voksen[$id] ?? 0) : max($mest[$id] ?? 0, $voksen[$id] ?? 0),
            'graense_sek' => !empty($k['fri_adgang']) ? null : (tidsgraense_min() + (int) $k['ekstra_min']) * 60,
            'ekstra_min' => (int) $k['ekstra_min'], 'fri_adgang' => (int) $k['fri_adgang'],
            'skema_sendt' => $k['skema_sendt'] !== null ? (int) $k['skema_sendt'] : null,
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

/**
 * Spillertragten: hvor langt er konti nået? Hvert trin tæller konti (ikke
 * spillere), og prøvetiden er kontoens proeve_sek (se konti_med_tal()).
 */
function tragt(array $konti): array
{
    $besvaret = [];
    foreach (alle('SELECT DISTINCT konto_id FROM spoergeskemaer WHERE besvaret IS NOT NULL') as $r) {
        $besvaret[(int) $r['konto_id']] = true;
    }
    $n = ['oprettet' => 0, 'spillet' => 0, 'halvdelen' => 0, 'hele' => 0, 'skema' => 0, 'besvaret' => 0];
    foreach ($konti as $k) {
        $n['oprettet']++;
        $n['spillet'] += $k['i_alt'] > 0 ? 1 : 0;
        $g = $k['graense_sek'];
        $n['halvdelen'] += $g !== null && $k['proeve_sek'] >= $g / 2 ? 1 : 0;
        $n['hele'] += $g !== null && $k['proeve_sek'] >= $g ? 1 : 0;
        $n['skema'] += $k['skema_sendt'] !== null ? 1 : 0;
        $n['besvaret'] += isset($besvaret[$k['id']]) ? 1 : 0;
    }
    return $n;
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
              'private' => count(array_filter($konti, fn($k) => $k['type'] === 'privat')),
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
          'dage_spil' => pr_dag_spil("konto_id IN (SELECT id FROM konti WHERE type != 'admin')", [], 30),
          'tragt' => tragt($konti),
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
                         'kode' => $e['kode'],
                         'sidst_inde' => $e['sidst_inde'] !== null ? (int) $e['sidst_inde'] : null,
                         'tid' => spilletid('elev_id = ?', [$e['id']]),
                         'proeve' => tid_status(['konto' => $k, 'elev' => ['id' => $e['id']]]),
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
                      'velkomst_sendt' => $k['velkomst_sendt'] !== null ? (int) $k['velkomst_sendt'] : null,
                      'ekstra_min' => (int) $k['ekstra_min'], 'fri_adgang' => (int) $k['fri_adgang'],
                      'graense_min' => tidsgraense_min()],
          'skemaer' => alle('SELECT id, aarsag, spil, elev_id, sendt, aabnet, besvaret FROM spoergeskemaer
                             WHERE konto_id = ? ORDER BY id DESC', [$k['id']]),
          'grupper' => $grupper,
          'tid' => spilletid('konto_id = ?', [$k['id']]),
          'voksen_tid' => spilletid("konto_id = ? AND hvem = 'voksen'", [$k['id']]),
          'voksen_gemt' => $voksen_gemt,
          'voksen_proeve' => tid_status(['konto' => $k, 'elev' => null]),
          'slettede_tid' => spilletid("konto_id = ? AND hvem = 'elev' AND elev_id IS NULL", [$k['id']]),
          'dage' => pr_dag('konto_id = ?', [$k['id']], 30),
          'dage_spil' => pr_dag_spil('konto_id = ?', [$k['id']], 30),
          'spil' => SPIL]);

// Kontoens omgange til tidslinjen: hvornår der blev spillet, af hvem, og hvor
// meget af tiden der blev talt med (tomgang tæller ikke).
case 'omgange':
    $k = en('SELECT id FROM konti WHERE id = ?', [tal('id')]);
    if (!$k) {
        fejl('Kontoen findes ikke.', 404);
    }
    $dage = min(30, max(1, tal('dage') ?: 30));
    $fra = strtotime('today') - ($dage - 1) * 86400;
    $omgange = [];
    foreach (alle('SELECT s.id, s.spil, s.hvem, s.elev_id, s.start, s.sidst, s.sekunder, e.kaldenavn, e.ikon
                   FROM sessioner s LEFT JOIN elever e ON e.id = s.elev_id
                   WHERE s.konto_id = ? AND s.sidst >= ? AND s.sekunder > 0 ORDER BY s.start', [$k['id'], $fra]) as $o) {
        $omgange[] = ['id' => (int) $o['id'], 'spil' => $o['spil'], 'hvem' => $o['hvem'],
                      'elev_id' => $o['elev_id'] !== null ? (int) $o['elev_id'] : null,
                      'navn' => $o['kaldenavn'] ?? ($o['hvem'] === 'voksen' ? 'Den voksne' : 'Slettet elev'),
                      'ikon' => $o['ikon'] ?? '',
                      'start' => (int) $o['start'], 'sidst' => (int) $o['sidst'], 'sekunder' => (int) $o['sekunder']];
    }
    svar(['ok' => true, 'omgange' => $omgange, 'spil' => SPIL]);

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

// ---- opret og ret konti ---------------------------------------------------

case 'ny_konto':
    kraev_egen_side();
    $f = tjek_kontofelter(['type' => felt('type', 20), 'navn' => felt('navn', 120), 'kontakt' => felt('kontakt', 120),
                           'bynavn' => felt('bynavn', 80), 'email' => felt('email', 190)]);
    $kodeord = (string) (input()['kodeord'] ?? '');
    // Som på /opret: kontoen er til en, der er fyldt 15 år (yngre er børn med kode)
    if (empty(input()['alder'])) {
        fejl('Sæt flueben ved, at personen er fyldt 15 år.');
    }
    if ($kodeord !== '' && (strlen($kodeord) < 8 || strlen($kodeord) > 200)) {
        fejl('Kodeordet skal være mindst 8 tegn — eller lad feltet stå tomt, så vælger de selv.');
    }
    // Uden kodeord får kontoen et tilfældigt, ingen kender, og et link til at vælge sit eget
    $id = opret_konto($f, password_hash($kodeord !== '' ? $kodeord : bin2hex(random_bytes(24)), PASSWORD_DEFAULT),
                      'godkendt', $f['type'] === 'foraelder' ? (string) (input()['boern'] ?? '') : '');
    $k = en('SELECT * FROM konti WHERE id = ?', [$id]);
    $mail = null;
    if ($kodeord === '') {
        $mail = send_mail($k['email'], 'Din konto på Learnification',
            "Hej {$k['kontakt']}\n\n"
            . "Der er oprettet en konto til dig på Learnification, hvor man kan prøve vores danske læringsspil.\n\n"
            . "Klik her for at vælge dit kodeord — linket virker i 7 dage:\n\n"
            . nulstil_link($id, 7 * 86400) . "\n\n"
            . 'Bagefter logger du ind på ' . adresse() . "/login med {$k['email']}.\n"
            . "Er linket udløbet, så tryk på \"Glemt kodeord\" på login-siden.\n\n"
            . "Venlig hilsen\nLearnification\n", null, ['Reply-To' => MODTAGER]);
    } elseif (!empty(input()['velkomst'])) {
        require_once __DIR__ . '/_velkomst.php';
        $mail = velkomst_send($k);
    }
    svar(['ok' => true, 'id' => $id, 'mail' => $mail, 'fejl' => $mail === false ? post_fejl() : '']);

case 'ret_konto':
    kraev_egen_side();
    $k = en("SELECT * FROM konti WHERE id = ? AND type != 'admin'", [tal('id')]);
    if (!$k) {
        fejl('Kontoen findes ikke.', 404);
    }
    $f = tjek_kontofelter(['type' => felt('type', 20), 'navn' => felt('navn', 120), 'kontakt' => felt('kontakt', 120),
                           'bynavn' => felt('bynavn', 80), 'email' => felt('email', 190)], (int) $k['id']);
    $status = felt('status', 20);
    if (!in_array($status, ['ny', 'godkendt', 'spaerret'], true)) {
        fejl('Ukendt status.');
    }
    $boern = (int) vaerdi('SELECT COUNT(*) FROM elever e JOIN grupper g ON g.id = e.gruppe_id WHERE g.konto_id = ?', [$k['id']]);
    // Som når en konto oprettes: skiftes typen, skal det bekræftes, at personen er fyldt 15 år
    if ($f['type'] !== $k['type'] && empty(input()['alder'])) {
        fejl('Sæt flueben ved, at personen er fyldt 15 år, når typen skiftes.');
    }
    if ($f['type'] === 'privat' && $boern) {
        fejl('Der er ' . $boern . ' ' . ($boern === 1 ? 'barn' : 'børn') . ' på kontoen. Slet dem først, eller vælg Familie.');
    }
    db()->beginTransaction();
    kør('UPDATE konti SET type = ?, navn = ?, kontakt = ?, bynavn = ?, email = ?, status = ? WHERE id = ?',
        [$f['type'], $f['navn'], $f['kontakt'], $f['bynavn'], $f['email'], $status, $k['id']]);
    // En familie skal have sin gruppe, så der er et sted at sætte børnene
    if ($f['type'] === 'foraelder' && !vaerdi('SELECT 1 FROM grupper WHERE konto_id = ?', [$k['id']])) {
        kør('INSERT INTO grupper (konto_id, navn, klassetrin, kode, oprettet) VALUES (?, ?, NULL, ?, ?)',
            [$k['id'], 'Familien', ny_kode(), time()]);
    }
    // En tom "Familien" giver ingen mening på en konto til én voksen
    if ($f['type'] === 'privat') {
        kør('DELETE FROM grupper WHERE konto_id = ?', [$k['id']]);
    }
    db()->commit();
    if ($status === 'spaerret') {
        kør('DELETE FROM logins WHERE konto_id = ?', [$k['id']]);
    }
    svar(['ok' => true]);

case 'kodeord':
    kraev_egen_side();
    $k = en("SELECT * FROM konti WHERE id = ? AND type != 'admin'", [tal('id')]);
    if (!$k) {
        fejl('Kontoen findes ikke.', 404);
    }
    $kodeord = (string) (input()['kodeord'] ?? '');
    if ($kodeord !== '') {
        if (strlen($kodeord) < 8 || strlen($kodeord) > 200) {
            fejl('Kodeordet skal være mindst 8 tegn.');
        }
        kør('UPDATE konti SET kodeord = ? WHERE id = ?', [password_hash($kodeord, PASSWORD_DEFAULT), $k['id']]);
        // Den voksne bliver logget ud alle steder; børnene må gerne blive ved
        kør('DELETE FROM logins WHERE konto_id = ? AND elev_id IS NULL', [$k['id']]);
        kør('DELETE FROM nulstil WHERE konto_id = ?', [$k['id']]);
        svar(['ok' => true, 'besked' => 'Det nye kodeord er gemt. Husk at give det videre.']);
    }
    $ok = send_mail($k['email'], 'Vælg et nyt kodeord til Learnification',
        "Hej {$k['kontakt']}\n\n"
        . "Her er et link, hvor du kan vælge et nyt kodeord til din konto på Learnification.\n"
        . "Det virker i 24 timer:\n\n"
        . nulstil_link((int) $k['id'], 86400) . "\n\n"
        . "Har du ikke bedt om det, så skal du ikke gøre noget — dit gamle kodeord virker stadig.\n\n"
        . "Venlig hilsen\nLearnification\n", null, ['Reply-To' => MODTAGER]);
    if (!$ok) {
        fejl('Mailen kunne ikke sendes: ' . post_fejl(), 502);
    }
    svar(['ok' => true, 'besked' => 'Linket er sendt til ' . $k['email'] . '.']);

case 'slet_konto':
    kraev_egen_side();
    $k = en("SELECT * FROM konti WHERE id = ? AND type != 'admin'", [tal('id')]);
    if (!$k) {
        fejl('Kontoen findes ikke.', 404);
    }
    // Som bekræftelse skal kontoens mailadresse skrives — så sletter man ikke den forkerte
    if (lille(felt('email', 190)) !== $k['email']) {
        fejl('Skriv kontoens mailadresse præcis for at bekræfte.');
    }
    // Grupper, elever, spilletid, gemte spil og logins går med i faldet (ON DELETE CASCADE)
    kør('DELETE FROM konti WHERE id = ?', [$k['id']]);
    svar(['ok' => true]);

// Før 2026-10-07 talte spillet åbent i flere faner dobbelt (hver fane er sin
// egen omgang). Det her retter de gamle tal: for hver spiller findes klynger
// af omgange, der overlapper i tid, og er der talt mere end der gik på uret,
// skaleres omgangene ned i samme forhold, så summen passer med uret.
case 'ret_overlap':
    kraev_egen_side();
    $id = tal('id');
    if (!vaerdi("SELECT 1 FROM konti WHERE id = ? AND type != 'admin'", [$id])) {
        fejl('Kontoen findes ikke.', 404);
    }
    $spillere = [];
    foreach (alle('SELECT id, elev_id, hvem, start, sidst, sekunder FROM sessioner
                   WHERE konto_id = ? AND sekunder > 0 ORDER BY start, id', [$id]) as $s) {
        $spillere[$s['elev_id'] !== null ? 'e' . $s['elev_id'] : $s['hvem']][] = $s;
    }
    $foer = 0;
    $efter = 0;
    $rettet = 0;
    $klynger = [];
    foreach ($spillere as $os) {
        $klynge = [];
        $slut = PHP_INT_MIN;
        $uret = 0;
        foreach ($os as $o) {
            // Første puls kan have op til et halvt minut med fra før omgangen startede
            $fra = (int) $o['start'] - min(30, (int) $o['sekunder']);
            if ($klynge && $fra > $slut) {
                $klynger[] = [$klynge, $uret];
                $klynge = [];
                $uret = 0;
            }
            $uret += max(0, (int) $o['sidst'] - max($fra, $slut));
            $slut = max($slut, (int) $o['sidst']);
            $klynge[] = $o;
        }
        if ($klynge) {
            $klynger[] = [$klynge, $uret];
        }
    }
    db()->beginTransaction();
    foreach ($klynger as [$klynge, $uret]) {
        $sum = array_sum(array_map(fn($o) => (int) $o['sekunder'], $klynge));
        $foer += $sum;
        if (count($klynge) < 2 || $sum <= $uret + 60) {
            $efter += $sum;
            continue;
        }
        foreach ($klynge as $o) {
            $ny = (int) floor((int) $o['sekunder'] * $uret / $sum);
            kør('UPDATE sessioner SET sekunder = ? WHERE id = ?', [$ny, $o['id']]);
            $efter += $ny;
            $rettet++;
        }
    }
    db()->commit();
    svar(['ok' => true, 'foer' => $foer, 'efter' => $efter, 'rettet' => $rettet]);

// ---- prøvetiden og spørgeskemaet (se tid_status() og _spoergeskema.php) ----

case 'tid':
    // {id, handling2: ekstra|fri|nulstil, min}: giv en konto mere tid, fri adgang, eller tilbage til grundgrænsen
    kraev_egen_side();
    $id = tal('id');
    if (!vaerdi("SELECT 1 FROM konti WHERE id = ? AND type != 'admin'", [$id])) {
        fejl('Kontoen findes ikke.', 404);
    }
    $hv = felt('hvad', 10);
    if ($hv === 'ekstra') {
        $min = tal('min');
        if ($min < 1 || $min > 100000) {
            fejl('Skriv et antal minutter.');
        }
        kør('UPDATE konti SET ekstra_min = ekstra_min + ? WHERE id = ?', [$min, $id]);
    } elseif ($hv === 'fri') {
        kør('UPDATE konti SET fri_adgang = ? WHERE id = ?', [tal('til') ? 1 : 0, $id]);
    } elseif ($hv === 'nulstil') {
        kør('UPDATE konti SET ekstra_min = 0, fri_adgang = 0 WHERE id = ?', [$id]);
    } else {
        fejl('Ukendt valg.');
    }
    svar(['ok' => true]);

case 'skemaer':
    require_once __DIR__ . '/_spoergeskema.php';
    $liste = alle("SELECT s.id, s.aarsag, s.spil, s.sendt, s.aabnet, s.besvaret, s.svar, k.id AS konto_id, k.navn,
                          k.type, k.email, e.kaldenavn
                   FROM spoergeskemaer s JOIN konti k ON k.id = s.konto_id LEFT JOIN elever e ON e.id = s.elev_id
                   ORDER BY s.id DESC");
    $tal = ['sendt' => 0, 'aabnet' => 0, 'besvaret' => 0];
    $sum = $antal = [];
    foreach ($liste as &$r) {
        $tal['sendt'] += $r['sendt'] !== null ? 1 : 0;
        $tal['aabnet'] += $r['aabnet'] !== null ? 1 : 0;
        $tal['besvaret'] += $r['besvaret'] !== null ? 1 : 0;
        $r['svar'] = $r['svar'] !== null ? json_decode($r['svar'], true) : null;
        foreach ((array) $r['svar'] as $nøgle => $v) {
            if ((SKEMA_SPOERGSMAAL[$nøgle][0] ?? '') === 'skala') {
                $sum[$nøgle] = ($sum[$nøgle] ?? 0) + $v;
                $antal[$nøgle] = ($antal[$nøgle] ?? 0) + 1;
            }
        }
    }
    unset($r);
    $snit = [];
    foreach ($sum as $nøgle => $s) {
        $snit[$nøgle] = round($s / $antal[$nøgle], 2);
    }
    $sp = [];
    foreach (SKEMA_SPOERGSMAAL as $nøgle => [$slags, $tekst, $valg]) {
        $sp[$nøgle] = ['slags' => $slags, 'tekst' => $tekst, 'valg' => $valg];
    }
    svar(['ok' => true, 'tal' => $tal, 'snit' => $snit, 'skemaer' => $liste, 'spoergsmaal' => $sp]);

case 'skema_gensend':
    // Send mailen igen til en konto, hvis skema ikke er besvaret (samme link)
    kraev_egen_side();
    require_once __DIR__ . '/_spoergeskema.php';
    $s = en('SELECT * FROM spoergeskemaer WHERE id = ? AND besvaret IS NULL', [tal('id')]);
    $k = $s ? en('SELECT * FROM konti WHERE id = ?', [$s['konto_id']]) : null;
    if (!$s || !$k) {
        fejl('Skemaet findes ikke, eller det er allerede besvaret.', 404);
    }
    if (!skema_send_raekke($k, $s)) {
        fejl('Mailen kunne ikke sendes: ' . post_fejl(), 502);
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
    foreach (alle("SELECT k.id, k.type, k.navn, k.email, k.status, k.oprettet, k.velkomst_sendt, k.paamindelse_sendt,
                          EXISTS (SELECT 1 FROM sessioner s WHERE s.konto_id = k.id AND s.sekunder > 0) AS spillet
                   FROM konti k WHERE k.type != 'admin' ORDER BY k.oprettet DESC") as $k) {
        $konti[] = ['id' => (int) $k['id'], 'type' => $k['type'], 'navn' => $k['navn'], 'email' => $k['email'],
                    'status' => $k['status'], 'oprettet' => (int) $k['oprettet'], 'spillet' => (bool) $k['spillet'],
                    'velkomst_sendt' => $k['velkomst_sendt'] !== null ? (int) $k['velkomst_sendt'] : null,
                    'paamindelse_sendt' => $k['paamindelse_sendt'] !== null ? (int) $k['paamindelse_sendt'] : null];
    }
    svar(['ok' => true, 'grupper' => $grupper, 'konti' => $konti,
          'mig' => kraev_admin()['email'], 'smtp' => smtp_opsaetning() !== null,
          'paamind' => ['url' => adresse() . '/api/paamind.php?noegle=' . paamind_noegle(),
                        'klar' => (int) vaerdi('SELECT COUNT(*) FROM konti k WHERE ' . paamind_hvor()),
                        'venter' => paamind_venter(),
                        'sendt' => (int) vaerdi('SELECT COUNT(*) FROM konti WHERE paamindelse_sendt IS NOT NULL'),
                        'dage' => PAAMIND_EFTER / 86400, 'timer' => PAAMIND_TIMER,
                        'status' => (object) paamind_status()]]);

case 'paamind_vis':
case 'paamind_test':
    // Som velkomst_vis/_test, men påmindelsen
    kraev_egen_side();
    require_once __DIR__ . '/_velkomst.php';
    $mig = kraev_admin();
    $k = tal('id') ? en("SELECT * FROM konti WHERE id = ? AND type != 'admin'", [tal('id')]) : null;
    $k = $k ?: en('SELECT * FROM konti k WHERE ' . paamind_hvor() . ' ORDER BY k.oprettet LIMIT 1');
    $k = $k ?: ['id' => 0, 'type' => 'foraelder', 'navn' => $mig['navn'], 'kontakt' => $mig['navn'], 'email' => $mig['email']];
    [$tekst, $html, $headere] = paamind_mail($k);
    if ($h === 'paamind_vis') {
        svar(['ok' => true, 'html' => $html, 'til' => $k['email']]);
    }
    bremse('velkomst-test', (string) $mig['id'], 20, 3600);
    if (!send_mail($mig['email'], '[TEST] ' . PAAMIND_EMNE, $tekst, $html, $headere)) {
        fejl('Mailen blev ikke sendt: ' . (post_fejl() ?: 'ukendt fejl'), 502);
    }
    svar(['ok' => true, 'til' => $mig['email']]);

case 'paamind_koer':
    // "Send dem, der skal have den, nu" — samme regler som cronjobbet,
    // bare uden tidsrummet, for det er administratoren, der trykker
    kraev_egen_side();
    require_once __DIR__ . '/_velkomst.php';
    @set_time_limit(60);
    svar(['ok' => true] + paamind_koer('admin'));

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
        $r = [KONTOTYPER[$k['type']] ?? $k['type'], $k['navn'], $k['kontakt'], $k['bynavn'], $k['email'],
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
