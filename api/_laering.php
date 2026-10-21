<?php
/**
 * "Elevernes læring": hvad en klasse har løst, hvor godt det gik, og hvor meget af tiden
 * der gik med andet end opgaver. Bruges af api/klasse.php (skolekontoen på /konto og /admin).
 *
 * Kilderne er det, spillene allerede gemmer i gemte_spil.data:
 *   Regnehelten  S.res.svar   én post pr. opgave (emne, spørgsmål, facit, forsøg, første forsøg, t)
 *                S.mastery    niveau pr. læringstrin (Bloom)
 *   Runeborg     S.stats      {område: {n, first}}
 *                S.solved     {opgavenøgle: true}  — spørgsmålet slås op i opgavekatalog.json
 *                S.log        (nyt) [{t, k, a, f, n}] pr. opgave — først i spil fra 21. okt. 2026
 * og spilletiden fra tabellen sessioner. Intet her forlader serveren.
 *
 * Tid uden opgaver:
 *   målt     — når spillene har gemt tidspunkt pr. opgave (t): summen af pauser over 90 sekunder
 *              mellem to løste opgaver (pauser over 30 minutter er en anden omgang og tæller ikke)
 *   anslået  — ellers: aktiv tid minus opgaver × en typisk tid pr. opgave i klassen (25. percentil
 *              af tid pr. opgave, 15–120 sek.). Det er dialog, læsning og at gå rundt, ikke et facit.
 */

declare(strict_types=1);

const OPGAVE_TYPISK_SEK = 90;          // en pause over dette mellem to opgaver tæller som "ikke opgaver"
const OMGANG_PAUSE_SEK = 1800;         // længere pause = ny omgang, tæller slet ikke

/** Regnebogens emner (spil/regnehelten/js/content.js, BOG) — id => [titel, kort forklaring]. */
const REGNEBOG = [
    'plus' => ['Plus og minus', 'At lægge til og trække fra'],
    'gange' => ['Gangetabellen', 'Mange lige store bunker'],
    'division' => ['Division', 'At dele ligeligt'],
    'halve' => ['Halve og fjerdedele', 'Dele af et tal'],
    'penge' => ['Penge og byttepenge', 'Når du handler'],
    'monstre' => ['Mønstre og talrækker', 'Hvad kommer så?'],
    'areal' => ['Omkreds og areal', 'Rundt om og indeni'],
    'raekkefolge' => ['Hvad regner man først?', 'Regnearternes orden'],
    'tjek' => ['Tjek dit svar', 'Gode vaner'],
];

const BLOOM_NAVN = [
    'HUSK' => 'Tal-fakta', 'FORSTÅ' => 'Forstå opgaven', 'ANVEND' => 'Handle ind',
    'ANALYSÉR' => 'Mønstre og flere trin', 'VURDÉR' => 'Tjekke et svar', 'SKAB' => 'Bygge sit eget regnestykke',
];

function kort_tekst($x, int $n): string
{
    $x = (string) $x;
    return function_exists('mb_substr') ? mb_substr($x, 0, $n, 'UTF-8') : substr($x, 0, $n);
}

/** Runeborgs opgavekatalog (tools/opgavekatalog.py): ['omraader' => [...], 'opgaver' => [nøgle => ...]]. */
function opgavekatalog(): array
{
    static $k = null;
    if ($k === null) {
        $k = json_decode((string) @file_get_contents(__DIR__ . '/opgavekatalog.json'), true);
        if (!is_array($k)) {
            $k = ['omraader' => [], 'opgaver' => []];
        }
    }
    return $k;
}

/** Ét gemt spil som array — eller null, hvis det ikke findes, er startet forfra eller ikke kan læses. */
function laer_spil_data(?string $json): ?array
{
    $d = $json === null ? null : json_decode($json, true);
    return is_array($d) && empty($d['slettet']) ? $d : null;
}

/**
 * Alt for én elev ud fra de gemte spil. $gemt = [spil => data-array]. Giver tal, emner og alle
 * opgaver (til detaljer og Excel) — kald med $med_opgaver = false, når kun tallene skal bruges.
 */
function laer_elev_ud_fra_spil(array $gemt, bool $med_opgaver): array
{
    $katalog = opgavekatalog();
    $opgaver = [];          // alle enkelte opgaver
    $omr = [];              // "spil:id" => ['spil','id','navn','n','foerste']
    $tider = [];            // unix-tidspunkter for løste opgaver
    $trin = [];

    // ---- Regnehelten
    if (isset($gemt['regnehelten'])) {
        $d = $gemt['regnehelten'];
        foreach ((array) ($d['res']['svar'] ?? []) as $s) {
            if (!is_array($s)) {
                continue;
            }
            $emne = (string) ($s['emne'] ?? '') ?: 'andet';
            $id = 'regnehelten:' . $emne;
            $omr[$id] = $omr[$id] ?? ['spil' => 'regnehelten', 'id' => $emne,
                'navn' => REGNEBOG[$emne][0] ?? $emne, 'n' => 0, 'foerste' => 0, 'klaret' => 0];
            $omr[$id]['n']++;
            $omr[$id]['foerste'] += !empty($s['foerste_forsoeg']) ? 1 : 0;
            $omr[$id]['klaret'] += !empty($s['klaret']) ? 1 : 0;
            $t = isset($s['t']) ? (int) $s['t'] : null;
            if ($t) {
                $tider[] = $t;
            }
            if ($med_opgaver) {
                $opgaver[] = ['spil' => 'regnehelten', 'omraade_id' => $emne, 'omraade' => REGNEBOG[$emne][0] ?? $emne,
                    'trin' => (string) ($s['trin'] ?? ''), 'type' => (string) ($s['type'] ?? ''),
                    'sted' => (string) ($s['scene'] ?? ''), 'spoergsmaal' => kort_tekst($s['spoergsmaal'] ?? '', 140),
                    'facit' => kort_tekst($s['facit'] ?? '', 80), 'forsoeg' => (int) ($s['forsoeg'] ?? 0),
                    'foerste' => !empty($s['foerste_forsoeg']) ? 1 : 0, 'klaret' => !empty($s['klaret']) ? 1 : 0, 't' => $t];
            }
        }
        foreach ((array) ($d['mastery'] ?? []) as $bloom => $niveau) {
            $trin[(string) $bloom] = (int) $niveau;
        }
    }

    // ---- Runeborg
    if (isset($gemt['runeborg'])) {
        $d = $gemt['runeborg'];
        $stats = (array) ($d['stats'] ?? []);
        foreach ($stats as $a => $st) {
            $id = 'runeborg:' . $a;
            $omr[$id] = ['spil' => 'runeborg', 'id' => (string) $a, 'navn' => $katalog['omraader'][$a]['navn'] ?? (string) $a,
                'n' => (int) ($st['n'] ?? 0), 'foerste' => (int) ($st['first'] ?? 0), 'klaret' => (int) ($st['n'] ?? 0)];
        }
        $log = [];
        foreach ((array) ($d['log'] ?? []) as $l) {
            if (is_array($l) && isset($l['k'])) {
                $log[(string) $l['k']] = $l;
                if (!empty($l['t'])) {
                    $tider[] = (int) $l['t'];
                }
            }
        }
        if ($med_opgaver) {
            foreach (array_keys((array) ($d['solved'] ?? [])) as $nogle) {
                $o = $katalog['opgaver'][$nogle] ?? null;
                $l = $log[$nogle] ?? null;
                $a = (string) ($o['omraade'] ?? ($l['a'] ?? ''));
                $opgaver[] = ['spil' => 'runeborg', 'omraade_id' => $a, 'omraade' => $katalog['omraader'][$a]['navn'] ?? $a,
                    'trin' => '', 'type' => (string) ($o['type'] ?? ''), 'sted' => (string) $nogle,
                    'spoergsmaal' => kort_tekst($o['q'] ?? '(opgaven findes ikke længere)', 140), 'facit' => '',
                    'forsoeg' => $l ? (int) ($l['n'] ?? 0) : null,
                    'foerste' => $l ? (!empty($l['f']) ? 1 : 0) : null, 'klaret' => 1, 't' => $l ? (int) ($l['t'] ?? 0) ?: null : null];
            }
        }
    }

    $n = $foerste = 0;
    foreach ($omr as $o) {
        $n += $o['n'];
        $foerste += $o['foerste'];
    }
    sort($tider);
    $maalt = 0;
    for ($i = 1; $i < count($tider); $i++) {
        $hul = $tider[$i] - $tider[$i - 1];
        if ($hul > OPGAVE_TYPISK_SEK && $hul <= OMGANG_PAUSE_SEK) {
            $maalt += $hul - OPGAVE_TYPISK_SEK;
        }
    }
    return ['opgaver_n' => $n, 'foerste' => $foerste, 'omraader' => array_values($omr), 'trin' => $trin,
            'opgaver' => $opgaver, 'har_tider' => count($tider) >= 2, 'tider_n' => count($tider), 'vandre_maalt' => $maalt];
}

/** De gemte spil for en elev som [spil => array]. */
function laer_gemt_for_elev(int $elev_id): array
{
    $ud = [];
    foreach (alle('SELECT spil, data FROM gemte_spil WHERE elev_id = ?', [$elev_id]) as $r) {
        $d = laer_spil_data($r['data']);
        if ($d) {
            $ud[$r['spil']] = $d;
        }
    }
    return $ud;
}

/** Opgaverne for én elev (til udfoldet visning). */
function laering_elev_opgaver(int $elev_id): array
{
    return laer_elev_ud_fra_spil(laer_gemt_for_elev($elev_id), true)['opgaver'];
}

function percentil(array $v, float $p): float
{
    sort($v);
    if (!$v) {
        return 0.0;
    }
    return (float) $v[(int) floor($p * (count($v) - 1))];
}

/**
 * En klasse samlet: tal pr. elev, pr. område og for hele klassen. Eleverne er [id => række] fra
 * tabellen elever. $med_opgaver tager alle enkelte opgaver med (til Excel).
 */
function laering_klasse(array $gruppe, bool $med_opgaver = false): array
{
    $elever = alle('SELECT * FROM elever WHERE gruppe_id = ? ORDER BY kaldenavn', [$gruppe['id']]);
    $gemt = [];
    foreach (alle('SELECT g.elev_id, g.spil, g.data FROM gemte_spil g JOIN elever e ON e.id = g.elev_id WHERE e.gruppe_id = ?',
                  [$gruppe['id']]) as $r) {
        $d = laer_spil_data($r['data']);
        if ($d) {
            $gemt[(int) $r['elev_id']][$r['spil']] = $d;
        }
    }
    // Spørgeskemasvar (kun testrunder har dem): seneste pr. elev
    $skema = [];
    foreach (alle('SELECT t.elev_id, t.svar FROM testsvar t JOIN elever e ON e.id = t.elev_id WHERE e.gruppe_id = ? ORDER BY t.tid',
                  [$gruppe['id']]) as $r) {
        $s = json_decode((string) $r['svar'], true);
        if (is_array($s)) {
            $skema[(int) $r['elev_id']] = $s;
        }
    }

    $rækker = [];
    foreach ($elever as $e) {
        $id = (int) $e['id'];
        $u = laer_elev_ud_fra_spil($gemt[$id] ?? [], $med_opgaver);
        $tid = spilletid('elev_id = ?', [$id]);
        $kap = [];
        foreach (['runeborg', 'regnehelten'] as $spil) {
            $d = $gemt[$id][$spil] ?? null;
            $kap[$spil] = $d ? ['kapitel' => max(1, min(KAPITLER, (int) ($d['kap'] ?? 1))), 'klaret' => count((array) ($d['klaret'] ?? []))] : null;
        }
        $rækker[$id] = ['id' => $id, 'navn' => $e['kaldenavn'], 'kode' => $e['kode'] ?? '',
            'aktiv_sek' => $tid['i_alt'], 'sek_spil' => array_map(fn($x) => $x['i_alt'], $tid['spil']),
            'opgaver' => $u['opgaver_n'], 'foerste' => $u['foerste'],
            'pct' => $u['opgaver_n'] ? (int) round(100 * $u['foerste'] / $u['opgaver_n']) : null,
            'omraader' => $u['omraader'], 'trin' => $u['trin'], 'kapitler' => $kap,
            'har_tider' => $u['har_tider'], 'vandre_maalt' => $u['vandre_maalt'],
            'skema' => $skema[$id] ?? null, 'opgaveliste' => $u['opgaver']];
    }

    // Typisk tid pr. opgave i klassen = 25. percentil blandt dem med mindst 5 opgaver
    $rater = [];
    foreach ($rækker as $r) {
        if ($r['opgaver'] >= 5 && $r['aktiv_sek'] > 0) {
            $rater[] = $r['aktiv_sek'] / $r['opgaver'];
        }
    }
    $typisk = $rater ? max(15.0, min(120.0, percentil($rater, 0.25))) : 60.0;
    foreach ($rækker as &$r) {
        if ($r['har_tider']) {
            $r['vandre_sek'] = $r['vandre_maalt'];
            $r['vandre_type'] = 'maalt';
        } else {
            $r['vandre_sek'] = (int) max(0, round($r['aktiv_sek'] - $r['opgaver'] * $typisk));
            $r['vandre_type'] = 'anslaaet';
        }
        $r['vandre_sek'] = min($r['vandre_sek'], $r['aktiv_sek']);
        $r['opgave_sek'] = max(0, $r['aktiv_sek'] - $r['vandre_sek']);
        $r['pr10'] = $r['aktiv_sek'] > 0 ? round($r['opgaver'] / ($r['aktiv_sek'] / 600), 1) : null;
    }
    unset($r);

    // Pr. område for hele klassen
    $pr_omr = [];
    foreach ($rækker as $r) {
        foreach ($r['omraader'] as $o) {
            $id = $o['spil'] . ':' . $o['id'];
            $pr_omr[$id] = $pr_omr[$id] ?? ['spil' => $o['spil'], 'id' => $o['id'], 'navn' => $o['navn'],
                'elever' => 0, 'n' => 0, 'foerste' => 0];
            $pr_omr[$id]['elever']++;
            $pr_omr[$id]['n'] += $o['n'];
            $pr_omr[$id]['foerste'] += $o['foerste'];
        }
    }
    $katalog = opgavekatalog();
    $antal_rb = [];
    foreach ($katalog['opgaver'] as $o) {
        $antal_rb[$o['omraade']] = ($antal_rb[$o['omraade']] ?? 0) + 1;
    }
    $oversigt = [];
    foreach (REGNEBOG as $id => [$titel, $tag]) {
        $x = $pr_omr['regnehelten:' . $id] ?? ['elever' => 0, 'n' => 0, 'foerste' => 0];
        $oversigt[] = ['spil' => 'regnehelten', 'id' => $id, 'navn' => $titel, 'forklaring' => $tag,
            'elever' => $x['elever'], 'n' => $x['n'], 'foerste' => $x['foerste'], 'opgaver_i_spillet' => null];
    }
    foreach ($katalog['omraader'] as $id => $o) {
        $x = $pr_omr['runeborg:' . $id] ?? ['elever' => 0, 'n' => 0, 'foerste' => 0];
        $oversigt[] = ['spil' => 'runeborg', 'id' => $id, 'navn' => $o['navn'],
            'forklaring' => $o['kan'] ? 'Eleven lærer at ' . $o['kan'] : '',
            'elever' => $x['elever'], 'n' => $x['n'], 'foerste' => $x['foerste'], 'opgaver_i_spillet' => $antal_rb[$id] ?? 0];
    }

    $aktive = array_filter($rækker, fn($r) => $r['aktiv_sek'] > 0);
    $sum = fn(string $f) => array_sum(array_column($rækker, $f));
    $n = $sum('opgaver');
    $svageste = null;
    foreach ($oversigt as $o) {
        if ($o['n'] >= 10 && ($svageste === null || $o['foerste'] / $o['n'] < $svageste['foerste'] / $svageste['n'])) {
            $svageste = $o;
        }
    }
    return [
        'gruppe' => ['id' => (int) $gruppe['id'], 'navn' => $gruppe['navn']],
        'klasse' => [
            'elever' => count($rækker), 'aktive' => count($aktive), 'opgaver' => $n,
            'pct' => $n ? (int) round(100 * $sum('foerste') / $n) : null,
            'aktiv_sek' => $sum('aktiv_sek'), 'vandre_sek' => $sum('vandre_sek'),
            'vandre_type' => $rækker && !in_array('anslaaet', array_column($rækker, 'vandre_type'), true) ? 'maalt' : 'anslaaet',
            'typisk_sek' => (int) round($typisk),
            'svageste' => $svageste ? ['navn' => $svageste['navn'], 'pct' => (int) round(100 * $svageste['foerste'] / $svageste['n'])] : null,
        ],
        'elever' => array_values(array_map(function ($r) use ($med_opgaver) {
            if (!$med_opgaver) {
                unset($r['opgaveliste']);
            }
            return $r;
        }, $rækker)),
        'omraader' => $oversigt,
    ];
}

// ---------------------------------------------------------------- Excel

/**
 * En ægte .xlsx uden biblioteker: SpreadsheetML i en zip uden komprimering (store).
 * $faner = [fanenavn => [række => [celle, ...]]]; første række er overskrifter.
 */
function xlsx_bygg(array $faner): string
{
    $x = fn(string $s) => htmlspecialchars($s, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    $kol = function (int $i): string {
        $s = '';
        for ($i++; $i > 0; $i = intdiv($i - 1, 26)) {
            $s = chr(65 + ($i - 1) % 26) . $s;
        }
        return $s;
    };
    $filer = [];
    $ark_xml = '';
    $ark_rel = '';
    $ark_ct = '';
    $nr = 0;
    foreach ($faner as $navn => $rækker) {
        $nr++;
        $bredde = [];
        $rx = '';
        foreach (array_values($rækker) as $ri => $celler) {
            $cx = '';
            foreach (array_values($celler) as $ci => $v) {
                $ref = $kol($ci) . ($ri + 1);
                $stil = $ri === 0 ? ' s="1"' : '';
                if ($v === null || $v === '') {
                    continue;
                }
                if (is_int($v) || is_float($v)) {
                    $cx .= "<c r=\"$ref\"$stil><v>" . $v . '</v></c>';
                    $l = strlen((string) $v);
                } else {
                    $t = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', (string) $v) ?? '';
                    $cx .= "<c r=\"$ref\"$stil t=\"inlineStr\"><is><t xml:space=\"preserve\">" . $x($t) . '</t></is></c>';
                    $l = function_exists('mb_strlen') ? mb_strlen($t, 'UTF-8') : strlen($t);
                }
                $bredde[$ci] = max($bredde[$ci] ?? 8, min(60, $l + 2));
            }
            $rx .= '<row r="' . ($ri + 1) . '">' . $cx . '</row>';
        }
        $cols = '';
        foreach ($bredde as $ci => $b) {
            $cols .= '<col min="' . ($ci + 1) . '" max="' . ($ci + 1) . '" width="' . $b . '" customWidth="1"/>';
        }
        $filer["xl/worksheets/sheet$nr.xml"] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            . '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
            . ($cols ? "<cols>$cols</cols>" : '') . "<sheetData>$rx</sheetData></worksheet>";
        $ark_xml .= "<sheet name=\"" . $x(kort_tekst(preg_replace('/[\\\\\/?*\[\]:]/', ' ', (string) $navn) ?? '', 31)) . "\" sheetId=\"$nr\" r:id=\"rId$nr\"/>";
        $ark_rel .= "<Relationship Id=\"rId$nr\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet$nr.xml\"/>";
        $ark_ct .= "<Override PartName=\"/xl/worksheets/sheet$nr.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>";
    }
    $ark_rel .= '<Relationship Id="rIdS" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>';
    $filer['[Content_Types].xml'] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        . '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        . '<Default Extension="xml" ContentType="application/xml"/>'
        . '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        . '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
        . $ark_ct . '</Types>';
    $filer['_rels/.rels'] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
    $filer['xl/workbook.xml'] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        . "<sheets>$ark_xml</sheets></workbook>";
    $filer['xl/_rels/workbook.xml.rels'] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' . $ark_rel . '</Relationships>';
    $filer['xl/styles.xml'] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        . '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
        . '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'
        . '<fill><patternFill patternType="solid"><fgColor rgb="FFFFCC4D"/><bgColor indexed="64"/></patternFill></fill></fills>'
        . '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
        . '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
        . '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
        . '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>'
        . '</styleSheet>';
    return zip_gem($filer);
}

/** En zip uden komprimering. Filnavne er ASCII. */
function zip_gem(array $filer): string
{
    $ud = '';
    $central = '';
    $n = 0;
    $dato = 0x5A21;   // 2025-01-01
    foreach ($filer as $navn => $indhold) {
        $crc = crc32($indhold);
        $len = strlen($indhold);
        $hode = pack('VvvvvvVVVvv', 0x04034b50, 20, 0x0800, 0, 0, $dato, $crc, $len, $len, strlen($navn), 0);
        $central .= pack('VvvvvvvVVVvvvvvVV', 0x02014b50, 20, 20, 0x0800, 0, 0, $dato, $crc, $len, $len, strlen($navn), 0, 0, 0, 0, 0, strlen($ud)) . $navn;
        $ud .= $hode . $navn . $indhold;
        $n++;
    }
    return $ud . $central . pack('VvvvvVVv', 0x06054b50, 0, 0, $n, $n, strlen($central), strlen($ud), 0);
}

/** "12 min 30 s" → til Excel som minutter med én decimal. */
function min1(int $sek): float
{
    return round($sek / 60, 1);
}

/** Fanerne i rådata-filen til en klasse. */
function laering_xlsx_faner(array $L): array
{
    $spil = ['runeborg' => 'Runeborg', 'regnehelten' => 'Regnehelten'];
    $elever = [['Elev', 'Aktiv tid (min)', 'Heraf Runeborg (min)', 'Heraf Regnehelten (min)', 'Opgaver løst', 'Rigtige i 1. forsøg',
                '% rigtige i 1. forsøg', 'Opgaver pr. 10 min', 'Tid uden opgaver (min)', 'Tid uden opgaver er', 'Runeborg kapitel', 'Regnehelten kapitel']];
    $emner = [['Elev', 'Spil', 'Emne / område', 'Opgaver', 'Rigtige i 1. forsøg', '% rigtige i 1. forsøg']];
    $opg = [['Elev', 'Spil', 'Emne / område', 'Læringstrin', 'Opgavetype', 'Sted / nøgle', 'Spørgsmål', 'Rigtigt svar',
             'Forsøg', 'Rigtigt i 1. forsøg', 'Klaret', 'Tidspunkt']];
    $skema = [['Elev', 'Hvor sjovt var det?', 'Hvordan var opgaverne?', 'Forstod du, hvad du skulle?', 'Lærte du noget nyt?',
               'Vil du spille igen?', 'Hvilket spil bedst?']];
    foreach ($L['elever'] as $e) {
        $elever[] = [$e['navn'], min1($e['aktiv_sek']), min1($e['sek_spil']['runeborg'] ?? 0), min1($e['sek_spil']['regnehelten'] ?? 0),
            $e['opgaver'], $e['foerste'], $e['pct'], $e['pr10'], min1($e['vandre_sek']),
            $e['vandre_type'] === 'maalt' ? 'målt' : 'anslået',
            $e['kapitler']['runeborg']['kapitel'] ?? '', $e['kapitler']['regnehelten']['kapitel'] ?? ''];
        foreach ($e['omraader'] as $o) {
            $emner[] = [$e['navn'], $spil[$o['spil']] ?? $o['spil'], $o['navn'], $o['n'], $o['foerste'],
                $o['n'] ? (int) round(100 * $o['foerste'] / $o['n']) : null];
        }
        foreach ($e['opgaveliste'] ?? [] as $o) {
            $opg[] = [$e['navn'], $spil[$o['spil']] ?? $o['spil'], $o['omraade'], $o['trin'], $o['type'], $o['sted'], $o['spoergsmaal'],
                $o['facit'], $o['forsoeg'], $o['foerste'] === null ? '' : ($o['foerste'] ? 'ja' : 'nej'),
                $o['klaret'] === null ? '' : ($o['klaret'] ? 'ja' : 'nej'), $o['t'] ? date('Y-m-d H:i:s', (int) $o['t']) : ''];
        }
        if ($e['skema']) {
            $s = $e['skema'];
            $skema[] = [$e['navn'], $s['sjovt'] ?? '', $s['svaerhed'] ?? '', $s['forstod'] ?? '', $s['laerte'] ?? '', $s['igen'] ?? '', $s['bedst'] ?? ''];
        }
    }
    $om = [['Spil', 'Emne / område', 'Hvad det træner', 'Elever der har prøvet det', 'Opgaver løst', 'Rigtige i 1. forsøg', '% rigtige i 1. forsøg', 'Opgaver i spillet']];
    foreach ($L['omraader'] as $o) {
        $om[] = [$spil[$o['spil']] ?? $o['spil'], $o['navn'], $o['forklaring'], $o['elever'], $o['n'], $o['foerste'],
            $o['n'] ? (int) round(100 * $o['foerste'] / $o['n']) : null, $o['opgaver_i_spillet'] ?? 'genereres af spillet'];
    }
    $forklaring = [['Kolonne', 'Hvad det betyder'],
        ['Aktiv tid', 'Tid, hvor spillet var åbent, i forgrunden og barnet rørte skærmen eller tastaturet (målt hvert 30. sekund).'],
        ['Rigtige i 1. forsøg', 'Opgaver, der blev løst rigtigt i første forsøg. Det er det bedste mål for, hvad barnet kan uden hjælp.'],
        ['Opgaver pr. 10 min', 'Hvor mange opgaver barnet løser i gennemsnit pr. 10 aktive minutter.'],
        ['Tid uden opgaver', 'Dialog, læsning, bøger og at gå rundt i spillets verden.'],
        ['målt', 'Spillet har gemt et tidspunkt pr. løst opgave. Tid uden opgaver er summen af pauser over ' . OPGAVE_TYPISK_SEK . ' sekunder mellem to opgaver.'],
        ['anslået', 'Spillet gemte ikke tidspunkter, da klassen spillede. Tid uden opgaver er aktiv tid minus antal opgaver × ' . $L['klasse']['typisk_sek'] . ' sek. (den typiske tid pr. opgave for de mest fokuserede elever i klassen). Brug det som et fingerpeg, ikke et facit.'],
        ['Runeborg-opgaver', 'Før tidspunkter blev gemt, kan vi se hvilke opgaver der er løst og hvor mange der var rigtige i 1. forsøg pr. område, men ikke pr. opgave.'],
        ['Spørgeskema', 'Barnets egne svar på de seks smiley-spørgsmål (kun i testrunder).']];
    return ['Elever' => $elever, 'Emner' => $emner, 'Opgaver' => $opg, 'Opgaverne i spillene' => $om, 'Spørgeskema' => $skema, 'Forklaring' => $forklaring];
}
