# Image credits

## Photography

All photographs are from [Unsplash](https://unsplash.com) under the
[Unsplash License](https://unsplash.com/license): free for commercial and
non-commercial use, no permission needed. Attribution is not required, but is
recorded here so the provenance of every image on the site is traceable.

| File | Photographer | Source | Used on |
|---|---|---|---|
| `public/images/photos/products-iphone-*` | Filip Baotić | [unsplash.com/photos/DV0mB2uJM34](https://unsplash.com/photos/DV0mB2uJM34) | Home — technology products; Shop |
| `public/images/photos/abuja-skyline-*` | Chizon | [unsplash.com/photos/LfRn3yxsrQo](https://unsplash.com/photos/LfRn3yxsrQo) | About |

The Abuja photograph is tagged by the photographer as taken in Abuja, Nigeria.
That matters: the pages using it state that we are based there, so a generic
stand-in city would be a misleading illustration of a factual claim.

### What we deliberately do not use

No stock photographs of people are used anywhere on this site, and none should
be added. Pictures of models on an About or testimonials page read as "our
team" or "our customers" — a claim we cannot support, on a site whose stated
position is that we are new and have not yet collected client reviews. The
same reasoning rules out stock "project screenshots" on the Work page.

Photographs of specific named institutions are also avoided, since placing one
on a company page implies a relationship with that institution.

## Generated artwork

Everything else is generated from the brand mark and committed as source, not
sourced externally:

| Asset | Origin |
|---|---|
| `public/images/logo-mark-96.png`, `logo-mark-light-96.png`, `logo-lockup.png` | Derived from `src/assets/logo-source.png` |
| `public/images/og-default.png` | Composed in `scripts/build-images.mjs` |
| `src/components/ServiceGlyph.astro` | Hand-drawn inline SVG, hexagon-and-node language of the logo |
| `src/components/HeroFigure.astro` | Hand-drawn inline SVG |
| Section backdrops in `src/styles/backdrops.css` | Inline SVG data URIs generated from the logo geometry |

Regenerate the raster assets with:

```bash
node scripts/build-images.mjs
```
