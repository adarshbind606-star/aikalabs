import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SakuraPetals } from "@/components/SakuraPetals";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Cherry, Copy, Check, Download, Terminal, Monitor, Shield, Sparkles } from "lucide-react";
import { toast } from "sonner";

const ONE_LINER = "irm https://aikalabs.lovable.app/install.ps1 | iex";
const PS_URL = "https://aikalabs.lovable.app/install.ps1";

export default function Install() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(ONE_LINER);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <SakuraPetals count={10} />

      <nav className="relative z-10 flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <Cherry className="h-6 w-6 text-primary" />
          <span className="font-display text-xl text-primary">Aika-AI</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/auth">
            <Button variant="outline" size="sm">Sign In</Button>
          </Link>
        </div>
      </nav>

      <section className="relative z-10 mx-auto max-w-3xl px-6 pt-10 pb-16 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-2 ring-primary/20">
          <Download className="h-8 w-8 text-primary" />
        </div>
        <h1 className="font-display text-4xl text-foreground md:text-5xl">
          Install <span className="text-primary">Aika-AI</span> on Windows
        </h1>
        <p className="mt-3 text-muted-foreground">
          One PowerShell command. Gets you a real desktop app window, a Start Menu entry, and an uninstall option.
        </p>
      </section>

      {/* Installer card */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 pb-10">
        <div className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-sm md:p-8">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Terminal className="h-4 w-4 text-primary" />
            Open <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">PowerShell</span> and paste:
          </div>

          <div className="group relative overflow-hidden rounded-xl border border-border bg-background/80">
            <pre className="overflow-x-auto px-4 py-4 pr-14 font-mono text-sm text-foreground">
              <span className="select-none text-primary">PS&gt; </span>{ONE_LINER}
            </pre>
            <button
              onClick={copy}
              aria-label="Copy command"
              className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition hover:text-primary"
            >
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={copy} className="gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy command"}
            </Button>
            <a href={PS_URL} download>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Download install.ps1
              </Button>
            </a>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            If PowerShell blocks the script, run it once with:{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
              powershell -ExecutionPolicy Bypass -Command "irm {PS_URL} | iex"
            </code>
          </p>
        </div>
      </section>

      {/* What it does */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 pb-20">
        <h2 className="mb-4 font-display text-2xl text-foreground">What the installer does</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { icon: Monitor, title: "Desktop + Start Menu shortcut", desc: "Launches Aika-AI in a clean standalone window via Edge / Chrome / Brave (--app mode)." },
            { icon: Sparkles, title: "Branded icon", desc: "Downloads the Aika favicon and applies it to every shortcut." },
            { icon: Shield, title: "Per-user only", desc: "No admin needed. Installs under your local AppData, never touches system folders." },
            { icon: Terminal, title: "Clean uninstall", desc: "Adds an entry to Apps & Features so you can remove it with one click." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card/60 p-5 backdrop-blur-sm">
              <f.icon className="mb-2 h-6 w-6 text-primary" />
              <h3 className="font-display text-base text-foreground">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        <details className="mt-6 rounded-xl border border-border bg-card/60 p-5 backdrop-blur-sm">
          <summary className="cursor-pointer font-display text-base text-foreground">
            Requirements
          </summary>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Windows 10 or Windows 11</li>
            <li>PowerShell 5.1+ (built in) or PowerShell 7</li>
            <li>Microsoft Edge, Google Chrome, or Brave installed</li>
            <li>Internet connection (to load the app)</li>
          </ul>
        </details>
      </section>

      <footer className="relative z-10 border-t border-border py-6 text-center text-sm text-muted-foreground">
        Made with 🌸 — Aika-AI 2.1
      </footer>
    </div>
  );
}