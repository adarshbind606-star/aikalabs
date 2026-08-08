import { useState, useRef, useEffect } from "react";
import { Send, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (message: string, imageBase64?: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + "px";
    }
  }, [input]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) return; // 10MB limit

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setImageBase64(result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageBase64(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !imageBase64) || disabled) return;
    onSend(input.trim(), imageBase64 || undefined);
    setInput("");
    removeImage();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-border bg-background p-4">
      <div className="mx-auto max-w-3xl">
        {imagePreview && (
          <div className="mb-2 inline-flex items-start gap-1">
            <div className="relative rounded-lg border border-border overflow-hidden">
              <img src={imagePreview} alt="Attached" className="h-20 w-20 object-cover" />
              <button
                type="button"
                onClick={removeImage}
                className="absolute right-0.5 top-0.5 rounded-full bg-foreground/70 p-0.5 text-background hover:bg-foreground/90"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
        <div className="flex items-end gap-2 rounded-2xl border border-input bg-card p-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 rounded-xl"
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Aika anything or attach an image..."
            rows={1}
            disabled={disabled}
            className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />
          <Button type="submit" size="icon" disabled={disabled || (!input.trim() && !imageBase64)} className="shrink-0 rounded-xl">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Aika can make mistakes. Use the Images tab for image generation 🌸
        </p>
      </div>
    </form>
  );
}
