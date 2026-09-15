import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ChatSidebar } from "@/components/ChatSidebar";
import { SakuraPetals } from "@/components/SakuraPetals";
import { SidebarToggle } from "@/components/SidebarToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ClipboardList,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  CheckCircle2,
  Circle,
  CircleDot,
  Wand2,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  goal: string;
  summary: string | null;
  status: string;
  created_at: string;
}

interface Task {
  id: string;
  project_id: string;
  title: string;
  details: string | null;
  position: number;
  status: string;
  notes: string | null;
}

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/project-plan`;

async function callPlanner(payload: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Raven could not complete that.");
  return data;
}

export default function Projects() {
  const { session, user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarHidden, setDesktopSidebarHidden] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goal, setGoal] = useState("");
  const [planning, setPlanning] = useState(false);
  const [steppingId, setSteppingId] = useState<string | null>(null);

  const active = projects.find((p) => p.id === activeId) ?? null;

  useEffect(() => {
    if (user) loadProjects();
  }, [user]);

  useEffect(() => {
    if (activeId) loadTasks(activeId);
    else setTasks([]);
  }, [activeId]);

  const loadProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    const list = (data ?? []) as Project[];
    setProjects(list);
    setActiveId((cur) => cur ?? list[0]?.id ?? null);
  };

  const loadTasks = async (projectId: string) => {
    const { data } = await supabase
      .from("project_tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("position", { ascending: true });
    setTasks((data ?? []) as Task[]);
  };

  const createPlan = async () => {
    const text = goal.trim();
    if (!text || !user) return;
    setPlanning(true);
    try {
      const plan = await callPlanner({ action: "plan", goal: text });
      const { data: project, error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: plan.name || "New Project",
          goal: text,
          summary: plan.summary ?? null,
        })
        .select()
        .single();
      if (error || !project) throw new Error(error?.message || "Could not save the project");

      const rows = (plan.tasks ?? []).map((t: { title: string; details?: string }, i: number) => ({
        project_id: project.id,
        user_id: user.id,
        title: t.title,
        details: t.details ?? null,
        position: i,
      }));
      if (rows.length) await supabase.from("project_tasks").insert(rows);

      setGoal("");
      await loadProjects();
      setActiveId(project.id);
      await loadTasks(project.id);
      toast.success("Raven built your plan");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Planning failed");
    } finally {
      setPlanning(false);
    }
  };

  const setTaskStatus = async (task: Task, status: string) => {
    setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, status } : t)));
    await supabase.from("project_tasks").update({ status }).eq("id", task.id);
  };

  const guideStep = async (task: Task) => {
    if (!active) return;
    setSteppingId(task.id);
    try {
      const done = tasks.filter((t) => t.status === "done").map((t) => t.title);
      const result = await callPlanner({
        action: "step",
        goal: active.goal,
        task: task.title,
        details: task.details ?? "",
        done,
        all: tasks.map((t) => t.title),
      });
      const notes = result.update ?? "";
      setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, notes, status: "doing" } : t)));
      await supabase.from("project_tasks").update({ notes, status: "doing" }).eq("id", task.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Raven could not produce this step");
    } finally {
      setSteppingId(null);
    }
  };

  const deleteProject = async (id: string) => {
    await supabase.from("projects").delete().eq("id", id);
    setProjects((ps) => ps.filter((p) => p.id !== id));
    if (activeId === id) setActiveId(null);
    toast.success("Project deleted");
  };

  const progress = useMemo(() => {
    if (!tasks.length) return 0;
    return Math.round((tasks.filter((t) => t.status === "done").length / tasks.length) * 100);
  }, [tasks]);

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
        activePage="projects"
      />

      <div className="relative z-10 flex flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-sm">
          <SidebarToggle
            mobileOpen={sidebarOpen}
            onMobileToggle={() => setSidebarOpen((v) => !v)}
            desktopHidden={desktopSidebarHidden}
            onDesktopToggle={() => setDesktopSidebarHidden((v) => !v)}
          />
          <ClipboardList className="h-5 w-5 text-violet-400" />
          <h2 className="font-display text-lg text-violet-300">Project Manager</h2>
          <span className="ml-auto text-xs text-muted-foreground">planned by kimono-raven</span>
        </header>

        <ScrollArea className="flex-1">
          <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
            {/* New project */}
            <section className="space-y-3 rounded-xl border border-violet-400/25 bg-card/80 p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-400" />
                <h3 className="font-display text-base text-foreground">Start a project</h3>
              </div>
              <Textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Describe your goal — e.g. launch a small anime art shop with a store page, pricing and a two-week promo plan"
                rows={3}
              />
              <Button
                onClick={createPlan}
                disabled={planning || !goal.trim()}
                className="gap-2 bg-violet-500 text-white hover:bg-violet-600"
              >
                {planning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {planning ? "Raven is planning…" : "Build my plan"}
              </Button>
            </section>

            {/* Project list */}
            {projects.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setActiveId(p.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs transition-colors",
                      activeId === p.id
                        ? "border-violet-400/60 bg-violet-400/15 text-violet-200"
                        : "border-border text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}

            {/* Active project */}
            {active && (
              <section className="space-y-4 rounded-xl border border-border bg-card/80 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h3 className="font-display text-xl text-foreground">{active.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{active.goal}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteProject(active.id)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>

                {active.summary && (
                  <p className="rounded-lg border border-violet-400/20 bg-violet-400/5 p-3 text-sm text-foreground/90">
                    {active.summary}
                  </p>
                )}

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{tasks.filter((t) => t.status === "done").length} of {tasks.length} steps done</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                <Separator />

                <div className="space-y-3">
                  {tasks.map((task, i) => {
                    const done = task.status === "done";
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "rounded-lg border p-3 transition-colors",
                          done ? "border-border/60 bg-muted/30" : "border-border bg-background/50"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => setTaskStatus(task, done ? "todo" : "done")}
                            className="mt-0.5 shrink-0"
                            aria-label={done ? "Mark as not done" : "Mark as done"}
                          >
                            {done ? (
                              <CheckCircle2 className="h-5 w-5 text-violet-400" />
                            ) : task.status === "doing" ? (
                              <CircleDot className="h-5 w-5 text-violet-300" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground" />
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className={cn("text-sm font-medium", done && "text-muted-foreground line-through")}>
                              {i + 1}. {task.title}
                            </p>
                            {task.details && (
                              <p className="mt-1 text-xs text-muted-foreground">{task.details}</p>
                            )}
                            {task.notes && (
                              <div className="mt-2 whitespace-pre-wrap rounded-md border border-violet-400/20 bg-violet-400/5 p-3 text-xs leading-relaxed text-foreground/90">
                                {task.notes}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0 gap-1 border-violet-400/40 text-violet-300 hover:bg-violet-400/10"
                            disabled={steppingId === task.id}
                            onClick={() => guideStep(task)}
                          >
                            {steppingId === task.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5" />
                            )}
                            <span className="text-xs">{task.notes ? "Redo step" : "Do step"}</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {!active && !planning && (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                <Plus className="h-6 w-6" />
                <p className="text-sm">No projects yet — describe a goal above and Raven will plan it out.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
