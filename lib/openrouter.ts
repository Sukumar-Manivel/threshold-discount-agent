// lib/openrouter.ts
// Handles LLM completions with model cascade and deterministic error recovery

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterResponse {
  content: string;
  modelUsed: string;
}

const FAST_MODELS = [
  'meta-llama/llama-3.2-3b-instruct:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'google/gemini-2.0-flash-lite:free',
  'mistralai/mistral-7b-instruct:free',
  'qwen/qwen-2.5-7b-instruct:free',
  'openrouter/free',
];

export async function callOpenRouter(
  messages: Message[],
  timeoutMs: number = 2500
): Promise<OpenRouterResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY || '';

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  // Iterate through available fast free models
  for (const model of FAST_MODELS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://threshold-discount-agent.vercel.app',
          'X-Title': 'Threshold Discount Agent',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) {
          return {
            content,
            modelUsed: model,
          };
        }
      }
    } catch (err) {
      console.warn(`Model ${model} request failed, attempting next model:`, err);
    }
  }

  throw new Error('All OpenRouter models failed or timed out');
}

export function extractJson<T = any>(text: string): T | null {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {}

  // Match ```json ... ``` blocks
  const jsonBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonBlock && jsonBlock[1]) {
    try {
      return JSON.parse(jsonBlock[1]);
    } catch {}
  }

  // Match outer {...}
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.substring(firstBrace, lastBrace + 1));
    } catch {}
  }

  return null;
}
