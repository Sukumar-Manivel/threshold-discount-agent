// lib/targeting.ts
// Equal-Opportunity Nudge Broadcast Engine (Fully Rule-Based)
//
// ARCHITECTURAL DESIGN DECISION:
// Payment-adjacent decisions and incentive broadcasts must NEVER depend on external LLM calls
// that can fail, be rate-limited, or introduce arbitrary ranking bias between identical shoppers.
//
// Every eligible candidate who searched for this exact SKU and has not yet purchased
// receives the exact same offer simultaneously on a transparent schedule:
// 1. Time-Gated: Activates during final stretch (demo: 40% of window / 24s; production: ~3% / 1.5h of 48h).
// 2. Equal-Opportunity: Broadcasts to 100% of eligible SKU searchers simultaneously without ranking caps.
// 3. Change-Gated Cadence: Only re-notifies if the offer tier genuinely improves (preventing spam).
// 4. Hard Safety Bound: Max 3 notifications per candidate per window.
// 5. Bounded Scope: Control / unrelated shoppers are strictly excluded.

import {
  FINAL_STRETCH_PCT,
  MAX_NOTIFICATIONS_PER_BUYER,
  MAX_WINDOW_SECONDS,
  computeDynamicDiscount,
  DynamicDiscountResult,
} from './constants';

export interface CandidateUser {
  userId: string;
  label: string;
  searchedAt: string;
  searchCount: number;
  isFrequentBuyer: boolean;
  searchedSku: string;
  ordered: boolean;
  notificationCount: number;
  lastNotifiedDiscountPct?: number;
}

export interface BroadcastDecision {
  isFinalStretch: boolean;
  eligibleCandidates: CandidateUser[];
  broadcastCandidates: CandidateUser[];
  discountPct: number;
  discountedPrice: number;
  isReNotification: boolean;
  tierChanged: boolean;
  reason: string;
  summary: string;
}

/**
 * Evaluates whether the window is in its final stretch.
 */
export function isWindowInFinalStretch(secondsRemaining: number, totalSeconds: number = MAX_WINDOW_SECONDS): boolean {
  return secondsRemaining <= totalSeconds * FINAL_STRETCH_PCT;
}

/**
 * Filters the eligible candidate pool:
 * - Must have searched for the target SKU (strictly excludes unrelated shoppers)
 * - Must not have ordered already
 * - Must not have exceeded the MAX_NOTIFICATIONS_PER_BUYER safety cap
 */
export function getEligibleCandidatePool(
  candidates: CandidateUser[],
  targetSku: string
): CandidateUser[] {
  return candidates.filter(
    (c) =>
      c.searchedSku === targetSku &&
      !c.ordered &&
      c.notificationCount < MAX_NOTIFICATIONS_PER_BUYER
  );
}

/**
 * Computes the deterministic equal-opportunity broadcast decision for the current state.
 */
export function evaluateEqualOpportunityBroadcast(params: {
  secondsRemaining: number;
  totalSeconds?: number;
  currentOrderCount: number;
  targetQty: number;
  minQtyForDiscount: number;
  retailPrice: number;
  discountTiers: Record<number, number>;
  targetSku: string;
  candidates: CandidateUser[];
  isInitialBroadcast?: boolean;
}): BroadcastDecision {
  const {
    secondsRemaining,
    totalSeconds = MAX_WINDOW_SECONDS,
    currentOrderCount,
    targetQty,
    minQtyForDiscount,
    retailPrice,
    discountTiers,
    targetSku,
    candidates,
    isInitialBroadcast = false,
  } = params;

  const inFinalStretch = isWindowInFinalStretch(secondsRemaining, totalSeconds);
  const eligiblePool = getEligibleCandidatePool(candidates, targetSku);

  if (!inFinalStretch) {
    return {
      isFinalStretch: false,
      eligibleCandidates: eligiblePool,
      broadcastCandidates: [],
      discountPct: 0,
      discountedPrice: retailPrice,
      isReNotification: false,
      tierChanged: false,
      reason: `Window not in final stretch (${secondsRemaining}s remaining > ${Math.round(totalSeconds * FINAL_STRETCH_PCT)}s threshold). Broadcast scheduled for final 40%.`,
      summary: 'Broadcast standby: awaiting final stretch threshold.',
    };
  }

  if (eligiblePool.length === 0) {
    const allSearchers = candidates.filter((c) => c.searchedSku === targetSku && !c.ordered);
    const allCapped = allSearchers.length > 0 && allSearchers.every((c) => c.notificationCount >= MAX_NOTIFICATIONS_PER_BUYER);

    if (allCapped) {
      return {
        isFinalStretch: true,
        eligibleCandidates: [],
        broadcastCandidates: [],
        discountPct: 0,
        discountedPrice: retailPrice,
        isReNotification: true,
        tierChanged: false,
        reason: `Tier check: all eligible candidates have reached the maximum notification safety cap (${MAX_NOTIFICATIONS_PER_BUYER}). No further notifications sent.`,
        summary: `All candidates reached max notification cap (${MAX_NOTIFICATIONS_PER_BUYER}).`,
      };
    }

    return {
      isFinalStretch: true,
      eligibleCandidates: [],
      broadcastCandidates: [],
      discountPct: 0,
      discountedPrice: retailPrice,
      isReNotification: !isInitialBroadcast,
      tierChanged: false,
      reason: isInitialBroadcast
        ? 'Final stretch entered (40% of window remaining). No eligible candidates to notify.'
        : 'Tier check: no eligible candidates remaining in pool (all ordered or cap reached).',
      summary: 'No eligible candidates.',
    };
  }

  // Calculate current available discount based on order count:
  // If below lower anchor (e.g. 1 unit): target lower anchor (2 units @ 3%)
  // If at/above lower anchor (e.g. 2 units): target next dynamic milestone (3 units @ 6.5%)
  const isBelowLowerAnchor = currentOrderCount < minQtyForDiscount;
  let targetMilestoneQty: number;
  let dynamicResult: DynamicDiscountResult;

  if (isBelowLowerAnchor) {
    targetMilestoneQty = minQtyForDiscount;
    dynamicResult = computeDynamicDiscount(targetMilestoneQty, discountTiers);
  } else {
    targetMilestoneQty = Math.min(targetQty, currentOrderCount + 1);
    dynamicResult = computeDynamicDiscount(targetMilestoneQty, discountTiers);
  }

  const discountPctVal = dynamicResult.discountPct; // e.g. 3 or 6.5
  const discountedPrice = Math.round(retailPrice * (1 - dynamicResult.discount));

  // Check for candidates never notified before (including late arrivals during final stretch)
  const unnotifiedCandidates = eligiblePool.filter((c) => c.lastNotifiedDiscountPct === undefined);

  if (isInitialBroadcast) {
    // Initial broadcast: send to 100% of eligible pool simultaneously
    return {
      isFinalStretch: true,
      eligibleCandidates: eligiblePool,
      broadcastCandidates: eligiblePool,
      discountPct: discountPctVal,
      discountedPrice,
      isReNotification: false,
      tierChanged: true,
      reason: `Final stretch entered (${Math.round(FINAL_STRETCH_PCT * 100)}% of window remaining). Eligible pool: ${eligiblePool.length} candidates (${eligiblePool.map((c) => c.label).join(', ')}). Broadcasting current offer (${discountPctVal}% off, ₹${discountedPrice.toLocaleString('en-IN')}) to both, simultaneously.`,
      summary: `Equal-opportunity broadcast: dispatched ${discountPctVal}% offer to ${eligiblePool.map((c) => c.label).join(', ')}.`,
    };
  }

  // If a candidate joined late during final stretch:
  if (unnotifiedCandidates.length > 0) {
    return {
      isFinalStretch: true,
      eligibleCandidates: eligiblePool,
      broadcastCandidates: unnotifiedCandidates,
      discountPct: discountPctVal,
      discountedPrice,
      isReNotification: false,
      tierChanged: true,
      reason: `Eligible candidate joined: ${unnotifiedCandidates.map((c) => c.label).join(', ')}. Broadcasting current offer (${discountPctVal}% off, ₹${discountedPrice.toLocaleString('en-IN')}) immediately.`,
      summary: `Late arrival broadcast: dispatched ${discountPctVal}% offer to ${unnotifiedCandidates.map((c) => c.label).join(', ')}.`,
    };
  }

  // Re-notification: CHANGE-GATED check
  // Only re-send to candidates whose last notified discount is strictly LESS than current discountPctVal
  const candidatesNeedingUpdate = eligiblePool.filter(
    (c) => (c.lastNotifiedDiscountPct || 0) < discountPctVal
  );

  const tierChanged = candidatesNeedingUpdate.length > 0;

  if (tierChanged) {
    return {
      isFinalStretch: true,
      eligibleCandidates: eligiblePool,
      broadcastCandidates: candidatesNeedingUpdate,
      discountPct: discountPctVal,
      discountedPrice,
      isReNotification: true,
      tierChanged: true,
      reason: `Tier check: offer improved to ${discountPctVal}% off (₹${discountedPrice.toLocaleString('en-IN')}). Re-notifying: ${candidatesNeedingUpdate.map((c) => c.label).join(', ')}.`,
      summary: `Tier improved to ${discountPctVal}%: re-notified ${candidatesNeedingUpdate.map((c) => c.label).join(', ')}.`,
    };
  }

  return {
    isFinalStretch: true,
    eligibleCandidates: eligiblePool,
    broadcastCandidates: [],
    discountPct: discountPctVal,
    discountedPrice,
    isReNotification: true,
    tierChanged: false,
    reason: `Tier check: offer unchanged (${discountPctVal}% off). No re-notification sent.`,
    summary: `Offer unchanged at ${discountPctVal}%: no re-notification needed.`,
  };
}

