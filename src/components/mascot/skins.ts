// A skin turns a pose (where the head is looking, how open the eyes are) into
// DOM writes. Both skins treat the face as a sphere: features are points on
// its surface, projected straight onto the screen, hidden once they turn
// round the back, and clipped by the silhouette near the edge.

import { BEAKS, CRESTS, blend, crestParts, profile, type BeakName, type CrestName } from "./gary-geometry";
import { svg, toPath, type Point } from "./shape";

export type Pose = {
  yaw: number;
  pitch: number;
  /** Eyes turning in toward each other. */
  verge: number;
  /** Extra yaw from a poke; a full turn is 2π. */
  spin: number;
  /** 1 open, ~0 shut. */
  lid: number;
  /** Head roll. */
  tilt: number;
  /** Per-eye rotation (the working mood's rocking plus signs). */
  eyeRot: number;
  /** Crest lift: 0 at rest, ~1 raised. Springy, so a kick flutters. */
  flap: number;
};

export interface Skin {
  /** The sphere's radius in px for a button of this width. */
  radius(width: number): number;
  render(pose: Pose, R: number): void;
}

/** Eyes sit 30° either side of the front, i.e. at ±R/2 when looking straight on. */
const EYE_YAW = Math.PI / 6;
const DEG = 180 / Math.PI;

type Projected = { x: number; y: number; sx: number; sy: number } | null;

/** Project a point on a (possibly squashed) sphere with radii `rx` × `ry`. */
function project(lon: number, lat: number, rx: number, ry = rx): Projected {
  const c = Math.cos(lon);
  if (c <= 0) return null;
  const cl = Math.cos(lat);
  return {
    x: rx * Math.sin(lon) * cl,
    y: -ry * Math.sin(lat),
    // c^0.35 keeps edge-on features legible (clipped by the rim) instead of
    // collapsing to a hairline.
    sx: c ** 0.35,
    sy: cl,
  };
}

function eyeLongitude(pose: Pose, side: -1 | 1) {
  return pose.yaw + pose.spin + side * (EYE_YAW - pose.verge);
}

/** The DevDay dot: a flat disc with two glyph eyes. Writes CSS transforms in px. */
export function sphereSkin(face: HTMLElement, eyes: [HTMLElement, HTMLElement]): Skin {
  return {
    radius: (width) => width / 2,
    render(pose, R) {
      face.style.transform = `rotate(${pose.tilt}rad)`;
      for (let i = 0; i < 2; i++) {
        const side = i === 0 ? -1 : 1;
        const p = project(eyeLongitude(pose, side), pose.pitch, R);
        const eye = eyes[i];
        if (!p) {
          eye.style.visibility = "hidden";
          continue;
        }
        eye.style.visibility = "visible";
        eye.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) rotate(${pose.eyeRot}rad) scale(${p.sx}, ${p.sy * pose.lid})`;
      }
    },
  };
}

/** Less vertical travel than the dot, so the face never slides off the chin. */
const PITCH_SCALE = 0.75;
/** Glyph grid units (24 per glyph) to head radii. */
const GLYPH_SCALE = 0.03;

/** Looking straight ahead, eyes open. */
export const REST_POSE: Pose = {
  yaw: 0,
  pitch: 0,
  verge: 0,
  spin: 0,
  lid: 1,
  tilt: 0,
  eyeRot: 0,
  flap: 0,
};

export type GaryParts = {
  head: SVGGElement;
  crest: SVGGElement | null;
  crestPath: SVGPathElement | null;
  beak: SVGGElement | null;
  beakPath: SVGPathElement | null;
  eyes: [SVGGElement, SVGGElement];
};

/** Which parts Gary is built from. Both are optional. */
export type GaryForm = {
  /** Leave it off for a bare head. */
  beak?: BeakName;
  crest?: CrestName;
};

const GARY_RX = 0.98;
const GARY_RY = 0.92;
const GARY_EYE_LAT = 0.1;
const BEAK_LAT = -0.14;
/** How far the front view's tip swings toward the turn per unit of its length, before the side view takes over. */
const BEAK_REACH = 0.85;
/** Where the crest is rooted, in head radii. */
export const CREST_Y = -0.66;

type GaryTransforms = {
  head: string;
  crest: string;
  crestD: string | null;
  beak: string | null;
  beakD: string | null;
  eyes: [string | null, string | null];
};

/** SVG transforms and outlines for every Gary part at a pose, in head radii. */
export function garyTransforms(pose: Pose, form: GaryForm): GaryTransforms {
  const turn = pose.yaw + pose.spin;
  const pitch = pose.pitch * PITCH_SCALE;
  const sin = Math.sin(turn);
  // Which way it faces, and how far its parts have swapped to their side views.
  const dir = sin < 0 ? -1 : 1;
  const side = profile(sin);

  // The beak sits on the face but juts out: head-on its
  // tip leans toward the turn, then it morphs into the side view, a hook past
  // the rim. Worked out facing right, then mirrored.
  const b = project(turn, pitch + BEAK_LAT, GARY_RX, GARY_RY);
  let beakD: string | null = null;
  if (b && form.beak) {
    const { front, side: hook } = BEAKS[form.beak];
    const lean = Math.abs(sin) * BEAK_REACH;
    const sy = Math.max(0.35, b.sy - Math.sin(pitch) * BEAK_REACH);
    const turned = front.map(([x, y]): Point => [b.sx * x + lean * y, sy * y]);
    // Looking up tips the hook up.
    const c = Math.cos(pitch * 0.6);
    const s = Math.sin(pitch * 0.6);
    const raised = hook.map(([x, y]): Point => [x * c + y * s, y * c - x * s]);
    beakD = toPath(blend(turned, raised, side).map(([x, y]): Point => [dir * x, y]));
  }

  // The crest rides the sphere from the crown toward the back of the head as
  // it turns, and its feathers swing round to their side views. Flap fluffs it up.
  const crest = form.crest && CRESTS[form.crest];
  const crestX = crest ? -sin * crest.back : 0;
  const crestY = CREST_Y + pitch * 0.2;

  const eye = (side: -1 | 1) => {
    const p = project(eyeLongitude(pose, side), pitch + GARY_EYE_LAT, GARY_RX, GARY_RY);
    if (!p) return null;
    return svg`translate(${p.x} ${p.y}) rotate(${pose.eyeRot * DEG}) scale(${p.sx * GLYPH_SCALE} ${p.sy * pose.lid * GLYPH_SCALE}) translate(-12 -12)`;
  };

  return {
    head: svg`rotate(${pose.tilt * DEG})`,
    crest: svg`translate(${crestX} ${crestY}) scale(${1 + 0.25 * pose.flap} ${1 + 0.15 * pose.flap})`,
    crestD: crest ? crestParts(crest, side, dir).map(toPath).join("") : null,
    beak: b && svg`translate(${b.x} ${b.y})`,
    beakD,
    eyes: [eye(-1), eye(1)],
  };
}

/** Gary: a bird head with a crest and a beak, both optional. Writes SVG attributes. */
export function garySkin(parts: GaryParts, view: number, form: GaryForm): Skin {
  const place = (el: SVGElement | null, transform: string | null) => {
    if (!el) return;
    el.style.visibility = transform ? "visible" : "hidden";
    if (transform) el.setAttribute("transform", transform);
  };
  return {
    radius: (width) => width / view,
    render(pose) {
      const t = garyTransforms(pose, form);
      place(parts.head, t.head);
      place(parts.crest, t.crest);
      place(parts.beak, t.beak);
      if (t.crestD) parts.crestPath?.setAttribute("d", t.crestD);
      if (t.beakD) parts.beakPath?.setAttribute("d", t.beakD);
      place(parts.eyes[0], t.eyes[0]);
      place(parts.eyes[1], t.eyes[1]);
    },
  };
}
