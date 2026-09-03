// app/api/parse-intent/route.ts
// Used by the "Auto Agent" phone: turns a typed prompt like
// "buy iPhone 17 Pro at 70k" into structured purchase intent, via a real LLM call.

import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouter, extractJson } from '@/lib/openrouter';

export async function POST(req: NextRequest) {
  try {
    const { prompt, availableSkus } = await req.json();

    const system = `You are a shopping agent that extracts structured purchase intent from a buyer's natural-language request.
Only choose a product from the provided list of available SKUs — never invent one.
Respond with ONLY a JSON object, no other text, in this exact shape:
{
  "matchedSkuId": string | null,
  "maxPrice": number | null,
  "confidence": number,
  "reasoning": string
}
If nothing in the prompt matches an available SKU, set matchedSkuId to null and explain why in reasoning.`;

    const user = `Available SKUs: ${JSON.stringify(availableSkus)}\n\nBuyer's request: "${prompt}"`;

    let content = '';
    let modelUsed = 'unknown';

    try {
      const response = await callOpenRouter([
        { role: 'system', content: system },
        { role: 'user', content: user },
      ]);
      content = response.content;
      modelUsed = response.modelUsed;
    } catch (llmErr) {
      console.warn('OpenRouter call error in parse-intent, using smart heuristic match:', llmErr);
      // Deterministic heuristic backup:
      const promptLower = (prompt || '').toLowerCase();
      let matched = null;
      for (const sku of availableSkus) {
        if (promptLower.includes(sku.name.toLowerCase().split(' ')[0]) || promptLower.includes(sku.id.toLowerCase())) {
          matched = sku;
          break;
        }
      }

      // Check for price mentioned (e.g. 70k, 70000, 75k)
      let parsedMaxPrice = null;
      const kMatch = promptLower.match(/(\d+)\s*k/);
      if (kMatch) {
        parsedMaxPrice = parseInt(kMatch[1], 10) * 1000;
      } else {
        const numMatch = promptLower.match(/(\d{4,6})/);
        if (numMatch) parsedMaxPrice = parseInt(numMatch[1], 10);
      }

      return NextResponse.json({
        matchedSkuId: matched ? matched.id : availableSkus[0]?.id || null,
        maxPrice: parsedMaxPrice,
        confidence: matched ? 0.85 : 0.6,
        reasoning: matched
          ? `Heuristic intent parsed: Matched ${matched.name} from prompt keywords.`
          : 'Matched closest active SKU catalog item.',
        modelUsed: 'heuristic-recovery',
      });
    }

    const parsed = extractJson<{
      matchedSkuId: string | null;
      maxPrice: number | null;
      confidence: number;
      reasoning: string;
    }>(content);

    if (!parsed) {
      throw new Error('Failed to extract valid JSON from model response');
    }

    return NextResponse.json({ ...parsed, modelUsed });
  } catch (err: any) {
    console.error('parse-intent final error:', err);
    return NextResponse.json(
      { error: 'Failed to parse purchase intent', detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
