/**
 * Canonical company facts. Single source of truth for the whole site.
 *
 * NEVER add: the registered street address, the TIN, or the superseded
 * contact details. See the spec, section 2.
 */
export const SITE = Object.freeze({
  domain: 'https://radiantalphadigital.com',
  name: 'Radiant Alpha',
  legalName: 'Radiant Alpha Digital Services Ltd',
  rcNumber: '9421582',
  founded: '2026-03-17',

  email: 'help@radiantalphadigital.com',
  emailSecondary: 'radiantalphadigital@gmail.com',

  phoneE164: '+2349129665798',
  phoneDisplay: '+234 912 966 5798',
  whatsappNumber: '2349129665798',

  location: 'Abuja, FCT, Nigeria',
  addressLocality: 'Abuja',
  addressRegion: 'FCT',
  addressCountry: 'NG',

  trustLine:
    'RC 9421582 · Registered with the Corporate Affairs Commission, Nigeria · Abuja, FCT',

  tagline: 'Building Digital Solutions That Drive Business Growth.',
  preOrderLeadTime: '3–4 weeks',
} as const);

/**
 * Social profiles, rendered in the footer.
 *
 * Paste the real profile URL against a network and its icon appears; leave it
 * empty and the icon stays hidden. The content brief lists all three as
 * "coming soon", and a footer icon that leads to a 404 — or worse, to the
 * network's generic homepage — costs more trust than an absent icon does.
 *
 * These also feed the Organization schema's sameAs, which is how a search
 * engine ties the profiles to the company. Wrong URLs there are worse than none.
 */
export interface SocialLink {
  network: 'linkedin' | 'facebook' | 'instagram' | 'x' | 'tiktok';
  label: string;
  url: string;
}

export const SOCIALS: readonly SocialLink[] = Object.freeze([
  { network: 'linkedin', label: 'LinkedIn', url: '' },
  { network: 'facebook', label: 'Facebook', url: '' },
  { network: 'instagram', label: 'Instagram', url: '' },
]);

/** Only the profiles that actually exist. */
export const activeSocials = (): SocialLink[] =>
  SOCIALS.filter((s) => s.url.trim().length > 0);
