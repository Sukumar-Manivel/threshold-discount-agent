// app/api/coupon-targeting/route.ts
// Legacy LLM-based coupon targeting has been replaced by a rule-based
// Equal-Opportunity Broadcast Engine (see lib/targeting.ts).
//
// This route is retained for backward compatibility. It delegates to the
// deterministic broadcast evaluator — no LLM call is involved.

import { NextRequest, NextResponse } from 'next/server';
import { evaluateEqualOpportunityBroadcast, CandidateUser } from '@/lib/targeting';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Map legacy request shape to the broadcast engine's params
    const result = evaluateEqualOpportunityBroadcast({
      secondsRemaining: body.secondsRemaining ?? 0,
      currentOrderCount: body.currentOrderCount ?? 0,
      targetQty: body.targetQty ?? 4,
      minQtyForDiscount: body.minQtyForDiscount ?? 2,
      retailPrice: body.retailPrice ?? 79900,
      discountTiers: body.discountTiers ?? { 2: 0.03, 4: 0.10 },
      targetSku: body.targetSku ?? 'THRESH-001',
      candidates: (body.candidates ?? []) as CandidateUser[],
      isInitialBroadcast: body.isInitialBroadcast ?? false,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('coupon-targeting route error:', err);
    return NextResponse.json(
      { error: 'Failed to compute broadcast decision', detail: String(err) },
      { status: 500 }
    );
  }
}
