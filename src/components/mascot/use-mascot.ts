"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { MascotController, type Eyes, type Mood } from "./controller";
import type { Skin } from "./skins";

export type MascotHandle = {
  /** Full 360° turn; swaps to a reaction face while it's turned away. */
  spin: () => void;
  blink: () => void;
  /** Show `eyes` for `ms`, swapped in and out behind a blink. */
  react: (eyes: Eyes, ms?: number) => void;
};

export type MascotBehavior = {
  /** Track the cursor. When false (or the cursor goes idle) it looks around on its own. */
  follow?: boolean;
  /** Gentle idle bob. */
  float?: boolean;
  mood?: Mood;
  /** Hold the head at this yaw (radians, negative turns to the viewer's left) instead of looking around. */
  gaze?: number;
  /** Settle at rest and stop, for thumbnails. */
  still?: boolean;
  ref?: Ref<MascotHandle>;
};

/**
 * Wires a skin to a MascotController. Returns the refs for the button and the
 * moving body, the face to draw, and the pointer handlers for the button.
 * `createSkin` runs once, after mount, so it can read the skin's own refs.
 */
export function useMascot(
  createSkin: () => Skin,
  eyes: Eyes,
  { follow = true, float = true, mood = "idle", gaze, still = false, ref }: MascotBehavior,
) {
  const buttonRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLSpanElement>(null);
  const controller = useRef<MascotController>(null);
  const [face, setFace] = useState<Eyes | null>(null);

  useEffect(() => {
    const c = new MascotController(
      { button: buttonRef.current!, body: bodyRef.current! },
      createSkin(),
      { follow, float, eyes, mood, gaze, still },
      setFace,
    );
    controller.current = c;
    return () => c.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- created once; options sync below
  }, []);

  useEffect(() => {
    controller.current?.update({ follow, float, eyes, mood, gaze, still });
  }, [follow, float, eyes, mood, gaze, still]);

  useImperativeHandle(ref, () => ({
    spin: () => controller.current?.poke(),
    blink: () => controller.current?.blink(),
    react: (next, ms) => controller.current?.react(next, ms),
  }));

  const handlers = {
    // Stops drags from selecting text across the page.
    onMouseDown: (e: React.MouseEvent) => e.preventDefault(),
    onPointerDown: (e: React.PointerEvent) => controller.current?.pointerDown(e.nativeEvent),
    onPointerMove: (e: React.PointerEvent) => controller.current?.pointerMove(e.nativeEvent),
    onPointerUp: () => controller.current?.pointerUp(),
    onPointerCancel: () => controller.current?.pointerUp(),
    onPointerEnter: () => controller.current?.pointerEnter(),
    onPointerLeave: () => controller.current?.pointerLeave(),
    onClick: () => controller.current?.click(),
  };

  return { buttonRef, bodyRef, face: face ?? eyes, handlers };
}
