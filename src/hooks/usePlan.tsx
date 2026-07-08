import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type PlanTier = "basic" | "pro" | "super";

export function usePlan() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanTier>("basic");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setPlan("basic");
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("subscriptions")
      .select("plan, status, expires_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (
      data &&
      data.status === "active" &&
      (!data.expires_at || new Date(data.expires_at) > new Date())
    ) {
      setPlan(data.plan as PlanTier);
    } else {
      setPlan("basic");
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { plan, loading, refresh };
}

export function canUseModel(plan: PlanTier, modelId: string): boolean {
  if (modelId === "kimono-zm" || modelId === "kimono-zm-unbound" || modelId === "comet-glm") return true;
  if (modelId === "kimono-frost") return plan === "pro" || plan === "super";
  if (modelId === "kimono-raven") return plan === "super";
  return true;
}