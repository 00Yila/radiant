/*
 * Monotonic counter for SVG element ids.
 *
 * A gradient id derived from a product's own fields collides the moment the
 * same product renders twice on a page, or two products share a variant label.
 * Duplicate ids are invalid HTML and make `url(#…)` resolve to whichever
 * element happens to come first.
 *
 * Module state is per build process and the output is deterministic for a
 * given render order, so builds stay reproducible.
 */
let counter = 0;

export const nextFigureId = (): number => (counter += 1);
