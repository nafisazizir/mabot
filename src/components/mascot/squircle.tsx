"use client";

import { useRef, type CSSProperties, type Ref } from "react";
import { cn } from "@/lib/utils";
import { halfWidth, squircleFrame, squircleSkin } from "./squircle-geometry";
import type { Eyes } from "./controller";
import { GlyphPath } from "./glyphs";
import { svg } from "./shape";
import { REST_POSE } from "./skins";
import { SQUIRCLE } from "./squircles";
import { useMascot, type MascotBehavior } from "./use-mascot";

/**
 * The squircle's width against its box, so it looks the same size as a dot
 * in a box of the same size. At equal widths it covers 18.5% more area (its
 * corners) and reads bigger; at 0.92 the areas match. Icon grids land
 * between 0.90 and 0.95.
 */
const OPTICAL_SCALE = 0.92;

/** The box's width in squircle units. It turns and spins past its edges, so the SVG overflows. */
const VIEW = (2 * halfWidth(SQUIRCLE)) / OPTICAL_SCALE;

type SquircleProps = MascotBehavior & {
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
export function Squircle({
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
  const { buttonRef, bodyRef, face, handlers } = useMascot(
    () =>
      squircleSkin(
        { body: bodyPathRef.current!, eyes: [leftEyeRef.current!, rightEyeRef.current!] },
        VIEW,
        () => SQUIRCLE,
      ),
    eyes,
    behavior,
  );
  // Server render and first paint, before the animation loop takes over.
  const first = squircleFrame(REST_POSE, SQUIRCLE);

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
          viewBox={svg`${-VIEW / 2} ${-VIEW / 2} ${VIEW} ${VIEW}`}
          aria-hidden
          className="size-full overflow-visible"
          style={{ color: ink }}
        >
          <path ref={bodyPathRef} d={first.d} style={{ fill: color }} />
          <g ref={leftEyeRef} transform={first.eyes[0] ?? undefined}>
            <GlyphPath glyph={face[0]} />
          </g>
          <g ref={rightEyeRef} transform={first.eyes[1] ?? undefined}>
            <GlyphPath glyph={face[1]} />
          </g>
        </svg>
      </span>
    </Root>
  );
}
