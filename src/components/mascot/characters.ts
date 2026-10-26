import type { Eyes, Mood } from "./mascot";

export type Character = {
  name: string;
  color: string;
  ink: string;
  eyes: Eyes;
};

// Fills sampled from the DevDay 2026 recap page.
export const CHARACTERS: Character[] = [
  { name: "Caret", color: "#262626", ink: "#ffffff", eyes: ["^", "^"] },
  { name: "Orbit", color: "#924ff7", ink: "#000000", eyes: ["o", "o"] },
  { name: "Plus", color: "#00ab44", ink: "#000000", eyes: ["+", "+"] },
  { name: "Squint", color: "#006aff", ink: "#000000", eyes: [">", "<"] },
  { name: "Dash", color: "#f26d00", ink: "#000000", eyes: ["-", "-"] },
  { name: "Star", color: "#dfdfdf", ink: "#000000", eyes: ["*", "*"] },
];

export const PRESETS: { name: string; eyes: Eyes }[] = [
  { name: "Happy", eyes: ["^", "^"] },
  { name: "Curious", eyes: ["o", "o"] },
  { name: "Focused", eyes: ["+", "+"] },
  { name: "Squeeze", eyes: [">", "<"] },
  { name: "Sleepy", eyes: ["-", "-"] },
  { name: "Sparkle", eyes: ["*", "*"] },
  { name: "Shocked", eyes: ["O", "O"] },
  { name: "Content", eyes: ["u", "u"] },
  { name: "Dizzy", eyes: ["@", "@"] },
  { name: "Love", eyes: ["♥", "♥"] },
  { name: "Wink", eyes: ["^", "-"] },
  { name: "Error", eyes: ["x", "x"] },
];

// The ziiz cast: one character per ziiz ramp, the same for every variant.
// Heads are step 700, the solid step, which barely shifts between light and
// dark (purple-700 is the exception).
const ds = (token: string) => `var(--ds-${token})`;

const RAMPS: { name: string; ramp: string; eyes: Eyes }[] = [
  { name: "Gray", ramp: "gray", eyes: ["^", "^"] },
  { name: "Blue", ramp: "blue", eyes: ["o", "o"] },
  { name: "Red", ramp: "red", eyes: [">", "<"] },
  { name: "Amber", ramp: "amber", eyes: ["*", "*"] },
  { name: "Green", ramp: "green", eyes: ["+", "+"] },
  { name: "Teal", ramp: "teal", eyes: ["u", "u"] },
  { name: "Purple", ramp: "purple", eyes: ["-", "-"] },
  { name: "Pink", ramp: "pink", eyes: ["♥", "♥"] },
];

const ziiz = ({ name, ramp, eyes }: (typeof RAMPS)[number]): Character => ({
  name,
  color: ds(`${ramp}-700`),
  ink: ds("black"),
  eyes,
});

// Pure black and white close the cast. Both stay put across themes, so one
// of them always melts into the page.
const MONO: Character[] = [
  { name: "Black", color: ds("black"), ink: ds("white"), eyes: ["O", "O"] },
  { name: "White", color: ds("white"), ink: ds("black"), eyes: ["^", "-"] },
];

export const ZIIZ_CHARACTERS: Character[] = [...RAMPS.map(ziiz), ...MONO];

export const MOODS: { mood: Mood; name: string; hint: string }[] = [
  { mood: "idle", name: "Idle", hint: "Its own eyes; follows the cursor" },
  { mood: "thinking", name: "Thinking", hint: "/ / ↔ \\ \\, glancing up and around" },
  { mood: "working", name: "Working", hint: "+ + rocking ±15°, eyes on the work" },
  { mood: "waiting", name: "Needs approval", hint: "o o, hops for attention" },
  { mood: "done", name: "Done", hint: "^ ^ with a little hop" },
  { mood: "paused", name: "Paused", hint: "- - and slow breathing" },
  { mood: "error", name: "Error", hint: "x x and a head shake" },
];
