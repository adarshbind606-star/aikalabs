import { useState, useEffect, useRef, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatMessage, ThinkingIndicator } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { SakuraPetals } from "@/components/SakuraPetals";
import { streamChat } from "@/lib/chat-stream";
import { Button } from "@/components/ui/button";
import { Cherry, Share2, Download, BookOpen, Code2, Search, Palette } from "lucide-react";
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

const QUICK_ACTIONS = [
  { label: "Study", emoji: "📚", icon: BookOpen, hint: "Explain or quiz me", prompt: "Help me study — explain a topic step by step and quiz me on it." },
  { label: "Code", emoji: "💻", icon: Code2, hint: "Build & debug", prompt: "Help me write and debug some code." },
  { label: "Research", emoji: "🔎", icon: Search, hint: "Dig into a topic", prompt: "Research a topic for me and summarise the key findings." },
  { label: "Create", emoji: "🎨", icon: Palette, hint: "Ideas & stories", prompt: "Let's create something — brainstorm creative ideas with me." },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return { text: "Still awake", emoji: "🌙" };
  if (h < 12) return { text: "Good morning", emoji: "🌸" };
  if (h < 17) return { text: "Good afternoon", emoji: "☀️" };
  if (h < 22) return { text: "Good evening", emoji: "🌇" };
  return { text: "Good night", emoji: "🌙" };
}

export default function Chat() {
  const { session, user, loading } = useAuth();
  const [displayName, setDisplayName] = useState<string>("");
  const greeting = getGreeting();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarHidden, setDesktopSidebarHidden] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) loadConversations();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        setDisplayName(data?.display_name || user.email?.split("@")[0] || "");
      });
  }, [user]);

  useEffect(() => {
    if (activeConvoId) loadMessages(activeConvoId);
  }, [activeConvoId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .eq("mode", "aika")
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
      .insert({ user_id: user.id, title: "New Conversation", mode: "aika" })
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
      messages: chatHistory,
      onDelta: upsertAssistant,
      onDone: async () => {
        setIsStreaming(false);
        if (assistantSoFar) {
          await saveMessage(convoId, { role: "assistant", content: assistantSoFar });
        }
      },
      onError: (err) => {
        setIsStreaming(false);
        toast.error(err);
      },
    });
  }, [user]);

  const handleSend = useCallback(async (input: string, imageBase64?: string) => {
    if (!user || isStreaming) return;

    let convoId = activeConvoId;
    if (!convoId) {
      const { data } = await supabase
        .from("conversations")
        .insert({ user_id: user.id, title: "New Conversation", mode: "aika" })
        .select()
        .single();
      if (!data) return;
      convoId = data.id;
      setConversations(prev => [data, ...prev]);
      setActiveConvoId(convoId);
    }

    const userMsg: Msg = { role: "user", content: input, image_url: imageBase64 || null };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    await saveMessage(convoId!, userMsg);

    if (messages.length === 0) {
      await updateConversationTitle(convoId!, input);
    }

    await streamResponse(convoId!, newMessages);
  }, [user, activeConvoId, messages, isStreaming, streamResponse]);

  const handleEditMessage = useCallback(async (index: number, newContent: string) => {
    if (!activeConvoId || !user || isStreaming) return;

    // Delete all messages from this index onward in DB
    const msgsToDelete = messages.slice(index).filter(m => m.id);
    for (const msg of msgsToDelete) {
      if (msg.id) await supabase.from("messages").delete().eq("id", msg.id);
    }

    // Update local messages: keep up to index, replace with edited
    const edited: Msg = { role: "user", content: newContent, image_url: messages[index].image_url };
    const newMessages = [...messages.slice(0, index), edited];
    setMessages(newMessages);
    await saveMessage(activeConvoId, edited);
    await streamResponse(activeConvoId, newMessages);
  }, [activeConvoId, user, messages, isStreaming, streamResponse]);

  const handleResendMessage = useCallback(async (index: number) => {
    if (!activeConvoId || !user || isStreaming) return;

    // Delete all messages after this one in DB
    const msgsToDelete = messages.slice(index + 1).filter(m => m.id);
    for (const msg of msgsToDelete) {
      if (msg.id) await supabase.from("messages").delete().eq("id", msg.id);
    }

    const newMessages = messages.slice(0, index + 1);
    setMessages(newMessages);
    await streamResponse(activeConvoId, newMessages);
  }, [activeConvoId, user, messages, isStreaming, streamResponse]);

  const handleShareChat = () => {
    if (messages.length === 0) return;
    const text = messages.map(m => `${m.role === "user" ? "You" : "Aika"}: ${m.content}`).join("\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Chat copied to clipboard! 🌸");
  };

  const handleDownloadChat = () => {
    if (messages.length === 0) return;
    const text = messages.map(m => `${m.role === "user" ? "You" : "Aika"}: ${m.content}`).join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aika-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Chat downloaded! 🌸");
  };

  if (loading) return null;
  if (!session) return <Navigate to="/" replace />;

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      <SakuraPetals count={8} />
      <ChatSidebar
        conversations={conversations}
        activeId={activeConvoId}
        onSelect={setActiveConvoId}
        onNew={createConversation}
        onDelete={deleteConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        desktopHidden={desktopSidebarHidden}
        activePage="chat"
      />

      <div className="relative z-10 flex flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-sm">
          <SidebarToggle
            mobileOpen={sidebarOpen}
            onMobileToggle={() => setSidebarOpen((v) => !v)}
            desktopHidden={desktopSidebarHidden}
            onDesktopToggle={() => setDesktopSidebarHidden((v) => !v)}
          />
          <Cherry className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg text-primary">Aika-AI 2.1</h2>
          <div className="ml-auto">
            {activeConvoId && messages.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Share2 className="h-4 w-4" />
                  </Button>
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
          <>
            <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 kimono-pulse-ring">
                <Cherry className="h-9 w-9 text-primary" />
              </div>
              <div className="space-y-2 text-center">
                <h2 className="font-display text-3xl text-primary sm:text-4xl">
                  {greeting.emoji} {greeting.text}{displayName ? `, ${displayName}` : ""}!
                </h2>
                <p className="text-muted-foreground">What shall we do today?</p>
              </div>
              <div className="grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
                {QUICK_ACTIONS.map((a) => (
                  <button
                    key={a.label}
                    onClick={() => handleSend(a.prompt)}
                    className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card/60 p-4 text-center transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-elegant"
                  >
                    <a.icon className="h-5 w-5 text-primary transition-transform group-hover:scale-110" />
                    <span className="text-sm font-medium text-foreground">{a.emoji} {a.label}</span>
                    <span className="text-[11px] leading-tight text-muted-foreground">{a.hint}</span>
                  </button>
                ))}
              </div>
            </div>
            <ChatInput onSend={handleSend} disabled={isStreaming} />
          </>
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
