// Helpers for building mascot shapes as dense polylines in head-radius units
// (origin at the head's centre, y down).

export type Point = [number, number];

const SAMPLES = 160;

export function toPath(points: Point[]) {
  const f = (n: number) => n.toFixed(4);
  return `M${points.map(([x, y]) => `${f(x)} ${f(y)}`).join("L")}Z`;
}

/** Sample a closed curve over t ∈ [0, 2π). */
export function sample(fn: (t: number) => Point, samples = SAMPLES) {
  return Array.from({ length: samples }, (_, i) => fn((i / samples) * Math.PI * 2));
}

export const signedPow = (v: number, p: number) => Math.sign(v) * Math.abs(v) ** p;

/**
 * Template tag for SVG attribute strings: rounds every number to 4 places, so
 * the server and browser agree even when their Math.sin/cos differ in the
 * last bit (otherwise hydration sees mismatched transforms).
 */
export function svg(strings: TemplateStringsArray, ...values: number[]) {
  return strings.reduce((out, s, i) => out + s + (i < values.length ? +values[i].toFixed(4) : ""), "");
}
