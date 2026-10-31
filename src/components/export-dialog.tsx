"use client";

import { useState, type ReactElement } from "react";
import { IconCheck, IconChevronDown, IconCircleDashed, IconCopy, IconDownload } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { download, mascotSvg, svgToPng, type Framing, type Still } from "./mascot/export";

type Format = "svg" | "png";

type Option = { value: string; label: string };

const FORMATS: Option[] = [
  { value: "svg", label: "SVG" },
  { value: "png", label: "PNG" },
];

/** The page's own background, so it follows light and dark. */
const THEME = "var(--ds-background-100)";

const BACKGROUNDS: Option[] = [
  { value: "none", label: "None" },
  { value: THEME, label: "Theme" },
  { value: "#ffffff", label: "White" },
  { value: "#000000", label: "Black" },
];

const PADDINGS: Option[] = [
  { value: "0", label: "None" },
  { value: "0.1", label: "S" },
  { value: "0.25", label: "M" },
  { value: "0.5", label: "L" },
];

/** PNGs are square at this many px a side; SVGs scale. */
const PNG_SIZE = 1024;

/** Transparent areas show as a checkerboard. */
const CHECKER = "repeating-conic-gradient(var(--ds-gray-200) 0 25%, transparent 0 50%) 0 0 / 16px 16px";

/** A toolbar button that opens export options for the mascot as it looks now. */
export function ExportDialog({ still, name, trigger }: { still: Still; name: string; trigger: ReactElement }) {
  const [format, setFormat] = useState<Format>("svg");
  const [background, setBackground] = useState(THEME);
  const [padding, setPadding] = useState("0.1");
  const [fileName, setFileName] = useState(name);
  const [copied, setCopied] = useState(false);

  const framing: Framing = {
    padding: Number(padding),
    background: background === "none" ? undefined : background,
  };
  const file = `${fileName.trim() || name}.${format}`;

  const blob = async () => {
    if (format === "svg") return new Blob([mascotSvg(still, framing)], { type: "image/svg+xml" });
    return svgToPng(mascotSvg(still, { ...framing, size: PNG_SIZE }), PNG_SIZE);
  };

  const copy = async () => {
    if (format === "svg") {
      await navigator.clipboard.writeText(mascotSvg(still, framing));
    } else {
      // Handing over the promise keeps Safari's user-gesture check happy.
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob() })]);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    // Each opening starts from the current look's name.
    <Dialog onOpenChange={(open) => open && setFileName(name)}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export</DialogTitle>
          <DialogDescription>A still of the mascot as it looks now, facing its pose.</DialogDescription>
        </DialogHeader>

        <Preview still={still} framing={framing} />

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <Choice label="Format" value={format} onChange={(v) => setFormat(v as Format)} items={FORMATS} />
            <Choice label="Background" value={background} onChange={setBackground} items={BACKGROUNDS} />
            <Choice label="Padding" value={padding} onChange={setPadding} items={PADDINGS} />
          </div>
          <Field>
            <FieldLabel htmlFor="export-name">File name</FieldLabel>
            <InputGroup size="sm">
              <InputGroupInput id="export-name" value={fileName} onChange={(e) => setFileName(e.target.value)} />
              <InputGroupAddon align="inline-end">
                <InputGroupText>.{format}</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={copy}>
            {copied ? <IconCheck data-icon="inline-start" /> : <IconCopy data-icon="inline-start" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button onClick={async () => download(await blob(), file)}>
            <IconDownload data-icon="inline-start" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The file as it will come out, centred on a panel, with the circle guides a toggle away. */
function Preview({ still, framing }: { still: Still; framing: Framing }) {
  const [guides, setGuides] = useState(false);
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(mascotSvg(still, framing))}`;
  return (
    <div className="relative flex h-60 items-center justify-center rounded-md bg-gray-100">
      <div className="relative size-44 overflow-hidden rounded-sm" style={{ background: CHECKER }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a generated data URL, nothing to optimise */}
        <img src={src} alt="Export preview" className="size-full" />
        {guides && <CircleGuides />}
      </div>
      <Tooltip>
        <TooltipTrigger
          render={
            <Toggle
              size="sm"
              pressed={guides}
              onPressedChange={setGuides}
              aria-label="Circle guides"
              className="absolute right-2 bottom-2 px-0"
            />
          }
        >
          <IconCircleDashed />
        </TooltipTrigger>
        <TooltipContent>Circle guides</TooltipContent>
      </Tooltip>
    </div>
  );
}

/**
 * Where a round profile picture crops the square: the crop circle, the corners
 * it cuts off dimmed, and centre lines. Preview only; never exported.
 */
function CircleGuides() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute inset-0 size-full">
      <path d="M0 0H100V100H0ZM50 0A50 50 0 1 0 50 100A50 50 0 1 0 50 0Z" fillRule="evenodd" className="fill-black/40" />
      <g fill="none" className="stroke-blue-700">
        <circle cx="50" cy="50" r="49.75" strokeWidth="0.5" />
        <path d="M50 0V100M0 50H100" strokeWidth="0.25" strokeDasharray="1.5 1.5" />
      </g>
    </svg>
  );
}

function Choice({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  items: Option[];
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" size="sm" className="w-full justify-between" aria-label={label} />}
        >
          {items.find((item) => item.value === value)?.label}
          <IconChevronDown data-icon="inline-end" className="text-gray-900" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-(--anchor-width)">
          <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
            {items.map((item) => (
              <DropdownMenuRadioItem key={item.value} value={item.value}>
                {item.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </Field>
  );
}
