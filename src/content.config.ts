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

/*
 * Phone catalogue. One JSON file rather than 53 Markdown files: every field is
 * structured data with no prose body, and a single list is what the CMS will
 * bind a repeatable form to later.
 *
 * conditionTier is derived from model age, not invented per unit — Apple
 * discontinued the iPhone X in 2018, so no iPhone X sold in 2026 is new from
 * any source. `image` is the swappable slot the spec calls for: set it and the
 * photograph replaces the generated placeholder for that one product.
 */
const products = defineCollection({
  loader: file('./src/content/products/phones.json'),
  schema: z.object({
    id: z.string(),
    model: z.string(),
    storage: z.string().regex(/^\d+GB$/),
    price: z.number().int().positive(),
    ref: z.string(),
    generation: z.number().int(),
    conditionTier: z.enum([
      'new',
      'refurbished-or-nos',
      'unconfirmed',
      'used-or-refurbished',
    ]),
    conditionLabel: z.string(),
    tierRank: z.number().int().min(1).max(4),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
  }).refine((d) => !d.image || !!d.imageAlt, {
    message: 'imageAlt is required whenever image is set',
    path: ['imageAlt'],
  }),
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
