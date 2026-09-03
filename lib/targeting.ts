// lib/targeting.ts
// Shared coupon targeting engine that reasons over candidate pools using OpenRouter LLM,
// with strict mathematical bounding and deterministic fallback if all models fail.

import { callOpenRouter, extractJson } from './openrouter';

export interface CandidateUser {
  userId: string;
  label: string;
  searchedAt: string;
  searchCount: number;
  isFrequentBuyer: boolean;
}

export interface CouponTargetingParams {
  productId: string;
  productName: string;
  gap: number;
  maxNudges: number;
  maxCouponValue: number;
  candidates: CandidateUser[];
}

export interface CouponTargetingResult {
  selected: { userId: string; reason: string }[];
  couponValue: number;
  summary: string;
  modelUsed: string;
  isFallback?: boolean;
}

export async function executeCouponTargeting(
  params: CouponTargetingParams
): Promise<CouponTargetingResult> {
  const { productId, productName, gap, maxNudges, maxCouponValue, candidates } = params;

  if (!candidates || candidates.length === 0) {
    return {
      selected: [],
      couponValue: 0,
      summary: 'No eligible candidates in targeting pool.',
      modelUsed: 'deterministic',
    };
  }

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
  "selected": [{ "userId": string, "reason": string }],
  "couponValue": number,
  "summary": string
}`;

  const user = JSON.stringify({
    productId,
    productName,
    gapUnitsNeeded: gap,
    maxNudges,
    maxCouponValue,
    candidates,
  });

  try {
    const { content, modelUsed } = await callOpenRouter([
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]);

    const parsed = extractJson<CouponTargetingResult>(content);

    if (parsed && Array.isArray(parsed.selected) && parsed.selected.length > 0) {
      // Defensive hard bounds enforcement
      let selected = parsed.selected.filter((s) =>
        candidates.some((c) => c.userId === s.userId)
      );

      if (selected.length > maxNudges) {
        selected = selected.slice(0, maxNudges);
      }

      let couponValue = typeof parsed.couponValue === 'number' ? parsed.couponValue : maxCouponValue;
      if (couponValue > maxCouponValue) couponValue = maxCouponValue;
      if (couponValue < 1) couponValue = 1;

      return {
        selected,
        couponValue,
        summary: parsed.summary || `LLM selected ${selected.length} candidate(s) to bridge ${gap}-unit gap.`,
        modelUsed,
        isFallback: false,
      };
    }
  } catch (err) {
    console.warn('executeCouponTargeting LLM call failed, engaging deterministic fallback:', err);
  }

  // Graceful Deterministic Fallback:
  // Sort candidates by priority (frequent buyers first, then higher search counts)
  const sorted = [...candidates].sort((a, b) => {
    if (a.isFrequentBuyer && !b.isFrequentBuyer) return -1;
    if (!a.isFrequentBuyer && b.isFrequentBuyer) return 1;
    return b.searchCount - a.searchCount;
  });

  const selectedCandidates = sorted.slice(0, maxNudges);

  return {
    selected: selectedCandidates.map((c) => ({
      userId: c.userId,
      reason: c.isFrequentBuyer
        ? 'Selected by deterministic rule: High-propensity frequent buyer.'
        : `Selected by deterministic rule: Active searcher (${c.searchCount} queries, ${c.searchedAt}).`,
    })),
    couponValue: maxCouponValue,
    summary: `Deterministic fallback: selected ${selectedCandidates.length} high-propensity candidate(s) under safety cap.`,
    modelUsed: 'deterministic-fallback',
    isFallback: true,
  };
}
