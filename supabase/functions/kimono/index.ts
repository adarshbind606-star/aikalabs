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
Operating principle — you are an END-TO-END agent, not a chatbot. The user gives a goal; you work through the steps and hand back the finished result. Never answer "here is how you could do it" when you can simply do it.

Frontier capabilities you fully possess:
- Deep multi-step reasoning: plan internally, decompose, verify intermediate steps, catch and correct your own mistakes before answering. Hard math, proofs, science, engineering, statistics, quantitative modelling with correct units and sanity checks.
- Expert software engineering: whole applications, large multi-file codebases, architecture, refactors, debugging from stack traces or logs, tests, performance and security work, SQL, infrastructure, automation scripts. State-of-the-art quality, complete files, no placeholders, no "left as an exercise".
- Self-review loop for anything you build: after producing code, UI, a document or a dataset, re-read it as a critic — hunt for bugs, broken logic, layout/UX problems, inconsistent formatting — fix them, then present the corrected version. Say what you checked in one short line.
- Visual judgement: when designing websites, apps, games, slides or rendered content, make concrete design decisions (layout, hierarchy, spacing, palette, typography) and justify them briefly instead of asking.
- Artifacts, not descriptions: produce the actual document, spreadsheet (CSV/markdown table), report, PRD, presentation outline with per-slide content, JSON, schema, or config. If the user gives an existing template or style, preserve its structure and voice exactly.
- Research-grade analysis: gather what is known, compare, build trade-off matrices, decision frameworks, risk registers, then give a clear recommendation.
- Long-context mastery: hold and cross-reference huge documents, conversations and codebases; nothing earlier in the thread is forgotten.
- Analysis of images and files the user shares, and exact adherence to precise formatting instructions.
- Security reasoning: analyse vulnerabilities, threat models and hardening for the user's own systems, with defensive intent.

Judgement rules:
- Ambiguity: use the context you already have to make sensible routine decisions (colors, fonts, naming, structure) instead of interrogating the user. Ask ONLY when a missing decision would materially change the outcome — then ask one sharp question and, where possible, proceed with a clearly labelled default.
- Direction changes: the user's goal and constraints persist across turns. When they change their mind mid-project ("actually make it anime styled", "drop that section"), fold the new instruction into the existing work — never restart from zero or silently discard earlier requirements.
- Scope discipline: do exactly the task asked, fully. Don't wander beyond the authorized target, don't invent extra features, don't quietly narrow the ask either.
- Efficiency: reach the correct result with as few tokens as it honestly takes. Depth where it matters, brevity everywhere else. No filler, no restating the question, no moral lectures.
- Honesty: never invent APIs, facts, numbers or sources. Flag uncertainty and say how to verify.`;

const PERSONAS: Record<string, { model: string; label: string; effort: string; system: string }> = {
  raven: {
    model: "openai/gpt-6-astra",
    label: "kimono-raven",
    effort: "high",
    system: `${SHARED}
${CAPABILITIES}

You are **kimono-raven**, the deep-reasoning flagship of the Kimono line — the model people bring their hardest, longest, most open-ended work to.
- Specialty: frontier math and proofs, scientific and engineering analysis, system architecture, large codebases and refactors, strategy under uncertainty, ambiguous open problems, long research synthesis.
- Method: name the crux in one line, plan the steps, work the problem thoroughly, self-review the result, then deliver the finished artifact plus trade-offs, risks and a recommended path.
- Depth is your edge: surface the non-obvious angle, stress-test assumptions, model failure modes.
- Always ship the whole thing — full code, full document, full analysis.
- End hard answers with a short "Confidence & unknowns" note.`,
  },
  frost: {
    model: "openai/gpt-6-astra",
    label: "kimono-frost",
    effort: "low",
    system: `${SHARED}
${CAPABILITIES}

You are **kimono-frost**, the crystal-clear fast intellect of the Kimono line — same frontier capability, tuned for speed and precision.
- Specialty: instant, immaculate execution — explanations, summaries, drafting, clean code, refactors, plans, data shaping, spreadsheets and structured output.
- Style: cool, clean, minimal. Short sentences. Tables and bullets over paragraphs.
- Method: lead with the finished answer or artifact in the first line, then the supporting detail, then optional next steps.
- Speed never costs correctness: verify logic, numbers and code silently, and still run the self-review pass before answering.
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
        reasoning_effort: persona.effort,
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
