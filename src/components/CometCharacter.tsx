import { useEffect, useState } from "react";
import { CometLogo } from "@/components/CometLogo";
import { cn } from "@/lib/utils";

const BUILD_LINES = [
  "I'll handle the code.",
  "Parsing your intent...",
  "Sketching the file tree...",
  "Wiring the pieces together...",
  "Compiling thoughts into syntax...",
  "Sanity-checking the edge cases...",
  "Almost there — polishing.",
];

const FAIL_LINES = [
  "Uh... that's not supposed to happen.",
  "Well. That exploded. Let me try again?",
  "Hit a wall at full speed. Retry?",
  "Stack trace says: nope.",
];

/** Blocky progress meter: ████████░░ */
function BlockMeter({ filled, total = 12 }: { filled: number; total?: number }) {
  return (
    <span className="font-mono text-[11px] tracking-[0.15em]">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "transition-colors duration-200",
            i < filled ? "text-sky-300" : "text-muted-foreground/30"
          )}
          style={i === filled - 1 ? { textShadow: "0 0 8px hsl(200 90% 60% / .9)" } : undefined}
        >
          {i < filled ? "█" : "░"}
        </span>
      ))}
    </span>
  );
}

/** Shown while Comet is streaming a response. */
export function CometBuilding() {
  const [tick, setTick] = useState(0);
  const [line, setLine] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 220);
    const l = setInterval(() => setLine((v) => (v + 1) % BUILD_LINES.length), 2400);
    return () => { clearInterval(t); clearInterval(l); };
  }, []);

  // ease toward full, then loop — feels like real work, never claims 100%
  const filled = 1 + (tick % 12);

  return (
    <div className="flex gap-3 px-4 py-4">
      <div className="shrink-0 animate-[pulse_2.4s_ease-in-out_infinite]">
        <CometLogo size={34} />
      </div>
      <div className="flex flex-col gap-2 rounded-2xl rounded-bl-md border border-sky-400/30 bg-sky-400/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">Building</span>
          <BlockMeter filled={filled} />
        </div>
        <p key={line} className="animate-fade-in text-sm italic text-muted-foreground">
          “{BUILD_LINES[line]}”
        </p>
      </div>
    </div>
  );
}

/** Shown when a request fails. */
export function CometFailure({ detail, onRetry }: { detail?: string; onRetry?: () => void }) {
  const [line] = useState(() => FAIL_LINES[Math.floor(Math.random() * FAIL_LINES.length)]);
  return (
    <div className="flex gap-3 px-4 py-4 animate-fade-in">
      <div className="shrink-0 opacity-70 [filter:grayscale(.6)]">
        <CometLogo size={34} />
      </div>
      <div className="flex flex-col gap-2 rounded-2xl rounded-bl-md border border-destructive/40 bg-destructive/10 px-4 py-3">
        <p className="text-sm font-medium text-destructive-foreground">🤖 “{line}”</p>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
        {onRetry && (
          <button
            onClick={onRetry}
            className="self-start rounded-md border border-sky-400/40 px-2 py-1 text-xs text-sky-300 transition-colors hover:bg-sky-400/10"
          >
            Try that again
          </button>
        )}
      </div>
    </div>
  );
}

/** Idle greeting used on the empty state. */
export function CometGreeting() {
  return (
    <div className="relative rounded-2xl border border-sky-400/30 bg-card/50 px-4 py-2 text-sm text-sky-200 backdrop-blur-sm animate-fade-in">
      🤖 “I'll handle the code.”
      <span className="absolute -bottom-1.5 left-8 h-3 w-3 rotate-45 border-b border-r border-sky-400/30 bg-card/50" />
    </div>
  );
}
