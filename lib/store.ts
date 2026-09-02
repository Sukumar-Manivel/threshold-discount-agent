import {
  DEFAULT_PRODUCT,
  DEFAULT_DISCOUNT_TIERS,
  MAX_WINDOW_SECONDS,
  MIN_QTY_FOR_ANY_DISCOUNT,
  PRODUCT_CATALOG,
  Product,
  TARGET_QTY,
  getTierDiscount,
} from './constants';
import {
  captureRazorpayPayment,
  createRazorpayOrder,
  refundRazorpayPayment,
} from './razorpay';

export interface OrderItem {
  id: string;
  orderNumber: number;
  buyerId: 'phoneA' | 'phoneB' | 'phoneC' | 'phoneD' | 'sim';
  buyerName: string;
  sku: string;
  retailPrice: number;
  authorizedPrice: number;
  capturedPrice?: number;
  refundAmount?: number;
  razorpayOrderId: string;
  paymentId: string;
  status: 'authorized' | 'captured' | 'refunded' | 'failed';
  timestamp: string;
  isDiscountedOnAuth?: boolean;
}

export interface PhoneState {
  phoneA: {
    ordered: boolean;
    orderId?: string;
    paymentId?: string;
    notification?: string;
    couponReceived?: boolean;
    couponDetails?: { discountPct: number; discountedPrice: number; expiresSeconds: number };
  };
  phoneB: {
    ordered: boolean;
    orderId?: string;
    paymentId?: string;
    notification?: string;
    couponReceived?: boolean;
    couponDetails?: { discountPct: number; discountedPrice: number; expiresSeconds: number };
  };
  phoneC: {
    promptText: string;
    parsed: boolean;
    recommendationShow: boolean;
    approved: boolean;
    ordered: boolean;
    orderId?: string;
    notification?: string;
  };
  phoneD: {
    promptText: string;
    isWatching: boolean;
    couponReceived: boolean;
    couponDetails?: { discountPct: number; discountedPrice: number; expiresSeconds: number };
    approved: boolean;
    ordered: boolean;
    orderId?: string;
    notification?: string;
  };
  phoneE: {
    searchQuery: string;
    couponReceived: boolean;
  };
}

export interface SellerState {
  totalOrdersReceived: number;
  settlementStatus: 'pending' | 'completed';
  totalUnits?: number;
  unitPrice?: number;
  totalPayout?: number;
  tierApplied?: string;
}

export interface SellerConfig {
  tiers: Record<number, number>;
  maxDiscountDepth: number;
  isApproved: boolean;
  approvedAt: string | null;
}

export interface ParseIntentResult {
  matchedSkuId: string | null;
  maxPrice: number | null;
  confidence: number;
  reasoning: string;
  modelUsed: string;
}

export interface AppState {
  activeProduct: Product;
  discountTiers: Record<number, number>;
  targetQty: number;
  minQtyForDiscount: number;
  orders: OrderItem[];
  windowStarted: boolean;
  windowClosed: boolean;
  secondsRemaining: number;
  startTime: number | null;
  logs: string[];
  aiReasoningLog: string[];
  phoneStates: PhoneState;
  sellerState: SellerState;
  sellerConfig: SellerConfig;
  razorpayKeys: { keyId: string; keySecret: string };
  simulatedVolumeCount: number;
  lastParseResult: ParseIntentResult | null;
  couponTargetingSummary: string | null;
}

function getFormattedTime(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `[${hh}:${mm}:${ss}]`;
}

// Global Singleton Memory State
const initialState: AppState = {
  activeProduct: DEFAULT_PRODUCT,
  discountTiers: { ...DEFAULT_DISCOUNT_TIERS },
  targetQty: TARGET_QTY,
  minQtyForDiscount: MIN_QTY_FOR_ANY_DISCOUNT,
  orders: [],
  windowStarted: false,
  windowClosed: false,
  secondsRemaining: MAX_WINDOW_SECONDS,
  startTime: null,
  logs: [
    `${getFormattedTime()} Decision Engine online. Tracking aggregate demand for ${DEFAULT_PRODUCT.name} (${DEFAULT_PRODUCT.sku}).`,
  ],
  aiReasoningLog: [],
  phoneStates: {
    phoneA: { ordered: false },
    phoneB: { ordered: false },
    phoneC: {
      promptText: 'buy ' + DEFAULT_PRODUCT.name,
      parsed: false,
      recommendationShow: false,
      approved: false,
      ordered: false,
    },
    phoneD: {
      promptText: 'buy this for me only if the price drops, ask before you pay',
      isWatching: false,
      couponReceived: false,
      approved: false,
      ordered: false,
    },
    phoneE: {
      searchQuery: 'AirPods Max',
      couponReceived: false,
    },
  },
  sellerState: {
    totalOrdersReceived: 0,
    settlementStatus: 'pending',
  },
  sellerConfig: {
    tiers: { ...DEFAULT_DISCOUNT_TIERS },
    maxDiscountDepth: 0.10,
    isApproved: false,
    approvedAt: null,
  },
  razorpayKeys: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
  },
  simulatedVolumeCount: 0,
  lastParseResult: null,
  couponTargetingSummary: null,
};

let currentState: AppState = JSON.parse(JSON.stringify(initialState));

export function switchProduct(productId: string) {
  const product = PRODUCT_CATALOG.find((p) => p.id === productId) || DEFAULT_PRODUCT;
  resetState();
  currentState.activeProduct = product;
  currentState.phoneStates.phoneC.promptText = `buy ${product.name}`;
  addLog(`${getFormattedTime()} Active product changed to: ${product.name} (SKU: ${product.sku}, Retail: ₹${product.retailPrice.toLocaleString('en-IN')})`);
  return currentState;
}

export function updateSellerConfig(tiers: Record<number, number>, maxDiscountDepth: number) {
  currentState.sellerConfig = {
    tiers: { ...tiers },
    maxDiscountDepth,
    isApproved: true,
    approvedAt: getFormattedTime(),
  };
  // Apply seller's custom tiers as the active discount tiers
  currentState.discountTiers = { ...tiers };
  addLog(`${getFormattedTime()} Seller Configuration Saved — ${Object.keys(tiers).length} tier(s) configured (max depth: ${Math.round(maxDiscountDepth * 100)}%). Seller approved.`);
}

export function setLastParseResult(result: ParseIntentResult) {
  currentState.lastParseResult = result;
  addAiLog(`${getFormattedTime()} LLM Intent Parse → SKU: ${result.matchedSkuId || 'none'}, Confidence: ${(result.confidence * 100).toFixed(0)}%, Model: ${result.modelUsed}`);
  addAiLog(`${getFormattedTime()} LLM Reasoning: "${result.reasoning}"`);
}

export function addAiLog(message: string) {
  currentState.aiReasoningLog.push(message);
  // Also add to main log with AI prefix for visibility
  currentState.logs.push(`🤖 ${message}`);
}

export async function autoAuthorizePhoneDIfNeeded() {
  if (
    currentState.phoneStates.phoneD.couponReceived &&
    !currentState.phoneStates.phoneD.ordered &&
    !currentState.windowClosed
  ) {
    const defaultDiscounted = Math.round(currentState.activeProduct.retailPrice * 0.92);
    const discountedPrice = currentState.phoneStates.phoneD.couponDetails?.discountedPrice || defaultDiscounted;
    await authorizeBuyerOrder(
      'phoneD',
      'Standing-Order Agent (Phone D)',
      discountedPrice,
      true
    );
  }
}

export function getState(): AppState {
  // Tick timer if active
  if (currentState.windowStarted && !currentState.windowClosed && currentState.startTime) {
    const elapsed = Math.floor((Date.now() - currentState.startTime) / 1000);
    const remaining = Math.max(0, MAX_WINDOW_SECONDS - elapsed);
    currentState.secondsRemaining = remaining;

    // Auto-authorize Phone D standing order when remaining time <= 30s
    if (
      remaining <= 30 &&
      currentState.phoneStates.phoneD.couponReceived &&
      !currentState.phoneStates.phoneD.ordered
    ) {
      autoAuthorizePhoneDIfNeeded();
    }

    if (remaining === 0) {
      closeWindowEngine();
    }
  }
  return currentState;
}

export function updateRazorpayKeys(keyId: string, keySecret: string) {
  currentState.razorpayKeys = { keyId, keySecret };
  addLog(`[System] Updated Razorpay API Credentials: Key ID ${keyId ? keyId.substring(0, 8) + '...' : '(Simulated)'}`);
}

export function addLog(message: string) {
  currentState.logs.push(message);
}

export function startTimerIfNeeded() {
  if (!currentState.windowStarted) {
    currentState.windowStarted = true;
    currentState.startTime = Date.now();
    currentState.secondsRemaining = MAX_WINDOW_SECONDS;
    addLog(`${getFormattedTime()} Demand aggregation window OPENED (${MAX_WINDOW_SECONDS}s countdown timer started)`);
  }
}

export async function authorizeBuyerOrder(
  buyerId: 'phoneA' | 'phoneB' | 'phoneC' | 'phoneD' | 'sim',
  buyerName: string,
  authorizedPrice?: number,
  isDiscountedOnAuth: boolean = false
) {
  if (currentState.windowClosed) {
    throw new Error('Aggregation window has already closed.');
  }

  const effectivePrice = authorizedPrice || currentState.activeProduct.retailPrice;

  startTimerIfNeeded();

  const orderNum = currentState.orders.length + 1;
  const receipt = `rcpt_${buyerId}_${Date.now()}`;

  // 1. Create Razorpay order
  const rzpOrder = await createRazorpayOrder(
    effectivePrice * 100, // in paise
    receipt,
    currentState.razorpayKeys
  );

  const paymentId = `pay_${Math.random().toString(36).substring(2, 10)}`;

  const newOrder: OrderItem = {
    id: `ord_${Date.now()}_${orderNum}`,
    orderNumber: orderNum,
    buyerId,
    buyerName,
    sku: currentState.activeProduct.sku,
    retailPrice: currentState.activeProduct.retailPrice,
    authorizedPrice: effectivePrice,
    razorpayOrderId: rzpOrder.id,
    paymentId,
    status: 'authorized',
    timestamp: getFormattedTime(),
    isDiscountedOnAuth,
  };

  currentState.orders.push(newOrder);
  currentState.sellerState.totalOrdersReceived = currentState.orders.length;

  // Audit Log Entry
  if (isDiscountedOnAuth) {
    addLog(
      `${getFormattedTime()} Order #${orderNum} [AUTHORIZED] — ${buyerName} at discounted ₹${effectivePrice.toLocaleString('en-IN')} (escrow hold pending group settlement)`
    );
  } else {
    addLog(
      `${getFormattedTime()} Order #${orderNum} [AUTHORIZED] — ${buyerName} at standard retail ₹${effectivePrice.toLocaleString('en-IN')} (held in Razorpay Escrow)`
    );
  }

  // Update phone states
  if (buyerId === 'phoneA') {
    currentState.phoneStates.phoneA = { ordered: true, orderId: newOrder.id, paymentId };
  } else if (buyerId === 'phoneB') {
    currentState.phoneStates.phoneB = { ordered: true, orderId: newOrder.id, paymentId };
  } else if (buyerId === 'phoneC') {
    currentState.phoneStates.phoneC.ordered = true;
    currentState.phoneStates.phoneC.orderId = newOrder.id;
  } else if (buyerId === 'phoneD') {
    currentState.phoneStates.phoneD.ordered = true;
    currentState.phoneStates.phoneD.orderId = newOrder.id;
  }

  // Threshold Check Trigger Logic
  checkThresholdAndTriggerCoupon();

  return newOrder;
}

export async function checkThresholdAndTriggerCoupon(force: boolean = false) {
  const currentCount = currentState.orders.length;

  if (!force && currentCount < 2) {
    return;
  }

  const gap = currentState.targetQty - currentCount;
  const projectedQty = currentCount + 1;
  const discountPct = getTierDiscount(projectedQty, currentState.discountTiers) || 0.02;
  const discountPctInt = Math.round(discountPct * 100);
  const discountedPrice = Math.round(currentState.activeProduct.retailPrice * (1 - discountPct));

  // Build candidate pool for LLM targeting
  const candidates: { userId: string; label: string; searchedAt: string; searchCount: number; isFrequentBuyer: boolean }[] = [];
  if (!currentState.phoneStates.phoneA.ordered && !currentState.phoneStates.phoneA.couponReceived) {
    candidates.push({ userId: 'phoneA', label: 'Manual Buyer #1', searchedAt: '3m ago', searchCount: 2, isFrequentBuyer: false });
  }
  if (!currentState.phoneStates.phoneB.ordered && !currentState.phoneStates.phoneB.couponReceived) {
    candidates.push({ userId: 'phoneB', label: 'Manual Buyer #2', searchedAt: '5m ago', searchCount: 1, isFrequentBuyer: false });
  }
  if (!currentState.phoneStates.phoneD.ordered && !currentState.phoneStates.phoneD.couponReceived) {
    candidates.push({ userId: 'phoneD', label: 'Standing-Order Agent', searchedAt: '1m ago', searchCount: 3, isFrequentBuyer: true });
  }

  if (candidates.length === 0) return;

  // Try LLM-powered coupon targeting; fall back to deterministic logic if LLM unavailable
  let selectedUserIds: string[] = [];
  let targetingSummary = '';

  try {
    const targetingRes = await fetch(`${getBaseUrl()}/api/coupon-targeting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: currentState.activeProduct.id,
        productName: currentState.activeProduct.name,
        gap,
        maxNudges: 3,
        maxCouponValue: discountPctInt,
        candidates,
      }),
    });

    if (targetingRes.ok) {
      const targeting = await targetingRes.json();
      if (targeting.selected && Array.isArray(targeting.selected)) {
        selectedUserIds = targeting.selected.map((s: { userId: string }) => s.userId);
        targetingSummary = targeting.summary || '';
        currentState.couponTargetingSummary = targetingSummary;

        // Log AI reasoning
        addAiLog(`${getFormattedTime()} LLM Coupon Targeting (model: ${targeting.modelUsed || 'unknown'})`);
        addAiLog(`${getFormattedTime()} Targeting Summary: "${targetingSummary}"`);
        for (const sel of targeting.selected) {
          addAiLog(`${getFormattedTime()} → ${sel.userId}: "${sel.reason}"`);
        }
      }
    }
  } catch (err) {
    // LLM unavailable — fall back to selecting all candidates
    console.warn('LLM coupon targeting unavailable, using deterministic fallback:', err);
  }

  // Fallback: if LLM didn't return selections, select all candidates deterministically
  if (selectedUserIds.length === 0) {
    selectedUserIds = candidates.map((c) => c.userId);
    targetingSummary = 'Deterministic fallback: all eligible high-intent candidates selected.';
    currentState.couponTargetingSummary = targetingSummary;
    addLog(
      `${getFormattedTime()} ⚠️ LLM targeting unavailable. 🔄 RECOVERY: Deterministic bounded fallback activated — candidate pool selected safely.`
    );
    addAiLog(
      `${getFormattedTime()} Failure Recovery: LLM targeting unavailable. Gracefully switched to bounded deterministic rule.`
    );
  }

  const nudgedCandidates: string[] = [];

  // Apply nudges based on targeting selection
  if (selectedUserIds.includes('phoneA') && !currentState.phoneStates.phoneA.ordered && !currentState.phoneStates.phoneA.couponReceived) {
    currentState.phoneStates.phoneA.couponReceived = true;
    currentState.phoneStates.phoneA.couponDetails = {
      discountPct: discountPctInt,
      discountedPrice,
      expiresSeconds: Math.min(currentState.secondsRemaining, 90),
    };
    nudgedCandidates.push('Phone A (Buyer #1)');
  }

  if (selectedUserIds.includes('phoneB') && !currentState.phoneStates.phoneB.ordered && !currentState.phoneStates.phoneB.couponReceived) {
    currentState.phoneStates.phoneB.couponReceived = true;
    currentState.phoneStates.phoneB.couponDetails = {
      discountPct: discountPctInt,
      discountedPrice,
      expiresSeconds: Math.min(currentState.secondsRemaining, 90),
    };
    nudgedCandidates.push('Phone B (Buyer #2)');
  }

  if (selectedUserIds.includes('phoneD') && !currentState.phoneStates.phoneD.ordered && !currentState.phoneStates.phoneD.couponReceived) {
    currentState.phoneStates.phoneD.isWatching = true;
    currentState.phoneStates.phoneD.couponReceived = true;
    currentState.phoneStates.phoneD.couponDetails = {
      discountPct: discountPctInt,
      discountedPrice,
      expiresSeconds: Math.min(currentState.secondsRemaining, 90),
    };
    nudgedCandidates.push('Phone D (Standing-Order Agent)');
  }

  if (nudgedCandidates.length > 0) {
    addLog(
      `${getFormattedTime()} Threshold Analyzer: ${currentCount}/${currentState.targetQty} orders received (gap=${gap}). Discovered ${nudgedCandidates.length} high-intent searchers.`
    );
    addLog(
      `${getFormattedTime()} Dynamic Nudge Triggered -> Targeted: ${nudgedCandidates.join(', ')} with ${discountPctInt}% OFF unlock (₹${discountedPrice.toLocaleString('en-IN')}).`
    );
  }

  // Auto-authorize Phone D if time remaining <= 30s
  if (currentState.secondsRemaining <= 30 && currentState.phoneStates.phoneD.couponReceived && !currentState.phoneStates.phoneD.ordered) {
    autoAuthorizePhoneDIfNeeded();
  }
}

// Helper to get base URL for internal API calls
function getBaseUrl(): string {
  if (typeof window !== 'undefined') return '';
  const port = process.env.PORT || '3000';
  return `http://localhost:${port}`;
}

export async function addSimulatedOrders(count: number) {
  for (let i = 0; i < count; i++) {
    if (currentState.windowClosed) break;
    const simNum = currentState.simulatedVolumeCount + 1;
    currentState.simulatedVolumeCount = simNum;
    await authorizeBuyerOrder('sim', `Simulated Buyer #${simNum}`, currentState.activeProduct.retailPrice);
  }
}

export async function closeWindowEngine() {
  if (currentState.windowClosed) return currentState;

  currentState.windowClosed = true;
  currentState.secondsRemaining = 0;

  const finalCount = currentState.orders.length;
  const product = currentState.activeProduct;
  addLog(`${getFormattedTime()} Window closed. Final aggregation volume: ${finalCount}/${currentState.targetQty} orders`);

  const tierDiscount = getTierDiscount(finalCount, currentState.discountTiers);
  const hitMaxTier = finalCount >= currentState.targetQty;
  const hasAnyDiscount = tierDiscount > 0;

  if (finalCount > 0 && hasAnyDiscount) {
    // --- DISCOUNT PATH (Full Threshold OR Dynamic Partial Recovery) ---
    const discountPctInt = Math.round(tierDiscount * 100);
    const finalCapturedUnitPrice = Math.round(product.retailPrice * (1 - tierDiscount));

    if (hitMaxTier) {
      // Full threshold achieved
      addLog(
        `${getFormattedTime()} ✅ Wholesale threshold FULLY MET: ${discountPctInt}% volume discount (Settlement Unit Price: ₹${finalCapturedUnitPrice.toLocaleString('en-IN')}).`
      );
    } else {
      // --- GRACEFUL RECOVERY: Partial threshold → dynamic discount ---
      const maxTierPct = Math.round(Math.max(...Object.values(currentState.discountTiers)) * 100);
      addLog(
        `${getFormattedTime()} ⚠️ Full wholesale threshold not reached (${finalCount}/${currentState.targetQty} units — target was ${maxTierPct}% OFF).`
      );
      addLog(
        `${getFormattedTime()} 🔄 RECOVERY: Dynamic Discount Activated — best available tier applied: ${discountPctInt}% OFF at ₹${finalCapturedUnitPrice.toLocaleString('en-IN')}/unit. No buyer left at full retail.`
      );
      addAiLog(
        `${getFormattedTime()} Failure Recovery: Target ${currentState.targetQty} units not met (actual: ${finalCount}). Agent activated dynamic discount fallback → ${discountPctInt}% tier applied. Zero buyer disappointment.`
      );
    }

    addLog(`${getFormattedTime()} Executing Razorpay escrow capture & automated refunds...`);

    for (const order of currentState.orders) {
      if (order.isDiscountedOnAuth) {
        const finalPrice = Math.max(order.authorizedPrice, finalCapturedUnitPrice);
        await captureRazorpayPayment(order.paymentId, finalPrice * 100, currentState.razorpayKeys);
        order.capturedPrice = finalPrice;
        order.refundAmount = 0;
        order.status = 'captured';

        addLog(
          `${getFormattedTime()} Escrow Capture: ${order.buyerName} -> ₹${finalPrice.toLocaleString('en-IN')} (locked at group tier ${discountPctInt}% off)`
        );
      } else {
        const refundDiff = order.retailPrice - finalCapturedUnitPrice;

        await captureRazorpayPayment(order.paymentId, finalCapturedUnitPrice * 100, currentState.razorpayKeys);
        if (refundDiff > 0) {
          await refundRazorpayPayment(order.paymentId, refundDiff * 100, currentState.razorpayKeys);
        }

        order.capturedPrice = finalCapturedUnitPrice;
        order.refundAmount = refundDiff;
        order.status = 'refunded';

        addLog(
          `${getFormattedTime()} Escrow Capture: ${order.buyerName} -> ₹${finalCapturedUnitPrice.toLocaleString('en-IN')} (instant refund ₹${refundDiff.toLocaleString('en-IN')} credited back)`
        );
      }
    }

    const totalPayout = finalCount * finalCapturedUnitPrice;
    addLog(
      `${getFormattedTime()} ${hitMaxTier ? 'Bulk wholesale' : 'Dynamic discount'} purchase finalized: ${finalCount} units @ ₹${finalCapturedUnitPrice.toLocaleString('en-IN')} (Seller Total Payout: ₹${totalPayout.toLocaleString('en-IN')})`
    );

    // Dynamic update for Phone D details if ordered
    if (currentState.phoneStates.phoneD.ordered && currentState.phoneStates.phoneD.couponDetails) {
      currentState.phoneStates.phoneD.couponDetails.discountPct = discountPctInt;
      currentState.phoneStates.phoneD.couponDetails.discountedPrice = finalCapturedUnitPrice;
    }

    const refundDiff = product.retailPrice - finalCapturedUnitPrice;
    const refundMsg = hitMaxTier
      ? `Group discount of ${discountPctInt}% achieved! ₹${refundDiff.toLocaleString('en-IN')} refunded to your account.`
      : `Dynamic recovery: ${discountPctInt}% group discount applied (target not fully met). ₹${refundDiff.toLocaleString('en-IN')} refunded to your account.`;

    if (currentState.phoneStates.phoneA.ordered) currentState.phoneStates.phoneA.notification = refundMsg;
    if (currentState.phoneStates.phoneB.ordered) currentState.phoneStates.phoneB.notification = refundMsg;
    if (currentState.phoneStates.phoneC.ordered) currentState.phoneStates.phoneC.notification = refundMsg;
    if (currentState.phoneStates.phoneD.ordered) {
      currentState.phoneStates.phoneD.notification = hitMaxTier
        ? `Standing order executed! Group tier locked at ${discountPctInt}% off (₹${finalCapturedUnitPrice.toLocaleString('en-IN')}).`
        : `Standing order executed! Dynamic recovery tier: ${discountPctInt}% off (₹${finalCapturedUnitPrice.toLocaleString('en-IN')}).`;
    }

    currentState.sellerState = {
      totalOrdersReceived: finalCount,
      settlementStatus: 'completed',
      totalUnits: finalCount,
      unitPrice: finalCapturedUnitPrice,
      totalPayout,
      tierApplied: hitMaxTier
        ? `${discountPctInt}% Off (Full Threshold)`
        : `${discountPctInt}% Off (Dynamic Recovery — ${finalCount}/${currentState.targetQty} units)`,
    };
  } else if (finalCount > 0) {
    // --- MINIMUM VOLUME: Below any discount tier, but orders exist ---
    // Still fulfill orders — no buyer is abandoned
    addLog(
      `${getFormattedTime()} ⚠️ Volume below minimum discount tier (${finalCount}/${currentState.minQtyForDiscount} required for any discount).`
    );
    addLog(
      `${getFormattedTime()} 🔄 RECOVERY: All buyer orders preserved and fulfilled at retail price. No orders cancelled.`
    );
    addAiLog(
      `${getFormattedTime()} Failure Recovery: ${finalCount} orders below min discount threshold (${currentState.minQtyForDiscount}). All orders preserved at retail — zero buyer abandonment.`
    );

    for (const order of currentState.orders) {
      await captureRazorpayPayment(order.paymentId, order.retailPrice * 100, currentState.razorpayKeys);
      order.capturedPrice = order.retailPrice;
      order.refundAmount = 0;
      order.status = 'captured';

      addLog(
        `${getFormattedTime()} Escrow Capture: ${order.buyerName} -> ₹${order.retailPrice.toLocaleString('en-IN')} (retail — order preserved)`
      );
    }

    const totalPayout = finalCount * product.retailPrice;
    addLog(
      `${getFormattedTime()} Orders fulfilled: ${finalCount} units @ ₹${product.retailPrice.toLocaleString('en-IN')} (Seller Total: ₹${totalPayout.toLocaleString('en-IN')})`
    );

    const recoveryMsg = `Your order is confirmed at ₹${product.retailPrice.toLocaleString('en-IN')}. Group volume was below discount threshold — your order was preserved (not cancelled).`;
    if (currentState.phoneStates.phoneA.ordered) currentState.phoneStates.phoneA.notification = recoveryMsg;
    if (currentState.phoneStates.phoneB.ordered) currentState.phoneStates.phoneB.notification = recoveryMsg;
    if (currentState.phoneStates.phoneC.ordered) currentState.phoneStates.phoneC.notification = recoveryMsg;
    if (currentState.phoneStates.phoneD.ordered) currentState.phoneStates.phoneD.notification = recoveryMsg;

    currentState.sellerState = {
      totalOrdersReceived: finalCount,
      settlementStatus: 'completed',
      totalUnits: finalCount,
      unitPrice: product.retailPrice,
      totalPayout,
      tierApplied: `0% Off (Below Min Tier — Orders Preserved)`,
    };
  } else {
    // No orders at all
    addLog(`${getFormattedTime()} Window closed with zero orders. No settlement required.`);
    currentState.sellerState = {
      totalOrdersReceived: 0,
      settlementStatus: 'completed',
    };
  }

  return currentState;
}

export function resetState() {
  const currentProduct = currentState.activeProduct || DEFAULT_PRODUCT;
  const currentKeys = currentState.razorpayKeys;

  currentState = JSON.parse(JSON.stringify(initialState));
  currentState.activeProduct = currentProduct;
  currentState.razorpayKeys = currentKeys;
  currentState.logs = [
    `${getFormattedTime()} System reset complete. Ready for new demand aggregation cycle (${currentProduct.name}).`,
  ];
  currentState.aiReasoningLog = [];
  currentState.lastParseResult = null;
  currentState.couponTargetingSummary = null;
  return currentState;
}

export function setPhoneDWatching(prompt: string) {
  currentState.phoneStates.phoneD.promptText = prompt;
  currentState.phoneStates.phoneD.isWatching = true;
  addLog(`${getFormattedTime()} Standing-Order Agent active: monitoring price drops on ${currentState.activeProduct.name}...`);
  checkThresholdAndTriggerCoupon(false);
}

