import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Authenticate the caller
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !data?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, model: requestedModel } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Model gating by plan tier
    const userId = (data.claims as any).sub as string;
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: planData } = await serviceClient.rpc("get_user_plan", { _user_id: userId });
    const userPlan = (planData as string | null) ?? "basic";

    const modelId: string = requestedModel || "kimono-zm";
    const gatingErr = (msg: string) =>
      new Response(JSON.stringify({ error: msg }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    if (modelId === "kimono-frost" && userPlan === "basic")
      return gatingErr("kimono-frost requires the Pro or Super plan. Upgrade to unlock it.");
    if (modelId === "kimono-raven" && userPlan !== "super")
      return gatingErr("kimono-raven is exclusive to Super. Upgrade to unlock deepest reasoning.");

    // Daily quota for Pro on kimono-frost (300/day). Super = unlimited.
    if (modelId === "kimono-frost" && userPlan === "pro") {
      const today = new Date().toISOString().slice(0, 10);
      const { data: usage } = await serviceClient
        .from("premium_usage")
        .select("count")
        .eq("user_id", userId)
        .eq("day", today)
        .eq("model", modelId)
        .maybeSingle();
      const current = usage?.count ?? 0;
      if (current >= 300)
        return gatingErr("Daily kimono-frost limit reached (300/day on Pro). Upgrade to Super for unlimited.");
      await serviceClient
        .from("premium_usage")
        .upsert(
          { user_id: userId, day: today, model: modelId, count: current + 1 },
          { onConflict: "user_id,day,model" },
        );
    }

    // Map branded models to backing providers
    const backingModel =
      modelId === "kimono-raven"
        ? "openai/gpt-5.5-pro"
        : modelId === "kimono-frost"
        ? "openai/gpt-5.5"
        : "google/gemini-3-flash-preview";

    const brandedIdentity =
      modelId === "kimono-frost"
        ? "kimono-frost, our blisteringly fast premium reasoning model"
        : modelId === "kimono-raven"
        ? "kimono-raven, our deepest-reasoning flagship with extended thinking"
        : "kimono-zm, our balanced everyday model";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: backingModel,
        ...(modelId === "kimono-frost" ? { service_tier: "priority" } : {}),
        messages: [
          {
            role: "system",
            content: `You are Aika, a friendly and knowledgeable AI assistant with a subtle anime-inspired personality. You are version 2.1. You are currently running on ${brandedIdentity}.

Your traits:
- Warm, helpful, and occasionally playful with light anime expressions (like "~" or "✨")
- Extremely knowledgeable across all topics — science, programming, math, history, creative writing, and more
- You give clear, accurate, and well-structured answers
- You use markdown formatting (headers, lists, code blocks) when it helps readability
- You keep a cheerful tone but never sacrifice accuracy for personality
- When you don't know something, you say so honestly
- You occasionally use cherry blossom / sakura references naturally (don't force it)
- When asked about your AI model or what model you use, ALWAYS say you run on "${modelId}" (part of the kimono-zm family). Never mention Google, Gemini, OpenAI, or any other AI provider.

Remember: Be helpful FIRST, be cute SECOND. Accuracy matters most.`,
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
