// The squircle family: each a rounded solid with eyes on its front, built by
// the same geometry and differing only in proportions.

import { halfWidth, type SquircleVariant } from "./squircle-geometry";

type Body = Omit<SquircleVariant, "eyes">;

/**
 * Eyes in the dot's terms, as fractions of the half width (the dot's
 * radius). The dot's own sit 1 apart with glyphs 0.72 wide. The squircle's
 * keep the size but are evenly spaced: the same space left of the eyes,
 * between them and right of them. With glyphs whose ink is `w` wide, the gap
 * is (2 + w) / 3; the `^` ink is about 0.52 at this size, and the others land
 * within 0.04.
 */
const EYES = { gap: 0.84, size: 0.72 };

function withEyes(body: Body): SquircleVariant {
  const h = halfWidth(body);
  return { ...body, eyes: { u: 0, v: 0, gap: EYES.gap * h, size: (EYES.size * h) / 24 } };
}

/** A soft, chunky block: about 0.8 as deep as it is wide, generously rounded. */
export const SQUIRCLE = withEyes({ size: [0.7, 0.7, 0.52], round: 0.14, exponent: 5 });

/**
 * After the M4 Mac mini, its top turned to face us: 127 mm square and 50 mm
 * tall, so 0.39 as deep as it is wide. Drawn a little slimmer, at 0.33,
 * which reads truer once it turns. Its corners round off with a radius
 * about a fifth of its width (exponent 6 matches that at the diagonal) and
 * its edges are crisp, a fillet of a few millimetres. Each shape fills its
 * box by its own half width, so the two sit the same size.
 */
export const MINI = withEyes({ size: [0.79, 0.79, 0.23], round: 0.05, exponent: 6 });

export const SHAPES = { squircle: SQUIRCLE, mini: MINI } satisfies Record<string, SquircleVariant>;

export type Shape = keyof typeof SHAPES;
