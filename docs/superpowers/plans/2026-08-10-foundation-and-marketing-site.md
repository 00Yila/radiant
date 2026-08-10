# Radiant Alpha — Plan 1: Foundation & Marketing Site

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a deployable, accessible, fast marketing site for Radiant Alpha Digital Services — home, about, services index, seven service detail pages, contact, legal pages, and 404 — on a validated design system.

**Architecture:** Astro static site. All logic that can be unit-tested (contrast, currency, WhatsApp links, site constants) lives in `src/lib/` and is TDD'd with Vitest. Pages are `.astro` files verified with Playwright smoke tests. Two visual registers (light default, rationed dark navy bands) are enforced through CSS custom properties in a single tokens file, with an automated contrast test as the guard.

**Tech Stack:** Astro 5, TypeScript, vanilla CSS with custom properties (no CSS framework), Vitest, Playwright, Netlify.

**Spec:** [2026-08-10-radiant-alpha-website-design.md](../specs/2026-08-10-radiant-alpha-website-design.md)
**Copy source:** [docs/content-brief.md](../../content-brief.md)

**Out of scope for this plan:** the shop (Plan 2), blog and Decap CMS (Plan 3).

---

## Global Constraints

Every task's requirements implicitly include this section.

- **Domain:** `https://radiantalphadigital.com` — canonical URLs, sitemap, Open Graph.
- **Primary email, site-wide:** `help@radiantalphadigital.com`
- **Secondary email, Contact page only:** `radiantalphadigital@gmail.com`
- **Phone / WhatsApp:** `+234 912 966 5798` → wa.me format `2349129665798`
- **Public location string:** exactly `Abuja, FCT, Nigeria`
- **NEVER appears in built output:** the street address (`B09`, `Standard Estate`, `Galadimawa`), the TIN (`2623730842678`), or the superseded contacts (`00yila.dev@gmail.com`, `+234 704 015 9044`, `704 015 9044`). Task 14 enforces this with a test that greps `dist/`.
- **Footer trust line, verbatim:** `RC 9421582 · Registered with the Corporate Affairs Commission, Nigeria · Abuja, FCT`
- **Gold rule (absolute):** gold is text/icons only on navy backgrounds. On light backgrounds it may only be thin accents, dividers, or filled shapes carrying navy text. Gold-filled buttons use **navy** text, never white.
- **Dark register is rationed:** 25–30% of any page. Never a full page. Never on shop pages.
- **JS budget:** under 15KB total across the site. No animation library, no icon font, no jQuery, no UI framework. Icons are inline SVG.
- **All motion** gated behind `prefers-reduced-motion`.
- **Alt text is required** on every image. Task 14 fails the build if any is missing.
- **Tap targets** minimum 44×44px.
- **Accessibility target:** WCAG 2.2 AA.
- **Node:** 20 LTS or newer.

---

## File Structure

| Path | Responsibility |
|---|---|
| `astro.config.mjs` | Astro config: site URL, sitemap integration |
| `package.json`, `tsconfig.json` | Deps and TS strict config |
| `netlify.toml` | Build command, publish dir, headers |
| `vitest.config.ts`, `playwright.config.ts` | Test runners |
| `src/lib/contrast.ts` | WCAG relative luminance + contrast ratio. Pure functions. |
| `src/lib/tokens.ts` | Colour token values as TS constants — single source shared by CSS and contrast tests |
| `src/lib/site.ts` | Canonical site constants: domain, emails, phone, location, trust line |
| `src/lib/format.ts` | Naira formatting with tabular-safe output |
| `src/lib/whatsapp.ts` | Builds `wa.me` URLs with pre-filled, encoded messages |
| `src/styles/tokens.css` | CSS custom properties: colour, type scale, spacing, radii |
| `src/styles/reset.css` | Minimal modern reset |
| `src/styles/global.css` | Base element styles, focus rings, motion guard |
| `src/components/Seo.astro` | Title, meta, canonical, OG, JSON-LD |
| `src/components/Header.astro` | Nav + mobile disclosure |
| `src/components/Footer.astro` | Links, trust line, contact |
| `src/components/WhatsAppButton.astro` | Floating CTA |
| `src/components/Section.astro` | Register wrapper — `light` \| `dark` |
| `src/components/Button.astro` | Variants: `primary` \| `secondary` \| `gold` |
| `src/layouts/Base.astro` | HTML shell, fonts, styles, header, footer, float button |
| `src/content.config.ts` | Content collections — `services`, `settings` |
| `src/content/services/*.md` | Seven service pages |
| `src/content/settings/site.json` | Editable contact + lead time (CMS-ready) |
| `src/pages/*.astro` | Routes |
| `tests/unit/*.test.ts` | Vitest |
| `tests/e2e/*.spec.ts` | Playwright |

---

## Task 1: Scaffold, tooling, deploy config

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `netlify.toml`, `vitest.config.ts`, `.nvmrc`
- Create: `src/pages/index.astro`
- Create: `tests/unit/smoke.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: a working `npm run build`, `npm run test:unit`, and a deployable `dist/`

- [ ] **Step 1: Confirm the working directory is outside OneDrive**

If the repo is still at `C:\Users\hp\OneDrive\Desktop\CT New folder`, move it before installing dependencies. OneDrive syncs `node_modules` continuously, causing file locks mid-build.

```bash
git -C "/c/Users/hp/OneDrive/Desktop/CT New folder" status --short
mkdir -p /c/Users/hp/Projects
mv "/c/Users/hp/OneDrive/Desktop/CT New folder" /c/Users/hp/Projects/radiantalpha
cd /c/Users/hp/Projects/radiantalpha && git log --oneline -1
```

- [ ] **Step 2: Create the Astro project in place**

```bash
npm create astro@latest . -- --template minimal --typescript strict --no-install --no-git --skip-houston
npm install
npm install -D vitest @playwright/test
npm install @astrojs/sitemap
```

- [ ] **Step 3: Pin Node version**

Create `.nvmrc`:

```
20
```

- [ ] **Step 4: Configure Astro with the canonical site URL**

Replace `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://radiantalphadigital.com',
  integrations: [sitemap()],
  build: { inlineStylesheets: 'auto' },
});
```

- [ ] **Step 5: Configure Vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 6: Add test scripts to package.json**

In `package.json`, set the `scripts` block to:

```json
{
  "dev": "astro dev",
  "build": "astro build",
  "preview": "astro preview",
  "test:unit": "vitest run",
  "test:e2e": "playwright test"
}
```

- [ ] **Step 7: Write the failing smoke test**

Create `tests/unit/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('toolchain', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 8: Run it**

Run: `npm run test:unit`
Expected: PASS, 1 test.

- [ ] **Step 9: Create the Netlify config**

Create `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "/fonts/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

- [ ] **Step 10: Verify the build produces output**

Run: `npm run build`
Expected: exits 0, `dist/index.html` exists.

```bash
test -f dist/index.html && echo "BUILD OK"
```

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold Astro project with Vitest and Netlify config"
```

---

## Task 2: Design tokens with an automated contrast guard

The contrast test is the mechanism that makes the gold rule enforceable rather than aspirational. It must fail loudly if anyone ever puts gold text on white.

**Files:**
- Create: `src/lib/contrast.ts`, `src/lib/tokens.ts`, `src/styles/tokens.css`
- Create: `tests/unit/contrast.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `relativeLuminance(hex: string): number`
  - `contrastRatio(a: string, b: string): number`
  - `TOKENS: Record<string, string>` — hex values keyed by token name
  - CSS custom properties `--ra-*` on `:root`

- [ ] **Step 1: Write the failing contrast test**

Create `tests/unit/contrast.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — `Cannot find module '../../src/lib/contrast'`.

- [ ] **Step 3: Implement the contrast utility**

Create `src/lib/contrast.ts`:

```ts
/** WCAG 2.2 relative luminance and contrast ratio. */

function toChannel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    throw new Error(`Expected a 6-digit hex colour, received "${hex}"`);
  }
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * toChannel(r) + 0.7152 * toChannel(g) + 0.0722 * toChannel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}
```

- [ ] **Step 4: Implement the token values**

Create `src/lib/tokens.ts`:

```ts
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

  ink:      '#101828',
  inkMuted: '#475467',
  canvas:   '#FDFCFA',
  surface:  '#FFFFFF',
  border:   '#E4E7EC',
} as const;

export type TokenName = keyof typeof TOKENS;
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test:unit`
Expected: PASS. In particular the two "gold rule" tests pass because gold on white measures ≈1.87:1, which is below 4.5.

- [ ] **Step 6: Write the CSS custom properties**

Create `src/styles/tokens.css`. Hex values must match `src/lib/tokens.ts` exactly:

```css
:root {
  /* Colour — mirrors src/lib/tokens.ts */
  --ra-navy-900: #0A1930;
  --ra-navy-800: #0E2244;
  --ra-navy-700: #16305C;
  --ra-navy-600: #1D3E7C;
  --ra-navy-500: #2E5AA8;
  --ra-navy-400: #5B84C4;
  --ra-navy-200: #B9CCE8;
  --ra-navy-50:  #EDF2FA;

  --ra-gold-500: #EFB42E;
  --ra-gold-400: #F5C85C;
  --ra-gold-300: #F9D98F;

  --ra-ink:       #101828;
  --ra-ink-muted: #475467;
  --ra-canvas:    #FDFCFA;
  --ra-surface:   #FFFFFF;
  --ra-border:    #E4E7EC;

  /* Semantic — light register (default) */
  --ra-bg:        var(--ra-canvas);
  --ra-fg:        var(--ra-ink);
  --ra-fg-muted:  var(--ra-ink-muted);
  --ra-heading:   var(--ra-navy-600);
  --ra-rule:      var(--ra-border);

  /* Type scale — fluid, 320px to 1280px viewport */
  --ra-step--1: clamp(0.83rem, 0.80rem + 0.15vw, 0.94rem);
  --ra-step-0:  clamp(1.00rem, 0.95rem + 0.25vw, 1.13rem);
  --ra-step-1:  clamp(1.20rem, 1.11rem + 0.45vw, 1.50rem);
  --ra-step-2:  clamp(1.44rem, 1.29rem + 0.75vw, 2.00rem);
  --ra-step-3:  clamp(1.73rem, 1.49rem + 1.20vw, 2.66rem);
  --ra-step-4:  clamp(2.07rem, 1.71rem + 1.82vw, 3.55rem);
  --ra-step-5:  clamp(2.49rem, 1.95rem + 2.70vw, 4.73rem);

  /* Spacing */
  --ra-space-2xs: 0.25rem;
  --ra-space-xs:  0.5rem;
  --ra-space-s:   0.75rem;
  --ra-space-m:   1rem;
  --ra-space-l:   1.5rem;
  --ra-space-xl:  2.5rem;
  --ra-space-2xl: 4rem;
  --ra-space-3xl: 6rem;

  /* Radii, borders, shadow */
  --ra-radius-s: 6px;
  --ra-radius-m: 12px;
  --ra-radius-l: 20px;
  --ra-shadow-s: 0 1px 2px rgb(16 24 40 / 0.06), 0 1px 3px rgb(16 24 40 / 0.10);
  --ra-shadow-m: 0 4px 8px -2px rgb(16 24 40 / 0.10), 0 2px 4px -2px rgb(16 24 40 / 0.06);

  /* Layout */
  --ra-measure: 68ch;
  --ra-container: 1180px;
  --ra-tap-min: 44px;
}

/* Dark register — applied by Section.astro, never to :root */
.ra-dark {
  --ra-bg:       var(--ra-navy-900);
  --ra-fg:       var(--ra-surface);
  --ra-fg-muted: var(--ra-navy-200);
  --ra-heading:  var(--ra-surface);
  --ra-accent:   var(--ra-gold-500);
  --ra-rule:     var(--ra-navy-700);
}
```

- [ ] **Step 7: Guard against CSS and TS drifting apart**

Append to `tests/unit/contrast.test.ts`:

```ts
import { readFileSync } from 'node:fs';

describe('tokens.css stays in sync with tokens.ts', () => {
  const css = readFileSync('src/styles/tokens.css', 'utf8');

  const cssVarFor: Record<string, string> = {
    navy900: '--ra-navy-900', navy800: '--ra-navy-800', navy700: '--ra-navy-700',
    navy600: '--ra-navy-600', navy500: '--ra-navy-500', navy400: '--ra-navy-400',
    navy200: '--ra-navy-200', navy50: '--ra-navy-50',
    gold500: '--ra-gold-500', gold400: '--ra-gold-400', gold300: '--ra-gold-300',
    ink: '--ra-ink', inkMuted: '--ra-ink-muted', canvas: '--ra-canvas',
    surface: '--ra-surface', border: '--ra-border',
  };

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
```

- [ ] **Step 8: Run the tests**

Run: `npm run test:unit`
Expected: PASS, all suites.

- [ ] **Step 9: Commit**

```bash
git add src/lib/contrast.ts src/lib/tokens.ts src/styles/tokens.css tests/unit/contrast.test.ts
git commit -m "feat: add design tokens with automated WCAG contrast guard"
```

---

## Task 3: Self-hosted fonts, reset, and global styles

**Files:**
- Create: `src/styles/reset.css`, `src/styles/global.css`
- Modify: `package.json` (font deps)

**Interfaces:**
- Consumes: `src/styles/tokens.css`
- Produces: `--ra-font-sans`, `--ra-font-display` custom properties; base element styling; focus and motion behaviour

- [ ] **Step 1: Verify the font packages exist before installing**

```bash
npm view @fontsource-variable/plus-jakarta-sans version
npm view @fontsource-variable/fraunces version
```

Expected: both print a version. If either 404s, pick a substitute from `npm search @fontsource-variable` — a geometric-humanist grotesque for `sans`, a display serif for `display` — and record the substitution in the commit message.

- [ ] **Step 2: Install**

```bash
npm install @fontsource-variable/plus-jakarta-sans @fontsource-variable/fraunces
```

- [ ] **Step 3: Create the reset**

Create `src/styles/reset.css`:

```css
*, *::before, *::after { box-sizing: border-box; }
* { margin: 0; }

html { -webkit-text-size-adjust: 100%; }

body {
  min-height: 100svh;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

img, picture, svg, video {
  display: block;
  max-width: 100%;
  height: auto;
}

input, button, textarea, select { font: inherit; color: inherit; }

p, h1, h2, h3, h4 { overflow-wrap: break-word; }

h1, h2, h3, h4 { text-wrap: balance; }
p { text-wrap: pretty; }

ul[role='list'], ol[role='list'] { list-style: none; padding: 0; }
```

- [ ] **Step 4: Create global styles**

Create `src/styles/global.css`:

```css
@import '@fontsource-variable/plus-jakarta-sans';
@import '@fontsource-variable/fraunces';
@import './reset.css';
@import './tokens.css';

:root {
  --ra-font-sans: 'Plus Jakarta Sans Variable', system-ui, -apple-system, sans-serif;
  --ra-font-display: 'Fraunces Variable', Georgia, serif;
}

body {
  font-family: var(--ra-font-sans);
  font-size: var(--ra-step-0);
  background: var(--ra-bg);
  color: var(--ra-fg);
}

h1, h2, h3, h4 {
  color: var(--ra-heading);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.02em;
}

h1 { font-size: var(--ra-step-5); }
h2 { font-size: var(--ra-step-4); }
h3 { font-size: var(--ra-step-2); }
h4 { font-size: var(--ra-step-1); }

/* Display face — dark register only. Never used on shop pages. */
.ra-display {
  font-family: var(--ra-font-display);
  font-weight: 600;
  font-variation-settings: 'SOFT' 20, 'WONK' 0;
  letter-spacing: -0.01em;
}

/* Prices and any figure that aligns in a column. */
.ra-numeric { font-variant-numeric: tabular-nums; }

a { color: var(--ra-navy-600); text-underline-offset: 0.2em; }
.ra-dark a { color: var(--ra-gold-500); }

:focus-visible {
  outline: 3px solid var(--ra-gold-500);
  outline-offset: 2px;
  border-radius: var(--ra-radius-s);
}
.ra-dark :focus-visible { outline-color: var(--ra-gold-400); }

.ra-container {
  width: min(100% - 2 * var(--ra-space-l), var(--ra-container));
  margin-inline: auto;
}

.ra-measure { max-width: var(--ra-measure); }

.ra-visually-hidden {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip-path: inset(50%); white-space: nowrap;
}

.ra-skip-link {
  position: absolute; top: 0; left: 0;
  padding: var(--ra-space-s) var(--ra-space-m);
  background: var(--ra-navy-900); color: var(--ra-surface);
  transform: translateY(-120%);
}
.ra-skip-link:focus-visible { transform: translateY(0); }

/* Every interactive target meets the 44px minimum. */
a[class*='ra-btn'], button, [role='button'] { min-height: var(--ra-tap-min); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 5: Verify the build still succeeds and fonts resolve**

Create a throwaway check by importing the stylesheet in `src/pages/index.astro`:

```astro
---
import '../styles/global.css';
---
<html lang="en-NG">
  <head><meta charset="utf-8" /><title>Radiant Alpha</title></head>
  <body><h1 class="ra-display">Radiant Alpha</h1></body>
</html>
```

Run: `npm run build`
Expected: exits 0. Confirm font files were emitted:

```bash
ls dist/_astro/*.woff2 | head -5
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add self-hosted variable fonts, reset, and global styles"
```

---

## Task 4: Site constants, currency, and WhatsApp link builder

These three modules encode the constraints that must never be retyped by hand. The WhatsApp builder is the Phase 1 revenue mechanism and gets the most test coverage.

**Files:**
- Create: `src/lib/site.ts`, `src/lib/format.ts`, `src/lib/whatsapp.ts`
- Create: `tests/unit/site.test.ts`, `tests/unit/format.test.ts`, `tests/unit/whatsapp.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `SITE` — frozen object: `domain`, `name`, `legalName`, `rcNumber`, `email`, `emailSecondary`, `phoneE164`, `phoneDisplay`, `whatsappNumber`, `location`, `trustLine`, `preOrderLeadTime`
  - `formatNaira(amount: number): string`
  - `buildWhatsAppUrl(opts: { message: string; number?: string }): string`
  - `buildEnquiryMessage(subject: string): string`

- [ ] **Step 1: Write the failing site-constants test**

Create `tests/unit/site.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SITE } from '../../src/lib/site';

describe('SITE constants', () => {
  it('uses the canonical domain without a trailing slash', () => {
    expect(SITE.domain).toBe('https://radiantalphadigital.com');
  });

  it('uses the primary help address', () => {
    expect(SITE.email).toBe('help@radiantalphadigital.com');
  });

  it('keeps the gmail address as secondary only', () => {
    expect(SITE.emailSecondary).toBe('radiantalphadigital@gmail.com');
  });

  it('stores the WhatsApp number in wa.me form — digits only, no plus', () => {
    expect(SITE.whatsappNumber).toBe('2349129665798');
    expect(SITE.whatsappNumber).toMatch(/^\d+$/);
  });

  it('exposes the phone in E.164 and display forms', () => {
    expect(SITE.phoneE164).toBe('+2349129665798');
    expect(SITE.phoneDisplay).toBe('+234 912 966 5798');
  });

  it('shows location at city level only', () => {
    expect(SITE.location).toBe('Abuja, FCT, Nigeria');
  });

  it('carries the exact footer trust line', () => {
    expect(SITE.trustLine).toBe(
      'RC 9421582 · Registered with the Corporate Affairs Commission, Nigeria · Abuja, FCT'
    );
  });

  it('never contains a superseded or private detail', () => {
    const serialised = JSON.stringify(SITE).toLowerCase();
    for (const forbidden of [
      '00yila.dev',
      '7040159044',
      '704 015 9044',
      'standard estate',
      'galadimawa',
      'b09',
      '2623730842678',
    ]) {
      expect(serialised).not.toContain(forbidden);
    }
  });

  it('is frozen so pages cannot mutate it', () => {
    expect(Object.isFrozen(SITE)).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — `Cannot find module '../../src/lib/site'`.

- [ ] **Step 3: Implement site constants**

Create `src/lib/site.ts`:

```ts
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:unit`
Expected: PASS.

- [ ] **Step 5: Write the failing currency test**

Create `tests/unit/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatNaira } from '../../src/lib/format';

describe('formatNaira', () => {
  it('formats with the naira sign and thousands separators', () => {
    expect(formatNaira(1154150)).toBe('₦1,154,150');
  });

  it('handles the catalogue minimum and maximum', () => {
    expect(formatNaira(200950)).toBe('₦200,950');
    expect(formatNaira(2392550)).toBe('₦2,392,550');
  });

  it('shows no decimal places — kobo is never displayed', () => {
    expect(formatNaira(285670)).toBe('₦285,670');
    expect(formatNaira(150000.4)).toBe('₦150,000');
  });

  it('formats zero', () => {
    expect(formatNaira(0)).toBe('₦0');
  });

  it('rejects negative amounts', () => {
    expect(() => formatNaira(-1)).toThrow(/negative/i);
  });

  it('rejects non-finite values', () => {
    expect(() => formatNaira(Number.NaN)).toThrow(/finite/i);
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement currency formatting**

Create `src/lib/format.ts`:

```ts
/**
 * Naira formatting. Always whole naira — kobo is never shown at these
 * price points, and trailing ".00" makes a 53-row price column noisier.
 * Pair with the .ra-numeric class so columns align.
 */
export function formatNaira(amount: number): string {
  if (!Number.isFinite(amount)) {
    throw new Error(`formatNaira expects a finite number, received ${amount}`);
  }
  if (amount < 0) {
    throw new Error(`formatNaira does not accept negative amounts: ${amount}`);
  }
  return `₦${Math.floor(amount).toLocaleString('en-NG')}`;
}
```

- [ ] **Step 8: Run to verify it passes**

Run: `npm run test:unit`
Expected: PASS. If `toLocaleString('en-NG')` produces non-Latin digits or an unexpected separator on this Node build, replace the body with an explicit regex grouping:

```ts
return `₦${Math.floor(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
```

- [ ] **Step 9: Write the failing WhatsApp test**

Create `tests/unit/whatsapp.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildWhatsAppUrl, buildEnquiryMessage } from '../../src/lib/whatsapp';
import { SITE } from '../../src/lib/site';

describe('buildWhatsAppUrl', () => {
  it('targets wa.me with the company number by default', () => {
    const url = new URL(buildWhatsAppUrl({ message: 'Hello' }));
    expect(url.origin).toBe('https://wa.me');
    expect(url.pathname).toBe(`/${SITE.whatsappNumber}`);
  });

  it('encodes the message into the text parameter', () => {
    const url = new URL(buildWhatsAppUrl({ message: 'Hello there' }));
    expect(url.searchParams.get('text')).toBe('Hello there');
  });

  it('round-trips newlines, the naira sign, and en dashes intact', () => {
    const message = 'Line one\nPrice ₦1,154,150\nWait 3–4 weeks';
    const url = new URL(buildWhatsAppUrl({ message }));
    expect(url.searchParams.get('text')).toBe(message);
  });

  it('percent-encodes rather than emitting raw spaces or newlines', () => {
    const raw = buildWhatsAppUrl({ message: 'a b\nc' });
    expect(raw).not.toMatch(/ /);
    expect(raw).not.toMatch(/\n/);
  });

  it('accepts an override number', () => {
    const url = new URL(buildWhatsAppUrl({ message: 'Hi', number: '2348000000000' }));
    expect(url.pathname).toBe('/2348000000000');
  });

  it('rejects a number containing a plus or spaces', () => {
    expect(() => buildWhatsAppUrl({ message: 'Hi', number: '+234 912' }))
      .toThrow(/digits/i);
  });

  it('rejects an empty message', () => {
    expect(() => buildWhatsAppUrl({ message: '   ' })).toThrow(/empty/i);
  });
});

describe('buildEnquiryMessage', () => {
  it('greets the company and states the subject', () => {
    const message = buildEnquiryMessage('Website Design & Development');
    expect(message).toContain('Radiant Alpha');
    expect(message).toContain('Website Design & Development');
  });

  it('produces a message that survives URL encoding', () => {
    const message = buildEnquiryMessage('E-Commerce Solutions');
    const url = new URL(buildWhatsAppUrl({ message }));
    expect(url.searchParams.get('text')).toBe(message);
  });
});
```

- [ ] **Step 10: Run to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — module not found.

- [ ] **Step 11: Implement the WhatsApp builder**

Create `src/lib/whatsapp.ts`:

```ts
import { SITE } from './site';

const WA_BASE = 'https://wa.me';

export interface WhatsAppOptions {
  message: string;
  /** Digits only, country code first, no plus. Defaults to the company number. */
  number?: string;
}

/**
 * Builds a wa.me deep link with a pre-filled message.
 *
 * This is the Phase 1 revenue mechanism — every pre-order and service
 * enquiry passes through it, so it validates its inputs rather than
 * silently producing a broken link.
 */
export function buildWhatsAppUrl({ message, number }: WhatsAppOptions): string {
  const target = number ?? SITE.whatsappNumber;

  if (!/^\d{7,15}$/.test(target)) {
    throw new Error(
      `WhatsApp number must be 7-15 digits with no plus or spaces, received "${target}"`
    );
  }
  if (message.trim().length === 0) {
    throw new Error('WhatsApp message cannot be empty');
  }

  return `${WA_BASE}/${target}?text=${encodeURIComponent(message)}`;
}

/** Standard opener for a service enquiry. */
export function buildEnquiryMessage(subject: string): string {
  return `Hi Radiant Alpha, I'd like to enquire about ${subject}.`;
}
```

- [ ] **Step 12: Run to verify all pass**

Run: `npm run test:unit`
Expected: PASS, all four suites.

- [ ] **Step 13: Commit**

```bash
git add src/lib tests/unit
git commit -m "feat: add site constants, naira formatting, and WhatsApp link builder"
```

---

## Task 5: Comps gate — home hero and product card

**This task is a stop. Do not proceed to Task 6 until the client has approved the comps.** The spec makes visual direction contingent on built comps rather than prose (spec §12, step 2).

**Files:**
- Create: `src/pages/comps/hero.astro`, `src/pages/comps/product.astro`
- Create: `src/components/Section.astro`, `src/components/Button.astro`

**Interfaces:**
- Consumes: `src/styles/global.css`, `src/lib/format.ts`, `src/lib/whatsapp.ts`
- Produces:
  - `Section.astro` — props `{ register?: 'light' | 'dark'; as?: string; class?: string }`
  - `Button.astro` — props `{ href: string; variant?: 'primary' | 'secondary' | 'gold'; external?: boolean }`

- [ ] **Step 1: Build the Section register wrapper**

Create `src/components/Section.astro`:

```astro
---
interface Props {
  register?: 'light' | 'dark';
  as?: 'section' | 'div' | 'header' | 'footer';
  class?: string;
}
const { register = 'light', as: Tag = 'section', class: className = '' } = Astro.props;
---
<Tag class:list={['ra-section', register === 'dark' && 'ra-dark', className]}>
  <div class="ra-container">
    <slot />
  </div>
</Tag>

<style>
  .ra-section {
    background: var(--ra-bg);
    color: var(--ra-fg);
    padding-block: var(--ra-space-3xl);
  }
  @media (max-width: 640px) {
    .ra-section { padding-block: var(--ra-space-2xl); }
  }
</style>
```

- [ ] **Step 2: Build the Button primitive**

Create `src/components/Button.astro`. Note the gold variant carries navy text — enforced by the Task 2 contrast test:

```astro
---
interface Props {
  href: string;
  variant?: 'primary' | 'secondary' | 'gold';
  external?: boolean;
  class?: string;
}
const { href, variant = 'primary', external = false, class: className = '' } = Astro.props;
const rel = external ? 'noopener noreferrer' : undefined;
const target = external ? '_blank' : undefined;
---
<a href={href} rel={rel} target={target} class:list={['ra-btn', `ra-btn--${variant}`, className]}>
  <slot />
</a>

<style>
  .ra-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--ra-space-xs);
    min-height: var(--ra-tap-min);
    padding: var(--ra-space-s) var(--ra-space-l);
    border-radius: var(--ra-radius-m);
    font-weight: 600;
    text-decoration: none;
    transition: transform 150ms ease, background-color 150ms ease;
  }
  .ra-btn:hover { transform: translateY(-1px); }

  .ra-btn--primary {
    background: var(--ra-navy-600);
    color: var(--ra-surface);
  }
  .ra-btn--primary:hover { background: var(--ra-navy-700); }

  .ra-btn--secondary {
    background: transparent;
    color: var(--ra-fg);
    box-shadow: inset 0 0 0 1.5px var(--ra-rule);
  }

  /* Gold fill always carries navy text. White on gold measures 1.87:1. */
  .ra-btn--gold {
    background: var(--ra-gold-500);
    color: var(--ra-navy-900);
  }
  .ra-btn--gold:hover { background: var(--ra-gold-400); }
</style>
```

- [ ] **Step 3: Build the home hero comp**

Create `src/pages/comps/hero.astro`. Copy is verbatim from `docs/content-brief.md` §2:

```astro
---
import '../../styles/global.css';
import Section from '../../components/Section.astro';
import Button from '../../components/Button.astro';
import { SITE } from '../../lib/site';
---
<html lang="en-NG">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Comp — Home hero</title>
</head>
<body>
  <Section register="dark" as="header" class="hero">
    <p class="hero__eyebrow">Digital services · Abuja, Nigeria</p>
    <h1 class="ra-display hero__title">Building Digital Solutions That Drive Business Growth.</h1>
    <p class="hero__sub">
      We help businesses establish a powerful digital presence through professional web
      development, custom software, digital marketing, IT consulting, and quality
      technology products.
    </p>
    <div class="hero__actions">
      <Button href="/contact" variant="gold">Start Your Project</Button>
      <Button href="/services" variant="secondary">Explore Our Services</Button>
    </div>
    <p class="hero__trust">{SITE.trustLine}</p>
  </Section>
</body>
</html>

<style>
  .hero { padding-block: clamp(4rem, 12vh, 9rem); }
  .hero__eyebrow {
    color: var(--ra-gold-500);
    font-size: var(--ra-step--1);
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: var(--ra-space-m);
  }
  .hero__title { max-width: 18ch; margin-bottom: var(--ra-space-l); }
  .hero__sub {
    max-width: 54ch;
    color: var(--ra-fg-muted);
    font-size: var(--ra-step-1);
    margin-bottom: var(--ra-space-xl);
  }
  .hero__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ra-space-m);
    margin-bottom: var(--ra-space-2xl);
  }
  .hero__trust {
    font-size: var(--ra-step--1);
    color: var(--ra-fg-muted);
    padding-top: var(--ra-space-l);
    border-top: 1px solid var(--ra-rule);
  }
</style>
```

- [ ] **Step 4: Build the product card comp**

Create `src/pages/comps/product.astro`. This validates the light register, the transparency block, and the tabular price treatment before Plan 2 builds 53 of them:

```astro
---
import '../../styles/global.css';
import Section from '../../components/Section.astro';
import Button from '../../components/Button.astro';
import { formatNaira } from '../../lib/format';
import { buildWhatsAppUrl } from '../../lib/whatsapp';
import { SITE } from '../../lib/site';

const product = {
  model: 'iPhone 15 Pro Max',
  storage: '256GB',
  price: 1154150,
  ref: 'IP15PM-256',
  condition: 'Refurbished — Grade A',
  networkLock: 'Factory unlocked',
  simType: 'Dual physical SIM',
  batteryHealth: '90%+',
  warrantyDays: 14,
};

const message = [
  `Hi Radiant Alpha, I'd like to pre-order:`,
  `${product.model} — ${product.storage} — ${formatNaira(product.price)}`,
  `Ref: ${product.ref}`,
  `I understand delivery is ${SITE.preOrderLeadTime} from order confirmation.`,
].join('\n');

const waUrl = buildWhatsAppUrl({ message });
---
<html lang="en-NG">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Comp — Product page</title>
</head>
<body>
  <Section>
    <div class="pdp">
      <div class="pdp__media" aria-hidden="true">
        <span class="pdp__placeholder">{product.model}<br />{product.storage}</span>
      </div>

      <div class="pdp__detail">
        <h1 class="pdp__title">{product.model}</h1>
        <p class="pdp__storage">{product.storage}</p>
        <p class="pdp__price ra-numeric">{formatNaira(product.price)}</p>

        <p class="pdp__notice">
          <strong>Pre-order:</strong> allow {SITE.preOrderLeadTime} from order
          confirmation for delivery.
        </p>

        <dl class="pdp__specs">
          <div><dt>Condition</dt><dd>{product.condition}</dd></div>
          <div><dt>Network</dt><dd>{product.networkLock}</dd></div>
          <div><dt>SIM</dt><dd>{product.simType}</dd></div>
          <div><dt>Battery</dt><dd>{product.batteryHealth}</dd></div>
          <div><dt>Warranty</dt><dd>{product.warrantyDays} days</dd></div>
        </dl>

        <Button href={waUrl} variant="primary" external>Pre-order on WhatsApp</Button>

        <p class="pdp__notice pdp__notice--repeat">
          Delivery {SITE.preOrderLeadTime} from confirmation ·
          <a href="/returns">Returns &amp; warranty</a>
        </p>
      </div>
    </div>
  </Section>
</body>
</html>

<style>
  .pdp { display: grid; gap: var(--ra-space-xl); }
  @media (min-width: 820px) {
    .pdp { grid-template-columns: 1fr 1fr; gap: var(--ra-space-3xl); align-items: start; }
  }
  .pdp__media {
    display: grid;
    place-items: center;
    aspect-ratio: 1;
    border-radius: var(--ra-radius-l);
    background: linear-gradient(160deg, var(--ra-navy-800), var(--ra-navy-600));
  }
  .pdp__placeholder {
    color: var(--ra-gold-500);
    font-weight: 600;
    text-align: center;
    line-height: 1.4;
  }
  .pdp__title { font-size: var(--ra-step-3); }
  .pdp__storage { color: var(--ra-fg-muted); margin-top: var(--ra-space-2xs); }
  .pdp__price {
    font-size: var(--ra-step-3);
    font-weight: 700;
    color: var(--ra-navy-600);
    margin-block: var(--ra-space-m);
  }
  .pdp__notice {
    background: var(--ra-navy-50);
    border-left: 3px solid var(--ra-gold-500);
    border-radius: var(--ra-radius-s);
    padding: var(--ra-space-s) var(--ra-space-m);
    font-size: var(--ra-step--1);
    margin-bottom: var(--ra-space-l);
  }
  .pdp__notice--repeat { margin-top: var(--ra-space-m); margin-bottom: 0; }
  .pdp__specs {
    display: grid;
    gap: var(--ra-space-xs);
    margin-bottom: var(--ra-space-l);
    padding-block: var(--ra-space-m);
    border-block: 1px solid var(--ra-rule);
  }
  .pdp__specs > div { display: flex; justify-content: space-between; gap: var(--ra-space-m); }
  .pdp__specs dt { color: var(--ra-fg-muted); font-size: var(--ra-step--1); }
  .pdp__specs dd { font-weight: 600; text-align: right; }
</style>
```

- [ ] **Step 5: Review both comps in a browser at 375px and 1280px**

```bash
npm run dev
```

Open `http://localhost:4321/comps/hero` and `http://localhost:4321/comps/product`. Check at 375px width first — mobile is the primary target.

- [ ] **Step 6: Verify no gold text sits on a light background**

Inspect the product comp. Gold appears only as the 3px notice border and inside the dark media panel. If gold text appears anywhere on `--ra-canvas` or `--ra-surface`, it is a defect — fix before review.

- [ ] **Step 7: Commit**

```bash
git add src/components src/pages/comps
git commit -m "feat: add Section and Button primitives with home hero and product comps"
```

- [ ] **Step 8: STOP — present comps to the client for approval**

Do not begin Task 6 until approved. Record any requested changes, apply them to the comps, and re-present. Font substitutions, spacing, and colour weighting are all still open at this gate; after it, they are settled.

---

## Task 6: Base layout and SEO component

**Files:**
- Create: `src/layouts/Base.astro`, `src/components/Seo.astro`
- Create: `public/robots.txt`
- Create: `tests/e2e/seo.spec.ts`, `playwright.config.ts`

**Interfaces:**
- Consumes: `SITE`, `src/styles/global.css`
- Produces:
  - `Seo.astro` — props `{ title: string; description: string; path: string; type?: 'website' | 'article'; noindex?: boolean }`
  - `Base.astro` — same props plus a default slot; renders skip link, header, main, footer, WhatsApp button

- [ ] **Step 1: Configure Playwright**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4321' },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

```bash
npx playwright install chromium
```

- [ ] **Step 2: Write the failing SEO test**

Create `tests/e2e/seo.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('document head', () => {
  test('has a unique title and meta description', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Radiant Alpha/);
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', /.{50,}/);
  });

  test('declares a canonical URL on the production domain', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://radiantalphadigital.com/'
    );
  });

  test('declares Open Graph tags', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website');
  });

  test('emits Organization structured data carrying the RC number', async ({ page }) => {
    await page.goto('/');
    const json = await page.locator('script[type="application/ld+json"]').first().textContent();
    const data = JSON.parse(json!);
    expect(data['@type']).toBe('Organization');
    expect(JSON.stringify(data)).toContain('9421582');
  });

  test('sets the document language to Nigerian English', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-NG');
  });

  test('comps are excluded from indexing', async ({ page }) => {
    await page.goto('/comps/hero');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm run test:e2e`
Expected: FAIL — no canonical link, no JSON-LD.

- [ ] **Step 4: Implement the SEO component**

Create `src/components/Seo.astro`:

```astro
---
import { SITE } from '../lib/site';

interface Props {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article';
  noindex?: boolean;
}
const { title, description, path, type = 'website', noindex = false } = Astro.props;

const canonical = new URL(path, SITE.domain).href;
const fullTitle = path === '/' ? title : `${title} | ${SITE.name}`;

const organisation = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE.legalName,
  alternateName: SITE.name,
  url: SITE.domain,
  email: SITE.email,
  telephone: SITE.phoneE164,
  foundingDate: SITE.founded,
  identifier: { '@type': 'PropertyValue', name: 'RC Number', value: SITE.rcNumber },
  address: {
    '@type': 'PostalAddress',
    addressLocality: SITE.addressLocality,
    addressRegion: SITE.addressRegion,
    addressCountry: SITE.addressCountry,
  },
};
---
<title>{fullTitle}</title>
<meta name="description" content={description} />
<link rel="canonical" href={canonical} />
{noindex && <meta name="robots" content="noindex, nofollow" />}

<meta property="og:title" content={fullTitle} />
<meta property="og:description" content={description} />
<meta property="og:type" content={type} />
<meta property="og:url" content={canonical} />
<meta property="og:site_name" content={SITE.legalName} />
<meta property="og:locale" content="en_NG" />
<meta name="twitter:card" content="summary_large_image" />

<script type="application/ld+json" set:html={JSON.stringify(organisation)} />
```

- [ ] **Step 5: Implement the base layout**

Create `src/layouts/Base.astro`. Header, Footer and WhatsAppButton arrive in Task 7 — import them now and create minimal stubs so the layout compiles, then Task 7 fills them in:

```astro
---
import '../styles/global.css';
import Seo from '../components/Seo.astro';
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';
import WhatsAppButton from '../components/WhatsAppButton.astro';

interface Props {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article';
  noindex?: boolean;
}
const { title, description, path, type, noindex } = Astro.props;
---
<!doctype html>
<html lang="en-NG">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="/favicon.png" />
    <Seo title={title} description={description} path={path} type={type} noindex={noindex} />
  </head>
  <body>
    <a class="ra-skip-link" href="#main">Skip to content</a>
    <Header />
    <main id="main">
      <slot />
    </main>
    <Footer />
    <WhatsAppButton />
  </body>
</html>
```

- [ ] **Step 6: Create minimal component stubs so the layout compiles**

Create `src/components/Header.astro`, `src/components/Footer.astro`, `src/components/WhatsAppButton.astro`, each containing only:

```astro
<!-- filled in by Task 7 -->
```

- [ ] **Step 7: Point the homepage at the layout**

Replace `src/pages/index.astro`:

```astro
---
import Base from '../layouts/Base.astro';
import { SITE } from '../lib/site';
---
<Base
  title="Radiant Alpha Digital Services — Web Development & Digital Marketing in Abuja"
  description="Radiant Alpha Digital Services Ltd builds websites, custom software, and digital marketing for businesses across Nigeria. CAC registered, based in Abuja."
  path="/"
>
  <h1>{SITE.tagline}</h1>
</Base>
```

- [ ] **Step 8: Add robots.txt**

Create `public/robots.txt`:

```
User-agent: *
Allow: /
Disallow: /comps/

Sitemap: https://radiantalphadigital.com/sitemap-index.xml
```

- [ ] **Step 9: Add noindex to the comps pages**

In both `src/pages/comps/hero.astro` and `src/pages/comps/product.astro`, confirm `<meta name="robots" content="noindex, nofollow" />` is present in the head. It was added in Task 5.

- [ ] **Step 10: Run the tests to verify they pass**

Run: `npm run test:e2e`
Expected: PASS on both mobile and desktop projects.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: add base layout, SEO component with Organization schema, and robots.txt"
```

---

## Task 7: Header, footer, and WhatsApp button

**Files:**
- Modify: `src/components/Header.astro`, `src/components/Footer.astro`, `src/components/WhatsAppButton.astro`
- Create: `public/images/logo-mark.svg`, `public/favicon.png`
- Create: `tests/e2e/navigation.spec.ts`

**Interfaces:**
- Consumes: `SITE`, `buildWhatsAppUrl`, `buildEnquiryMessage`
- Produces: site chrome present on every page

- [ ] **Step 1: Copy the logo assets into the repo**

```bash
mkdir -p public/images
cp "/c/Users/hp/Downloads/Main Logo.svg" public/images/logo-full.svg
cp "/c/Users/hp/Downloads/Logo/Favicon.png" public/favicon.png
cp "/c/Users/hp/Downloads/Logo/Small Logo.png" public/images/logo-mark.png
ls -la public/images public/favicon.png
```

- [ ] **Step 2: Write the failing navigation test**

Create `tests/e2e/navigation.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

const NAV_ITEMS = ['Services', 'Shop', 'Work', 'About', 'Blog', 'Contact'];

test.describe('header', () => {
  test('exposes a navigation landmark with all six primary links', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: /primary/i });
    for (const item of NAV_ITEMS) {
      await expect(nav.getByRole('link', { name: item, exact: true })).toBeVisible();
    }
  });

  test('the logo links home', async ({ page }) => {
    await page.goto('/about');
    await page.getByRole('link', { name: /radiant alpha home/i }).click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('mobile navigation', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('opens and closes via the toggle, updating aria-expanded', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: /menu/i });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('navigation', { name: /primary/i })).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('closes on Escape', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: /menu/i });
    await toggle.click();
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('the toggle meets the 44px minimum tap target', async ({ page }) => {
    await page.goto('/');
    const box = await page.getByRole('button', { name: /menu/i }).boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});

test.describe('footer', () => {
  test('shows the RC trust line', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/RC 9421582/)).toBeVisible();
  });

  test('shows city-level location only', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Abuja, FCT, Nigeria').first()).toBeVisible();
  });

  test('links the primary help address', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.locator('a[href="mailto:help@radiantalphadigital.com"]').first()
    ).toBeVisible();
  });
});

test.describe('floating WhatsApp button', () => {
  test('is present with an accessible name and a valid wa.me link', async ({ page }) => {
    await page.goto('/');
    const cta = page.getByRole('link', { name: /whatsapp/i }).last();
    await expect(cta).toBeVisible();
    const href = await cta.getAttribute('href');
    expect(href).toMatch(/^https:\/\/wa\.me\/2349129665798\?text=/);
  });

  test('meets the 44px minimum tap target', async ({ page }) => {
    await page.goto('/');
    const box = await page.getByRole('link', { name: /whatsapp/i }).last().boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm run test:e2e -- navigation`
Expected: FAIL — no navigation landmark exists.

- [ ] **Step 4: Implement the header**

Replace `src/components/Header.astro`. The mobile toggle is the only scripted element in the site chrome — roughly 20 lines of vanilla JS:

```astro
---
const links = [
  { href: '/services', label: 'Services' },
  { href: '/shop', label: 'Shop' },
  { href: '/work', label: 'Work' },
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact' },
];
const current = Astro.url.pathname;
---
<header class="hdr">
  <div class="ra-container hdr__inner">
    <a href="/" class="hdr__logo" aria-label="Radiant Alpha home">
      <img src="/images/logo-full.svg" alt="" width="180" height="40" />
    </a>

    <button
      class="hdr__toggle"
      type="button"
      aria-expanded="false"
      aria-controls="primary-nav"
      aria-label="Menu"
    >
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" aria-hidden="true">
        <path d="M3 6h18M3 12h18M3 18h18" />
      </svg>
    </button>

    <nav id="primary-nav" class="hdr__nav" aria-label="Primary">
      <ul role="list">
        {links.map(({ href, label }) => (
          <li>
            <a href={href} aria-current={current.startsWith(href) ? 'page' : undefined}>
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  </div>
</header>

<script>
  const toggle = document.querySelector<HTMLButtonElement>('.hdr__toggle');
  const nav = document.querySelector<HTMLElement>('#primary-nav');

  function setOpen(open: boolean) {
    toggle?.setAttribute('aria-expanded', String(open));
    nav?.classList.toggle('is-open', open);
  }

  toggle?.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });
</script>

<style>
  .hdr {
    position: sticky;
    top: 0;
    z-index: 20;
    background: var(--ra-canvas);
    border-bottom: 1px solid var(--ra-border);
  }
  .hdr__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ra-space-m);
    min-height: 68px;
  }
  .hdr__logo { display: flex; align-items: center; }
  .hdr__logo img { width: auto; height: 34px; }

  .hdr__toggle {
    display: grid;
    place-items: center;
    width: var(--ra-tap-min);
    height: var(--ra-tap-min);
    background: none;
    border: 0;
    color: var(--ra-navy-600);
    cursor: pointer;
  }

  .hdr__nav ul {
    display: flex;
    gap: var(--ra-space-l);
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .hdr__nav a {
    display: inline-flex;
    align-items: center;
    min-height: var(--ra-tap-min);
    color: var(--ra-ink);
    font-weight: 600;
    text-decoration: none;
  }
  .hdr__nav a[aria-current='page'] { color: var(--ra-navy-600); }
  .hdr__nav a:hover { color: var(--ra-navy-600); }

  @media (max-width: 900px) {
    .hdr__nav {
      display: none;
      position: absolute;
      inset-inline: 0;
      top: 100%;
      background: var(--ra-canvas);
      border-bottom: 1px solid var(--ra-border);
      padding: var(--ra-space-m) var(--ra-space-l) var(--ra-space-l);
    }
    .hdr__nav.is-open { display: block; }
    .hdr__nav ul { flex-direction: column; gap: 0; }
    .hdr__nav li + li { border-top: 1px solid var(--ra-border); }
    .hdr__nav a { width: 100%; }
  }

  @media (min-width: 901px) {
    .hdr__toggle { display: none; }
  }
</style>
```

- [ ] **Step 5: Implement the footer**

Replace `src/components/Footer.astro`:

```astro
---
import { SITE } from '../lib/site';

const columns = [
  {
    heading: 'Services',
    links: [
      { href: '/services/software-development', label: 'Software Development' },
      { href: '/services/website-design-development', label: 'Website Design' },
      { href: '/services/ecommerce-solutions', label: 'E-Commerce' },
      { href: '/services/digital-marketing', label: 'Digital Marketing' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { href: '/about', label: 'About Us' },
      { href: '/work', label: 'Our Work' },
      { href: '/blog', label: 'Blog' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    heading: 'Support',
    links: [
      { href: '/shop', label: 'Shop' },
      { href: '/returns', label: 'Returns & Warranty' },
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/terms', label: 'Terms of Service' },
    ],
  },
];
const year = new Date().getFullYear();
---
<footer class="ftr ra-dark">
  <div class="ra-container">
    <div class="ftr__grid">
      <div class="ftr__brand">
        <img src="/images/logo-mark.png" alt="" width="48" height="48" />
        <p class="ftr__tagline">{SITE.tagline}</p>
        <address class="ftr__contact">
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          <a href={`tel:${SITE.phoneE164}`}>{SITE.phoneDisplay}</a>
          <span>{SITE.location}</span>
        </address>
      </div>

      {columns.map(({ heading, links }) => (
        <nav class="ftr__col" aria-label={heading}>
          <h2 class="ftr__heading">{heading}</h2>
          <ul role="list">
            {links.map(({ href, label }) => (
              <li><a href={href}>{label}</a></li>
            ))}
          </ul>
        </nav>
      ))}
    </div>

    <div class="ftr__legal">
      <p class="ftr__trust">{SITE.trustLine}</p>
      <p class="ftr__copy">© {year} {SITE.legalName}. All rights reserved.</p>
    </div>
  </div>
</footer>

<style>
  .ftr {
    background: var(--ra-navy-900);
    color: var(--ra-surface);
    padding-block: var(--ra-space-2xl) var(--ra-space-xl);
    margin-top: var(--ra-space-3xl);
  }
  .ftr__grid {
    display: grid;
    gap: var(--ra-space-xl);
    grid-template-columns: 1fr;
  }
  @media (min-width: 720px) {
    .ftr__grid { grid-template-columns: 1.4fr repeat(3, 1fr); }
  }
  .ftr__brand img { width: 48px; height: 48px; }
  .ftr__tagline {
    max-width: 30ch;
    margin-block: var(--ra-space-m);
    color: var(--ra-navy-200);
  }
  .ftr__contact { display: grid; gap: var(--ra-space-2xs); font-style: normal; }
  .ftr__contact a, .ftr__contact span { color: var(--ra-gold-500); text-decoration: none; }
  .ftr__contact span { color: var(--ra-navy-200); }
  .ftr__contact a:hover { text-decoration: underline; }

  .ftr__heading {
    font-size: var(--ra-step--1);
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ra-navy-200);
    margin-bottom: var(--ra-space-m);
  }
  .ftr__col ul { display: grid; gap: var(--ra-space-xs); list-style: none; padding: 0; }
  .ftr__col a {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    color: var(--ra-surface);
    text-decoration: none;
  }
  .ftr__col a:hover { color: var(--ra-gold-500); }

  .ftr__legal {
    margin-top: var(--ra-space-xl);
    padding-top: var(--ra-space-l);
    border-top: 1px solid var(--ra-navy-700);
    display: grid;
    gap: var(--ra-space-xs);
    font-size: var(--ra-step--1);
    color: var(--ra-navy-200);
  }
</style>
```

- [ ] **Step 6: Implement the floating WhatsApp button**

Replace `src/components/WhatsAppButton.astro`:

```astro
---
import { buildWhatsAppUrl } from '../lib/whatsapp';

const href = buildWhatsAppUrl({
  message: "Hi Radiant Alpha, I'd like to make an enquiry.",
});
---
<a class="wa" href={href} target="_blank" rel="noopener noreferrer">
  <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.22 8.22 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23a8.19 8.19 0 0 1 8.23 8.24c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.09-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.43.06-.66.31-.22.25-.87.85-.87 2.07 0 1.22.89 2.4 1.02 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.28Z"/>
  </svg>
  <span class="ra-visually-hidden">Chat with us on WhatsApp</span>
</a>

<style>
  .wa {
    position: fixed;
    right: var(--ra-space-l);
    bottom: var(--ra-space-l);
    z-index: 30;
    display: grid;
    place-items: center;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: #25D366;
    color: #0A1930;
    box-shadow: var(--ra-shadow-m);
    transition: transform 150ms ease;
  }
  .wa:hover { transform: scale(1.06); }

  /* Clear the footer so it never covers legal links. */
  @supports (bottom: env(safe-area-inset-bottom)) {
    .wa { bottom: calc(var(--ra-space-l) + env(safe-area-inset-bottom)); }
  }
</style>
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm run test:e2e -- navigation`
Expected: PASS on both projects.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add header with mobile nav, footer with trust line, and WhatsApp CTA"
```

---

## Task 8: Services content collection

Seven service pages come from one template and seven Markdown files. Modelling this as a collection now means Plan 3 can point Decap CMS at it with no restructuring.

**Files:**
- Create: `src/content.config.ts`
- Create: `src/content/services/{software-development,website-design-development,ecommerce-solutions,digital-marketing,it-consulting,networking-infrastructure,technology-products}.md`
- Create: `tests/unit/services.test.ts`

**Interfaces:**
- Consumes: `astro:content`
- Produces: a `services` collection whose entries have `{ title, shortTitle, summary, startingFrom, order, lead, faqs }` in frontmatter and body Markdown

- [ ] **Step 1: Write the failing collection test**

Create `tests/unit/services.test.ts`. This reads the files directly rather than through Astro's runtime, so it runs under plain Vitest:

```ts
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'src/content/services';

const EXPECTED = [
  'software-development',
  'website-design-development',
  'ecommerce-solutions',
  'digital-marketing',
  'it-consulting',
  'networking-infrastructure',
  'technology-products',
];

function frontmatter(slug: string): Record<string, string> {
  const raw = readFileSync(join(DIR, `${slug}.md`), 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error(`${slug}.md has no frontmatter`);
  const fields: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) fields[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
  }
  return fields;
}

describe('services collection', () => {
  it('contains exactly the seven expected services', () => {
    const found = readdirSync(DIR).filter((f) => f.endsWith('.md')).map((f) => f.replace('.md', ''));
    expect(found.sort()).toEqual([...EXPECTED].sort());
  });

  it.each(EXPECTED)('%s has every required frontmatter field', (slug) => {
    const fm = frontmatter(slug);
    for (const field of ['title', 'shortTitle', 'summary', 'lead', 'order']) {
      expect(fm[field], `${slug} is missing "${field}"`).toBeTruthy();
    }
  });

  it.each(EXPECTED)('%s has a meta-length summary between 70 and 160 characters', (slug) => {
    const { summary } = frontmatter(slug);
    expect(summary.length).toBeGreaterThanOrEqual(70);
    expect(summary.length).toBeLessThanOrEqual(160);
  });

  it('assigns a unique display order, with the four lead services first', () => {
    const orders = EXPECTED.map((slug) => Number(frontmatter(slug).order));
    expect(new Set(orders).size).toBe(EXPECTED.length);

    const leadServices = [
      'software-development',
      'website-design-development',
      'ecommerce-solutions',
      'digital-marketing',
    ];
    for (const slug of leadServices) {
      expect(Number(frontmatter(slug).order)).toBeLessThanOrEqual(4);
    }
  });

  it('never leaks a private detail into service copy', () => {
    for (const slug of EXPECTED) {
      const raw = readFileSync(join(DIR, `${slug}.md`), 'utf8').toLowerCase();
      for (const forbidden of ['00yila.dev', 'standard estate', 'galadimawa', '2623730842678']) {
        expect(raw, `${slug}.md contains "${forbidden}"`).not.toContain(forbidden);
      }
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — `ENOENT: no such file or directory, scandir 'src/content/services'`.

- [ ] **Step 3: Define the collection schema**

Create `src/content.config.ts`:

```ts
import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const services = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/services' }),
  schema: z.object({
    title: z.string(),
    shortTitle: z.string(),
    summary: z.string().min(70).max(160),
    lead: z.boolean(),
    order: z.number().int().positive(),
    startingFrom: z.number().int().positive().optional(),
    faqs: z
      .array(z.object({ question: z.string(), answer: z.string() }))
      .default([]),
  }),
});

const settings = defineCollection({
  loader: file('./src/content/settings/site.json'),
  schema: z.object({
    id: z.string(),
    preOrderLeadTime: z.string(),
  }),
});

export const collections = { services, settings };
```

- [ ] **Step 4: Write the four lead services**

Copy is adapted from `docs/content-brief.md` §6 and §7.

Create `src/content/services/software-development.md`:

```markdown
---
title: "Software Development"
shortTitle: "Software Development"
summary: "Custom software built to automate your processes, cut manual work, and scale with your business. Built in Abuja for Nigerian organisations."
lead: true
order: 1
startingFrom: 500000
faqs:
  - question: "How long does a custom software project take?"
    answer: "Most projects run six to twelve weeks depending on scope. We agree milestones up front so you always know what is being delivered and when."
  - question: "Do I own the code you write?"
    answer: "Yes. On final payment, the source code and all project files are transferred to you. You are never locked into us as a supplier."
---

## Software that removes manual work

Most businesses lose hours every week to work a computer should be doing:
re-typing the same data into two systems, chasing paperwork by phone,
assembling reports by hand at month end. Custom software is worth building at
exactly the point where that lost time starts costing more than the software
would.

We build the system around how your business actually runs, not the other way
round.

## What we build

- Internal tools that replace spreadsheets and manual record-keeping
- Customer and inventory management systems
- Booking, scheduling, and workflow automation
- Reporting dashboards that assemble themselves
- API integrations between systems that do not currently talk to each other

## How we work

We start by mapping the process you want to improve, then agree a scope and a
fixed set of milestones. You see working software early and often, rather than
waiting months for a single delivery. After launch we stay available for
changes as the business grows.
```

Create `src/content/services/website-design-development.md`:

```markdown
---
title: "Website Design & Development"
shortTitle: "Website Design"
summary: "Fast, mobile-first websites designed to convert visitors into customers. Built to load quickly on Nigerian mobile networks and rank in local search."
lead: true
order: 2
startingFrom: 150000
faqs:
  - question: "Will my website work well on mobile?"
    answer: "Every site we build is designed mobile-first, because that is where most Nigerian traffic comes from. We test on real mid-range Android devices, not just desktop browsers."
  - question: "Can I update the site myself afterwards?"
    answer: "Yes. We can build in an admin panel so you can edit text, images, and prices without needing a developer. Ask for it when we scope the project."
---

## A website that earns its place

A website should do a job: bring in enquiries, answer the questions that waste
your time on the phone, and make a first-time visitor confident enough to
contact you. Most do not, usually because they are slow, hard to read on a
phone, or built to impress rather than to convert.

We design for the visitor you actually get — on a phone, on mobile data, deciding
in the first few seconds whether you are worth contacting.

## What is included

- Mobile-first responsive design across every screen size
- Performance tuned for slower connections
- Search-friendly structure so people can find you
- Clear paths to contact you by phone, WhatsApp, or form
- Optional admin panel so you can make edits yourself

## Built to keep

You own the finished site. The files are yours, the domain is registered in
your name, and nothing is locked inside a platform only we can access.
```

Create `src/content/services/ecommerce-solutions.md`:

```markdown
---
title: "E-Commerce Solutions"
shortTitle: "E-Commerce"
summary: "Online stores that take payment reliably and are simple to run day to day. Product management, secure checkout, and order handling built in."
lead: true
order: 3
startingFrom: 300000
faqs:
  - question: "Which payment methods can you set up?"
    answer: "We integrate the providers Nigerian customers already trust, including Paystack and Flutterwave for card payments, alongside bank transfer and pay-on-delivery where it suits your business."
  - question: "Can I add and edit products myself?"
    answer: "Yes. Every store we build includes an admin area for adding products, updating prices, and managing stock without a developer."
---

## Selling online, without the friction

An online store fails for ordinary reasons: checkout breaks on mobile, payment
options do not match how customers actually pay, or adding a product is so
awkward the catalogue goes stale. We build stores that avoid those problems.

## What is included

- Product catalogue with categories, search, and filtering
- Secure checkout tuned for mobile
- Payment integration with the providers your customers already use
- Order management and automated confirmation emails
- An admin area you can run yourself

## After launch

We hand over a store you can operate without us — adding products, adjusting
prices, and fulfilling orders. We remain available for changes as your
catalogue grows.
```

Create `src/content/services/digital-marketing.md`:

```markdown
---
title: "Digital Marketing"
shortTitle: "Digital Marketing"
summary: "SEO, social media, branding, and content that bring measurable traffic and enquiries. Reporting that shows what worked, not vanity metrics."
lead: true
order: 4
startingFrom: 80000
faqs:
  - question: "How long before I see results from SEO?"
    answer: "Meaningful movement in search rankings typically takes three to six months. Anyone promising first-page results in weeks is not being straight with you."
  - question: "What do you actually report on?"
    answer: "Traffic, search rankings for the terms that matter to you, and enquiries generated. We report on what affects your revenue, not follower counts."
---

## Marketing that reports honestly

Digital marketing is easy to spend money on and hard to evaluate. We focus on
the measures that connect to revenue — where your traffic comes from, which
search terms bring buyers, and how many enquiries resulted — and we tell you
plainly when something is not working.

## What we offer

- **Search engine optimisation** — technical fixes, content, and local search so customers can find you
- **Social media management** — consistent posting and community management
- **Branding** — logo, colour, and identity applied consistently everywhere
- **Content marketing** — articles and media that answer what your customers are searching for

## Reporting

Monthly reporting in plain language: what was done, what changed, and what we
recommend next. No jargon, no dashboards you have to interpret yourself.
```

- [ ] **Step 5: Write the three secondary services**

Create `src/content/services/it-consulting.md`:

```markdown
---
title: "IT Consulting"
shortTitle: "IT Consulting"
summary: "Independent technology guidance for businesses making decisions about systems, suppliers, and spending. Advice you can act on, not a sales pitch."
lead: false
order: 5
startingFrom: 25000
faqs:
  - question: "Do you only recommend systems you build?"
    answer: "No. Our advice is independent, and when an off-the-shelf product serves you better than something custom, we will say so."
---

## Advice before spending

Most costly technology mistakes are decisions, not code: the wrong system
bought, a supplier chosen badly, or infrastructure that cannot grow. A few
hours of independent review before committing is usually the cheapest part of
any technology project.

## What we help with

- Choosing between systems, platforms, and suppliers
- Reviewing quotes and proposals from other vendors
- Planning infrastructure that can grow with you
- Security and data-protection review
- Digital transformation planning for teams new to it

Billed hourly, with a clear written summary of findings and recommendations.
```

Create `src/content/services/networking-infrastructure.md`:

```markdown
---
title: "Networking & IT Infrastructure"
shortTitle: "Networking"
summary: "Reliable office networks, hardware deployment, and infrastructure setup for businesses that need their systems simply to work every day."
lead: false
order: 6
startingFrom: 100000
faqs:
  - question: "Do you cover locations outside Abuja?"
    answer: "Abuja and the surrounding FCT are our standard coverage. For sites further afield, contact us and we will let you know what is workable."
---

## Infrastructure that stays up

Network problems are expensive in a way that is easy to underestimate: every
person in the office loses time at once. We design and install networks built
for the conditions they actually run in, including inconsistent power.

## What we handle

- Office network design and installation
- Structured cabling and access points
- Router, switch, and firewall configuration
- Workstation and server deployment
- Ongoing maintenance and support

We size the installation to the business you have, not the one a vendor would
like to sell to.
```

Create `src/content/services/technology-products.md`:

```markdown
---
title: "Technology Products"
shortTitle: "Technology Products"
summary: "Smartphones, laptops, and accessories supplied on pre-order at competitive prices, with condition and warranty stated clearly before you buy."
lead: false
order: 7
faqs:
  - question: "Why is delivery three to four weeks?"
    answer: "Products are supplied on a pre-order basis, sourced after your order is confirmed. That is what keeps prices competitive, and we state the wait plainly rather than surprising you after payment."
  - question: "How do I know what condition a device is in?"
    answer: "Every listing states condition, grade, network lock status, SIM type, battery health, and warranty before you order. If it is refurbished, the listing says so."
---

## Devices, described honestly

Buying a phone online in Nigeria usually means finding out the real condition
after the box is open. We take the opposite approach: condition, grade, network
lock, SIM type, and battery health appear on every listing, before you order.

## What we supply

- Smartphones, including a full iPhone range
- Laptops *(catalogue coming soon)*
- Accessories — chargers, cases, headphones, cables *(catalogue coming soon)*

## How pre-order works

Every product is supplied on a pre-order basis. Once your order is confirmed,
allow three to four weeks for delivery. You get a 48-hour inspection window on
arrival and a 14-day defect warranty.

[Browse the shop](/shop) or message us on WhatsApp to ask about a specific model.
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm run test:unit`
Expected: PASS. If a summary falls outside 70–160 characters, adjust the copy rather than the test — that range is the useful length for a meta description.

- [ ] **Step 7: Verify Astro parses the collection**

Run: `npm run build`
Expected: exits 0 with no content-collection schema errors.

- [ ] **Step 8: Commit**

```bash
git add src/content.config.ts src/content tests/unit/services.test.ts
git commit -m "feat: add services content collection with seven service entries"
```

---

## Task 9: Services index with pricing table

**Files:**
- Create: `src/pages/services/index.astro`
- Create: `src/content/settings/site.json`
- Create: `tests/e2e/services.spec.ts`

**Interfaces:**
- Consumes: `services` collection, `formatNaira`, `Section`, `Button`
- Produces: `/services`

- [ ] **Step 1: Create the settings file**

Create `src/content/settings/site.json`:

```json
[
  {
    "id": "site",
    "preOrderLeadTime": "3–4 weeks"
  }
]
```

- [ ] **Step 2: Write the failing services test**

Create `tests/e2e/services.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

const SERVICES = [
  { slug: 'software-development', name: 'Software Development' },
  { slug: 'website-design-development', name: 'Website Design & Development' },
  { slug: 'ecommerce-solutions', name: 'E-Commerce Solutions' },
  { slug: 'digital-marketing', name: 'Digital Marketing' },
  { slug: 'it-consulting', name: 'IT Consulting' },
  { slug: 'networking-infrastructure', name: 'Networking & IT Infrastructure' },
  { slug: 'technology-products', name: 'Technology Products' },
];

test.describe('services index', () => {
  test('links to all seven service pages', async ({ page }) => {
    await page.goto('/services');
    for (const { slug } of SERVICES) {
      await expect(page.locator(`a[href="/services/${slug}"]`).first()).toBeVisible();
    }
  });

  test('shows the pricing table with formatted naira amounts', async ({ page }) => {
    await page.goto('/services');
    const table = page.getByRole('table', { name: /pricing/i });
    await expect(table).toBeVisible();
    await expect(table.getByText('₦150,000')).toBeVisible();
    await expect(table.getByText('₦500,000')).toBeVisible();
  });

  test('has exactly one h1', async ({ page }) => {
    await page.goto('/services');
    await expect(page.locator('h1')).toHaveCount(1);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm run test:e2e -- services`
Expected: FAIL — 404 on `/services`.

- [ ] **Step 4: Build the services index**

Create `src/pages/services/index.astro`. Pricing rows come from `docs/content-brief.md` §7:

```astro
---
import { getCollection } from 'astro:content';
import Base from '../../layouts/Base.astro';
import Section from '../../components/Section.astro';
import Button from '../../components/Button.astro';
import { formatNaira } from '../../lib/format';

const services = (await getCollection('services')).sort(
  (a, b) => a.data.order - b.data.order
);
const leadServices = services.filter((s) => s.data.lead);
const otherServices = services.filter((s) => !s.data.lead);

const pricing = [
  { service: 'Business Website', from: 150000, unit: '' },
  { service: 'E-commerce Website', from: 300000, unit: '' },
  { service: 'Custom Web Application', from: 500000, unit: '' },
  { service: 'Website Maintenance', from: 30000, unit: '/month' },
  { service: 'SEO Services', from: 80000, unit: '/month' },
  { service: 'Social Media Management', from: 100000, unit: '/month' },
  { service: 'Branding Package', from: 120000, unit: '' },
  { service: 'IT Consulting', from: 25000, unit: '/hour' },
  { service: 'Network Setup', from: 100000, unit: '' },
  { service: 'Technical Support', from: 20000, unit: '' },
];
---
<Base
  title="Services"
  description="Software development, website design, e-commerce, digital marketing, IT consulting, and networking for businesses across Nigeria. Transparent starting prices."
  path="/services"
>
  <Section register="dark">
    <p class="eyebrow">What we do</p>
    <h1 class="ra-display">Technology services built around your business goals.</h1>
    <p class="lede">
      From a first website to custom software and ongoing marketing — delivered by a
      CAC-registered team in Abuja, with pricing stated up front.
    </p>
  </Section>

  <Section>
    <h2>Core services</h2>
    <ul class="cards" role="list">
      {leadServices.map((service) => (
        <li class="card">
          <h3><a href={`/services/${service.id}`}>{service.data.title}</a></h3>
          <p>{service.data.summary}</p>
          {service.data.startingFrom && (
            <p class="card__price ra-numeric">
              From {formatNaira(service.data.startingFrom)}
            </p>
          )}
        </li>
      ))}
    </ul>

    <h2 class="also">Also available</h2>
    <ul class="cards cards--compact" role="list">
      {otherServices.map((service) => (
        <li class="card">
          <h3><a href={`/services/${service.id}`}>{service.data.title}</a></h3>
          <p>{service.data.summary}</p>
        </li>
      ))}
    </ul>
  </Section>

  <Section>
    <h2 id="pricing">Pricing</h2>
    <p class="ra-measure">
      Indicative starting prices. Final cost depends on scope — tell us what you need
      and we will quote precisely.
    </p>
    <div class="table-wrap">
      <table aria-labelledby="pricing">
        <caption class="ra-visually-hidden">Service pricing, starting from</caption>
        <thead>
          <tr><th scope="col">Service</th><th scope="col">Starting from</th></tr>
        </thead>
        <tbody>
          {pricing.map(({ service, from, unit }) => (
            <tr>
              <th scope="row">{service}</th>
              <td class="ra-numeric">{formatNaira(from)}{unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </Section>

  <Section register="dark">
    <h2 class="ra-display">Ready to grow your business?</h2>
    <p class="lede">
      Tell us what you are trying to achieve and we will tell you what it takes.
    </p>
    <Button href="/contact" variant="gold">Start Your Project</Button>
  </Section>
</Base>

<style>
  .eyebrow {
    color: var(--ra-gold-500);
    font-size: var(--ra-step--1);
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: var(--ra-space-m);
  }
  .lede {
    max-width: 56ch;
    font-size: var(--ra-step-1);
    color: var(--ra-fg-muted);
    margin-block: var(--ra-space-l) var(--ra-space-xl);
  }
  .cards {
    display: grid;
    gap: var(--ra-space-l);
    margin-top: var(--ra-space-xl);
    grid-template-columns: 1fr;
  }
  @media (min-width: 700px) { .cards { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1000px) { .cards--compact { grid-template-columns: repeat(3, 1fr); } }

  .card {
    padding: var(--ra-space-l);
    border: 1px solid var(--ra-border);
    border-radius: var(--ra-radius-m);
    background: var(--ra-surface);
  }
  .card h3 { font-size: var(--ra-step-1); margin-bottom: var(--ra-space-xs); }
  .card h3 a { text-decoration: none; }
  .card h3 a:hover { text-decoration: underline; }
  .card p { color: var(--ra-fg-muted); }
  .card__price {
    margin-top: var(--ra-space-m);
    font-weight: 700;
    color: var(--ra-navy-600);
  }
  .also { margin-top: var(--ra-space-2xl); }

  .table-wrap { overflow-x: auto; margin-top: var(--ra-space-l); }
  table { width: 100%; border-collapse: collapse; min-width: 380px; }
  caption { text-align: left; }
  th, td {
    padding: var(--ra-space-s) var(--ra-space-m);
    border-bottom: 1px solid var(--ra-border);
    text-align: left;
  }
  thead th {
    font-size: var(--ra-step--1);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ra-fg-muted);
  }
  tbody th { font-weight: 600; }
  td { text-align: right; font-weight: 600; color: var(--ra-navy-600); }
</style>
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm run test:e2e -- services`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add services index with pricing table"
```

---

## Task 10: Service detail pages

**Files:**
- Create: `src/pages/services/[slug].astro`
- Modify: `tests/e2e/services.spec.ts`

**Interfaces:**
- Consumes: `services` collection, `buildWhatsAppUrl`, `buildEnquiryMessage`
- Produces: seven routes at `/services/<slug>`

- [ ] **Step 1: Add the failing detail-page tests**

Append to `tests/e2e/services.spec.ts`:

```ts
test.describe('service detail pages', () => {
  for (const { slug, name } of SERVICES) {
    test(`${slug} renders with correct head and CTA`, async ({ page }) => {
      const response = await page.goto(`/services/${slug}`);
      expect(response!.status()).toBe(200);

      await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
      await expect(page).toHaveTitle(new RegExp(name.replace(/&/g, '&')));

      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `https://radiantalphadigital.com/services/${slug}`
      );

      const wa = page.locator(`a[href^="https://wa.me/2349129665798?text="]`).first();
      await expect(wa).toBeVisible();
    });
  }

  test('emits Service structured data', async ({ page }) => {
    await page.goto('/services/software-development');
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map((b) => JSON.parse(b)['@type']);
    expect(types).toContain('Service');
  });

  test('emits FAQ structured data where FAQs exist', async ({ page }) => {
    await page.goto('/services/software-development');
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map((b) => JSON.parse(b)['@type']);
    expect(types).toContain('FAQPage');
  });

  test('shows breadcrumbs back to the services index', async ({ page }) => {
    await page.goto('/services/digital-marketing');
    const crumbs = page.getByRole('navigation', { name: /breadcrumb/i });
    await expect(crumbs.getByRole('link', { name: 'Services' })).toBeVisible();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:e2e -- services`
Expected: FAIL — 404 on every detail route.

- [ ] **Step 3: Build the detail template**

Create `src/pages/services/[slug].astro`:

```astro
---
import { getCollection, render } from 'astro:content';
import Base from '../../layouts/Base.astro';
import Section from '../../components/Section.astro';
import Button from '../../components/Button.astro';
import { formatNaira } from '../../lib/format';
import { buildWhatsAppUrl, buildEnquiryMessage } from '../../lib/whatsapp';
import { SITE } from '../../lib/site';

export async function getStaticPaths() {
  const services = await getCollection('services');
  return services.map((service) => ({
    params: { slug: service.id },
    props: { service },
  }));
}

const { service } = Astro.props;
const { Content } = await render(service);
const { title, summary, startingFrom, faqs } = service.data;

const path = `/services/${service.id}`;
const waUrl = buildWhatsAppUrl({ message: buildEnquiryMessage(title) });

const others = (await getCollection('services'))
  .filter((s) => s.id !== service.id)
  .sort((a, b) => a.data.order - b.data.order)
  .slice(0, 3);

const serviceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: title,
  description: summary,
  serviceType: title,
  provider: { '@type': 'Organization', name: SITE.legalName, url: SITE.domain },
  areaServed: { '@type': 'Country', name: 'Nigeria' },
  ...(startingFrom && {
    offers: {
      '@type': 'Offer',
      priceCurrency: 'NGN',
      price: startingFrom,
      url: new URL(path, SITE.domain).href,
    },
  }),
};

const faqSchema = faqs.length > 0 ? {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(({ question, answer }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer },
  })),
} : null;

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.domain },
    { '@type': 'ListItem', position: 2, name: 'Services', item: `${SITE.domain}/services` },
    { '@type': 'ListItem', position: 3, name: title, item: new URL(path, SITE.domain).href },
  ],
};
---
<Base title={title} description={summary} path={path}>
  <Fragment slot="head">
    <script type="application/ld+json" set:html={JSON.stringify(serviceSchema)} />
    {faqSchema && <script type="application/ld+json" set:html={JSON.stringify(faqSchema)} />}
    <script type="application/ld+json" set:html={JSON.stringify(breadcrumbSchema)} />
  </Fragment>

  <Section register="dark">
    <nav aria-label="Breadcrumb" class="crumbs">
      <ol role="list">
        <li><a href="/">Home</a></li>
        <li><a href="/services">Services</a></li>
        <li aria-current="page">{title}</li>
      </ol>
    </nav>
    <h1 class="ra-display">{title}</h1>
    <p class="lede">{summary}</p>
    {startingFrom && (
      <p class="from ra-numeric">Starting from {formatNaira(startingFrom)}</p>
    )}
    <div class="actions">
      <Button href="/contact" variant="gold">Start Your Project</Button>
      <Button href={waUrl} variant="secondary" external>Ask on WhatsApp</Button>
    </div>
  </Section>

  <Section>
    <div class="prose ra-measure">
      <Content />
    </div>
  </Section>

  {faqs.length > 0 && (
    <Section>
      <h2>Common questions</h2>
      <dl class="faqs ra-measure">
        {faqs.map(({ question, answer }) => (
          <div class="faq">
            <dt>{question}</dt>
            <dd>{answer}</dd>
          </div>
        ))}
      </dl>
    </Section>
  )}

  <Section>
    <h2>Other services</h2>
    <ul class="related" role="list">
      {others.map((other) => (
        <li>
          <a href={`/services/${other.id}`}>
            <strong>{other.data.shortTitle}</strong>
            <span>{other.data.summary}</span>
          </a>
        </li>
      ))}
    </ul>
  </Section>

  <Section register="dark">
    <h2 class="ra-display">Let's build something remarkable together.</h2>
    <p class="lede">
      Tell us about your project and we will come back with a clear scope and price.
    </p>
    <div class="actions">
      <Button href="/contact" variant="gold">Get in Touch</Button>
      <Button href={waUrl} variant="secondary" external>Message on WhatsApp</Button>
    </div>
  </Section>
</Base>

<style>
  .crumbs ol {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ra-space-xs);
    list-style: none;
    padding: 0;
    margin-bottom: var(--ra-space-l);
    font-size: var(--ra-step--1);
    color: var(--ra-fg-muted);
  }
  .crumbs li + li::before { content: '/'; margin-right: var(--ra-space-xs); opacity: 0.5; }

  .lede {
    max-width: 56ch;
    font-size: var(--ra-step-1);
    color: var(--ra-fg-muted);
    margin-block: var(--ra-space-l);
  }
  .from {
    font-weight: 700;
    color: var(--ra-gold-500);
    margin-bottom: var(--ra-space-l);
  }
  .actions { display: flex; flex-wrap: wrap; gap: var(--ra-space-m); }

  .prose :global(h2) { font-size: var(--ra-step-2); margin-top: var(--ra-space-xl); }
  .prose :global(h2:first-child) { margin-top: 0; }
  .prose :global(p) { margin-top: var(--ra-space-m); color: var(--ra-fg-muted); }
  .prose :global(ul) { margin-top: var(--ra-space-m); padding-left: 1.2em; }
  .prose :global(li) { margin-top: var(--ra-space-2xs); color: var(--ra-fg-muted); }

  .faqs { margin-top: var(--ra-space-l); }
  .faq { padding-block: var(--ra-space-m); border-bottom: 1px solid var(--ra-border); }
  .faq dt { font-weight: 700; margin-bottom: var(--ra-space-2xs); }
  .faq dd { margin: 0; color: var(--ra-fg-muted); }

  .related {
    display: grid;
    gap: var(--ra-space-m);
    margin-top: var(--ra-space-l);
    grid-template-columns: 1fr;
  }
  @media (min-width: 800px) { .related { grid-template-columns: repeat(3, 1fr); } }
  .related a {
    display: grid;
    gap: var(--ra-space-2xs);
    padding: var(--ra-space-m);
    border: 1px solid var(--ra-border);
    border-radius: var(--ra-radius-m);
    text-decoration: none;
    color: inherit;
  }
  .related a:hover { border-color: var(--ra-navy-400); }
  .related span { font-size: var(--ra-step--1); color: var(--ra-fg-muted); }
</style>
```

- [ ] **Step 4: Add the head slot to the base layout**

In `src/layouts/Base.astro`, add a named slot immediately after the `<Seo … />` line:

```astro
    <slot name="head" />
```

- [ ] **Step 5: Run to verify all service tests pass**

Run: `npm run test:e2e -- services`
Expected: PASS — 7 detail pages plus schema and breadcrumb assertions.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add service detail pages with Service, FAQ, and breadcrumb schema"
```

---

## Task 11: Home page

**Files:**
- Modify: `src/pages/index.astro`
- Create: `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: `services` collection, `Section`, `Button`, `SITE`
- Produces: `/`

- [ ] **Step 1: Write the failing home test**

Create `tests/e2e/home.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('home page', () => {
  test('leads with the brief tagline as the h1', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Building Digital Solutions That Drive Business Growth.'
    );
  });

  test('shows both hero CTAs from the brief', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Start Your Project' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Explore Our Services' }).first()).toBeVisible();
  });

  test('surfaces the four lead services', async ({ page }) => {
    await page.goto('/');
    for (const slug of [
      'software-development',
      'website-design-development',
      'ecommerce-solutions',
      'digital-marketing',
    ]) {
      await expect(page.locator(`a[href="/services/${slug}"]`).first()).toBeVisible();
    }
  });

  test('marks placeholder testimonials as illustrative, not client reviews', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/what you can expect/i)).toBeVisible();
    await expect(page.getByText(/illustrative/i)).toBeVisible();
  });

  test('has exactly one h1 and no skipped heading levels', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
    const levels = await page.locator('h1, h2, h3').evaluateAll((nodes) =>
      nodes.map((n) => Number(n.tagName[1]))
    );
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }
  });

  test('every image has an alt attribute', async ({ page }) => {
    await page.goto('/');
    const missing = await page.locator('img:not([alt])').count();
    expect(missing).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:e2e -- home`
Expected: FAIL — h1 is the tagline only because Task 6 stubbed it; testimonial and service assertions fail.

- [ ] **Step 3: Build the home page**

Replace `src/pages/index.astro`. All copy is verbatim from `docs/content-brief.md` §2, §5, §10:

```astro
---
import { getCollection } from 'astro:content';
import Base from '../layouts/Base.astro';
import Section from '../components/Section.astro';
import Button from '../components/Button.astro';
import { formatNaira } from '../lib/format';
import { SITE } from '../lib/site';

const leadServices = (await getCollection('services'))
  .filter((s) => s.data.lead)
  .sort((a, b) => a.data.order - b.data.order);

const reasons = [
  { title: 'Registered & Trusted', body: `Fully incorporated with the Corporate Affairs Commission — RC ${SITE.rcNumber}.` },
  { title: 'Tailored Solutions', body: 'Every project is designed around your specific business goals, not a template.' },
  { title: 'End-to-End Services', body: 'From strategy and development through deployment and ongoing support.' },
  { title: 'Affordable Excellence', body: 'Professional work at prices that make sense for growing businesses.' },
  { title: 'Future-Focused', body: 'Modern technology chosen for scalability, security, and performance.' },
  { title: 'Dedicated Support', body: 'Long-term relationships built on dependable service, not one-off jobs.' },
];

const expectations = [
  'Professional service, quality solutions, and a team that truly understands business needs.',
  'Reliable technology partner committed to delivering measurable results.',
  'Excellent communication, timely delivery, and outstanding customer support.',
];
---
<Base
  title="Radiant Alpha Digital Services — Web Development & Digital Marketing in Abuja"
  description="CAC-registered Nigerian technology company building websites, custom software, e-commerce, and digital marketing for businesses. Based in Abuja, serving all of Nigeria."
  path="/"
>
  <Section register="dark" class="hero">
    <p class="eyebrow">Digital services · Abuja, Nigeria</p>
    <h1 class="ra-display hero__title">{SITE.tagline}</h1>
    <p class="lede">
      We help businesses establish a powerful digital presence through professional web
      development, custom software, digital marketing, IT consulting, and quality
      technology products.
    </p>
    <div class="actions">
      <Button href="/contact" variant="gold">Start Your Project</Button>
      <Button href="/services" variant="secondary">Explore Our Services</Button>
    </div>
    <p class="hero__trust">{SITE.trustLine}</p>
  </Section>

  <Section>
    <h2>What we do</h2>
    <p class="ra-measure sub">
      Four core services, plus IT consulting, networking, and technology products.
    </p>
    <ul class="cards" role="list">
      {leadServices.map((service) => (
        <li class="card">
          <h3><a href={`/services/${service.id}`}>{service.data.title}</a></h3>
          <p>{service.data.summary}</p>
          {service.data.startingFrom && (
            <p class="card__price ra-numeric">From {formatNaira(service.data.startingFrom)}</p>
          )}
        </li>
      ))}
    </ul>
    <p class="more"><a href="/services">See all services and pricing →</a></p>
  </Section>

  <Section register="dark">
    <h2 class="ra-display">Why choose Radiant Alpha?</h2>
    <ul class="reasons" role="list">
      {reasons.map(({ title, body }) => (
        <li>
          <h3>{title}</h3>
          <p>{body}</p>
        </li>
      ))}
    </ul>
  </Section>

  <Section>
    <h2>Technology products, described honestly</h2>
    <p class="ra-measure sub">
      Smartphones, laptops, and accessories on pre-order. Every listing states condition,
      network lock, SIM type, battery health, and warranty before you order — allow
      {' '}{SITE.preOrderLeadTime} for delivery from confirmation.
    </p>
    <Button href="/shop">Browse the Shop</Button>
  </Section>

  <Section>
    <h2>What you can expect</h2>
    <p class="ra-measure sub">
      We are a new company and have not yet collected client reviews. These are
      illustrative of the service we commit to — not quotes from real customers. We will
      replace them with genuine reviews as soon as we have them.
    </p>
    <ul class="quotes" role="list">
      {expectations.map((quote) => (
        <li><blockquote><p>{quote}</p></blockquote></li>
      ))}
    </ul>
  </Section>

  <Section register="dark">
    <h2 class="ra-display">Ready to grow your business?</h2>
    <p class="lede">
      Whether you need a professional website, custom software, digital marketing, IT
      consulting, or quality technology products — let's build something remarkable together.
    </p>
    <Button href="/contact" variant="gold">Get in Touch</Button>
  </Section>
</Base>

<style>
  .hero { padding-block: clamp(3.5rem, 11vh, 8rem); }
  .eyebrow {
    color: var(--ra-gold-500);
    font-size: var(--ra-step--1);
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: var(--ra-space-m);
  }
  .hero__title { max-width: 18ch; }
  .lede {
    max-width: 56ch;
    font-size: var(--ra-step-1);
    color: var(--ra-fg-muted);
    margin-block: var(--ra-space-l) var(--ra-space-xl);
  }
  .actions { display: flex; flex-wrap: wrap; gap: var(--ra-space-m); }
  .hero__trust {
    margin-top: var(--ra-space-2xl);
    padding-top: var(--ra-space-l);
    border-top: 1px solid var(--ra-rule);
    font-size: var(--ra-step--1);
    color: var(--ra-fg-muted);
  }

  .sub { color: var(--ra-fg-muted); margin-top: var(--ra-space-s); }

  .cards {
    display: grid;
    gap: var(--ra-space-l);
    margin-top: var(--ra-space-xl);
    grid-template-columns: 1fr;
  }
  @media (min-width: 700px) { .cards { grid-template-columns: repeat(2, 1fr); } }
  .card {
    padding: var(--ra-space-l);
    border: 1px solid var(--ra-border);
    border-radius: var(--ra-radius-m);
    background: var(--ra-surface);
  }
  .card h3 { font-size: var(--ra-step-1); margin-bottom: var(--ra-space-xs); }
  .card h3 a { text-decoration: none; }
  .card p { color: var(--ra-fg-muted); }
  .card__price { margin-top: var(--ra-space-m); font-weight: 700; color: var(--ra-navy-600); }
  .more { margin-top: var(--ra-space-l); font-weight: 600; }

  .reasons {
    display: grid;
    gap: var(--ra-space-l);
    margin-top: var(--ra-space-xl);
    grid-template-columns: 1fr;
  }
  @media (min-width: 700px) { .reasons { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1000px) { .reasons { grid-template-columns: repeat(3, 1fr); } }
  .reasons h3 { font-size: var(--ra-step-1); color: var(--ra-gold-500); }
  .reasons p { margin-top: var(--ra-space-2xs); color: var(--ra-fg-muted); }

  .quotes {
    display: grid;
    gap: var(--ra-space-l);
    margin-top: var(--ra-space-xl);
    grid-template-columns: 1fr;
  }
  @media (min-width: 800px) { .quotes { grid-template-columns: repeat(3, 1fr); } }
  .quotes blockquote {
    height: 100%;
    margin: 0;
    padding: var(--ra-space-l);
    border-left: 3px solid var(--ra-gold-500);
    border-radius: var(--ra-radius-s);
    background: var(--ra-navy-50);
    color: var(--ra-fg-muted);
    font-style: italic;
  }
</style>
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:e2e -- home`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add home page with lead services, trust section, and illustrative quotes"
```

---

## Task 12: About and Work pages

**Files:**
- Create: `src/pages/about.astro`, `src/pages/work.astro`
- Create: `tests/e2e/about.spec.ts`

**Interfaces:**
- Consumes: `Section`, `Button`, `SITE`
- Produces: `/about`, `/work`

- [ ] **Step 1: Write the failing about test**

Create `tests/e2e/about.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('about page', () => {
  test('shows story, mission, vision, and values', async ({ page }) => {
    await page.goto('/about');
    for (const heading of ['Our Story', 'Our Mission', 'Our Vision', 'Our Core Values']) {
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    }
  });

  test('lists all five core values', async ({ page }) => {
    await page.goto('/about');
    for (const value of [
      'Innovation', 'Integrity', 'Excellence',
      'Customer Success', 'Continuous Improvement',
    ]) {
      await expect(page.getByRole('heading', { name: value })).toBeVisible();
    }
  });

  test('shows city-level location and never the street address', async ({ page }) => {
    await page.goto('/about');
    const body = (await page.locator('body').innerText()).toLowerCase();
    expect(body).toContain('abuja');
    expect(body).not.toContain('standard estate');
    expect(body).not.toContain('galadimawa');
    expect(body).not.toContain('b09');
  });
});

test.describe('work page', () => {
  test('states plainly that the portfolio is still being built', async ({ page }) => {
    await page.goto('/work');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/expanding our portfolio/i)).toBeVisible();
  });

  test('placeholder cards are marked as examples, not delivered work', async ({ page }) => {
    await page.goto('/work');
    await expect(page.getByText(/example of the kind of work/i).first()).toBeVisible();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:e2e -- about`
Expected: FAIL — 404 on both routes.

- [ ] **Step 3: Build the about page**

Create `src/pages/about.astro`. Copy verbatim from `docs/content-brief.md` §3 and §4:

```astro
---
import Base from '../layouts/Base.astro';
import Section from '../components/Section.astro';
import Button from '../components/Button.astro';
import { SITE } from '../lib/site';

const values = [
  { name: 'Innovation', body: 'We embrace creativity and emerging technologies to develop smart, future-ready solutions.' },
  { name: 'Integrity', body: 'We build trust through honesty, transparency, and accountability.' },
  { name: 'Excellence', body: 'We are committed to delivering exceptional quality in every project.' },
  { name: 'Customer Success', body: "Our clients' growth drives everything we do." },
  { name: 'Continuous Improvement', body: 'We continually learn, adapt, and improve to remain ahead in an ever-changing technology landscape.' },
];

const audiences = [
  'Small and Medium Enterprises', 'Startups', 'Entrepreneurs',
  'Government Agencies', 'Corporate Organizations', 'Educational Institutions',
  'Non-Profit Organizations', 'Retail Businesses', 'Professionals and Freelancers',
  'Individuals seeking quality technology products',
];
---
<Base
  title="About Us"
  description="Radiant Alpha Digital Services Ltd is a CAC-registered Nigerian technology company in Abuja, helping businesses grow through practical digital solutions."
  path="/about"
>
  <Section register="dark">
    <p class="eyebrow">About us</p>
    <h1 class="ra-display">Technology should be accessible, reliable, and focused on solving real business challenges.</h1>
  </Section>

  <Section>
    <div class="ra-measure prose">
      <h2>Our Story</h2>
      <p>Radiant Alpha Digital Services Ltd was established to help businesses leverage technology to achieve sustainable growth.</p>
      <p>In today's digital economy, having the right technology partner can make the difference between simply operating and truly thriving. We work with startups, entrepreneurs, SMEs, corporate organizations, and public institutions to develop practical digital solutions that improve efficiency, strengthen brands, and unlock new opportunities.</p>
      <p>Whether it's designing a modern website, developing custom software, implementing digital marketing strategies, or supplying quality technology products, our goal is simple — to deliver solutions that create measurable value for every client.</p>
      <p>We believe technology should be accessible, reliable, and focused on solving real business challenges. Every project we undertake is guided by professionalism, innovation, and a commitment to excellence.</p>
      <p>As we continue to grow, we remain dedicated to building long-term partnerships based on trust, quality, and exceptional service.</p>
    </div>
  </Section>

  <Section register="dark">
    <div class="split">
      <div>
        <h2>Our Mission</h2>
        <p>To deliver innovative digital solutions that empower businesses to grow, compete, and succeed in an increasingly connected world.</p>
      </div>
      <div>
        <h2>Our Vision</h2>
        <p>To become one of Africa's leading digital technology companies, recognized for innovation, reliability, and excellence in delivering business-focused technology solutions.</p>
      </div>
    </div>
  </Section>

  <Section>
    <h2>Our Core Values</h2>
    <ul class="values" role="list">
      {values.map(({ name, body }) => (
        <li>
          <h3>{name}</h3>
          <p>{body}</p>
        </li>
      ))}
    </ul>
  </Section>

  <Section>
    <h2>Who we serve</h2>
    <ul class="audiences" role="list">
      {audiences.map((audience) => <li>{audience}</li>)}
    </ul>
  </Section>

  <Section>
    <h2>Company details</h2>
    <dl class="facts">
      <div><dt>Registered name</dt><dd>{SITE.legalName}</dd></div>
      <div><dt>RC number</dt><dd class="ra-numeric">{SITE.rcNumber}</dd></div>
      <div><dt>Registered with</dt><dd>Corporate Affairs Commission, Nigeria</dd></div>
      <div><dt>Location</dt><dd>{SITE.location}</dd></div>
      <div><dt>Founder &amp; Director</dt><dd>Arabs David-Pari</dd></div>
    </dl>
  </Section>

  <Section register="dark">
    <h2 class="ra-display">Let's build something great together.</h2>
    <Button href="/contact" variant="gold">Get in Touch</Button>
  </Section>
</Base>

<style>
  .eyebrow {
    color: var(--ra-gold-500);
    font-size: var(--ra-step--1);
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: var(--ra-space-m);
  }
  .prose h2 { font-size: var(--ra-step-2); }
  .prose p { margin-top: var(--ra-space-m); color: var(--ra-fg-muted); }

  .split { display: grid; gap: var(--ra-space-xl); }
  @media (min-width: 800px) { .split { grid-template-columns: repeat(2, 1fr); } }
  .split p { margin-top: var(--ra-space-m); color: var(--ra-fg-muted); max-width: 42ch; }

  .values {
    display: grid;
    gap: var(--ra-space-l);
    margin-top: var(--ra-space-xl);
    grid-template-columns: 1fr;
  }
  @media (min-width: 700px) { .values { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1000px) { .values { grid-template-columns: repeat(3, 1fr); } }
  .values li {
    padding: var(--ra-space-l);
    border-radius: var(--ra-radius-m);
    background: var(--ra-navy-50);
  }
  .values h3 { font-size: var(--ra-step-1); }
  .values p { margin-top: var(--ra-space-xs); color: var(--ra-fg-muted); }

  .audiences {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ra-space-xs);
    margin-top: var(--ra-space-l);
  }
  .audiences li {
    padding: var(--ra-space-xs) var(--ra-space-m);
    border: 1px solid var(--ra-border);
    border-radius: 999px;
    font-size: var(--ra-step--1);
    color: var(--ra-fg-muted);
  }

  .facts { margin-top: var(--ra-space-l); max-width: 52ch; }
  .facts > div {
    display: flex;
    justify-content: space-between;
    gap: var(--ra-space-m);
    padding-block: var(--ra-space-s);
    border-bottom: 1px solid var(--ra-border);
  }
  .facts dt { color: var(--ra-fg-muted); }
  .facts dd { margin: 0; font-weight: 600; text-align: right; }
</style>
```

- [ ] **Step 4: Build the work page**

Create `src/pages/work.astro`:

```astro
---
import Base from '../layouts/Base.astro';
import Section from '../components/Section.astro';
import Button from '../components/Button.astro';

const examples = [
  { title: 'Business website', discipline: 'Website Design', body: 'A fast, mobile-first site with clear service pages and direct contact routes.' },
  { title: 'Online store', discipline: 'E-Commerce', body: 'A product catalogue with secure checkout and an admin area the owner runs themselves.' },
  { title: 'Internal operations tool', discipline: 'Software Development', body: 'A custom system replacing spreadsheets and manual record-keeping.' },
  { title: 'Search visibility campaign', discipline: 'Digital Marketing', body: 'Technical SEO and content targeting the terms customers actually search.' },
];
---
<Base
  title="Our Work"
  description="Radiant Alpha is building its portfolio of web development, software, and digital marketing projects. Here is the kind of work we take on."
  path="/work"
>
  <Section register="dark">
    <p class="eyebrow">Our work</p>
    <h1 class="ra-display">We're currently expanding our portfolio.</h1>
    <p class="lede">
      As we complete more client engagements, this page will showcase the projects
      themselves. In the meantime, here is the kind of work we take on — and we're happy
      to talk through our approach in detail.
    </p>
    <Button href="/contact" variant="gold">Discuss Your Project</Button>
  </Section>

  <Section>
    <h2>The work we do</h2>
    <ul class="cards" role="list">
      {examples.map(({ title, discipline, body }) => (
        <li class="card">
          <p class="card__tag">{discipline}</p>
          <h3>{title}</h3>
          <p class="card__body">{body}</p>
          <p class="card__note">
            An example of the kind of work we take on — not a delivered client project.
          </p>
        </li>
      ))}
    </ul>
  </Section>
</Base>

<style>
  .eyebrow {
    color: var(--ra-gold-500);
    font-size: var(--ra-step--1);
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: var(--ra-space-m);
  }
  .lede {
    max-width: 56ch;
    font-size: var(--ra-step-1);
    color: var(--ra-fg-muted);
    margin-block: var(--ra-space-l) var(--ra-space-xl);
  }
  .cards {
    display: grid;
    gap: var(--ra-space-l);
    margin-top: var(--ra-space-xl);
    grid-template-columns: 1fr;
  }
  @media (min-width: 700px) { .cards { grid-template-columns: repeat(2, 1fr); } }
  .card {
    padding: var(--ra-space-l);
    border: 1px dashed var(--ra-border);
    border-radius: var(--ra-radius-m);
  }
  .card__tag {
    font-size: var(--ra-step--1);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ra-navy-500);
    margin-bottom: var(--ra-space-xs);
  }
  .card h3 { font-size: var(--ra-step-1); }
  .card__body { margin-top: var(--ra-space-xs); color: var(--ra-fg-muted); }
  .card__note {
    margin-top: var(--ra-space-m);
    padding-top: var(--ra-space-s);
    border-top: 1px solid var(--ra-border);
    font-size: var(--ra-step--1);
    color: var(--ra-fg-muted);
    font-style: italic;
  }
</style>
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm run test:e2e -- about`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add about page and work page with clearly-marked placeholder examples"
```

---

## Task 13: Contact page, legal pages, and 404

**Files:**
- Create: `src/pages/contact.astro`, `src/pages/returns.astro`, `src/pages/privacy.astro`, `src/pages/terms.astro`, `src/pages/404.astro`
- Create: `tests/e2e/contact.spec.ts`

**Interfaces:**
- Consumes: `SITE`, `buildWhatsAppUrl`, `Section`, `Button`
- Produces: `/contact`, `/returns`, `/privacy`, `/terms`, `/404`

- [ ] **Step 1: Write the failing contact test**

Create `tests/e2e/contact.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('contact page', () => {
  test('offers WhatsApp as the primary channel', async ({ page }) => {
    await page.goto('/contact');
    const wa = page.locator('a[href^="https://wa.me/2349129665798"]').first();
    await expect(wa).toBeVisible();
  });

  test('shows both email addresses', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.locator('a[href="mailto:help@radiantalphadigital.com"]').first()).toBeVisible();
    await expect(page.locator('a[href="mailto:radiantalphadigital@gmail.com"]').first()).toBeVisible();
  });

  test('every form field has an associated label', async ({ page }) => {
    await page.goto('/contact');
    const fields = page.locator('form input:not([type=hidden]), form textarea, form select');
    const count = await fields.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const id = await fields.nth(i).getAttribute('id');
      expect(id, 'every field needs an id to be labelled').toBeTruthy();
      await expect(page.locator(`label[for="${id}"]`)).toHaveCount(1);
    }
  });

  test('form is wired to Netlify with a honeypot', async ({ page }) => {
    await page.goto('/contact');
    const form = page.locator('form[data-netlify="true"]');
    await expect(form).toHaveCount(1);
    await expect(form).toHaveAttribute('netlify-honeypot', 'bot-field');
  });

  test('shows a WhatsApp fallback in case the form fails', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByText(/if the form doesn't work/i)).toBeVisible();
  });

  test('client-side validation blocks an empty submission', async ({ page }) => {
    await page.goto('/contact');
    await page.getByRole('button', { name: /send/i }).click();
    await expect(page).toHaveURL(/\/contact/);
    const nameValid = await page.locator('#name').evaluate(
      (el: HTMLInputElement) => el.validity.valid
    );
    expect(nameValid).toBe(false);
  });
});

test.describe('legal pages', () => {
  for (const path of ['/returns', '/privacy', '/terms']) {
    test(`${path} renders with an h1`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response!.status()).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
    });
  }

  test('returns page states the 48-hour window and 14-day warranty', async ({ page }) => {
    await page.goto('/returns');
    await expect(page.getByText(/48 hours/i).first()).toBeVisible();
    await expect(page.getByText(/14 days/i).first()).toBeVisible();
  });

  test('terms page states the pre-order lead time', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.getByText(/3–4 weeks/).first()).toBeVisible();
  });
});

test.describe('404 page', () => {
  test('returns a designed page linking back to the shop', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('a[href="/shop"]').first()).toBeVisible();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:e2e -- contact`
Expected: FAIL — 404 on all routes.

- [ ] **Step 3: Build the contact page**

Create `src/pages/contact.astro`:

```astro
---
import Base from '../layouts/Base.astro';
import Section from '../components/Section.astro';
import Button from '../components/Button.astro';
import { buildWhatsAppUrl } from '../lib/whatsapp';
import { SITE } from '../lib/site';

const waUrl = buildWhatsAppUrl({
  message: "Hi Radiant Alpha, I'd like to discuss a project.",
});
---
<Base
  title="Contact"
  description="Get in touch with Radiant Alpha Digital Services. WhatsApp for the fastest response, or send us an email about your project. Based in Abuja, Nigeria."
  path="/contact"
>
  <Section register="dark">
    <p class="eyebrow">Contact</p>
    <h1 class="ra-display">Let's build something great together.</h1>
    <p class="lede">
      Whether you need a professional website, digital marketing, IT consulting, or
      quality technology products, we're here to help.
    </p>
  </Section>

  <Section>
    <div class="layout">
      <div>
        <h2>Reach us directly</h2>
        <p class="sub">
          For the fastest response, send us a message on WhatsApp. We're also available by
          email for project enquiries and business partnerships.
        </p>

        <ul class="channels" role="list">
          <li>
            <span class="channels__label">WhatsApp — fastest</span>
            <a href={waUrl} target="_blank" rel="noopener noreferrer">{SITE.phoneDisplay}</a>
          </li>
          <li>
            <span class="channels__label">Phone</span>
            <a href={`tel:${SITE.phoneE164}`}>{SITE.phoneDisplay}</a>
          </li>
          <li>
            <span class="channels__label">Email</span>
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          </li>
          <li>
            <span class="channels__label">Alternative email</span>
            <a href={`mailto:${SITE.emailSecondary}`}>{SITE.emailSecondary}</a>
          </li>
          <li>
            <span class="channels__label">Location</span>
            <span>{SITE.location}</span>
          </li>
        </ul>
      </div>

      <div>
        <h2>Send a message</h2>
        <form
          name="contact"
          method="POST"
          data-netlify="true"
          netlify-honeypot="bot-field"
          action="/contact?sent=true"
          class="form"
        >
          <input type="hidden" name="form-name" value="contact" />
          <p class="ra-visually-hidden">
            <label for="bot-field">Leave this field empty</label>
            <input id="bot-field" name="bot-field" tabindex="-1" autocomplete="off" />
          </p>

          <div class="field">
            <label for="name">Your name</label>
            <input id="name" name="name" type="text" required autocomplete="name" />
          </div>

          <div class="field">
            <label for="email">Email address</label>
            <input id="email" name="email" type="email" required autocomplete="email" />
          </div>

          <div class="field">
            <label for="phone">Phone or WhatsApp <span class="optional">(optional)</span></label>
            <input id="phone" name="phone" type="tel" autocomplete="tel" />
          </div>

          <div class="field">
            <label for="subject">What can we help with?</label>
            <select id="subject" name="subject" required>
              <option value="">Choose one…</option>
              <option>Website design &amp; development</option>
              <option>Software development</option>
              <option>E-commerce</option>
              <option>Digital marketing</option>
              <option>IT consulting</option>
              <option>Networking &amp; infrastructure</option>
              <option>Technology products</option>
              <option>Something else</option>
            </select>
          </div>

          <div class="field">
            <label for="message">Tell us about your project</label>
            <textarea id="message" name="message" rows="5" required></textarea>
          </div>

          <button type="submit" class="ra-btn ra-btn--primary">Send message</button>
        </form>

        <p class="fallback">
          If the form doesn't work for any reason, message us on
          <a href={waUrl} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          or email <a href={`mailto:${SITE.email}`}>{SITE.email}</a> instead.
        </p>
      </div>
    </div>
  </Section>
</Base>

<style>
  .eyebrow {
    color: var(--ra-gold-500);
    font-size: var(--ra-step--1);
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: var(--ra-space-m);
  }
  .lede {
    max-width: 56ch;
    font-size: var(--ra-step-1);
    color: var(--ra-fg-muted);
    margin-top: var(--ra-space-l);
  }
  .sub { color: var(--ra-fg-muted); margin-top: var(--ra-space-s); }

  .layout { display: grid; gap: var(--ra-space-2xl); }
  @media (min-width: 900px) { .layout { grid-template-columns: 1fr 1.2fr; } }

  .channels { display: grid; gap: var(--ra-space-m); margin-top: var(--ra-space-l); }
  .channels li {
    display: grid;
    gap: var(--ra-space-2xs);
    padding-bottom: var(--ra-space-m);
    border-bottom: 1px solid var(--ra-border);
  }
  .channels__label {
    font-size: var(--ra-step--1);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ra-fg-muted);
  }
  .channels a { font-weight: 600; }

  .form { display: grid; gap: var(--ra-space-m); margin-top: var(--ra-space-l); }
  .field { display: grid; gap: var(--ra-space-2xs); }
  .field label { font-weight: 600; font-size: var(--ra-step--1); }
  .optional { font-weight: 400; color: var(--ra-fg-muted); }
  input, select, textarea {
    min-height: var(--ra-tap-min);
    padding: var(--ra-space-s) var(--ra-space-m);
    border: 1px solid var(--ra-border);
    border-radius: var(--ra-radius-s);
    background: var(--ra-surface);
  }
  textarea { min-height: 8rem; resize: vertical; }
  input:focus-visible, select:focus-visible, textarea:focus-visible {
    border-color: var(--ra-navy-500);
  }
  button[type='submit'] {
    justify-self: start;
    border: 0;
    cursor: pointer;
    padding: var(--ra-space-s) var(--ra-space-xl);
    border-radius: var(--ra-radius-m);
    font-weight: 600;
    background: var(--ra-navy-600);
    color: var(--ra-surface);
  }
  .fallback {
    margin-top: var(--ra-space-l);
    padding: var(--ra-space-m);
    border-radius: var(--ra-radius-s);
    background: var(--ra-navy-50);
    font-size: var(--ra-step--1);
    color: var(--ra-fg-muted);
  }
</style>
```

- [ ] **Step 4: Build the returns page**

Create `src/pages/returns.astro`. Terms come from spec §9 and `docs/content-brief.md` §8b:

```astro
---
import Base from '../layouts/Base.astro';
import Section from '../components/Section.astro';
import { buildWhatsAppUrl } from '../lib/whatsapp';
import { SITE } from '../lib/site';

const waUrl = buildWhatsAppUrl({
  message: "Hi Radiant Alpha, I need help with an order I've received.",
});
---
<Base
  title="Returns & Warranty"
  description="Radiant Alpha returns, refunds, and warranty terms for pre-ordered technology products. 48-hour inspection window and 14-day defect warranty."
  path="/returns"
>
  <Section register="dark">
    <h1 class="ra-display">Returns &amp; Warranty</h1>
    <p class="lede">
      Everything we sell is supplied on a pre-order basis. These are the terms that apply
      to your order — stated plainly, before you buy.
    </p>
  </Section>

  <Section>
    <div class="ra-measure prose">
      <h2>Pre-order and delivery</h2>
      <p>
        All products are supplied on a pre-order basis. Please allow
        <strong>{SITE.preOrderLeadTime}</strong> from order confirmation for delivery.
        Orders cannot be cancelled once procurement and shipping have begun.
      </p>

      <h2>48-hour inspection window</h2>
      <p>
        Inspect your device as soon as it arrives. If it is damaged, defective, or
        significantly different from what was ordered, report it to us within
        <strong>48 hours</strong> of receiving it and we will arrange a replacement or a
        full refund.
      </p>

      <h2>14-day defect warranty</h2>
      <p>
        Hardware faults that appear in normal use within <strong>14 days</strong> of
        delivery will be repaired or replaced at no cost to you.
      </p>
      <p>The warranty does not cover:</p>
      <ul>
        <li>Physical damage, including cracked or broken screens</li>
        <li>Water or liquid damage</li>
        <li>Battery degradation on any device not sold as new</li>
        <li>Cosmetic wear on any device not sold as new</li>
        <li>Damage caused by unauthorised repair or modification</li>
      </ul>

      <h2>Refunds</h2>
      <p>
        Approved refunds are processed using the original payment method within
        <strong>7–14 business days</strong> after we have inspected and confirmed the
        issue.
      </p>

      <h2>Device condition</h2>
      <p>
        Every listing states its condition, grade, network lock status, SIM type, battery
        health, and warranty period before you order. Where a device is refurbished, the
        listing says so. If any of this is unclear on a listing, ask us before ordering —
        we would rather answer the question than process a return.
      </p>

      <h2>How to make a claim</h2>
      <p>
        Message us on <a href={waUrl} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        or email <a href={`mailto:${SITE.email}`}>{SITE.email}</a> with your order
        reference and a description of the problem. Photographs or a short video help us
        resolve things faster.
      </p>
    </div>
  </Section>
</Base>

<style>
  .lede {
    max-width: 56ch;
    font-size: var(--ra-step-1);
    color: var(--ra-fg-muted);
    margin-top: var(--ra-space-l);
  }
  .prose h2 { font-size: var(--ra-step-2); margin-top: var(--ra-space-xl); }
  .prose h2:first-child { margin-top: 0; }
  .prose p, .prose li { color: var(--ra-fg-muted); }
  .prose p { margin-top: var(--ra-space-m); }
  .prose ul { margin-top: var(--ra-space-m); padding-left: 1.2em; }
  .prose li { margin-top: var(--ra-space-2xs); }
</style>
```

- [ ] **Step 5: Build the privacy page**

Create `src/pages/privacy.astro`:

```astro
---
import Base from '../layouts/Base.astro';
import Section from '../components/Section.astro';
import { SITE } from '../lib/site';
---
<Base
  title="Privacy Policy"
  description="How Radiant Alpha Digital Services collects, uses, and protects the personal information you provide through our website and contact channels."
  path="/privacy"
>
  <Section register="dark">
    <h1 class="ra-display">Privacy Policy</h1>
    <p class="lede">How we handle the information you give us.</p>
  </Section>

  <Section>
    <div class="ra-measure prose">
      <h2>What we collect</h2>
      <p>
        When you use our contact form we collect your name, email address, an optional
        phone number, and the message you write. When you contact us on WhatsApp we
        receive your phone number and the messages you send.
      </p>

      <h2>What we use it for</h2>
      <p>
        We use your information solely to respond to your enquiry, to fulfil and support
        an order you place, and to keep a record of our correspondence with you. We do
        not use it for anything else.
      </p>

      <h2>What we do not do</h2>
      <ul>
        <li>We do not sell, rent, or trade your personal information</li>
        <li>We do not share it with third parties for marketing</li>
        <li>We do not send marketing messages you did not ask for</li>
        <li>We do not use advertising or tracking cookies on this site</li>
      </ul>

      <h2>Service providers</h2>
      <p>
        Our website is hosted by Netlify, and form submissions are processed through
        Netlify Forms. WhatsApp messages are handled by WhatsApp. Each of these providers
        processes data under its own privacy policy.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Enquiry records are kept for as long as needed to respond to you and maintain a
        reasonable business record. Order records are kept for as long as required for
        warranty, accounting, and tax purposes.
      </p>

      <h2>Your rights</h2>
      <p>
        Under the Nigeria Data Protection Act, you may request a copy of the personal
        information we hold about you, ask us to correct it, or ask us to delete it. Email
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a> and we will respond within 30
        days.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
        or {SITE.phoneDisplay}. {SITE.legalName}, RC {SITE.rcNumber}, {SITE.location}.
      </p>
    </div>
  </Section>
</Base>

<style>
  .lede { font-size: var(--ra-step-1); color: var(--ra-fg-muted); margin-top: var(--ra-space-m); }
  .prose h2 { font-size: var(--ra-step-2); margin-top: var(--ra-space-xl); }
  .prose h2:first-child { margin-top: 0; }
  .prose p, .prose li { color: var(--ra-fg-muted); }
  .prose p { margin-top: var(--ra-space-m); }
  .prose ul { margin-top: var(--ra-space-m); padding-left: 1.2em; }
  .prose li { margin-top: var(--ra-space-2xs); }
</style>
```

- [ ] **Step 6: Build the terms page**

Create `src/pages/terms.astro`:

```astro
---
import Base from '../layouts/Base.astro';
import Section from '../components/Section.astro';
import { SITE } from '../lib/site';
---
<Base
  title="Terms of Service"
  description="The terms that apply when you order products or commission services from Radiant Alpha Digital Services Ltd."
  path="/terms"
>
  <Section register="dark">
    <h1 class="ra-display">Terms of Service</h1>
    <p class="lede">The terms that apply when you buy from us or commission work.</p>
  </Section>

  <Section>
    <div class="ra-measure prose">
      <h2>Who we are</h2>
      <p>
        {SITE.legalName}, RC {SITE.rcNumber}, registered with the Corporate Affairs
        Commission of Nigeria and based in {SITE.location}.
      </p>

      <h2>Pre-order terms</h2>
      <p>
        All products in our shop are supplied on a pre-order basis. We source your device
        after your order is confirmed, which is what allows us to price competitively.
        <strong> Please allow {SITE.preOrderLeadTime} from order confirmation for
        delivery.</strong>
      </p>
      <p>
        Prices are quoted in Nigerian Naira and may change without notice. The price that
        applies to your order is the price confirmed with you at the point of order.
      </p>
      <p>
        Once procurement and shipping have begun, an order cannot be cancelled. Your
        rights if something arrives damaged, defective, or not as described are set out in
        our <a href="/returns">Returns &amp; Warranty</a> policy.
      </p>

      <h2>Product descriptions</h2>
      <p>
        We state the condition, grade, network lock status, SIM type, battery health, and
        warranty of every device before you order. We describe our stock as accurately as
        we can. If a device arrives significantly different from its description, the
        48-hour inspection window in our returns policy applies.
      </p>

      <h2>Services</h2>
      <p>
        Prices shown on our services pages are indicative starting points, not quotations.
        Each project is scoped and quoted individually, with deliverables, milestones, and
        payment terms agreed in writing before work begins.
      </p>
      <p>
        On final payment, ownership of the delivered work transfers to you, including
        source files and code, unless we have agreed otherwise in writing.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        Our liability in connection with any order or project is limited to the amount you
        paid us for it. Nothing in these terms limits any right you have under the Federal
        Competition and Consumer Protection Act or other applicable Nigerian law.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms. The version published on this page at the time you
        place an order is the version that applies to that order.
      </p>

      <h2>Contact</h2>
      <p>
        Questions: <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or
        {' '}{SITE.phoneDisplay}.
      </p>
    </div>
  </Section>
</Base>

<style>
  .lede { font-size: var(--ra-step-1); color: var(--ra-fg-muted); margin-top: var(--ra-space-m); }
  .prose h2 { font-size: var(--ra-step-2); margin-top: var(--ra-space-xl); }
  .prose h2:first-child { margin-top: 0; }
  .prose p { margin-top: var(--ra-space-m); color: var(--ra-fg-muted); }
</style>
```

- [ ] **Step 7: Build the 404 page**

Create `src/pages/404.astro`:

```astro
---
import Base from '../layouts/Base.astro';
import Section from '../components/Section.astro';
import Button from '../components/Button.astro';
---
<Base
  title="Page not found"
  description="The page you were looking for doesn't exist. Browse our services or shop instead."
  path="/404"
  noindex
>
  <Section register="dark">
    <p class="code ra-numeric">404</p>
    <h1 class="ra-display">We couldn't find that page.</h1>
    <p class="lede">
      It may have moved, or the link might be wrong. Here's where most people are heading:
    </p>
    <div class="actions">
      <Button href="/shop" variant="gold">Browse the Shop</Button>
      <Button href="/services" variant="secondary">Our Services</Button>
      <Button href="/" variant="secondary">Home</Button>
    </div>
  </Section>
</Base>

<style>
  .code {
    font-size: var(--ra-step-3);
    font-weight: 700;
    color: var(--ra-gold-500);
    margin-bottom: var(--ra-space-s);
  }
  .lede {
    max-width: 50ch;
    font-size: var(--ra-step-1);
    color: var(--ra-fg-muted);
    margin-block: var(--ra-space-l) var(--ra-space-xl);
  }
  .actions { display: flex; flex-wrap: wrap; gap: var(--ra-space-m); }
</style>
```

- [ ] **Step 8: Add a temporary shop stub so footer and 404 links resolve**

The shop is Plan 2. Create `src/pages/shop/index.astro` as a holding page so no link 404s:

```astro
---
import Base from '../../layouts/Base.astro';
import Section from '../../components/Section.astro';
import Button from '../../components/Button.astro';
import { buildWhatsAppUrl } from '../../lib/whatsapp';
import { SITE } from '../../lib/site';

const waUrl = buildWhatsAppUrl({
  message: "Hi Radiant Alpha, I'd like to ask about a device.",
});
---
<Base
  title="Shop"
  description="Smartphones, laptops, and accessories on pre-order from Radiant Alpha. Condition, warranty, and delivery time stated clearly on every listing."
  path="/shop"
>
  <Section register="dark">
    <h1 class="ra-display">Our shop is opening shortly.</h1>
    <p class="lede">
      We're preparing the full catalogue now. In the meantime, message us on WhatsApp with
      the model you're after and we'll quote you directly. All devices are supplied on
      pre-order — allow {SITE.preOrderLeadTime} from order confirmation.
    </p>
    <Button href={waUrl} variant="gold" external>Ask About a Device</Button>
  </Section>
</Base>

<style>
  .lede {
    max-width: 56ch;
    font-size: var(--ra-step-1);
    color: var(--ra-fg-muted);
    margin-block: var(--ra-space-l) var(--ra-space-xl);
  }
</style>
```

- [ ] **Step 9: Add a blog stub for the same reason**

Create `src/pages/blog/index.astro`:

```astro
---
import Base from '../../layouts/Base.astro';
import Section from '../../components/Section.astro';
import Button from '../../components/Button.astro';
---
<Base
  title="Blog"
  description="Practical writing on web development, digital marketing, and technology for Nigerian businesses. Coming soon from Radiant Alpha."
  path="/blog"
>
  <Section register="dark">
    <h1 class="ra-display">Writing, coming soon.</h1>
    <p class="lede">
      We're preparing practical articles on building a web presence, digital marketing,
      and choosing technology for a growing business.
    </p>
    <Button href="/contact" variant="gold">Get in Touch</Button>
  </Section>
</Base>

<style>
  .lede {
    max-width: 56ch;
    font-size: var(--ra-step-1);
    color: var(--ra-fg-muted);
    margin-block: var(--ra-space-l) var(--ra-space-xl);
  }
</style>
```

- [ ] **Step 10: Run to verify all pass**

Run: `npm run test:e2e -- contact`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: add contact, returns, privacy, terms, 404, and shop/blog holding pages"
```

---

## Task 14: Privacy guard, accessibility sweep, and performance budget

The final gate. Two of these tests exist specifically to make the spec's non-negotiables mechanically enforced rather than trusted to memory.

**Files:**
- Create: `tests/unit/privacy.test.ts`, `tests/e2e/accessibility.spec.ts`
- Create: `.github/workflows/ci.yml`
- Modify: `package.json`

**Interfaces:**
- Consumes: the built `dist/` directory
- Produces: a green test suite and a CI pipeline

- [ ] **Step 1: Write the failing privacy guard**

This is the single most important test in the plan — it makes it impossible to ship the founder's home address.

Create `tests/unit/privacy.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';

const FORBIDDEN: Array<[string, string]> = [
  ['street address', 'standard estate'],
  ['street address', 'galadimawa'],
  ['street address', 'b09'],
  ['tax identification number', '2623730842678'],
  ['superseded email', '00yila.dev'],
  ['superseded phone', '7040159044'],
  ['superseded phone', '704 015 9044'],
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

describe('built output contains no private or superseded details', () => {
  let files: string[] = [];

  beforeAll(() => {
    files = walk(DIST).filter((f) => /\.(html|xml|txt|json|js|css)$/.test(f));
    expect(files.length, 'run `npm run build` before this test').toBeGreaterThan(0);
  });

  it.each(FORBIDDEN)('never leaks the %s (%s)', (_label, needle) => {
    const offenders = files.filter((file) =>
      readFileSync(file, 'utf8').toLowerCase().includes(needle)
    );
    expect(offenders, `found "${needle}" in: ${offenders.join(', ')}`).toEqual([]);
  });

  it('publishes the RC number, which is intentional', () => {
    const html = readFileSync(join(DIST, 'index.html'), 'utf8');
    expect(html).toContain('9421582');
  });

  it('uses the current contact details', () => {
    const html = readFileSync(join(DIST, 'index.html'), 'utf8');
    expect(html).toContain('help@radiantalphadigital.com');
    expect(html).toContain('2349129665798');
  });
});
```

- [ ] **Step 2: Run it**

```bash
npm run build && npm run test:unit
```

Expected: PASS. If any forbidden string is found, remove it from source — never weaken the test.

- [ ] **Step 3: Write the failing accessibility sweep**

```bash
npm install -D @axe-core/playwright
```

Create `tests/e2e/accessibility.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
  '/', '/about', '/work', '/services', '/services/software-development',
  '/services/digital-marketing', '/contact', '/returns', '/privacy',
  '/terms', '/shop', '/blog',
];

for (const path of PAGES) {
  test(`${path} has no detectable WCAG 2.2 AA violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    const summary = results.violations.map(
      (v) => `${v.id} (${v.nodes.length}): ${v.help}`
    );
    expect(summary, `${path} violations`).toEqual([]);
  });
}

test.describe('keyboard access', () => {
  test('the skip link is the first focusable element and works', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toHaveText(/skip to content/i);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main/);
  });

  test('every interactive element shows a visible focus ring', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const outline = await page.locator(':focus').evaluate(
      (el) => getComputedStyle(el).outlineStyle
    );
    expect(outline).not.toBe('none');
  });
});

test.describe('motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('transitions are suppressed when reduced motion is requested', async ({ page }) => {
    await page.goto('/');
    const duration = await page
      .locator('a[class*="ra-btn"]')
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(parseFloat(duration)).toBeLessThan(0.05);
  });
});
```

- [ ] **Step 4: Run it and fix what it finds**

Run: `npm run test:e2e -- accessibility`
Expected: initially FAIL with a list of violations. Fix each in source — colour contrast, missing landmarks, unlabelled controls, heading order. Re-run until green. Do not add exclusions.

- [ ] **Step 5: Add the combined test script**

In `package.json`, update `scripts`:

```json
{
  "dev": "astro dev",
  "build": "astro build",
  "preview": "astro preview",
  "test:unit": "vitest run",
  "test:e2e": "playwright test",
  "test": "npm run build && npm run test:unit && npm run test:e2e"
}
```

- [ ] **Step 6: Verify the JavaScript budget**

```bash
npm run build
find dist -name '*.js' -exec ls -l {} \; | awk '{ total += $5 } END { print "Total JS bytes:", total }'
```

Expected: under 15,360 bytes. If it exceeds that, find the cause — an accidental client-side component or a stray dependency — and remove it.

- [ ] **Step 7: Add CI**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run build
      - run: npm run test:unit
      - run: npm run test:e2e
```

- [ ] **Step 8: Run the full suite**

Run: `npm test`
Expected: build succeeds, all unit suites pass, all e2e suites pass on both mobile and desktop projects.

- [ ] **Step 9: Manual verification on a real device**

Deploy a Netlify preview and open it on a real mid-range Android phone over mobile data, not wifi. Confirm:

- Text is readable outdoors without zooming
- The WhatsApp button is reachable by thumb and does not cover footer links
- Tapping the WhatsApp button opens WhatsApp with the message pre-filled
- The mobile menu opens, closes, and is operable one-handed
- No horizontal scrolling at 320px width

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "test: add privacy guard, accessibility sweep, JS budget check, and CI"
```

---

## Self-Review

**Spec coverage.** Every Plan 1 section of the spec maps to a task: §2 canonical facts → Task 4 + Task 14; §5 site map → Tasks 9–13; §6 content architecture → Task 8; §7 visual system → Tasks 2, 3, 5; §10 performance/SEO/a11y → Tasks 6, 10, 14; §11 error handling → Task 13 (404, form fallback, empty states) + Task 14; §12 build sequence → task order, with the comps gate at Task 5. Spec §8, §9 (shop) and the blog/CMS are deliberately deferred to Plans 2 and 3.

**Placeholder scan.** No TBD or TODO. Every code step contains the actual content. The one deferred decision — font substitution if a package 404s — has an explicit procedure and a recorded outcome, not a blank.

**Type consistency.** `SITE`, `formatNaira`, `buildWhatsAppUrl`, `buildEnquiryMessage`, `TOKENS`, `contrastRatio`, and `relativeLuminance` keep identical signatures from definition through every consuming task. `Section` props (`register`, `as`, `class`) and `Button` props (`href`, `variant`, `external`) are unchanged from Task 5 onward. The `services` collection field names in `content.config.ts` match every consumer in Tasks 9–11.

**One known gap, deliberately left.** Task 5's product comp hard-codes a sample product. Plan 2 replaces it with the real collection. It is a comp, not a page — it carries `noindex` and is excluded in `robots.txt`.

---

## Open Items Carried From The Spec

Blocking Plan 2 only, not this plan:

- Supplier answers: condition, lock status, SIM tray, IMEI status, battery health
- Confirmation of the condition tier drafts
- Confirmation of whether `sim_type` is retained

Needed before launch, not before build:

- `help@radiantalphadigital.com` mailbox created in Hostinger hPanel
- DNS pointed at Netlify
