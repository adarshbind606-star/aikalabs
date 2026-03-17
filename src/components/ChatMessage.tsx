import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Cherry, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string | null;
}

export function ChatMessage({ role, content, imageUrl }: ChatMessageProps) {
  const isUser = role === "user";
  const [fontSize, setFontSize] = useState("medium");

  useEffect(() => {
    const saved = localStorage.getItem("aika-font-size") || "medium";
    setFontSize(saved);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "aika-font-size") setFontSize(e.newValue || "medium");
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <div className={cn("flex gap-3 px-4 py-4", `font-size-${fontSize}`, isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Cherry className="h-5 w-5 text-primary" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-3 chat-text",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-card border border-border rounded-bl-md"
        )}
      >
        {imageUrl && (
          <img src={imageUrl} alt="Attached" className="mb-2 max-h-60 max-w-full rounded-lg object-cover" />
        )}
        <div className="markdown-content">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
          <User className="h-5 w-5 text-secondary-foreground" />
        </div>
      )}
    </div>
  );
}

export function ThinkingIndicator() {
  return (
    <div className="flex gap-3 px-4 py-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Cherry className="h-5 w-5 text-primary animate-pulse" />
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3">
        <span className="text-sm text-muted-foreground italic">Aika is thinking</span>
        <span className="flex gap-0.5">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "0ms" }} />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "150ms" }} />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "300ms" }} />
        </span>
      </div>
    </div>
  );
}
