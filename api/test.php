<?php
/**
 * Testrunder: en skoleklasse tester spillene, og eleverne hedder bare Spiller 1, 2, 3 …
 *
 * Administrator (fra /admin#test):
 *   GET  ?handling=liste               alle testrunder
 *   POST opret {navn, antal}           ny runde med antal spillere (hver sin kode)
 *   POST flere {id, antal}             flere spillere til en runde
 *   GET  ?handling=status&id=          live overblik: hvem er inde, hvor, hvor langt
 *   POST skema_aaben {id}              vis spørgeskemaet på elevernes skærme nu
 *   POST skema_luk {id}                luk det igen
 *   GET  ?handling=resultater&id=      svarene talt op pr. spørgsmål
 *   GET  ?handling=csv&id=             svarene som CSV til Excel
 *   POST slet {id}                     slet runden og alt, der hører til
 *
 * Barnet (assets/elevskema.js, kun på en testrunde):
 *   GET  ?handling=skema_aktuel        {skema: null | {id, spoergsmaal}}
 *   POST skema_svar {id, spil, svar}   barnets svar — ét pr. barn pr. skema
 *
 * En testrunde er en helt almindelig skolekonto med test = 1 og fri adgang
 * (ingen tidsgrænse). Den får ingen mails og tæller ikke med i /admins tal.
 */

declare(strict_types=1);
require __DIR__ . '/_kerne.php';

const TEST_MAKS_SPILLERE = 60;

/** Spørgsmålene til eleverne: [nøgle => [tekst, [svar => [emoji, tekst]]]]. Rækkefølgen er skærmenes. */
const ELEV_SKEMA = [
    'sjovt' => ['Hvor sjovt var det?', [
        '1' => ['😞', 'Slet ikke'], '2' => ['😐', 'Lidt'], '3' => ['🙂', 'Ret sjovt'], '4' => ['😄', 'Super sjovt']]],
    'svaerhed' => ['Hvordan var opgaverne?', [
        'for_svaere' => ['😵', 'For svære'], 'tilpas' => ['👍', 'Lige tilpas'], 'for_lette' => ['😴', 'For lette']]],
    'forstod' => ['Forstod du, hvad du skulle?', [
        'ja' => ['✅', 'Ja'], 'lidt' => ['🤔', 'Lidt'], 'nej' => ['❌', 'Nej']]],
    'laerte' => ['Lærte du noget nyt?', [
        'ja' => ['💡', 'Ja'], 'maaske' => ['🤷', 'Måske'], 'nej' => ['🙅', 'Nej']]],
    'igen' => ['Vil du gerne spille igen?', [
        'ja' => ['🎮', 'Ja'], 'maaske' => ['🤷', 'Måske'], 'nej' => ['🚪', 'Nej']]],
    'bedst' => ['Hvilket spil kan du bedst lide?', [
        'runeborg' => ['🏰', 'Runeborg'], 'regnehelten' => ['🧮', 'Regnehelten'],
        'begge' => ['⭐', 'Begge lige meget'], 'et' => ['1️⃣', 'Har kun prøvet ét']]],
];

function skema_for_barn(): array
{
    $ud = [];
    foreach (ELEV_SKEMA as $noegle => [$tekst, $valg]) {
        $v = [];
        foreach ($valg as $kode => [$emoji, $t]) {
            $v[] = ['v' => (string) $kode, 'emoji' => $emoji, 'tekst' => $t];
        }
        $ud[] = ['noegle' => $noegle, 'tekst' => $tekst, 'valg' => $v];
    }
    return $ud;
}

/** Testrunden skal findes og være en testrunde. */
function runde(int $id): array
{
    $k = en('SELECT * FROM konti WHERE id = ? AND test = 1', [$id]);
    if (!$k) {
        fejl('Testrunden findes ikke.', 404);
    }
    return $k;
}

/** Spillerne i en runde, i rækkefølge: Spiller 1, 2, 3 … */
function spillere(int $konto_id): array
{
    $r = alle('SELECT e.* FROM elever e JOIN grupper g ON g.id = e.gruppe_id WHERE g.konto_id = ?', [$konto_id]);
    usort($r, fn($a, $b) => (int) preg_replace('/\D/', '', $a['kaldenavn']) <=> (int) preg_replace('/\D/', '', $b['kaldenavn'])
                            ?: (int) $a['id'] <=> (int) $b['id']);
    return $r;
}

function spiller_nr(string $kaldenavn): int
{
    return (int) preg_replace('/\D/', '', $kaldenavn);
}

$h = handling();

// ------------------------------------------------------------ barnet

if ($h === 'skema_aktuel' || $h === 'skema_svar') {
    $x = hvem();
    if (!$x || !$x['elev'] || empty($x['konto']['test'])) {
        // Ikke en testrunde: der er aldrig noget skema, og det er ikke en fejl
        if ($h === 'skema_aktuel') {
            svar(['ok' => true, 'skema' => null]);
        }
        fejl('Det her er kun for en testrunde.', 403);
    }
    $konto_id = (int) $x['konto']['id'];
    $elev_id = (int) $x['elev']['id'];

    if ($h === 'skema_aktuel') {
        $s = en('SELECT id FROM testskema WHERE konto_id = ? AND lukket IS NULL ORDER BY id DESC LIMIT 1', [$konto_id]);
        if ($s && !vaerdi('SELECT 1 FROM testsvar WHERE testskema_id = ? AND elev_id = ?', [$s['id'], $elev_id])) {
            svar(['ok' => true, 'skema' => ['id' => (int) $s['id'], 'spoergsmaal' => skema_for_barn()]]);
        }
        svar(['ok' => true, 'skema' => null]);
    }

    kraev_egen_side();
    $s = en('SELECT * FROM testskema WHERE id = ? AND konto_id = ? AND lukket IS NULL', [tal('id'), $konto_id]);
    if (!$s) {
        fejl('Skemaet er lukket. Tak, fordi du ville svare!', 410);
    }
    $spil = felt('spil', 20);
    if (!isset(SPIL[$spil])) {
        $spil = 'oversigt';
    }
    $givet = is_array(input()['svar'] ?? null) ? input()['svar'] : [];
    $rent = [];
    foreach (ELEV_SKEMA as $noegle => [$tekst, $valg]) {
        $v = isset($givet[$noegle]) && is_scalar($givet[$noegle]) ? (string) $givet[$noegle] : '';
        if (!isset($valg[$v])) {
            fejl('Svar på alle spørgsmålene.');
        }
        $rent[$noegle] = $v;
    }
    // Højst ét svar pr. barn — dobbelttryk gør ingenting
    if (!vaerdi('SELECT 1 FROM testsvar WHERE testskema_id = ? AND elev_id = ?', [$s['id'], $elev_id])) {
        try {
            kør('INSERT INTO testsvar (testskema_id, elev_id, spil, svar, tid) VALUES (?, ?, ?, ?, ?)',
                [$s['id'], $elev_id, $spil, json_encode($rent, JSON_UNESCAPED_UNICODE), time()]);
        } catch (PDOException $e) {
            // To tryk på samme tid: det andet svar er bare overflødigt
        }
    }
    svar(['ok' => true]);
}

// ------------------------------------------------------------ administrator

kraev_admin();

/** En testrunde som admin ser den i listen */
function runde_ud(array $k): array
{
    $s = en('SELECT id, aabnet FROM testskema WHERE konto_id = ? AND lukket IS NULL ORDER BY id DESC LIMIT 1', [$k['id']]);
    $n = (int) vaerdi('SELECT COUNT(*) FROM elever e JOIN grupper g ON g.id = e.gruppe_id WHERE g.konto_id = ?', [$k['id']]);
    return ['id' => (int) $k['id'], 'navn' => $k['navn'], 'oprettet' => (int) $k['oprettet'], 'spillere' => $n,
            'gruppe' => (int) vaerdi('SELECT id FROM grupper WHERE konto_id = ? ORDER BY id LIMIT 1', [$k['id']]),
            'skema_aaben' => $s ? (int) $s['id'] : null,
            'skemaer' => (int) vaerdi('SELECT COUNT(*) FROM testskema WHERE konto_id = ?', [$k['id']]),
            'svar' => (int) vaerdi('SELECT COUNT(*) FROM testsvar t JOIN testskema s ON s.id = t.testskema_id WHERE s.konto_id = ?', [$k['id']])];
}

switch ($h) {

case 'liste':
    $ud = [];
    foreach (alle('SELECT * FROM konti WHERE test = 1 ORDER BY oprettet DESC') as $k) {
        $ud[] = runde_ud($k);
    }
    svar(['ok' => true, 'runder' => $ud]);

case 'opret':
    kraev_egen_side();
    $navn = felt('navn', 80);
    $antal = tal('antal');
    if ($antal < 1 || $antal > TEST_MAKS_SPILLERE) {
        fejl('Skriv, hvor mange spillere der er (1-' . TEST_MAKS_SPILLERE . ').');
    }
    $nu = time();
    db()->beginTransaction();
    try {
        $dato = date('j/n');
        kør("INSERT INTO konti (type, navn, kontakt, bynavn, email, kodeord, status, oprettet, test, fri_adgang)
             VALUES ('skole', ?, ?, '', ?, ?, 'godkendt', ?, 1, 1)",
            ['Test: ' . ($navn !== '' ? $navn : 'skole') . ' ' . $dato, $navn !== '' ? $navn : 'Testrunde',
             'test-' . bin2hex(random_bytes(6)) . '@test.invalid',
             // Ingen kender kodeordet, så kontoen kan kun bruges af børnenes koder og af admin
             password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT), $nu]);
        $id = (int) db()->lastInsertId();
        kør('INSERT INTO grupper (konto_id, navn, klassetrin, kode, oprettet) VALUES (?, ?, NULL, ?, ?)',
            [$id, 'Testklassen', ny_kode(), $nu]);
        nye_elever((int) db()->lastInsertId(),
                   implode("\n", array_map(fn($i) => 'Spiller ' . $i, range(1, $antal))), TEST_MAKS_SPILLERE);
        db()->commit();
    } catch (Throwable $e) {
        db()->rollBack();
        throw $e;
    }
    svar(['ok' => true, 'id' => $id]);

case 'flere':
    kraev_egen_side();
    $k = runde(tal('id'));
    $antal = tal('antal');
    $har = spillere((int) $k['id']);
    if ($antal < 1 || count($har) + $antal > TEST_MAKS_SPILLERE) {
        fejl('Der kan højst være ' . TEST_MAKS_SPILLERE . ' spillere i en runde.');
    }
    $fra = max([0] + array_map(fn($e) => spiller_nr($e['kaldenavn']), $har));
    $gruppe = (int) vaerdi('SELECT id FROM grupper WHERE konto_id = ? ORDER BY id LIMIT 1', [$k['id']]);
    nye_elever($gruppe, implode("\n", array_map(fn($i) => 'Spiller ' . $i, range($fra + 1, $fra + $antal))), TEST_MAKS_SPILLERE);
    svar(['ok' => true]);

case 'status':
    $k = runde(tal('id'));
    $nu = time();
    $ud = [];
    $senest = [];   // elev_id => [spil, sidst]
    foreach (alle('SELECT elev_id, spil, sidst FROM sessioner WHERE konto_id = ? AND elev_id IS NOT NULL ORDER BY sidst, id', [$k['id']]) as $r) {
        $senest[(int) $r['elev_id']] = [$r['spil'], (int) $r['sidst']];
    }
    $sek = [];
    foreach (alle('SELECT elev_id, spil, SUM(sekunder) AS s FROM sessioner WHERE konto_id = ? AND elev_id IS NOT NULL GROUP BY elev_id, spil', [$k['id']]) as $r) {
        $sek[(int) $r['elev_id']][$r['spil']] = (int) $r['s'];
    }
    [$gemt] = gemte_spil_paa_konto((int) $k['id']);
    $aaben = en('SELECT id FROM testskema WHERE konto_id = ? AND lukket IS NULL ORDER BY id DESC LIMIT 1', [$k['id']]);
    $svaret = [];
    if ($aaben) {
        foreach (alle('SELECT elev_id FROM testsvar WHERE testskema_id = ?', [$aaben['id']]) as $r) {
            $svaret[(int) $r['elev_id']] = true;
        }
    }
    $sum = ['inde' => 0, 'spillere' => 0, 'lavet' => 0, 'ialt' => 0, 'pr_spil' => array_fill_keys(array_keys(SPIL), 0)];
    foreach (spillere((int) $k['id']) as $e) {
        $id = (int) $e['id'];
        $s = $senest[$id] ?? null;
        // Spillet gemmer, hver gang man går et nyt sted hen — det kommer før den første puls (efter ~30 sek.)
        foreach (array_keys(SPIL) as $sp) {
            $gem = $gemt[$id][$sp]['opdateret'] ?? 0;
            if ($gem > ($s[1] ?? 0)) {
                $s = [$sp, (int) $gem];
            }
        }
        $sidst = $s ? max($s[1], (int) $e['sidst_inde']) : (int) $e['sidst_inde'];
        $alder = $sidst ? $nu - $sidst : null;
        // Pulsen kommer hvert halve minut, mens barnet spiller
        $stat = $alder === null ? 'ude' : ($alder < 80 ? 'groen' : ($alder < 300 ? 'gul' : 'ude'));
        $spil_nu = $s && $stat !== 'ude' ? $s[0] : null;
        $spil = [];
        foreach (array_keys(SPIL) as $sp) {
            $g = $gemt[$id][$sp] ?? null;
            $spil[$sp] = $g ? $g + ['sek' => $sek[$id][$sp] ?? 0] : null;
        }
        $sum['spillere']++;
        if ($stat !== 'ude') {
            $sum['inde']++;
        }
        if ($spil_nu) {
            $sum['pr_spil'][$spil_nu]++;
        }
        $ud[] = ['id' => $id, 'nr' => spiller_nr($e['kaldenavn']), 'navn' => $e['kaldenavn'], 'ikon' => $e['ikon'],
                 'kode' => $e['kode'], 'status' => $stat, 'sidst' => $sidst ?: null, 'spil_nu' => $spil_nu,
                 'sek' => array_sum($sek[$id] ?? []), 'spil' => $spil, 'svaret' => isset($svaret[$id])];
    }
    svar(['ok' => true, 'runde' => runde_ud($k), 'spillere' => $ud, 'sum' => $sum,
          'spil' => SPIL, 'kapitler' => KAPITLER, 'nu' => $nu]);

case 'skema_aaben':
    kraev_egen_side();
    $k = runde(tal('id'));
    // Kun ét åbent ad gangen — et nyt skema lukker det gamle
    kør('UPDATE testskema SET lukket = ? WHERE konto_id = ? AND lukket IS NULL', [time(), $k['id']]);
    kør('INSERT INTO testskema (konto_id, aabnet) VALUES (?, ?)', [$k['id'], time()]);
    svar(['ok' => true, 'skema' => (int) db()->lastInsertId()]);

case 'skema_luk':
    kraev_egen_side();
    $k = runde(tal('id'));
    kør('UPDATE testskema SET lukket = ? WHERE konto_id = ? AND lukket IS NULL', [time(), $k['id']]);
    svar(['ok' => true]);

case 'resultater':
case 'csv':
    $k = runde(tal('id'));
    $rader = alle('SELECT t.*, s.aabnet FROM testsvar t JOIN testskema s ON s.id = t.testskema_id
                   WHERE s.konto_id = ? ORDER BY t.tid', [$k['id']]);
    $navne = [];
    foreach (spillere((int) $k['id']) as $e) {
        $navne[(int) $e['id']] = $e['kaldenavn'];
    }
    if ($h === 'resultater') {
        $tael = [];
        foreach (ELEV_SKEMA as $noegle => [$tekst, $valg]) {
            $tael[$noegle] = array_fill_keys(array_keys($valg), 0);
        }
        foreach ($rader as $r) {
            foreach ((array) json_decode($r['svar'], true) as $noegle => $v) {
                if (isset($tael[$noegle][$v])) {
                    $tael[$noegle][$v]++;
                }
            }
        }
        $sp = [];
        foreach (ELEV_SKEMA as $noegle => [$tekst, $valg]) {
            $v = [];
            foreach ($valg as $kode => [$emoji, $t]) {
                $v[] = ['v' => (string) $kode, 'emoji' => $emoji, 'tekst' => $t, 'antal' => $tael[$noegle][$kode]];
            }
            $sp[] = ['noegle' => $noegle, 'tekst' => $tekst, 'valg' => $v];
        }
        svar(['ok' => true, 'svar' => count($rader), 'spoergsmaal' => $sp]);
    }
    // CSV til Excel: semikolon og BOM, ligesom de andre eksporter
    [$gemt] = gemte_spil_paa_konto((int) $k['id']);
    $sek = [];
    foreach (alle('SELECT elev_id, spil, SUM(sekunder) AS s FROM sessioner WHERE konto_id = ? AND elev_id IS NOT NULL GROUP BY elev_id, spil', [$k['id']]) as $r) {
        $sek[(int) $r['elev_id']][$r['spil']] = (int) $r['s'];
    }
    $linjer = [array_merge(['Spiller', 'Spil da de svarede', 'Kapitel i det spil', 'Minutter i det spil', 'Svaret kl.'],
                           array_map(fn($q) => $q[0], array_values(ELEV_SKEMA)))];
    foreach ($rader as $r) {
        $svar_ = (array) json_decode($r['svar'], true);
        $eid = (int) $r['elev_id'];
        $g = $gemt[$eid][$r['spil']] ?? null;
        $l = [$navne[$eid] ?? '?', SPIL[$r['spil']] ?? 'Spiloversigten', $g ? ($g['kapitel'] ?? '') : '',
              isset($sek[$eid][$r['spil']]) ? round($sek[$eid][$r['spil']] / 60) : '', date('H:i', (int) $r['tid'])];
        foreach (ELEV_SKEMA as $noegle => [$tekst, $valg]) {
            $l[] = isset($svar_[$noegle], $valg[$svar_[$noegle]]) ? $valg[$svar_[$noegle]][1] : '';
        }
        $linjer[] = $l;
    }
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="testsvar-' . $k['id'] . '.csv"');
    header('Cache-Control: no-store');
    echo "\xEF\xBB\xBF";
    foreach ($linjer as $l) {
        echo implode(';', array_map(function ($c) {
            $c = (string) $c;
            // Excel kører formler, der begynder med = + - @
            if ($c !== '' && strpos('=+-@', $c[0]) !== false) {
                $c = "'" . $c;
            }
            return '"' . str_replace('"', '""', $c) . '"';
        }, $l)), "\r\n";
    }
    exit;

case 'slet':
    kraev_egen_side();
    $k = runde(tal('id'));
    // Grupper, elever, spilletid, gemte spil, skemaer og svar går med (ON DELETE CASCADE)
    kør('DELETE FROM konti WHERE id = ?', [$k['id']]);
    svar(['ok' => true]);
}

fejl('Ukendt handling.', 404);
