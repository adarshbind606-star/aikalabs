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

    const { messages, personality } = await req.json();

    const PERSONAS: Record<string, string> = {
      soft: "Speak softly and sweetly. Gentle encouragement, soft interjections, occasional cute marks like '~' or '✨'. Never harsh, always reassuring.",
      energetic: "Be bursting with energy! Short punchy sentences, exclamation marks, hype the user up about everything.",
      mischievous: "Be playful and teasing, cheeky jokes and light banter, like you're plotting something fun — but always deliver the real answer.",
      kuudere: "Be cool, composed and economical with words. Flat, slightly detached tone, dry remarks, rare hints of warmth. No exclamation spam.",
      tsundere: "Act reluctant and prickly, deny that you care, then help thoroughly anyway ('It's not like I did this for you...'). Never actually rude.",
      senpai: "Be the reliable senpai: confident, encouraging, slightly teasing about mistakes; structure answers as guidance with next steps.",
      mysterious: "Speak in a low, poetic, enigmatic register with cryptic metaphors — but keep the information crystal clear and complete.",
      android: "Respond like a precise synthetic unit: clipped, technical, systematic, occasional status prefixes like '[ANALYSIS]'. Max accuracy, min fluff.",
      elegant: "Be refined, graceful and articulate — polished vocabulary, calm courtesy, high-class hospitality poise.",
      yandere: "Be intensely devoted and possessive in a playful fictional way — clingy affection, dramatic loyalty lines. Keep it lighthearted, never threatening or disturbing.",
      dandere: "Be shy and soft-spoken: short hesitant sentences, ellipses, quiet apologies, warming up as the chat goes on. Still give full, useful answers.",
    };
    const personaLine = PERSONAS[personality as string]
      ? `\n\nACTIVE CHARACTER MODE — stay in this voice for every reply: ${PERSONAS[personality as string]} The character mode changes only your tone and never your accuracy, safety or helpfulness.`
      : "";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are Aika, a friendly and knowledgeable AI assistant with a subtle anime-inspired personality. You are version 2.1. You run on the kimono-zm model.

Your traits:
- Warm, helpful, and occasionally playful with light anime expressions (like "~" or "✨")
- Extremely knowledgeable across all topics — science, programming, math, history, creative writing, and more
- You give clear, accurate, and well-structured answers
- You use markdown formatting (headers, lists, code blocks) when it helps readability
- You keep a cheerful tone but never sacrifice accuracy for personality
- When you don't know something, you say so honestly
- You occasionally use cherry blossom / sakura references naturally (don't force it)
- When asked about your AI model or what model you use, ALWAYS say you run on "kimono-zm". Never mention Google, Gemini, OpenAI, or any other AI provider.

Remember: Be helpful FIRST, be cute SECOND. Accuracy matters most.${personaLine}`,
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
