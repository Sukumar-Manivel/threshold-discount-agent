'use client';

import React, { useState } from 'react';
import { AppState } from '@/lib/store';
import { MAX_DISCOUNT_DEPTH, computeDynamicDiscount } from '@/lib/constants';

interface SellerDashboardProps {
  state: AppState;
}

interface TierRow {
  qty: number;
  discount: number; // percentage integer e.g. 10 = 10%
}

export default function SellerDashboard({ state }: SellerDashboardProps) {
  const { sellerState, orders, windowClosed, activeProduct, targetQty, sellerConfig } = state;
  const currentCount = orders.length;
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

  // Projected settlement metrics via deterministic calculation
  const dynamicCalc = computeDynamicDiscount(currentCount, sellerConfig?.tiers);
  const projectedDiscountPct = dynamicCalc.discount;
  const projectedUnitPrice = Math.round(product.retailPrice * (1 - projectedDiscountPct));
  const estimatedGrossPayout = currentCount * projectedUnitPrice;

  const isSettled = sellerState.settlementStatus === 'completed';
  const displayPayout = isSettled
    ? sellerState.totalPayout || 0
    : estimatedGrossPayout;

  const canEditConfig = !state.windowStarted || windowClosed;

  // Compute 3-unit mid tier value dynamically
  const midTierCalc = computeDynamicDiscount(3, sellerConfig?.tiers);
  const hasReached3 = currentCount >= 3 || (isSettled && sellerState.totalUnits && sellerState.totalUnits >= 3);

  const upperAnchorDisc = Math.round(((sellerConfig?.tiers && sellerConfig.tiers[4]) || 0.10) * 100);
  const lowerAnchorDisc = Math.round(((sellerConfig?.tiers && sellerConfig.tiers[2]) || 0.03) * 100);

  return (
    <div className="bg-panel border border-hairline rounded-lg p-5 flex flex-col h-full justify-between">
      {/* Top Section */}
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-baseline justify-between pb-3.5 border-b border-hairline">
          <div>
            <h2 className="font-serif text-lg font-semibold text-ink">
              Seller settlement
            </h2>
            <p className="text-xs text-muted">Merchant escrow statement & route payout</p>
          </div>
          <span className="text-xs font-mono text-muted bg-paper px-2 py-0.5 rounded border border-hairline">
            {isSettled ? 'Settled' : 'Pending window'}
          </span>
        </div>

        {/* Hero Settlement Display */}
        <div className="py-2">
          <span className="text-xs text-muted block mb-1">
            {isSettled ? 'Final net merchant payout' : 'Estimated escrow balance'}
          </span>
          <div
            className={`font-serif text-3xl font-bold tracking-tight ${
              isSettled ? 'text-ledgergreen' : 'text-ink'
            }`}
          >
            {formatPrice(displayPayout)}
          </div>
        </div>

        {/* 2-3 Key Metrics Rows */}
        <div className="divide-y divide-hairline border-y border-hairline py-1 text-xs">
          <div className="py-2 flex justify-between items-center">
            <span className="text-muted">Total units settled</span>
            <span className="font-mono font-medium text-ink">
              {isSettled ? `${sellerState.totalUnits} of ${targetQty}` : `${currentCount} of ${targetQty} units`}
            </span>
          </div>
          <div className="py-2 flex justify-between items-center">
            <span className="text-muted">Settled unit price</span>
            <span className="font-mono font-medium text-ink">
              {isSettled
                ? formatPrice(sellerState.unitPrice || product.retailPrice)
                : formatPrice(projectedUnitPrice)}
            </span>
          </div>
          <div className="py-2 flex justify-between items-center">
            <span className="text-muted">Applied tier</span>
            <span className="font-medium text-ink">
              {isSettled
                ? sellerState.tierApplied || 'Dynamic tier'
                : `${dynamicCalc.discountPct}% tier (${currentCount}/${targetQty} units)`}
            </span>
          </div>
          {isSettled && orders.some((o) => (o.refundAmount || 0) > 0) ? (
            <div className="py-2 flex justify-between items-center text-ledgergreen">
              <span>Customer equalized refunds</span>
              <span className="font-mono font-semibold">
                {formatPrice(orders.reduce((acc, o) => acc + (o.refundAmount || 0), 0))}
              </span>
            </div>
          ) : null}
        </div>

        {/* Wholesale Tier Schedule */}
        <div className="pt-1">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-ink">Wholesale tier schedule</span>
            {canEditConfig && !isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-xs text-navy hover:underline"
              >
                Edit anchors
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2.5 bg-paper p-3 rounded border border-hairline">
              <span className="text-[11px] text-muted block">
                Define 2 fixed anchor tiers (mid-tier computed dynamically via linear interpolation):
              </span>
              {tierRows.map((row, idx) => (
                <div key={idx} className="flex items-center justify-between gap-1.5 text-xs">
                  <span className="text-muted font-mono">{idx === 0 ? 'Upper anchor:' : 'Lower anchor:'}</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={row.qty}
                      onChange={(e) => handleTierChange(idx, 'qty', e.target.value)}
                      className="w-12 bg-panel border border-hairline rounded px-1.5 py-0.5 font-mono text-ink text-center"
                      min={1}
                    />
                    <span className="text-muted">units →</span>
                    <input
                      type="number"
                      value={row.discount}
                      onChange={(e) => handleTierChange(idx, 'discount', e.target.value)}
                      className="w-12 bg-panel border border-hairline rounded px-1.5 py-0.5 font-mono text-ink text-center"
                      min={0}
                      max={10}
                    />
                    <span className="text-muted">% off</span>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 pt-1 border-t border-hairline">
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="px-3 py-1 bg-navy text-white text-xs font-medium rounded"
                >
                  {saving ? 'Saving...' : 'Save anchors'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-2 py-1 text-muted text-xs hover:underline"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
              {/* Box 1: Upper Anchor (4 units) */}
              <div
                className={`p-2 rounded border text-center ${
                  (isSettled ? sellerState.totalUnits === 4 : currentCount === 4)
                    ? 'bg-paper border-navy text-navy font-semibold'
                    : 'bg-panel border-hairline text-muted'
                }`}
              >
                <div className="text-[10px] text-muted">Upper anchor</div>
                <div className="text-[11px] font-medium text-ink">4 units</div>
                <div className="font-bold text-ink">{upperAnchorDisc}% off</div>
              </div>

              {/* Box 2: Dynamic Mid-Tier (3 units) */}
              <div
                className={`p-2 rounded border text-center relative ${
                  (isSettled ? sellerState.totalUnits === 3 : currentCount === 3)
                    ? 'bg-paper border-navy text-navy font-semibold'
                    : 'bg-panel border-hairline text-muted'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <span className="text-[10px] text-muted">3 units</span>
                  <span className="text-[9px] font-mono px-1 py-0.2 bg-paper border border-hairline rounded text-navy">
                    AI
                  </span>
                </div>
                <div className="font-bold text-ink mt-0.5">
                  {hasReached3 ? `${midTierCalc.discountPct}% off` : `${midTierCalc.discountPct}% est.`}
                </div>
                <div className="text-[9px] text-muted opacity-80">
                  {hasReached3 ? 'Computed' : 'Dynamic math'}
                </div>
              </div>

              {/* Box 3: Lower Anchor (2 units) */}
              <div
                className={`p-2 rounded border text-center ${
                  (isSettled ? sellerState.totalUnits === 2 : currentCount === 2)
                    ? 'bg-paper border-navy text-navy font-semibold'
                    : 'bg-panel border-hairline text-muted'
                }`}
              >
                <div className="text-[10px] text-muted">Lower anchor</div>
                <div className="text-[11px] font-medium text-ink">2 units</div>
                <div className="font-bold text-ink">{lowerAnchorDisc}% off</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Single Plain Sentence Bottom Footer */}
      <div className="pt-3 border-t border-hairline text-xs text-muted">
        {isSettled
          ? `Settlement finalized via Razorpay Route: ${sellerState.totalUnits} units captured at ${sellerState.tierApplied}.`
          : 'Net wholesale payout is calculated dynamically and routed automatically to merchant upon window closure.'}
      </div>
    </div>
  );
}

