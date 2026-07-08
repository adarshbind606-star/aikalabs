export type ChatModelId = "kimono-zm" | "kimono-frost" | "kimono-raven";

export interface ChatModelDef {
  id: ChatModelId;
  label: string;
  tagline: string;
  tier: "basic" | "pro" | "super";
  badge?: string;
}

export const CHAT_MODELS: ChatModelDef[] = [
  {
    id: "kimono-zm",
    label: "kimono-zm",
    tagline: "Balanced everyday model. Free for everyone.",
    tier: "basic",
  },
  {
    id: "kimono-frost",
    label: "kimono-frost",
    tagline: "Blisteringly fast. Priority reasoning. Pro & Super.",
    tier: "pro",
    badge: "Pro",
  },
  {
    id: "kimono-raven",
    label: "kimono-raven",
    tagline: "Deepest reasoning. Extended thinking. Super only.",
    tier: "super",
    badge: "Super",
  },
];