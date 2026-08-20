# Writing a blog post

Until the CMS lands (Phase 3), a post is one Markdown file. No code changes, no
developer — add the file, rebuild, upload. The site finds it automatically.

## The short version

1. Create a file in `src/content/posts/` named after the URL you want:
   `src/content/posts/choosing-a-domain-name.md` becomes
   `radiantalphadigital.com/blog/choosing-a-domain-name`.
2. Paste the template below and write.
3. Run `npm run build`.
4. Upload `dist/` as usual.

The post appears on `/blog`, and the three newest also appear on the home page.
Nothing else needs editing — no index to update, no list to add yourself to.

## The template

Copy this whole block into a new file:

```markdown
---
title: "Choosing a domain name for your business"
date: 2026-09-01
excerpt: "A short summary, between 70 and 200 characters. It appears on the blog index, on the home page, and in Google results."
tags: ["Web Development"]
draft: true
---

## Start with a heading like this one

Write normally. A blank line makes a new paragraph.

Use **bold** for emphasis and [links like this](https://example.com).

- Bullet points work
- So do numbered lists

## Another section

Keep going.
```

## The fields

| Field | Required | Notes |
|---|---|---|
| `title` | Yes | In quotes. Appears as the page heading and the browser tab. |
| `date` | Yes | `YYYY-MM-DD`. Controls ordering — newest first. |
| `excerpt` | Yes | **70–200 characters.** The build fails outside that range, on purpose: shorter says nothing, longer gets cut off in Google. |
| `tags` | No | A list. The first one shows on the card. Reuse existing tags rather than inventing near-duplicates. |
| `draft` | No | `true` hides it everywhere. Leave it `true` while writing. |
| `coverImage` | No | Path like `/images/photos/my-photo.jpg`. |
| `coverAlt` | Only with an image | Describes the image for screen readers. **Required if you set `coverImage`** — the build fails without it. |

## Publishing

Set `draft: true` while you write. The post stays invisible on every surface —
the index, the home page, the related rail — but you can still preview it by
running `npm run dev` and visiting the URL directly.

When it's ready, change to `draft: false` (or delete the line), rebuild, upload.

## If the build fails

The error names the file and the problem. The three common ones:

**`excerpt: String must contain at least 70 character(s)`**
Your summary is too short. Expand it.

**`coverAlt is required whenever coverImage is set`**
You added an image but no description of it. Add `coverAlt`.

**`Invalid date`**
Use `2026-09-01`, not `01/09/2026` and not `Sept 1`.

Nothing is broken while the build is failing — the live site keeps serving the
last successful upload. Fix the file and build again.

## House style

The site's position is that we are straight with people, which is a promise the
writing has to keep too.

- **Answer the question in the title.** If the title asks what something costs,
  put a number in the first two paragraphs.
- **Use real figures.** Quote the actual prices from the services page. If a
  price changes, update the posts that cite it.
- **Do not promise outcomes we do not control.** No "guaranteed number one on
  Google". The existing SEO post explains why at length; contradicting it costs
  more than the post gains.
- **Write for a business owner, not a developer.** Explain the jargon or drop it.
- **British spellings**, to match the rest of the site: *organisation*,
  *optimise*, *centre*.
- **Naira with the sign and separators**: ₦150,000.

## What the site does for you automatically

You do not need to think about any of this:

- The post is added to `/blog`, newest first
- The three newest appear on the home page
- `BlogPosting` and breadcrumb structured data for Google
- Open Graph tags, so the link previews properly in WhatsApp
- The sitemap
- A "More writing" rail at the foot of every other post

## Later: the CMS

Phase 3 adds Decap CMS at `/admin` — a browser form with a rich-text editor and
image upload, so posts can be written and published without touching files or
running a build. The posts you write now carry over unchanged; the CMS edits
these same Markdown files.
