'use client';

import React from 'react';
import { AppState } from '@/lib/store';

interface BuyerPanelProps {
  state: AppState;
  onOpenPaymentModal: (
    buyerId: 'phoneA' | 'phoneB' | 'phoneC' | 'phoneD',
    buyerName: string,
    amount: number,
    isDiscounted?: boolean
  ) => void;
  onSetPhoneDWatching: (prompt: string) => void;
  onForceTriggerCoupon?: () => void;
}

export default function BuyerPanel({
  state,
  onOpenPaymentModal,
  onSetPhoneDWatching,
}: BuyerPanelProps) {
  const { phoneStates, orders, windowClosed, activeProduct, sellerState } = state;
  const product = activeProduct;

  const formatPrice = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  const orderA = orders.find((o) => o.buyerId === 'phoneA');
  const orderB = orders.find((o) => o.buyerId === 'phoneB');
  const orderC = orders.find((o) => o.buyerId === 'phoneC');
  const orderD = orders.find((o) => o.buyerId === 'phoneD');

  const refundedOrders = orders.filter((o) => (o.refundAmount || 0) > 0);
  const totalRefundAmount = refundedOrders.reduce((sum, o) => sum + (o.refundAmount || 0), 0);

  return (
    <div className="bg-panel border border-hairline rounded-lg p-5 flex flex-col h-full">
      {/* Panel Header */}
      <div className="flex items-baseline justify-between pb-3.5 border-b border-hairline mb-1">
        <div>
          <h2 className="font-serif text-lg font-semibold text-ink">
            Buyer ledger
          </h2>
          <p className="text-xs text-muted">
            5 participant accounts tracking {product.name}
          </p>
        </div>
        <span className="text-xs font-mono text-muted bg-paper px-2 py-0.5 rounded border border-hairline">
          {product.sku}
        </span>
      </div>

      {/* Settlement Refund Notice Banner */}
      {windowClosed && refundedOrders.length > 0 ? (
        <div className="my-2 bg-[#F1F8F4] border border-[#C3E2CD] rounded-md p-2.5 flex items-start gap-2 text-xs text-ledgergreen">
          <span className="font-bold text-sm leading-none mt-0.5">✓</span>
          <div className="space-y-0.5 flex-1">
            <div>
              <strong className="font-medium text-ink">Escrow price equalization:</strong> Total refunds of{' '}
              <span className="font-mono font-semibold text-ledgergreen">₹{totalRefundAmount.toLocaleString('en-IN')}</span>{' '}
              disbursed to early buyers via Razorpay Escrow.
            </div>
            <div className="text-[11px] text-muted font-mono">
              {refundedOrders.map((o) => `${o.buyerName}: ₹${o.refundAmount?.toLocaleString('en-IN')}`).join(' · ')}
            </div>
          </div>
        </div>
      ) : null}

      {/* 5-Participant Ledger Rows */}
      <div className="flex-1 flex flex-col justify-between divide-y divide-hairline">
        {/* ROW 1: Buyer A (Manual) */}
        <div className="py-3 flex items-center justify-between gap-3 min-h-[76px]">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink">Buyer A</span>
              <span className="text-[11px] text-muted">Manual buyer</span>
            </div>
            <div className="text-xs text-muted mt-0.5 truncate">
              {phoneStates.phoneA.ordered
                ? windowClosed
                  ? (orderA?.refundAmount || 0) > 0
                    ? `Settled — equalized with ₹${orderA?.refundAmount?.toLocaleString('en-IN')} refund credit`
                    : 'Settled — executed at group rate'
                  : 'Purchased retail — escrow hold pending group close'
                : phoneStates.phoneA.couponReceived
                ? `Nudged — ${phoneStates.phoneA.couponDetails?.discountPct || 3}% off unlock offer active`
                : 'Searching catalog — retail checkout ready'}
            </div>
            {windowClosed && (orderA?.refundAmount || 0) > 0 ? (
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-[11px] font-mono font-medium text-ledgergreen bg-[#EBF5EE] border border-[#C3E2CD] px-1.5 py-0.5 rounded">
                  ₹{orderA?.refundAmount?.toLocaleString('en-IN')} refund credited
                </span>
                <span className="text-[10px] text-muted">to original card</span>
              </div>
            ) : null}
          </div>

          <div className="text-right shrink-0 flex items-center gap-3">
            {!phoneStates.phoneA.ordered && !windowClosed && (
              <button
                type="button"
                onClick={() =>
                  onOpenPaymentModal(
                    'phoneA',
                    'Buyer A',
                    phoneStates.phoneA.couponReceived && phoneStates.phoneA.couponDetails
                      ? phoneStates.phoneA.couponDetails.discountedPrice
                      : product.retailPrice,
                    Boolean(phoneStates.phoneA.couponReceived)
                  )
                }
                className={`px-2.5 py-1 text-xs font-medium rounded transition border ${
                  phoneStates.phoneA.couponReceived
                    ? 'text-oxblood bg-paper border-hairline hover:border-oxblood hover:bg-[#FDFBF7]'
                    : 'text-navy hover:text-ink bg-transparent hover:bg-paper border-hairline hover:border-muted'
                }`}
              >
                {phoneStates.phoneA.couponReceived && phoneStates.phoneA.couponDetails
                  ? `Buy with coupon (${formatPrice(phoneStates.phoneA.couponDetails.discountedPrice)})`
                  : `Buy retail (${formatPrice(product.retailPrice)})`}
              </button>
            )}

            <div className="min-w-[90px] text-right">
              {phoneStates.phoneA.ordered ? (
                <div>
                  <div
                    className={`font-serif text-base font-semibold ${
                      windowClosed ? 'text-ledgergreen' : 'text-oxblood'
                    }`}
                  >
                    {windowClosed && orderA?.capturedPrice
                      ? formatPrice(orderA.capturedPrice)
                      : formatPrice(orderA?.authorizedPrice || product.retailPrice)}
                  </div>
                  <div className="text-[10px] font-mono text-muted">
                    {windowClosed
                      ? (orderA?.refundAmount || 0) > 0
                        ? `Refund ₹${orderA?.refundAmount?.toLocaleString('en-IN')}`
                        : 'Settled'
                      : 'Held in escrow'}
                  </div>
                </div>
              ) : (
                <span className="font-serif text-sm text-muted">—</span>
              )}
            </div>
          </div>
        </div>

        {/* ROW 2: Buyer B (Manual) */}
        <div className="py-3 flex items-center justify-between gap-3 min-h-[76px]">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink">Buyer B</span>
              <span className="text-[11px] text-muted">Manual buyer</span>
            </div>
            <div className="text-xs text-muted mt-0.5 truncate">
              {phoneStates.phoneB.ordered
                ? windowClosed
                  ? (orderB?.refundAmount || 0) > 0
                    ? `Settled — equalized with ₹${orderB?.refundAmount?.toLocaleString('en-IN')} refund credit`
                    : 'Settled — executed at group rate'
                  : 'Purchased retail — triggered threshold nudge'
                : phoneStates.phoneB.couponReceived
                ? `Nudged — ${phoneStates.phoneB.couponDetails?.discountPct || 3}% off unlock offer active`
                : 'Searching catalog — retail checkout ready'}
            </div>
            {windowClosed && (orderB?.refundAmount || 0) > 0 ? (
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-[11px] font-mono font-medium text-ledgergreen bg-[#EBF5EE] border border-[#C3E2CD] px-1.5 py-0.5 rounded">
                  ₹{orderB?.refundAmount?.toLocaleString('en-IN')} refund credited
                </span>
                <span className="text-[10px] text-muted">to original card</span>
              </div>
            ) : null}
          </div>

          <div className="text-right shrink-0 flex items-center gap-3">
            {!phoneStates.phoneB.ordered && !windowClosed && (
              <button
                type="button"
                onClick={() =>
                  onOpenPaymentModal(
                    'phoneB',
                    'Buyer B',
                    phoneStates.phoneB.couponReceived && phoneStates.phoneB.couponDetails
                      ? phoneStates.phoneB.couponDetails.discountedPrice
                      : product.retailPrice,
                    Boolean(phoneStates.phoneB.couponReceived)
                  )
                }
                className={`px-2.5 py-1 text-xs font-medium rounded transition border ${
                  phoneStates.phoneB.couponReceived
                    ? 'text-oxblood bg-paper border-hairline hover:border-oxblood hover:bg-[#FDFBF7]'
                    : 'text-navy hover:text-ink bg-transparent hover:bg-paper border-hairline hover:border-muted'
                }`}
              >
                {phoneStates.phoneB.couponReceived && phoneStates.phoneB.couponDetails
                  ? `Buy with coupon (${formatPrice(phoneStates.phoneB.couponDetails.discountedPrice)})`
                  : `Buy retail (${formatPrice(product.retailPrice)})`}
              </button>
            )}

            <div className="min-w-[90px] text-right">
              {phoneStates.phoneB.ordered ? (
                <div>
                  <div
                    className={`font-serif text-base font-semibold ${
                      windowClosed ? 'text-ledgergreen' : 'text-oxblood'
                    }`}
                  >
                    {windowClosed && orderB?.capturedPrice
                      ? formatPrice(orderB.capturedPrice)
                      : formatPrice(orderB?.authorizedPrice || product.retailPrice)}
                  </div>
                  <div className="text-[10px] font-mono text-muted">
                    {windowClosed
                      ? (orderB?.refundAmount || 0) > 0
                        ? `Refund ₹${orderB?.refundAmount?.toLocaleString('en-IN')}`
                        : 'Settled'
                      : 'Held in escrow'}
                  </div>
                </div>
              ) : (
                <span className="font-serif text-sm text-muted">—</span>
              )}
            </div>
          </div>
        </div>

        {/* ROW 3: Standing-Order Agent */}
        <div className="py-3 flex items-center justify-between gap-3 min-h-[76px]">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink">Standing-Order Agent</span>
              <span className="text-[11px] text-muted">Autonomous trigger</span>
            </div>
            <div className="text-xs text-muted mt-0.5 truncate">
              {phoneStates.phoneD.ordered
                ? windowClosed
                  ? (orderD?.refundAmount || 0) > 0
                    ? `Settled — auto-authorized at ₹${orderD?.authorizedPrice?.toLocaleString('en-IN')}, equalized down with ₹${orderD?.refundAmount?.toLocaleString('en-IN')} refund`
                    : 'Settled — executed at group discount tier'
                  : 'Trigger condition met — auto-purchased on nudge'
                : phoneStates.phoneD.status === 'logic_awaiting'
                ? 'Logic awaiting — validating discount condition...'
                : 'Rule set: buy if price drops to ₹75,000 or below'}
            </div>
            {windowClosed && (orderD?.refundAmount || 0) > 0 ? (
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-[11px] font-mono font-medium text-ledgergreen bg-[#EBF5EE] border border-[#C3E2CD] px-1.5 py-0.5 rounded">
                  ₹{orderD?.refundAmount?.toLocaleString('en-IN')} refund credited
                </span>
                <span className="text-[10px] text-muted">equalized to ₹{orderD?.capturedPrice?.toLocaleString('en-IN')}</span>
              </div>
            ) : windowClosed && orderD ? (
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-[11px] font-mono text-navy bg-paper border border-hairline px-1.5 py-0.5 rounded">
                  Captured at ₹{orderD.capturedPrice?.toLocaleString('en-IN') || '74,707'} ({sellerState.tierApplied || 'Dynamic tier'})
                </span>
              </div>
            ) : null}
          </div>

          <div className="text-right shrink-0 flex items-center gap-3">
            <div className="min-w-[90px] text-right">
              {phoneStates.phoneD.ordered ? (
                <div>
                  <div
                    className={`font-serif text-base font-semibold ${
                      windowClosed ? 'text-ledgergreen' : 'text-oxblood'
                    }`}
                  >
                    {windowClosed && orderD?.capturedPrice
                      ? formatPrice(orderD.capturedPrice)
                      : formatPrice(orderD?.authorizedPrice || Math.round(product.retailPrice * 0.935))}
                  </div>
                  <div className="text-[10px] font-mono text-muted">
                    {windowClosed
                      ? (orderD?.refundAmount || 0) > 0
                        ? `Refund ₹${orderD?.refundAmount?.toLocaleString('en-IN')}`
                        : 'Settled'
                      : 'Auto-authorized'}
                  </div>
                </div>
              ) : phoneStates.phoneD.status === 'logic_awaiting' ? (
                <span className="text-xs font-mono text-oxblood">Evaluating...</span>
              ) : (
                <div>
                  <span className="text-xs font-mono text-muted block">Watching</span>
                  <span className="text-[10px] text-muted">≤ ₹75,000</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ROW 4: Buyer C (Manual - Candidate) */}
        <div className="py-3 flex items-center justify-between gap-3 min-h-[76px]">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink">Buyer C</span>
              <span className="text-[11px] text-muted">Manual candidate</span>
            </div>
            <div className="text-xs text-muted mt-0.5 truncate">
              {phoneStates.phoneC.ordered
                ? windowClosed
                  ? (orderC?.refundAmount || 0) > 0
                    ? `Settled — equalized with ₹${orderC?.refundAmount?.toLocaleString('en-IN')} refund credit`
                    : 'Settled — executed at group coupon rate'
                  : 'Purchased with group coupon'
                : windowClosed
                ? 'Offer expired — window closed without purchase'
                : phoneStates.phoneC.couponReceived
                ? `Nudged — awaiting response (${phoneStates.phoneC.couponDetails?.discountPct || 3}% discount offer sent)`
                : 'Searching catalog — standing by'}
            </div>
            {windowClosed && (orderC?.refundAmount || 0) > 0 ? (
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-[11px] font-mono font-medium text-ledgergreen bg-[#EBF5EE] border border-[#C3E2CD] px-1.5 py-0.5 rounded">
                  ₹{orderC?.refundAmount?.toLocaleString('en-IN')} refund credited
                </span>
                <span className="text-[10px] text-muted">to original card</span>
              </div>
            ) : windowClosed && !phoneStates.phoneC.ordered ? (
              <div className="mt-1">
                <span className="text-[10px] font-mono text-muted bg-paper px-1.5 py-0.5 rounded border border-hairline">
                  Offer expired (unredeemed)
                </span>
              </div>
            ) : null}
          </div>

          <div className="text-right shrink-0 flex items-center gap-3">
            {!phoneStates.phoneC.ordered && phoneStates.phoneC.couponReceived && !windowClosed && (
              <button
                type="button"
                onClick={() =>
                  onOpenPaymentModal(
                    'phoneC',
                    'Buyer C',
                    phoneStates.phoneC.couponDetails
                      ? phoneStates.phoneC.couponDetails.discountedPrice
                      : product.retailPrice,
                    true
                  )
                }
                className="px-2.5 py-1 text-xs font-mono text-oxblood hover:text-ink bg-paper border border-hairline hover:border-oxblood rounded transition"
              >
                Buy with coupon ({formatPrice(phoneStates.phoneC.couponDetails?.discountedPrice || Math.round(product.retailPrice * 0.97))})
              </button>
            )}

            <div className="min-w-[90px] text-right">
              {phoneStates.phoneC.ordered ? (
                <div>
                  <div
                    className={`font-serif text-base font-semibold ${
                      windowClosed ? 'text-ledgergreen' : 'text-oxblood'
                    }`}
                  >
                    {windowClosed && orderC?.capturedPrice
                      ? formatPrice(orderC.capturedPrice)
                      : formatPrice(orderC?.authorizedPrice || Math.round(product.retailPrice * 0.94))}
                  </div>
                  <div className="text-[10px] font-mono text-muted">
                    {windowClosed
                      ? (orderC?.refundAmount || 0) > 0
                        ? `Refund ₹${orderC?.refundAmount?.toLocaleString('en-IN')}`
                        : 'Settled'
                      : 'Held'}
                  </div>
                </div>
              ) : (
                <span className="font-serif text-sm text-muted">—</span>
              )}
            </div>
          </div>
        </div>

        {/* ROW 5: Control / Unrelated Shopper */}
        <div className="py-3 flex items-center justify-between gap-3 min-h-[76px]">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink">Control</span>
              <span className="text-[11px] text-muted">Unrelated shopper</span>
            </div>
            <div className="text-xs text-muted mt-0.5 truncate">
              Searching: "wireless earbuds" — no offer sent (proves bounded targeting)
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="min-w-[90px] text-right">
              <span className="text-xs font-mono text-muted block">No offer</span>
              <span className="font-serif text-sm text-muted">—</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

