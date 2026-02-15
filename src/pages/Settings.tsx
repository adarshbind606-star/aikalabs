import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ChatSidebar } from "@/components/ChatSidebar";
import { SakuraPetals } from "@/components/SakuraPetals";
import { AvatarEditor } from "@/components/AvatarEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Menu, Settings as SettingsIcon, User, Palette, Trash2, Brain, Cherry } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const MODELS = [
  { value: "kimono-zm", label: "Kimono ZM (Default)" },
  { value: "kimono-zm-fast", label: "Kimono ZM Fast" },
  { value: "kimono-zm-pro", label: "Kimono ZM Pro" },
];

export default function Settings() {
  const { session, user, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Profile
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  // Preferences
  const [selectedModel, setSelectedModel] = useState("kimono-zm");
  const [fontSize, setFontSize] = useState("medium");

  // Stats
  const [chatCount, setChatCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadStats();
      // Load saved preferences
      const savedModel = localStorage.getItem("aika-model") || "kimono-zm";
      const savedFontSize = localStorage.getItem("aika-font-size") || "medium";
      setSelectedModel(savedModel);
      setFontSize(savedFontSize);
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (data) {
      setDisplayName(data.display_name || "");
      setAvatarUrl(data.avatar_url || "");
    }
  };

  const loadStats = async () => {
    if (!user) return;
    const { count: convos } = await supabase
      .from("conversations")
      .select("*", { count: "exact", head: true });
    const { count: msgs } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true });
    setChatCount(convos || 0);
    setMessageCount(msgs || 0);
  };

  const saveProfile = async () => {
    if (!user) return;
    setProfileLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, avatar_url: avatarUrl })
      .eq("user_id", user.id);
    setProfileLoading(false);
    if (error) {
      toast.error("Failed to save profile");
    } else {
      toast.success("Profile updated!");
    }
  };

  const handleAvatarChange = async (url: string) => {
    setAvatarUrl(url);
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: url })
      .eq("user_id", user.id);
    if (error) {
      toast.error("Failed to update avatar");
    } else {
      toast.success("Avatar updated!");
    }
  };

  const deleteAllChats = async () => {
    if (!user) return;
    const { error } = await supabase.from("conversations").delete().eq("user_id", user.id);
    if (error) {
      toast.error("Failed to delete conversations");
    } else {
      setChatCount(0);
      setMessageCount(0);
      toast.success("All conversations deleted");
    }
  };

  const handleModelChange = (value: string) => {
    setSelectedModel(value);
    localStorage.setItem("aika-model", value);
    toast.success("Model updated!");
  };

  const handleFontSizeChange = (value: string) => {
    setFontSize(value);
    localStorage.setItem("aika-font-size", value);
    // Dispatch storage event so ChatMessage picks it up in the same tab
    window.dispatchEvent(new StorageEvent("storage", { key: "aika-font-size", newValue: value }));
    toast.success("Font size updated!");
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
        activePage="settings"
      />

      <div className="relative z-10 flex flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-sm">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <SettingsIcon className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg text-primary">Settings</h2>
        </header>

        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-2xl space-y-8 p-6">

            {/* Profile Section */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <h3 className="font-display text-lg text-foreground">Profile</h3>
              </div>
              <Separator />
              <div className="space-y-4 rounded-xl border border-border bg-card p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-sm font-medium text-foreground">{user?.email}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avatarUrl">Avatar</Label>
                  <AvatarEditor avatarUrl={avatarUrl} onSave={handleAvatarChange} />
                </div>
                <Button onClick={saveProfile} disabled={profileLoading} size="sm">
                  {profileLoading ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </section>

            {/* Theme & Appearance */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                <h3 className="font-display text-lg text-foreground">Appearance</h3>
              </div>
              <Separator />
              <div className="space-y-4 rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Dark Mode</p>
                    <p className="text-xs text-muted-foreground">Toggle between light and dark themes</p>
                  </div>
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Font Size</p>
                    <p className="text-xs text-muted-foreground">Adjust chat text size</p>
                  </div>
                  <Select value={fontSize} onValueChange={handleFontSizeChange}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* Model Selection */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <h3 className="font-display text-lg text-foreground">Model</h3>
              </div>
              <Separator />
              <div className="space-y-4 rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">AI Model</p>
                    <p className="text-xs text-muted-foreground">Choose which model Aika uses</p>
                  </div>
                  <Select value={selectedModel} onValueChange={handleModelChange}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODELS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* Data Management */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-primary" />
                <h3 className="font-display text-lg text-foreground">Data</h3>
              </div>
              <Separator />
              <div className="space-y-4 rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{chatCount} conversation{chatCount !== 1 ? "s" : ""}</span>
                  <span>•</span>
                  <span>{messageCount} message{messageCount !== 1 ? "s" : ""}</span>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-2">
                      <Trash2 className="h-4 w-4" /> Delete All Conversations
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete all conversations?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all {chatCount} conversations and {messageCount} messages. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={deleteAllChats} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </section>

            {/* About */}
            <section className="space-y-4 pb-8">
              <div className="flex items-center gap-2">
                <Cherry className="h-5 w-5 text-primary" />
                <h3 className="font-display text-lg text-foreground">About</h3>
              </div>
              <Separator />
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm text-foreground font-medium">Aika-AI v2.1</p>
                <p className="text-xs text-muted-foreground mt-1">Your anime-themed AI assistant 🌸</p>
              </div>
            </section>

          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
