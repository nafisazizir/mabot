// Still images of a mascot, drawn from the same geometry as the live one but
// at rest: eyes open, no bob, facing its pose.

import { moodFace, posed, type Eyes, type Gaze, type Mood } from "./controller";
import { faceTuning, glyphStyle, type Glyph, type Weight } from "./glyphs";
import { svg } from "./shape";
import { sphereEyes } from "./skins";
import { squircleFrame } from "./squircle-geometry";
import { SHAPES } from "./squircles";
import { viewOf } from "./squircle";
import { DEFAULT_TUNING, LEGACY_TUNING } from "./tuning";

export type Still = {
  variant: "squircle" | "mini" | "dot";
  color: string;
  ink: string;
  eyes: Eyes;
  mood: Mood;
  gaze?: Gaze;
};

/** The dot's radius in its viewBox. */
const R = 50;

/**
 * CSS colours (including `var(--ds-…)` tokens) as the page resolves them, since
 * the file leaves the page, flattened to sRGB hex so any tool can read them.
 */
function resolve(color: string) {
  const probe = document.createElement("span");
  probe.style.color = color;
  document.body.append(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
  ctx.canvas.width = ctx.canvas.height = 1;
  ctx.fillStyle = resolved;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function glyph(name: Glyph, ink: string, weight: Weight) {
  const s = glyphStyle(name, weight);
  return s.fill
    ? `<path d="${s.d}" fill="${ink}"/>`
    : `<path d="${s.d}" fill="none" stroke="${ink}" stroke-width="${s.width}" stroke-linecap="${s.cap}" stroke-linejoin="${s.join}" stroke-miterlimit="8"/>`;
}

/** How the still sits in its file. */
export type Framing = {
  /** Space added round the mascot, as a fraction of its own box. */
  padding?: number;
  /** A fill behind it; transparent when omitted. */
  background?: string;
  /** Pixel width and height written onto the SVG. */
  size?: number;
};

/** The mascot's drawing, centred on the origin, with the half width of the square that holds it. */
function draw({ variant, color, ink, eyes, mood, gaze }: Still) {
  const fill = resolve(color);
  const stroke = resolve(ink);
  const face = moodFace(mood, 0) ?? eyes;
  const pose = posed(gaze);

  if (variant !== "dot") {
    const shape = SHAPES[variant];
    const frame = squircleFrame(pose, shape, faceTuning(face, DEFAULT_TUNING));
    // Turned, it can reach past its box, so fit the box to the silhouette.
    const extent = Math.max(...(frame.d.match(/-?\d+(\.\d+)?/g) ?? []).map((n) => Math.abs(+n)));
    const eyeGroups = frame.eyes
      .map((t, i) => (t ? `<g transform="${t}">${glyph(face[i], stroke, DEFAULT_TUNING)}</g>` : ""))
      .join("");
    return {
      half: Math.max(viewOf(shape) / 2, extent * 1.06),
      art:
        `<defs><clipPath id="body"><path d="${frame.d}"/></clipPath></defs>` +
        `<path d="${frame.d}" fill="${fill}"/><g clip-path="url(#body)">${eyeGroups}</g>`,
    };
  }

  // The dot's eye boxes are 36% of its width, centred on the projected point.
  const k = (0.72 * R) / 24;
  const eyeGroups = sphereEyes(pose, R)
    .map((p, i) =>
      p
        ? `<g transform="${svg`translate(${p.x} ${p.y}) scale(${p.sx * k} ${p.sy * k}) translate(-12 -12)`}">${glyph(face[i], stroke, LEGACY_TUNING)}</g>`
        : "",
    )
    .join("");
  return {
    half: R,
    art:
      `<defs><clipPath id="head"><circle r="${R}"/></clipPath></defs>` +
      `<circle r="${R}" fill="${fill}"/>` +
      `<g clip-path="url(#head)" transform="${svg`rotate(${(pose.tilt * 180) / Math.PI})`}">${eyeGroups}</g>`,
  };
}

export function mascotSvg(still: Still, { padding = 0, background, size }: Framing = {}) {
  const { half, art } = draw(still);
  const h = half * (1 + padding);
  const box = svg`${-h} ${-h} ${2 * h} ${2 * h}`;
  const dims = size ? ` width="${size}" height="${size}"` : "";
  const bg = background
    ? `<rect ${svg`x="${-h}" y="${-h}" width="${2 * h}" height="${2 * h}"`} fill="${resolve(background)}"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}"${dims}>${bg}${art}</svg>`;
}

/** An SVG string rasterised to a square PNG, `size` px a side. */
export async function svgToPng(markup: string, size: number) {
  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    canvas.getContext("2d")!.drawImage(img, 0, 0, size, size);
    const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/png"));
    if (!blob) throw new Error("Couldn't encode the PNG");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
