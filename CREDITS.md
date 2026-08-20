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


## Product imagery — why there are no Apple photographs

The 53 phone listings use generated placeholder figures from
`src/components/PhoneFigure.astro`: the correct silhouette per generation,
in the brand's navy and gold, with the storage size as the distinguishing mark.

Apple's official product renders are **not** used, for two separate reasons:

1. **Licence.** Apple supplies product imagery to authorised resellers and
   channel partners under its marketing guidelines. Outside that relationship
   the images are copyrighted and the marks are trademarked, and a commercial
   resale site is exactly the use Apple enforces against. The design spec made
   this call deliberately: "launch legally clean rather than rely on
   non-enforcement."
2. **Accuracy.** 33 of the 53 listings are used or refurbished handsets. A
   pristine studio render misrepresents the actual item, on a site whose whole
   pitch is that it describes stock honestly.

Every product has an optional `image` field. Setting it replaces the generated
figure for that one listing — a per-product edit, not a rebuild. Use it for:

- **Photographs of your own stock.** The strongest option by far, and the only
  one that shows the buyer the actual handset.
- **Apple's official assets, if you are an Apple Authorised Reseller.** Then you
  have legitimate access through Apple's channel marketing resources, and the
  licence question goes away. The accuracy point still applies to used units.

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
