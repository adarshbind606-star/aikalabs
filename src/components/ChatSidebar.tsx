import { useState } from "react";
import { Plus, MessageSquare, Trash2, LogOut, Cherry } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";

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

export function ChatSidebar({ conversations, activeId, onSelect, onNew, onDelete, isOpen, onClose }: ChatSidebarProps) {
  const { signOut, user } = useAuth();
  const groups = groupByDate(conversations);

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

        <div className="p-3">
          <Button onClick={onNew} className="w-full gap-2" variant="outline">
            <Plus className="h-4 w-4" /> New Chat
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

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              {user?.email?.[0]?.toUpperCase() || "?"}
            </div>
            <span className="flex-1 truncate text-sm text-sidebar-foreground">{user?.email}</span>
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
