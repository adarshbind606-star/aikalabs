import ravenNeutral from "@/assets/raven-mascot.png";
import ravenBlush from "@/assets/raven-blush.png";
import ravenAnnoyed from "@/assets/raven-annoyed.png";
import ravenHappy from "@/assets/raven-happy.png";
import ravenThinking from "@/assets/raven-thinking.png";
import frostNeutral from "@/assets/frost-mascot.png";
import frostBlush from "@/assets/frost-blush.png";
import frostAnnoyed from "@/assets/frost-annoyed.png";
import frostHappy from "@/assets/frost-happy.png";
import frostThinking from "@/assets/frost-thinking.png";

export type Mood = "neutral" | "happy" | "blush" | "annoyed" | "thinking";
export type KimonoVariant = "raven" | "frost";

export const MOODS: Mood[] = ["neutral", "happy", "blush", "annoyed", "thinking"];

const FACES: Record<KimonoVariant, Record<Mood, string>> = {
  raven: {
    neutral: ravenNeutral,
    happy: ravenHappy,
    blush: ravenBlush,
    annoyed: ravenAnnoyed,
    thinking: ravenThinking,
  },
  frost: {
    neutral: frostNeutral,
    happy: frostHappy,
    blush: frostBlush,
    annoyed: frostAnnoyed,
    thinking: frostThinking,
  },
};

export const MOOD_META: Record<Mood, { label: string; emoji: string; fx: string }> = {
  neutral: { label: "composed", emoji: "🌙", fx: "" },
  happy: { label: "delighted", emoji: "✨", fx: "mood-fx-happy" },
  blush: { label: "flustered", emoji: "💗", fx: "mood-fx-blush" },
  annoyed: { label: "annoyed", emoji: "💢", fx: "mood-fx-annoyed" },
  thinking: { label: "thinking", emoji: "🧠", fx: "mood-fx-thinking" },
};

export function mascotFor(variant: KimonoVariant, mood: Mood = "neutral"): string {
  return FACES[variant][mood] ?? FACES[variant].neutral;
}

const MOOD_TAG = /\[\[\s*mood\s*:\s*(neutral|happy|blush|annoyed|thinking)\s*\]\]/gi;

/** Splits an assistant message into visible text and the mood the model tagged it with. */
export function parseMood(raw: string): { text: string; mood: Mood } {
  let mood: Mood = "neutral";
  const matches = [...(raw ?? "").matchAll(MOOD_TAG)];
  if (matches.length) mood = matches[matches.length - 1][1].toLowerCase() as Mood;
  const text = (raw ?? "").replace(MOOD_TAG, "").replace(/\s+$/, "");
  return { text, mood };
}

/** Strips a partially-streamed mood tag so the raw tag never flashes in the UI. */
export function stripPartialTag(text: string): string {
  return text.replace(/\[{1,2}\s*m?o?o?d?\s*:?\s*[a-z]*\s*\]{0,2}$/i, "");
}
