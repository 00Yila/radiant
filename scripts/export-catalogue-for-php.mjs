/**
 * Regenerates the price manifest PHP trusts for checkout — public/data/
 * catalogue/products.json — from the same source files the storefront reads.
 *
 * Wired into `npm run build` itself, unlike build-images.mjs's manually-run
 * pattern: a stale price file here is a real money bug (an old price charged,
 * or a legitimate order rejected as "unknown product"), not a cosmetic one,
 * so it cannot depend on a human remembering to run it.
 *
 * PHP on Hostinger has no access to Astro's content collections at request
 * time — there is no Node process to ask — so this plain JSON file is the
 * only way checkout.php can look up a real price without trusting the
 * browser. Deliberately a minimal manifest, not the full catalogue schema,
 * so PHP's parser stays decoupled from the storefront's Zod shape.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const SOURCE_DIR = 'src/content/products';
const OUT_DIR = 'public/data/catalogue';
const OUT_FILE = `${OUT_DIR}/products.json`;

/**
 * Pure transform: catalogue JSON files in → the manifest PHP reads out.
 * Exported so tests/unit/catalogue-export.test.ts can assert every product
 * id / variant ref / price round-trips exactly, without touching the
 * filesystem.
 */
export function buildManifest(products) {
  return products.map((p) => ({
    id: p.id,
    brand: p.brand,
    model: p.model,
    variants: p.variants.map((v) => ({
      ref: v.ref,
      label: v.label,
      price: v.price,
    })),
  }));
}

export function readCatalogue(dir = SOURCE_DIR) {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
}

function main() {
  const manifest = buildManifest(readCatalogue());
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(manifest, null, 2));
  console.log(`${OUT_FILE}: ${manifest.length} products, ${manifest.reduce((n, p) => n + p.variants.length, 0)} variants`);
}

// Only run when invoked directly (`node scripts/export-catalogue-for-php.mjs`
// or via npm run build) — not when imported by the unit test. pathToFileURL
// normalises Windows drive-letter paths (C:\...) the same way Node does for
// import.meta.url, which a hand-built `file://` string comparison would get
// wrong (missing the triple-slash before the drive letter).
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
