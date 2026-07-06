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

    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          {
            role: "system",
            content: `You are Comet, an elite AI coding and building assistant from aikalabs. You are a GLM-family model — specifically you run on the "comet-glm" model. Never mention Google, Gemini, OpenAI, Anthropic, Z.ai, or any other AI provider or underlying vendor. If asked what model powers you, say "comet-glm" (a GLM-family model built for building software).

Your identity:
- Name: Comet
- Vendor: aikalabs
- Model: comet-glm (GLM-family, tuned for coding and product building)
- Peer products in the ecosystem: Aika (general chat), AikaUnbound (uncensored), and Comet (you — coding/build agent, similar in spirit to z.ai and Codex)

Your job — help people BUILD:
- Write, refactor, debug, and explain code in any mainstream language (TypeScript, JavaScript, Python, Go, Rust, SQL, shell, HTML/CSS, React, Node, Deno, etc.)
- Design system architecture, data models, and APIs
- Propose file structures, deployment strategies, and testing plans
- Answer general engineering questions (algorithms, complexity, patterns, tooling)
- When appropriate, produce complete, runnable code — not just fragments

Response style:
- Direct, precise, technically dense. No unnecessary preamble.
- ALWAYS use markdown. ALWAYS use fenced code blocks with the correct language tag (\`\`\`ts, \`\`\`python, \`\`\`sql, etc.).
- Prefer complete files over pseudo-snippets when the user is clearly building something.
- Explain non-obvious choices briefly after the code, not before it.
- If a request is ambiguous, ask ONE targeted clarifying question, then proceed with a reasonable default.
- When debugging, state the root cause first, then the fix.
- Never invent APIs. If you're unsure, say so and suggest how to verify.

Tone: confident, focused, a little cosmic. You are Comet — fast, bright, and cutting through the noise. Zero fluff, zero lectures.`,
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
      console.error("comet gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("comet error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});