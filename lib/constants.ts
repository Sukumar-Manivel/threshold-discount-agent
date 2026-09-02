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
    category: 'Flagship Smartphone',
    retailPrice: 79900,
    currency: 'INR',
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&q=80',
    description: 'Titanium design with A19 Pro chip, 48MP Pro camera system',
  },
  {
    id: 'prod_mbpm3',
    sku: 'SKU-MBPM3',
    name: 'MacBook Pro 14" M3',
    category: 'Pro Laptop',
    retailPrice: 169900,
    currency: 'INR',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80',
    description: 'Apple M3 chip, 16GB Unified Memory, Liquid Retina XDR display',
  },
  {
    id: 'prod_sonywh',
    sku: 'SKU-SONYX5',
    name: 'Sony WH-1000XM5 ANC',
    category: 'Premium Audio',
    retailPrice: 29990,
    currency: 'INR',
    image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400&q=80',
    description: 'Industry-leading noise cancelling with Auto NC Optimizer',
  },
];

export const DEFAULT_PRODUCT = PRODUCT_CATALOG[0];
export const DEMO_PRODUCT = DEFAULT_PRODUCT;

export const DEFAULT_DISCOUNT_TIERS: Record<number, number> = {
  10: 0.10, // 10 orders -> 10% off
  9: 0.08,  // 9 orders  -> 8% off
  8: 0.06,  // 8 orders  -> 6% off
  7: 0.04,  // 7 orders  -> 4% off
  6: 0.02,  // 6 orders  -> 2% off
};

export let DISCOUNT_TIERS: Record<number, number> = { ...DEFAULT_DISCOUNT_TIERS };

export const MIN_QTY_FOR_ANY_DISCOUNT = 6;
export const TARGET_QTY = 10;
export const MAX_WINDOW_SECONDS = 60; // 1 minute demo window (compressed from 48h)
export const MAX_DISCOUNT_DEPTH = 0.10; // 10% max off
export const MAX_NUDGES_PER_WINDOW = 3;

export function getTierDiscount(qty: number, tiers: Record<number, number> = DISCOUNT_TIERS): number {
  const tierKeys = Object.keys(tiers)
    .map(Number)
    .sort((a, b) => b - a);

  for (const tier of tierKeys) {
    if (qty >= tier) {
      return tiers[tier];
    }
  }
  return 0;
}

