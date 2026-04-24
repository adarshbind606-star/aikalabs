import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Cherry, User, Pencil, RotateCcw, Check, X, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string | null;
  onEdit?: (newContent: string) => void;
  onResend?: () => void;
}

export function ChatMessage({ role, content, imageUrl, onEdit, onResend }: ChatMessageProps) {
  const isUser = role === "user";
  const [fontSize, setFontSize] = useState("medium");
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(content);

  useEffect(() => {
    const saved = localStorage.getItem("aika-font-size") || "medium";
    setFontSize(saved);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "aika-font-size") setFontSize(e.newValue || "medium");
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const handleSaveEdit = () => {
    if (editText.trim() && onEdit) {
      onEdit(editText.trim());
      setIsEditing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard!");
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied! 🌸");
  };

  return (
    <div className={cn("group flex gap-3 px-4 py-4", `font-size-${fontSize}`, isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Cherry className="h-5 w-5 text-primary" />
        </div>
      )}
      <div className="flex flex-col gap-1 max-w-[75%]">
        <div
          className={cn(
            "rounded-2xl px-4 py-3 chat-text",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-card border border-border rounded-bl-md"
          )}
        >
          {imageUrl && (
            <img src={imageUrl} alt="Attached" className="mb-2 max-h-60 max-w-full rounded-lg object-cover" />
          )}
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full resize-none rounded-lg border border-border bg-background p-2 text-sm text-foreground outline-none"
                rows={3}
                autoFocus
              />
              <div className="flex gap-1 justify-end">
                <Button size="sm" variant="ghost" onClick={() => { setIsEditing(false); setEditText(content); }}>
                  <X className="h-3 w-3" />
                </Button>
                <Button size="sm" onClick={handleSaveEdit}>
                  <Check className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="markdown-content">
              <ReactMarkdown
                components={{
                  pre: ({ children, ...props }) => {
                    // Extract raw code text from the nested <code> child
                    const extractText = (node: any): string => {
                      if (typeof node === "string") return node;
                      if (Array.isArray(node)) return node.map(extractText).join("");
                      if (node?.props?.children) return extractText(node.props.children);
                      return "";
                    };
                    const codeText = extractText(children);
                    return (
                      <div className="relative group/code my-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleCopyCode(codeText)}
                          className="absolute right-2 top-2 h-7 px-2 opacity-0 group-hover/code:opacity-100 transition-opacity z-10"
                          title="Copy code"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          <span className="text-xs">Copy</span>
                        </Button>
                        <pre
                          {...props}
                          className="overflow-x-auto rounded-lg bg-muted/60 p-3 text-xs"
                        >
                          {children}
                        </pre>
                      </div>
                    );
                  },
                  code: ({ className, children, ...props }: any) => {
                    const isInline = !className?.includes("language-");
                    if (isInline) {
                      return (
                        <code
                          {...props}
                          className="rounded bg-muted/60 px-1 py-0.5 text-[0.85em]"
                        >
                          {children}
                        </code>
                      );
                    }
                    return (
                      <code {...props} className={className}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        {!isEditing && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isUser && onEdit && (
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setIsEditing(true)} title="Edit">
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            {isUser && onResend && (
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onResend} title="Resend">
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
            {!isUser && (
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCopy} title="Copy">
                <Copy className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
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
