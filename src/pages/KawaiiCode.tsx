import { useState, useEffect, useRef, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChatSidebar } from "@/components/ChatSidebar";
import { KawaiiCodeMessage, KawaiiThinkingIndicator } from "@/components/KawaiiCodeMessage";
import { SakuraPetals } from "@/components/SakuraPetals";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Menu, Code2, Send, Sparkles, Bug, BookOpen, Zap, GitBranch, FlaskConical } from "lucide-react";
import { toast } from "sonner";

const CODE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kawaii-code`;

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const QUICK_ACTIONS = [
  { icon: Sparkles, label: "Build a project", prompt: "Build me a complete React todo app with TypeScript, local storage persistence, and animations" },
  { icon: Bug, label: "Debug code", prompt: "Help me debug this code. Here's the error I'm getting:" },
  { icon: BookOpen, label: "Explain concept", prompt: "Explain how async/await works in JavaScript with practical examples" },
  { icon: Zap, label: "Optimize code", prompt: "Review and optimize this code for performance:" },
  { icon: GitBranch, label: "Design an API", prompt: "Design a RESTful API for a blog platform with users, posts, and comments" },
  { icon: FlaskConical, label: "Write tests", prompt: "Write comprehensive unit tests for this function:" },
];

export default function KawaiiCode() {
  const { session, user, loading } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [input]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming || !user) return;
    setInput("");

    const userMsg: Msg = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);

    let assistantSoFar = "";

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const accessToken = currentSession?.access_token;

      const resp = await fetch(CODE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (resp.status === 429) { toast.error("Rate limit exceeded. Please wait."); setIsStreaming(false); return; }
      if (resp.status === 402) { toast.error("AI usage limit reached."); setIsStreaming(false); return; }
      if (resp.status === 401) { toast.error("Please log in to use KawaiiCode."); setIsStreaming(false); return; }
      if (!resp.ok || !resp.body) { toast.error("Failed to get response."); setIsStreaming(false); return; }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch {
      toast.error("Connection error");
    }

    setIsStreaming(false);
  }, [input, messages, isStreaming, user]);

  if (loading) return null;
  if (!session) return <Navigate to="/" replace />;

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      <SakuraPetals count={3} />
      <ChatSidebar
        conversations={[]}
        activeId={null}
        onSelect={() => {}}
        onNew={() => {}}
        onDelete={() => {}}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activePage="code"
      />

      <div className="relative z-10 flex flex-1 flex-col kawaii-code">
        <header className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-sm">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Code2 className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-foreground leading-tight">KawaiiCode</h2>
              <p className="text-[10px] text-muted-foreground leading-tight">Powered by kimono-zm • Codex-class agent</p>
            </div>
          </div>
          {messages.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="ml-auto text-xs"
              onClick={() => setMessages([])}
            >
              New Session
            </Button>
          )}
        </header>

        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
              <Code2 className="h-10 w-10 text-primary" />
            </div>
            <div className="text-center">
              <h2 className="font-display text-2xl font-semibold text-foreground">KawaiiCode ✨</h2>
              <p className="mt-1.5 max-w-lg text-sm text-muted-foreground">
                Your Codex-class coding agent. I build full projects, debug issues, write tests, design APIs, and review code — all with production quality 🌸
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-2xl w-full">
              {QUICK_ACTIONS.map(({ icon: Icon, label, prompt }) => (
                <button
                  key={label}
                  onClick={() => { setInput(prompt); textareaRef.current?.focus(); }}
                  className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3 text-left text-sm transition-colors hover:bg-accent hover:border-primary/30 group"
                >
                  <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                  <span className="text-foreground font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 custom-scrollbar">
            <div className="mx-auto max-w-4xl pb-4">
              {messages.map((msg, i) => (
                <KawaiiCodeMessage key={i} role={msg.role} content={msg.content} />
              ))}
              {isStreaming && messages[messages.length - 1]?.role !== "assistant" && <KawaiiThinkingIndicator />}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
        )}

        <div className="border-t border-border bg-background/80 backdrop-blur-sm p-4">
          <div className="mx-auto flex max-w-4xl items-end gap-2 rounded-2xl border border-input bg-card p-2 shadow-sm focus-within:border-primary/40 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Describe what you want to build, fix, or understand..."
              rows={1}
              disabled={isStreaming}
              className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
              style={{ maxHeight: "200px" }}
            />
            <Button size="icon" disabled={isStreaming || !input.trim()} onClick={handleSend} className="shrink-0 rounded-xl">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            KawaiiCode can make mistakes. Always review generated code before using in production.
          </p>
        </div>
      </div>
    </div>
  );
}
