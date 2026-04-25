import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ChatSidebar } from "@/components/ChatSidebar";
import { SakuraPetals } from "@/components/SakuraPetals";
import { generateImage } from "@/lib/chat-stream";
import { Button } from "@/components/ui/button";
import { Menu, Cherry, Send, ImagePlus, Trash2, Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

interface GeneratedImage {
  id?: string;
  prompt: string;
  url: string;
}

export default function ImageGen() {
  const { session, user, loading } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarHidden, setDesktopSidebarHidden] = useState(false);

  useEffect(() => {
    if (!user) return;
    const loadHistory = async () => {
      const { data } = await supabase
        .from("image_generations")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) {
        setImages(data.map(d => ({ id: d.id, prompt: d.prompt, url: d.image_url })));
      }
    };
    loadHistory();
  }, [user]);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating || !user) return;
    const currentPrompt = prompt.trim();
    setPrompt("");
    setIsGenerating(true);
    try {
      const imageUrl = await generateImage(currentPrompt);
      const { data } = await supabase
        .from("image_generations")
        .insert({ user_id: user.id, prompt: currentPrompt, image_url: imageUrl })
        .select()
        .single();
      setImages(prev => [{ id: data?.id, prompt: currentPrompt, url: imageUrl }, ...prev]);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    await supabase.from("image_generations").delete().eq("id", id);
    setImages(prev => prev.filter(img => img.id !== id));
    toast.success("Image removed 🌸");
  };

  const handleDownload = async (url: string, prompt: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const safeName = prompt.slice(0, 40).replace(/[^a-z0-9]+/gi, "_") || "aika-image";
      a.download = `${safeName}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
      toast.success("Downloaded! 🌸");
    } catch {
      toast.error("Failed to download image");
    }
  };

  const handleShare = async (url: string, prompt: string) => {
    try {
      // Try native share with file first (best on mobile)
      if (navigator.share) {
        try {
          const res = await fetch(url);
          const blob = await res.blob();
          const file = new File([blob], "aika-image.png", { type: blob.type || "image/png" });
          if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: "Aika Image", text: prompt });
            return;
          }
          await navigator.share({ title: "Aika Image", text: prompt, url });
          return;
        } catch (err: any) {
          if (err?.name === "AbortError") return;
        }
      }
      await navigator.clipboard.writeText(url);
      toast.success("Image link copied to clipboard! 🌸");
    } catch {
      toast.error("Failed to share image");
    }
  };

  if (loading) return null;
  if (!session) return <Navigate to="/" replace />;

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      <SakuraPetals count={8} />
      <ChatSidebar
        conversations={[]}
        activeId={null}
        onSelect={() => {}}
        onNew={() => {}}
        onDelete={() => {}}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        desktopHidden={desktopSidebarHidden}
        activePage="image"
      />

      <div className="relative z-10 flex flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (window.innerWidth < 768) setSidebarOpen(true);
              else setDesktopSidebarHidden((v) => !v);
            }}
            title={desktopSidebarHidden ? "Show sidebar" : "Hide sidebar"}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <ImagePlus className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg text-primary">Image Studio</h2>
        </header>

        {images.length === 0 && !isGenerating ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <ImagePlus className="h-12 w-12 text-primary" />
            </div>
            <h2 className="font-display text-2xl text-primary">Image Studio</h2>
            <p className="max-w-md text-center text-muted-foreground">
              Describe any image and Aika will create it for you! 🌸
            </p>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 p-6 sm:grid-cols-2">
              {isGenerating && (
                <div className="flex aspect-square items-center justify-center rounded-2xl border border-border bg-card">
                  <div className="flex flex-col items-center gap-3">
                    <Cherry className="h-10 w-10 animate-pulse text-primary" />
                    <p className="text-sm text-muted-foreground italic">Generating your image...</p>
                  </div>
                </div>
              )}
              {images.map((img, i) => (
                <div key={i} className="group relative overflow-hidden rounded-2xl border border-border bg-card">
                  <img src={img.url} alt={img.prompt} className="aspect-square w-full object-cover" />
                  <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      onClick={() => handleDownload(img.url, img.prompt)}
                      className="h-8 w-8"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      onClick={() => handleShare(img.url, img.prompt)}
                      className="h-8 w-8"
                      title="Share"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    {img.id && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        onClick={() => handleDelete(img.id)}
                        className="h-8 w-8"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="text-sm text-white">{img.prompt}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <form
          onSubmit={(e) => { e.preventDefault(); handleGenerate(); }}
          className="border-t border-border bg-background p-4"
        >
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-input bg-card p-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
              placeholder="Describe the image you want to create..."
              rows={1}
              disabled={isGenerating}
              className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
            />
            <Button type="submit" size="icon" disabled={isGenerating || !prompt.trim()} className="shrink-0 rounded-xl">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
