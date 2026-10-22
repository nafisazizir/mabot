import { cn } from "@/lib/utils";

// After ziiz's site EdgeFade (apps/www/components/edge-fade.tsx), which is not
// in the registry: the scroll edge as frosted glass rather than a hard cut. A
// gradient dissolves the content into the background, and under it a stack of
// masked backdrop blurs ramps the blur up toward the edge, each layer blurring
// twice as much as the one below over roughly half the distance.
//
// This one lives inside a scroll container, sticky to its edge, and only shows
// while there is more to scroll that way.

// The strip takes this height and the negative margin gives it straight back,
// so the two have to stay in step.
const DEPTH = "h-12";
const PULL_BACK = { top: "-mb-12", bottom: "-mt-12" };

const LAYERS = [
  { blur: 0.5, reach: 100 },
  { blur: 1, reach: 62 },
  { blur: 2, reach: 38 },
  { blur: 4, reach: 20 },
];

export function EdgeFade({
  side,
  visible,
  className,
}: {
  side: "top" | "bottom";
  visible: boolean;
  className?: string;
}) {
  const away = side === "top" ? "bottom" : "top";

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none sticky z-10 shrink-0 transition-opacity duration-200",
        DEPTH,
        PULL_BACK[side],
        side === "top" ? "top-0" : "bottom-0",
        visible ? "opacity-100" : "opacity-0",
        className,
      )}
    >
      {LAYERS.map(({ blur, reach }) => {
        const mask = `linear-gradient(to ${away}, #000 0%, transparent ${reach}%)`;
        return (
          <div
            key={blur}
            className="absolute inset-0"
            style={{
              backdropFilter: `blur(${blur}px)`,
              WebkitBackdropFilter: `blur(${blur}px)`,
              maskImage: mask,
              WebkitMaskImage: mask,
            }}
          />
        );
      })}
      <div
        className={cn(
          "absolute inset-0 from-background-100 to-transparent",
          side === "top" ? "bg-linear-to-b" : "bg-linear-to-t",
        )}
      />
    </div>
  );
}
