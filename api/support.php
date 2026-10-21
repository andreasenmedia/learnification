<?php
/**
 * Hjælp og support til voksne: sager fra hjælpeboblen (assets/hjaelp.js) og administratorens svar.
 * Børn har ingen adgang — alle handlinger kræver en voksen, der er logget ind.
 *
 * Voksne:
 *   GET  start                  {vis, navn, email, aabne} — boblen vises kun, hvis vis er sand
 *   GET  mine                   egne sager med beskeder
 *   POST opret {kategori, tekst, side, hjemmeside}      ny sag (hjemmeside er en honningkrukke)
 *   POST svar_bruger {id, tekst}  skriv mere i en egen sag
 * Administrator (/admin#support):
 *   GET  liste {status}         alle sager (ny, i_gang, loest eller tom for alle)
 *   GET  sag {id}               én sag med beskeder og kontoen bag
 *   POST svar {id, tekst, loest}  svar brugeren på mail og gem svaret i sagen
 *   POST status {id, status}    ny / i_gang / loest
 *   POST slet {id}              slet en sag
 *
 * Sager gemmes, til de har været løst i 2 år (ryddes af api/paamind.php) — se /privatliv.
 */

declare(strict_types=1);
require __DIR__ . '/_kerne.php';

const SUPPORT_KATEGORIER = [
    'konto' => 'Konto og login', 'boern' => 'Børn og koder', 'spil' => 'Spillene', 'niveau' => 'Niveau og klassetrin',
    'klasse' => 'Klasser og elever', 'data' => 'Data og privatliv', 'fejl' => 'Noget virker ikke', 'andet' => 'Andet',
];
const SUPPORT_STATUS = ['ny', 'i_gang', 'loest'];
const SUPPORT_TEKST_MAKS = 3000;

/** En længere tekst med linjeskift, renset for styretegn. */
function support_tekst(string $navn): string
{
    $v = input()[$navn] ?? '';
    if (!is_scalar($v)) {
        return '';
    }
    $v = str_replace("\r\n", "\n", (string) $v);
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v) ?? '';
    $v = trim($v);
    return function_exists('mb_substr') ? mb_substr($v, 0, SUPPORT_TEKST_MAKS, 'UTF-8') : substr($v, 0, SUPPORT_TEKST_MAKS);
}

function support_kort(string $t, int $n): string
{
    $t = preg_replace('/\s+/u', ' ', $t) ?? $t;
    return function_exists('mb_substr') ? mb_substr($t, 0, $n, 'UTF-8') : substr($t, 0, $n);
}

function support_sag_ud(array $s, bool $med_konto = false): array
{
    $ud = ['id' => (int) $s['id'], 'kategori' => $s['kategori'], 'kategori_navn' => SUPPORT_KATEGORIER[$s['kategori']] ?? $s['kategori'],
           'emne' => $s['emne'], 'status' => $s['status'], 'side' => $s['side'],
           'oprettet' => (int) $s['oprettet'], 'opdateret' => (int) $s['opdateret']];
    if ($med_konto) {
        $ud['konto'] = ['id' => (int) $s['konto_id'], 'navn' => $s['konto_navn'] ?? '', 'email' => $s['konto_email'] ?? '', 'type' => $s['konto_type'] ?? ''];
    }
    return $ud;
}

function support_beskeder(int $sag): array
{
    return array_map(fn($b) => ['fra' => $b['fra'], 'tekst' => $b['tekst'], 'tid' => (int) $b['tid']],
                     alle('SELECT fra, tekst, tid FROM support_beskeder WHERE sag_id = ? ORDER BY id', [$sag]));
}

/** Mail til Learnification om en ny sag eller et nyt svar fra brugeren. */
function support_giv_besked(array $konto, array $sag, string $tekst, bool $ny): void
{
    $emne = ($ny ? 'Ny supportsag: ' : 'Nyt svar på sag: ') . $sag['emne'];
    $krop = ($ny ? 'Ny sag' : 'Nyt svar') . " #{$sag['id']} fra {$konto['navn']} ({$konto['email']}, {$konto['type']})\n"
        . 'Kategori: ' . (SUPPORT_KATEGORIER[$sag['kategori']] ?? $sag['kategori']) . "\n"
        . ($sag['side'] ? 'Side: ' . $sag['side'] . "\n" : '')
        . "\n" . $tekst . "\n\nSvar i /admin#support — eller direkte på denne mail.";
    send_mail(MODTAGER, $emne, $krop, null, ['Reply-To' => $konto['email']]);
}

$h = handling();
$x = hvem();

// ------------------------------------------------------------ administrator
if (in_array($h, ['liste', 'sag', 'svar', 'status', 'slet'], true)) {
    $admin = kraev_admin();
    if ($h === 'liste') {
        $status = felt('status', 10);
        $sql = 'SELECT s.*, k.navn AS konto_navn, k.email AS konto_email, k.type AS konto_type FROM support_sager s JOIN konti k ON k.id = s.konto_id';
        $p = [];
        if (in_array($status, SUPPORT_STATUS, true)) {
            $sql .= ' WHERE s.status = ?';
            $p[] = $status;
        }
        $sql .= ' ORDER BY s.opdateret DESC LIMIT 300';
        $tal = [];
        foreach (alle('SELECT status, COUNT(*) AS n FROM support_sager GROUP BY status') as $r) {
            $tal[$r['status']] = (int) $r['n'];
        }
        svar(['ok' => true, 'sager' => array_map(fn($s) => support_sag_ud($s, true), alle($sql, $p)), 'tal' => $tal,
              'kategorier' => SUPPORT_KATEGORIER]);
    }
    $s = en('SELECT s.*, k.navn AS konto_navn, k.email AS konto_email, k.type AS konto_type FROM support_sager s JOIN konti k ON k.id = s.konto_id WHERE s.id = ?',
            [tal('id')]);
    if (!$s) {
        fejl('Sagen findes ikke.', 404);
    }
    if ($h === 'sag') {
        svar(['ok' => true, 'sag' => support_sag_ud($s, true), 'beskeder' => support_beskeder((int) $s['id'])]);
    }
    kraev_egen_side();
    if ($h === 'status') {
        $nyt = felt('status', 10);
        if (!in_array($nyt, SUPPORT_STATUS, true)) {
            fejl('Ukendt status.');
        }
        kør('UPDATE support_sager SET status = ?, opdateret = ? WHERE id = ?', [$nyt, time(), $s['id']]);
        svar(['ok' => true]);
    }
    if ($h === 'slet') {
        kør('DELETE FROM support_beskeder WHERE sag_id = ?', [$s['id']]);
        kør('DELETE FROM support_sager WHERE id = ?', [$s['id']]);
        svar(['ok' => true]);
    }
    // svar
    $tekst = support_tekst('tekst');
    if ($tekst === '') {
        fejl('Skriv et svar først.');
    }
    $nu = time();
    kør('INSERT INTO support_beskeder (sag_id, fra, tekst, tid) VALUES (?, ?, ?, ?)', [$s['id'], 'admin', $tekst, $nu]);
    kør('UPDATE support_sager SET status = ?, opdateret = ? WHERE id = ?', [!empty(input()['loest']) ? 'loest' : 'i_gang', $nu, $s['id']]);
    require_once __DIR__ . '/_nyhedsbrev.php';
    $link = 'https://learnification.dk/konto';
    $html = mail_ramme('Svar fra Learnification',
        '<p style="margin:0 0 14px;">Hej ' . htmlspecialchars((string) $s['konto_navn'], ENT_QUOTES, 'UTF-8') . ',</p>'
        . '<p style="margin:0 0 16px;">' . nl2br(htmlspecialchars($tekst, ENT_QUOTES, 'UTF-8'), false) . '</p>'
        . '<p style="margin:0 0 6px;font-size:14px;color:#6b5d4d;">Du svarer bare på denne mail, hvis der er mere.</p>'
        . '<p style="margin:14px 0 0;font-size:14px;color:#6b5d4d;border-top:1px solid #eadfca;padding-top:12px;">Din henvendelse: <em>'
        . htmlspecialchars(support_kort((string) $s['emne'], 100), ENT_QUOTES, 'UTF-8') . '</em></p>',
        'Du får den her mail, fordi du har skrevet til Learnifications support. <a href="' . $link . '" style="color:#6b5d4d;">Min konto</a>');
    $sendt = send_mail((string) $s['konto_email'], 'Svar fra Learnification: ' . support_kort((string) $s['emne'], 60),
        "Hej {$s['konto_navn']},\n\n$tekst\n\nDu svarer bare på denne mail, hvis der er mere.\n\nDin henvendelse: " . support_kort((string) $s['emne'], 100),
        $html, ['Reply-To' => MODTAGER]);
    svar(['ok' => true, 'mail_sendt' => $sendt]);
}

// ------------------------------------------------------------ voksne
$voksen = $x && !$x['elev'] && $x['konto']['type'] !== 'admin';

if ($h === 'start') {
    if (!$voksen) {
        svar(['ok' => true, 'vis' => false]);
    }
    $k = $x['konto'];
    svar(['ok' => true, 'vis' => true, 'navn' => $k['navn'], 'email' => $k['email'],
          'aabne' => (int) vaerdi("SELECT COUNT(*) FROM support_sager WHERE konto_id = ? AND status != 'loest'", [$k['id']]),
          'kategorier' => SUPPORT_KATEGORIER]);
}

if (!$voksen) {
    fejl('Log ind som voksen for at skrive til supporten.', 401);
}
$k = $x['konto'];

if ($h === 'mine') {
    $ud = [];
    foreach (alle('SELECT * FROM support_sager WHERE konto_id = ? ORDER BY opdateret DESC LIMIT 20', [$k['id']]) as $s) {
        $ud[] = support_sag_ud($s) + ['beskeder' => support_beskeder((int) $s['id'])];
    }
    svar(['ok' => true, 'sager' => $ud]);
}

if ($h === 'opret') {
    kraev_egen_side();
    if (felt('hjemmeside') !== '') {
        svar(['ok' => true, 'id' => 0]);        // en robot udfyldte honningkrukken: lad som om det lykkedes
    }
    bremse('support', 'k' . $k['id'], 5, 3600);
    $kategori = felt('kategori', 20);
    if (!isset(SUPPORT_KATEGORIER[$kategori])) {
        $kategori = 'andet';
    }
    $tekst = support_tekst('tekst');
    if (mb_strlen($tekst, 'UTF-8') < 5) {
        fejl('Skriv lidt om, hvad du har brug for hjælp til.');
    }
    $side = felt('side', 120);
    $emne = support_kort($tekst, 70);
    $nu = time();
    kør('INSERT INTO support_sager (konto_id, kategori, emne, status, side, oprettet, opdateret) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [$k['id'], $kategori, $emne, 'ny', $side !== '' ? $side : null, $nu, $nu]);
    $id = (int) db()->lastInsertId();
    kør('INSERT INTO support_beskeder (sag_id, fra, tekst, tid) VALUES (?, ?, ?, ?)', [$id, 'bruger', $tekst, $nu]);
    support_giv_besked($k, ['id' => $id, 'emne' => $emne, 'kategori' => $kategori, 'side' => $side], $tekst, true);
    svar(['ok' => true, 'id' => $id]);
}

if ($h === 'svar_bruger') {
    kraev_egen_side();
    bremse('support', 'k' . $k['id'], 10, 3600);
    $s = en('SELECT * FROM support_sager WHERE id = ? AND konto_id = ?', [tal('id'), $k['id']]);
    if (!$s) {
        fejl('Sagen findes ikke.', 404);
    }
    $tekst = support_tekst('tekst');
    if ($tekst === '') {
        fejl('Skriv noget først.');
    }
    $nu = time();
    kør('INSERT INTO support_beskeder (sag_id, fra, tekst, tid) VALUES (?, ?, ?, ?)', [$s['id'], 'bruger', $tekst, $nu]);
    kør('UPDATE support_sager SET status = ?, opdateret = ? WHERE id = ?', ['ny', $nu, $s['id']]);
    support_giv_besked($k, $s, $tekst, false);
    svar(['ok' => true]);
}

fejl('Ukendt handling.', 404);
