import { Link } from "react-router-dom";
import { SakuraPetals } from "@/components/SakuraPetals";
import { Button } from "@/components/ui/button";
import { Cherry, MessageCircle, Image, Moon, Shield, Flame, Download } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const features = [
  {
    icon: MessageCircle,
    title: "Smart Conversations",
    description: "Chat with Aika about anything — science, code, creative writing, and more. Powered by cutting-edge AI.",
  },
  {
    icon: Image,
    title: "Image Generation",
    description: "Ask Aika to create stunning images from your descriptions. Just describe what you want!",
  },
  {
    icon: Flame,
    title: "AikaUnbound Mode",
    description: "Switch to Aika's uncensored alter-ego for raw, unfiltered answers on any topic — no lectures, no disclaimers, just direct responses.",
  },
  {
    icon: Moon,
    title: "Dark & Light Themes",
    description: "Beautiful sakura-themed UI in both light and dark modes. Switch anytime.",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Your conversations are saved securely and only accessible to you.",
  },
];

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <SakuraPetals count={15} />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Cherry className="h-6 w-6 text-primary" />
          <span className="font-display text-xl text-primary">Aika-AI</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/auth">
            <Button variant="outline" size="sm">Sign In</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center px-6 pt-16 pb-20 text-center md:pt-24">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/20">
          <Cherry className="h-14 w-14 text-primary" />
        </div>
        <h1 className="font-display text-4xl leading-tight text-foreground md:text-6xl">
          Meet <span className="text-primary">Aika</span>
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Your anime-inspired AI assistant 🌸 Ask anything, generate images, and enjoy beautiful cherry blossom aesthetics.
        </p>
        <div className="mt-8 flex gap-3">
          <Link to="/auth">
            <Button size="lg" className="gap-2 text-base">
              <Cherry className="h-4 w-4" /> Get Started
            </Button>
          </Link>
          <Link to="/install">
            <Button size="lg" variant="outline" className="gap-2 text-base">
              <Download className="h-4 w-4" /> Install for Windows
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-2">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-card/60 p-6 backdrop-blur-sm transition-shadow hover:shadow-lg hover:shadow-primary/5"
            >
              <f.icon className="mb-3 h-8 w-8 text-primary" />
              <h3 className="font-display text-lg text-foreground">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-6 text-center text-sm text-muted-foreground">
        Made with 🌸 — Aika-AI 2.1
      </footer>
    </div>
  );
}
