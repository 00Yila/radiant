<?php
/**
 * Contact form handler for Hostinger shared hosting.
 *
 * Replaces Netlify Forms, which does not exist outside Netlify. Lives in
 * public/ so Astro copies it into dist/ untouched; Hostinger's PHP runtime
 * executes it from public_html.
 *
 * The form degrades honestly: a delivery failure sends the visitor to
 * /contact/?error=send rather than the thank-you page. Reporting success for a
 * message that never arrived is the one outcome worse than an error, because
 * neither side ever learns the enquiry was lost.
 */

declare(strict_types=1);

// ---------------------------------------------------------------- config
/** Where enquiries land. Must be a mailbox on this domain — see FROM below. */
const MAIL_TO = 'help@radiantalphadigital.com';

/**
 * The envelope sender. Shared hosts reject or spam-file mail whose From is a
 * domain they do not host, so this must stay on radiantalphadigital.com. The
 * visitor's address goes in Reply-To instead, which is what you want anyway:
 * hitting reply answers the customer.
 */
const MAIL_FROM = 'help@radiantalphadigital.com';
const MAIL_FROM_NAME = 'Radiant Alpha website';

const SUCCESS_URL = '/contact/thanks/';
const ERROR_URL = '/contact/?error=send';
const INVALID_URL = '/contact/?error=invalid';

/*
 * Must match SUBJECTS in src/lib/contact.ts exactly — a submission carrying
 * anything else is bounced as invalid. tests/unit/contact.test.ts parses this
 * array and compares the two, because the failure is otherwise invisible:
 * the form offers an option the handler silently refuses.
 */
const SUBJECTS = [
    'Website design & development',
    'Software development',
    'E-commerce',
    'Digital marketing',
    'IT consulting',
    'Networking & infrastructure',
    'Solar & PV installation',
    'Technology products',
    'Something else',
];

// ---------------------------------------------------------------- helpers
function redirect(string $path): never
{
    header('Location: ' . $path, true, 303);
    exit;
}

/** Strips CR/LF so a submitted value cannot inject extra mail headers. */
function headerSafe(string $value): string
{
    return trim(str_replace(["\r", "\n", "%0a", "%0d"], '', $value));
}

function field(string $key): string
{
    return trim((string) ($_POST[$key] ?? ''));
}

// ---------------------------------------------------------------- guards
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    redirect('/contact/');
}

// Honeypot: a real person never sees this input, so anything in it is a bot.
// Answer with the success page rather than an error — telling a bot it failed
// only invites it to retry with the field cleared.
if (field('bot-field') !== '') {
    redirect(SUCCESS_URL);
}

$name = field('name');
$email = field('email');
$phone = field('phone');
$subject = field('subject');
$message = field('message');

$valid = $name !== ''
    && $message !== ''
    && filter_var($email, FILTER_VALIDATE_EMAIL) !== false
    && in_array($subject, SUBJECTS, true)
    && mb_strlen($name) <= 120
    && mb_strlen($phone) <= 40
    && mb_strlen($message) <= 5000;

if (!$valid) {
    redirect(INVALID_URL);
}

// ---------------------------------------------------------------- compose
$safeName = headerSafe($name);
$safeEmail = headerSafe($email);

$mailSubject = sprintf('Website enquiry — %s', headerSafe($subject));

$body = implode("\n", [
    'New enquiry from the Radiant Alpha website.',
    '',
    'Name:    ' . $name,
    'Email:   ' . $email,
    'Phone:   ' . ($phone !== '' ? $phone : '(not given)'),
    'Subject: ' . $subject,
    '',
    'Message:',
    $message,
    '',
    '---',
    'Sent ' . gmdate('Y-m-d H:i') . ' UTC from ' . ($_SERVER['HTTP_HOST'] ?? 'the website'),
]);

$headers = [
    'From' => sprintf('%s <%s>', MAIL_FROM_NAME, MAIL_FROM),
    'Reply-To' => sprintf('%s <%s>', $safeName, $safeEmail),
    'Content-Type' => 'text/plain; charset=UTF-8',
    'X-Mailer' => 'PHP/' . phpversion(),
];

$headerLines = [];
foreach ($headers as $key => $value) {
    $headerLines[] = $key . ': ' . $value;
}

// The fifth argument sets the envelope sender; without it some shared hosts
// send as the system user and the message fails SPF at the receiving end.
$sent = mail(
    MAIL_TO,
    $mailSubject,
    wordwrap($body, 78, "\n", true),
    implode("\r\n", $headerLines),
    '-f' . MAIL_FROM
);

redirect($sent ? SUCCESS_URL : ERROR_URL);
