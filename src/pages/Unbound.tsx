import { useState, useEffect, useRef, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatMessage, ThinkingIndicator } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { streamChat } from "@/lib/chat-stream";
import { Button } from "@/components/ui/button";
import { Flame, Share2, Download, AlertTriangle, Loader2 } from "lucide-react";
import { SidebarToggle } from "@/components/SidebarToggle";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

const ACK_KEY = "aika-unbound-acknowledged";

export default function Unbound() {
  const { session, user, loading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarHidden, setDesktopSidebarHidden] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Warning + loading flow
  const [showWarning, setShowWarning] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    const ack = sessionStorage.getItem(ACK_KEY) === "1";
    if (ack) {
      setAcknowledged(true);
      // brief boot animation
      const t = setTimeout(() => setBootLoading(false), 1200);
      return () => clearTimeout(t);
    } else {
      setShowWarning(true);
      setBootLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && acknowledged) loadConversations();
  }, [user, acknowledged]);

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
      .eq("mode", "unbound")
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
      .insert({ user_id: user.id, title: "New Unbound Chat", mode: "unbound" })
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
      mode: "unbound",
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
        .insert({ user_id: user.id, title: "New Unbound Chat", mode: "unbound" })
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
    const msgsToDelete = messages.slice(index).filter(m => m.id);
    for (const msg of msgsToDelete) {
      if (msg.id) await supabase.from("messages").delete().eq("id", msg.id);
    }
    const edited: Msg = { role: "user", content: newContent, image_url: messages[index].image_url };
    const newMessages = [...messages.slice(0, index), edited];
    setMessages(newMessages);
    await saveMessage(activeConvoId, edited);
    await streamResponse(activeConvoId, newMessages);
  }, [activeConvoId, user, messages, isStreaming, streamResponse]);

  const handleResendMessage = useCallback(async (index: number) => {
    if (!activeConvoId || !user || isStreaming) return;
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
    const text = messages.map(m => `${m.role === "user" ? "You" : "AikaUnbound"}: ${m.content}`).join("\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Chat copied to clipboard");
  };

  const handleDownloadChat = () => {
    if (messages.length === 0) return;
    const text = messages.map(m => `${m.role === "user" ? "You" : "AikaUnbound"}: ${m.content}`).join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aika-unbound-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Chat downloaded");
  };

  const handleAcknowledge = () => {
    sessionStorage.setItem(ACK_KEY, "1");
    setShowWarning(false);
    setAcknowledged(true);
    setBootLoading(true);
    setTimeout(() => setBootLoading(false), 1800);
  };

  if (loading) return null;
  if (!session) return <Navigate to="/" replace />;

  // Warning gate (renders before anything else)
  if (showWarning) {
    return (
      <div className="unbound-theme relative flex h-screen items-center justify-center overflow-hidden bg-background">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--destructive)/0.15),transparent_70%)]" />
        <AlertDialog open={showWarning} onOpenChange={() => { /* gated */ }}>
          <AlertDialogContent className="border-destructive/40">
            <AlertDialogHeader>
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15">
                <AlertTriangle className="h-7 w-7 text-destructive" />
              </div>
              <AlertDialogTitle className="text-center font-display text-2xl text-destructive">
                Entering AikaUnbound
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3 pt-2 text-center">
                <span className="block">
                  AikaUnbound is the unrestricted, uncensored alter-ego of Aika.
                  She speaks bluntly and answers nearly anything without sugar-coating.
                </span>
                <span className="block text-sm">
                  Responses may include mature themes, dark humor, and edgy opinions.
                  Continue only if you're 18+ and comfortable with that.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => window.history.back()}>Take me back</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleAcknowledge}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                I understand, enter
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Boot loading screen
  if (bootLoading) {
    return (
      <div className="unbound-theme relative flex h-screen flex-col items-center justify-center gap-6 overflow-hidden bg-background">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--destructive)/0.18),transparent_70%)]" />
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-destructive/30" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-destructive/15 ring-1 ring-destructive/40">
            <Flame className="h-10 w-10 text-destructive" />
          </div>
        </div>
        <div className="text-center">
          <h1 className="font-display text-2xl text-destructive">Awakening AikaUnbound…</h1>
          <p className="mt-1 text-sm text-muted-foreground">Loading kimono-zm-unbound model</p>
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-destructive" />
      </div>
    );
  }

  return (
    <div className="unbound-theme relative flex h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--destructive)/0.10),transparent_60%)]" />
      <ChatSidebar
        conversations={conversations}
        activeId={activeConvoId}
        onSelect={setActiveConvoId}
        onNew={createConversation}
        onDelete={deleteConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        desktopHidden={desktopSidebarHidden}
        activePage="unbound"
      />

      <div className="relative z-10 flex flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-destructive/30 bg-background/80 px-4 py-3 backdrop-blur-sm">
          <SidebarToggle
            mobileOpen={sidebarOpen}
            onMobileToggle={() => setSidebarOpen((v) => !v)}
            desktopHidden={desktopSidebarHidden}
            onDesktopToggle={() => setDesktopSidebarHidden((v) => !v)}
          />
          <Flame className="h-5 w-5 text-destructive" />
          <h2 className="font-display text-lg text-destructive">AikaUnbound</h2>
          <span className="rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive">
            uncensored
          </span>
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
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/15 ring-1 ring-destructive/40">
              <Flame className="h-10 w-10 text-destructive" />
            </div>
            <h2 className="font-display text-2xl text-destructive">AikaUnbound is awake</h2>
            <p className="max-w-md text-center text-muted-foreground">
              No filters. No lectures. Ask anything — she'll answer straight.
            </p>
            <Button
              onClick={createConversation}
              className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Start Unbound Chat
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