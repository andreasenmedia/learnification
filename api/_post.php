<?php
/**
 * Mails ud gennem Simply.coms websmtp.simply.com i stedet for PHP's mail().
 *
 * HVORFOR: learnification.dk har DMARC med p=reject (Simply.coms standard).
 * Mails fra PHP's mail() bliver ikke DKIM-signeret, så modtagerne må afvise
 * dem. Det, der går gennem websmtp.simply.com, bliver signeret med
 * simplycom1/simplycom2._domainkey — de CNAME'er ligger allerede i DNS.
 * websmtp.simply.com kan kun bruges fra Simply.coms egne webservere.
 *
 * OPSÆTNING: læg en fil smtp.php i datamappen (learnification-data/, ved
 * siden af public_html) med
 *
 *   <?php return ['bruger' => 'no-reply@learnification.dk', 'kode' => '...'];
 *
 * Brugeren er en postkasse, der er oprettet under Mail i Simply.coms
 * kontrolpanel. Den fil må ALDRIG ligge i repoet — repoet er offentligt.
 * Findes filen ikke, bruges mail() som hidtil.
 *
 * Valgfrit i filen: 'vaert' (standard websmtp.simply.com), 'port' (587),
 * 'tls' (true — kun false til test på egen maskine).
 */

declare(strict_types=1);

/** Det, der gik galt med den sidste mail, til fejlbeskeder i /admin. */
function post_fejl(?string $ny = null): string
{
    static $fejl = '';
    if ($ny !== null) {
        $fejl = $ny;
    }
    return $fejl;
}

function smtp_opsaetning(): ?array
{
    static $c = false;
    if ($c === false) {
        $fil = datamappe() . '/smtp.php';
        $c = is_file($fil) ? require $fil : null;
        if (!is_array($c) || empty($c['bruger']) || !isset($c['kode'])) {
            $c = null;
        }
    }
    return $c;
}

/**
 * Send en færdig mail (headere + krop) gennem SMTP. Forbindelsen bliver
 * holdt åben resten af forespørgslen, så et nyhedsbrev med 25 modtagere
 * ikke logger ind 25 gange.
 */
function smtp_send(array $c, string $fra, string $til, string $data): bool
{
    static $s = null, $doed = '';
    if ($doed !== '') {
        // Kunne vi ikke logge ind, prøver vi ikke igen for hver modtager —
        // mange forkerte logins kan få postkassen spærret
        post_fejl($doed);
        return false;
    }
    try {
        if ($s === null || feof($s)) {
            try {
                $s = smtp_forbind($c);
            } catch (RuntimeException $e) {
                $doed = $e->getMessage();
                throw $e;
            }
        }
        smtp_kommando($s, 'MAIL FROM:<' . $fra . '>', [250]);
        smtp_kommando($s, 'RCPT TO:<' . $til . '>', [250, 251]);
        smtp_kommando($s, 'DATA', [354]);
        // Linjer, der starter med et punktum, skal have et ekstra (RFC 5321)
        $data = preg_replace('/^\./m', '..', str_replace(["\r\n", "\n"], ["\n", "\r\n"], $data)) ?? $data;
        smtp_kommando($s, $data . "\r\n.", [250], 'mailen');
        return true;
    } catch (RuntimeException $e) {
        post_fejl($e->getMessage());
        error_log('learnification smtp: ' . $e->getMessage());
        if (is_resource($s)) {
            // Afvist modtager: nulstil og behold forbindelsen. Andet: start forfra næste gang.
            try {
                smtp_kommando($s, 'RSET', [250]);
            } catch (RuntimeException $e2) {
                @fclose($s);
                $s = null;
            }
        } else {
            $s = null;
        }
        return false;
    }
}

/** @return resource */
function smtp_forbind(array $c)
{
    $vaert = (string) ($c['vaert'] ?? 'websmtp.simply.com');
    $port = (int) ($c['port'] ?? 587);
    $s = @stream_socket_client("tcp://$vaert:$port", $nr, $tekst, 15);
    if (!$s) {
        throw new RuntimeException("Kunne ikke få forbindelse til $vaert:$port ($tekst)");
    }
    stream_set_timeout($s, 30);
    smtp_svar($s, [220]);
    $navn = gethostname() ?: 'learnification.dk';
    smtp_kommando($s, 'EHLO ' . $navn, [250]);
    if ($c['tls'] ?? true) {
        smtp_kommando($s, 'STARTTLS', [220]);
        if (!stream_socket_enable_crypto($s, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT)) {
            throw new RuntimeException('Kunne ikke slå kryptering til (STARTTLS)');
        }
        smtp_kommando($s, 'EHLO ' . $navn, [250]);
    }
    smtp_kommando($s, 'AUTH LOGIN', [334]);
    smtp_kommando($s, base64_encode((string) $c['bruger']), [334]);
    smtp_kommando($s, base64_encode((string) $c['kode']), [235], 'kodeordet');
    return $s;
}

/** @param resource $s */
function smtp_kommando($s, string $linje, array $forventet, string $vis = ''): string
{
    if (@fwrite($s, $linje . "\r\n") === false) {
        throw new RuntimeException('Forbindelsen til mailserveren blev afbrudt');
    }
    return smtp_svar($s, $forventet, $vis !== '' ? $vis : strtok($linje, "\r\n"));
}

/** @param resource $s */
function smtp_svar($s, array $forventet, string $efter = 'forbindelsen'): string
{
    $svar = '';
    while (($l = fgets($s, 1024)) !== false) {
        $svar .= $l;
        if (strlen($l) < 4 || $l[3] !== '-') {
            break;
        }
    }
    $kode = (int) substr($svar, 0, 3);
    if (!in_array($kode, $forventet, true)) {
        // Kodeord og mailens indhold kommer aldrig med i fejlbeskeden
        $efter = strlen($efter) > 60 ? 'mailen' : $efter;
        throw new RuntimeException('Mailserveren svarede "' . trim($svar ?: 'intet') . '" efter ' . $efter);
    }
    return $svar;
}
