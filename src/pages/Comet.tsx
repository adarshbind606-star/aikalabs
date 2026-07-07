import { useState, useEffect, useRef, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatMessage, ThinkingIndicator } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { streamChat } from "@/lib/chat-stream";
import { Button } from "@/components/ui/button";
import { Share2, Download, Code2, Zap, Sparkles, Terminal, GitBranch, Bug } from "lucide-react";
import { CometLogo } from "@/components/CometLogo";
import { SidebarToggle } from "@/components/SidebarToggle";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

export default function Comet() {
  const { session, user, loading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarHidden, setDesktopSidebarHidden] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (user) loadConversations(); }, [user]);
  useEffect(() => { if (activeConvoId) loadMessages(activeConvoId); }, [activeConvoId]);
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const loadConversations = async () => {
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .eq("mode", "comet")
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

  const createConversation = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title: "New Comet Session", mode: "comet" })
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
    await streamChat({
      mode: "comet",
      messages: chatHistory,
      onDelta: upsertAssistant,
      onDone: async () => {
        setIsStreaming(false);
        if (assistantSoFar) await saveMessage(convoId, { role: "assistant", content: assistantSoFar });
      },
      onError: (err) => { setIsStreaming(false); toast.error(err); },
    });
  }, [user]);

  const handleSend = useCallback(async (input: string, imageBase64?: string) => {
    if (!user || isStreaming) return;
    let convoId = activeConvoId;
    if (!convoId) {
      const { data } = await supabase
        .from("conversations")
        .insert({ user_id: user.id, title: "New Comet Session", mode: "comet" })
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
  }, [user, activeConvoId, messages, isStreaming, streamResponse]);

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

  const handleShareChat = () => {
    if (messages.length === 0) return;
    const text = messages.map(m => `${m.role === "user" ? "You" : "Comet"}: ${m.content}`).join("\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Session copied to clipboard");
  };

  const handleDownloadChat = () => {
    if (messages.length === 0) return;
    const text = messages.map(m => `${m.role === "user" ? "You" : "Comet"}: ${m.content}`).join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comet-session-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Session downloaded");
  };

  if (loading) return null;
  if (!session) return <Navigate to="/" replace />;

  return (
    <div className="comet-theme relative flex h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(200_90%_55%/0.10),transparent_60%),radial-gradient(ellipse_at_bottom_right,hsl(260_80%_60%/0.10),transparent_55%)]" />
      <ChatSidebar
        conversations={conversations}
        activeId={activeConvoId}
        onSelect={setActiveConvoId}
        onNew={createConversation}
        onDelete={deleteConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        desktopHidden={desktopSidebarHidden}
        activePage="comet"
      />

      <div className="relative z-10 flex flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-sm">
          <SidebarToggle
            mobileOpen={sidebarOpen}
            onMobileToggle={() => setSidebarOpen((v) => !v)}
            desktopHidden={desktopSidebarHidden}
            onDesktopToggle={() => setDesktopSidebarHidden((v) => !v)}
          />
          <CometLogo size={28} />
          <h2 className="font-display text-lg bg-gradient-to-r from-sky-300 to-violet-300 bg-clip-text text-transparent">Comet</h2>
          <span className="rounded-full border border-sky-400/40 bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-300">
            comet-glm
          </span>
          <div className="ml-auto">
            {activeConvoId && messages.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon"><Share2 className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleShareChat}>
                    <Share2 className="h-4 w-4 mr-2" /> Copy to clipboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadChat}>
                    <Download className="h-4 w-4 mr-2" /> Download as text
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>

        {!activeConvoId && messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 p-8">
            <div className="relative">
              <div className="absolute -inset-6 rounded-full bg-gradient-to-br from-sky-500/25 to-violet-500/25 blur-3xl" />
              <CometLogo size={96} className="comet-lg relative" />
            </div>
            <h2 className="font-display text-3xl bg-gradient-to-r from-sky-300 via-fuchsia-300 to-violet-300 bg-clip-text text-transparent">
              Comet is ready to build.
            </h2>
            <p className="max-w-md text-center text-muted-foreground">
              A GLM-family agent for shipping software. Scaffold projects, refactor at scale, debug root causes, design APIs — end to end.
            </p>
            <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { icon: Code2, title: "Scaffold a full-stack app", body: "Next.js + Postgres + auth, file tree included" },
                { icon: Bug, title: "Diagnose a failing test", body: "root cause, patch, and regression guard" },
                { icon: GitBranch, title: "Plan a refactor", body: "step-by-step diff plan across files" },
                { icon: Terminal, title: "Write a shell one-liner", body: "explain each flag" },
                { icon: Zap, title: "Optimize this SQL query", body: "with an EXPLAIN walkthrough" },
                { icon: Sparkles, title: "Design a REST + webhook API", body: "schemas, errors, idempotency keys" },
              ].map((s) => (
                <button
                  key={s.title}
                  onClick={() => handleSend(`${s.title} ${s.body}`)}
                  className="group flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-4 text-left transition-colors hover:border-sky-400/50 hover:bg-card"
                >
                  <s.icon className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{s.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{s.body}</div>
                  </div>
                </button>
              ))}
            </div>
            <Button onClick={createConversation} className="mt-2 gap-2 bg-gradient-to-r from-sky-500 to-violet-500 text-white hover:opacity-90">
              <Sparkles className="h-4 w-4" /> Start a Comet Session
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1">
              <div className="mx-auto max-w-3xl pb-4">
                {messages.map((msg, i) => (
                  <ChatMessage
                    key={i}
                    role={msg.role}
                    content={msg.content}
                    imageUrl={msg.image_url}
                    onEdit={msg.role === "user" && !isStreaming ? (newContent) => handleEditMessage(i, newContent) : undefined}
                    onResend={msg.role === "user" && !isStreaming ? () => handleResendMessage(i) : undefined}
                  />
                ))}
                {isStreaming && messages[messages.length - 1]?.role !== "assistant" && <ThinkingIndicator />}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>
            <ChatInput onSend={handleSend} disabled={isStreaming} />
          </>
        )}
      </div>
    </div>
  );
}