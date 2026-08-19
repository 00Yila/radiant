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
