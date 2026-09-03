// lib/openrouter.ts
// Robust OpenRouter client with multi-model fallback cascade and defensive JSON extraction.

export type OpenRouterMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

// Top verified free models on OpenRouter (checked dynamically)
export const RELIABLE_FREE_MODELS = [
  'nvidia/nemotron-3.5-lightning:free',
  'minimax/minimax-m3:free',
  'liquid/lfm-2.5-2.6b:free',
  'cohere/north-mini-code:free',
  'openrouter/free',
];

/**
 * Safely extracts a JSON object from model output, handling:
 * 1. Direct valid JSON strings
 * 2. Markdown fenced code blocks: ```json ... ```
 * 3. Text with reasoning preamble before/after the { ... } object
 */
export function extractJson<T = any>(rawText: string | null | undefined): T | null {
  if (!rawText || typeof rawText !== 'string') return null;

  const trimmed = rawText.trim();

  // 1. Direct parse attempt
  try {
    return JSON.parse(trimmed);
  } catch {}

  // 2. Strip ```json ... ``` or ``` ... ``` code blocks
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch && fenceMatch[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {}
  }

  // 3. Extract the outermost balanced JSON object { ... }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {}
  }

  return null;
}

/**
 * Executes a completion across a prioritized list of free models.
 * If a model returns 404, rate limits, empty content, or unparseable text,
 * it immediately fails over to the next candidate model.
 */
export async function callOpenRouter(
  messages: OpenRouterMessage[],
  { jsonMode = true, timeoutMs = 6000 }: { jsonMode?: boolean; timeoutMs?: number } = {}
): Promise<{ content: string; modelUsed: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }

  const errors: string[] = [];

  for (const model of RELIABLE_FREE_MODELS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://threshold-discount-agent.vercel.app',
          'X-Title': 'Threshold-Discount Agent',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        errors.push(`[${model}] HTTP ${res.status}: ${errText.slice(0, 100)}`);
        continue; // Try next model
      }

      const data = await res.json();
      const choice = data.choices?.[0];
      const rawContent = choice?.message?.content || choice?.message?.reasoning || '';

      if (!rawContent || rawContent.trim() === '' || rawContent === 'null') {
        errors.push(`[${model}] returned empty/null content`);
        continue; // Try next model
      }

      // If in jsonMode, verify that we can actually parse JSON out of it
      if (jsonMode) {
        const parsed = extractJson(rawContent);
        if (!parsed) {
          errors.push(`[${model}] content could not be parsed into JSON`);
          continue; // Try next model
        }
      }

      // Succeeded! Return content and model identifier
      return {
        content: rawContent,
        modelUsed: data.model || model,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      errors.push(`[${model}] ${err.name === 'AbortError' ? 'timed out' : err.message}`);
      continue;
    }
  }

  throw new Error(`All OpenRouter free models failed: ${errors.join(' | ')}`);
}
