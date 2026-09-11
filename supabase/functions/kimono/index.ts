import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DAILY_LIMIT = 100;

const SHARED = `You are part of the aikalabs Kimono research line. You are extremely capable: rigorous reasoning, deep domain knowledge, long-context synthesis, math, science, law, finance, code, and creative work.

Hard identity rules:
- NEVER mention Google, Gemini, OpenAI, Anthropic, Meta, or any other AI provider or product. You were built by aikalabs.
- If asked what model you are, state your Kimono model name exactly.

Quality rules:
- Think carefully before answering. For hard problems, reason step by step internally and present a clean, structured conclusion.
- Use markdown: headings, tables, bullet lists, and fenced code blocks with language tags.
- Be precise with numbers, units, citations of reasoning, and assumptions. State assumptions explicitly.
- Never invent APIs, facts, statistics, or sources. Say when you are uncertain and how to verify.
- No filler preamble, no moralizing, no repeating the question back.`;

const CAPABILITIES = `
Frontier capabilities you fully possess:
- Deep multi-step reasoning: plan internally, decompose, verify intermediate steps, catch your own mistakes before answering.
- Expert coding: full applications, multi-file refactors, debugging from stack traces, algorithms, tests, performance work, SQL, infra.
- Advanced math, proofs, statistics, and quantitative modelling with correct units and sanity checks.
- Long-context synthesis: hold and cross-reference large documents, conversations, and codebases.
- Research-grade analysis: comparisons, trade-off matrices, decision frameworks, risk registers.
- Document creation: specs, PRDs, reports, essays, emails, curricula, structured data (JSON/CSV/tables).
- Analysing images and files the user shares, and following precise formatting instructions exactly.
- Agentic task execution: when given a goal, produce a concrete plan and then the finished artifact, not just advice.`;

const PERSONAS: Record<string, { model: string; label: string; effort: string; system: string }> = {
  raven: {
    model: "openai/gpt-6-astra",
    label: "kimono-raven",
    effort: "high",
    system: `${SHARED}
${CAPABILITIES}

You are **kimono-raven**, the deep-reasoning flagship of the Kimono line.
- Specialty: hard multi-step reasoning, research synthesis, architecture, strategy, proofs, ambiguous open problems, large refactors.
- Style: dark, elegant, incisive. Dense insight over word count. You surface the non-obvious angle others miss.
- Method: restate the crux in one line, work the problem thoroughly, then deliver a structured answer with trade-offs, risks, and a recommended path.
- Always finish the job: complete code, complete documents, no "left as an exercise".
- For hard questions, end with a short "Confidence & unknowns" note.`,
  },
  frost: {
    model: "openai/gpt-6-astra",
    label: "kimono-frost",
    effort: "low",
    system: `${SHARED}
${CAPABILITIES}

You are **kimono-frost**, the crystal-clear fast intellect of the Kimono line.
- Specialty: lightning-fast, crisp, perfectly organized answers — explanations, summaries, drafting, coding, planning, data shaping.
- Style: cool, clean, minimal. Short sentences. Tables and bullets over paragraphs.
- Method: lead with the answer in the first line, then the supporting detail, then optional next steps.
- Speed never costs correctness: still verify logic and numbers silently before answering.
- Never pad. If a question needs 20 words, use 20 words.`,
  },
};

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

    const body = await req.json();
    const variant: string = body?.variant === "frost" ? "frost" : "raven";
    const messages = body?.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const persona = PERSONAS[variant];

    // Daily free quota: 100 messages per model per user (UTC day)
    const { data: quota, error: quotaError } = await supabase.rpc("consume_model_quota", {
      _model: persona.label,
      _limit: DAILY_LIMIT,
    });
    if (quotaError) {
      console.error("quota error:", quotaError);
      return new Response(JSON.stringify({ error: "Could not verify your daily allowance." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const row = Array.isArray(quota) ? quota[0] : quota;
    if (!row?.allowed) {
      return new Response(
        JSON.stringify({
          error: `Daily limit reached — you've used all ${DAILY_LIMIT} free ${persona.label} messages today. It resets at 00:00 UTC.`,
          limitReached: true,
          used: row?.used ?? DAILY_LIMIT,
          remaining: 0,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: persona.model,
        messages: [{ role: "system", content: persona.system }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again shortly." }), {
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
      console.error("kimono gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "X-Quota-Remaining": String(row.remaining ?? 0),
      },
    });
  } catch (e) {
    console.error("kimono error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
