import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import {
  SUBJECTS,
  SUBJECT_BY_SERVICE,
  MESSAGE_PROMPT,
  contactUrlForService,
  startProjectUrlForService,
} from '../../src/lib/contact';

/** Service ids, from the filenames the collection is built out of. */
const serviceIds = readdirSync('src/content/services')
  .filter((f) => f.endsWith('.md'))
  .map((f) => f.replace(/\.md$/, ''));

/*
 * A service page's CTA links to /contact?subject=<its id>, and the contact
 * page maps that back to an <option>. Nothing at runtime notices when the two
 * drift apart — the select just stays on "Choose one…" and the visitor
 * silently loses the context they clicked with.
 */
describe('service CTAs resolve to a real form option', () => {
  it('maps every service to a subject', () => {
    const unmapped = serviceIds.filter((id) => !SUBJECT_BY_SERVICE[id]);
    expect(unmapped, 'services with no contact subject').toEqual([]);
  });

  it('maps every service to a subject the form actually offers', () => {
    const missing = Object.entries(SUBJECT_BY_SERVICE)
      .filter(([, subject]) => !SUBJECTS.includes(subject))
      .map(([id, subject]) => `${id} → "${subject}"`);
    expect(missing, 'subjects absent from the select').toEqual([]);
  });

  it('does not map services that no longer exist', () => {
    const orphans = Object.keys(SUBJECT_BY_SERVICE).filter(
      (id) => !serviceIds.includes(id)
    );
    expect(orphans, 'mappings pointing at deleted services').toEqual([]);
  });

  it('gives every service a message prompt', () => {
    const missing = serviceIds.filter((id) => !MESSAGE_PROMPT[id]?.trim());
    expect(missing).toEqual([]);
  });

  it('encodes the service id into the link', () => {
    expect(contactUrlForService('solar-pv-installation')).toBe(
      '/contact?subject=solar-pv-installation'
    );
  });

  it('sends "Start Your Project" to the guided intake, not the plain form', () => {
    expect(startProjectUrlForService('solar-pv-installation')).toBe(
      '/start-project?subject=solar-pv-installation'
    );
  });
});

/*
 * contact.php redirects on a hidden `form` field, looked up against a fixed
 * map rather than trusted directly — a tampered value could otherwise send a
 * visitor to an arbitrary path. Both real destinations are asserted here so a
 * typo in the map (`/start-project/?eror=`) fails a test instead of silently
 * bouncing a failed submission to a 404.
 */
describe('contact.php redirects each form to its own pages', () => {
  const php = readFileSync('public/contact.php', 'utf8');

  const formsBlock = php.match(/const FORMS = \[([\s\S]*?)\n\];/)?.[1] ?? '';

  it('finds the FORMS map in the PHP handler', () => {
    expect(formsBlock, 'could not parse FORMS out of contact.php').not.toBe('');
  });

  it('routes the plain contact form back to /contact', () => {
    const block = formsBlock.match(/'contact' => \[([\s\S]*?)\],\n {4}'start-project'/)?.[1] ?? '';
    expect(block).toMatch(/'success' => '\/contact\/thanks\/'/);
    expect(block).toMatch(/'error' => '\/contact\/\?error=send'/);
    expect(block).toMatch(/'invalid' => '\/contact\/\?error=invalid'/);
  });

  it('routes the guided intake back to /start-project on failure', () => {
    const block = formsBlock.match(/'start-project' => \[([\s\S]*?)\],\n\];?$/)?.[1]
      ?? formsBlock.split("'start-project' =>")[1] ?? '';
    expect(block).toMatch(/'success' => '\/contact\/thanks\/'/);
    expect(block).toMatch(/'error' => '\/start-project\/\?error=send'/);
    expect(block).toMatch(/'invalid' => '\/start-project\/\?error=invalid'/);
  });

  it('falls back to the contact form for an unrecognised form value', () => {
    expect(php).toMatch(/if \(!array_key_exists\(\$formKey, FORMS\)\)\s*\{\s*\$formKey = 'contact';/);
  });
});

describe('the form and the handler agree on the subject list', () => {
  /*
   * contact.php validates the submitted subject against its own copy of the
   * list and rejects anything else. If the two lists drift, a legitimate
   * submission is bounced to /contact/?error=invalid with no explanation.
   */
  const php = readFileSync('public/contact.php', 'utf8');

  const phpSubjects = [
    ...(php.match(/const SUBJECTS = \[([\s\S]*?)\];/)?.[1] ?? '').matchAll(
      /'((?:[^'\\]|\\.)*)'/g
    ),
  ].map((m) => m[1].replace(/\\'/g, "'"));

  it('finds the list in the PHP handler', () => {
    expect(phpSubjects.length, 'could not parse SUBJECTS out of contact.php').toBeGreaterThan(0);
  });

  it('accepts exactly the options the form offers', () => {
    expect([...phpSubjects].sort()).toEqual([...SUBJECTS].sort());
  });
});
