// app/api/parse-intent/route.ts
// Used by the "Auto Agent" phone: turns a typed prompt like
// "buy iPhone 17 Pro at 70k" into structured purchase intent, via a real LLM call.

import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter } from "@/lib/openrouter";

export async function POST(req: NextRequest) {
  try {
    const { prompt, availableSkus } = await req.json();

    // availableSkus e.g. [{ id: "prod_ip17pro", name: "iPhone 17 Pro 256GB", retailPrice: 79900 }, ...]
    const system = `You are a shopping agent that extracts structured purchase intent from a buyer's natural-language request.
Only choose a product from the provided list of available SKUs — never invent one.
Respond with ONLY a JSON object, no other text, in this exact shape:
{
  "matchedSkuId": string | null,
  "maxPrice": number | null,
  "confidence": number, // 0 to 1
  "reasoning": string // one short sentence explaining the match, shown to the user
}
If nothing in the prompt matches an available SKU, set matchedSkuId to null and explain why in reasoning.`;

    const user = `Available SKUs: ${JSON.stringify(availableSkus)}\n\nBuyer's request: "${prompt}"`;

    const { content, modelUsed } = await callOpenRouter([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);

    const parsed = JSON.parse(content);
    return NextResponse.json({ ...parsed, modelUsed });
  } catch (err) {
    console.error("parse-intent error:", err);
    return NextResponse.json(
      { error: "Failed to parse purchase intent", detail: String(err) },
      { status: 500 }
    );
  }
}
