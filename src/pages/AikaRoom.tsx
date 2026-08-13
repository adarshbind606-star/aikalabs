import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ChatSidebar } from "@/components/ChatSidebar";
import { SakuraPetals } from "@/components/SakuraPetals";
import { SidebarToggle } from "@/components/SidebarToggle";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Home, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  ROOM_CATEGORIES, DEFAULT_ROOM, RoomConfig, loadRoom, saveRoom,
} from "@/lib/aika-room";
import { PERSONALITIES, getPersonality, personalityMeta } from "@/lib/personalities";

const BACKDROPS: Record<string, string> = {
  city: "linear-gradient(180deg,#101a33 0%,#233a63 55%,#3d5480 100%)",
  sakura: "linear-gradient(180deg,#2a1730 0%,#5a2a4a 50%,#8c4f68 100%)",
  rain: "linear-gradient(180deg,#0c1220 0%,#1a2740 60%,#2a3a55 100%)",
  space: "linear-gradient(180deg,#05060f 0%,#12103a 60%,#241a4a 100%)",
};

const LIGHTS: Record<string, string> = {
  warm: "radial-gradient(circle at 70% 20%, hsl(35 90% 65% / .35), transparent 60%)",
  neon: "radial-gradient(circle at 25% 30%, hsl(290 90% 60% / .38), transparent 55%), radial-gradient(circle at 80% 65%, hsl(190 90% 55% / .32), transparent 55%)",
  moon: "radial-gradient(circle at 80% 12%, hsl(210 80% 80% / .32), transparent 60%)",
  sunset: "radial-gradient(circle at 15% 25%, hsl(20 95% 62% / .34), transparent 60%)",
};

const WINDOW_EMOJI: Record<string, string> = { city: "🏙️", sakura: "🌸", rain: "🌧️", space: "🌠" };

function emojiFor(catKey: keyof RoomConfig, value: string) {
  const cat = ROOM_CATEGORIES.find((c) => c.key === catKey)!;
  const opt = cat.options.find((o) => o.id === value);
  return opt && opt.id !== "none" ? opt.emoji : "";
}

export default function AikaRoom() {
  const { session, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarHidden, setDesktopSidebarHidden] = useState(false);
  const [room, setRoom] = useState<RoomConfig>(() => loadRoom());
  const persona = useMemo(() => personalityMeta(getPersonality()), []);

  const update = (key: keyof RoomConfig, value: string) => {
    const next = { ...room, [key]: value };
    setRoom(next);
    saveRoom(next);
  };

  const reset = () => {
    setRoom(DEFAULT_ROOM);
    saveRoom(DEFAULT_ROOM);
    toast.success("Room reset to default 🌸");
  };

  if (loading) return null;
  if (!session) return <Navigate to="/" replace />;

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      <SakuraPetals count={8} />
      <ChatSidebar
        conversations={[]} activeId={null} onSelect={() => {}} onNew={() => {}} onDelete={() => {}}
        isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}
        desktopHidden={desktopSidebarHidden} activePage="room"
      />

      <div className="relative z-10 flex flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-sm">
          <SidebarToggle
            mobileOpen={sidebarOpen}
            onMobileToggle={() => setSidebarOpen((v) => !v)}
            desktopHidden={desktopSidebarHidden}
            onDesktopToggle={() => setDesktopSidebarHidden((v) => !v)}
          />
          <Home className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg text-primary">Aika's Room</h2>
          <Button variant="ghost" size="sm" className="ml-auto gap-2" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        </header>

        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
            {/* Room scene */}
            <div
              className="relative overflow-hidden rounded-2xl border border-border shadow-elegant"
              style={{ background: BACKDROPS[room.background], aspectRatio: "16 / 9" }}
            >
              <div className="absolute inset-0" style={{ background: LIGHTS[room.lighting] }} />
              {/* floor */}
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-black/30 backdrop-blur-[1px]" />

              {/* window */}
              <div className="absolute left-[6%] top-[10%] flex h-[34%] w-[26%] items-center justify-center rounded-lg border border-white/25 bg-white/10 text-4xl backdrop-blur-sm">
                <span className="animate-[pulse_6s_ease-in-out_infinite]">{WINDOW_EMOJI[room.background]}</span>
              </div>

              {/* posters */}
              {room.poster !== "none" && (
                <div className="absolute right-[10%] top-[8%] flex h-[26%] w-[16%] items-center justify-center rounded-md border border-white/25 bg-white/10 text-3xl">
                  {emojiFor("poster", room.poster)}
                </div>
              )}

              {/* bed */}
              {room.bed !== "none" && (
                <div className="absolute bottom-[8%] left-[5%] text-5xl drop-shadow-lg sm:text-6xl">
                  {emojiFor("bed", room.bed)}
                </div>
              )}

              {/* desk + pc + plushie/figure on it */}
              {room.desk !== "none" && (
                <div className="absolute bottom-[10%] right-[8%] flex flex-col items-center">
                  <div className="flex items-end gap-1 text-3xl sm:text-4xl">
                    {room.pc !== "none" && <span>{emojiFor("pc", room.pc)}</span>}
                    {room.figure !== "none" && <span className="text-2xl sm:text-3xl">{emojiFor("figure", room.figure)}</span>}
                  </div>
                  <div className="mt-1 h-2 w-28 rounded bg-amber-900/70 sm:w-36" />
                  <span className="text-3xl sm:text-4xl">{emojiFor("desk", room.desk)}</span>
                </div>
              )}

              {/* plant */}
              {room.plant !== "none" && (
                <div className="absolute bottom-[10%] left-[42%] text-4xl sm:text-5xl">{emojiFor("plant", room.plant)}</div>
              )}
              {/* books */}
              {room.books !== "none" && (
                <div className="absolute bottom-[10%] left-[56%] text-3xl sm:text-4xl">{emojiFor("books", room.books)}</div>
              )}
              {/* plushie */}
              {room.plushie !== "none" && (
                <div className="absolute bottom-[11%] left-[30%] text-3xl sm:text-4xl">{emojiFor("plushie", room.plushie)}</div>
              )}

              {/* Aika */}
              <div className="absolute bottom-[12%] left-1/2 -translate-x-1/2 text-center">
                <div className="text-5xl sm:text-6xl" style={{ animation: "float 5s ease-in-out infinite" }}>
                  {persona.emoji}
                </div>
                <p className="mt-1 rounded-full bg-background/70 px-3 py-1 text-xs text-foreground backdrop-blur-sm">
                  Aika · {persona.name}
                </p>
              </div>
            </div>

            {/* Customization */}
            <div className="grid gap-4 sm:grid-cols-2">
              {ROOM_CATEGORIES.map((cat) => (
                <div key={cat.key} className="rounded-xl border border-border bg-card p-4">
                  <p className="mb-2 text-sm font-medium text-foreground">{cat.emoji} {cat.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {cat.options.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => update(cat.key, o.id)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs transition-colors",
                          room[cat.key] === o.id
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {o.emoji} {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Aika's mood in the room follows your character mode ({PERSONALITIES.length} available in Settings → Character Mode).
            </p>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
