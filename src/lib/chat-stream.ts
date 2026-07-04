import { supabase } from "@/integrations/supabase/client";

type MsgContent = string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
type Msg = { role: "user" | "assistant"; content: MsgContent };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const UNBOUND_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-unbound`;
const REN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-ren`;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
  };
}

export async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
  mode = "aika",
}: {
  messages: Msg[];
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
  mode?: "aika" | "unbound" | "ren";
}) {
  const headers = await getAuthHeaders();
  const url = mode === "unbound" ? UNBOUND_URL : mode === "ren" ? REN_URL : CHAT_URL;
  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ messages }),
  });

  if (resp.status === 429) {
    onError("Rate limit exceeded. Please wait a moment and try again.");
    return;
  }
  if (resp.status === 402) {
    onError("AI usage limit reached. Please add credits.");
    return;
  }
  if (resp.status === 401) {
    onError("You must be signed in to chat with Aika.");
    return;
  }
  if (!resp.ok || !resp.body) {
    onError("Failed to get a response from Aika.");
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") {
        streamDone = true;
        break;
      }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }

  // Final flush
  if (textBuffer.trim()) {
    for (let raw of textBuffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (raw.startsWith(":") || raw.trim() === "") continue;
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        /* ignore */
      }
    }
  }

  onDone();
}

const IMAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`;

export async function generateImage(prompt: string): Promise<string> {
  const headers = await getAuthHeaders();
  const resp = await fetch(IMAGE_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ prompt }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.error || "Failed to generate image");
  }

  const data = await resp.json();
  return data.imageUrl;
}
