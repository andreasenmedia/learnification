<?php
/**
 * XP-tavlen for forældre og valget om fremskridtsmailen. Reglerne står i _xp.php.
 *
 *   GET  ?handling=tavle        familiens XP, børnene, seneste præstationer og om mailen er slået til
 *   POST mail {til}             slå fremskridtsmailen til eller fra for sin egen konto
 *
 *   Fra linket i hver mail (uden login — nøglen er beviset):
 *   POST afmeld {noegle}        stop mailen
 *   POST tilmeld {noegle}       fortryd, hvis det var en fejl
 */

declare(strict_types=1);
require __DIR__ . '/_kerne.php';
require_once __DIR__ . '/_xp.php';

function skjul_adresse(string $email): string
{
    [$navn, $domaene] = explode('@', $email, 2) + ['', ''];
    return substr($navn, 0, 1) . str_repeat('•', max(2, strlen($navn) - 1)) . '@' . $domaene;
}

function konto_efter_noegle(): array
{
    $noegle = preg_replace('/[^0-9a-f]/', '', felt('noegle', 80)) ?? '';
    $k = strlen($noegle) === 40 ? en('SELECT * FROM konti WHERE xp_noegle = ?', [$noegle]) : null;
    if (!$k) {
        fejl('Linket virker ikke længere. Du kan slå mailen til og fra under Min konto.', 404);
    }
    return $k;
}

$h = handling();

if ($h === 'afmeld' || $h === 'tilmeld') {
    kraev_egen_side();
    bremse('xp-link', ip(), 30, 3600);
    $k = konto_efter_noegle();
    if ($h === 'afmeld') {
        kør('UPDATE konti SET xp_mail = 0, xp_mail_afmeldt = ? WHERE id = ?', [time(), $k['id']]);
    } else {
        kør('UPDATE konti SET xp_mail = 1, xp_mail_afmeldt = NULL WHERE id = ?', [$k['id']]);
    }
    svar(['ok' => true, 'email' => skjul_adresse($k['email']), 'til' => $h === 'tilmeld']);
}

$x = hvem();
if (!$x || $x['elev']) {
    fejl('Log ind som voksen for at se XP-tavlen.', 401);
}
$k = $x['konto'];

if ($h === 'tavle') {
    if ($k['type'] !== 'foraelder') {
        svar(['ok' => true, 'relevant' => false]);
    }
    svar(['ok' => true, 'relevant' => true, 'mail' => ['til' => (int) $k['xp_mail'] === 1,
                                                       'sidst' => $k['xp_mail_sendt'] !== null ? (int) $k['xp_mail_sendt'] : null]]
        + xp_tavle($k));
}

if ($h === 'mail') {
    kraev_egen_side();
    if ($k['type'] !== 'foraelder') {
        fejl('Det kan kun vælges på en familiekonto.');
    }
    $til = !empty(input()['til']);
    kør('UPDATE konti SET xp_mail = ?, xp_mail_afmeldt = ? WHERE id = ?', [$til ? 1 : 0, $til ? null : time(), $k['id']]);
    svar(['ok' => true, 'til' => $til]);
}

fejl('Ukendt handling.', 404);
