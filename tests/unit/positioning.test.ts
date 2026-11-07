import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { SUBJECTS, SUBJECT_BY_SERVICE, MESSAGE_PROMPT } from '../../src/lib/contact';

/** Service ids, from the filenames the collection is built out of. */
export const serviceIds = readdirSync('src/content/services')
  .filter((f) => f.endsWith('.md'))
  .map((f) => f.replace(/\.md$/, ''))
  .sort();

/** Raw, trimmed YAML value for a top-level frontmatter key (quotes included). */
export const frontmatter = (id: string, key: string): string | undefined =>
  readFileSync(`src/content/services/${id}.md`, 'utf8')
    .match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]
    ?.trim();

describe('the service list is trimmed to the five core offers', () => {
  it('has exactly the five services the owner chose', () => {
    expect(serviceIds).toEqual([
      'digital-marketing',
      'ecommerce-solutions',
      'it-consulting',
      'software-development',
      'website-design-development',
    ]);
  });

  it('keeps every remaining service in tier 1 or 2', () => {
    for (const id of serviceIds) {
      expect(['1', '2'], id).toContain(frontmatter(id, 'tier'));
    }
  });

  it('offers no contact subject, mapping or prompt for the retired services', () => {
    for (const subject of [
      'Networking & infrastructure',
      'Solar & PV installation',
      'Technology products',
    ]) {
      expect(SUBJECTS, subject).not.toContain(subject);
    }
    for (const id of [
      'networking-infrastructure',
      'solar-pv-installation',
      'technology-products',
    ]) {
      expect(SUBJECT_BY_SERVICE[id], id).toBeUndefined();
      expect(MESSAGE_PROMPT[id], id).toBeUndefined();
    }
  });
});

describe('retired service URLs redirect instead of 404ing', () => {
  const htaccess = readFileSync('public/.htaccess', 'utf8');

  it('sends solar and networking to the services index', () => {
    expect(htaccess).toContain(
      'RedirectMatch 301 ^/services/(solar-pv-installation|networking-infrastructure)/?$ /services/'
    );
  });

  it('sends technology products to the shop', () => {
    expect(htaccess).toContain(
      'RedirectMatch 301 ^/services/technology-products/?$ /shop/'
    );
  });
});

describe('recurring prices carry their billing unit', () => {
  it('marks marketing as monthly and consulting as hourly', () => {
    expect(frontmatter('digital-marketing', 'startingUnit')).toBe('"/month"');
    expect(frontmatter('it-consulting', 'startingUnit')).toBe('"/hour"');
  });

  it('leaves one-off services without a unit', () => {
    for (const id of [
      'software-development',
      'website-design-development',
      'ecommerce-solutions',
    ]) {
      expect(frontmatter(id, 'startingUnit'), id).toBeUndefined();
    }
  });
});

describe('the services page no longer advertises retired offers', () => {
  const page = readFileSync('src/pages/services/index.astro', 'utf8');

  it('has no Equip tier', () => {
    expect(page).not.toContain("name: 'Equip'");
  });

  it('has no network-setup price row', () => {
    expect(page).not.toContain('Network Setup');
  });

  it('does not name networking in its meta description', () => {
    expect(page).not.toMatch(/description="[^"]*networking/i);
  });

  it('names the software row to match its card', () => {
    expect(page).toContain("service: 'Software Development'");
    expect(page).not.toContain('Custom Web Application');
  });
});

describe('the Gmail address is gone', () => {
  it('is not defined in the site facts', () => {
    expect(readFileSync('src/lib/site.ts', 'utf8')).not.toContain('gmail');
    expect(readFileSync('src/lib/site.ts', 'utf8')).not.toContain('emailSecondary');
  });

  it('is not referenced by the contact page', () => {
    const page = readFileSync('src/pages/contact.astro', 'utf8');
    expect(page).not.toContain('emailSecondary');
    expect(page).not.toContain('Alternative email');
  });
});
