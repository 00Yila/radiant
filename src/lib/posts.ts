import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

/**
 * Published posts, newest first.
 *
 * Every page that lists posts goes through here so the draft filter and the
 * sort order cannot drift apart between the index, the home preview, and the
 * "related" rail — a draft leaking onto one of three surfaces is exactly the
 * bug that duplicated logic produces.
 */
export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/** Long form, for datetime-adjacent display. Explicit locale so the build box cannot change it. */
export function formatPostDate(date: Date): string {
  return date.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Machine-readable YYYY-MM-DD for <time datetime> and structured data. */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
