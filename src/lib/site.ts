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
