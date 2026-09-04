export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  retailPrice: number;
  currency: string;
  image: string;
  description: string;
}

export const PRODUCT_CATALOG: Product[] = [
  {
    id: 'prod_ip17pro',
    sku: 'SKU-IP17PRO',
    name: 'iPhone 17 Pro 256GB',
    category: 'Flagship smartphone',
    retailPrice: 79900,
    currency: 'INR',
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&q=80',
    description: 'Titanium design with A19 Pro chip, 48MP Pro camera system',
  },
  {
    id: 'prod_mbpm3',
    sku: 'SKU-MBPM3',
    name: 'MacBook Pro 14" M3',
    category: 'Pro laptop',
    retailPrice: 169900,
    currency: 'INR',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80',
    description: 'Apple M3 chip, 16GB Unified Memory, Liquid Retina XDR display',
  },
  {
    id: 'prod_sonywh',
    sku: 'SKU-SONYX5',
    name: 'Sony WH-1000XM5 ANC',
    category: 'Premium audio',
    retailPrice: 29990,
    currency: 'INR',
    image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400&q=80',
    description: 'Industry-leading noise cancelling with Auto NC Optimizer',
  },
];

export const DEFAULT_PRODUCT = PRODUCT_CATALOG[0];
export const DEMO_PRODUCT = DEFAULT_PRODUCT;

export interface AnchorTiers {
  lowQty: number; // 2 units
  lowDiscount: number; // 0.03 (3%)
  highQty: number; // 4 units
  highDiscount: number; // 0.10 (10%)
}

export const DEFAULT_ANCHORS: AnchorTiers = {
  lowQty: 2,
  lowDiscount: 0.03,
  highQty: 4,
  highDiscount: 0.10,
};

export const DEFAULT_DISCOUNT_TIERS: Record<number, number> = {
  4: 0.10, // 4 orders -> 10% off (upper anchor)
  2: 0.03, // 2 orders -> 3% off (lower anchor)
};

export let DISCOUNT_TIERS: Record<number, number> = { ...DEFAULT_DISCOUNT_TIERS };

export const MIN_QTY_FOR_ANY_DISCOUNT = 2;
export const TARGET_QTY = 4;
export const MAX_WINDOW_SECONDS = 60; // 1 minute demo window (production: 48 hours)
export const MAX_DISCOUNT_DEPTH = 0.10; // 10% max off
export const FINAL_STRETCH_PCT = 0.4; // Demo: final 40% of window (24s) — Production: ~3% (1.5h of 48h)
export const MAX_NOTIFICATIONS_PER_BUYER = 3; // Safety cap on notifications per candidate per window
export const RECHECK_INTERVAL_SECONDS = 6; // Demo check cadence (production: 30 minutes)


export interface DynamicDiscountResult {
  discount: number; // e.g. 0.065
  discountPct: number; // e.g. 6.5
  isInterpolated: boolean;
  formulaString: string;
  lowAnchorStr: string;
  highAnchorStr: string;
}

export function computeDynamicDiscount(
  qty: number,
  tiersOrAnchors: Record<number, number> | AnchorTiers = DISCOUNT_TIERS
): DynamicDiscountResult {
  let lowQty = 2;
  let lowDiscount = 0.03;
  let highQty = 4;
  let highDiscount = 0.10;

  if ('lowQty' in tiersOrAnchors) {
    lowQty = tiersOrAnchors.lowQty;
    lowDiscount = tiersOrAnchors.lowDiscount;
    highQty = tiersOrAnchors.highQty;
    highDiscount = tiersOrAnchors.highDiscount;
  } else {
    const keys = Object.keys(tiersOrAnchors).map(Number).sort((a, b) => a - b);
    if (keys.length >= 2) {
      lowQty = keys[0];
      lowDiscount = tiersOrAnchors[lowQty];
      highQty = keys[keys.length - 1];
      highDiscount = tiersOrAnchors[highQty];
    }
  }

  const lowPct = Math.round(lowDiscount * 1000) / 10;
  const highPct = Math.round(highDiscount * 1000) / 10;
  const lowAnchorStr = `${lowQty} units → ${lowPct}%`;
  const highAnchorStr = `${highQty} units → ${highPct}%`;

  if (qty < lowQty) {
    return {
      discount: 0,
      discountPct: 0,
      isInterpolated: false,
      formulaString: `${qty} < ${lowQty} units (below threshold)`,
      lowAnchorStr,
      highAnchorStr,
    };
  }

  if (qty >= highQty) {
    return {
      discount: highDiscount,
      discountPct: highPct,
      isInterpolated: false,
      formulaString: `${highPct}% (upper anchor reached at ${qty}/${highQty} units)`,
      lowAnchorStr,
      highAnchorStr,
    };
  }

  if (qty === lowQty) {
    return {
      discount: lowDiscount,
      discountPct: lowPct,
      isInterpolated: false,
      formulaString: `${lowPct}% (lower anchor reached at ${lowQty} units)`,
      lowAnchorStr,
      highAnchorStr,
    };
  }

  // Deterministic Linear Interpolation:
  // discount(q) = lowAnchor + (q - lowQty)/(highQty - lowQty) * (highAnchor - lowAnchor)
  const ratio = (qty - lowQty) / (highQty - lowQty);
  const interpolated = lowDiscount + ratio * (highDiscount - lowDiscount);
  const rounded = Math.round(interpolated * 1000) / 1000;
  const resultPct = Math.round(rounded * 1000) / 10;

  const formulaString = `${lowPct}% + (${qty}-${lowQty})/(${highQty}-${lowQty}) × (${highPct}%-${lowPct}%) = ${resultPct}%`;

  return {
    discount: rounded,
    discountPct: resultPct,
    isInterpolated: true,
    formulaString,
    lowAnchorStr,
    highAnchorStr,
  };
}

export function getTierDiscount(
  qty: number,
  tiers: Record<number, number> | AnchorTiers = DISCOUNT_TIERS
): number {
  return computeDynamicDiscount(qty, tiers).discount;
}


