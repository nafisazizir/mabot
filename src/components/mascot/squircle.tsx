"use client";

import { useEffect, useId, useRef, type CSSProperties, type Ref } from "react";
import { cn } from "@/lib/utils";
import { halfWidth, squircleFrame, squircleSkin, tunedBody, type SquircleVariant } from "./squircle-geometry";
import { posed, type Eyes } from "./controller";
import { faceTuning, GlyphPath } from "./glyphs";
import { svg } from "./shape";
import { SHAPES, type Shape } from "./squircles";
import { DEFAULT_TUNING, type Tuning } from "./tuning";
import { useMascot, type MascotBehavior } from "./use-mascot";

/**
 * The squircle's width against its box, so it looks the same size as a dot
 * in a box of the same size. At equal widths it covers 18.5% more area (its
 * corners) and reads bigger; at 0.92 the areas match. Icon grids land
 * between 0.90 and 0.95.
 */
const OPTICAL_SCALE = 0.92;

/** The box's width in a shape's units. It turns and spins past its edges, so the SVG overflows. */
export const viewOf = (variant: SquircleVariant) => (2 * halfWidth(variant)) / OPTICAL_SCALE;

type SquircleProps = MascotBehavior & {
  /** Which of the family; defaults to the squircle. */
  shape?: Shape;
  /** How it wears its face. Pass a stable object; a new one redraws. */
  tuning?: Tuning;
  color: string;
  ink: string;
  eyes: Eyes;
  label: string;
  /** False renders a plain, hidden-from-assistive-tech span, for thumbnails inside other controls. */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
};

/** The squircle mascot: a flat-coloured solid in 3D on the same physics as the dot. */
export function Squircle(props: SquircleProps) {
  // The skin is built once per mount, so a new shape is a new mascot.
  return <SquircleBody key={props.shape ?? "squircle"} {...props} />;
}

function SquircleBody({
  shape = "squircle",
  tuning = DEFAULT_TUNING,
  color,
  ink,
  eyes,
  label,
  interactive = true,
  className,
  style,
  ...behavior
}: SquircleProps) {
  const bodyPathRef = useRef<SVGPathElement>(null);
  const leftEyeRef = useRef<SVGGElement>(null);
  const rightEyeRef = useRef<SVGGElement>(null);
  const variant = tunedBody(SHAPES[shape], tuning);
  const view = viewOf(variant);
  // The animation loop reads the latest tuning from here, so sliders apply live.
  const live = useRef({ variant, view, tuning });
  const { buttonRef, bodyRef, face, handlers } = useMascot(
    () =>
      squircleSkin(
        { body: bodyPathRef.current!, eyes: [leftEyeRef.current!, rightEyeRef.current!] },
        () => live.current,
      ),
    eyes,
    behavior,
    tuning,
  );
  // Spaced for the eyes on show, so a face change re-spaces them behind its blink.
  const worn = faceTuning(face, tuning);
  useEffect(() => {
    live.current = { variant, view, tuning: worn };
  });
  // Server render and first paint, before the animation loop takes over.
  const first = squircleFrame(posed(behavior.gaze), variant, worn);
  // Eyes that slide to the edge are clipped by the silhouette, like the dot's.
  const id = useId().replace(/[^\w-]/g, "");

  const Root = interactive ? "button" : "span";
  return (
    <Root
      ref={buttonRef as Ref<HTMLButtonElement & HTMLSpanElement>}
      {...(interactive ? { type: "button", "aria-label": label, ...handlers } : { "aria-hidden": true })}
      className={cn(
        "relative inline-block touch-none rounded-[28%] outline-none select-none focus-visible:ring-3 focus-visible:ring-gray-600/50",
        className,
      )}
      style={style}
    >
      <span ref={bodyRef} className="absolute inset-0 block will-change-transform">
        <svg
          viewBox={svg`${-view / 2} ${-view / 2} ${view} ${view}`}
          aria-hidden
          className="size-full overflow-visible"
          style={{ color: ink }}
        >
          <defs>
            <clipPath id={`${id}-clip`}>
              <use href={`#${id}-body`} />
            </clipPath>
          </defs>
          <path id={`${id}-body`} ref={bodyPathRef} d={first.d} style={{ fill: color }} />
          <g clipPath={`url(#${id}-clip)`}>
            <g ref={leftEyeRef} transform={first.eyes[0] ?? undefined}>
              <GlyphPath glyph={face[0]} weight={tuning} />
            </g>
            <g ref={rightEyeRef} transform={first.eyes[1] ?? undefined}>
              <GlyphPath glyph={face[1]} weight={tuning} />
            </g>
          </g>
        </svg>
      </span>
    </Root>
  );
}
