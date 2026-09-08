import type { ComponentType, SVGProps } from "react";
import { DetailsIcon, ContactPinIcon, DeckIcon } from "./icons";

export interface StepMeta {
  n: 1 | 2 | 3;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  headline: string;
}

export const STEPS: StepMeta[] = [
  { n: 1, label: "Your Details", icon: DetailsIcon, headline: "Fund Your Growth Story." },
  { n: 2, label: "Contact & Location", icon: ContactPinIcon, headline: "Tell Us Where to Reach You." },
  { n: 3, label: "Funding Deck", icon: DeckIcon, headline: "Attach the Round Details." },
];
