import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { ORDER_STATUSES, ORDER_REDIRECTS } from '../../src/lib/orders';

/*
 * Mirrors tests/unit/contact.test.ts's approach: regex-parse the PHP source
 * rather than executing it (no PHP runtime in this environment), and cross-
 * check against a TypeScript source of truth. Nothing at runtime notices
 * when the PHP enum and the DB's ENUM column, or a redirect target and the
 * page it's supposed to point at, drift apart — a mismatch here would
 * otherwise surface only as a silent 404 or a rejected status update in
 * production.
 */

describe('the order status enum stays in sync with the PHP', () => {
  const php = readFileSync('public/_lib/orders.php', 'utf8');

  const phpStatuses = [
    ...(php.match(/const ORDER_STATUSES = \[([\s\S]*?)\];/)?.[1] ?? '').matchAll(
      /'([a-z]+)'/g
    ),
  ].map((m) => m[1]);

  it('finds ORDER_STATUSES in the PHP', () => {
    expect(phpStatuses.length, 'could not parse ORDER_STATUSES out of orders.php').toBeGreaterThan(0);
  });

  it('matches the TypeScript source of truth exactly, in order', () => {
    expect(phpStatuses).toEqual([...ORDER_STATUSES]);
  });

  it('matches the ENUM column in the checked-in schema', () => {
    const schema = readFileSync('docs/db/schema.sql', 'utf8');
    const enums = [...schema.matchAll(/status\s+ENUM\(([^)]+)\)/g)].map((m) =>
      [...m[1].matchAll(/'([a-z]+)'/g)].map((s) => s[1])
    );

    expect(enums.length, 'no ENUM(...) status column found in schema.sql').toBeGreaterThan(0);
    for (const columnValues of enums) {
      expect(columnValues).toEqual([...ORDER_STATUSES]);
    }
  });
});

describe('order-callback.php redirects to pages that actually exist', () => {
  const php = readFileSync('public/order-callback.php', 'utf8');

  it('redirects a not-found reference to the not-found page', () => {
    expect(php).toMatch(new RegExp(`redirect\\('${ORDER_REDIRECTS.notFound}'\\)`));
  });

  it('redirects a verified payment to the confirmed page', () => {
    expect(php).toContain(`redirect('${ORDER_REDIRECTS.confirmed}?' . $refParam)`);
  });

  it('redirects an unverified payment to the failed page', () => {
    expect(php).toContain(`redirect('${ORDER_REDIRECTS.failed}?' . $refParam)`);
  });
});

describe('order-status.php sends a mismatched lookup to the same not-found page', () => {
  const php = readFileSync('public/order-status.php', 'utf8');

  it('never distinguishes a bad reference from a bad email', () => {
    // Only one not-found redirect should exist in the whole file — a second,
    // differently-worded one would be exactly the oracle this endpoint must
    // not provide.
    const matches = [...php.matchAll(new RegExp(`redirect\\('${ORDER_REDIRECTS.notFound}'\\)`, 'g'))];
    expect(matches.length).toBe(1);
  });
});

describe('the webhook validates its signature before reading the payload', () => {
  const php = readFileSync('public/order-webhook.php', 'utf8');

  it('computes the HMAC over the raw body with sha512', () => {
    expect(php).toMatch(/hash_hmac\('sha512',\s*\(string\)\s*\$rawBody/);
  });

  it('compares with hash_equals, not ==/===', () => {
    expect(php).toMatch(/hash_equals\(\$expected, \$signature\)/);
  });

  it('checks the signature before json_decode-ing the body', () => {
    const sigCheckIndex = php.indexOf('hash_equals(');
    const decodeIndex = php.indexOf('json_decode(');
    expect(sigCheckIndex).toBeGreaterThan(-1);
    expect(decodeIndex).toBeGreaterThan(-1);
    expect(sigCheckIndex).toBeLessThan(decodeIndex);
  });
});

describe('the tracking timeline covers exactly the post-payment statuses', () => {
  it('excludes pending and failed, which have no place on a delivery timeline', async () => {
    const { TRACKING_STEPS } = await import('../../src/lib/orders');
    expect(TRACKING_STEPS).not.toContain('pending');
    expect(TRACKING_STEPS).not.toContain('failed');
    for (const step of TRACKING_STEPS) {
      expect(ORDER_STATUSES).toContain(step);
    }
  });
});
