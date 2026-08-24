<?php
declare(strict_types=1);

/**
 * Every page that touches $_SESSION for the account feature calls this
 * before session_start() would otherwise be called implicitly. Cookie flags
 * matter here specifically because this session carries a verified identity
 * (an email address), not just UI state:
 *   - HttpOnly: unreadable from JavaScript, so an XSS bug elsewhere on the
 *     site can't lift the session cookie.
 *   - Secure: never sent over plain HTTP.
 *   - SameSite=Lax: not attached to a cross-site POST, which is the same
 *     class of protection the admin tool's CSRF token gives its own form.
 */
function startSecureSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => true,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    session_start();
}
