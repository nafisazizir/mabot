import { clamp, pointer, step, subscribe, type Spring } from "./engine";
import type { Glyph } from "./glyphs";
import { REST_POSE, type Pose, type Skin } from "./skins";

export type Eyes = readonly [Glyph, Glyph];

/**
 * A head direction in radians: negative yaw turns to the viewer's left,
 * positive pitch looks up, negative roll tips the head anticlockwise.
 */
export type Gaze = { yaw: number; pitch: number; roll?: number };

/** What the agent behind the mascot is doing. */
export type Mood = "idle" | "thinking" | "working" | "waiting" | "done" | "paused" | "error";

export type MascotOptions = {
  follow: boolean;
  float: boolean;
  eyes: Eyes;
  mood: Mood;
  /** Rest facing this way instead of looking around; following the cursor still overrides it. */
  gaze?: Gaze;
  /** Settle at rest and stop: no looking, blinking, bobbing or mood beats. */
  still?: boolean;
};

type Elements = { button: HTMLElement; body: HTMLElement };

const TAU = Math.PI * 2;
const MAX_YAW = 0.85;
const MAX_PITCH = 0.6;
const MAX_VERGE = 0.2;
const DRAG_THRESHOLD = 6;
const BLINK_MS = 150;
const IDLE_AFTER_MS = 4000;
const REACTIONS: Eyes[] = [
  ["^", "^"],
  ["♥", "♥"],
  ["*", "*"],
  ["O", "O"],
  ["u", "u"],
  ["@", "@"],
];

/** Faces each mood forces; idle shows the mascot's own eyes. */
export function moodFace(mood: Mood, now: number): Eyes | null {
  switch (mood) {
    case "thinking":
      return now % 1600 < 800 ? ["/", "/"] : ["\\", "\\"];
    case "working":
      return ["+", "+"];
    case "waiting":
      return ["o", "o"];
    case "done":
      return ["^", "^"];
    case "paused":
      return ["-", "-"];
    case "error":
      return ["x", "x"];
    default:
      return null;
  }
}

/**
 * Where the eyes rest on the face for a head direction, from -1 to 1. They
 * lead the head, so they reach the edge of their travel before it turns all
 * the way.
 */
export const gazeEyes = (yaw: number, pitch: number): [number, number] => [
  clamp(yaw / MAX_YAW, -1, 1),
  clamp(-pitch / MAX_PITCH, -1, 1),
];

/** At rest facing `gaze`, eyes open: the first paint, still thumbnails and exports. */
export function posed(gaze?: Gaze): Pose {
  const yaw = gaze?.yaw ?? 0;
  const pitch = gaze?.pitch ?? 0;
  const [eyeX, eyeY] = gazeEyes(yaw, pitch);
  return { ...REST_POSE, yaw, pitch, tilt: headTilt(yaw, pitch) + (gaze?.roll ?? 0), eyeX, eyeY };
}

/** What the head and eyes are aiming for this frame. */
type Look = {
  yaw: number;
  pitch: number;
  /** Head roll on top of the tilt that comes with looking off-axis. */
  roll?: number;
  verge: number;
  /** Eye position on the face; defaults to `gazeEyes` of the head. */
  eyes?: [number, number];
  /** Eye size. */
  open?: number;
  /** How far idle saccades dart, as a fraction of the eyes' travel. */
  jitter?: number;
};

/** A slight head tilt when looking off-axis. */
export const headTilt = (yaw: number, pitch: number) => clamp(-yaw * pitch * 0.5, -0.3, 0.3);

const spring = (x = 0): Spring => ({ x, v: 0 });
const settled = (s: Spring, target: number) => Math.abs(s.x - target) < 1e-3 && Math.abs(s.v) < 1e-3;
const sameEyes = (a: Eyes | null, b: Eyes | null) =>
  a === b || (!!a && !!b && a[0] === b[0] && a[1] === b[1]);

/**
 * Owns one mascot's physics and writes transforms straight to the DOM every
 * frame through its skin. React only hears about it when the face changes.
 */
export class MascotController {
  private yaw = spring();
  private pitch = spring();
  private roll = spring();
  private verge = spring();
  private spin = spring();
  private spinTarget = 0;
  private eyeRot = spring();
  private grow = spring(1);
  private squash = spring(1);
  private ox = spring();
  private oy = spring();
  private eyeX = spring();
  private eyeY = spring();
  private eyeOpen = spring(1);

  // The eyes move first and the head follows: a sudden change of target holds
  // the head on its old aim for a beat.
  private aim = { yaw: 0, pitch: 0, roll: 0 };
  private lastLook = { yaw: 0, pitch: 0, roll: 0 };
  private headHoldUntil = 0;
  private saccade: [number, number] = [0, 0];
  private nextSaccade = 0;

  private hover = false;
  private pressed = false;
  private dragging = false;
  private suppressClick = false;
  private down = { x: 0, y: 0 };
  private grab = { x: 0, y: 0 };
  private dragTarget = { x: 0, y: 0 };

  private blinkStart = -1;
  private onBlinkClosed: (() => void) | null = null;
  private nextBlink = performance.now() + 800 + Math.random() * 3000;
  private idleYaw = 0;
  private idlePitch = 0;
  private idleRoll = 0;
  private nextIdle = 0;

  private mood: Mood;
  private moodStart = 0;
  private reaction: Eyes | null = null;
  private pendingReaction: Eyes | null = null;
  private revertAt = 0;
  private shownFace: Eyes | null = null;
  private phase = Math.random() * TAU;

  private rect: DOMRect;
  private onScreen = true;
  /** Still and settled, so frames can be skipped until something changes. */
  private resting = false;
  private reduced: MediaQueryList;
  private cleanup: (() => void)[] = [];

  constructor(
    private el: Elements,
    private skin: Skin,
    private options: MascotOptions,
    private setFace: (eyes: Eyes | null) => void,
  ) {
    this.mood = options.mood;
    // Start already facing the pose rather than swinging into it.
    this.yaw.x = options.gaze?.yaw ?? 0;
    this.pitch.x = options.gaze?.pitch ?? 0;
    this.roll.x = options.gaze?.roll ?? 0;
    this.aim = this.lastLook = { yaw: this.yaw.x, pitch: this.pitch.x, roll: this.roll.x };
    [this.eyeX.x, this.eyeY.x] = gazeEyes(this.yaw.x, this.pitch.x);
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    // The button itself never moves (all motion is on inner layers), so its
    // rect only changes on scroll/resize.
    this.rect = el.button.getBoundingClientRect();
    const measure = () => (this.rect = el.button.getBoundingClientRect());
    const resize = new ResizeObserver(measure);
    resize.observe(el.button);
    window.addEventListener("scroll", measure, { passive: true, capture: true });
    window.addEventListener("resize", measure);

    const visibility = new IntersectionObserver(([entry]) => {
      this.onScreen = entry.isIntersecting;
    });
    visibility.observe(el.button);

    const unsubscribe = subscribe((dt, now) => this.tick(dt, now));

    this.cleanup.push(
      unsubscribe,
      () => resize.disconnect(),
      () => visibility.disconnect(),
      () => window.removeEventListener("scroll", measure, { capture: true }),
      () => window.removeEventListener("resize", measure),
    );
  }

  destroy() {
    this.cleanup.forEach((fn) => fn());
  }

  update(options: MascotOptions) {
    const moodChanged = options.mood !== this.options.mood;
    this.options = options;
    this.resting = false;
    // Moods swap in behind a blink, like every other face change.
    if (moodChanged) this.blink(() => this.enterMood(options.mood));
  }

  // ── Public actions ──────────────────────────────────────────────────────

  blink(onClosed?: () => void) {
    this.resting = false;
    this.blinkStart = performance.now();
    this.onBlinkClosed = onClosed ?? null;
  }

  react(eyes: Eyes, ms = 1600) {
    this.blink(() => (this.reaction = eyes));
    this.revertAt = Number.isFinite(ms) ? performance.now() + ms : 0;
  }

  /** Full 360° turn; swaps to a reaction face while it's turned away. */
  poke() {
    this.squash.v += 4;
    const current = this.shownFace ?? this.options.eyes;
    const pool = REACTIONS.filter((r) => !sameEyes(r, current));
    const reaction = pool[Math.floor(Math.random() * pool.length)];
    if (this.reduced.matches) {
      this.react(reaction);
      return;
    }
    this.spinTarget += TAU;
    this.pendingReaction = reaction;
  }

  // ── Pointer input ───────────────────────────────────────────────────────

  pointerEnter() {
    this.hover = true;
  }

  pointerLeave() {
    this.hover = false;
  }

  pointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    this.el.button.setPointerCapture(e.pointerId);
    this.pressed = true;
    this.dragging = false;
    this.down = { x: e.clientX, y: e.clientY };
    // Grabbing mid-return shouldn't make it jump.
    this.grab = { x: e.clientX - this.ox.x, y: e.clientY - this.oy.x };
  }

  pointerMove(e: PointerEvent) {
    if (!this.pressed) return;
    if (
      !this.dragging &&
      Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > DRAG_THRESHOLD
    ) {
      this.dragging = true;
      this.el.button.style.zIndex = "20";
      const squint: Eyes = [">", "<"];
      this.react(sameEyes(this.options.eyes, squint) ? ["O", "O"] : squint, Infinity);
    }
    if (this.dragging) {
      this.dragTarget = { x: e.clientX - this.grab.x, y: e.clientY - this.grab.y };
    }
  }

  pointerUp() {
    if (!this.pressed) return;
    this.pressed = false;
    if (!this.dragging) return;
    this.dragging = false;
    this.suppressClick = true;
    this.revertAt = performance.now() + 500;
    const button = this.el.button;
    setTimeout(() => (button.style.zIndex = ""), 900);
  }

  /** Clicks that end a drag shouldn't also spin. Keyboard activation always does. */
  click() {
    if (this.suppressClick) {
      this.suppressClick = false;
      return;
    }
    this.poke();
  }

  // ── Frame ───────────────────────────────────────────────────────────────

  private enterMood(mood: Mood) {
    this.mood = mood;
    this.moodStart = performance.now();
    if ((mood === "done" || mood === "waiting") && !this.options.still) this.hop();
  }

  private hop() {
    if (this.reduced.matches) return;
    this.oy.v -= this.skin.radius(this.rect.width) * 9;
    this.squash.v += 3;
  }

  private lookTarget(now: number, cx: number, cy: number, R: number): Look {
    if (this.dragging) {
      // Look where it's being dragged.
      return {
        yaw: clamp(this.ox.v * 0.0016, -MAX_YAW, MAX_YAW),
        pitch: clamp(-this.oy.v * 0.0016, -MAX_PITCH, MAX_PITCH),
        verge: 0,
        open: 1.08,
        jitter: 0,
      };
    }

    const gaze = this.options.gaze;
    if (this.options.still)
      return { yaw: gaze?.yaw ?? 0, pitch: gaze?.pitch ?? 0, roll: gaze?.roll ?? 0, verge: 0, jitter: 0 };

    // Busy moods look at their own work rather than the cursor.
    switch (this.mood) {
      case "thinking": {
        // Eyes up in the corner, searching a little, while the head swaps sides.
        const left = now % 1600 < 800;
        return {
          yaw: left ? -0.4 : 0.4,
          pitch: 0.3,
          // A puzzled tilt toward the side it's searching.
          roll: left ? -0.14 : 0.14,
          verge: 0,
          eyes: [left ? -0.85 : 0.85, -0.9],
          jitter: 0.12,
        };
      }
      case "working": {
        // Reading: four fixations along a line, then a sweep back to the start.
        // The head drifts after the eyes.
        const t = (now % 1500) / 1500;
        const x = -0.7 + 1.4 * (t < 0.8 ? Math.floor((t / 0.8) * 4) / 3 : 0);
        return { yaw: x * 0.3, pitch: -0.2, verge: 0.06, eyes: [x, 0.6], jitter: 0 };
      }
      case "paused":
        return { yaw: 0, pitch: -0.25, verge: 0, eyes: [0, 0.75], open: 0.94, jitter: 0 };
    }

    const idle = !pointer.inside || now - pointer.lastMove > IDLE_AFTER_MS;
    // Hovered, it turns from its pose to face you and follows the cursor;
    // left, it settles back into the pose.
    if ((this.options.follow || this.hover) && !idle) {
      const dx = pointer.x - cx;
      const dy = pointer.y - cy;
      const depth = R * 2 + 160;
      // Cross the eyes a little as the cursor gets close.
      const near = 1 - clamp((Math.hypot(dx, dy) - R * 0.5) / (R * 1.6), 0, 1);
      const yaw = Math.atan2(dx, depth);
      const pitch = Math.atan2(-dy, depth);
      return {
        yaw: clamp(yaw, -MAX_YAW, MAX_YAW),
        pitch: clamp(pitch, -MAX_PITCH, MAX_PITCH),
        verge: MAX_VERGE * near * near,
        // The eyes are faster than the head and reach a bit further.
        eyes: [clamp((yaw * 1.25) / MAX_YAW, -1, 1), clamp((-pitch * 1.25) / MAX_PITCH, -1, 1)],
        // Wide-eyed as the cursor closes in.
        open: 1 + 0.14 * near * near,
        // Smooth pursuit while the cursor moves; little darts once it stops.
        jitter: now - pointer.lastMove < 500 ? 0 : 0.08,
      };
    }

    if (gaze) return { yaw: gaze.yaw, pitch: gaze.pitch, roll: gaze.roll ?? 0, verge: 0 };

    if (now > this.nextIdle) {
      const center = Math.random() < 0.3;
      this.idleYaw = center ? 0 : (Math.random() * 2 - 1) * 0.75;
      this.idlePitch = center ? 0 : (Math.random() * 2 - 1) * 0.45;
      // Now and then a curious tilt.
      this.idleRoll = !center && Math.random() < 0.4 ? (Math.random() * 2 - 1) * 0.22 : 0;
      this.nextIdle = now + 900 + Math.random() * 2400;
    }
    return { yaw: this.idleYaw, pitch: this.idlePitch, roll: this.idleRoll, verge: 0 };
  }

  private tick(dt: number, now: number) {
    if (!this.onScreen || this.resting) return;
    const still = !!this.options.still;
    const R = this.skin.radius(this.rect.width);
    const cx = this.rect.left + this.rect.width / 2 + this.ox.x;
    const cy = this.rect.top + this.rect.height / 2 + this.oy.x;
    const mood = this.mood;
    const calm = this.reduced.matches || still;

    const look = this.lookTarget(now, cx, cy, R);
    // A jump in where to look moves the eyes at once and the head a beat later.
    const jump = Math.abs(look.yaw - this.lastLook.yaw) + Math.abs(look.pitch - this.lastLook.pitch);
    if (jump > 0.2 && !this.dragging && !calm) this.headHoldUntil = now + 140;
    this.lastLook = { yaw: look.yaw, pitch: look.pitch, roll: look.roll ?? 0 };
    if (now >= this.headHoldUntil) this.aim = this.lastLook;
    step(this.yaw, this.aim.yaw, 140, 17, dt);
    step(this.pitch, this.aim.pitch, 140, 17, dt);
    step(this.roll, this.aim.roll, 110, 15, dt);
    step(this.verge, look.verge, 120, 18, dt);
    step(this.spin, this.spinTarget, 36, 7.5, dt);
    if (
      this.spinTarget >= TAU &&
      Math.abs(this.spin.x - this.spinTarget) < 0.02 &&
      Math.abs(this.spin.v) < 0.1
    ) {
      this.spin.x -= this.spinTarget;
      this.spinTarget = 0;
    }
    // Working: plus eyes snap between ±15° and hold, never reaching an x.
    const rock = mood === "working" && !calm ? (now % 1200 < 600 ? 0.26 : -0.26) : 0;
    step(this.eyeRot, rock, 900, 40, dt);

    // Swap faces while both eyes are round the back.
    const turned = (((this.spin.x % TAU) + TAU) % TAU) - Math.PI;
    if (this.pendingReaction && Math.abs(turned) < 0.9) {
      this.reaction = this.pendingReaction;
      this.pendingReaction = null;
      this.revertAt = now + 1800;
    }
    if (this.revertAt && now > this.revertAt && !this.dragging && !this.pendingReaction) {
      this.revertAt = 0;
      this.blink(() => (this.reaction = null));
    }
    // Still mascots hold the first frame of a mood that alternates.
    const face = this.reaction ?? moodFace(mood, still ? 0 : now);
    if (!sameEyes(face, this.shownFace)) {
      this.shownFace = face;
      this.setFace(face);
    }

    // Moods with a beat: waiting hops for attention, error shakes its head.
    if (mood === "waiting" && !still && now - this.moodStart > 2600) {
      this.moodStart = now;
      this.hop();
    }
    let shake = 0;
    if (mood === "error" && !calm) {
      const t = (now - this.moodStart) / 1000;
      if (t > 3.2) this.moodStart = now;
      shake = Math.sin(t * 28) * 0.4 * Math.exp(-t * 3.5);
    }

    // Eyes: aimed with the look, darting in saccades, acting out the mood and
    // trailing the body when it moves.
    let [ex, ey] = look.eyes ?? gazeEyes(look.yaw, look.pitch);
    let open = look.open ?? 1;
    const jitter = calm ? 0 : (look.jitter ?? 0.16);
    if (jitter && now > this.nextSaccade) {
      const home = Math.random() < 0.35;
      this.saccade = home ? [0, 0] : [Math.random() * 2 - 1, (Math.random() * 2 - 1) * 0.7];
      this.nextSaccade = now + 300 + Math.random() * 1400;
    }
    ex += this.saccade[0] * jitter;
    ey += this.saccade[1] * jitter;
    if (mood === "waiting") {
      // Looking up at you, big-eyed.
      ey -= 0.2;
      open *= 1.12 + (calm ? 0 : Math.sin(now / 260) * 0.03);
    } else if (mood === "done") {
      ey -= 0.3;
    } else if (mood === "error" && !calm) {
      // Startled small, eyes darting ahead of the head shake.
      ex += shake * 1.6;
      open *= 1 - 0.14 * Math.exp(-((now - this.moodStart) / 1000) * 2.5);
    }
    if (!calm) {
      const lag = 1 / (R * 20 || 1);
      ex -= clamp(this.ox.v * lag, -0.5, 0.5) + clamp(this.spin.v * 0.05, -0.5, 0.5);
      ey -= clamp(this.oy.v * lag, -0.5, 0.5);
    }
    open *= this.pressed && !this.dragging ? 0.9 : this.hover ? 1.05 : 1;
    ex = clamp(ex, -1.2, 1.2);
    ey = clamp(ey, -1.2, 1.2);
    // Stiff enough to read as a saccade; substepped so it's stable at low frame rates.
    for (let i = 0; i < 3; i++) {
      step(this.eyeX, ex, 1100, 62, dt / 3);
      step(this.eyeY, ey, 1100, 62, dt / 3);
    }
    step(this.eyeOpen, open, 320, 16, dt);

    // Blinks: mostly single, sometimes a quick double. Paused eyes are already shut.
    if (mood !== "paused" && !still && this.blinkStart < 0 && now > this.nextBlink) {
      this.blink();
      this.nextBlink = now + (Math.random() < 0.18 ? 260 : 2200 + Math.random() * 4200);
    }
    let lid = 1;
    if (this.blinkStart >= 0) {
      const t = (now - this.blinkStart) / BLINK_MS;
      if (t >= 0.5 && this.onBlinkClosed) {
        this.onBlinkClosed();
        this.onBlinkClosed = null;
      }
      if (t >= 1) this.blinkStart = -1;
      else lid = Math.max(0.08, 1 - Math.sin(Math.PI * t));
    }

    // Body: drag offset, hover/press scale, squash & stretch, lean.
    const dragging = this.dragging;
    const k = dragging ? 1100 : 150;
    const c = dragging ? 60 : 10;
    step(this.ox, dragging ? this.dragTarget.x : 0, k, c, dt);
    step(this.oy, dragging ? this.dragTarget.y : 0, k, c, dt);
    step(this.grow, dragging ? 1.12 : this.hover ? 1.06 : 1, 260, 18, dt);
    step(this.squash, this.pressed && !dragging ? 0.88 : 1, 420, 15, dt);

    // Paused breathes slower.
    const bob =
      this.options.float && !calm
        ? Math.sin(now / (mood === "paused" ? 1600 : 900) + this.phase) * R * 0.06
        : 0;
    const lean = clamp(this.ox.v * 0.0004, -0.3, 0.3);
    const sx = this.grow.x * (1 + (1 - this.squash.x) * 0.6);
    const sy = this.grow.x * this.squash.x;
    this.el.body.style.transform = `translate3d(${this.ox.x}px, ${this.oy.x + bob}px, 0) rotate(${lean}rad) scale(${sx}, ${sy})`;

    this.skin.render(
      {
        yaw: this.yaw.x + shake,
        pitch: this.pitch.x,
        verge: this.verge.x,
        spin: this.spin.x,
        lid,
        tilt: headTilt(this.yaw.x, this.pitch.x) + this.roll.x,
        eyeRot: this.eyeRot.x,
        eyeX: this.eyeX.x,
        // Eyes dip a little as they close.
        eyeY: this.eyeY.x + (1 - lid) * 0.12,
        eyeScale: this.eyeOpen.x,
      },
      R,
    );

    this.resting =
      still &&
      this.blinkStart < 0 &&
      !this.pendingReaction &&
      settled(this.yaw, look.yaw) &&
      settled(this.pitch, look.pitch) &&
      settled(this.roll, look.roll ?? 0) &&
      settled(this.verge, look.verge) &&
      settled(this.spin, this.spinTarget) &&
      settled(this.eyeRot, 0) &&
      settled(this.eyeX, ex) &&
      settled(this.eyeY, ey) &&
      settled(this.eyeOpen, open) &&
      settled(this.ox, 0) &&
      settled(this.oy, 0) &&
      settled(this.grow, 1) &&
      settled(this.squash, 1);
  }
}
