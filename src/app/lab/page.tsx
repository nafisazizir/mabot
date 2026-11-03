import type { Metadata } from "next";
import { Lab } from "@/components/lab";

export const metadata: Metadata = {
  title: "Lab · Mabot",
  description: "Tuning iterations of the mascot's face, side by side.",
};

export default function LabPage() {
  return <Lab />;
}
