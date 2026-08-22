import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const services = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/services' }),
  schema: z.object({
    title: z.string(),
    shortTitle: z.string(),
    summary: z.string().min(70).max(160),
    lead: z.boolean(),
    order: z.number().int().positive(),
    /** Which band of the Build → Grow → Equip hierarchy this service sits in. */
    tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    startingFrom: z.number().int().positive().optional(),
    faqs: z
      .array(z.object({ question: z.string(), answer: z.string() }))
      .default([]),
  }),
});

/*
 * Blog posts. Schema follows the spec's `posts` table: title, date, excerpt,
 * cover image, body, tags. `draft` is additional — it keeps unfinished writing
 * in the repo without publishing it, which matters once the CMS lands and
 * posts are authored by someone who is not running the build.
 */
const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    excerpt: z.string().min(70).max(200),
    tags: z.array(z.string()).default([]),
    coverImage: z.string().optional(),
    coverAlt: z.string().optional(),
    draft: z.boolean().default(false),
  })
  // A cover image with no alt text would fail the build's accessibility gate
  // at render time; catching it here names the offending file instead.
  .refine((d) => !d.coverImage || !!d.coverAlt, {
    message: 'coverAlt is required whenever coverImage is set',
    path: ['coverAlt'],
  }),
});

/**
 * Everything the shop sells. Phones today; laptops, power banks, accessories
 * and solar hardware use the same shape.
 *
 * The two axes that used to be baked in are now data: `category` decides which
 * silhouette and which spec rows a listing gets, and `variantAxis` names what
 * the buyer is choosing — Storage for a phone, Capacity for a power bank,
 * Wattage for a panel. Nothing here assumes Apple.
 */
const CATEGORIES = ['phones', 'laptops', 'power-banks', 'accessories', 'solar'] as const;

const products = defineCollection({
  /*
   * One JSON file per category, concatenated. glob() would treat each file as
   * a single entry — these hold arrays — and file() takes only one path, so
   * the directory is read directly. Adding a category means dropping in a new
   * file, with no config change.
   *
   * Inline loaders are not watched, so `npm run dev` needs a restart after
   * editing a catalogue file.
   */
  loader: () => {
    const dir = 'src/content/products';
    return readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .flatMap((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
  },
  schema: z.object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    category: z.enum(CATEGORIES),
    brand: z.string().min(1),
    model: z.string().min(1),

    conditionTier: z.enum([
      'new',
      'refurbished-or-nos',
      'unconfirmed',
      'used-or-refurbished',
    ]),
    conditionLabel: z.string(),
    tierRank: z.number().int().min(1).max(4),

    /** What the chips are labelled: Storage, Capacity, Wattage, Configuration. */
    variantAxis: z.string().min(1),

    /*
     * One entry per buyable configuration. Every variant needs its own ref —
     * that is what goes into the WhatsApp order message and later identifies
     * which unit was sold.
     */
    variants: z
      .array(
        z.object({
          label: z.string().min(1),
          price: z.number().int().positive(),
          ref: z.string().min(1),
          colour: z.string().optional(),
          condition: z.string().optional(),
        })
      )
      .min(1)
      // Four is the ceiling the CSS variant picker can address.
      .max(4),

    /** Extra spec rows beyond the ones the category already provides. */
    specs: z.array(z.object({ label: z.string(), value: z.string() })).default([]),

    colours: z.array(z.string()).default([]),

    /*
     * Apple phones only. Drives the silhouette, the eSIM caution, and the
     * "discontinued, so it cannot be new" reasoning — none of which generalise
     * to other brands, so it is optional rather than a required field carrying
     * a meaningless zero.
     */
    appleGeneration: z.number().int().optional(),

    image: z.string().optional(),
    imageAlt: z.string().optional(),
  })
    .refine((d) => !d.image || !!d.imageAlt, {
      message: 'imageAlt is required whenever image is set',
      path: ['imageAlt'],
    })
    .refine(
      (d) => new Set(d.variants.map((v) => v.ref)).size === d.variants.length,
      { message: 'variant refs must be unique within a product', path: ['variants'] }
    ),
});

const settings = defineCollection({
  loader: file('./src/content/settings/site.json'),
  schema: z.object({
    id: z.string(),
    preOrderLeadTime: z.string(),
    inspectionWindowHours: z.number().int().positive(),
    warrantyDays: z.number().int().positive(),
    networkLock: z.string(),
    batteryMinimum: z.string(),
    /*
     * The spec's gate: "Nothing publishes until confirmed." While this is
     * false the listings state the condition tier — which is derived from
     * model age and defensible — but never assert a per-unit battery figure
     * or lock status as though a specific handset had been inspected.
     * Flip it once the supplier has confirmed, and the full spec block shows.
     */
    conditionConfirmed: z.boolean(),
  }),
});

export const collections = { services, posts, products, settings };
