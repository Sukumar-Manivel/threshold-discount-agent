'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Cpu,
  Clock,
  Terminal,
  Shield,
  CheckCircle2,
  Filter,
  Layers,
  ArrowUpRight,
  Brain,
} from 'lucide-react';
import { AppState } from '@/lib/store';
import {
  MAX_DISCOUNT_DEPTH,
  MAX_NUDGES_PER_WINDOW,
  MAX_WINDOW_SECONDS,
} from '@/lib/constants';

interface AgentStackPanelProps {
  state: AppState;
}

export default function AgentStackPanel({ state }: AgentStackPanelProps) {
  const { orders, secondsRemaining, logs, windowStarted, windowClosed, activeProduct, targetQty, discountTiers } = state;
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [filterType, setFilterType] = useState<'all' | 'escrow' | 'nudge' | 'settle' | 'ai'>('all');

  // Auto-scroll audit log to bottom whenever logs update
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const currentCount = orders.length;
  const progressPct = Math.min(100, Math.round((currentCount / targetQty) * 100));

  // Time format MM:SS
  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const filteredLogs = logs.filter((log) => {
    if (filterType === 'escrow') return log.includes('AUTHORIZED') || log.includes('Escrow') || log.includes('Capture');
    if (filterType === 'nudge') return log.includes('Nudge') || log.includes('Coupon') || log.includes('Threshold');
    if (filterType === 'settle') return log.includes('Settlement') || log.includes('Wholesale') || log.includes('refund') || log.includes('closed');
    if (filterType === 'ai') return log.includes('🤖') || log.includes('LLM');
    return true;
  });

  const aiLogCount = logs.filter((log) => log.includes('🤖')).length;

  return (
    <div className="bg-[#0E1420] border border-[#1E293B] rounded-xl p-3.5 flex flex-col h-full shadow-lg space-y-3.5">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-blue-600/20 border border-blue-500/40 flex items-center justify-center">
            <Cpu className="w-3 h-3 text-blue-400" />
          </div>
          <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Panel 2 — Razorpay Agent Stack (Decision Engine)
          </h2>
        </div>
        <span className="text-[10px] bg-blue-950 text-blue-300 px-2 py-0.5 rounded font-mono font-medium border border-blue-800/60">
          Escrow Engine: Active
        </span>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Metric 1: Aggregate Volume Counter */}
        <div className="bg-[#151E2E] p-3 rounded-xl border border-[#1E293B] flex flex-col justify-between">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
              Group Volume Accumulator
            </span>
            <span className="text-xs font-bold text-blue-400">Target: {targetQty} Units</span>
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-2xl font-bold text-slate-100 font-mono">{currentCount}</span>
            <span className="text-xs text-slate-400">/ {targetQty} escrow orders locked</span>
          </div>

          {/* Volume Progress Bar */}
          <div className="space-y-1 mt-1.5">
            <div className="w-full bg-[#0E1420] h-2 rounded-full overflow-hidden border border-[#1E293B]">
              <div
                className="bg-[#0C66E4] h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>0</span>
              <span className="text-amber-400 font-medium">Min Discount ({state.minQtyForDiscount})</span>
              <span className="text-emerald-400 font-medium">Max Tier ({targetQty})</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Window Countdown Timer */}
        <div className="bg-[#151E2E] p-3 rounded-xl border border-[#1E293B] flex flex-col justify-between">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3 text-blue-400" /> Aggregation Window
            </span>
            <span className="text-[10px] text-slate-300 bg-[#0E1420] px-1.5 py-0.5 rounded border border-[#1E293B]">
              {MAX_WINDOW_SECONDS}s Demo Window
            </span>
          </div>
          <div className="flex items-baseline justify-between my-1">
            <span
              className={`text-2xl font-bold font-mono tracking-wider ${
                windowClosed
                  ? 'text-rose-400'
                  : secondsRemaining < 20
                  ? 'text-amber-400 animate-pulse'
                  : 'text-emerald-400'
              }`}
            >
              {formatTimer(secondsRemaining)}
            </span>
            <span className="text-[10px] text-slate-400 text-right leading-tight">
              (48h Real Window Compressed)
            </span>
          </div>
          <div className="text-[11px] text-slate-400 pt-0.5">
            {windowClosed ? (
              <span className="text-rose-300 font-medium">Window Closed — Settlement Completed</span>
            ) : windowStarted ? (
              <span className="text-emerald-300 font-medium">Escrow Window Open — Holding Funds</span>
            ) : (
              <span className="text-blue-300 font-medium">Triggers automatically on Order #1</span>
            )}
          </div>
        </div>
      </div>

      {/* Safety Bounds Card */}
      <div className="bg-[#151E2E] p-2.5 rounded-xl border border-[#1E293B]">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Shield className="w-3 h-3 text-blue-400" /> System Bounds & Agent Guardrails
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
          <div className="bg-[#0E1420] px-2 py-1.5 rounded-lg border border-[#1E293B]">
            <span className="text-slate-400 block text-[9px]">MAX_WINDOW</span>
            <span className="font-mono font-bold text-slate-200">{MAX_WINDOW_SECONDS}s window</span>
          </div>
          <div className="bg-[#0E1420] px-2 py-1.5 rounded-lg border border-[#1E293B]">
            <span className="text-slate-400 block text-[9px]">MAX_DISCOUNT</span>
            <span className="font-mono font-bold text-emerald-400">{Math.round(MAX_DISCOUNT_DEPTH * 100)}% Max Off</span>
          </div>
          <div className="bg-[#0E1420] px-2 py-1.5 rounded-lg border border-[#1E293B]">
            <span className="text-slate-400 block text-[9px]">MIN_DISCOUNT_QTY</span>
            <span className="font-mono font-bold text-amber-400">{state.minQtyForDiscount} Orders</span>
          </div>
          <div className="bg-[#0E1420] px-2 py-1.5 rounded-lg border border-[#1E293B]">
            <span className="text-slate-400 block text-[9px]">MAX_NUDGES</span>
            <span className="font-mono font-bold text-blue-400">{MAX_NUDGES_PER_WINDOW} Candidates</span>
          </div>
        </div>
      </div>

      {/* Audit Log Stream */}
      <div className="flex-1 flex flex-col min-h-[240px]">
        <div className="flex items-center justify-between bg-[#151E2E] px-3 py-1.5 rounded-t-xl border border-[#1E293B] border-b-0">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-semibold text-slate-200 font-mono">
              Live Audit Log (Escrow & Settlement Ledger)
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 text-[10px] font-medium">
            <button
              onClick={() => setFilterType('all')}
              className={`px-1.5 py-0.5 rounded ${filterType === 'all' ? 'bg-[#0C66E4] text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('escrow')}
              className={`px-1.5 py-0.5 rounded ${filterType === 'escrow' ? 'bg-[#0C66E4] text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Escrow
            </button>
            <button
              onClick={() => setFilterType('nudge')}
              className={`px-1.5 py-0.5 rounded ${filterType === 'nudge' ? 'bg-[#0C66E4] text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Nudges
            </button>
            <button
              onClick={() => setFilterType('settle')}
              className={`px-1.5 py-0.5 rounded ${filterType === 'settle' ? 'bg-[#0C66E4] text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Settlement
            </button>
            <button
              onClick={() => setFilterType('ai')}
              className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${filterType === 'ai' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Brain className="w-2.5 h-2.5" /> AI{aiLogCount > 0 ? ` (${aiLogCount})` : ''}
            </button>
          </div>
        </div>

        <div
          ref={logContainerRef}
          className="flex-1 bg-[#090D16] border border-[#1E293B] rounded-b-xl p-3 font-mono text-[11px] leading-relaxed overflow-y-auto space-y-1 max-h-[300px] custom-scrollbar shadow-inner"
        >
          {filteredLogs.map((log, idx) => {
            let badgeStyle = 'text-slate-300';
            if (log.includes('🤖') || log.includes('LLM')) badgeStyle = 'text-violet-300';
            else if (log.includes('Nudge') || log.includes('Coupon')) badgeStyle = 'text-amber-300';
            else if (log.includes('AUTHORIZED')) badgeStyle = 'text-blue-300';
            else if (log.includes('Escrow Capture') || log.includes('refund')) badgeStyle = 'text-emerald-300';
            else if (log.includes('fallback') || log.includes('Fallback')) badgeStyle = 'text-rose-300';
            else if (log.includes('Bulk wholesale') || log.includes('Wholesale')) badgeStyle = 'text-sky-300 font-semibold';
            else if (log.includes('Window closed')) badgeStyle = 'text-yellow-300 font-semibold';
            else if (log.includes('Seller Configuration')) badgeStyle = 'text-emerald-300 font-semibold';

            return (
              <div key={idx} className={`${badgeStyle} flex items-start gap-1`}>
                <span className="opacity-30 select-none text-slate-500 font-mono">›</span>
                <span className="break-all">{log}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Configurable Discount Tiers Table */}
      <div className="bg-[#151E2E] p-2.5 rounded-xl border border-[#1E293B]">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Configured Group Discount Tiers
          </span>
          <span className="text-[10px] text-slate-400">
            Active Product: {activeProduct.name}
          </span>
        </div>
        <div className="grid grid-cols-6 gap-1 text-[10px] font-mono text-center">
          <div className={`p-1 rounded border transition ${currentCount >= 10 ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300 font-bold' : 'bg-[#0E1420] border-[#1E293B] text-slate-400'}`}>
            <span>10: 10% off</span>
          </div>
          <div className={`p-1 rounded border transition ${currentCount === 9 ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300 font-bold' : 'bg-[#0E1420] border-[#1E293B] text-slate-400'}`}>
            <span>9: 8% off</span>
          </div>
          <div className={`p-1 rounded border transition ${currentCount === 8 ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300 font-bold' : 'bg-[#0E1420] border-[#1E293B] text-slate-400'}`}>
            <span>8: 6% off</span>
          </div>
          <div className={`p-1 rounded border transition ${currentCount === 7 ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300 font-bold' : 'bg-[#0E1420] border-[#1E293B] text-slate-400'}`}>
            <span>7: 4% off</span>
          </div>
          <div className={`p-1 rounded border transition ${currentCount === 6 ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300 font-bold' : 'bg-[#0E1420] border-[#1E293B] text-slate-400'}`}>
            <span>6: 2% off</span>
          </div>
          <div className={`p-1 rounded border transition ${currentCount < 6 && windowClosed ? 'bg-rose-950/60 border-rose-700 text-rose-300 font-bold' : 'bg-[#0E1420] border-[#1E293B] text-slate-400'}`}>
            <span>&lt;6: 0% Fallback</span>
          </div>
        </div>
      </div>
    </div>
  );
}

