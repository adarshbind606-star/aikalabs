import { useState, useEffect, useRef, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatMessage, ThinkingIndicator } from "@/components/ChatMessage";
import { SakuraPetals } from "@/components/SakuraPetals";
import { Button } from "@/components/ui/button";
import { Menu, Code2, Send } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

const CODE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kawaii-code`;

interface Msg {
  role: "user" | "assistant";
  content: string;
}

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

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming || !user) return;
    setInput("");

    const userMsg: Msg = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);

    let assistantSoFar = "";

    try {
      const resp = await fetch(CODE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (resp.status === 429) { toast.error("Rate limit exceeded. Please wait."); setIsStreaming(false); return; }
      if (resp.status === 402) { toast.error("AI usage limit reached."); setIsStreaming(false); return; }
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
      <SakuraPetals count={4} />
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
          <Code2 className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg text-primary">KawaiiCode</h2>
          <span className="text-xs text-muted-foreground">AI Code Assistant</span>
        </header>

        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Code2 className="h-12 w-12 text-primary" />
            </div>
            <h2 className="font-display text-2xl text-primary">KawaiiCode ✨</h2>
            <p className="max-w-md text-center text-muted-foreground">
              Your anime-powered coding assistant! Ask me to write, debug, or explain any code 🌸
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
              {["Write a React component", "Debug my Python code", "Explain async/await", "Build a REST API"].map(s => (
                <Button key={s} variant="outline" size="sm" onClick={() => { setInput(s); textareaRef.current?.focus(); }}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 custom-scrollbar">
            <div className="mx-auto max-w-3xl pb-4">
              {messages.map((msg, i) => (
                <ChatMessage key={i} role={msg.role} content={msg.content} />
              ))}
              {isStreaming && messages[messages.length - 1]?.role !== "assistant" && <ThinkingIndicator />}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
        )}

        <div className="border-t border-border bg-background p-4">
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-input bg-card p-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask KawaiiCode anything about programming..."
              rows={2}
              disabled={isStreaming}
              className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm font-mono outline-none placeholder:text-muted-foreground disabled:opacity-50"
            />
            <Button size="icon" disabled={isStreaming || !input.trim()} onClick={handleSend} className="shrink-0 rounded-xl">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
