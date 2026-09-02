'use client';

import React from 'react';
import { Store, PackageCheck, DollarSign, CheckCircle2, ShieldCheck, Building2, TrendingUp } from 'lucide-react';
import { AppState } from '@/lib/store';

interface SellerDashboardProps {
  state: AppState;
}

export default function SellerDashboard({ state }: SellerDashboardProps) {
  const { sellerState, orders, windowClosed, activeProduct, targetQty } = state;
  const currentCount = orders.length;
  const product = activeProduct;

  const formatPrice = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  // Calculate live escrow estimated payout
  const projectedDiscountPct = currentCount >= 10 ? 0.10 : currentCount >= 9 ? 0.08 : currentCount >= 8 ? 0.06 : currentCount >= 7 ? 0.04 : currentCount >= 6 ? 0.02 : 0;
  const projectedUnitPrice = Math.round(product.retailPrice * (1 - projectedDiscountPct));
  const estimatedGrossPayout = currentCount * projectedUnitPrice;

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

