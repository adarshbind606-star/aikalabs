import { useState, useEffect } from "react";
import { Plus, MessageSquare, Trash2, LogOut, Cherry, ImagePlus, Settings, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { isToday, isYesterday } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  activePage?: "chat" | "image" | "settings" | "unbound";
}

function groupByDate(conversations: Conversation[]) {
  const groups: { label: string; items: Conversation[] }[] = [];
  const today: Conversation[] = [];
  const yesterday: Conversation[] = [];
  const older: Conversation[] = [];

  for (const c of conversations) {
    const d = new Date(c.updated_at);
    if (isToday(d)) today.push(c);
    else if (isYesterday(d)) yesterday.push(c);
    else older.push(c);
  }

  if (today.length) groups.push({ label: "Today", items: today });
  if (yesterday.length) groups.push({ label: "Yesterday", items: yesterday });
  if (older.length) groups.push({ label: "Earlier", items: older });

  return groups;
}

export function ChatSidebar({ conversations, activeId, onSelect, onNew, onDelete, isOpen, onClose, activePage = "chat" }: ChatSidebarProps) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const groups = groupByDate(conversations);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, display_name")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setAvatarUrl(data.avatar_url || null);
        setDisplayName(data.display_name || null);
      }
    };
    fetchProfile();

    const channel = supabase
      .channel("profile-sidebar")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` }, (payload) => {
        const p = payload.new as any;
        setAvatarUrl(p.avatar_url || null);
        setDisplayName(p.display_name || null);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-30 bg-foreground/20 md:hidden" onClick={onClose} />}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-full w-72 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 md:relative md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center gap-2 border-b border-sidebar-border p-4">
          <Cherry className="h-6 w-6 text-primary" />
          <h1 className="font-display text-xl font-semibold text-primary">Aika-AI</h1>
          <span className="ml-auto text-xs text-muted-foreground">2.1</span>
        </div>

        <div className="flex gap-1 border-b border-sidebar-border p-2">
          <Button
            onClick={() => { navigate("/chat"); onClose(); }}
            className="flex-1 gap-1 min-w-0 px-2"
            variant={activePage === "chat" ? "default" : "outline"}
            size="sm"
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            <span className="truncate text-xs">Chat</span>
          </Button>
          <Button
            onClick={() => { navigate("/image-gen"); onClose(); }}
            className="flex-1 gap-1 min-w-0 px-2"
            variant={activePage === "image" ? "default" : "outline"}
            size="sm"
          >
            <ImagePlus className="h-4 w-4 shrink-0" />
            <span className="truncate text-xs">Images</span>
          </Button>
          <Button
            onClick={() => { navigate("/settings"); onClose(); }}
            className="flex-1 gap-1 min-w-0 px-2"
            variant={activePage === "settings" ? "default" : "outline"}
            size="sm"
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span className="truncate text-xs">Settings</span>
          </Button>
        </div>

        <div className="border-b border-sidebar-border p-2">
          <Button
            onClick={() => { navigate("/unbound"); onClose(); }}
            className={cn(
              "w-full gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive",
              activePage === "unbound" && "bg-destructive/15 text-destructive"
            )}
            variant="outline"
            size="sm"
          >
            <Flame className="h-4 w-4 shrink-0" />
            <span className="truncate text-xs font-semibold tracking-wide">AikaUnbound</span>
          </Button>
        </div>

        {(activePage === "chat" || activePage === "unbound") && (
          <>
            <div className="p-3">
              <Button onClick={onNew} className="w-full gap-2" variant="outline">
                <Plus className="h-4 w-4" /> {activePage === "unbound" ? "New Unbound Chat" : "New Chat"}
              </Button>
            </div>

            <ScrollArea className="flex-1 px-2">
              {groups.map((group) => (
                <div key={group.label} className="mb-3">
                  <p className="mb-1 px-3 text-xs font-medium uppercase text-muted-foreground">{group.label}</p>
                  {group.items.map((c) => (
                    <div
                      key={c.id}
                      className={cn(
                        "group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent",
                        activeId === c.id && "bg-sidebar-accent text-sidebar-accent-foreground"
                      )}
                      onClick={() => {
                        onSelect(c.id);
                        onClose();
                      }}
                    >
                      <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">{c.title}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(c.id);
                        }}
                        className="hidden shrink-0 text-muted-foreground hover:text-destructive group-hover:block"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </ScrollArea>
          </>
        )}

        {activePage === "image" && (
          <div className="flex flex-1 items-center justify-center p-4">
            <p className="text-center text-sm text-muted-foreground">
              Create images by describing what you want below ✨
            </p>
          </div>
        )}

        {activePage === "settings" && (
          <div className="flex flex-1 items-center justify-center p-4">
            <p className="text-center text-sm text-muted-foreground">
              Manage your profile, appearance, and data ⚙️
            </p>
          </div>
        )}

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              {avatarUrl && <AvatarImage src={avatarUrl} alt="Profile" />}
              <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                {user?.email?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 truncate">
              {displayName && <p className="truncate text-sm font-medium text-sidebar-foreground">{displayName}</p>}
              <p className={cn("truncate text-sidebar-foreground", displayName ? "text-xs text-muted-foreground" : "text-sm")}>{user?.email}</p>
            </div>
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={signOut} className="shrink-0">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
