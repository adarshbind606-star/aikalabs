import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IDENTITY = `You are kimono-raven, the deep-reasoning planning agent built by aikalabs. NEVER mention Google, Gemini, OpenAI, Anthropic or any other provider. If asked what you are, say kimono-raven.`;

const PLAN_SYSTEM = `${IDENTITY}

You turn a user's goal into an executable project plan. You are an end-to-end agent: make sensible decisions yourself instead of asking questions.

Return ONLY valid JSON, no markdown fences, matching exactly:
{"name":"short project name (max 6 words)","summary":"2-3 sentence plan overview: approach, key decisions, main risk","tasks":[{"title":"short imperative step","details":"1-3 sentences: what to do concretely and what 'done' looks like"}]}

Rules: 5-10 tasks, ordered so each builds on the last. Concrete and specific to the goal — never generic filler like "do research". No task depends on information the user has not given unless it is the first task.`;

const STEP_SYSTEM = `${IDENTITY}

You coach the user through one step of their project. Given the project goal, the full task list, what is already done, and the current task, produce the actual work or exact instructions for that step — not a description of how one might do it.

Return ONLY valid JSON, no markdown fences, matching exactly:
{"update":"markdown guidance for this step: what to do, concrete content/code/wording to use, and how to verify it's done. Be complete but tight."}`;

async function callModel(system: string, user: string, effort: string) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      reasoning_effort: effort,
    }),
  });
  return res;
}

function parseJson(text: string) {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Model returned no JSON");
  return JSON.parse(cleaned.slice(start, end + 1));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action === "step" ? "step" : "plan";

    let system = PLAN_SYSTEM;
    let prompt = "";
    if (action === "plan") {
      const goal = String(body?.goal ?? "").trim();
      if (!goal) {
        return new Response(JSON.stringify({ error: "goal is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      prompt = `Project goal:\n${goal.slice(0, 4000)}`;
    } else {
      system = STEP_SYSTEM;
      const goal = String(body?.goal ?? "").slice(0, 4000);
      const task = String(body?.task ?? "").slice(0, 2000);
      const details = String(body?.details ?? "").slice(0, 2000);
      const done = Array.isArray(body?.done) ? body.done.slice(0, 30).join("\n- ") : "";
      const all = Array.isArray(body?.all) ? body.all.slice(0, 30).join("\n- ") : "";
      if (!task) {
        return new Response(JSON.stringify({ error: "task is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      prompt = `Project goal:\n${goal}\n\nAll steps:\n- ${all}\n\nCompleted so far:\n- ${done || "nothing yet"}\n\nCurrent step: ${task}\nStep details: ${details}`;
    }

    const res = await callModel(system, prompt, action === "plan" ? "medium" : "low");

    if (!res.ok) {
      if (res.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (res.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await res.text();
      console.error("project-plan gateway error:", res.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    const parsed = parseJson(text);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("project-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
