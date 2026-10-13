<?php
/**
 * XP-tavlen og fremskridtsmailen til forældre.
 *
 * XP BLIVER REGNET UD af det, spillene allerede gemmer — der er ingen XP-tæller
 * i spillene, så intet kan snydes eller komme ud af takt:
 *
 *   præstation (profiler.praes)         100 XP
 *   klaret kapitel (gemte_spil.klaret)   75 XP
 *   klaret hovedmission                  20 XP
 *   klaret ekstramission                 10 XP
 *   runestykke (Runeborg)                 5 XP
 *   Regnekraft over de 10 %, man starter med: 1 XP pr. procent
 *
 * Spilletid giver bevidst ingen XP — det skal ikke belønne at sidde længere.
 * Familiens XP er summen af børnenes; niveauerne stiger med kvadratroden.
 * Ændres tallene, stiger eller falder alles XP med det samme, og det er meningen.
 *
 * FREMSKRIDT = forskellen på nu og et "stand" fra for en uge siden eller ved
 * sidste mail (tabellen xp_stand, ét lille JSON-objekt pr. barn pr. dag).
 * Stand bliver gemt første gang, nogen ser tavlen eller cronjobbet kører
 * den dag — og altid, lige når en mail går af sted, så næste mail kun
 * fortæller om det nye.
 *
 * MAILEN er en SERVICEMAIL om børnenes fremskridt på en konto, forældrene selv
 * har oprettet — ikke markedsføring. Den må derfor aldrig rumme tilbud,
 * reklame eller nyhedsbrevsstof (så skal modtageren have sagt ja, se
 * _nyhedsbrev.php). Den går til familiekonti, der ikke har sagt nej
 * (konti.xp_mail), og hver mail har et afmeldingslink, der kun slår
 * fremskridtsmailen fra — ikke kontoen og ikke nyhedsbrevet.
 */

declare(strict_types=1);
require_once __DIR__ . '/_nyhedsbrev.php';

const XP_PRAESTATION = 100;
const XP_KAPITEL = 75;
const XP_HOVED = 20;
const XP_EKSTRA = 10;
const XP_RUNE = 5;
const XP_NIVEAU = 60;                   // niveau n begynder ved 60 · (n−1)² XP
const XP_UGE = 7 * 86400;
const XP_MAIL_EMNE_STAND = 'Jeres stand på Learnification';
const XP_MAIL_INTERVAL = 6 * 86400;     // automatisk: højst én mail på så lang tid
const XP_MAIL_MANUEL_INTERVAL = 20 * 3600;   // fra /admin: aldrig to inden for så lang tid
const XP_MAIL_TIMER = [10, 18];         // automatisk: kun inden for de timer

const XP_TITLER = ['Nysgerrig familie', 'Lærlingefamilie', 'Eventyrerfamilie', 'Rejsefæller',
                   'Heltefamilie', 'Runemestre', 'Legender'];

/** 1.240 — tusindtalsprik som på dansk. */
function xp_tal(int $n): string
{
    return number_format($n, 0, ',', '.');
}

/** "1 mission" / "3 missioner" */
function xp_antal(int $n, string $en, string $flere): string
{
    return xp_tal($n) . ' ' . ($n === 1 ? $en : $flere);
}

/** Præstationernes navne læses fra selve spilkataloget, så der kun er ét sted at rette. [id => [spil, navn]] */
function xp_katalog(): array
{
    static $k = null;
    if ($k !== null) {
        return $k;
    }
    $k = [];
    $js = @file_get_contents(__DIR__ . '/../spil/faelles/praestationer.js');
    if ($js !== false && preg_match_all("/\{\s*id:\s*'([a-z0-9_]+)',\s*spil:\s*'([a-z]+)',\s*navn:\s*'((?:[^'\\\\]|\\\\.)*)'/u", $js, $m, PREG_SET_ORDER)) {
        foreach ($m as $x) {
            $k[$x[1]] = ['spil' => $x[2], 'navn' => stripslashes($x[3])];
        }
    }
    return $k;
}

function xp_spilnavn(string $spil): string
{
    return SPIL[$spil] ?? ['bib' => 'Eventyrbiblioteket'][$spil] ?? $spil;
}

/** 261013 (ÅÅMMDD, som profilen gemmer det) -> '2026-10-13' */
function xp_dato(int $v): string
{
    return sprintf('%04d-%02d-%02d', 2000 + intdiv($v, 10000), intdiv($v % 10000, 100), $v % 100);
}

/** '2026-10-13' -> "13. okt." */
function xp_dato_kort(string $dag): string
{
    $m = ['jan.', 'feb.', 'mar.', 'apr.', 'maj', 'jun.', 'jul.', 'aug.', 'sep.', 'okt.', 'nov.', 'dec.'];
    [$aar, $md, $d] = array_map('intval', explode('-', $dag)) + [0, 1, 1];
    return $d . '. ' . ($m[$md - 1] ?? '');
}

/** XP -> niveau, titel og hvor langt der er til næste. */
function xp_niveau(int $xp): array
{
    $n = (int) floor(sqrt(max(0, $xp) / XP_NIVEAU)) + 1;
    $fra = XP_NIVEAU * ($n - 1) ** 2;
    $til = XP_NIVEAU * $n ** 2;
    return ['niveau' => $n, 'titel' => XP_TITLER[min($n, count(XP_TITLER)) - 1], 'fra' => $fra, 'til' => $til,
            'mangler' => $til - $xp, 'andel' => $til > $fra ? round(($xp - $fra) / ($til - $fra), 3) : 1];
}

// ----------------------------------------------------------------- ét barn

/**
 * Hvad et barn har opnået lige nu: XP og det, det er regnet ud af.
 * 'praes' = [id => ÅÅMMDD], 'kap' = [spil => [kapitler]], 'hoved'/'ekstra' = [spil => antal].
 */
function xp_barn(int $elev_id): array
{
    $b = ['praes' => [], 'kap' => [], 'hoved' => [], 'ekstra' => [], 'runer' => 0, 'kraft' => 0, 'sek' => 0];

    $p = en('SELECT data FROM profiler WHERE hvem = ?', ['elev.' . $elev_id]);
    $pd = $p ? json_decode($p['data'], true) : null;
    if (is_array($pd) && is_array($pd['praes'] ?? null)) {
        foreach ($pd['praes'] as $id => $dato) {
            if (is_string($id) && preg_match('/^[a-z0-9_]{1,40}$/', $id)) {
                $b['praes'][$id] = (int) $dato;
            }
        }
    }

    foreach (alle('SELECT spil, data FROM gemte_spil WHERE elev_id = ?', [$elev_id]) as $g) {
        $spil = $g['spil'];
        $d = json_decode($g['data'], true);
        if (!isset(SPIL[$spil]) || !is_array($d) || !empty($d['slettet'])) {
            continue;
        }
        $q = (array) ($d['q'] ?? []);
        if (isset($d['klaret'])) {
            $kap = array_map('intval', (array) $d['klaret']);
        } elseif ($spil === 'runeborg') {
            $kap = ($q['q10'] ?? '') === 'done' ? [1] : [];     // før kapitlerne
        } else {
            $kap = ($q['q5'] ?? '') === 'done' ? [1] : [];
        }
        $b['kap'][$spil] = array_values(array_unique(array_filter($kap, fn($n) => $n >= 1 && $n <= KAPITLER)));
        $b['hoved'][$spil] = $b['ekstra'][$spil] = 0;
        foreach ($q as $id => $status) {
            if ($status !== 'done') {
                continue;
            }
            $b[preg_match('/^(k\d)?s\d+$/', (string) $id) ? 'ekstra' : 'hoved'][$spil]++;
        }
        if ($spil === 'runeborg') {
            $b['runer'] = count((array) ($d['runes'] ?? []));
        } else {
            $b['kraft'] = max(0, min(100, (int) ($d['kraft'] ?? 0)) - 10);
        }
    }
    $b['sek'] = (int) vaerdi('SELECT COALESCE(SUM(sekunder), 0) FROM sessioner WHERE elev_id = ?', [$elev_id]);
    $b['xp'] = xp_sum($b);
    return $b;
}

function xp_sum(array $b): int
{
    return count($b['praes']) * XP_PRAESTATION
        + array_sum(array_map('count', $b['kap'])) * XP_KAPITEL
        + array_sum($b['hoved']) * XP_HOVED
        + array_sum($b['ekstra']) * XP_EKSTRA
        + $b['runer'] * XP_RUNE
        + $b['kraft'];
}

/** Det lille objekt, der bliver gemt i xp_stand: nok til at se, hvad der er nyt, men uden datoer. */
function xp_stand_data(array $b): array
{
    return ['xp' => $b['xp'], 'praes' => array_keys($b['praes']), 'kap' => $b['kap'], 'hoved' => $b['hoved'],
            'ekstra' => $b['ekstra'], 'runer' => $b['runer'], 'kraft' => $b['kraft'], 'sek' => $b['sek']];
}

/**
 * Husk barnets stand i dag. Uden $overskriv sker der intet, hvis dagen allerede har et — så den
 * første visning om morgenen ikke bliver overskrevet af en senere. Lige når en mail går, overskrives det.
 */
function xp_gem_stand(int $elev_id, array $b, bool $overskriv = false): void
{
    $dag = date('Y-m-d');
    $data = json_encode(xp_stand_data($b), JSON_UNESCAPED_UNICODE);
    try {
        kør('INSERT INTO xp_stand (elev_id, dag, data) VALUES (?, ?, ?)', [$elev_id, $dag, $data]);
    } catch (PDOException $e) {
        if ($overskriv) {
            kør('UPDATE xp_stand SET data = ? WHERE elev_id = ? AND dag = ?', [$data, $elev_id, $dag]);
        }
    }
    if (random_int(1, 40) === 1) {
        kør('DELETE FROM xp_stand WHERE dag < ?', [date('Y-m-d', time() - 120 * 86400)]);
    }
}

/**
 * Nyeste stand fra den dag eller før. Findes der ingen så gammel, men der er et fra tidligere end i dag,
 * bruges det ældste (barnet er nyt, så "ugen" er kortere). Intet stand = null: så ved vi ikke, hvad der er nyt.
 */
function xp_stand_foer(int $elev_id, string $dag_senest): ?array
{
    $r = en('SELECT data FROM xp_stand WHERE elev_id = ? AND dag <= ? ORDER BY dag DESC LIMIT 1', [$elev_id, $dag_senest])
        ?? en('SELECT data FROM xp_stand WHERE elev_id = ? AND dag < ? ORDER BY dag LIMIT 1', [$elev_id, date('Y-m-d')]);
    $d = $r ? json_decode($r['data'], true) : null;
    return is_array($d) ? $d : null;
}

/** Forskellen på et barn nu og dengang: XP, nye præstationer, nye kapitler, missioner og minutter. */
function xp_forskel(array $nu, ?array $foer): array
{
    $ud = ['xp' => 0, 'praes' => [], 'kap' => [], 'missioner' => 0, 'sek' => 0, 'kendt' => $foer !== null];
    if ($foer === null) {
        return $ud;
    }
    $ud['xp'] = max(0, $nu['xp'] - (int) $foer['xp']);
    $ud['praes'] = array_values(array_diff(array_keys($nu['praes']), (array) $foer['praes']));
    foreach ($nu['kap'] as $spil => $kap) {
        $ny = array_values(array_diff($kap, array_map('intval', (array) ($foer['kap'][$spil] ?? []))));
        if ($ny) {
            $ud['kap'][$spil] = $ny;
        }
    }
    foreach (['hoved', 'ekstra'] as $slags) {
        foreach ($nu[$slags] as $spil => $n) {
            $ud['missioner'] += max(0, $n - (int) ($foer[$slags][$spil] ?? 0));
        }
    }
    $ud['sek'] = max(0, $nu['sek'] - (int) $foer['sek']);
    return $ud;
}

/** Et opdigtet eksempel til forhåndsvisningen, når der endnu ikke er en rigtig familie med nyt. */
function xp_eksempel(): array
{
    $b = ['praes' => ['rb_start' => 261001, 'rb_kap1' => 261012], 'kap' => ['runeborg' => [1]], 'hoved' => ['runeborg' => 6],
          'ekstra' => ['runeborg' => 2], 'runer' => 8, 'kraft' => 0, 'sek' => 4800, 'xp' => 0];
    $b['xp'] = xp_sum($b);
    $c = ['praes' => [], 'kap' => [], 'hoved' => ['regnehelten' => 3], 'ekstra' => [], 'runer' => 0, 'kraft' => 25, 'sek' => 1500, 'xp' => 0];
    $c['xp'] = xp_sum($c);
    $fb = ['xp' => 0, 'praes' => [], 'kap' => [], 'hoved' => [], 'ekstra' => [], 'runer' => 0, 'kraft' => 0, 'sek' => 0];
    $boern = [
        ['id' => 0, 'navn' => 'Emma', 'ikon' => '🦊', 'b' => $b, 'f' => xp_forskel($b, $fb)],
        ['id' => 0, 'navn' => 'Oskar', 'ikon' => '🐻', 'b' => $c, 'f' => xp_forskel($c, $fb)],
    ];
    $xp = $b['xp'] + $c['xp'];
    $gevinst = $boern[0]['f']['xp'] + $boern[1]['f']['xp'];
    return ['boern' => $boern, 'xp' => $xp, 'gevinst' => $gevinst, 'kendt' => true, 'niveau' => xp_niveau($xp)];
}

// ------------------------------------------------------------- hele familien

/**
 * Familiens stand: børnene med XP og fremskridt siden $dag_senest (standard: for en uge siden).
 * $husk = gem dagens stand for børnene, hvis der ikke er et.
 */
function xp_familie(int $konto_id, ?string $dag_senest = null, bool $husk = true): array
{
    $dag_senest = $dag_senest ?? date('Y-m-d', time() - XP_UGE);
    $boern = [];
    $i_alt = $gevinst = 0;
    $kendt = false;
    foreach (alle('SELECT e.id, e.kaldenavn, e.ikon FROM elever e JOIN grupper g ON g.id = e.gruppe_id
                   WHERE g.konto_id = ? ORDER BY e.kaldenavn', [$konto_id]) as $e) {
        $b = xp_barn((int) $e['id']);
        $foer = xp_stand_foer((int) $e['id'], $dag_senest);
        if ($husk) {
            xp_gem_stand((int) $e['id'], $b);
        }
        $f = xp_forskel($b, $foer);
        $kendt = $kendt || $f['kendt'];
        $i_alt += $b['xp'];
        $gevinst += $f['xp'];
        $boern[] = ['id' => (int) $e['id'], 'navn' => $e['kaldenavn'], 'ikon' => $e['ikon'], 'b' => $b, 'f' => $f];
    }
    usort($boern, fn($a, $b) => $b['b']['xp'] <=> $a['b']['xp'] ?: strcmp($a['navn'], $b['navn']));
    return ['boern' => $boern, 'xp' => $i_alt, 'gevinst' => $gevinst, 'kendt' => $kendt, 'niveau' => xp_niveau($i_alt)];
}

/** Familien som svar til siden: ingen datoer fra profilen ud over præstationerne, ingen interne tal. */
function xp_tavle(array $k): array
{
    $f = xp_familie((int) $k['id']);
    $katalog = xp_katalog();
    $boern = $seneste = [];
    foreach ($f['boern'] as $x) {
        $b = $x['b'];
        $boern[] = ['id' => $x['id'], 'navn' => $x['navn'], 'ikon' => $x['ikon'], 'xp' => $b['xp'],
                    'uge' => $x['f']['kendt'] ? $x['f']['xp'] : null,
                    'niveau' => xp_niveau($b['xp'])['niveau'],
                    'dele' => ['praestationer' => count($b['praes']), 'kapitler' => array_sum(array_map('count', $b['kap'])),
                               'missioner' => array_sum($b['hoved']) + array_sum($b['ekstra']),
                               'runer' => $b['runer'], 'regnekraft' => $b['kraft'] > 0 ? $b['kraft'] + 10 : 0],
                    'spilletid' => $b['sek']];
        foreach ($b['praes'] as $id => $dato) {
            if (isset($katalog[$id])) {
                $seneste[] = ['barn' => $x['navn'], 'ikon' => $x['ikon'], 'navn' => $katalog[$id]['navn'],
                              'spil' => xp_spilnavn($katalog[$id]['spil']), 'dag' => xp_dato($dato), 'dato' => xp_dato_kort(xp_dato($dato))];
            }
        }
    }
    usort($seneste, fn($a, $b) => strcmp($b['dag'], $a['dag']));
    return ['xp' => $f['xp'], 'uge' => $f['kendt'] ? $f['gevinst'] : null, 'niveau' => $f['niveau'],
            'boern' => $boern, 'seneste' => array_slice($seneste, 0, 8),
            'regler' => ['praestation' => XP_PRAESTATION, 'kapitel' => XP_KAPITEL, 'hovedmission' => XP_HOVED,
                         'ekstramission' => XP_EKSTRA, 'runestykke' => XP_RUNE]];
}

// ------------------------------------------------------------------- afmelding

/** Nøglen i afmeldingslinket. Laves første gang, den skal bruges. */
function xp_noegle(array $k): string
{
    if (!empty($k['xp_noegle'])) {
        return $k['xp_noegle'];
    }
    $noegle = bin2hex(random_bytes(20));
    if (kør('UPDATE konti SET xp_noegle = ? WHERE id = ? AND xp_noegle IS NULL', [$noegle, $k['id']])) {
        return $noegle;
    }
    return (string) vaerdi('SELECT xp_noegle FROM konti WHERE id = ?', [$k['id']]);
}

function xp_afmeldlink(array $k): string
{
    return adresse() . '/fremskridtsmail?afmeld=' . xp_noegle($k);
}

// ------------------------------------------------------------------ selve mailen

/** Hvad der skal stå om ét barn: linjer som ['★', 'Ny præstation: Den grønne brønd (Runeborg)']. */
function xp_barn_linjer(array $x): array
{
    $f = $x['f'];
    $katalog = xp_katalog();
    $l = [];
    foreach ($f['praes'] as $id) {
        $p = $katalog[$id] ?? null;
        $l[] = ['★', 'Ny præstation: ' . ($p ? $p['navn'] . ' (' . xp_spilnavn($p['spil']) . ')' : $id)];
    }
    foreach ($f['kap'] as $spil => $kap) {
        foreach ($kap as $n) {
            $l[] = ['✔', 'Kapitel ' . $n . ' klaret i ' . xp_spilnavn($spil)];
        }
    }
    if ($f['missioner'] > 0) {
        $l[] = ['•', xp_antal($f['missioner'], 'mission klaret', 'missioner klaret')];
    }
    if ($f['sek'] >= 60) {
        $l[] = ['•', 'Spillet i ' . xp_min($f['sek'])];
    }
    return $l;
}

function xp_min(int $sek): string
{
    $m = (int) round($sek / 60);
    return $m < 60 ? $m . ' min' : intdiv($m, 60) . ' t' . ($m % 60 ? ' ' . ($m % 60) . ' min' : '');
}

/**
 * Mailen til én familie: [emne, tekst, html, headere]. $f kommer fra xp_familie(). Har ingen stand
 * (første gang), fortæller den, hvor langt børnene er nået, i stedet for hvad der er nyt.
 */
function xp_mail(array $k, array $f): array
{
    $fornavn = trim(explode(' ', trim($k['kontakt'] !== '' ? $k['kontakt'] : $k['navn']))[0] ?? '');
    if (preg_match('/^famili/i', $fornavn)) {
        $fornavn = '';
    }
    $nyt = $f['kendt'];
    $niv = $f['niveau'];
    $side = adresse();
    $link = nyhedsbrev_maerk_links($side . '/konto#xp', 'fremskridtsmail', 'fremskridtsmail');
    $afmeld = xp_afmeldlink($k);
    $emne = $nyt ? 'Ugens fremskridt: +' . xp_tal($f['gevinst']) . ' XP' : XP_MAIL_EMNE_STAND;

    $hej = ($fornavn !== '' ? "Hej $fornavn" : 'Hej') . ',';
    $indled = $nyt
        ? 'Her er, hvad jeres børn har opnået i spillene siden sidst.'
        : 'Her er jeres børns stand i spillene lige nu — fremover får I en lille opsummering af, hvad der er nyt.';
    $sum = $nyt
        ? 'I alt +' . xp_tal($f['gevinst']) . ' XP til familien. I har nu ' . xp_tal($f['xp']) . ' XP'
        : 'Familien har i alt ' . xp_tal($f['xp']) . ' XP';
    $sum .= ' og er på niveau ' . $niv['niveau'] . ' (' . $niv['titel'] . '), ' . xp_tal($niv['mangler']) . ' XP fra næste niveau.';
    $hvorfor = 'Du får denne mail, fordi din familiekonto på learnification.dk er sat til at fortælle om børnenes fremskridt. '
        . 'Den indeholder kun det og ingen reklame.';
    $stop = 'Vil du ikke have flere, kan du stoppe dem med ét klik (det rører hverken kontoen eller nyhedsbrevet)';

    // Ren tekst
    $t = "$hej\n\n$indled\n\n";
    foreach ($f['boern'] as $x) {
        $t .= $x['navn'] . ' — ' . xp_tal($x['b']['xp']) . ' XP' . ($x['f']['kendt'] ? ' (+' . xp_tal($x['f']['xp']) . ')' : '') . "\n";
        foreach (($x['f']['kendt'] ? xp_barn_linjer($x) : []) as [$p, $tekst]) {
            $t .= "  $p $tekst\n";
        }
        $t .= "\n";
    }
    $t .= "$sum\n\nSe hele XP-tavlen: $link\n\nVenlig hilsen\nLearnification\n\n-- \n$hvorfor\n$stop: $afmeld\n" . NYHEDSBREV_AFSENDER . "\n";

    // HTML
    $e = fn(string $s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
    $h = '<p style="margin:0 0 16px;">' . $e($hej) . '</p><p style="margin:0 0 20px;">' . $e($indled) . '</p>';
    foreach ($f['boern'] as $x) {
        $h .= '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;background:#f8ecd0;border:2px solid #b8862a;">'
            . '<tr><td style="padding:14px 16px;">'
            . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>'
            . '<td style="font:700 18px Georgia,serif;color:#2a2118;">' . $e($x['ikon'] . ' ' . $x['navn']) . '</td>'
            . '<td align="right" style="font:700 18px Georgia,serif;color:#4b3a78;white-space:nowrap;">' . $e(xp_tal($x['b']['xp'])) . ' XP'
            . ($x['f']['kendt'] ? ' <span style="color:#1f5a36;">+' . $e(xp_tal($x['f']['xp'])) . '</span>' : '') . '</td></tr></table>';
        $linjer = $x['f']['kendt'] ? xp_barn_linjer($x) : [];
        if ($linjer) {
            $h .= '<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px;">';
            foreach ($linjer as [$p, $tekst]) {
                $h .= '<tr><td valign="top" style="width:22px;color:#b8862a;font-size:15px;">' . $e($p) . '</td><td style="font-size:15px;line-height:1.5;">' . $e($tekst) . '</td></tr>';
            }
            $h .= '</table>';
        } elseif ($x['f']['kendt']) {
            $h .= '<p style="margin:8px 0 0;font-size:15px;color:#6b5d4d;">Ikke noget nyt siden sidst.</p>';
        }
        $h .= '</td></tr></table>';
    }
    $h .= '<p style="margin:20px 0;padding:14px 16px;background:#140f1c;color:#ffffff;font-size:15px;line-height:1.5;"><strong style="color:#ffcc4d;">'
        . $e($sum) . '</strong></p>'
        . '<p style="margin:0 0 6px;"><a href="' . $e($link) . '" style="display:inline-block;background:#ffcc4d;color:#140f1c;font-weight:700;'
        . 'text-decoration:none;padding:12px 22px;border:3px solid #b8862a;border-radius:0;">Se XP-tavlen</a></p>';
    $fod = $e($hvorfor) . '<br>' . $e($stop) . ': <a href="' . $e($afmeld) . '" style="color:#6b5d4d;">Stop fremskridtsmails</a>.<br>'
        . $e(NYHEDSBREV_AFSENDER);

    return [$emne, $t, mail_ramme($emne, $h, $fod), ['Reply-To' => MODTAGER, 'List-Unsubscribe' => '<' . $afmeld . '>']];
}

// ------------------------------------------------------------ udsendelsen

/** Indstillinger og status for den automatiske udsendelse (fremskridtsmail.json i datamappen). */
function xp_status(): array
{
    $d = json_decode((string) @file_get_contents(datamappe() . '/fremskridtsmail.json'), true);
    return array_merge(['auto' => false, 'ugedag' => 0], is_array($d) ? $d : []);
}

function xp_gem_status(array $nyt): void
{
    @file_put_contents(datamappe() . '/fremskridtsmail.json',
        json_encode(array_merge(xp_status(), $nyt), JSON_UNESCAPED_UNICODE), LOCK_EX);
}

/** Familiekonti, der må få mailen (ikke afmeldt, ikke spærret, har børn) og ikke har fået en for nylig. */
function xp_mail_hvor(int $interval): string
{
    return "k.type = 'foraelder' AND k.test = 0 AND k.status != 'spaerret' AND k.xp_mail = 1
            AND (k.xp_mail_sendt IS NULL OR k.xp_mail_sendt < " . (time() - $interval) . ')
            AND EXISTS (SELECT 1 FROM elever e JOIN grupper g ON g.id = e.gruppe_id WHERE g.konto_id = k.id)';
}

/** Baseline til en mail: dagen, den forrige blev sendt (eller for en uge siden, hvis der ikke har været nogen). */
function xp_mail_baseline(array $k): string
{
    return date('Y-m-d', !empty($k['xp_mail_sendt']) ? (int) $k['xp_mail_sendt'] : time() - XP_UGE);
}

/**
 * Send til de familier, der er klar, fra id'et efter $efter. Familien bliver markeret, FØR mailen går, så to
 * kørsler ikke sender den samme; fejler den, sættes det tilbage. Med $kun_aktive springes familier over,
 * hvor ingen har fået XP siden sidst — dem rører den ikke ved, så de får mailen en anden gang.
 * Svar: sendt, sprunget, fejlet, efter (næste id), tilbage (flere endnu), fejl.
 */
function xp_mail_koer(string $hvem, int $interval, bool $kun_aktive, int $efter = 0, int $maks = 25): array
{
    $sendt = $sprunget = $fejlet = 0;
    $fejl = '';
    $stop = microtime(true) + 20;
    $sidste = $efter;
    $behandlet = 0;
    foreach (alle('SELECT * FROM konti k WHERE ' . xp_mail_hvor($interval) . ' AND k.id > ? ORDER BY k.id LIMIT ' . $maks, [$efter]) as $k) {
        $sidste = (int) $k['id'];
        $behandlet++;
        $f = xp_familie($sidste, xp_mail_baseline($k));
        if ($kun_aktive && ($f['kendt'] ? $f['gevinst'] <= 0 : $f['xp'] <= 0)) {
            $sprunget++;
        } else {
            $foer = $k['xp_mail_sendt'];
            if (kør('UPDATE konti SET xp_mail_sendt = ? WHERE id = ? AND (xp_mail_sendt IS NULL OR xp_mail_sendt < ?)',
                    [time(), $k['id'], time() - $interval])) {
                [$emne, $tekst, $html, $headere] = xp_mail($k, $f);
                if (send_mail($k['email'], $emne, $tekst, $html, $headere)) {
                    $sendt++;
                    foreach ($f['boern'] as $x) {
                        xp_gem_stand($x['id'], $x['b'], true);
                    }
                } else {
                    kør('UPDATE konti SET xp_mail_sendt = ? WHERE id = ?', [$foer, $k['id']]);
                    $fejlet++;
                    $fejl = post_fejl();
                }
            }
        }
        if (microtime(true) > $stop) {
            break;
        }
    }
    $tilbage = (int) vaerdi('SELECT COUNT(*) FROM konti k WHERE ' . xp_mail_hvor($interval) . ' AND k.id > ?', [$sidste]);
    $koersel = ['tid' => time(), 'hvem' => $hvem, 'sendt' => $sendt, 'sprunget' => $sprunget, 'fejlet' => $fejlet, 'fejl' => $fejl];
    if ($sendt || $fejlet) {
        xp_gem_status(['koersel' => $koersel]);
    }
    return $koersel + ['efter' => $sidste, 'tilbage' => $tilbage, 'behandlet' => $behandlet];
}

/** Gem dagens stand for alle børn på familiekonti — højst én gang pr. dag (kaldes af cronjobbet). */
function xp_stand_alle(): int
{
    if ((xp_status()['stand'] ?? '') === date('Y-m-d')) {
        return 0;
    }
    $n = 0;
    foreach (alle("SELECT e.id FROM elever e JOIN grupper g ON g.id = e.gruppe_id JOIN konti k ON k.id = g.konto_id
                   WHERE k.type = 'foraelder' AND k.test = 0 AND k.status != 'spaerret'") as $e) {
        xp_gem_stand((int) $e['id'], xp_barn((int) $e['id']));
        $n++;
    }
    xp_gem_status(['stand' => date('Y-m-d')]);
    return $n;
}

/**
 * Cronjobbet (api/paamind.php) kalder den hver time. Sender kun, hvis administratoren har slået det til, og kun
 * på den valgte ugedag inden for XP_MAIL_TIMER. Svar: tekst til cronjobbets log.
 */
function xp_mail_cron(): string
{
    $s = xp_status();
    if (!$s['auto']) {
        return '';
    }
    if ((int) date('w') !== (int) $s['ugedag'] || (int) date('G') < XP_MAIL_TIMER[0] || (int) date('G') >= XP_MAIL_TIMER[1]) {
        return '';
    }
    $sendt = $fejlet = 0;
    $efter = 0;
    $stop = microtime(true) + 40;
    do {
        $r = xp_mail_koer('cron', XP_MAIL_INTERVAL, true, $efter);
        $sendt += $r['sendt'];
        $fejlet += $r['fejlet'];
        $efter = $r['efter'];
    } while ($r['tilbage'] > 0 && $r['behandlet'] > 0 && microtime(true) < $stop);
    return ($sendt || $fejlet) ? "Fremskridtsmails sendt: $sendt, fejlet: $fejlet. " : '';
}
