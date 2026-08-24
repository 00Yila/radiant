<?php
/**
 * Step one of passwordless login: takes an email, issues a single-use,
 * time-limited token, emails a link containing it, and always redirects to
 * the same "check your email" page — whether or not that email has ever
 * placed an order. Revealing the difference would turn this endpoint into
 * an oracle for "has this address ordered from us before."
 */

declare(strict_types=1);

require_once __DIR__ . '/../_lib/http.php';
require_once __DIR__ . '/../_lib/db.php';

const SITE_DOMAIN = 'https://radiantalphadigital.com';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    redirect('/account/login/');
}

$email = field('email');

if (filter_var($email, FILTER_VALIDATE_EMAIL) === false || mb_strlen($email) > 190) {
    redirect('/account/login/?error=invalid');
}

$token = bin2hex(random_bytes(32));
$tokenHash = hash('sha256', $token);

$pdo = dbConnect();
$pdo->prepare(
    'INSERT INTO login_tokens (email, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))'
)->execute([$email, $tokenHash]);

$link = SITE_DOMAIN . '/account/verify.php?token=' . urlencode($token);
$body = "Click this link to view your order history:\n\n{$link}\n\nThis link expires in 15 minutes and can only be used once.";

mail(
    $email,
    'Your Radiant Alpha login link',
    wordwrap($body, 78, "\n", true),
    [],
    '-fno-reply@radiantalphadigital.com'
);

redirect('/account/check-email/');
