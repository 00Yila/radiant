import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('the login flow never reveals whether an email has ordered before', () => {
  const php = readFileSync('public/account/login.php', 'utf8');

  it('redirects to the same check-email page regardless of lookup result', () => {
    // Only one redirect target should exist for the success path — a
    // second, different one would be exactly the oracle this must avoid.
    const matches = [...php.matchAll(/redirect\('\/account\/check-email\/'\)/g)];
    expect(matches.length).toBe(1);
  });

  it('never queries whether the email already has an account or order', () => {
    expect(php).not.toMatch(/SELECT.*FROM (users|orders)/i);
  });
});

describe('verify.php treats invalid, expired, and reused tokens identically', () => {
  const php = readFileSync('public/account/verify.php', 'utf8');

  it('has exactly one link-expired redirect for every failure case', () => {
    const matches = [...php.matchAll(/redirect\('\/account\/link-expired\/'\)/g)];
    expect(matches.length).toBe(2); // empty token, and lookup-not-found
  });

  it('checks used_at IS NULL and expires_at > NOW() in the same query', () => {
    expect(php).toMatch(/used_at IS NULL AND expires_at > NOW\(\)/);
  });

  it('regenerates the session id before trusting it as authenticated', () => {
    const setEmailIndex = php.indexOf("_SESSION['email']");
    const regenIndex = php.indexOf('session_regenerate_id(true)');
    expect(regenIndex).toBeGreaterThan(-1);
    expect(regenIndex).toBeLessThan(setEmailIndex);
  });
});

describe('logout.php fully clears the session', () => {
  const php = readFileSync('public/account/logout.php', 'utf8');

  it('empties $_SESSION before destroying it', () => {
    expect(php).toContain('$_SESSION = []');
    expect(php).toContain('session_destroy()');
  });
});
