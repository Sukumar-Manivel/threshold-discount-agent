'use client';

import React, { useState } from 'react';
import {
  Store,
  PackageCheck,
  DollarSign,
  CheckCircle2,
  ShieldCheck,
  Building2,
  TrendingUp,
  Settings,
  Save,
  Lock,
  Edit3,
} from 'lucide-react';
import { AppState } from '@/lib/store';
import { MAX_DISCOUNT_DEPTH } from '@/lib/constants';

interface SellerDashboardProps {
  state: AppState;
}

interface TierRow {
  qty: number;
  discount: number; // as percentage integer e.g. 10 = 10%
}

export default function SellerDashboard({ state }: SellerDashboardProps) {
  const { sellerState, orders, windowClosed, activeProduct, targetQty, sellerConfig } = state;
  const currentCount = orders.length;
  const product = activeProduct;

  const formatPrice = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  // Seller config form state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tierRows, setTierRows] = useState<TierRow[]>(() => {
    const tiers = sellerConfig?.tiers || {};
    return Object.entries(tiers)
      .map(([qty, disc]) => ({ qty: Number(qty), discount: Math.round(Number(disc) * 100) }))
      .sort((a, b) => b.qty - a.qty);
  });

  const handleTierChange = (index: number, field: 'qty' | 'discount', value: string) => {
    const updated = [...tierRows];
    updated[index] = { ...updated[index], [field]: Number(value) };
    setTierRows(updated);
  };

  const addTierRow = () => {
    setTierRows([...tierRows, { qty: tierRows.length > 0 ? Math.max(...tierRows.map(t => t.qty)) + 1 : 5, discount: 2 }]);
  };

  const removeTierRow = (index: number) => {
    setTierRows(tierRows.filter((_, i) => i !== index));
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const tiersObj: Record<number, number> = {};
      for (const row of tierRows) {
        tiersObj[row.qty] = row.discount / 100; // convert percentage to fraction
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

  // Calculate live escrow estimated payout
  const projectedDiscountPct = currentCount >= 10 ? 0.10 : currentCount >= 9 ? 0.08 : currentCount >= 8 ? 0.06 : currentCount >= 7 ? 0.04 : currentCount >= 6 ? 0.02 : 0;
  const projectedUnitPrice = Math.round(product.retailPrice * (1 - projectedDiscountPct));
  const estimatedGrossPayout = currentCount * projectedUnitPrice;

  const canEditConfig = !state.windowStarted || windowClosed;

  return (
    <div className="bg-[#0E1420] border border-[#1E293B] rounded-xl p-3.5 flex flex-col h-full shadow-lg space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Panel 3 — Seller Merchant Portal
          </h2>
        </div>
        <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded font-mono border border-emerald-800/60">
          Razorpay Route
        </span>
      </div>

      {/* Active SKU Summary */}
      <div className="bg-[#151E2E] p-3 rounded-xl border border-[#1E293B] space-y-2">
        <div className="flex items-center gap-2.5">
          <img
            src={product.image}
            alt={product.name}
            className="w-10 h-10 rounded-lg object-cover border border-[#1E293B]"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-semibold text-slate-100 truncate">{product.name}</h4>
            <span className="text-[10px] text-slate-400 font-mono">{product.sku}</span>
          </div>
        </div>
        <div className="pt-2 border-t border-[#1E293B] flex justify-between items-center text-xs">
          <span className="text-slate-400 font-medium">Standard Retail</span>
          <span className="font-semibold text-slate-200">{formatPrice(product.retailPrice)}</span>
        </div>
      </div>

      {/* Seller Tier Configuration */}
      <div className="bg-[#151E2E] p-3 rounded-xl border border-[#1E293B] space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <Settings className="w-3 h-3 text-blue-400" />
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
              Seller Tier Configuration
            </span>
          </div>
          {sellerConfig?.isApproved && !isEditing && (
            <span className="text-[9px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded font-mono border border-emerald-800/60 flex items-center gap-1">
              <CheckCircle2 className="w-2.5 h-2.5" /> Approved
            </span>
          )}
          {!sellerConfig?.isApproved && !isEditing && (
            <span className="text-[9px] bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded font-mono border border-amber-800/60">
              Pending
            </span>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2">
            {tierRows.map((row, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={row.qty}
                  onChange={(e) => handleTierChange(idx, 'qty', e.target.value)}
                  className="w-14 bg-[#090D16] border border-[#1E293B] rounded px-1.5 py-1 text-[10px] text-slate-200 font-mono focus:outline-none focus:border-blue-500 text-center"
                  placeholder="Qty"
                  min={1}
                />
                <span className="text-[10px] text-slate-500">units →</span>
                <input
                  type="number"
                  value={row.discount}
                  onChange={(e) => handleTierChange(idx, 'discount', e.target.value)}
                  className="w-14 bg-[#090D16] border border-[#1E293B] rounded px-1.5 py-1 text-[10px] text-slate-200 font-mono focus:outline-none focus:border-blue-500 text-center"
                  placeholder="%"
                  min={0}
                  max={Math.round(MAX_DISCOUNT_DEPTH * 100)}
                />
                <span className="text-[10px] text-slate-500">% off</span>
                <button
                  onClick={() => removeTierRow(idx)}
                  className="text-rose-400 hover:text-rose-300 text-[10px] font-bold px-1"
                >
                  ✕
                </button>
              </div>
            ))}
            <div className="flex gap-1.5 pt-1">
              <button
                onClick={addTierRow}
                className="flex-1 py-1 bg-[#090D16] hover:bg-[#151E2E] border border-[#1E293B] text-slate-400 text-[10px] font-medium rounded transition"
              >
                + Add Tier
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="flex-1 py-1 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-[10px] font-semibold rounded flex items-center justify-center gap-1 transition"
              >
                <Save className="w-3 h-3" /> {saving ? 'Saving...' : 'Save & Approve'}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-2 py-1 text-slate-400 hover:text-slate-200 text-[10px] font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
              {Object.entries(sellerConfig?.tiers || {})
                .sort(([a], [b]) => Number(b) - Number(a))
                .map(([qty, disc]) => (
                  <div key={qty} className="bg-[#090D16] px-2 py-1 rounded border border-[#1E293B] flex justify-between">
                    <span className="text-slate-400">{qty} units</span>
                    <span className="text-emerald-400 font-medium">{Math.round(Number(disc) * 100)}% off</span>
                  </div>
                ))}
            </div>
            {canEditConfig && (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full py-1 bg-[#090D16] hover:bg-[#151E2E] border border-[#1E293B] text-slate-400 hover:text-slate-200 text-[10px] font-medium rounded flex items-center justify-center gap-1.5 transition"
              >
                <Edit3 className="w-3 h-3" /> Edit Tier Table
              </button>
            )}
            {!canEditConfig && (
              <div className="flex items-center gap-1 text-[9px] text-slate-500">
                <Lock className="w-2.5 h-2.5" /> Locked during active window
              </div>
            )}
          </div>
        )}
      </div>

      {/* Live Wholesale Volume Accumulator */}
      <div className="bg-[#151E2E] p-3.5 rounded-xl border border-[#1E293B] space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
            Wholesale Pool Escrow
          </span>
          <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Razorpay Hold
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-100 font-mono">{currentCount}</span>
          <span className="text-xs text-slate-400">units aggregate demand</span>
        </div>
        <div className="bg-[#0E1420] p-2 rounded-lg border border-[#1E293B] text-[11px] space-y-1">
          <div className="flex justify-between text-slate-400">
            <span>Projected Wholesale Rate:</span>
            <span className="font-mono text-slate-200">{formatPrice(projectedUnitPrice)} / unit</span>
          </div>
          <div className="flex justify-between text-slate-400 font-medium">
            <span>Est. Gross Escrow:</span>
            <span className="font-mono text-emerald-300 font-bold">{formatPrice(estimatedGrossPayout)}</span>
          </div>
        </div>
      </div>

      {/* Wholesale Settlement Box */}
      <div className="flex-1 flex flex-col justify-end">
        <div
          className={`p-3.5 rounded-xl border space-y-2.5 ${
            sellerState.settlementStatus === 'completed'
              ? 'bg-emerald-950/30 border-emerald-700/60'
              : 'bg-[#151E2E] border-[#1E293B]'
          }`}
        >
          <div className="flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider">
              Settlement Status
            </h3>
          </div>

          {sellerState.settlementStatus === 'completed' ? (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Razorpay Route Transfer Executed
              </div>
              <div className="bg-[#090D16] p-2.5 rounded-lg border border-emerald-800/50 text-xs font-mono space-y-1">
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span>Total Units Settled:</span>
                  <span className="font-bold text-slate-100">{sellerState.totalUnits} units</span>
                </div>
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span>Settled Unit Price:</span>
                  <span className="font-bold text-slate-100">{formatPrice(sellerState.unitPrice || 0)}</span>
                </div>
                <div className="pt-2 border-t border-[#1E293B] flex justify-between items-center text-sm font-bold text-white">
                  <span>Merchant Net Payout:</span>
                  <span className="text-emerald-300 font-mono">
                    {formatPrice(sellerState.totalPayout || 0)}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block pt-1">
                  Settlement Tier: {sellerState.tierApplied}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 space-y-1">
              <p>Escrow window is actively aggregating buyer orders.</p>
              <span className="text-[10px] text-slate-400 block">
                Final wholesale settlement and net merchant transfer will execute automatically upon window countdown expiry.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
