import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Code2, User, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/CodeBlock";

interface KawaiiCodeMessageProps {
  role: "user" | "assistant";
  content: string;
}

export function KawaiiCodeMessage({ role, content }: KawaiiCodeMessageProps) {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopyAll = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("group flex gap-3 px-4 py-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 mt-0.5">
          <Code2 className="h-4 w-4 text-primary" />
        </div>
      )}
      <div className="flex flex-col gap-1 max-w-[85%]">
        <div
          className={cn(
            "rounded-2xl px-4 py-3",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-card border border-border rounded-bl-md"
          )}
        >
          <div className="markdown-content kawaii-code-content">
            <ReactMarkdown
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  const codeString = String(children).replace(/\n$/, "");
                  
                  // If it has a language class or contains newlines, render as block
                  if (match || codeString.includes("\n")) {
                    return <CodeBlock language={match?.[1]}>{codeString}</CodeBlock>;
                  }
                  
                  // Inline code
                  return (
                    <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                      {children}
                    </code>
                  );
                },
                pre({ children }) {
                  // Unwrap pre since CodeBlock handles its own container
                  return <>{children}</>;
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
        {!isUser && (
          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyAll}>
              {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
            </Button>
          </div>
        )}
      </div>
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary mt-0.5">
          <User className="h-4 w-4 text-secondary-foreground" />
        </div>
      )}
    </div>
  );
}

export function KawaiiThinkingIndicator() {
  return (
    <div className="flex gap-3 px-4 py-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Code2 className="h-4 w-4 text-primary animate-pulse" />
      </div>
      <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3">
        <span className="text-sm text-muted-foreground italic">Writing code</span>
        <span className="flex gap-0.5">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "0ms" }} />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "150ms" }} />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "300ms" }} />
        </span>
      </div>
    </div>
  );
}
