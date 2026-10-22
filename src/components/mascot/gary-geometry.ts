// Gary shapes, in head-radius units (origin at the head's centre, y down).
// Feathered parts are unions of feathers, so they read as one silhouette in a
// flat fill. Every part carries its bounding
// box so the component can frame it.

import { sample, signedPow, toPath, type Point } from "./shape";

/** minX, minY, maxX, maxY */
export type Box = [number, number, number, number];
export type Shape = { d: string; box: Box };

function shape(parts: Point[][]): Shape {
  const points = parts.flat();
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return {
    d: parts.map(toPath).join(""),
    box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
  };
}

/** Chaikin corner cutting: rounds a polygon's corners by about one edge segment. */
function smooth(points: Point[], segments = 6, iterations = 3): Point[] {
  let out: Point[] = points.flatMap(([x, y], i) => {
    const [nx, ny] = points[(i + 1) % points.length];
    return Array.from({ length: segments }, (_, k): Point => {
      const t = k / segments;
      return [x + (nx - x) * t, y + (ny - y) * t];
    });
  });
  for (let it = 0; it < iterations; it++) {
    out = out.flatMap(([x, y], i): Point[] => {
      const [nx, ny] = out[(i + 1) % out.length];
      return [
        [0.75 * x + 0.25 * nx, 0.75 * y + 0.25 * ny],
        [0.25 * x + 0.75 * nx, 0.25 * y + 0.75 * ny],
      ];
    });
  }
  return out;
}

/** Round and a touch taller than wide: a bird's skull. */
export const GARY_HEAD = shape([
  sample((t) => {
    const y = 0.96 * signedPow(Math.sin(t), 2 / 2.4);
    const taper = y > 0 ? 1 - 0.1 * (y / 0.96) ** 2 : 1;
    return [1.04 * signedPow(Math.cos(t), 2 / 2.4) * taper, y];
  }),
]);

type FeatherOptions = {
  /** Positive bends the tip counter-clockwise on screen. */
  curl?: number;
  from?: Point;
  /** 0 a sharp tip, 1 a round cap. */
  round?: number;
};

/** A feather from `from` along `angle` (radians, 0 = +x, y down), widest just past halfway. */
function feather(
  angle: number,
  length: number,
  width: number,
  { curl = 0, from = [0, 0], round = 0.3 }: FeatherOptions = {},
): Point[] {
  const n = 40;
  const p = 1 - 0.5 * round;
  const spine = (s: number): Point => [s * length, -curl * length * s * s];
  const half = (s: number) => (width / 2) * Math.sin(Math.PI * s ** 1.15) ** p;
  const top = Array.from({ length: n + 1 }, (_, i) => {
    const s = i / n;
    const [x, y] = spine(s);
    return [x, y - half(s)] as Point;
  });
  const bottom = top.map((_, i) => {
    const s = 1 - i / n;
    const [x, y] = spine(s);
    return [x, y + half(s)] as Point;
  });
  const c = Math.cos(angle);
  const sn = Math.sin(angle);
  return [...top, ...bottom].map(([x, y]) => [from[0] + x * c - y * sn, from[1] + x * sn + y * c]);
}

const DEG = Math.PI / 180;
const UP = -90 * DEG;

/** `n` points spaced evenly along an open polyline, both ends included. */
function resample(chain: Point[], n: number): Point[] {
  const lengths = [0];
  for (let i = 1; i < chain.length; i++) {
    const [ax, ay] = chain[i - 1];
    const [bx, by] = chain[i];
    lengths.push(lengths[i - 1] + Math.hypot(bx - ax, by - ay));
  }
  const total = lengths[lengths.length - 1];
  let j = 1;
  return Array.from({ length: n }, (_, i): Point => {
    const at = (total * i) / (n - 1);
    while (j < chain.length - 1 && lengths[j] < at) j++;
    const t = (at - lengths[j - 1]) / (lengths[j] - lengths[j - 1] || 1);
    const [ax, ay] = chain[j - 1];
    const [bx, by] = chain[j];
    return [ax + (bx - ax) * t, ay + (by - ay) * t];
  });
}

/** Linear blend of two outlines with matching points. */
export function blend(a: Point[], b: Point[], t: number): Point[] {
  return a.map(([ax, ay], i) => [ax + (b[i][0] - ax) * t, ay + (b[i][1] - ay) * t]);
}

/** How far a part has turned from its front view to its side view, eased: 0 head-on, 1 by about 55° of turn. */
export function profile(sin: number) {
  const t = Math.min(1, Math.max(0, (Math.abs(sin) - 0.1) / 0.7));
  return t * t * (3 - 2 * t);
}

// ── Beaks ─────────────────────────────────────────────────────────────────
// Origin at the top centre. Every beak has a front view, tip hanging down +y,
// and a side view facing +x, both sampled into the same number of points in
// the same order (top, out along one edge to the tip, back along the other),
// so the skin can morph between them as the head turns.

/** Points per edge of a beak outline. */
const BEAK_EDGE = 48;
/** Where every beak's top edge sits, just above its origin. */
const BEAK_TOP = -0.06;

export type Beak = { front: Point[]; side: Point[] };

/** A closed front outline, starting at its top centre and running down the right side first. */
function front(outline: Point[]): Point[] {
  // The top centre: highest, nudged toward x = 0.
  const score = ([x, y]: Point) => y + 4 * Math.abs(x);
  const start = outline.reduce((best, p, i) => (score(p) < score(outline[best]) ? i : best), 0);
  let loop = [...outline.slice(start), ...outline.slice(0, start)];
  if (loop[1][0] < loop[0][0]) loop = [loop[0], ...loop.slice(1).reverse()];
  const tip = loop.reduce((best, [, y], i) => (y > loop[best][1] ? i : best), 0);
  return [
    ...resample(loop.slice(0, tip + 1), BEAK_EDGE + 1),
    ...resample([...loop.slice(tip), loop[0]], BEAK_EDGE + 1).slice(1, -1),
  ];
}

/**
 * A front outline `length` long and at most `width` across, its half-width
 * following u^dome · (1 − u)^taper down its length (u from 0 at the top to 1
 * at the tip). `dome` near 0 squares off the shoulders, 0.5 rounds them into
 * an arc, 1 brings them to a point. `taper` 1 runs straight sides into the
 * tip, above 1 hollows them into a fine raptor hook, below 1 blunts it.
 */
function face(width: number, length: number, dome: number, taper: number): Point[] {
  const n = 64;
  const peak = dome / (dome + taper);
  const scale = width / 2 / (peak ** dome * (1 - peak) ** taper);
  // Cosine spacing packs samples into the rounded ends.
  const right = Array.from({ length: n + 1 }, (_, i): Point => {
    const u = (1 - Math.cos((Math.PI * i) / n)) / 2;
    return [scale * u ** dome * (1 - u) ** taper, BEAK_TOP + u * length];
  });
  const left = right.slice(1, -1).reverse().map(([x, y]): Point => [-x, y]);
  return front([...right, ...left]);
}

type HookOptions = {
  /** Along the curve, from the face to the tip. */
  length: number;
  /** Top to bottom where it leaves the face. */
  depth: number;
  /** Total downward bend in radians. Past ~1.6 the tip curls back under. */
  bend: number;
  /** Where the bend happens: 1 an even arc, higher keeps it straight until a sharp hook at the end. */
  late?: number;
};

/**
 * The side view: a horn leaving the face at the beak's top and bottom,
 * tapering along a spine that bends down into the tip. The root starts a
 * little inside the face, rounded off like a cere, so it never leaves a gap
 * at the rim or a hard edge on the cheek.
 */
function hook({ length, depth, bend, late = 2 }: HookOptions): Point[] {
  const n = 96;
  const ds = length / n;
  let p: Point = [-0.16, BEAK_TOP + depth / 2];
  const top: Point[] = [];
  const bottom: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    // Rises a touch off the face, like a culmen, before bending down.
    const a = -0.12 + bend * s ** late;
    const cap = Math.sqrt(Math.min(1, s / 0.1) * (2 - Math.min(1, s / 0.1)));
    const h = (depth / 2) * cap * (1 - s) ** 0.85;
    top.push([p[0] + h * Math.sin(a), p[1] - h * Math.cos(a)]);
    bottom.push([p[0] - h * Math.sin(a), p[1] + h * Math.cos(a)]);
    p = [p[0] + ds * Math.cos(a), p[1] + ds * Math.sin(a)];
  }
  return [
    ...resample(top, BEAK_EDGE + 1),
    ...resample(bottom.reverse(), BEAK_EDGE).slice(1),
  ];
}

export const BEAKS = {
  /** A broad rounded triangle, sides bowed out. Sturdy and simple. */
  shield: {
    front: front(
      smooth([
        [-0.26, -0.03],
        [0, -0.07],
        [0.26, -0.03],
        [0.17, 0.22],
        [0, 0.43],
        [-0.17, 0.22],
      ]),
    ),
    side: hook({ length: 0.64, depth: 0.36, bend: 1.5, late: 2.2 }),
  },
  /** Square shoulders, sides hollowing into a fine point; in profile, straight then a hard hook. */
  hook: {
    front: face(0.46, 0.5, 0.22, 1.55),
    side: hook({ length: 0.78, depth: 0.4, bend: 2.1, late: 3.2 }),
  },
  /** Domed top, widest a third of the way down; in profile, one even curve. */
  drop: {
    front: face(0.4, 0.46, 0.5, 1.05),
    side: hook({ length: 0.6, depth: 0.36, bend: 1.4, late: 1.3 }),
  },
  /** Wide, flat and short; in profile, a stubby wedge. */
  keel: {
    front: face(0.56, 0.3, 0.16, 1.1),
    side: hook({ length: 0.5, depth: 0.3, bend: 1, late: 1.8 }),
  },
  /** Pointed at both ends like a cut stone; in profile, long with a late, sharp tip. */
  kite: {
    front: face(0.38, 0.6, 1.25, 1.6),
    side: hook({ length: 0.84, depth: 0.32, bend: 1.7, late: 4 }),
  },
  /** Small and soft all round; in profile, a short curve. */
  pebble: {
    front: face(0.36, 0.3, 0.45, 0.75),
    side: hook({ length: 0.46, depth: 0.3, bend: 1.1, late: 1.4 }),
  },
} satisfies Record<string, Beak>;

export type BeakName = keyof typeof BEAKS;

// ── Crests ────────────────────────────────────────────────────────────────
// Rooted at the crown; the skin places them behind the head. Each feather has
// a front view and a side view facing +x (so "back" is −x), and the skin
// blends their parameters as the head turns.

/** How much of a crest feather the head hides, from the crest root to the crown. */
const CREST_HIDDEN = 0.3;

export type Feather = {
  angle: number;
  length: number;
  width: number;
  /** Positive bends the tip counter-clockwise on screen. */
  curl?: number;
  /** 0 a sharp tip, 1 a round cap. */
  round?: number;
};

type CrestSpec = {
  /** How far back the root slides in profile, in head radii: 0.18 tops the crown, 0.5 sits on the back of the head. */
  back: number;
  feathers: { front: Feather; side: Feather }[];
};

export type Crest = CrestSpec & { box: Box };

const mirror = (f: Feather, dir: number): Feather =>
  // −π − angle, not π − angle: same direction, but it stays near the front
  // view's angle so blending between them never swings the long way round.
  dir > 0 ? f : { ...f, angle: -Math.PI - f.angle, curl: -(f.curl ?? 0) };

const mix = (a: Feather, b: Feather, t: number): Feather => ({
  angle: a.angle + (b.angle - a.angle) * t,
  length: a.length + (b.length - a.length) * t,
  width: a.width + (b.width - a.width) * t,
  curl: (a.curl ?? 0) + ((b.curl ?? 0) - (a.curl ?? 0)) * t,
  round: (a.round ?? 0.3) + ((b.round ?? 0.3) - (a.round ?? 0.3)) * t,
});

/** The crest's feathers `t` of the way to profile, facing `dir` (+1 right, −1 left). */
export function crestParts(crest: CrestSpec, t: number, dir: number): Point[][] {
  return crest.feathers.map(({ front, side }) => {
    const f = mix(front, mirror(side, dir), t);
    return feather(f.angle, f.length, f.width, f);
  });
}

/** Bounds over every turn, including the root's slide toward the back. */
function crest(spec: CrestSpec): Crest {
  const boxes = Array.from({ length: 25 }, (_, i) => {
    const sin = Math.sin(((i - 12) / 12) * (Math.PI / 2));
    const dx = -sin * spec.back;
    const { box } = shape(crestParts(spec, profile(sin), Math.sign(sin) || 1));
    return [box[0] + dx, box[1], box[2] + dx, box[3]];
  });
  return {
    ...spec,
    box: [
      Math.min(...boxes.map((b) => b[0])),
      Math.min(...boxes.map((b) => b[1])),
      Math.max(...boxes.map((b) => b[2])),
      Math.max(...boxes.map((b) => b[3])),
    ],
  };
}

const f = (angle: number, length: number, width: number, curl = 0, round = 0.3): Feather => ({
  angle: UP + angle * DEG,
  length,
  width,
  curl,
  round,
});

/**
 * The Sweep cowlick with its visible length scaled by `k`; the hidden root
 * stays put. Shorter feathers show only their tapering tips, so they widen to
 * keep the same weight. In profile it lies back along the crown.
 */
function sweep(k: number) {
  const len = (l: number) => CREST_HIDDEN + (l - CREST_HIDDEN) * k;
  const w = 1 + 0.6 * (1 - k);
  return crest({
    back: 0.18,
    feathers: [
      { front: f(-8, len(1.15), 0.42 * w, 0.42, 1), side: f(-30, len(1.15), 0.42 * w, 0.42, 1) },
      { front: f(-34, len(0.92), 0.36 * w, 0.45, 1), side: f(-56, len(0.92), 0.36 * w, 0.45, 1) },
      { front: f(16, len(0.72), 0.32 * w, 0.2, 1), side: f(-8, len(0.72), 0.32 * w, 0.2, 1) },
    ],
  });
}

/**
 * After the Javan hawk-eagle, the bird behind the Garuda, at the emblem's
 * proportions: a short jambul on the back of the head, `k` of a full feather
 * showing. In profile three sharp tips stack down the nape, the top one near
 * upright and the rest fanning back, tips flicking up. Head-on it hides
 * behind the head, or with `peek` shows two tips leaning one way; three
 * upright tips there read as a crown.
 */
function elang(k: number, peek = false) {
  const len = (l: number) => CREST_HIDDEN + (l - CREST_HIDDEN) * k;
  const w = 1 + 0.5 * (1 - k);
  // Shorter than CREST_HIDDEN stays behind the head.
  const fronts = peek
    ? [f(-14, len(1.3), 0.28 * w, 0.18, 0.1), f(-34, len(1.1), 0.26 * w, 0.16, 0.1), f(-54, 0.26, 0.24, 0, 0.1)]
    : [f(-14, 0.26, 0.28, 0, 0.1), f(-34, 0.26, 0.26, 0, 0.1), f(-54, 0.26, 0.24, 0, 0.1)];
  const sides = [
    f(-14, len(1.4), 0.28 * w, -0.3, 0.1),
    f(-46, len(1.25), 0.26 * w, -0.28, 0.1),
    f(-76, len(1.1), 0.24 * w, -0.24, 0.1),
  ];
  return crest({ back: 0.5, feathers: fronts.map((front, i) => ({ front, side: sides[i] })) });
}

export const CRESTS = {
  /** Jambul: the Sweep cowlick at three quarters of its visible height. */
  trim: sweep(0.75),
  /** The full cowlick: three round-capped feathers curling one way. */
  sweep: sweep(1),
  /** One tall feather with a sharp, curling tip; in profile it leans back. */
  plume: crest({
    back: 0.3,
    feathers: [{ front: f(-6, 1.3, 0.46, 0.5, 0.15), side: f(-34, 1.3, 0.46, -0.3, 0.15) }],
  }),
  elang: elang(0.45),
  elangPeek: elang(0.45, true),
  /**
   * After the emblem's jambul, not a copy of it: a flame of feathers on the
   * back of the head that flare up and back in profile.
   */
  flare: crest({
    back: 0.55,
    feathers: [
      { front: f(-4, 1.12, 0.32, 0.15, 0.1), side: f(-14, 1.2, 0.34, -0.38, 0.1) },
      { front: f(-24, 1, 0.3, 0.2, 0.1), side: f(-36, 1.12, 0.32, -0.3, 0.1) },
      { front: f(16, 1, 0.3, -0.15, 0.1), side: f(-58, 1.02, 0.3, -0.24, 0.1) },
      { front: f(-42, 0.82, 0.26, 0.2, 0.1), side: f(-80, 0.86, 0.26, -0.16, 0.1) },
    ],
  }),
  /** Three overlapping feathers laid back from the crown like a folded wing. */
  swept: crest({
    back: 0.3,
    feathers: [
      { front: f(-22, 1.3, 0.42, 0.12, 0.25), side: f(-36, 1.3, 0.42, 0.12, 0.25) },
      { front: f(-42, 1.12, 0.38, 0.12, 0.25), side: f(-56, 1.12, 0.38, 0.12, 0.25) },
      { front: f(-62, 0.92, 0.32, 0.12, 0.25), side: f(-76, 0.92, 0.32, 0.12, 0.25) },
    ],
  }),
  /** Three upright feathers, the centre one tallest. Symmetric, like a flame. */
  crown: crest({
    back: 0.3,
    feathers: [
      { front: f(0, 1.25, 0.42, 0, 0.1), side: f(-20, 1.25, 0.42, -0.1, 0.1) },
      { front: f(-17, 1, 0.26, 0.06, 0.1), side: f(-44, 1, 0.3, -0.06, 0.1) },
      { front: f(17, 1, 0.26, -0.06, 0.1), side: f(-4, 0.9, 0.26, -0.1, 0.1) },
    ],
  }),
  /** Two short round feathers just clearing the crown. Barely there. */
  tuft: crest({
    back: 0.3,
    feathers: [
      { front: f(-14, 0.66, 0.3, 0.3, 1), side: f(-36, 0.66, 0.3, 0.1, 1) },
      { front: f(18, 0.54, 0.26, 0.15, 1), side: f(-10, 0.54, 0.26, 0.1, 1) },
    ],
  }),
};

export type CrestName = keyof typeof CRESTS;
