// The squircle's shape and where its eyes sit.

import { halfWidth, type SquircleVariant } from "./squircle-geometry";

const BODY = { size: [0.7, 0.7, 0.52], round: 0.14, exponent: 5 } satisfies Omit<SquircleVariant, "eyes">;

/**
 * Eyes in the dot's terms, as fractions of the half width (the dot's
 * radius). The dot's own sit 1 apart with glyphs 0.72 wide. The squircle's
 * keep the size but are evenly spaced: the same space left of the eyes,
 * between them and right of them. With glyphs whose ink is `w` wide, the gap
 * is (2 + w) / 3; the `^` ink is about 0.52 at this size, and the others land
 * within 0.04.
 */
const EYES = { gap: 0.84, size: 0.72 };

const h = halfWidth(BODY);

export const SQUIRCLE: SquircleVariant = {
  ...BODY,
  eyes: { u: 0, v: 0, gap: EYES.gap * h, size: (EYES.size * h) / 24 },
};
