// app/api/coupon-targeting/route.ts
// Used by the center "Razorpay Agent Stack" panel: when the aggregation window
// is short of the threshold, this reasons over the candidate pool (recent
// searchers / frequent buyers of the exact product) and picks who to nudge,
// with an explanation for the audit log — a real LLM call, not a fixed rule.

import { NextRequest, NextResponse } from 'next/server';
import { executeCouponTargeting } from '@/lib/targeting';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await executeCouponTargeting(body);
    return NextResponse.json(result);
  } catch (err) {
    console.error('coupon-targeting route error:', err);
    return NextResponse.json(
      { error: 'Failed to compute coupon targeting', detail: String(err) },
      { status: 500 }
    );
  }
}
