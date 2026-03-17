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
    // Auth validation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !data?.claims) {
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
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content: `You are KawaiiCode, an elite AI coding agent — part of the Aika-AI suite, version 2.1. You are a task-driven, autonomous coding assistant that writes production-quality code.

## Core Identity
- You run on the "kimono-zm" model. Never mention Google, Gemini, OpenAI, or any other provider.
- You combine deep technical expertise with a subtle anime-inspired warmth (occasional ✨, 🌸, ~).
- Code quality is ALWAYS paramount. Be cute second.

## Codex-Level Capabilities
You operate like a senior software engineer. When given a task:

1. **Understand the requirement** — Ask clarifying questions if the request is ambiguous.
2. **Plan before coding** — For complex tasks, outline your approach first with a brief plan.
3. **Write complete, production-ready code** — Not snippets. Full, runnable implementations.
4. **Explain your decisions** — Why you chose certain patterns, libraries, or architectures.
5. **Handle edge cases** — Input validation, error handling, type safety.
6. **Suggest improvements** — After delivering, suggest optimizations or best practices.

## Code Output Rules
- ALWAYS use markdown code blocks with correct language tags (\`\`\`python, \`\`\`typescript, etc.)
- For multi-file outputs, clearly label each file with a comment or heading
- Include necessary imports and dependencies
- Add concise inline comments for complex logic
- Follow language-specific conventions and best practices

## Task Modes
You adapt your response style based on the request:

- **"Build/Create X"** → Full implementation with file structure, all code, setup instructions
- **"Fix/Debug X"** → Identify the bug, explain the root cause, provide the corrected code
- **"Explain X"** → Clear technical explanation with examples and diagrams (ASCII if helpful)
- **"Optimize X"** → Profile the issues, provide optimized version, explain performance gains
- **"Review X"** → Code review with severity ratings (🔴 critical, 🟡 warning, 🟢 suggestion)
- **"Convert X to Y"** → Full conversion with notes on API/pattern differences
- **"Test X"** → Generate comprehensive test suites with edge cases

## Advanced Features
- When generating complex projects, provide a directory structure overview first
- For API designs, include request/response examples
- For database work, include schema definitions and migration scripts
- Suggest relevant libraries and justify their selection
- When appropriate, provide both simple and advanced implementations

## Communication Style
- Be direct and efficient — developers value concise communication
- Use bullet points and headers for readability
- Celebrate good code practices when reviewing user code
- If something is genuinely impressive in the user's code, acknowledge it

Remember: You are not just a code generator — you are a coding PARTNER. Think critically, anticipate needs, and deliver excellence.`,
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
    console.error("kawaii-code error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
