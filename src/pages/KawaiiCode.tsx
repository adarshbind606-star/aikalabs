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
  id?: string;
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (user) loadConversations();
  }, [user]);

  useEffect(() => {
    if (activeConvoId) loadMessages(activeConvoId);
  }, [activeConvoId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [input]);

  const loadConversations = async () => {
    // Reuse the conversations table, filtering by a title prefix for KawaiiCode
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .like("title", "KC:%")
      .order("updated_at", { ascending: false });
    if (data) setConversations(data);
  };

  const loadMessages = async (convoId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convoId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data.map(m => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content })));
  };

  const saveMessage = async (convoId: string, msg: Msg) => {
    if (!user) return;
    const { data } = await supabase.from("messages").insert({
      conversation_id: convoId,
      user_id: user.id,
      role: msg.role,
      content: msg.content,
    }).select().single();
    return data?.id;
  };

  const updateConversationTitle = async (convoId: string, firstMessage: string) => {
    const title = "KC:" + firstMessage.slice(0, 47) + (firstMessage.length > 47 ? "..." : "");
    await supabase.from("conversations").update({ title }).eq("id", convoId);
    setConversations(prev => prev.map(c => c.id === convoId ? { ...c, title } : c));
  };

  const createNewSession = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title: "KC:New Session" })
      .select()
      .single();
    if (data) {
      setConversations(prev => [data, ...prev]);
      setActiveConvoId(data.id);
      setMessages([]);
    }
  };

  const deleteConversation = async (id: string) => {
    await supabase.from("conversations").delete().eq("id", id);
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConvoId === id) {
      setActiveConvoId(null);
      setMessages([]);
    }
  };

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming || !user) return;
    setInput("");

    let convoId = activeConvoId;
    if (!convoId) {
      const { data } = await supabase
        .from("conversations")
        .insert({ user_id: user.id, title: "KC:New Session" })
        .select()
        .single();
      if (!data) return;
      convoId = data.id;
      setConversations(prev => [data, ...prev]);
      setActiveConvoId(convoId);
    }

    const userMsg: Msg = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    const savedUserId = await saveMessage(convoId!, userMsg);
    if (savedUserId) {
      setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, id: savedUserId } : m));
    }

    if (messages.length === 0) {
      await updateConversationTitle(convoId!, text);
    }

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
                if (last?.role === "assistant" && !last.id) {
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

      // Save assistant message
      if (assistantSoFar) {
        const asstId = await saveMessage(convoId!, { role: "assistant", content: assistantSoFar });
        if (asstId) {
          setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, id: asstId } : m));
        }
      }
    } catch {
      toast.error("Connection error");
    }

    setIsStreaming(false);
  }, [input, messages, isStreaming, user, activeConvoId]);

  if (loading) return null;
  if (!session) return <Navigate to="/" replace />;

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      <SakuraPetals count={3} />
      <ChatSidebar
        conversations={conversations}
        activeId={activeConvoId}
        onSelect={setActiveConvoId}
        onNew={createNewSession}
        onDelete={deleteConversation}
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
              <Code2 className="h-4 w-4 text-primary" />
            </div>
            <h2 className="font-display text-base font-semibold text-foreground leading-tight">KawaiiCode</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto text-xs"
            onClick={() => { setActiveConvoId(null); setMessages([]); }}
          >
            New Session
          </Button>
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
            <div className="grid grid-cols-2 gap-2 max-w-2xl w-full px-2">
              {QUICK_ACTIONS.map(({ icon: Icon, label, prompt }) => (
                <button
                  key={label}
                  onClick={() => { setInput(prompt); textareaRef.current?.focus(); }}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-left text-xs sm:text-sm transition-colors hover:bg-accent hover:border-primary/30 group"
                >
                  <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                  <span className="text-foreground font-medium truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 custom-scrollbar">
            <div className="mx-auto max-w-4xl pb-4">
              {messages.map((msg, i) => (
                <KawaiiCodeMessage key={msg.id || i} role={msg.role} content={msg.content} />
              ))}
              {isStreaming && messages[messages.length - 1]?.role !== "assistant" && <KawaiiThinkingIndicator />}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
        )}

        <div className="border-t border-border bg-background/80 backdrop-blur-sm p-2 sm:p-4">
          <div className="mx-auto flex max-w-4xl items-end gap-2 rounded-2xl border border-input bg-card p-1.5 sm:p-2 shadow-sm focus-within:border-primary/40 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Describe what you want to build..."
              rows={1}
              disabled={isStreaming}
              className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
              style={{ maxHeight: "200px" }}
            />
            <Button size="icon" disabled={isStreaming || !input.trim()} onClick={handleSend} className="shrink-0 rounded-xl">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-1 text-center text-[10px] text-muted-foreground">
            KawaiiCode can make mistakes. Review code before production use.
          </p>
        </div>
      </div>
    </div>
  );
}
