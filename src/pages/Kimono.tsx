import { useState, useEffect, useRef, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatMessage, ThinkingIndicator } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { streamChat } from "@/lib/chat-stream";
import { Button } from "@/components/ui/button";
import { Share2, Download, Square, Bird, Snowflake, Brain, Gauge, Sparkles } from "lucide-react";
import { SidebarToggle } from "@/components/SidebarToggle";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import ravenMascot from "@/assets/raven-mascot.png";
import frostMascot from "@/assets/frost-mascot.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Variant = "raven" | "frost";

const DAILY_LIMIT = 100;

const VARIANTS: Record<Variant, {
  name: string;
  tagline: string;
  blurb: string;
  icon: typeof Bird;
  accent: string;
  chip: string;
  glow: string;
  ring: string;
  mascot: string;
  theme: string;
  prompts: string[];
}> = {
  raven: {
    name: "kimono-raven",
    tagline: "Deep reasoning · long-horizon thinking",
    blurb: "Raven takes the hard ones — proofs, strategy, architecture, ambiguous research problems. Slower, deeper, sharper.",
    icon: Bird,
    accent: "from-violet-300 via-fuchsia-300 to-indigo-300",
    chip: "border-violet-400/40 bg-violet-400/10 text-violet-200",
    glow: "bg-[radial-gradient(ellipse_at_top,hsl(270_85%_60%/0.16),transparent_60%),radial-gradient(ellipse_at_bottom_left,hsl(300_70%_55%/0.12),transparent_55%)]",
    ring: "border-violet-400/40 hover:bg-violet-400/10 text-violet-200",
    mascot: ravenMascot,
    theme: "kimono-raven",
    prompts: [
      "Design a fault-tolerant event pipeline for 50k events/sec and justify every trade-off.",
      "Prove or disprove: every bounded sequence has a convergent subsequence.",
      "Stress-test my go-to-market plan and find the three assumptions most likely to be wrong.",
      "Compare three architectures for multi-tenant billing with risks and failure modes.",
    ],
  },
  frost: {
    name: "kimono-frost",
    tagline: "Crystal clarity · instant answers",
    blurb: "Frost is the fast, immaculate one — clean explanations, tight code, structured summaries, zero padding.",
    icon: Snowflake,
    accent: "from-cyan-200 via-sky-300 to-teal-200",
    chip: "border-cyan-400/40 bg-cyan-400/10 text-cyan-200",
    glow: "bg-[radial-gradient(ellipse_at_top,hsl(190_90%_60%/0.16),transparent_60%),radial-gradient(ellipse_at_bottom_right,hsl(170_75%_55%/0.12),transparent_55%)]",
    ring: "border-cyan-400/40 hover:bg-cyan-400/10 text-cyan-200",
    mascot: frostMascot,
    theme: "kimono-frost",
    prompts: [
      "Explain vector databases in 150 words with one table.",
      "Summarize this into 5 bullets and a next-action list.",
      "Write a typed React hook for debounced search with tests.",
      "Turn these messy notes into a clean project brief.",
    ],
  },
};

interface Msg {
  id?: string;
  role: "user" | "assistant";
  content: string;
  image_url?: string | null;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export default function Kimono() {
  const { session, user, loading } = useAuth();
  const [variant, setVariant] = useState<Variant>(() => (localStorage.getItem("kimono-variant") as Variant) || "raven");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarHidden, setDesktopSidebarHidden] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const meta = VARIANTS[variant];
  const Icon = meta.icon;

  useEffect(() => { localStorage.setItem("kimono-variant", variant); }, [variant]);
  useEffect(() => { if (user) { loadConversations(); loadUsage(); setActiveConvoId(null); setMessages([]); } }, [user, variant]);
  useEffect(() => { if (activeConvoId) loadMessages(activeConvoId); }, [activeConvoId]);
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const loadUsage = async () => {
    const { data } = await supabase.rpc("get_model_usage", { _model: VARIANTS[variant].name, _limit: DAILY_LIMIT });
    const row = Array.isArray(data) ? data[0] : data;
    if (row) setRemaining((row as { remaining: number }).remaining);
  };

  const loadConversations = async () => {
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .eq("mode", variant)
      .order("updated_at", { ascending: false });
    if (data) setConversations(data);
  };

  const loadMessages = async (convoId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convoId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data.map(m => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content, image_url: m.image_url })));
  };

  const newTitle = () => (variant === "raven" ? "New Raven Thread" : "New Frost Thread");

  const createConversation = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title: newTitle(), mode: variant })
      .select().single();
    if (data) {
      setConversations(prev => [data, ...prev]);
      setActiveConvoId(data.id);
      setMessages([]);
    }
  };

  const deleteConversation = async (id: string) => {
    await supabase.from("conversations").delete().eq("id", id);
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConvoId === id) { setActiveConvoId(null); setMessages([]); }
  };

  const saveMessage = async (convoId: string, msg: Msg) => {
    if (!user) return;
    const { data } = await supabase.from("messages").insert({
      conversation_id: convoId,
      user_id: user.id,
      role: msg.role,
      content: msg.content,
      image_url: msg.image_url || null,
    }).select().single();
    return data;
  };

  const updateConversationTitle = async (convoId: string, firstMessage: string) => {
    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "");
    await supabase.from("conversations").update({ title }).eq("id", convoId);
    setConversations(prev => prev.map(c => c.id === convoId ? { ...c, title } : c));
  };

  const streamResponse = useCallback(async (convoId: string, chatMessages: Msg[]) => {
    setIsStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;
    let assistantSoFar = "";
    const chatHistory = chatMessages.map(m => {
      if (m.image_url) {
        return {
          role: m.role as "user" | "assistant",
          content: [
            ...(m.content ? [{ type: "text" as const, text: m.content }] : []),
            { type: "image_url" as const, image_url: { url: m.image_url } },
          ],
        };
      }
      return { role: m.role as "user" | "assistant", content: m.content };
    });
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && !last.id) {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };
    try {
      await streamChat({
        mode: variant,
        messages: chatHistory,
        signal: controller.signal,
        onMeta: (m) => { if (typeof m.remaining === "number") setRemaining(m.remaining); },
        onDelta: upsertAssistant,
        onDone: async () => {
          setIsStreaming(false);
          if (assistantSoFar) await saveMessage(convoId, { role: "assistant", content: assistantSoFar });
        },
        onError: (err) => { setIsStreaming(false); toast.error(err); loadUsage(); },
      });
    } catch {
      setIsStreaming(false);
      if (assistantSoFar) await saveMessage(convoId, { role: "assistant", content: assistantSoFar });
    } finally {
      abortRef.current = null;
    }
  }, [user, variant]);

  const stopStreaming = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  };

  const handleSend = useCallback(async (input: string, imageBase64?: string) => {
    if (!user || isStreaming) return;
    let convoId = activeConvoId;
    if (!convoId) {
      const { data } = await supabase
        .from("conversations")
        .insert({ user_id: user.id, title: newTitle(), mode: variant })
        .select().single();
      if (!data) return;
      convoId = data.id;
      setConversations(prev => [data, ...prev]);
      setActiveConvoId(convoId);
    }
    const userMsg: Msg = { role: "user", content: input, image_url: imageBase64 || null };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    await saveMessage(convoId!, userMsg);
    if (messages.length === 0) await updateConversationTitle(convoId!, input);
    await streamResponse(convoId!, newMessages);
  }, [user, activeConvoId, messages, isStreaming, streamResponse, variant]);

  const handleEditMessage = useCallback(async (index: number, newContent: string) => {
    if (!activeConvoId || !user || isStreaming) return;
    const msgsToDelete = messages.slice(index).filter(m => m.id);
    for (const msg of msgsToDelete) if (msg.id) await supabase.from("messages").delete().eq("id", msg.id);
    const edited: Msg = { role: "user", content: newContent, image_url: messages[index].image_url };
    const newMessages = [...messages.slice(0, index), edited];
    setMessages(newMessages);
    await saveMessage(activeConvoId, edited);
    await streamResponse(activeConvoId, newMessages);
  }, [activeConvoId, user, messages, isStreaming, streamResponse]);

  const handleResendMessage = useCallback(async (index: number) => {
    if (!activeConvoId || !user || isStreaming) return;
    const msgsToDelete = messages.slice(index + 1).filter(m => m.id);
    for (const msg of msgsToDelete) if (msg.id) await supabase.from("messages").delete().eq("id", msg.id);
    const newMessages = messages.slice(0, index + 1);
    setMessages(newMessages);
    await streamResponse(activeConvoId, newMessages);
  }, [activeConvoId, user, messages, isStreaming, streamResponse]);

  const transcript = () => messages.map(m => `${m.role === "user" ? "You" : meta.name}: ${m.content}`).join("\n\n");

  const handleShareChat = () => {
    if (!messages.length) return;
    navigator.clipboard.writeText(transcript());
    toast.success("Thread copied to clipboard");
  };

  const handleDownloadChat = () => {
    if (!messages.length) return;
    const blob = new Blob([transcript()], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${meta.name}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Thread downloaded");
  };

  if (loading) return null;
  if (!session) return <Navigate to="/" replace />;

  const usedPct = remaining === null ? 0 : ((DAILY_LIMIT - remaining) / DAILY_LIMIT) * 100;

  return (
    <div className={cn("kimono-theme relative flex h-screen overflow-hidden bg-background", meta.theme)}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="kimono-aurora" />
        <div className="kimono-beam" />
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={`${variant}-${i}`}
            className="kimono-particle"
            style={{
              left: `${(i * 7.3) % 100}%`,
              width: variant === "raven" ? 6 : 4,
              height: variant === "raven" ? 10 : 4,
              animationDuration: `${9 + (i % 6) * 2.5}s`,
              animationDelay: `${(i % 8) * 1.3}s`,
            }}
          />
        ))}
      </div>
      <ChatSidebar
        conversations={conversations}
        activeId={activeConvoId}
        onSelect={setActiveConvoId}
        onNew={createConversation}
        onDelete={deleteConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        desktopHidden={desktopSidebarHidden}
        activePage="kimono"
      />

      <div className="relative z-10 flex flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-2 border-b border-border bg-background/70 px-3 py-2.5 backdrop-blur-md sm:gap-3 sm:px-4 sm:py-3">
          <SidebarToggle
            mobileOpen={sidebarOpen}
            onMobileToggle={() => setSidebarOpen((v) => !v)}
            desktopHidden={desktopSidebarHidden}
            onDesktopToggle={() => setDesktopSidebarHidden((v) => !v)}
          />
          <img
            src={meta.mascot}
            alt={`${meta.name} mascot`}
            loading="lazy"
            className="mascot-avatar h-8 w-8 shrink-0 rounded-full border border-primary/30 object-cover object-top"
          />
          <h2 className={cn("font-display text-base bg-gradient-to-r bg-clip-text text-transparent sm:text-lg", meta.accent)}>
            Kimono Labs
          </h2>
          <span className={cn("hidden rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider sm:inline", meta.chip)}>
            {meta.name}
          </span>
          <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
            Free
          </span>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <span className="text-[10px] text-muted-foreground sm:hidden">{remaining ?? "–"}/{DAILY_LIMIT}</span>
            <div className="hidden min-w-[140px] sm:block">
              <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><Gauge className="h-3 w-3" /> Today</span>
                <span>{remaining ?? "–"}/{DAILY_LIMIT} left</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-all", variant === "raven" ? "bg-violet-400" : "bg-cyan-300")}
                  style={{ width: `${100 - usedPct}%` }}
                />
              </div>
            </div>
            {activeConvoId && messages.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon"><Share2 className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleShareChat}><Share2 className="mr-2 h-4 w-4" /> Copy thread</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadChat}><Download className="mr-2 h-4 w-4" /> Download</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>

        <div className="flex gap-2 border-b border-border bg-background/50 px-3 py-2 backdrop-blur-sm sm:px-4">
          {(Object.keys(VARIANTS) as Variant[]).map((v) => {
            const V = VARIANTS[v];
            const VIcon = V.icon;
            const active = v === variant;
            return (
              <button
                key={v}
                onClick={() => !isStreaming && setVariant(v)}
                disabled={isStreaming}
                className={cn(
                  "flex flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all disabled:opacity-50",
                  active
                    ? v === "raven"
                      ? "border-violet-400/60 bg-violet-400/10 shadow-[0_0_24px_-8px_hsl(270_85%_60%/0.6)]"
                      : "border-cyan-400/60 bg-cyan-400/10 shadow-[0_0_24px_-8px_hsl(190_90%_60%/0.6)]"
                    : "border-border hover:bg-muted/50"
                )}
              >
                <VIcon className={cn("h-4 w-4 shrink-0", v === "raven" ? "text-violet-300" : "text-cyan-200")} />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold">{V.name}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">{V.tagline}</span>
                </span>
              </button>
            );
          })}
        </div>

        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-3xl px-2 py-4 sm:px-4 sm:py-6">
            {messages.length === 0 ? (
              <div key={variant} className="kimono-swap flex flex-col items-center gap-6 py-10 text-center">
                <img
                  src={meta.mascot}
                  alt={`${meta.name} anime mascot`}
                  width={768}
                  height={1024}
                  loading="lazy"
                  className="kimono-mascot h-52 w-auto sm:h-72"
                />
                <div className="kimono-pulse-ring flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className={cn("font-display text-3xl bg-gradient-to-r bg-clip-text text-transparent", meta.accent)}>
                    {meta.name}
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{meta.blurb}</p>
                  <p className="mt-3 inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] text-emerald-300">
                    <Sparkles className="h-3 w-3" /> Free · {DAILY_LIMIT} messages per day · resets 00:00 UTC
                  </p>
                </div>
                <div className="grid w-full gap-2 sm:grid-cols-2">
                  {meta.prompts.map((p) => (
                    <button
                      key={p}
                      onClick={() => handleSend(p)}
                      className={cn(
                        "rounded-xl border bg-card/60 p-3 text-left text-xs text-muted-foreground transition-colors",
                        variant === "raven" ? "hover:border-violet-400/50 hover:text-violet-100" : "hover:border-cyan-400/50 hover:text-cyan-100"
                      )}
                    >
                      <Brain className="mb-1.5 h-3.5 w-3.5 opacity-60" />
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="pointer-events-none fixed bottom-28 right-4 z-20 hidden lg:block">
                  <img
                    key={variant}
                    src={meta.mascot}
                    alt={`${meta.name} mascot companion`}
                    loading="lazy"
                    className="mascot-companion kimono-swap h-44 w-auto opacity-80"
                  />
                </div>
                {messages.map((m, i) => (
                  <ChatMessage
                    key={m.id || i}
                    role={m.role}
                    content={m.content}
                    imageUrl={m.image_url}
                    avatar={m.role === "assistant" ? meta.mascot : undefined}
                    avatarAlt={`${meta.name} mascot`}
                    onEdit={m.role === "user" ? (c) => handleEditMessage(i, c) : undefined}
                    onResend={m.role === "user" ? () => handleResendMessage(i) : undefined}
                  />
                ))}
                {isStreaming && messages[messages.length - 1]?.role === "user" && (
                  <ThinkingIndicator avatar={meta.mascot} name={meta.name} />
                )}
              </>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {isStreaming && (
          <div className="flex justify-center pb-2">
            <Button variant="outline" size="sm" onClick={stopStreaming} className="gap-2">
              <Square className="h-3 w-3" /> Stop generating
            </Button>
          </div>
        )}

        <ChatInput onSend={handleSend} disabled={isStreaming || remaining === 0} />
      </div>
    </div>
  );
}
