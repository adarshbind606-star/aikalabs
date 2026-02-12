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
import { Menu, Cherry } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

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



export default function Chat() {
  const { session, user, loading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) loadConversations();
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
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title: "New Conversation" })
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
    await supabase.from("messages").insert({
      conversation_id: convoId,
      user_id: user.id,
      role: msg.role,
      content: msg.content,
      image_url: msg.image_url || null,
    });
  };

  const updateConversationTitle = async (convoId: string, firstMessage: string) => {
    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "");
    await supabase.from("conversations").update({ title }).eq("id", convoId);
    setConversations(prev => prev.map(c => c.id === convoId ? { ...c, title } : c));
  };

  const handleSend = useCallback(async (input: string) => {
    if (!user || isStreaming) return;

    let convoId = activeConvoId;
    if (!convoId) {
      const { data } = await supabase
        .from("conversations")
        .insert({ user_id: user.id, title: "New Conversation" })
        .select()
        .single();
      if (!data) return;
      convoId = data.id;
      setConversations(prev => [data, ...prev]);
      setActiveConvoId(convoId);
    }

    const userMsg: Msg = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    await saveMessage(convoId!, userMsg);

    // Update title if first message
    if (messages.length === 0) {
      await updateConversationTitle(convoId!, input);
    }

    setIsStreaming(true);
    let assistantSoFar = "";

      const chatHistory = [...messages, userMsg].map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

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
            await saveMessage(convoId!, { role: "assistant", content: assistantSoFar });
          }
        },
        onError: (err) => {
          setIsStreaming(false);
          toast.error(err);
        },
      });
  }, [user, activeConvoId, messages, isStreaming]);

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
        activePage="chat"
      />

      <div className="relative z-10 flex flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-sm">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <Cherry className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg text-primary">Aika-AI 2.1</h2>
        </header>

        {!activeConvoId && messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Cherry className="h-12 w-12 text-primary" />
            </div>
            <h2 className="font-display text-2xl text-primary">Welcome to Aika-AI!</h2>
            <p className="max-w-md text-center text-muted-foreground">
              I'm your anime-themed AI assistant 🌸 Ask me anything, or tell me to generate an image!
            </p>
            <Button onClick={createConversation} className="gap-2">
              Start a New Chat
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1">
              <div className="mx-auto max-w-3xl pb-4">
                {messages.map((msg, i) => (
                  <ChatMessage key={i} role={msg.role} content={msg.content} imageUrl={msg.image_url} />
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
