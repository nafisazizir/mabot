// Eye glyphs drawn on a 24×24 grid, centred on (12, 12). Stroked unless
// `fill` is set, so they read like a medium-weight sans at any size.

const GLYPHS = {
  o: { d: "M12 6.5a5.5 5.5 0 1 1 0 11a5.5 5.5 0 1 1 0-11Z" },
  O: { d: "M12 4.5a7.5 7.5 0 1 1 0 15a7.5 7.5 0 1 1 0-15Z" },
  "^": { d: "M4.5 17 12 7l7.5 10" },
  v: { d: "M4.5 7 12 17l7.5-10" },
  "-": { d: "M4 13.5h16" },
  "+": { d: "M12 4v16M4 12h16" },
  x: { d: "M6 6l12 12M18 6 6 18" },
  "*": { d: "M12 4.5v15M5.5 8.25l13 7.5M18.5 8.25l-13 7.5" },
  ">": { d: "M6 5.5 18 12 6 18.5" },
  "<": { d: "M18 5.5 6 12l12 6.5" },
  u: { d: "M5 8.5q7 13 14 0" },
  "=": { d: "M5 9h14M5 15h14" },
  "/": { d: "M8 19 16 5" },
  "\\": { d: "M8 5l8 14" },
  "@": { d: "M10 13a2 2 0 0 1 4 0a4 4 0 0 1-8 0a6 6 0 0 1 12 0" },
  "•": { d: "M12 8a4 4 0 1 1 0 8a4 4 0 1 1 0-8Z", fill: true },
  "♥": {
    d: "M12 19 4.9 12.1a4.1 4.1 0 0 1 7.1-4.6 4.1 4.1 0 0 1 7.1 4.6Z",
    fill: true,
  },
} satisfies Record<string, { d: string; fill?: boolean }>;

export type Glyph = keyof typeof GLYPHS;

export const GLYPH_NAMES = Object.keys(GLYPHS) as Glyph[];

/** The bare `<path>`, for drawing a glyph inside another SVG. */
export function GlyphPath({ glyph }: { glyph: Glyph }) {
  const { d, fill } = GLYPHS[glyph] as { d: string; fill?: boolean };
  return (
    <path
      d={d}
      fill={fill ? "currentColor" : "none"}
      stroke={fill ? "none" : "currentColor"}
      strokeWidth={2.75}
      strokeLinejoin="miter"
      strokeMiterlimit={8}
    />
  );
}

export function GlyphIcon({
  glyph,
  className,
}: {
  glyph: Glyph;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <GlyphPath glyph={glyph} />
    </svg>
  );
}
