import {
  DEFAULT_PRODUCT,
  DEFAULT_DISCOUNT_TIERS,
  MAX_WINDOW_SECONDS,
  MIN_QTY_FOR_ANY_DISCOUNT,
  FINAL_STRETCH_PCT,
  MAX_NOTIFICATIONS_PER_BUYER,
  RECHECK_INTERVAL_SECONDS,
  PRODUCT_CATALOG,
  Product,
  TARGET_QTY,
  computeDynamicDiscount,
  getTierDiscount,
  DynamicDiscountResult,
} from './constants';
import {
  captureRazorpayPayment,
  createRazorpayOrder,
  refundRazorpayPayment,
} from './razorpay';
import {
  evaluateEqualOpportunityBroadcast,
  CandidateUser,
  isWindowInFinalStretch,
} from './targeting';

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

export interface ParticipantState {
  phoneA: {
    status: 'idle' | 'searching' | 'ordered';
    ordered: boolean;
    orderId?: string;
    paymentId?: string;
    notification?: string;
    couponReceived?: boolean;
    couponDetails?: { discountPct: number; discountedPrice: number; expiresSeconds: number };
    notificationCount: number;
    lastNotifiedDiscountPct?: number;
  };
  phoneB: {
    status: 'idle' | 'searching' | 'ordered';
    ordered: boolean;
    orderId?: string;
    paymentId?: string;
    notification?: string;
    couponReceived?: boolean;
    couponDetails?: { discountPct: number; discountedPrice: number; expiresSeconds: number };
    notificationCount: number;
    lastNotifiedDiscountPct?: number;
  };
  phoneC: {
    status: 'idle' | 'searching' | 'nudged' | 'ordered';
    ordered: boolean;
    orderId?: string;
    notification?: string;
    couponReceived: boolean;
    couponDetails?: { discountPct: number; discountedPrice: number; expiresSeconds: number };
    notificationCount: number;
    lastNotifiedDiscountPct?: number;
  };
  phoneD: {
    instruction: string;
    targetMaxPrice: number;
    status: 'idle' | 'watching' | 'logic_awaiting' | 'ordered';
    ordered: boolean;
    orderId?: string;
    notification?: string;
    couponReceived: boolean;
    couponDetails?: { discountPct: number; discountedPrice: number; expiresSeconds: number };
    notificationCount: number;
    lastNotifiedDiscountPct?: number;
  };
  phoneE: {
    searchQuery: string;
    status: 'unrelated_search';
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
  finalStretchEntered: boolean;
  lastBroadcastCheckRemaining: number | null;
  logs: string[];
  aiReasoningLog: string[];
  phoneStates: ParticipantState;
  sellerState: SellerState;
  sellerConfig: SellerConfig;
  razorpayKeys: { keyId: string; keySecret: string };
  simulatedVolumeCount: number;
  lastParseResult: ParseIntentResult | null;
  couponTargetingSummary: string | null;
  nudgeCount: number;
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
  finalStretchEntered: false,
  lastBroadcastCheckRemaining: null,
  logs: [
    `${getFormattedTime()} Decision engine initialized. Tracking aggregate demand for ${DEFAULT_PRODUCT.name} (${DEFAULT_PRODUCT.sku}).`,
  ],
  aiReasoningLog: [],
  nudgeCount: 0,
  phoneStates: {
    phoneA: { status: 'searching', ordered: false, notificationCount: 0 },
    phoneB: { status: 'searching', ordered: false, notificationCount: 0 },
    phoneC: { status: 'searching', ordered: false, couponReceived: false, notificationCount: 0 },
    phoneD: {
      instruction: 'Buy iPhone 17 Pro if price drops to ₹75,000 or below',
      targetMaxPrice: 75500,
      status: 'idle',
      ordered: false,
      couponReceived: false,
      notificationCount: 0,
    },
    phoneE: {
      searchQuery: 'wireless earbuds',
      status: 'unrelated_search',
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
    isApproved: true,
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
  currentState.phoneStates.phoneD.instruction = `Buy ${product.name} if price drops to 6%+ off`;
  currentState.phoneStates.phoneD.targetMaxPrice = Math.round(product.retailPrice * 0.94);
  addLog(`${getFormattedTime()} Active product changed to: ${product.name} (${product.sku}, retail ₹${product.retailPrice.toLocaleString('en-IN')})`);
  return currentState;
}

export function updateSellerConfig(tiers: Record<number, number>, maxDiscountDepth: number) {
  currentState.sellerConfig = {
    tiers: { ...tiers },
    maxDiscountDepth,
    isApproved: true,
    approvedAt: getFormattedTime(),
  };
  currentState.discountTiers = { ...tiers };
  addLog(`${getFormattedTime()} Seller configuration saved: ${Object.keys(tiers).length} tier(s) active (max discount ${Math.round(maxDiscountDepth * 100)}%).`);
}

export function setLastParseResult(result: ParseIntentResult) {
  currentState.lastParseResult = result;
  addAiLog(`${getFormattedTime()} Intent parse: SKU ${result.matchedSkuId || 'none'}, confidence ${(result.confidence * 100).toFixed(0)}%, model ${result.modelUsed}`);
  addAiLog(`${getFormattedTime()} Reasoning: "${result.reasoning}"`);
}

export function addAiLog(message: string) {
  const sanitized = message.replace(/\$([0-9]+)/g, '₹$1').replace(/\$/g, '₹');
  currentState.aiReasoningLog.push(sanitized);
  currentState.logs.push(sanitized);
}

export async function autoAuthorizePhoneDIfNeeded() {
  if (
    currentState.phoneStates.phoneD.couponReceived &&
    !currentState.phoneStates.phoneD.ordered &&
    !currentState.windowClosed
  ) {
    currentState.phoneStates.phoneD.status = 'logic_awaiting';
    const defaultDiscounted = Math.round(currentState.activeProduct.retailPrice * 0.94);
    const discountedPrice = currentState.phoneStates.phoneD.couponDetails?.discountedPrice || defaultDiscounted;
    
    // Auto-execute standing order with trigger condition met
    addLog(`${getFormattedTime()} Standing-Order Agent trigger condition met (offer ₹${discountedPrice.toLocaleString('en-IN')} <= ₹${currentState.phoneStates.phoneD.targetMaxPrice.toLocaleString('en-IN')}). Auto-executing purchase.`);
    
    await authorizeBuyerOrder(
      'phoneD',
      'Standing-Order Agent',
      discountedPrice,
      true
    );
  }
}

export function getState(): AppState {
  if (currentState.windowStarted && !currentState.windowClosed && currentState.startTime) {
    const elapsed = Math.floor((Date.now() - currentState.startTime) / 1000);
    const remaining = Math.max(0, MAX_WINDOW_SECONDS - elapsed);
    currentState.secondsRemaining = remaining;

    if (remaining === 0) {
      closeWindowEngine();
    } else {
      evaluateAndDispatchBroadcast(false, true);
    }
  }
  return currentState;
}

export function updateRazorpayKeys(keyId: string, keySecret: string) {
  currentState.razorpayKeys = { keyId, keySecret };
  addLog(`[System] Updated Razorpay credentials: ${keyId ? keyId.substring(0, 8) + '...' : '(Simulated sandbox)'}`);
}

export function addLog(message: string) {
  const sanitized = message.replace(/\$([0-9]+)/g, '₹$1').replace(/\$/g, '₹');
  currentState.logs.push(sanitized);
}

export function startTimerIfNeeded() {
  if (!currentState.windowStarted) {
    currentState.windowStarted = true;
    currentState.startTime = Date.now();
    currentState.secondsRemaining = MAX_WINDOW_SECONDS;
    addLog(`${getFormattedTime()} Demand aggregation window opened (${MAX_WINDOW_SECONDS}s countdown timer started)`);
  }
}

const inFlightAuthorizations = new Set<string>();
let pendingPhoneDTimeout: NodeJS.Timeout | null = null;

export async function authorizeBuyerOrder(
  buyerId: 'phoneA' | 'phoneB' | 'phoneC' | 'phoneD' | 'sim',
  buyerName: string,
  authorizedPrice?: number,
  isDiscountedOnAuth: boolean = false
) {
  if (currentState.windowClosed) {
    throw new Error('Aggregation window has already closed.');
  }

  // 1. Idempotency Guard: Refuse to create a duplicate order for a participant in the current window
  if (buyerId !== 'sim') {
    const existingOrder = currentState.orders.find((o) => o.buyerId === buyerId);
    if (existingOrder) {
      addLog(
        `${getFormattedTime()} [Idempotency Guard] Duplicate order authorization rejected: ${buyerName} already has an active order (Order #${existingOrder.orderNumber}) in this aggregation window.`
      );
      return existingOrder;
    }

    if (currentState.phoneStates[buyerId]?.ordered) {
      const existing = currentState.orders.find((o) => o.buyerId === buyerId);
      if (existing) {
        addLog(
          `${getFormattedTime()} [Idempotency Guard] Duplicate authorization blocked: ${buyerName} is already marked as ordered.`
        );
        return existing;
      }
    }

    // In-flight concurrency lock: drop simultaneous double-clicks/requests
    if (inFlightAuthorizations.has(buyerId)) {
      addLog(
        `${getFormattedTime()} [Idempotency Guard] In-flight authorization in progress for ${buyerName}. Duplicate request dropped.`
      );
      const existing = currentState.orders.find((o) => o.buyerId === buyerId);
      if (existing) return existing;
      throw new Error(`Authorization already in progress for ${buyerName}.`);
    }

    inFlightAuthorizations.add(buyerId);
  }

  try {
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

    // Audit log entry
    if (isDiscountedOnAuth) {
      addLog(
        `${getFormattedTime()} Order #${orderNum} authorized: ${buyerName} at discounted ₹${effectivePrice.toLocaleString('en-IN')} (escrow hold pending group settlement)`
      );
    } else {
      addLog(
        `${getFormattedTime()} Order #${orderNum} authorized: ${buyerName} at retail ₹${effectivePrice.toLocaleString('en-IN')} (escrow hold pending group settlement)`
      );
    }

    // Update participant state
    if (buyerId === 'phoneA') {
      currentState.phoneStates.phoneA = { ...currentState.phoneStates.phoneA, status: 'ordered', ordered: true, orderId: newOrder.id, paymentId };
    } else if (buyerId === 'phoneB') {
      currentState.phoneStates.phoneB = { ...currentState.phoneStates.phoneB, status: 'ordered', ordered: true, orderId: newOrder.id, paymentId };
    } else if (buyerId === 'phoneC') {
      currentState.phoneStates.phoneC.ordered = true;
      currentState.phoneStates.phoneC.orderId = newOrder.id;
      currentState.phoneStates.phoneC.status = 'ordered';
    } else if (buyerId === 'phoneD') {
      currentState.phoneStates.phoneD.ordered = true;
      currentState.phoneStates.phoneD.orderId = newOrder.id;
      currentState.phoneStates.phoneD.status = 'ordered';
    }

    // Continuous evaluation of threshold / broadcast
    if (!currentState.windowClosed && currentState.secondsRemaining > 0) {
      await evaluateAndDispatchBroadcast();
    }

    return newOrder;
  } finally {
    if (buyerId !== 'sim') {
      inFlightAuthorizations.delete(buyerId);
    }
  }
}

export async function evaluateAndDispatchBroadcast(force: boolean = false, isTick: boolean = false) {
  if (currentState.windowClosed || currentState.secondsRemaining <= 0) {
    return;
  }

  const inFinalStretch = isWindowInFinalStretch(currentState.secondsRemaining, MAX_WINDOW_SECONDS);

  // If not in final stretch and not forced:
  if (!inFinalStretch && !force) {
    return;
  }

  const currentCount = currentState.orders.length;
  // If 0 orders, no volume to aggregate
  if (!force && currentCount < 1) {
    return;
  }

  // Build full candidate list matching SKU
  const candidates: CandidateUser[] = [
    {
      userId: 'phoneA',
      label: 'Buyer A',
      searchedAt: '30s ago',
      searchCount: 2,
      isFrequentBuyer: false,
      searchedSku: currentState.activeProduct.sku,
      ordered: currentState.phoneStates.phoneA.ordered,
      notificationCount: currentState.phoneStates.phoneA.notificationCount || 0,
      lastNotifiedDiscountPct: currentState.phoneStates.phoneA.lastNotifiedDiscountPct,
    },
    {
      userId: 'phoneB',
      label: 'Buyer B',
      searchedAt: '45s ago',
      searchCount: 2,
      isFrequentBuyer: false,
      searchedSku: currentState.activeProduct.sku,
      ordered: currentState.phoneStates.phoneB.ordered,
      notificationCount: currentState.phoneStates.phoneB.notificationCount || 0,
      lastNotifiedDiscountPct: currentState.phoneStates.phoneB.lastNotifiedDiscountPct,
    },
    {
      userId: 'phoneD',
      label: 'Standing-Order Agent',
      searchedAt: '1m ago',
      searchCount: 3,
      isFrequentBuyer: true,
      searchedSku: currentState.activeProduct.sku,
      ordered: currentState.phoneStates.phoneD.ordered,
      notificationCount: currentState.phoneStates.phoneD.notificationCount || 0,
      lastNotifiedDiscountPct: currentState.phoneStates.phoneD.lastNotifiedDiscountPct,
    },
    {
      userId: 'phoneC',
      label: 'Buyer C',
      searchedAt: '2m ago',
      searchCount: 2,
      isFrequentBuyer: false,
      searchedSku: currentState.activeProduct.sku,
      ordered: currentState.phoneStates.phoneC.ordered,
      notificationCount: currentState.phoneStates.phoneC.notificationCount || 0,
      lastNotifiedDiscountPct: currentState.phoneStates.phoneC.lastNotifiedDiscountPct,
    },
    {
      userId: 'phoneE',
      label: 'Control Shopper',
      searchedAt: '10s ago',
      searchCount: 1,
      isFrequentBuyer: false,
      searchedSku: 'SKU-UNRELATED-EARBUDS', // strictly excluded by SKU check
      ordered: false,
      notificationCount: 0,
    },
  ];

  const isInitial = !currentState.finalStretchEntered;
  if (inFinalStretch && isInitial) {
    currentState.finalStretchEntered = true;
  }

  const decision = evaluateEqualOpportunityBroadcast({
    secondsRemaining: currentState.secondsRemaining,
    totalSeconds: MAX_WINDOW_SECONDS,
    currentOrderCount: currentCount,
    targetQty: currentState.targetQty,
    minQtyForDiscount: currentState.minQtyForDiscount,
    retailPrice: currentState.activeProduct.retailPrice,
    discountTiers: currentState.discountTiers,
    targetSku: currentState.activeProduct.sku,
    candidates,
    isInitialBroadcast: isInitial,
  });

  currentState.couponTargetingSummary = decision.summary;

  if (decision.broadcastCandidates.length > 0) {
    const broadcastedNames: string[] = [];

    for (const c of decision.broadcastCandidates) {
      const uId = c.userId as 'phoneA' | 'phoneB' | 'phoneC' | 'phoneD';
      if (currentState.phoneStates[uId] && !currentState.phoneStates[uId].ordered) {
        currentState.phoneStates[uId].couponReceived = true;
        currentState.phoneStates[uId].couponDetails = {
          discountPct: decision.discountPct,
          discountedPrice: decision.discountedPrice,
          expiresSeconds: Math.min(currentState.secondsRemaining, 60),
        };
        currentState.phoneStates[uId].notificationCount = (currentState.phoneStates[uId].notificationCount || 0) + 1;
        currentState.phoneStates[uId].lastNotifiedDiscountPct = decision.discountPct;

        if (uId === 'phoneC') {
          currentState.phoneStates.phoneC.status = 'nudged';
        } else if (uId === 'phoneD') {
          currentState.phoneStates.phoneD.status = 'logic_awaiting';
        }
        broadcastedNames.push(c.label);
      }
    }

    // Audit log formatting:
    addLog(`${getFormattedTime()} ${decision.reason}`);

    // If Standing-Order Agent received a coupon, evaluate condition:
    if (currentState.phoneStates.phoneD.couponReceived && !currentState.phoneStates.phoneD.ordered) {
      if (decision.discountedPrice <= currentState.phoneStates.phoneD.targetMaxPrice) {
        if (pendingPhoneDTimeout) {
          clearTimeout(pendingPhoneDTimeout);
          pendingPhoneDTimeout = null;
        }
        pendingPhoneDTimeout = setTimeout(async () => {
          pendingPhoneDTimeout = null;
          if (!currentState.windowClosed && !currentState.phoneStates.phoneD.ordered) {
            await autoAuthorizePhoneDIfNeeded();
          }
        }, 400);
      } else {
        addLog(
          `${getFormattedTime()} Standing-Order Agent evaluated offer: ₹${decision.discountedPrice.toLocaleString('en-IN')} > target ceiling (₹${currentState.phoneStates.phoneD.targetMaxPrice.toLocaleString('en-IN')}). Standing by.`
        );
      }
    }
  } else if (isTick && !decision.tierChanged && decision.isReNotification && decision.eligibleCandidates.length > 0) {
    // Throttled logging of unchanged tier check every RECHECK_INTERVAL_SECONDS
    const shouldLog =
      currentState.lastBroadcastCheckRemaining === null ||
      currentState.lastBroadcastCheckRemaining - currentState.secondsRemaining >= RECHECK_INTERVAL_SECONDS;

    if (shouldLog) {
      currentState.lastBroadcastCheckRemaining = currentState.secondsRemaining;
      addLog(`${getFormattedTime()} ${decision.reason}`);
    }
  } else if (isInitial && decision.eligibleCandidates.length === 0) {
    // Log empty pool when final stretch begins
    addLog(`${getFormattedTime()} ${decision.reason}`);
  }
}

// Backwards-compatible alias for existing endpoints
export async function checkThresholdAndTriggerCoupon(force: boolean = false) {
  return evaluateAndDispatchBroadcast(force, false);
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
  isTargetingInProgress = false;

  // Clear unredeemed coupon on Buyer C (deliberate gap)
  if (!currentState.phoneStates.phoneC.ordered) {
    currentState.phoneStates.phoneC.couponReceived = false;
    currentState.phoneStates.phoneC.couponDetails = undefined;
    currentState.phoneStates.phoneC.status = 'idle';
    currentState.phoneStates.phoneC.notification = 'Window closed: Offer expired without purchase.';
  }

  const finalCount = currentState.orders.length;
  const product = currentState.activeProduct;
  addLog(`${getFormattedTime()} Aggregation window closed. Final count: ${finalCount}/${currentState.targetQty} units.`);

  const dynamicResult = computeDynamicDiscount(finalCount, currentState.discountTiers);
  const tierDiscount = dynamicResult.discount;
  const discountPctVal = dynamicResult.discountPct;
  const hitMaxTier = finalCount >= currentState.targetQty;
  const hasAnyDiscount = tierDiscount > 0;

  if (finalCount > 0 && hasAnyDiscount) {
    const finalCapturedUnitPrice = Math.round(product.retailPrice * (1 - tierDiscount));

    if (dynamicResult.isInterpolated) {
      addLog(
        `${getFormattedTime()} Mid-tier discount computed (deterministic): ${finalCount}/${currentState.targetQty} units\n  formula: ${dynamicResult.formulaString}\n  anchors: ${dynamicResult.lowAnchorStr}, ${dynamicResult.highAnchorStr} (seller-defined)`
      );
      addLog(
        `${getFormattedTime()} Settlement: Window closed at ${finalCount}/${currentState.targetQty}. Applied deterministic ${discountPctVal}% discount tier (${dynamicResult.formulaString}). Escrow equalized.`
      );
    } else if (hitMaxTier) {
      addLog(
        `${getFormattedTime()} Top wholesale tier reached (${finalCount}/${currentState.targetQty} units): ${discountPctVal}% discount applied (₹${finalCapturedUnitPrice.toLocaleString('en-IN')}/unit).`
      );
    }

    addLog(`${getFormattedTime()} Executing Razorpay escrow capture and automated equalized refunds...`);

    let totalRefundsIssued = 0;

    for (const order of currentState.orders) {
      const authPrice = order.authorizedPrice;
      const refundDiff = Math.max(0, authPrice - finalCapturedUnitPrice);
      totalRefundsIssued += refundDiff;

      await captureRazorpayPayment(order.paymentId, finalCapturedUnitPrice * 100, currentState.razorpayKeys);

      if (refundDiff > 0) {
        await refundRazorpayPayment(order.paymentId, refundDiff * 100, currentState.razorpayKeys);
        order.capturedPrice = finalCapturedUnitPrice;
        order.refundAmount = refundDiff;
        order.status = 'refunded';

        addLog(
          `${getFormattedTime()} [Razorpay Escrow] Refund executed: ₹${refundDiff.toLocaleString('en-IN')} credited to ${order.buyerName} (original auth ₹${authPrice.toLocaleString('en-IN')} → final ₹${finalCapturedUnitPrice.toLocaleString('en-IN')})`
        );
      } else {
        order.capturedPrice = finalCapturedUnitPrice;
        order.refundAmount = 0;
        order.status = 'captured';

        addLog(
          `${getFormattedTime()} Escrow captured: ${order.buyerName} -> ₹${finalCapturedUnitPrice.toLocaleString('en-IN')} (locked at group tier ${discountPctVal}% off)`
        );
      }
    }

    if (totalRefundsIssued > 0) {
      const refundSummaryStr = currentState.orders
        .filter((o) => (o.refundAmount || 0) > 0)
        .map((o) => `${o.buyerName} (₹${o.refundAmount?.toLocaleString('en-IN')})`)
        .join(', ');
      addLog(
        `${getFormattedTime()} [Notification] Dispatched refund confirmation & equalized receipts: ₹${totalRefundsIssued.toLocaleString('en-IN')} total returned to: ${refundSummaryStr}.`
      );
    }

    const totalPayout = finalCount * finalCapturedUnitPrice;
    addLog(
      `${getFormattedTime()} Final settlement complete: ${finalCount} units @ ₹${finalCapturedUnitPrice.toLocaleString('en-IN')} (seller net payout: ₹${totalPayout.toLocaleString('en-IN')})`
    );

    // Update individual participant notifications
    for (const order of currentState.orders) {
      const buyerKey = order.buyerId as 'phoneA' | 'phoneB' | 'phoneC' | 'phoneD';
      if (currentState.phoneStates[buyerKey]) {
        if (order.refundAmount && order.refundAmount > 0) {
          currentState.phoneStates[buyerKey].notification = `Settlement complete: Equalized to ${discountPctVal}% group tier (₹${finalCapturedUnitPrice.toLocaleString('en-IN')}). ₹${order.refundAmount.toLocaleString('en-IN')} refund credited.`;
        } else {
          currentState.phoneStates[buyerKey].notification = `Settlement complete: Executed at ${discountPctVal}% group tier (₹${finalCapturedUnitPrice.toLocaleString('en-IN')}).`;
        }
      }
    }

    currentState.sellerState = {
      totalOrdersReceived: finalCount,
      settlementStatus: 'completed',
      totalUnits: finalCount,
      unitPrice: finalCapturedUnitPrice,
      totalPayout,
      tierApplied: `${discountPctVal}% off (${finalCount}/${currentState.targetQty} dynamic tier)`,
    };
  } else if (finalCount > 0) {
    addLog(
      `${getFormattedTime()} Volume below discount threshold (${finalCount}/${currentState.minQtyForDiscount}). Orders fulfilled at standard retail.`
    );

    for (const order of currentState.orders) {
      await captureRazorpayPayment(order.paymentId, order.retailPrice * 100, currentState.razorpayKeys);
      order.capturedPrice = order.retailPrice;
      order.refundAmount = 0;
      order.status = 'captured';
    }

    const totalPayout = finalCount * product.retailPrice;
    currentState.sellerState = {
      totalOrdersReceived: finalCount,
      settlementStatus: 'completed',
      totalUnits: finalCount,
      unitPrice: product.retailPrice,
      totalPayout,
      tierApplied: 'Standard retail (0% off)',
    };
  } else {
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

  isTargetingInProgress = false;
  inFlightAuthorizations.clear();
  if (pendingPhoneDTimeout) {
    clearTimeout(pendingPhoneDTimeout);
    pendingPhoneDTimeout = null;
  }

  currentState = JSON.parse(JSON.stringify(initialState));
  currentState.activeProduct = currentProduct;
  currentState.phoneStates.phoneD.instruction = `Buy ${currentProduct.name} if price drops to ₹75,000 or below`;
  currentState.phoneStates.phoneD.targetMaxPrice = Math.round(currentProduct.retailPrice * 0.94);
  currentState.razorpayKeys = currentKeys;
  currentState.finalStretchEntered = false;
  currentState.lastBroadcastCheckRemaining = null;
  currentState.logs = [
    `${getFormattedTime()} System reset complete. Ready for new demand aggregation cycle (${currentProduct.name}).`,
  ];
  currentState.aiReasoningLog = [];
  currentState.lastParseResult = null;
  currentState.couponTargetingSummary = null;
  currentState.nudgeCount = 0;
  return currentState;
}

export function setPhoneDWatching(prompt: string) {
  currentState.phoneStates.phoneD.instruction = prompt;
  currentState.phoneStates.phoneD.status = 'watching';
  addLog(`${getFormattedTime()} Standing-Order Agent active: watching for price drops on ${currentState.activeProduct.name}...`);
  checkThresholdAndTriggerCoupon(false);
}


