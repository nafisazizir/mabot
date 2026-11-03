"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { IconArrowLeft, IconCheck, IconCopy, IconPointer, IconPointerFilled, IconRestore } from "@tabler/icons-react";
import { buttonVariants, Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { MOODS, PRESETS, PROFILE, ZIIZ_CHARACTERS } from "./mascot/characters";
import type { Eyes, Gaze, Mood } from "./mascot/controller";
import { Squircle } from "./mascot/squircle";
import type { Shape } from "./mascot/squircles";
import { DEFAULT_TUNING, LEGACY_TUNING, type Tuning } from "./mascot/tuning";

/** One take on the face, shown side by side with the others. */
type Iteration = { id: string; name: string; note: string; tuning: Tuning; eyes?: Eyes };

const SPARKLE: Eyes = ["*", "*"];
const PILL: Eyes = ["I", "I"];

const ITERATIONS: Iteration[] = [
  { id: "before", name: "Before", note: "Wide-set, centred, thin, always upright", tuning: LEGACY_TUNING },
  { id: "tuned", name: "Tuned", note: "Closer, a little low, heavier, rides the face", tuning: DEFAULT_TUNING },
  {
    id: "low",
    name: "Low & close",
    note: "More forehead and a tighter pair: younger",
    tuning: { ...DEFAULT_TUNING, gap: 0.64, size: 0.58, drop: 0.2, stroke: 3.9 },
  },
  {
    id: "bold",
    name: "Bold",
    note: "Heavier still, so small avatars hold up",
    tuning: { ...DEFAULT_TUNING, gap: 0.76, size: 0.66, drop: 0.12, stroke: 4.6 },
  },
  {
    id: "pill",
    name: "Grok pill",
    note: "Fat round pills, 0.23 tall, centres 0.25 apart",
    tuning: { ...DEFAULT_TUNING, gap: 0.5 },
    eyes: PILL,
  },
  {
    id: "soft",
    name: "Soft body",
    note: "Rounder corners and a deeper body, nearer Tradbot",
    tuning: { ...DEFAULT_TUNING, exponent: 4.2, thickness: 0.3 },
  },
];

const POSES: { id: string; name: string; gaze?: Gaze }[] = [
  { id: "profile", name: "Profile" },
  { id: "front", name: "Front", gaze: { yaw: 0, pitch: 0 } },
  { id: "side", name: "3/4", gaze: { yaw: 0.5, pitch: 0 } },
  { id: "wander", name: "Wander" },
];

const EXPRESSIONS = ["Own", "Sparkle", "Pill", "Happy", "Curious", "Content", "Squeeze", "Shocked"];

/** Mono black/white follows the theme; the rest are the ziiz ramps. */
const AUTO = { name: "Auto", color: "var(--mascot-auto)", ink: "var(--mascot-auto-ink)" };
const COLOURS = [AUTO, ...ZIIZ_CHARACTERS.filter((c) => c.name !== "Black" && c.name !== "White")];

const AVATARS = [96, 56, 40, 28, 20];

const BODY_DEFAULTS: Record<Shape, { exponent: number; thickness: number }> = {
  mini: { exponent: 6, thickness: 0.23 },
  squircle: { exponent: 5, thickness: 0.52 },
};

export function Lab() {
  const [shape, setShape] = useState<Shape>("mini");
  const [tunings, setTunings] = useState<Record<string, Tuning>>(() =>
    Object.fromEntries(ITERATIONS.map((it) => [it.id, it.tuning])),
  );
  const [selected, setSelected] = useState("tuned");
  const [profile, setProfile] = useState<Gaze>(PROFILE);
  const [poseId, setPoseId] = useState("profile");
  const [expression, setExpression] = useState("Own");
  const [mood, setMood] = useState<Mood>("idle");
  const [colour, setColour] = useState(0);
  const [follow, setFollow] = useState(false);
  const [copied, setCopied] = useState(false);

  const pose = POSES.find((p) => p.id === poseId)!;
  const gaze = pose.id === "profile" ? profile : pose.gaze;
  const c = COLOURS[colour];
  const shared = PRESETS.find((p) => p.name === expression)?.eyes;
  const eyesOf = (it: Iteration) => shared ?? it.eyes ?? SPARKLE;
  const current = ITERATIONS.find((it) => it.id === selected)!;
  const tuning = tunings[selected];

  const set = (patch: Partial<Tuning>) => setTunings((prev) => ({ ...prev, [selected]: { ...prev[selected], ...patch } }));

  const copy = async () => {
    const out = { tuning: tuning, profile };
    try {
      await navigator.clipboard.writeText(JSON.stringify(out, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard can be blocked; nothing to do but leave the button as it was.
    }
  };

  return (
    <div className="flex min-h-svh flex-col md:h-svh md:flex-row md:overflow-hidden">
      <main className="flex min-w-0 flex-1 flex-col md:overflow-y-auto">
        <header className="sticky top-0 z-40 flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-gray-alpha-400 bg-background-100/85 px-5 py-3 backdrop-blur">
          <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm", shape: "rounded" })}>
            <IconArrowLeft data-icon="inline-start" />
            Playground
          </Link>
          <h1 className="text-heading-16">Lab</h1>
          <Segmented value={shape} onChange={(v) => setShape(v as Shape)} options={[["mini", "Mini"], ["squircle", "Squircle"]]} />
          <Segmented value={poseId} onChange={setPoseId} options={POSES.map((p) => [p.id, p.name])} />
          <Toggle size="sm" pressed={follow} onPressedChange={setFollow} className="rounded-full">
            {follow ? <IconPointerFilled data-icon="inline-start" /> : <IconPointer data-icon="inline-start" />}
            Follow
          </Toggle>
        </header>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 pt-4">
          <Labelled label="Eyes">
            <Segmented value={expression} onChange={setExpression} options={EXPRESSIONS.map((e) => [e, e])} />
          </Labelled>
          <Labelled label="Mood">
            <Segmented value={mood} onChange={(m) => setMood(m as Mood)} options={MOODS.map((m) => [m.mood, m.name])} />
          </Labelled>
          <Labelled label="Colour">
            <div className="flex gap-1.5">
              {COLOURS.map((col, i) => (
                <button
                  key={col.name}
                  type="button"
                  aria-label={col.name}
                  aria-pressed={colour === i}
                  onClick={() => setColour(i)}
                  className="size-6 rounded-full border border-gray-alpha-400 outline-offset-2 aria-pressed:outline-2 aria-pressed:outline-gray-1000"
                  style={{ background: col.color }}
                />
              ))}
            </div>
          </Labelled>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
          {ITERATIONS.map((it) => (
            <section
              key={it.id}
              onPointerDown={() => setSelected(it.id)}
              onFocus={() => setSelected(it.id)}
              className={cn(
                "flex flex-col overflow-hidden rounded-xl border bg-background-100 transition-colors",
                selected === it.id ? "border-gray-1000" : "border-gray-alpha-400 hover:border-gray-alpha-500",
              )}
            >
              <div className="flex items-baseline justify-between gap-3 px-4 pt-3">
                <h2 className="shrink-0 text-label-14">{it.name}</h2>
                <p className="truncate text-copy-13 text-gray-900">{it.note}</p>
              </div>
              <div className="relative flex h-64 items-center justify-center">
                <Squircle
                  shape={shape}
                  tuning={tunings[it.id]}
                  label={`Animate ${it.name}`}
                  color={c.color}
                  ink={c.ink}
                  eyes={eyesOf(it)}
                  mood={mood}
                  follow={follow}
                  gaze={gaze}
                  className="size-44"
                />
              </div>
              {/* The profile picture at list, chat and favicon-ish sizes. */}
              <div className="flex items-end justify-center gap-4 border-t border-gray-alpha-400 bg-gray-100 px-4 py-3">
                {AVATARS.map((px) => (
                  <Squircle
                    key={px}
                    shape={shape}
                    tuning={tunings[it.id]}
                    label={it.name}
                    interactive={false}
                    color={c.color}
                    ink={c.ink}
                    eyes={eyesOf(it)}
                    mood={mood}
                    follow={false}
                    gaze={profile}
                    still
                    style={{ width: px, height: px }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      <aside className="w-full border-t border-gray-alpha-400 md:w-[340px] md:shrink-0 md:overflow-y-auto md:border-s md:border-t-0">
        <div className="flex flex-col gap-6 p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-label-12 text-gray-900">Tuning</p>
              <h2 className="text-heading-16">{current.name}</h2>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                shape="rounded"
                onClick={() => setTunings((prev) => ({ ...prev, [selected]: current.tuning }))}
              >
                <IconRestore data-icon="inline-start" />
                Reset
              </Button>
              <Button variant="outline" size="sm" shape="rounded" onClick={copy}>
                {copied ? <IconCheck data-icon="inline-start" /> : <IconCopy data-icon="inline-start" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          <Group label="Placement">
            <Slider label="Gap" hint="between centres, × half width" value={tuning.gap} min={0.3} max={1.1} onChange={(gap) => set({ gap })} />
            <Slider label="Size" hint="glyph box, × half width" value={tuning.size} min={0.3} max={1} onChange={(size) => set({ size })} />
            <Slider label="Drop" hint="below centre, × half width" value={tuning.drop} min={-0.3} max={0.4} onChange={(drop) => set({ drop })} />
          </Group>

          <Group label="Weight">
            <Slider label="Glyph stroke" hint="24-unit grid" value={tuning.stroke} min={1.5} max={6} step={0.05} onChange={(stroke) => set({ stroke })} />
            <Slider label="Pill stroke" hint="24-unit grid" value={tuning.pill} min={3} max={11} step={0.1} onChange={(pill) => set({ pill })} />
            <Toggle size="sm" pressed={tuning.round} onPressedChange={(round) => set({ round })} className="w-fit rounded-full">
              Round caps & joins
            </Toggle>
          </Group>

          <Group label="Looking">
            <Slider label="Travel across" value={tuning.travel[0]} min={0} max={0.8} onChange={(x) => set({ travel: [x, tuning.travel[1]] })} />
            <Slider label="Travel up/down" value={tuning.travel[1]} min={0} max={0.8} onChange={(y) => set({ travel: [tuning.travel[0], y] })} />
            <Slider label="Ride the face" hint="0 upright, 1 rolls with it" value={tuning.ride} min={0} max={1} onChange={(ride) => set({ ride })} />
            <Slider label="Lean" hint="extra tip toward the look, rad" value={tuning.lean} min={-0.4} max={0.4} onChange={(lean) => set({ lean })} />
            <Slider label="Depth" hint="near eye bigger" value={tuning.depth} min={0} max={2} onChange={(depth) => set({ depth })} />
            <Slider label="Body turn (yaw)" value={tuning.turn[0]} min={0} max={1} onChange={(y) => set({ turn: [y, tuning.turn[1]] })} />
            <Slider label="Body turn (pitch)" value={tuning.turn[1]} min={0} max={1} onChange={(p) => set({ turn: [tuning.turn[0], p] })} />
          </Group>

          <Group label="Body">
            <Slider
              label="Corner exponent"
              hint="higher is squarer"
              value={tuning.exponent ?? BODY_DEFAULTS[shape].exponent}
              min={2.5}
              max={9}
              step={0.1}
              onChange={(exponent) => set({ exponent })}
            />
            <Slider
              label="Thickness"
              hint="half depth"
              value={tuning.thickness ?? BODY_DEFAULTS[shape].thickness}
              min={0.08}
              max={0.6}
              onChange={(thickness) => set({ thickness })}
            />
          </Group>

          <Group label="Profile pose" note="Shared by every iteration">
            <Slider label="Yaw" hint="+ turns right" value={profile.yaw} min={-1} max={1} onChange={(yaw) => setProfile((p) => ({ ...p, yaw }))} />
            <Slider label="Pitch" hint="+ looks up" value={profile.pitch} min={-0.6} max={0.6} onChange={(pitch) => setProfile((p) => ({ ...p, pitch }))} />
            <Slider label="Roll" hint="− tips anticlockwise" value={profile.roll ?? 0} min={-0.6} max={0.6} onChange={(roll) => setProfile((p) => ({ ...p, roll }))} />
          </Group>

          <p className="text-copy-13 text-gray-900">
            Hover a mascot and it turns to face you; click to spin. Press <kbd className="font-mono">t</kbd> to
            flip the theme and see the other mono.
          </p>
        </div>
      </aside>
    </div>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <ToggleGroup
      value={[value]}
      onValueChange={(next) => next[0] && onChange(next[0])}
      variant="outline"
      size="sm"
      className="flex-wrap"
    >
      {options.map(([v, label]) => (
        <ToggleGroupItem key={v} value={v} className="aria-pressed:border-gray-1000">
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-label-12 text-gray-900">{label}</span>
      {children}
    </div>
  );
}

function Group({ label, note, children }: { label: string; note?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-label-13 text-gray-1000">{label}</h3>
        {note && <span className="text-label-12 text-gray-900">{note}</span>}
      </div>
      {children}
    </section>
  );
}

function Slider({
  label,
  hint,
  value,
  min,
  max,
  step = 0.01,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const id = useMemo(() => `s-${label.replace(/\W+/g, "-").toLowerCase()}`, [label]);
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
      <label htmlFor={id} className="text-label-13 text-gray-1000">
        {label}
        {hint && <span className="ms-1.5 text-label-12 text-gray-900">{hint}</span>}
      </label>
      <span className="text-label-12-mono text-gray-1000 tabular-nums">{value.toFixed(2)}</span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="col-span-2 w-full accent-gray-1000"
      />
    </div>
  );
}
