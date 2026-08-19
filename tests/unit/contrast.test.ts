import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { contrastRatio, relativeLuminance } from '../../src/lib/contrast';
import { TOKENS } from '../../src/lib/tokens';

const AA_NORMAL = 4.5;
const AA_LARGE = 3.0;

describe('relativeLuminance', () => {
  it('returns 0 for black and 1 for white', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
  });

  it('accepts hex with or without a leading hash', () => {
    expect(relativeLuminance('FFFFFF')).toBeCloseTo(1, 5);
  });
});

describe('contrastRatio', () => {
  it('is 21 for black on white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
  });

  it('is order-independent', () => {
    const a = contrastRatio(TOKENS.gold500, TOKENS.navy900);
    const b = contrastRatio(TOKENS.navy900, TOKENS.gold500);
    expect(a).toBeCloseTo(b, 5);
  });
});

describe('approved colour pairings meet WCAG 2.2 AA', () => {
  const pairs: Array<[string, string, string, number]> = [
    ['body text on canvas',      TOKENS.ink,       TOKENS.canvas,  AA_NORMAL],
    ['muted text on canvas',     TOKENS.inkMuted,  TOKENS.canvas,  AA_NORMAL],
    ['navy heading on canvas',   TOKENS.navy600,   TOKENS.canvas,  AA_NORMAL],
    ['white on deep navy',       TOKENS.surface,   TOKENS.navy900, AA_NORMAL],
    ['gold on deep navy',        TOKENS.gold500,   TOKENS.navy900, AA_NORMAL],
    ['gold on brand navy',       TOKENS.gold500,   TOKENS.navy600, AA_NORMAL],
    ['navy on gold fill',        TOKENS.navy900,   TOKENS.gold500, AA_NORMAL],
    ['gold accent on deep navy', TOKENS.gold300,   TOKENS.navy900, AA_LARGE],
    ['gold ink on canvas',       TOKENS.goldInk,   TOKENS.canvas,  AA_NORMAL],
    ['gold ink on white',        TOKENS.goldInk,   TOKENS.surface, AA_NORMAL],
  ];

  it.each(pairs)('%s meets its threshold', (_label, fg, bg, threshold) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(threshold);
  });
});

describe('the gold rule', () => {
  it('gold on white fails AA — this is why gold is confined to dark backgrounds', () => {
    expect(contrastRatio(TOKENS.gold500, TOKENS.surface)).toBeLessThan(AA_NORMAL);
  });

  it('white on gold fails AA — gold buttons must carry navy text', () => {
    expect(contrastRatio(TOKENS.surface, TOKENS.gold500)).toBeLessThan(AA_NORMAL);
  });
});

/*
 * goldInk is the mirror image of gold500: legible as text on light, illegible
 * on navy. Asserting the failing direction too keeps anyone from "simplifying"
 * the two into one token later.
 */
describe('gold ink is light-register only', () => {
  it('is legible as body text on the light register', () => {
    expect(contrastRatio(TOKENS.goldInk, TOKENS.canvas)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('fails on deep navy, where gold500 is the correct choice instead', () => {
    expect(contrastRatio(TOKENS.goldInk, TOKENS.navy900)).toBeLessThan(AA_NORMAL);
    expect(contrastRatio(TOKENS.gold500, TOKENS.navy900)).toBeGreaterThanOrEqual(AA_NORMAL);
  });
});

/*
 * A photograph behind text is the usual way a hero quietly fails contrast: the
 * scrim is tuned against the average frame, then one bright region drops the
 * accent colour below AA. This pins the floor rather than trusting the eye.
 */
describe('the photo scrim keeps text legible over the brightest frame', () => {
  const css = readFileSync('src/styles/backdrops.css', 'utf8');

  /** Brightest pixel the Abuja photograph actually contains — blown-out cloud. */
  const SKY = '#F5F8FC';

  function composite(fg: string, alpha: number, bg: string): string {
    const parse = (h: string) =>
      [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const [f, b] = [parse(fg), parse(bg)];
    return (
      '#' +
      f
        .map((c, i) =>
          Math.round(alpha * c + (1 - alpha) * b[i])
            .toString(16)
            .padStart(2, '0')
        )
        .join('')
    );
  }

  const alphas = [...css.matchAll(/rgb\(10 25 48 \/ (0\.\d+)\)/g)].map((m) =>
    Number(m[1])
  );

  it('declares scrim stops', () => {
    expect(alphas.length, 'no scrim gradient found in backdrops.css').toBeGreaterThan(0);
  });

  it.each([
    ['gold accent', TOKENS.gold500],
    ['muted text', TOKENS.navy200],
    ['body text', TOKENS.surface],
  ])('%s clears AA at the weakest scrim stop', (_label, fg) => {
    const weakest = Math.min(...alphas);
    const behind = composite(TOKENS.navy900, weakest, SKY);
    expect(
      contrastRatio(fg, behind),
      `at alpha ${weakest} over ${SKY}`
    ).toBeGreaterThanOrEqual(AA_NORMAL);
  });
});

describe('tokens.css stays in sync with tokens.ts', () => {
  const css = readFileSync('src/styles/tokens.css', 'utf8');

  const cssVarFor: Record<string, string> = {
    navy900: '--ra-navy-900', navy800: '--ra-navy-800', navy700: '--ra-navy-700',
    navy600: '--ra-navy-600', navy500: '--ra-navy-500', navy400: '--ra-navy-400',
    navy200: '--ra-navy-200', navy50: '--ra-navy-50',
    gold500: '--ra-gold-500', gold400: '--ra-gold-400', gold300: '--ra-gold-300',
    goldInk: '--ra-gold-ink',
    ink: '--ra-ink', inkMuted: '--ra-ink-muted', canvas: '--ra-canvas',
    surface: '--ra-surface', border: '--ra-border',
  };

  it('declares every TS token in CSS — no token goes unmirrored', () => {
    expect(Object.keys(cssVarFor).sort()).toEqual(Object.keys(TOKENS).sort());
  });

  it.each(Object.entries(cssVarFor))(
    '%s is declared in CSS with the same hex',
    (token, cssVar) => {
      const match = css.match(new RegExp(`${cssVar}:\\s*(#[0-9A-Fa-f]{6})`));
      expect(match, `${cssVar} missing from tokens.css`).not.toBeNull();
      expect(match![1].toUpperCase()).toBe(
        TOKENS[token as keyof typeof TOKENS].toUpperCase()
      );
    }
  );
});
