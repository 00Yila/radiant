<?php
/**
 * Step two of passwordless login: verifies the token from the emailed link,
 * marks it used (single-use), starts a session holding the verified email,
 * and redirects into the account area. An invalid, expired, or already-used
 * token gets the same "link expired" redirect regardless of which of those
 * three it was — no need to distinguish them for the visitor.
 */

declare(strict_types=1);

require_once __DIR__ . '/../_lib/http.php';
require_once __DIR__ . '/../_lib/db.php';
require_once __DIR__ . '/../_lib/session.php';

$token = field('token');

if ($token === '') {
    redirect('/account/link-expired/');
}

$tokenHash = hash('sha256', $token);

$pdo = dbConnect();
$stmt = $pdo->prepare(
    'SELECT id, email FROM login_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW() LIMIT 1'
);
$stmt->execute([$tokenHash]);
$row = $stmt->fetch();

if ($row === false) {
    redirect('/account/link-expired/');
}

$pdo->prepare('UPDATE login_tokens SET used_at = NOW() WHERE id = ?')->execute([$row['id']]);

startSecureSession();
// Prevents session fixation: a session ID established before login is never
// reused as the authenticated session's ID.
session_regenerate_id(true);
$_SESSION['email'] = $row['email'];

redirect('/account/orders.php');
