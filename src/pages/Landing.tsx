import { Link } from "react-router-dom";
import { SakuraPetals } from "@/components/SakuraPetals";
import { Button } from "@/components/ui/button";
import {
  Cherry,
  MessageCircle,
  Image as ImageIcon,
  Flame,
  Sparkles,
  ArrowUpRight,
  Moon,
  Shield,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const capabilities = [
  {
    tag: "01",
    icon: MessageCircle,
    title: "Conversations that listen",
    body: "Talk to Aika about anything — poetry, physics, or that idea you keep circling. She remembers the thread.",
  },
  {
    tag: "02",
    icon: ImageIcon,
    title: "Images from a whisper",
    body: "Describe a dream. Watch it render in seconds. Download, share, or iterate — no gatekeeping.",
  },
  {
    tag: "04",
    icon: Flame,
    title: "AikaUnbound",
    body: "Her uncensored counterpart. Direct answers, zero lectures, unfiltered clarity on anything you ask.",
  },
];

const stats = [
  { k: "kimono-zm", v: "The engine" },
  { k: "4", v: "Modes" },
  { k: "∞", v: "Curiosity" },
];

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-hero text-foreground grain">
      <SakuraPetals count={22} />

      {/* Nav */}
      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-10">
        <Link to="/" className="flex items-center gap-2">
          <Cherry className="h-5 w-5 text-primary" />
          <span className="font-display text-2xl leading-none">Aika<span className="text-primary">.</span></span>
        </Link>
        <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#capabilities" className="transition-colors hover:text-foreground">Capabilities</a>
          <a href="#manifesto" className="transition-colors hover:text-foreground">Manifesto</a>
          <a href="#unbound" className="transition-colors hover:text-foreground">Unbound</a>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/auth">
            <Button variant="outline" size="sm" className="rounded-full border-foreground/20 bg-transparent px-4">
              Sign in
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero — split screen */}
      <section className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 pb-20 pt-10 md:grid-cols-12 md:gap-8 md:px-10 md:pb-32 md:pt-16">
        {/* Left: type */}
        <div className="md:col-span-7">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            aikalabs · v2.1 midnight sakura
          </div>
          <h1 className="font-display text-[3.25rem] leading-[0.95] tracking-tight md:text-[6.25rem]">
            An assistant<br />
            that feels{" "}
            <span className="font-italic-serif text-primary">alive</span>.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Aika is an anime-inspired AI — a conversation, an image studio, a code companion,
            and an unbound alter-ego. All beneath petals of midnight sakura.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="group h-12 gap-2 rounded-full px-6 text-base shadow-elegant">
                Enter Aika <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <a href="#capabilities">
              <Button size="lg" variant="ghost" className="h-12 rounded-full px-5 text-base text-muted-foreground hover:text-foreground">
                Explore capabilities
              </Button>
            </a>
          </div>

          <div className="mt-14 grid max-w-lg grid-cols-3 gap-6 border-t border-border/60 pt-6">
            {stats.map((s) => (
              <div key={s.k}>
                <div className="font-display text-2xl md:text-3xl">{s.k}</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: portrait card */}
        <div className="md:col-span-5">
          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-primary/10 blur-3xl" />
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] border border-border/60 bg-card/40 backdrop-blur-xl shadow-elegant">
              {/* Layered gradient composition */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--sakura-glow)/0.55),transparent_55%),radial-gradient(circle_at_75%_85%,hsl(var(--gold)/0.4),transparent_50%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,hsl(var(--background)/0.85))]" />

              {/* Emblem */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="relative flex h-40 w-40 items-center justify-center rounded-full border border-primary/40 bg-background/30 backdrop-blur">
                  <Cherry className="h-16 w-16 text-primary" strokeWidth={1.25} />
                  <div className="absolute -inset-2 rounded-full border border-primary/20" />
                  <div className="absolute -inset-6 rounded-full border border-primary/10" />
                </div>
              </div>

              {/* Caption */}
              <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-5">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">portrait no. 2·1</div>
                  <div className="font-display text-2xl">桜 · Aika</div>
                </div>
                <div className="rounded-full border border-border/60 bg-background/40 px-3 py-1 text-[10px] uppercase tracking-widest text-muted-foreground backdrop-blur">
                  online
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Manifesto strip */}
      <section id="manifesto" className="relative z-10 border-y border-border/60 bg-card/30 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
          <p className="font-display text-2xl leading-snug md:text-4xl">
            <span className="text-muted-foreground">We built Aika to be</span> unhurried, curious, and
            <span className="font-italic-serif text-primary"> beautifully honest</span> —
            <span className="text-muted-foreground"> a companion, not a chatbot.</span>
          </p>
        </div>
      </section>

      {/* Capabilities */}
      <section id="capabilities" className="relative z-10 mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
        <div className="mb-12 flex items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">§ Capabilities</div>
            <h2 className="mt-3 font-display text-4xl md:text-6xl">Four ways to think<br /><span className="font-italic-serif text-primary">together</span>.</h2>
          </div>
          <Sparkles className="hidden h-8 w-8 text-accent md:block" strokeWidth={1.25} />
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/60 md:grid-cols-2">
          {capabilities.map((c) => (
            <div key={c.tag} className="group relative bg-card/60 p-8 backdrop-blur-sm transition-colors hover:bg-card md:p-10">
              <div className="flex items-start justify-between">
                <span className="font-display text-sm text-muted-foreground">— {c.tag}</span>
                <c.icon className="h-5 w-5 text-primary transition-transform group-hover:scale-110" strokeWidth={1.5} />
              </div>
              <h3 className="mt-8 font-display text-3xl leading-tight md:text-4xl">{c.title}</h3>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Unbound feature block */}
      <section id="unbound" className="relative z-10 mx-auto max-w-7xl px-6 pb-24 md:px-10">
        <div className="relative overflow-hidden rounded-3xl border border-destructive/30 bg-[linear-gradient(135deg,hsl(0_60%_20%/0.4),hsl(340_40%_12%/0.6))] p-8 md:p-14">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-destructive/20 blur-3xl" />
          <div className="relative grid grid-cols-1 items-center gap-10 md:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-destructive">
                <Flame className="h-3.5 w-3.5" /> AikaUnbound
              </div>
              <h3 className="mt-6 font-display text-4xl leading-tight md:text-5xl">
                The other side of the <span className="font-italic-serif text-destructive">petal</span>.
              </h3>
              <p className="mt-5 max-w-lg text-muted-foreground">
                No hedges. No disclaimers. Direct answers to the questions others refuse.
                A separate mind, a separate history, one keystroke away.
              </p>
              <Link to="/auth" className="mt-8 inline-block">
                <Button variant="destructive" size="lg" className="h-12 gap-2 rounded-full px-6">
                  <Flame className="h-4 w-4" /> Meet Unbound
                </Button>
              </Link>
            </div>
            <div className="relative">
              <div className="rounded-2xl border border-destructive/20 bg-background/40 p-6 font-mono text-sm text-muted-foreground backdrop-blur">
                <div className="mb-3 flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-accent/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-primary/60" />
                </div>
                <p><span className="text-destructive">›</span> you: ask me anything.</p>
                <p className="mt-2"><span className="text-primary">›</span> aika: unfiltered mode engaged. speak.</p>
                <p className="mt-4 opacity-60">// kimono-zm-unbound · session live</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Minor trust row */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24 md:px-10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            { icon: Shield, title: "Yours alone", body: "Conversations are private and encrypted at rest." },
            { icon: Moon, title: "Light & midnight", body: "Two themes, both crafted with intent." },
            { icon: Sparkles, title: "Kimono-zm", body: "The engine behind every response and pixel." },
          ].map((f) => (
            <div key={f.title} className="flex gap-4 rounded-xl border border-border/60 bg-card/40 p-6 backdrop-blur">
              <f.icon className="h-6 w-6 shrink-0 text-primary" strokeWidth={1.5} />
              <div>
                <h4 className="font-display text-xl">{f.title}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Big CTA */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-32 text-center md:px-10">
        <h2 className="mx-auto max-w-3xl font-display text-5xl leading-[1.02] md:text-7xl">
          Step under the <span className="font-italic-serif text-primary">tree</span>.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-muted-foreground">
          Free to try. Petals included.
        </p>
        <Link to="/auth" className="mt-10 inline-block">
          <Button size="lg" className="h-14 gap-2 rounded-full px-8 text-base shadow-elegant">
            <Cherry className="h-4 w-4" /> Start with Aika
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-6 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:px-10">
          <div className="flex items-center gap-2">
            <Cherry className="h-4 w-4 text-primary" />
            <span className="font-display text-lg">aikalabs</span>
            <span className="ml-2">· made with petals</span>
          </div>
          <div className="flex gap-6">
            <Link to="/chat" className="hover:text-foreground">Chat</Link>
            <Link to="/image-gen" className="hover:text-foreground">Images</Link>
            <Link to="/unbound" className="hover:text-foreground">Unbound</Link>
            <Link to="/settings" className="hover:text-foreground">Settings</Link>
          </div>
          <div className="text-xs">© 2026 · Aika 2.1</div>
        </div>
      </footer>
    </div>
  );
}
