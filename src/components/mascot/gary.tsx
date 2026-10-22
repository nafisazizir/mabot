"use client";

import { useId, useRef, type CSSProperties, type Ref } from "react";
import { cn } from "@/lib/utils";
import type { Eyes } from "./controller";
import { CRESTS, GARY_HEAD, type Box } from "./gary-geometry";
import { GlyphPath } from "./glyphs";
import { svg } from "./shape";
import { CREST_Y, REST_POSE, garySkin, garyTransforms, type GaryForm } from "./skins";
import { useMascot, type MascotBehavior } from "./use-mascot";

export type { GaryForm } from "./skins";

type GaryProps = MascotBehavior & {
  color: string;
  beak: string;
  ink: string;
  eyes: Eyes;
  form: GaryForm;
  label: string;
  /** False renders a plain, hidden-from-assistive-tech span, for thumbnails inside other controls. */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
};

/** Never frame tighter than this, so a bare head keeps its size. */
const MIN_VIEW = 3.2;

const offset = ([x0, y0, x1, y1]: Box, dx: number, dy: number): Box => [x0 + dx, y0 + dy, x1 + dx, y1 + dy];

/** A square viewBox around every part at rest, centred horizontally on the head. */
function frame(form: GaryForm) {
  const boxes: Box[] = [GARY_HEAD.box];
  if (form.crest) boxes.push(offset(CRESTS[form.crest].box, 0, CREST_Y));
  const minX = Math.min(...boxes.map((b) => b[0]));
  const minY = Math.min(...boxes.map((b) => b[1]));
  const maxX = Math.max(...boxes.map((b) => b[2]));
  const maxY = Math.max(...boxes.map((b) => b[3]));
  const view = Math.max(MIN_VIEW, 2 * Math.max(-minX, maxX) * 1.06, (maxY - minY) * 1.08);
  const cy = (minY + maxY) / 2;
  return { view, viewBox: svg`${-view / 2} ${cy - view / 2} ${view} ${view}` };
}

/** The Gary variant: same physics as the dot, with a beak that juts out in profile. */
export function Gary({
  color,
  beak,
  ink,
  eyes,
  form,
  label,
  interactive = true,
  className,
  style,
  ...behavior
}: GaryProps) {
  const clipId = `gary-${useId().replace(/[^\w-]/g, "")}`;
  const { view, viewBox } = frame(form);
  // Server render and first paint, before the animation loop takes over.
  const rest = garyTransforms(REST_POSE, form);
  const headRef = useRef<SVGGElement>(null);
  const crestRef = useRef<SVGGElement>(null);
  const crestPathRef = useRef<SVGPathElement>(null);
  const beakRef = useRef<SVGGElement>(null);
  const beakPathRef = useRef<SVGPathElement>(null);
  const leftEyeRef = useRef<SVGGElement>(null);
  const rightEyeRef = useRef<SVGGElement>(null);
  const { buttonRef, bodyRef, face, handlers } = useMascot(
    () =>
      garySkin(
        {
          head: headRef.current!,
          crest: crestRef.current,
          crestPath: crestPathRef.current,
          beak: beakRef.current,
          beakPath: beakPathRef.current,
          eyes: [leftEyeRef.current!, rightEyeRef.current!],
        },
        view,
        form,
      ),
    eyes,
    behavior,
  );

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
        <svg viewBox={viewBox} aria-hidden className="size-full overflow-visible" style={{ color: ink }}>
          <defs>
            <clipPath id={clipId}>
              <path d={GARY_HEAD.d} />
            </clipPath>
          </defs>
          <g ref={headRef} transform={rest.head}>
            {form.crest && (
              <g ref={crestRef} transform={rest.crest}>
                <path ref={crestPathRef} d={rest.crestD ?? undefined} style={{ fill: color }} />
              </g>
            )}
            <path d={GARY_HEAD.d} style={{ fill: color }} />
            <g clipPath={`url(#${clipId})`}>
              <g ref={leftEyeRef} transform={rest.eyes[0] ?? undefined}>
                <GlyphPath glyph={face[0]} />
              </g>
              <g ref={rightEyeRef} transform={rest.eyes[1] ?? undefined}>
                <GlyphPath glyph={face[1]} />
              </g>
            </g>
            {form.beak && (
              <g ref={beakRef} transform={rest.beak ?? undefined}>
                <path ref={beakPathRef} d={rest.beakD ?? undefined} style={{ fill: beak }} />
              </g>
            )}
          </g>
        </svg>
      </span>
    </Root>
  );
}
