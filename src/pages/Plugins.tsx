import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChatSidebar } from "@/components/ChatSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Menu, PanelLeftClose, PanelLeftOpen, Puzzle, Search, Check, Plug } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Plugin = {
  id: string;
  name: string;
  category: string;
  emoji: string;
  description: string;
  color: string;
};

const PLUGINS: Plugin[] = [
  { id: "web-browser", name: "Web Browser", category: "Search & Web", emoji: "🌐", description: "Browse the internet, fetch live pages, and cite sources in real time.", color: "from-sky-500/20 to-blue-500/10" },
  { id: "wolfram", name: "Wolfram", category: "Knowledge", emoji: "🧮", description: "Advanced computation, math, science, and curated real-time data.", color: "from-orange-500/20 to-red-500/10" },
  { id: "zapier", name: "Zapier", category: "Automation", emoji: "⚡", description: "Connect Aika to 5,000+ apps and automate workflows across tools.", color: "from-amber-500/20 to-orange-500/10" },
  { id: "expedia", name: "Expedia", category: "Travel", emoji: "✈️", description: "Plan trips, find flights, hotels, and activities without leaving chat.", color: "from-yellow-500/20 to-amber-500/10" },
  { id: "kayak", name: "KAYAK", category: "Travel", emoji: "🧭", description: "Search flights, stays, and rental cars with flexible dates.", color: "from-orange-500/20 to-yellow-500/10" },
  { id: "opentable", name: "OpenTable", category: "Food", emoji: "🍽️", description: "Discover restaurants and reserve tables anywhere in the world.", color: "from-red-500/20 to-rose-500/10" },
  { id: "instacart", name: "Instacart", category: "Food", emoji: "🛒", description: "Turn any recipe into a same-day grocery order from local stores.", color: "from-green-500/20 to-emerald-500/10" },
  { id: "shop", name: "Shop", category: "Shopping", emoji: "🛍️", description: "Search millions of products across the world's greatest brands.", color: "from-fuchsia-500/20 to-pink-500/10" },
  { id: "klarna", name: "Klarna Shopping", category: "Shopping", emoji: "💳", description: "Compare prices from thousands of online shops instantly.", color: "from-pink-500/20 to-rose-500/10" },
  { id: "kayak-cars", name: "KAYAK Cars", category: "Travel", emoji: "🚗", description: "Book rental cars with the best rates from major providers.", color: "from-blue-500/20 to-sky-500/10" },
  { id: "speak", name: "Speak", category: "Learning", emoji: "🗣️", description: "Your AI-powered language tutor for real-world conversation practice.", color: "from-violet-500/20 to-purple-500/10" },
  { id: "wolfram-alpha", name: "Wolfram Alpha", category: "Knowledge", emoji: "📊", description: "Ask factual queries and get expert-curated answers with visualizations.", color: "from-red-500/20 to-orange-500/10" },
  { id: "prompt-perfect", name: "Prompt Perfect", category: "Productivity", emoji: "✨", description: "Rewrite your prompts to get sharper, more accurate answers.", color: "from-primary/20 to-pink-500/10" },
  { id: "link-reader", name: "Link Reader", category: "Search & Web", emoji: "🔗", description: "Read and summarize any URL — articles, PDFs, docs, and more.", color: "from-cyan-500/20 to-sky-500/10" },
  { id: "video-insights", name: "Video Insights", category: "Media", emoji: "🎬", description: "Summarize YouTube videos, extract chapters, and pull key quotes.", color: "from-rose-500/20 to-red-500/10" },
  { id: "scholarly", name: "Scholarly", category: "Research", emoji: "🎓", description: "Search peer-reviewed papers and generate literature summaries.", color: "from-indigo-500/20 to-blue-500/10" },
  { id: "showme", name: "Show Me Diagrams", category: "Productivity", emoji: "📐", description: "Generate flowcharts, mind maps, and diagrams directly in chat.", color: "from-teal-500/20 to-cyan-500/10" },
  { id: "pdf-ai", name: "AskYourPDF", category: "Documents", emoji: "📄", description: "Chat with any PDF — extract, summarize, and search long documents.", color: "from-slate-500/20 to-gray-500/10" },
  { id: "canva", name: "Canva", category: "Design", emoji: "🎨", description: "Design presentations, logos, and social posts from a single prompt.", color: "from-purple-500/20 to-fuchsia-500/10" },
  { id: "coursera", name: "Coursera", category: "Learning", emoji: "📚", description: "Find courses, specializations, and degrees from top universities.", color: "from-blue-500/20 to-indigo-500/10" },
  { id: "fiscal", name: "FiscalNote", category: "News", emoji: "📰", description: "Real-time market-moving news, policy updates, and legal insights.", color: "from-emerald-500/20 to-teal-500/10" },
  { id: "milo", name: "Milo Family AI", category: "Lifestyle", emoji: "👨‍👩‍👧", description: "A magical daily assistant for family routines and calendars.", color: "from-pink-500/20 to-rose-500/10" },
  { id: "there-is-anai", name: "There's An AI For That", category: "Productivity", emoji: "🤖", description: "Find the best AI tool for any task from a curated database.", color: "from-violet-500/20 to-indigo-500/10" },
  { id: "web-pilot", name: "WebPilot", category: "Search & Web", emoji: "🕹️", description: "Browse, extract, and interact with pages in a single natural query.", color: "from-sky-500/20 to-cyan-500/10" },
];

const CATEGORIES = ["All", ...Array.from(new Set(PLUGINS.map((p) => p.category)))];

const STORAGE_KEY = "aika-connected-plugins";

function getConnected(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

export default function Plugins() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopHidden, setDesktopHidden] = useState(false);
  const [connected, setConnected] = useState<Set<string>>(getConnected);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const toggle = (id: string, name: string) => {
    const next = new Set(connected);
    if (next.has(id)) {
      next.delete(id);
      toast.success(`${name} disconnected`);
    } else {
      next.add(id);
      toast.success(`${name} connected ✨`);
    }
    setConnected(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
  };

  const filtered = PLUGINS.filter((p) => {
    const matchesCat = category === "All" || p.category === category;
    const matchesQuery = !query || p.name.toLowerCase().includes(query.toLowerCase()) || p.description.toLowerCase().includes(query.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="flex h-screen w-full bg-background">
      <ChatSidebar
        conversations={[]}
        activeId={null}
        onSelect={() => {}}
        onNew={() => navigate("/chat")}
        onDelete={() => {}}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        desktopHidden={desktopHidden}
        activePage={"plugins" as any}
      />

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-2 border-b border-border p-3 md:p-4">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setDesktopHidden((v) => !v)} className="hidden md:inline-flex">
            {desktopHidden ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </Button>
          <Puzzle className="h-5 w-5 text-primary" />
          <h1 className="font-display text-lg font-semibold">Plugins</h1>
          <Badge variant="outline" className="ml-2 text-xs">Beta</Badge>
          <div className="ml-auto text-xs text-muted-foreground">
            {connected.size} connected
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
            <div className="mb-8">
              <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
                Extend Aika with plugins
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
                Connect Aika-AI to your favorite tools and services. Enable plugins to unlock live web, travel, shopping, research, and productivity superpowers.
              </p>
            </div>

            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search plugins..."
                  className="pl-9"
                />
              </div>
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    category === cat
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => {
                const isOn = connected.has(p.id);
                return (
                  <div
                    key={p.id}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-lg",
                      isOn && "border-primary/60 ring-1 ring-primary/30"
                    )}
                  >
                    <div className={cn("absolute inset-0 -z-10 bg-gradient-to-br opacity-40", p.color)} />
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background text-2xl shadow-sm">
                        {p.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-display text-base font-semibold">{p.name}</h3>
                          {isOn && <Check className="h-3.5 w-3.5 text-primary" />}
                        </div>
                        <p className="text-xs text-muted-foreground">{p.category}</p>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{p.description}</p>
                    <Button
                      onClick={() => toggle(p.id, p.name)}
                      variant={isOn ? "outline" : "default"}
                      size="sm"
                      className="mt-4 w-full gap-2"
                    >
                      {isOn ? (
                        <><Check className="h-4 w-4" /> Connected</>
                      ) : (
                        <><Plug className="h-4 w-4" /> Connect</>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
                No plugins match "{query}"
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}