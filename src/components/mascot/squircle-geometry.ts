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

export type Vec3 = [number, number, number];

/** Eye placement on the front cap, in its units (centred, v down). */
export type EyePlacement = { u: number; v: number; gap: number; size: number };

export type SquircleVariant = {
  /** Half extents of the core; the rounding grows it by `round` all round. */
  size: Vec3;
  round: number;
  /** Superellipse exponent of the front and back: 2 is an ellipse, higher is squarer. */
  exponent: number;
  eyes: EyePlacement;
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
function rings({ size: [a, b, c], round: r, exponent: n }: SquircleVariant): Vec3[][] {
  const outline = Array.from({ length: STEPS }, (_, i) => {
    const t = (i / STEPS) * Math.PI * 2;
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
    Array.from({ length: BEVEL_STEPS + 1 }, (_, k) =>
      ring(side * c, (side * (k / BEVEL_STEPS) * Math.PI) / 2),
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
/** How much of the pose's look turns the body. Stiffer than a head. */
const LOOK = { yaw: 0.65, pitch: 0.55 };

/** Everything to draw for a pose. Pure, so it serves the first paint and still thumbnails too. */
export function squircleFrame(pose: Pose, variant: SquircleVariant): SquircleFrame {
  const t: Turn = {
    yaw: pose.yaw * LOOK.yaw + pose.spin,
    pitch: pose.pitch * LOOK.pitch,
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

  // Eyes, only while the face is turned toward us. They glance a little
  // across the face toward where the head is looking.
  const eyes: [string | null, string | null] = [null, null];
  if (facing > 0.08) {
    const { u, v, gap, size } = variant.eyes;
    const glance: Point = [pose.yaw * 0.12 * a, -pose.pitch * 0.12 * b];
    // A point on the face from its own units, exact under the turn.
    const at = ([pu, pv]: Point) => {
      const s = (pu / a + 1) / 2;
      return project(lerp(lerp(tl, tr, s), lerp(bl, br, s), (pv / b + 1) / 2));
    };
    ([-1, 1] as const).forEach((side, i) => {
      const p: Point = [
        u + side * (gap / 2 - pose.verge * 0.3 * a) + glance[0],
        v + glance[1],
      ];
      const e = 1e-3;
      const [x, y] = at(p);
      const [ux, uy] = at([p[0] + e, p[1]]);
      const [vx, vy] = at([p[0], p[1] + e]);
      // Upright: the eyes ride the face and narrow as it turns, but never skew.
      const sx = (size * Math.hypot(ux - x, uy - y)) / e;
      const sy = (size * Math.hypot(vx - x, vy - y) * pose.lid) / e;
      eyes[i] = svg`translate(${x} ${y}) rotate(${pose.eyeRot * DEG}) scale(${sx} ${sy}) translate(-12 -12)`;
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
  view: number,
  current: () => SquircleVariant,
): Skin {
  return {
    // The physics sizes its hops and bobs by this, so it's the half width
    // in px, as the dot's radius is.
    radius: (width) => (width / view) * halfWidth(current()),
    render(pose) {
      const { d, eyes } = squircleFrame(pose, current());
      els.body.setAttribute("d", d);
      els.eyes.forEach((eye, i) => {
        const transform = eyes[i];
        eye.style.visibility = transform ? "visible" : "hidden";
        if (transform) eye.setAttribute("transform", transform);
      });
    },
  };
}
