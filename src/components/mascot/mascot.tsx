"use client";

import { useRef, type CSSProperties, type Ref } from "react";
import { cn } from "@/lib/utils";
import type { Eyes } from "./controller";
import { GlyphIcon } from "./glyphs";
import { sphereSkin } from "./skins";
import { useMascot, type MascotBehavior } from "./use-mascot";

export type { Eyes, Mood } from "./controller";
export type { MascotHandle } from "./use-mascot";

type MascotProps = MascotBehavior & {
  color: string;
  ink: string;
  eyes: Eyes;
  label: string;
  /** False renders a plain, hidden-from-assistive-tech span, for thumbnails inside other controls. */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
};

/** The DevDay dot: a flat sphere with glyph eyes. */
export function Mascot({
  color,
  ink,
  eyes,
  label,
  interactive = true,
  className,
  style,
  ...behavior
}: MascotProps) {
  const faceRef = useRef<HTMLSpanElement>(null);
  const leftRef = useRef<HTMLSpanElement>(null);
  const rightRef = useRef<HTMLSpanElement>(null);
  const { buttonRef, bodyRef, face, handlers } = useMascot(
    () => sphereSkin(faceRef.current!, [leftRef.current!, rightRef.current!]),
    eyes,
    behavior,
  );

  const eyeClass =
    "absolute top-1/2 left-1/2 -mt-[18%] -ml-[18%] block size-[36%] will-change-transform";

  const Root = interactive ? "button" : "span";
  return (
    <Root
      ref={buttonRef as Ref<HTMLButtonElement & HTMLSpanElement>}
      {...(interactive ? { type: "button", "aria-label": label, ...handlers } : { "aria-hidden": true })}
      className={cn(
        "relative inline-block touch-none rounded-full outline-none select-none focus-visible:ring-3 focus-visible:ring-gray-600/50",
        className,
      )}
      style={style}
    >
      <span
        ref={bodyRef}
        className="absolute inset-0 block overflow-hidden rounded-full will-change-transform"
        style={{ backgroundColor: color, color: ink }}
      >
        <span ref={faceRef} className="absolute inset-0 block">
          {/* Rest positions (±R/2) for the server render, until the loop takes over. */}
          <span ref={leftRef} className={eyeClass} style={{ transform: "translateX(-69.4%)" }}>
            <GlyphIcon glyph={face[0]} className="size-full" />
          </span>
          <span ref={rightRef} className={eyeClass} style={{ transform: "translateX(69.4%)" }}>
            <GlyphIcon glyph={face[1]} className="size-full" />
          </span>
        </span>
      </span>
    </Root>
  );
}
