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

const settings = defineCollection({
  loader: file('./src/content/settings/site.json'),
  schema: z.object({
    id: z.string(),
    preOrderLeadTime: z.string(),
  }),
});

export const collections = { services, posts, settings };
