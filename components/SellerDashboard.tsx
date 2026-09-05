'use client';

import React, { useState } from 'react';
import { AppState } from '@/lib/store';
import { MAX_DISCOUNT_DEPTH } from '@/lib/constants';

interface SellerDashboardProps {
  state: AppState;
}

interface TierRow {
  qty: number;
  discount: number; // percentage integer e.g. 10 = 10%
}

export default function SellerDashboard({ state }: SellerDashboardProps) {
  const { sellerState, orders, windowClosed, activeProduct, targetQty, sellerConfig } = state;
  const product = activeProduct;

  const formatPrice = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [tierRows, setTierRows] = useState<TierRow[]>(() => {
    const tiers = sellerConfig?.tiers || { 4: 0.10, 2: 0.03 };
    const keys = Object.keys(tiers).map(Number).sort((a, b) => b - a);
    return [
      { qty: keys[0] || 4, discount: Math.round((tiers[keys[0] || 4] || 0.10) * 100) },
      { qty: keys[keys.length - 1] || 2, discount: Math.round((tiers[keys[keys.length - 1] || 2] || 0.03) * 100) },
    ];
  });

  const handleTierChange = (index: number, field: 'qty' | 'discount', value: string) => {
    const updated = [...tierRows];
    updated[index] = { ...updated[index], [field]: Number(value) };
    setTierRows(updated);
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const tiersObj: Record<number, number> = {};
      for (const row of tierRows) {
        tiersObj[row.qty] = row.discount / 100;
      }

      const res = await fetch('/api/seller-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tiers: tiersObj,
          maxDiscountDepth: MAX_DISCOUNT_DEPTH,
        }),
      });

      if (res.ok) {
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Failed to save seller config:', err);
    } finally {
      setSaving(false);
    }
  };

  const isSettled = sellerState.settlementStatus === 'completed';
  const canEditConfig = !state.windowStarted || windowClosed;

  return (
    <div className="bg-panel border border-hairline rounded-lg p-5 flex flex-col space-y-4">

      {/* Header */}
      <div className="flex items-baseline justify-between pb-3.5 border-b border-hairline">
        <div>
          <h2 className="font-serif text-lg font-semibold text-ink">
            Seller settlement
          </h2>
          <p className="text-xs text-muted">Merchant escrow statement &amp; route payout</p>
        </div>
        <span className="text-xs font-mono text-muted bg-paper px-2 py-0.5 rounded border border-hairline">
          {isSettled ? 'Settled' : 'Pending window'}
        </span>
      </div>

      {/* Financial section & Fulfillment — entirely gated behind settlement */}
      {isSettled ? (
        <>
          {/* Hero final payout */}
          <div className="py-2">
            <span className="text-xs text-muted block mb-1">Final net merchant payout</span>
            <div className="font-serif text-3xl font-bold tracking-tight text-ledgergreen">
              {formatPrice(sellerState.totalPayout || 0)}
            </div>
          </div>

          {/* Final metrics rows */}
          <div className="divide-y divide-hairline border-y border-hairline py-1 text-xs">
            <div className="py-2 flex justify-between items-center">
              <span className="text-muted">Total units settled</span>
              <span className="font-mono font-medium text-ink">
                {sellerState.totalUnits} of {targetQty}
              </span>
            </div>
            <div className="py-2 flex justify-between items-center">
              <span className="text-muted">Settled unit price</span>
              <span className="font-mono font-medium text-ink">
                {formatPrice(sellerState.unitPrice || product.retailPrice)}
              </span>
            </div>
            <div className="py-2 flex justify-between items-center">
              <span className="text-muted">Applied tier</span>
              <span className="font-medium text-ink">
                {sellerState.tierApplied || 'Dynamic tier'}
              </span>
            </div>
          </div>

          {/* Fulfillment Section — reveals automatically upon settlement */}
          <div className="bg-paper rounded border border-hairline overflow-hidden flex flex-col">
            {/* Fulfillment header — fixed at top */}
            <div className="px-3 pt-3 pb-2 border-b border-hairline flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-serif text-base font-semibold text-ink">Fulfillment</h3>
                <p className="text-xs text-muted">
                  Dispatch queue · {orders.length} order{orders.length !== 1 ? 's' : ''}
                </p>
              </div>
              <span className="text-xs font-mono text-ledgergreen bg-[#EBF5EE] border border-[#C3E2CD] px-2 py-0.5 rounded">
                Settled
              </span>
            </div>

            {/* Scrollable list of buyer entries with internal overflow scroll */}
            {orders.length === 0 ? (
              <p className="px-3 py-4 text-xs text-muted italic">No orders to dispatch.</p>
            ) : (
              <div className="overflow-y-auto max-h-[170px] divide-y divide-hairline custom-scrollbar">
                {orders.map((order) => {
                  const role = order.buyerId === 'phoneD' ? 'Autonomous trigger' : 'Manual buyer';
                  const name = order.buyerName || order.buyerId;
                  return (
                    <div key={order.id || order.buyerId} className="py-2.5 px-3 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-ink truncate">{name}</span>
                          <span className="text-[11px] text-muted shrink-0">{role}</span>
                        </div>
                        <div className="text-xs text-muted mt-0.5 italic">Shipping details on file</div>
                      </div>
                      <div className="text-right shrink-0 text-xs font-mono whitespace-nowrap text-ledgergreen font-medium">
                        1 unit · Ready
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Pre-settlement: no financial figures, no fulfillment card — only clean waiting state */
        <div className="border border-hairline rounded-md px-3 py-4 text-xs text-muted bg-paper leading-relaxed">
          Awaiting window close — final pricing and payout will appear once settlement completes.
        </div>
      )}

      {/* Anchor editor — only when editable */}
      {canEditConfig && (
        <div className="text-xs flex items-center space-x-2">
          {isEditing ? (
            <>
              <input
                type="number"
                className="w-12 p-0.5 border border-hairline rounded bg-paper text-ink"
                value={tierRows[0].discount}
                onChange={e => handleTierChange(0, 'discount', e.target.value)}
                min={0}
                max={100}
              />
              <span className="text-muted">% Upper anchor</span>
              <input
                type="number"
                className="w-12 p-0.5 border border-hairline rounded bg-paper text-ink"
                value={tierRows[1].discount}
                onChange={e => handleTierChange(1, 'discount', e.target.value)}
                min={0}
                max={100}
              />
              <span className="text-muted">% Lower anchor</span>
              <button
                className="px-2 py-0.5 bg-ink text-paper rounded text-xs"
                onClick={handleSaveConfig}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                className="px-2 py-0.5 bg-paper text-ink border border-hairline rounded text-xs"
                onClick={() => setIsEditing(false)}
              >Cancel</button>
            </>
          ) : (
            <button
              className="px-2 py-0.5 bg-paper text-ink border border-hairline rounded text-xs"
              onClick={() => setIsEditing(true)}
            >Edit anchors</button>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="pt-3 border-t border-hairline text-xs text-muted">
        {isSettled
          ? `Settlement finalized via Razorpay Route: ${sellerState.totalUnits} units captured at ${sellerState.tierApplied}.`
          : 'Net wholesale payout is calculated dynamically and routed automatically to merchant upon window closure.'}
      </div>
    </div>
  );
}
