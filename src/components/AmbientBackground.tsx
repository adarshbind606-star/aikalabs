import { useMemo } from "react";
import { ThemeScene } from "@/components/ThemeScene";
import { useAnimeTheme } from "@/hooks/useAnimeTheme";
import type { AmbientId } from "@/lib/anime-themes";

const rand = (min: number, max: number) => min + Math.random() * (max - min);

interface Item {
  cls: string;
  style: React.CSSProperties;
}

function build(kind: AmbientId, count: number): Item[] {
  const n = (m: number) => Math.max(4, Math.round(count * m));
  const items: Item[] = [];
  const push = (cls: string, style: React.CSSProperties) => items.push({ cls, style });

  switch (kind) {
    case "petals":
      for (let i = 0; i < n(1.8); i++) {
        const s = rand(10, 24);
        push("amb amb-petal", { left: `${rand(0, 100)}%`, width: s, height: s * 0.85, opacity: rand(0.45, 0.95), animationDuration: `${rand(10, 22)}s`, animationDelay: `${-rand(0, 22)}s` });
      }
      break;

    case "particles":
      for (let i = 0; i < n(2); i++) {
        const s = rand(2, 6);
        push("amb amb-particle", { left: `${rand(0, 100)}%`, width: s, height: s, animationDuration: `${rand(14, 30)}s`, animationDelay: `${rand(0, 18)}s` });
      }
      break;
    case "fireflies":
      for (let i = 0; i < n(1.6); i++) {
        const s = rand(3, 6);
        push("amb amb-firefly", { left: `${rand(0, 100)}%`, top: `${rand(35, 95)}%`, width: s, height: s, animationDuration: `${rand(9, 18)}s`, animationDelay: `${rand(0, 12)}s` });
      }
      break;
    case "rain":
      for (let i = 0; i < n(4); i++) {
        push("amb amb-rain", { left: `${rand(0, 100)}%`, width: 2, height: rand(40, 90), opacity: rand(0.25, 0.6), animationDuration: `${rand(0.7, 1.6)}s`, animationDelay: `${rand(0, 3)}s` });
      }
      break;
    case "clouds":
      for (let i = 0; i < n(0.7); i++) {
        push("amb amb-cloud", { top: `${rand(2, 70)}%`, width: rand(180, 420), height: rand(70, 150), animationDuration: `${rand(50, 110)}s`, animationDelay: `${-rand(0, 60)}s` });
      }
      break;
    case "snow":
      for (let i = 0; i < n(2.5); i++) {
        const s = rand(3, 8);
        push("amb amb-snow", { left: `${rand(0, 100)}%`, width: s, height: s, opacity: rand(0.4, 0.95), animationDuration: `${rand(12, 26)}s`, animationDelay: `${rand(0, 14)}s` });
      }
      break;
    case "stars":
      for (let i = 0; i < n(4); i++) {
        const s = rand(1.5, 3.5);
        push("amb amb-star", { left: `${rand(0, 100)}%`, top: `${rand(0, 100)}%`, width: s, height: s, animationDuration: `${rand(2, 6)}s`, animationDelay: `${rand(0, 5)}s` });
      }
      break;
    case "city":
      for (let i = 0; i < n(4); i++) {
        push("amb amb-city", { left: `${rand(0, 100)}%`, top: `${rand(45, 98)}%`, width: rand(2, 5), height: rand(2, 5), animationDuration: `${rand(1.6, 5)}s`, animationDelay: `${rand(0, 5)}s` });
      }
      break;
    case "shooting-stars":
      for (let i = 0; i < n(0.5); i++) {
        push("amb amb-shoot", { left: `${rand(-10, 60)}%`, top: `${rand(-5, 40)}%`, width: rand(90, 200), height: 2, animationDuration: `${rand(6, 14)}s`, animationDelay: `${rand(0, 12)}s` });
      }
      for (let i = 0; i < n(3); i++) {
        const s = rand(1.5, 3);
        push("amb amb-star", { left: `${rand(0, 100)}%`, top: `${rand(0, 100)}%`, width: s, height: s, animationDuration: `${rand(2, 6)}s`, animationDelay: `${rand(0, 5)}s` });
      }
      break;
    default:
      break;
  }
  return items;
}

export function AmbientBackground({ count = 14, kind }: { count?: number; kind?: AmbientId }) {
  const { ambient } = useAnimeTheme();
  const active = kind ?? ambient;
  const items = useMemo(() => build(active, count), [active, count]);

  const sways = new Set(["petals", "snow"]);

  return (
    <>
      <ThemeScene />
      {active !== "none" && items.length > 0 && (
        <div className="ambient-layer" aria-hidden="true">
          {items.map((it, i) => {
            const el = <div className={it.cls} style={it.style} />;
            if (!sways.has(active)) return <div key={`${active}-${i}`}>{el}</div>;
            const { left, animationDelay, ...rest } = it.style;
            return (
              <div
                key={`${active}-${i}`}
                className="amb-sway"
                style={{ left, animationDuration: `${3 + (i % 5)}s`, animationDelay }}
              >
                <div className={it.cls} style={{ ...rest, animationDelay }} />
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
