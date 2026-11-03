// The squircle: a mascot built as a real solid in 3D rather than a disc
// pretending to be a sphere. Units are about one unit from the centre to a
// side, x right, y down, z toward the viewer.
//
// The body is a superellipse extruded front to back, then grown by a ball of
// radius `round` so every edge is soft. It's drawn in one flat colour, so its
// outline is all that says it's a solid: head-on a squircle, turned a deeper
// block. The eyes ride the flat front cap.

import { svg, toPath, type Point } from "./shape";
import type { Pose, Skin } from "./skins";
import { DEFAULT_TUNING, type Tuning } from "./tuning";

export type Vec3 = [number, number, number];

export type SquircleVariant = {
  /** Half extents of the core; the rounding grows it by `round` all round. */
  size: Vec3;
  round: number;
  /** Superellipse exponent of the front and back: 2 is an ellipse, higher is squarer. */
  exponent: number;
  /** Rings round each rounded edge; more keeps a big rounding smooth. */
  bevelSteps?: number;
  /** Points round the outline, a multiple of 4; more keeps a big render smooth. */
  steps?: number;
};

// ── Vector maths ──────────────────────────────────────────────────────────

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const lerp = (a: Vec3, b: Vec3, t: number) => add(a, scale(add(b, scale(a, -1)), t));

type Turn = { yaw: number; pitch: number; tilt: number };

/** Yaw about y, then pitch about x, then roll in the screen plane. */
function turn([x, y, z]: Vec3, { yaw, pitch, tilt }: Turn): Vec3 {
  const x1 = x * Math.cos(yaw) + z * Math.sin(yaw);
  const z1 = -x * Math.sin(yaw) + z * Math.cos(yaw);
  const y2 = y * Math.cos(pitch) - z1 * Math.sin(pitch);
  const z2 = y * Math.sin(pitch) + z1 * Math.cos(pitch);
  return [
    x1 * Math.cos(tilt) - y2 * Math.sin(tilt),
    x1 * Math.sin(tilt) + y2 * Math.cos(tilt),
    z2,
  ];
}

/** A gentle perspective: near parts a touch bigger. */
const EYE_DISTANCE = 14;
const depthScale = (z: number) => EYE_DISTANCE / (EYE_DISTANCE - z);

function project([x, y, z]: Vec3): Point {
  const k = depthScale(z);
  return [x * k, y * k];
}

/**
 * Half the squircle's width as drawn head-on, perspective and all: the
 * counterpart of the dot's radius. Its widest ring is the front of the wall.
 */
export const halfWidth = ({ size, round }: Pick<SquircleVariant, "size" | "round">) =>
  (size[0] + round) * depthScale(size[2]);

// ── The body ──────────────────────────────────────────────────────────────

/** Points round the outline; a multiple of 4 keeps it symmetric. */
const STEPS = 64;
/** Rings across each rounded edge, from the side wall round to the cap. */
const BEVEL_STEPS = 3;

/**
 * The surface as a stack of rings: the back cap, round the back edge, along
 * the wall, round the front edge, and the front cap.
 */
function rings({
  size: [a, b, c],
  round: r,
  exponent: n,
  bevelSteps = BEVEL_STEPS,
  steps = STEPS,
}: SquircleVariant): Vec3[][] {
  const outline = Array.from({ length: steps }, (_, i) => {
    const t = (i / steps) * Math.PI * 2;
    const [ct, st] = [Math.cos(t), Math.sin(t)];
    const x = a * Math.sign(ct) * Math.abs(ct) ** (2 / n);
    const y = b * Math.sign(st) * Math.abs(st) ** (2 / n);
    // The curve's gradient, which is its outward normal.
    const g: Point = [
      (Math.sign(x) * Math.abs(x / a) ** (n - 1)) / a,
      (Math.sign(y) * Math.abs(y / b) ** (n - 1)) / b,
    ];
    const len = Math.hypot(...g) || 1;
    return { x, y, nx: g[0] / len, ny: g[1] / len };
  });
  const ring = (z: number, angle: number) => {
    const [out, up] = [Math.cos(angle), Math.sin(angle)];
    return outline.map(({ x, y, nx, ny }): Vec3 => [x + nx * r * out, y + ny * r * out, z + r * up]);
  };
  const bevel = (side: -1 | 1) =>
    Array.from({ length: bevelSteps + 1 }, (_, k) =>
      ring(side * c, (side * (k / bevelSteps) * Math.PI) / 2),
    );
  return [...bevel(-1).reverse(), ...bevel(1)];
}

/** The convex hull of some points, by monotone chain. */
function hull(points: Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (o: Point, a: Point, b: Point) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: Point[]) =>
    list.reduce<Point[]>((chain, p) => {
      while (
        chain.length >= 2 &&
        turn(chain[chain.length - 2], chain[chain.length - 1], p) <= 0
      )
        chain.pop();
      chain.push(p);
      return chain;
    }, []);
  const lower = half(sorted);
  const upper = half([...sorted].reverse());
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

export type SquircleFrame = {
  /** The silhouette: the body is convex, so the hull of every ring. */
  d: string;
  eyes: [string | null, string | null];
};

const DEG = 180 / Math.PI;

/** A shape with a tuning's body overrides applied. */
export function tunedBody(variant: SquircleVariant, tuning: Tuning): SquircleVariant {
  const [a, b, c] = variant.size;
  return {
    ...variant,
    exponent: tuning.exponent ?? variant.exponent,
    size: [a, b, tuning.thickness ?? c],
  };
}

/**
 * Everything to draw for a pose. Pure, so it serves the first paint and still
 * thumbnails too. The body turns stiffly (`tuning.turn`), so the eyes do most
 * of the looking; at full travel the outer eye reaches the rounded edge,
 * where the silhouette clips it.
 */
export function squircleFrame(
  pose: Pose,
  variant: SquircleVariant,
  tuning: Tuning = DEFAULT_TUNING,
): SquircleFrame {
  const t: Turn = {
    yaw: pose.yaw * tuning.turn[0] + pose.spin,
    pitch: pose.pitch * tuning.turn[1],
    tilt: pose.tilt,
  };
  const d = toPath(hull(rings(variant).flatMap((ring) => ring.map((p) => project(turn(p, t))))));

  // The face is the front cap, out at the front of the rounding: its
  // bounding square, corners top-left, top-right, bottom-right, bottom-left.
  const [a, b, c] = variant.size;
  const [tl, tr, br, bl] = ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as Point[]).map(
    ([sx, sy]): Vec3 => turn([sx * a, sy * b, c + variant.round], t),
  );
  const facing = turn([0, 0, 1], t)[2];

  // Eyes, only while the face is turned toward us. They slide across the
  // face on their own, ahead of the head.
  const eyes: [string | null, string | null] = [null, null];
  if (facing > 0.08) {
    const h = halfWidth(variant);
    const gap = tuning.gap * h;
    const size = (tuning.size * h) / 24;
    const glance: Point = [pose.eyeX * tuning.travel[0] * a, pose.eyeY * tuning.travel[1] * b];
    // A point on the face from its own units, exact under the turn.
    const on = ([pu, pv]: Point) => {
      const s = (pu / a + 1) / 2;
      return lerp(lerp(tl, tr, s), lerp(bl, br, s), (pv / b + 1) / 2);
    };
    const at = (p: Point) => project(on(p));
    const centreZ = on([0, 0])[2];
    ([-1, 1] as const).forEach((side, i) => {
      const p: Point = [
        side * (gap / 2 - pose.verge * 0.3 * a) + glance[0],
        tuning.drop * h + glance[1],
      ];
      const e = 1e-3;
      const [x, y] = at(p);
      const [ux, uy] = at([p[0] + e, p[1]]);
      const [vx, vy] = at([p[0], p[1] + e]);
      // The eyes narrow as the face turns and, by `ride`, roll with it in the
      // screen plane; `lean` tips them a little further toward the look.
      const roll = tuning.ride * Math.atan2(uy - y, ux - x) - tuning.lean * pose.eyeX;
      // The nearer eye a touch bigger, the farther a touch smaller.
      const near = 1 + (tuning.depth * (on(p)[2] - centreZ)) / h;
      const k = size * pose.eyeScale * near;
      const sx = (k * Math.hypot(ux - x, uy - y)) / e;
      const sy = (k * Math.hypot(vx - x, vy - y) * pose.lid) / e;
      eyes[i] = svg`translate(${x} ${y}) rotate(${(pose.eyeRot + roll) * DEG}) scale(${sx} ${sy}) translate(-12 -12)`;
    });
  }

  return { d, eyes };
}

export type SquircleParts = {
  body: SVGPathElement;
  eyes: [SVGGElement, SVGGElement];
};

/** Writes a squircle's frame into its body path and eyes. */
export function squircleSkin(
  els: SquircleParts,
  current: () => { variant: SquircleVariant; view: number; tuning: Tuning },
): Skin {
  return {
    // The physics sizes its hops and bobs by this, so it's the half width
    // in px, as the dot's radius is.
    radius: (width) => {
      const { variant, view } = current();
      return (width / view) * halfWidth(variant);
    },
    render(pose) {
      const { variant, tuning } = current();
      const { d, eyes } = squircleFrame(pose, variant, tuning);
      els.body.setAttribute("d", d);
      els.eyes.forEach((eye, i) => {
        const transform = eyes[i];
        eye.style.visibility = transform ? "visible" : "hidden";
        if (transform) eye.setAttribute("transform", transform);
      });
    },
  };
}
