// app/api/coupon-targeting/route.ts
// Used by the center "Razorpay Agent Stack" panel: when the aggregation window
// is short of the threshold, this reasons over the candidate pool (recent
// searchers / frequent buyers of the exact product) and picks who to nudge,
// with an explanation for the audit log — a real LLM call, not a fixed rule.

import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter } from "@/lib/openrouter";

export async function POST(req: NextRequest) {
  try {
    const { productId, productName, gap, maxNudges, maxCouponValue, candidates } = await req.json();

    // candidates e.g. [
    //   { userId: "phoneA", label: "Manual Buyer #1", searchedAt: "4m ago", searchCount: 2, isFrequentBuyer: false },
    //   { userId: "phoneD", label: "Standing-Order Agent", searchedAt: "1m ago", searchCount: 1, isFrequentBuyer: true },
    //   ...
    // ]

    const system = `You are the targeting module of a bounded demand-aggregation agent.
Given a gap in units still needed to hit a bulk-pricing threshold, and a candidate pool of
users who recently searched for or frequently buy this exact product, pick which candidates
to send a discount coupon to.

Hard rules you must follow:
- Never select more than maxNudges candidates, even if more look promising.
- Prefer more recent searches and frequent buyers over older, one-off searches.
- Never select a candidate not present in the given list.

Respond with ONLY a JSON object, no other text, in this exact shape:
{
  "selected": [{ "userId": string, "reason": string }], // reason is one short sentence per candidate
  "couponValue": number, // must not exceed maxCouponValue
  "summary": string // one short sentence for the audit log explaining the overall pick
}`;

    const user = JSON.stringify({
      productId,
      productName,
      gapUnitsNeeded: gap,
      maxNudges,
      maxCouponValue,
      candidates,
    });

    const { content, modelUsed } = await callOpenRouter([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);

    const parsed = JSON.parse(content);

    // Defensive bound enforcement — never trust the model output alone for the
    // hard caps, even though the prompt asks it to respect them.
    if (Array.isArray(parsed.selected) && parsed.selected.length > maxNudges) {
      parsed.selected = parsed.selected.slice(0, maxNudges);
    }
    if (typeof parsed.couponValue === "number" && parsed.couponValue > maxCouponValue) {
      parsed.couponValue = maxCouponValue;
    }

    return NextResponse.json({ ...parsed, modelUsed });
  } catch (err) {
    console.error("coupon-targeting error:", err);
    return NextResponse.json(
      { error: "Failed to compute coupon targeting", detail: String(err) },
      { status: 500 }
    );
  }
}
