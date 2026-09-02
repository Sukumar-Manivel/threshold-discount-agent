// lib/openrouter.ts
// Shared helper for calling OpenRouter's free model router from Next.js API routes.

type OpenRouterMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenRouterResponse = {
  id: string;
  model: string; // which underlying free model actually served the request
  choices: {
    message: { role: string; content: string };
  }[];
};

export async function callOpenRouter(
  messages: OpenRouterMessage[],
  { jsonMode = true }: { jsonMode?: boolean } = {}
): Promise<{ content: string; modelUsed: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      // Optional but recommended by OpenRouter for attribution/analytics — safe to keep.
      "HTTP-Referer": "https://threshold-discount-agent.vercel.app",
      "X-Title": "Threshold-Discount Agent",
    },
    body: JSON.stringify({
      // The free router auto-selects a currently-available free open-source model
      // that supports the request's requirements (e.g. JSON output). This avoids
      // hardcoding one model name that could get deprecated before demo day.
      model: "openrouter/free",
      messages,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter request failed (${res.status}): ${errText}`);
  }

  const data: OpenRouterResponse = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  return { content, modelUsed: data.model };
}
