"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconEye, IconPointer, IconPointerFilled, IconRotate360 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { FieldLegend, FieldSet } from "@/components/ui/field";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { EdgeFade } from "./edge-fade";
import {
  CHARACTERS,
  GARYS,
  GARY_FORM,
  MOODS,
  PRESETS,
  ZIIZ_CHARACTERS,
  ZIIZ_GARYS,
  type Character,
  type GaryCharacter,
} from "./mascot/characters";
import { Gary } from "./mascot/gary";
import { GLYPH_NAMES, GlyphIcon, type Glyph } from "./mascot/glyphs";
import { Mascot, type Eyes, type MascotHandle, type Mood } from "./mascot/mascot";
import { Squircle } from "./mascot/squircle";

type Variant = "squircle" | "dot" | "gary";

const VARIANTS: { value: Variant; name: string }[] = [
  { value: "squircle", name: "Squircle" },
  { value: "dot", name: "Dot" },
  { value: "gary", name: "Gary" },
];

/** Hand-picked casts, one per variant, and the ziiz cast shared by all. The squircle wears the dot's flat colours. */
const PALETTES: { name: string; squircle: Character[]; dot: Character[]; gary: GaryCharacter[] }[] = [
  { name: "Custom", squircle: CHARACTERS, dot: CHARACTERS, gary: GARYS },
  { name: "ziiz", squircle: ZIIZ_CHARACTERS, dot: ZIIZ_CHARACTERS, gary: ZIIZ_GARYS },
];

/** Everything that decides how a mascot looks. Each sidebar section varies one of these. */
type Look = { variant: Variant; palette: number; character: number; eyes: Eyes; mood: Mood };

const cast = ({ variant, palette, character }: Look) => {
  const list = PALETTES[palette][variant];
  return list[Math.min(character, list.length - 1)];
};

export function Playground() {
  const mascot = useRef<MascotHandle>(null);
  const [look, setLook] = useState<Look>({
    variant: "squircle",
    palette: 0,
    character: 0,
    eyes: CHARACTERS[0].eyes,
    mood: "idle",
  });
  const [follow, setFollow] = useState(true);

  // Which ends of the sidebar have more to scroll to, for the edge fades.
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });
  const measureEdges = () => {
    const el = scroller.current;
    if (!el) return;
    const top = el.scrollTop > 1;
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
    setEdges((prev) => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }));
  };
  useEffect(() => {
    const el = scroller.current!;
    const observer = new ResizeObserver(measureEdges);
    observer.observe(el);
    observer.observe(el.firstElementChild!.nextElementSibling!);
    return () => observer.disconnect();
  }, []);
  const set = (next: Partial<Look>) => setLook((prev) => ({ ...prev, ...next }));
  const setEye = (side: 0 | 1, glyph: Glyph) =>
    set({ eyes: side === 0 ? [glyph, look.eyes[1]] : [look.eyes[0], glyph] });

  const c = cast(look);
  const expression = PRESETS.find((p) => p.eyes[0] === look.eyes[0] && p.eyes[1] === look.eyes[1]);

  return (
    <TooltipProvider delay={300}>
      <div className="flex min-h-svh flex-col md:h-svh md:flex-row md:overflow-hidden">
        <main className="relative flex min-h-[60svh] flex-1 items-center justify-center overflow-hidden">
          {look.variant === "squircle" ? (
            <Squircle
              ref={mascot}
              label={`Animate ${c.name}`}
              color={c.color}
              ink={c.ink}
              eyes={look.eyes}
              mood={look.mood}
              follow={follow}
              className="size-56 md:size-72"
            />
          ) : look.variant === "dot" ? (
            <Mascot
              ref={mascot}
              label={`Animate ${c.name}`}
              color={c.color}
              ink={c.ink}
              eyes={look.eyes}
              mood={look.mood}
              follow={follow}
              className="size-56 md:size-72"
            />
          ) : (
            <Gary
              ref={mascot}
              label={`Animate ${c.name} Gary`}
              color={c.color}
              beak={(c as GaryCharacter).beak}
              ink={c.ink}
              eyes={look.eyes}
              form={GARY_FORM}
              mood={look.mood}
              follow={follow}
              className="size-72 md:size-96"
            />
          )}

          <div className="absolute inset-x-0 bottom-6 z-30 mx-auto flex w-fit items-center gap-1 rounded-full material-menu p-1">
            <Button variant="ghost" size="sm" shape="rounded" onClick={() => mascot.current?.spin()}>
              <IconRotate360 data-icon="inline-start" />
              Spin
            </Button>
            <Button variant="ghost" size="sm" shape="rounded" onClick={() => mascot.current?.blink()}>
              <IconEye data-icon="inline-start" />
              Blink
            </Button>
            <Toggle size="sm" pressed={follow} onPressedChange={setFollow} className="rounded-full">
              {follow ? <IconPointerFilled data-icon="inline-start" /> : <IconPointer data-icon="inline-start" />}
              Follow
            </Toggle>
          </div>
        </main>

        <aside className="w-full border-t border-gray-alpha-400 md:flex md:w-[360px] md:shrink-0 md:flex-col md:border-s md:border-t-0">
          <div
            ref={scroller}
            onScroll={measureEdges}
            className="md:min-h-0 md:flex-1 md:overflow-y-auto md:[scrollbar-width:none]"
          >
            <EdgeFade side="top" visible={edges.top} className="hidden md:block" />
            <div className="flex flex-col gap-8 p-5">
              <Section label="Variant">
                <Choice value={look.variant} onChange={(v) => set({ variant: v as Variant })} className="grid-cols-3">
                  {VARIANTS.map((v) => (
                    <Tile key={v.value} value={v.value} label={v.name} showLabel tall>
                      {(still) => <Thumb look={{ ...look, variant: v.value }} still={still} large />}
                    </Tile>
                  ))}
                </Choice>
              </Section>

              <Section label="Character">
                <div className="flex flex-col gap-4">
                  {PALETTES.map((p, pi) => (
                    <div key={p.name} className="flex flex-col gap-2">
                      <span className="text-label-12 text-gray-900">{p.name}</span>
                      <Choice
                        value={pi === look.palette ? String(look.character) : ""}
                        onChange={(i) => set({ palette: pi, character: Number(i) })}
                        className="grid-cols-4"
                        aria-label={`${p.name} characters`}
                      >
                        {p[look.variant].map((ch, i) => (
                          <Tile key={ch.name} value={String(i)} label={ch.name}>
                            {(still) => <Thumb look={{ ...look, palette: pi, character: i }} still={still} />}
                          </Tile>
                        ))}
                      </Choice>
                    </div>
                  ))}
                </div>
              </Section>

              <Section label="Mood">
                <Choice value={look.mood} onChange={(m) => set({ mood: m as Mood })} className="grid-cols-3">
                  {MOODS.map((m) => (
                    <Tile key={m.mood} value={m.mood} label={m.name} showLabel>
                      {(still) => <Thumb look={{ ...look, mood: m.mood }} still={still} />}
                    </Tile>
                  ))}
                </Choice>
              </Section>

              <Section label="Expression">
                <Choice
                  value={expression?.name ?? ""}
                  onChange={(name) => set({ eyes: PRESETS.find((p) => p.name === name)!.eyes })}
                  className="grid-cols-4"
                >
                  {PRESETS.map((p) => (
                    <Tile key={p.name} value={p.name} label={p.name}>
                      {/* Moods force their own face, so expressions always preview idle. */}
                      {(still) => <Thumb look={{ ...look, eyes: p.eyes, mood: "idle" }} still={still} />}
                    </Tile>
                  ))}
                </Choice>
                {look.mood !== "idle" && (
                  <p className="mt-2 text-copy-13 text-gray-900">
                    The {MOODS.find((m) => m.mood === look.mood)!.name.toLowerCase()} mood shows its own
                    face; expressions apply when the mood is Idle.
                  </p>
                )}
              </Section>

              <Section label="Custom eyes">
                <div className="flex flex-col gap-4">
                  {([0, 1] as const).map((side) => (
                    <div key={side} className="flex flex-col gap-2">
                      <span className="text-label-12 text-gray-900">{side === 0 ? "Left" : "Right"}</span>
                      <Choice
                        value={look.eyes[side]}
                        onChange={(g) => setEye(side, g as Glyph)}
                        variant="default"
                        className="grid-cols-9 gap-1"
                        aria-label={`${side === 0 ? "Left" : "Right"} eye`}
                      >
                        {GLYPH_NAMES.map((g) => (
                          <ToggleGroupItem
                            key={g}
                            value={g}
                            aria-label={`${side === 0 ? "Left" : "Right"} eye ${g}`}
                            className="min-w-0 px-0 text-gray-900 aria-pressed:text-gray-1000"
                          >
                            <GlyphIcon glyph={g} className="size-4" />
                          </ToggleGroupItem>
                        ))}
                      </Choice>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
            <EdgeFade side="bottom" visible={edges.bottom} className="hidden md:block" />
          </div>
        </aside>
      </div>
    </TooltipProvider>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <FieldSet className="gap-0">
      <FieldLegend variant="label" className="mb-3">
        {label}
      </FieldLegend>
      {children}
    </FieldSet>
  );
}

/** A toggle group laid out as a grid that always has one item pressed: pressing it again keeps it. */
function Choice({
  value,
  onChange,
  variant = "outline",
  className,
  children,
  ...props
}: {
  value: string;
  onChange: (value: string) => void;
  variant?: "default" | "outline";
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  return (
    <ToggleGroup
      value={value ? [value] : []}
      onValueChange={(next) => next[0] && onChange(next[0])}
      variant={variant}
      size="sm"
      className={cn("grid w-full gap-2", className)}
      {...props}
    >
      {children}
    </ToggleGroup>
  );
}

/**
 * One option as a tile with a mascot preview. The preview holds still until
 * the tile is hovered or focused. Unlabelled tiles name themselves in a tooltip.
 */
function Tile({
  value,
  label,
  showLabel,
  tall,
  children,
}: {
  value: string;
  label: string;
  showLabel?: boolean;
  tall?: boolean;
  children: (still: boolean) => ReactNode;
}) {
  const [playing, setPlaying] = useState(false);
  const item = (
    <ToggleGroupItem
      value={value}
      aria-label={label}
      onPointerEnter={() => setPlaying(true)}
      onPointerLeave={() => setPlaying(false)}
      onFocus={() => setPlaying(true)}
      onBlur={() => setPlaying(false)}
      className="h-auto min-w-0 flex-col gap-1.5 px-1 py-2 aria-pressed:border-gray-1000"
    >
      <span className={cn("flex items-center justify-center", tall ? "h-20" : "h-14")}>
        {children(!playing)}
      </span>
      {showLabel && <span className="max-w-full truncate text-label-12">{label}</span>}
    </ToggleGroupItem>
  );
  if (showLabel) return item;
  return (
    <Tooltip>
      <TooltipTrigger render={item} />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** A small, non-interactive mascot showing a look. */
function Thumb({ look, still, large }: { look: Look; still: boolean; large?: boolean }) {
  const c = cast(look);
  const shared = {
    label: c.name,
    interactive: false,
    color: c.color,
    ink: c.ink,
    eyes: look.eyes,
    mood: look.mood,
    follow: false,
    still,
  };
  if (look.variant === "squircle") return <Squircle {...shared} className={large ? "size-14" : "size-10"} />;
  return look.variant === "dot" ? (
    <Mascot {...shared} className={large ? "size-14" : "size-10"} />
  ) : (
    <Gary {...shared} beak={(c as GaryCharacter).beak} form={GARY_FORM} className={large ? "size-20" : "size-14"} />
  );
}
