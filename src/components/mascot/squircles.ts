// The squircle family: each a rounded solid built by the same geometry and
// differing only in proportions. Their faces come from a Tuning, so the same
// eyes sit the same way on every shape.

import type { SquircleVariant } from "./squircle-geometry";

/** A soft, chunky block: about 0.8 as deep as it is wide, generously rounded. */
export const SQUIRCLE: SquircleVariant = { size: [0.7, 0.7, 0.52], round: 0.14, exponent: 5 };

/**
 * After the M4 Mac mini, its top turned to face us: 127 mm square and 50 mm
 * tall, so 0.39 as deep as it is wide. Drawn a little slimmer, at 0.33,
 * which reads truer once it turns. Its corners round off with a radius
 * about a fifth of its width (exponent 6 matches that at the diagonal) and
 * its edges are crisp, a fillet of a few millimetres. Each shape fills its
 * box by its own half width, so the two sit the same size.
 */
export const MINI: SquircleVariant = { size: [0.79, 0.79, 0.23], round: 0.05, exponent: 6 };

export const SHAPES = { squircle: SQUIRCLE, mini: MINI } satisfies Record<string, SquircleVariant>;

export type Shape = keyof typeof SHAPES;
