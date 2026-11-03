// Everything that decides how the squircle family wears its face: where the
// eyes sit, how heavy they're drawn, how far they look and how they ride the
// face as it turns. Lengths are fractions of the shape's half width (the
// dot's radius), so a tuning reads the same on any shape at any size.

export type Tuning = {
  /** Between the eye centres. */
  gap: number;
  /** Each glyph's 24-unit box. */
  size: number;
  /** How far below centre the eyes rest. Lower reads younger and softer. */
  drop: number;
  /** Line weight of glyph eyes, in the glyph's 24-unit grid. */
  stroke: number;
  /** Line weight of pill eyes, which are drawn as one fat rounded stroke. */
  pill: number;
  /** Round caps and joins; false gives the crisp mitred DevDay glyphs. */
  round: boolean;
  /** How far the eyes slide across the face at full glance, as fractions of its half extents, x then y. */
  travel: [number, number];
  /** How much the eyes turn with the face in the screen plane: 0 stays upright, 1 rides the face. */
  ride: number;
  /** Extra lean toward the look, in radians at full glance. */
  lean: number;
  /** Near eye bigger, far eye smaller, as the face turns. 0 is flat. */
  depth: number;
  /** How much of the look turns the body, yaw then pitch. The eyes do the rest. */
  turn: [number, number];
  /** Body overrides; omitted keeps the shape's own. Superellipse exponent: higher is squarer. */
  exponent?: number;
  /** Body overrides; half depth front to back. */
  thickness?: number;
};

/**
 * The DevDay glyphs, crisp and light, a little larger and placed after the Grok
 * bot marks: close-set, a little low, riding the face as it turns. Their
 * pills are about 0.23 of the body tall and 0.10 wide, with centres 0.22
 * apart; glyphs like `*` and `^` are wider than a pill, so they need a wider
 * gap than that to stay apart.
 */
export const DEFAULT_TUNING: Tuning = {
  gap: 0.72,
  // A touch bigger than the DevDay glyphs: an asterisk is airy and reads
  // smaller than a solid pill, and the Grok eyes run 0.23–0.28 of the body.
  size: 0.8,
  drop: 0.1,
  stroke: 2.75,
  pill: 7.5,
  // Crisp, typographic glyphs like the DevDay faces; pills stay round anyway.
  round: false,
  travel: [0.39, 0.5],
  ride: 1,
  lean: 0.12,
  // The nearer eye only a touch bigger: 5% taller in the profile pose, 11%
  // at a full turn. Much more reads as lopsided rather than as depth.
  depth: 0.2,
  turn: [0.65, 0.55],
};

/** The tuning before the Grok pass: wide-set, centred, thin and upright. */
export const LEGACY_TUNING: Tuning = {
  gap: 0.84,
  size: 0.72,
  drop: 0,
  stroke: 2.75,
  pill: 6.5,
  round: false,
  travel: [0.3, 0.38],
  ride: 0,
  lean: 0,
  depth: 0,
  turn: [0.65, 0.55],
};
