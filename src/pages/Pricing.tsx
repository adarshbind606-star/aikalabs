import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Cherry, Check, Sparkles, Zap, Crown, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SakuraPetals } from "@/components/SakuraPetals";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePlan, PlanTier } from "@/hooks/usePlan";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Tier {
  id: PlanTier;
  name: string;
  price: string;
  cadence: string;
  tagline: string;
  icon: typeof Cherry;
  accent: string;
  highlight?: boolean;
  features: string[];
  cta: string;
}

const TIERS: Tier[] = [
  {
    id: "basic",
    name: "Basic",
    price: "$0",
    cadence: "forever",
    tagline: "Everything you need to try Aika.",
    icon: Cherry,
    accent: "text-primary",
    features: [
      "3 free models: kimono-zm, comet-glm, image studio",
      "Unlimited conversations with kimono-zm",
      "50 image generations / month",
      "Standard response speed",
      "Chat history, export & share",
      "Light and midnight sakura themes",
    ],
    cta: "Current tier",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$9.99",
    cadence: "per month",
    tagline: "Unlock kimono-frost — our fastest premium model.",
    icon: Zap,
    accent: "text-accent",
    highlight: true,
    features: [
      "Everything in Basic",
      "Access to kimono-frost — priority-tier speed",
      "300 messages / day on kimono-frost",
      "Priority streaming with lower latency",
      "Unlimited image generations",
      "Longer context window (200K tokens)",
      "File & image uploads",
      "Early access to new features",
    ],
    cta: "Upgrade to Pro",
  },
  {
    id: "super",
    name: "Super",
    price: "$17.99",
    cadence: "per month",
    tagline: "Everything. No limits. Deepest reasoning available.",
    icon: Crown,
    accent: "text-destructive",
    features: [
      "Everything in Pro",
      "Access to kimono-raven — extended-reasoning flagship",
      "Unlimited kimono-frost & kimono-raven messages",
      "Highest-priority routing (always first in queue)",
      "1M-token context window",
      "Advanced Comet build agent (multi-file, agent loops)",
      "AikaUnbound with no rate limits",
      "4K image generation",
      "Voice mode (beta)",
      "Dedicated support",
    ],
    cta: "Go Super",
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { plan, refresh } = usePlan();
  const [activating, setActivating] = useState<PlanTier | null>(null);

  const activate = async (tier: PlanTier) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (tier === "basic") return;
    setActivating(tier);
    const { error } = await supabase
      .from("subscriptions")
      .upsert(
        {
          user_id: user.id,
          plan: tier,
          status: "active",
          activated_at: new Date().toISOString(),
          expires_at: null,
        },
        { onConflict: "user_id" },
      );
    setActivating(null);
    if (error) {
      toast.error("Could not activate plan. Try again.");
      return;
    }
    await refresh();
    toast.success(`Welcome to ${tier === "pro" ? "Pro" : "Super"} 🌸`);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-hero text-foreground grain">
      <SakuraPetals count={16} />
      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-10">
        <Link to="/" className="flex items-center gap-2">
          <Cherry className="h-5 w-5 text-primary" />
          <span className="font-display text-2xl leading-none">
            Aika<span className="text-primary">.</span>
          </span>
        </Link>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </nav>

      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-8 pt-6 text-center md:px-10">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground backdrop-blur">
          <Sparkles className="h-3 w-3" /> plans & pricing
        </div>
        <h1 className="font-display text-5xl leading-[1.02] md:text-7xl">
          Choose your <span className="font-italic-serif text-primary">petal</span>.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
          Three tiers. Beautifully priced. Cancel anytime — nothing locked behind long contracts.
        </p>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24 md:px-10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {TIERS.map((tier) => {
            const Icon = tier.icon;
            const isCurrent = plan === tier.id;
            const disabled = tier.id === "basic" || isCurrent || activating !== null;
            return (
              <div
                key={tier.id}
                className={cn(
                  "relative flex flex-col rounded-3xl border bg-card/50 p-8 backdrop-blur-xl transition-all",
                  tier.highlight
                    ? "border-primary/40 shadow-elegant md:-translate-y-2"
                    : "border-border/60",
                )}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-primary/40 bg-primary px-4 py-1 text-[10px] uppercase tracking-[0.24em] text-primary-foreground">
                    most loved
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Icon className={cn("h-6 w-6", tier.accent)} strokeWidth={1.5} />
                  <h3 className="font-display text-3xl">{tier.name}</h3>
                </div>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="font-display text-5xl">{tier.price}</span>
                  <span className="text-sm text-muted-foreground">/ {tier.cadence}</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{tier.tagline}</p>

                <ul className="mt-8 flex-1 space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className={cn("mt-0.5 h-4 w-4 shrink-0", tier.accent)} />
                      <span className="text-foreground/90">{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => activate(tier.id)}
                  disabled={disabled}
                  variant={tier.highlight ? "default" : "outline"}
                  className="mt-8 h-12 w-full rounded-full text-base"
                >
                  {isCurrent
                    ? "Current plan"
                    : activating === tier.id
                    ? "Activating…"
                    : tier.cta}
                </Button>
                {tier.id !== "basic" && !session && (
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">
                    Sign in required
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-14 max-w-3xl rounded-2xl border border-border/60 bg-card/40 p-6 text-center text-sm text-muted-foreground backdrop-blur">
          <p>
            Prices in USD. Sales tax applied where required. Fair-use limits apply to unlimited tiers to prevent abuse.
            All models run on the <span className="text-foreground">kimono-zm</span> family engine.
          </p>
        </div>
      </section>
    </div>
  );
}