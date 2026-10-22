// One shared rAF loop and one shared pointer for every mascot on the page.

type Tick = (dt: number, now: number) => void;

export type Spring = { x: number; v: number };

export const pointer = { x: 0, y: 0, lastMove: -Infinity, inside: false };

const ticks = new Set<Tick>();
let frame = 0;
let last = 0;
let listening = false;

function onMove(e: PointerEvent) {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.lastMove = performance.now();
  pointer.inside = true;
}

function onLeave() {
  pointer.inside = false;
}

function loop(now: number) {
  // Clamp so a backgrounded tab doesn't fling every spring on return.
  const dt = Math.min((now - last) / 1000, 1 / 30);
  last = now;
  for (const tick of ticks) tick(dt, now);
  frame = requestAnimationFrame(loop);
}

export function subscribe(tick: Tick) {
  if (!listening) {
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    listening = true;
  }
  ticks.add(tick);
  if (ticks.size === 1) {
    last = performance.now();
    frame = requestAnimationFrame(loop);
  }
  return () => {
    ticks.delete(tick);
    if (ticks.size === 0) cancelAnimationFrame(frame);
  };
}

/** Damped spring, semi-implicit Euler. `k` stiffness, `c` damping. */
export function step(s: Spring, target: number, k: number, c: number, dt: number) {
  s.v += (k * (target - s.x) - c * s.v) * dt;
  s.x += s.v * dt;
}

export const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));
