/**
 * Regenerates every raster asset in public/images from the sources committed
 * under src/assets. Run after changing the logo or swapping a photograph:
 *
 *   node scripts/build-images.mjs
 *
 * Deliberately a one-shot script rather than a build step. These inputs change
 * a few times a year, and the outputs are committed, so paying the cost on
 * every `astro build` would buy nothing.
 */
import { mkdirSync, readdirSync, statSync } from 'node:fs';
import sharp from 'sharp';

const OUT = 'public/images';
const PHOTOS_OUT = `${OUT}/photos`;
const LOGO_SRC = 'src/assets/logo-source.png';

mkdirSync(PHOTOS_OUT, { recursive: true });

/** The logo is a horizontal lockup on a large transparent canvas. */
async function logoAssets() {
  const trimmed = await sharp(LOGO_SRC).trim().png().toBuffer();
  const { width, height } = await sharp(trimmed).metadata();

  // The mark is the leftmost square block: sun plus hex lattice, no wordmark.
  const mark = await sharp(trimmed)
    .extract({ left: 0, top: 0, width: height, height })
    .png()
    .toBuffer();

  await sharp(mark).resize(96, 96).png({ compressionLevel: 9, palette: true })
    .toFile(`${OUT}/logo-mark-96.png`);

  await sharp(trimmed).resize({ height: 72 }).png({ compressionLevel: 9, palette: true })
    .toFile(`${OUT}/logo-lockup.png`);

  // Navy hexes disappear on a navy background, so the footer and the OG card
  // get a variant with the blue-dominant pixels turned white. Gold is left be.
  const { data, info } = await sharp(mark).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const light = Buffer.from(data);
  for (let i = 0; i < light.length; i += 4) {
    const [r, , b, a] = [light[i], light[i + 1], light[i + 2], light[i + 3]];
    if (a > 16 && b > r && b > 100) {
      light[i] = 255; light[i + 1] = 255; light[i + 2] = 255;
    }
  }
  await sharp(light, { raw: { width: info.width, height: info.height, channels: 4 } })
    .resize(96, 96).png({ compressionLevel: 9 })
    .toFile(`${OUT}/logo-mark-light-96.png`);

  return width;
}

/** 1200x630 share card. Fonts are system stacks: this renders on the build box. */
async function ogCard() {
  const W = 1200, H = 630;
  const mark = await sharp(`${OUT}/logo-mark-light-96.png`).resize(170, 170).toBuffer();

  const svg = Buffer.from(`<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}'>
    <rect width='${W}' height='${H}' fill='#0A1930'/>
    <rect x='0' y='0' width='10' height='${H}' fill='#EFB42E'/>
    <text x='96' y='250' fill='#EFB42E' font-family='Segoe UI, Arial, sans-serif' font-size='26' font-weight='700' letter-spacing='4'>DIGITAL SERVICES · ABUJA, NIGERIA</text>
    <text x='96' y='340' fill='#FFFFFF' font-family='Georgia, serif' font-size='68' font-weight='700'>Radiant Alpha</text>
    <text x='96' y='412' fill='#FFFFFF' font-family='Georgia, serif' font-size='40'>Digital Services</text>
    <text x='96' y='498' fill='#B9CCE8' font-family='Segoe UI, Arial, sans-serif' font-size='27'>Websites · Software · E-commerce · Marketing</text>
    <text x='96' y='556' fill='#B9CCE8' font-family='Segoe UI, Arial, sans-serif' font-size='21'>RC 9421582 · Registered with the CAC, Nigeria</text>
  </svg>`);

  await sharp(svg)
    .composite([{ input: mark, left: W - 280, top: Math.round(H / 2 - 85) }])
    .png({ compressionLevel: 9 })
    .toFile(`${OUT}/og-default.png`);
}

/**
 * Photographs, in WebP with a JPEG fallback at two widths each.
 * `position: 'attention'` crops toward the busiest region rather than the
 * centre, which keeps the subject in frame at the tighter aspect ratios.
 * See CREDITS.md for source and licence.
 */
const PHOTOS = [
  { src: 'products-iphone', aspect: [4, 3], widths: [640, 1280] },
  { src: 'abuja-skyline', aspect: [16, 9], widths: [800, 1600] },
];

async function photos() {
  for (const { src, aspect, widths } of PHOTOS) {
    for (const w of widths) {
      const h = Math.round((w * aspect[1]) / aspect[0]);
      const base = sharp(`src/assets/photos/${src}.jpg`)
        .resize(w, h, { fit: 'cover', position: 'attention' });
      await base.clone().webp({ quality: 74 }).toFile(`${PHOTOS_OUT}/${src}-${w}.webp`);
      await base.clone().jpeg({ quality: 76, mozjpeg: true }).toFile(`${PHOTOS_OUT}/${src}-${w}.jpg`);
    }
  }
}

await logoAssets();
await ogCard();
await photos();

const report = (dir) =>
  readdirSync(dir)
    .filter((f) => statSync(`${dir}/${f}`).isFile())
    .map((f) => `  ${f.padEnd(30)} ${(statSync(`${dir}/${f}`).size / 1024).toFixed(1)}KB`)
    .join('\n');

console.log(`${OUT}\n${report(OUT)}\n${PHOTOS_OUT}\n${report(PHOTOS_OUT)}`);
