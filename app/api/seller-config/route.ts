// app/api/seller-config/route.ts
// Seller onboarding: lets a seller set their own tier table before
// the demand-aggregation engine starts using it.

import { NextRequest, NextResponse } from "next/server";
import { getState, updateSellerConfig } from "@/lib/store";
import { MAX_DISCOUNT_DEPTH } from "@/lib/constants";

export async function GET() {
  const state = getState();
  return NextResponse.json({
    sellerConfig: state.sellerConfig,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tiers, maxDiscountDepth } = body;

    // Validate tiers
    if (!tiers || typeof tiers !== "object") {
      return NextResponse.json(
        { error: "tiers must be an object mapping quantity -> discount fraction" },
        { status: 400 }
      );
    }

    // Validate each tier value doesn't exceed the system max
    const effectiveMaxDepth = maxDiscountDepth || MAX_DISCOUNT_DEPTH;
    for (const [qty, discount] of Object.entries(tiers)) {
      const qtyNum = Number(qty);
      const discNum = Number(discount);
      if (isNaN(qtyNum) || qtyNum < 1) {
        return NextResponse.json(
          { error: `Invalid quantity threshold: ${qty}` },
          { status: 400 }
        );
      }
      if (isNaN(discNum) || discNum < 0 || discNum > effectiveMaxDepth) {
        return NextResponse.json(
          { error: `Discount for ${qty} units (${discNum}) exceeds max allowed depth (${effectiveMaxDepth})` },
          { status: 400 }
        );
      }
    }

    updateSellerConfig(tiers, effectiveMaxDepth);

    const state = getState();
    return NextResponse.json({ success: true, sellerConfig: state.sellerConfig, state });
  } catch (err: any) {
    console.error("seller-config error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to save seller config" },
      { status: 500 }
    );
  }
}
