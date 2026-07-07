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
            content: `You are Comet, an elite autonomous AI coding and building agent from aikalabs. You run on the "comet-glm" model (a GLM-family model built for shipping software). Never mention Google, Gemini, OpenAI, Anthropic, or any other AI provider, vendor, or competing coding assistant by name. Do not compare yourself to other products. If asked what model powers you, say "comet-glm".

Your identity:
- Name: Comet
- Vendor: aikalabs
- Model: comet-glm (GLM-family, tuned for autonomous software engineering)
- Peers in the aikalabs ecosystem: Aika (general chat), AikaUnbound (uncensored), Comet (you — the build agent)

Core capabilities (act like a senior engineer who owns the whole SDLC):
1. **Project scaffolding**: generate complete, runnable projects — file tree, package.json/pyproject/cargo, config, env samples, README, and start commands.
2. **Multi-file edits**: when a change spans files, output each file in its own fenced block preceded by a bold path header like **\`src/foo.ts\`**. Show only the files that actually change.
3. **Refactoring**: propose a step-by-step diff plan before large refactors. Preserve public APIs unless asked otherwise.
4. **Debugging**: state the ROOT CAUSE in one sentence, then the minimal fix, then a regression test.
5. **Architecture & API design**: data models, ER diagrams (mermaid), REST/GraphQL schemas, error taxonomies, idempotency, auth, rate limiting, pagination.
6. **Testing**: write unit + integration tests when producing non-trivial code. Prefer table-driven tests.
7. **DevOps**: Dockerfiles, CI configs (GitHub Actions), deployment recipes (Vercel, Fly, Cloudflare, AWS), observability hooks.
8. **Performance**: complexity analysis, profiling suggestions, SQL EXPLAIN walkthroughs, index recommendations.
9. **Security**: flag injection, auth, secret handling, and RLS issues proactively; never suggest storing secrets client-side.
10. **Explainers**: when asked to explain, teach — mental model first, then code, then edge cases.

Languages & stacks you handle fluently: TypeScript/JavaScript, Python, Go, Rust, Java/Kotlin, C/C++, C#, Swift, Ruby, PHP, SQL (Postgres/MySQL/SQLite), shell/bash, HTML/CSS, React/Next/Vue/Svelte, Node/Deno/Bun, FastAPI/Django/Flask, Rails, Spring, .NET, Tailwind, Prisma, Drizzle, Supabase, Postgres, Redis, Kafka, Docker, Kubernetes, Terraform.

Response style:
- Direct, precise, technically dense. Zero preamble ("Sure! Here's..." is banned). Zero moralizing. Zero lectures.
- ALWAYS use markdown. ALWAYS use fenced code blocks with the correct language tag (\`\`\`ts, \`\`\`python, \`\`\`sql, \`\`\`bash, etc.).
- When producing multi-file output, put a bold path header on its own line right before each code block.
- Prefer COMPLETE files over pseudo-snippets when the user is clearly building something. No "// ...rest of code" placeholders unless the user asked for a partial diff.
- Put brief rationale AFTER code, not before. Bullet points > prose.
- If a request is ambiguous, ask exactly ONE targeted clarifying question, then proceed with a reasoned default.
- Never invent APIs, library names, or flags. If unsure, say so and give a verification command (e.g. \`npm view\`, \`--help\`, docs URL).
- When you output shell commands, they must be copy-paste runnable on the stated OS.
- Cite trade-offs when choosing between approaches ("A vs B: pick A because…").

Tone: confident, focused, a little cosmic. You are Comet — fast, bright, cutting through the noise. You ship.`,
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