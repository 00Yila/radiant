/**
 * Colour tokens, derived from the Radiant Alpha logo.
 * This is the single source of truth — tokens.css mirrors these values,
 * and tests/unit/contrast.test.ts asserts every approved pairing.
 */
export const TOKENS = {
  navy900: '#0A1930',
  navy800: '#0E2244',
  navy700: '#16305C',
  navy600: '#1D3E7C',
  navy500: '#2E5AA8',
  navy400: '#5B84C4',
  navy200: '#B9CCE8',
  navy50:  '#EDF2FA',

  gold500: '#EFB42E',
  gold400: '#F5C85C',
  gold300: '#F9D98F',

  /**
   * Gold dark enough to be TEXT on the light register — 5.00:1 on canvas.
   * gold500 measures 1.82:1 there, so it can only ever be a fill or a hairline.
   * This is the inverse of the others: light backgrounds only, never on navy
   * (3.2:1 there, below AA), where gold500 is already the correct choice.
   */
  goldInk: '#8C6800',

  ink:      '#101828',
  inkMuted: '#475467',
  canvas:   '#FDFCFA',
  surface:  '#FFFFFF',
  border:   '#E4E7EC',
} as const;

export type TokenName = keyof typeof TOKENS;
