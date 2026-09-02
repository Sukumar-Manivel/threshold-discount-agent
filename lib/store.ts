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
  phoneStates: PhoneState;
  sellerState: SellerState;
  razorpayKeys: { keyId: string; keySecret: string };
  simulatedVolumeCount: number;
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
  razorpayKeys: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
  },
  simulatedVolumeCount: 0,
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

export function checkThresholdAndTriggerCoupon(force: boolean = false) {
  const currentCount = currentState.orders.length;

  if (!force && currentCount < 2) {
    return;
  }

  const gap = currentState.targetQty - currentCount;
  const projectedQty = currentCount + 1;
  const discountPct = getTierDiscount(projectedQty, currentState.discountTiers) || 0.02;
  const discountPctInt = Math.round(discountPct * 100);
  const discountedPrice = Math.round(currentState.activeProduct.retailPrice * (1 - discountPct));

  const nudgedCandidates: string[] = [];

  // 1. Nudge Phone A
  if (!currentState.phoneStates.phoneA.ordered && !currentState.phoneStates.phoneA.couponReceived) {
    currentState.phoneStates.phoneA.couponReceived = true;
    currentState.phoneStates.phoneA.couponDetails = {
      discountPct: discountPctInt,
      discountedPrice,
      expiresSeconds: Math.min(currentState.secondsRemaining, 90),
    };
    nudgedCandidates.push('Phone A (Buyer #1)');
  }

  // 2. Nudge Phone B
  if (!currentState.phoneStates.phoneB.ordered && !currentState.phoneStates.phoneB.couponReceived) {
    currentState.phoneStates.phoneB.couponReceived = true;
    currentState.phoneStates.phoneB.couponDetails = {
      discountPct: discountPctInt,
      discountedPrice,
      expiresSeconds: Math.min(currentState.secondsRemaining, 90),
    };
    nudgedCandidates.push('Phone B (Buyer #2)');
  }

  // 3. Nudge Phone D
  if (!currentState.phoneStates.phoneD.ordered && !currentState.phoneStates.phoneD.couponReceived) {
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

  if (finalCount >= currentState.minQtyForDiscount && tierDiscount > 0) {
    // --- SUCCESS DISCOUNT PATH ---
    const discountPctInt = Math.round(tierDiscount * 100);
    const finalCapturedUnitPrice = Math.round(product.retailPrice * (1 - tierDiscount));

    addLog(
      `${getFormattedTime()} Wholesale threshold unlocked: ${discountPctInt}% volume discount (Settlement Unit Price: ₹${finalCapturedUnitPrice.toLocaleString('en-IN')}).`
    );
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
      `${getFormattedTime()} Bulk wholesale purchase finalized: ${finalCount} units @ ₹${finalCapturedUnitPrice.toLocaleString('en-IN')} (Seller Total Payout: ₹${totalPayout.toLocaleString('en-IN')})`
    );

    // Dynamic update for Phone D details if ordered
    if (currentState.phoneStates.phoneD.ordered && currentState.phoneStates.phoneD.couponDetails) {
      currentState.phoneStates.phoneD.couponDetails.discountPct = discountPctInt;
      currentState.phoneStates.phoneD.couponDetails.discountedPrice = finalCapturedUnitPrice;
    }

    const refundDiff = product.retailPrice - finalCapturedUnitPrice;
    const refundMsg = `Group discount of ${discountPctInt}% achieved! ₹${refundDiff.toLocaleString('en-IN')} refunded to your account.`;

    if (currentState.phoneStates.phoneA.ordered) currentState.phoneStates.phoneA.notification = refundMsg;
    if (currentState.phoneStates.phoneB.ordered) currentState.phoneStates.phoneB.notification = refundMsg;
    if (currentState.phoneStates.phoneC.ordered) currentState.phoneStates.phoneC.notification = refundMsg;
    if (currentState.phoneStates.phoneD.ordered) {
      currentState.phoneStates.phoneD.notification = `Standing order executed! Group tier locked at ${discountPctInt}% off (₹${finalCapturedUnitPrice.toLocaleString('en-IN')}).`;
    }

    currentState.sellerState = {
      totalOrdersReceived: finalCount,
      settlementStatus: 'completed',
      totalUnits: finalCount,
      unitPrice: finalCapturedUnitPrice,
      totalPayout,
      tierApplied: `${discountPctInt}% Off (Tier ${finalCount})`,
    };
  } else {
    // --- FALLBACK FULL RETAIL PATH ---
    addLog(
      `${getFormattedTime()} Minimum threshold not met (${finalCount}/${currentState.minQtyForDiscount} required for group discount).`
    );
    addLog(
      `${getFormattedTime()} Retail fallback initiated: capturing orders at standard retail price. No refunds issued.`
    );

    for (const order of currentState.orders) {
      await captureRazorpayPayment(order.paymentId, order.retailPrice * 100, currentState.razorpayKeys);
      order.capturedPrice = order.retailPrice;
      order.refundAmount = 0;
      order.status = 'captured';

      addLog(
        `${getFormattedTime()} Escrow Capture: ${order.buyerName} -> ₹${order.retailPrice.toLocaleString('en-IN')} (standard retail capture)`
      );
    }

    const totalPayout = finalCount * product.retailPrice;
    addLog(
      `${getFormattedTime()} Standard order dispatched: ${finalCount} units @ ₹${product.retailPrice.toLocaleString('en-IN')} (Seller Total: ₹${totalPayout.toLocaleString('en-IN')})`
    );

    const fallbackMsg = `Order fulfilled at standard retail price ₹${product.retailPrice.toLocaleString('en-IN')} (Group volume threshold not reached).`;
    if (currentState.phoneStates.phoneA.ordered) currentState.phoneStates.phoneA.notification = fallbackMsg;
    if (currentState.phoneStates.phoneB.ordered) currentState.phoneStates.phoneB.notification = fallbackMsg;
    if (currentState.phoneStates.phoneC.ordered) currentState.phoneStates.phoneC.notification = fallbackMsg;
    if (currentState.phoneStates.phoneD.ordered) currentState.phoneStates.phoneD.notification = fallbackMsg;

    currentState.sellerState = {
      totalOrdersReceived: finalCount,
      settlementStatus: 'completed',
      totalUnits: finalCount,
      unitPrice: product.retailPrice,
      totalPayout,
      tierApplied: '0% Off (Retail Fallback)',
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
  return currentState;
}

export function setPhoneDWatching(prompt: string) {
  currentState.phoneStates.phoneD.promptText = prompt;
  currentState.phoneStates.phoneD.isWatching = true;
  addLog(`${getFormattedTime()} Standing-Order Agent active: monitoring price drops on ${currentState.activeProduct.name}...`);
  checkThresholdAndTriggerCoupon(false);
}

