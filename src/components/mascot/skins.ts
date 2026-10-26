// A skin turns a pose (where the head is looking, how open the eyes are) into
// DOM writes. The dot treats the face as a sphere: features are points on
// its surface, projected straight onto the screen, hidden once they turn
// round the back, and clipped by the silhouette near the edge.

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
};

export interface Skin {
  /** The sphere's radius in px for a button of this width. */
  radius(width: number): number;
  render(pose: Pose, R: number): void;
}

/** Eyes sit 30° either side of the front, i.e. at ±R/2 when looking straight on. */
const EYE_YAW = Math.PI / 6;

type Projected = { x: number; y: number; sx: number; sy: number } | null;

/** Project a point on a sphere of radius `r`. */
function project(lon: number, lat: number, r: number): Projected {
  const c = Math.cos(lon);
  if (c <= 0) return null;
  const cl = Math.cos(lat);
  return {
    x: r * Math.sin(lon) * cl,
    y: -r * Math.sin(lat),
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

/** Looking straight ahead, eyes open. */
export const REST_POSE: Pose = {
  yaw: 0,
  pitch: 0,
  verge: 0,
  spin: 0,
  lid: 1,
  tilt: 0,
  eyeRot: 0,
};
