'use client';

import React, { useState } from 'react';
import {
  RotateCcw,
  Zap,
  Plus,
  FastForward,
  Key,
  Shield,
  Layers,
  Sparkles,
  ChevronDown,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react';
import { AppState } from '@/lib/store';
import { PRODUCT_CATALOG } from '@/lib/constants';

interface HeaderProps {
  state: AppState;
  onReset: () => void;
  onSimOrder: (count: number) => void;
  onFastForward: () => void;
  onUpdateKeys: (keyId: string, keySecret: string) => void;
  onSwitchProduct?: (productId: string) => void;
  viewMode?: 'demo' | 'architecture';
  onToggleViewMode?: (mode: 'demo' | 'architecture') => void;
}

export default function Header({
  state,
  onReset,
  onSimOrder,
  onFastForward,
  onUpdateKeys,
  onSwitchProduct,
  viewMode = 'demo',
  onToggleViewMode,
}: HeaderProps) {
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyId, setKeyId] = useState(state.razorpayKeys?.keyId || '');
  const [keySecret, setKeySecret] = useState(state.razorpayKeys?.keySecret || '');

  const handleSaveKeys = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateKeys(keyId, keySecret);
    setShowKeyModal(false);
  };

  const statusBadge = state.windowClosed ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-950/60 text-rose-300 border border-rose-800/60">
      <span className="w-2 h-2 rounded-full bg-rose-400" /> Settled & Closed
    </span>
  ) : state.windowStarted ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Active ({state.secondsRemaining}s)
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800/70 text-slate-300 border border-slate-700/60">
      <span className="w-2 h-2 rounded-full bg-slate-400" /> Idle (Ready)
    </span>
  );

  return (
    <header className="bg-[#0E1420] border-b border-[#1E293B] sticky top-0 z-40 px-4 py-2.5 shadow-md">
      <div className="max-w-[1750px] mx-auto flex flex-col xl:flex-row items-center justify-between gap-3">
        {/* Branding & Product Switcher */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-between xl:justify-start">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0C66E4] flex items-center justify-center text-white font-bold text-sm shadow-sm">
              <span className="tracking-tighter">R</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-100 tracking-tight">
                  Razorpay Escrow & Demand Agent
                </span>
                <span className="text-[10px] bg-blue-950 text-blue-300 px-1.5 py-0.5 rounded font-mono font-medium border border-blue-800/60">
                  SANDBOX
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Automated Threshold Group-Discount Decision Engine
              </p>
            </div>
          </div>

          {/* Dynamic Product Selector */}
          {onSwitchProduct && (
            <div className="flex items-center gap-1.5 bg-[#151E2E] border border-[#1E293B] px-2.5 py-1 rounded-lg">
              <ShoppingBag className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">SKU:</span>
              <select
                value={state.activeProduct?.id || PRODUCT_CATALOG[0].id}
                onChange={(e) => onSwitchProduct(e.target.value)}
                disabled={state.windowStarted && !state.windowClosed}
                className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer disabled:opacity-50"
                title={state.windowStarted && !state.windowClosed ? 'Reset before switching product' : 'Select active SKU catalog item'}
              >
                {PRODUCT_CATALOG.map((prod) => (
                  <option key={prod.id} value={prod.id} className="bg-[#0E1420] text-slate-200">
                    {prod.name} (₹{prod.retailPrice.toLocaleString('en-IN')})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="hidden lg:block">{statusBadge}</div>
        </div>

        {/* Center Mode Switcher Tabs */}
        {onToggleViewMode && (
          <div className="flex bg-[#151E2E] p-1 rounded-lg border border-[#1E293B] text-xs shadow-inner">
            <button
              onClick={() => onToggleViewMode('demo')}
              className={`px-3 py-1 rounded-md font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'demo'
                  ? 'bg-[#0C66E4] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Operations Console
            </button>
            <button
              onClick={() => onToggleViewMode('architecture')}
              className={`px-3 py-1 rounded-md font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'architecture'
                  ? 'bg-[#0C66E4] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Architecture Workflow
            </button>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Simulated Order Buttons */}
          <button
            onClick={() => onSimOrder(1)}
            disabled={state.windowClosed}
            className="px-2.5 py-1.5 bg-[#151E2E] hover:bg-[#1A253A] disabled:opacity-40 text-slate-300 text-xs font-medium rounded-lg border border-[#1E293B] flex items-center gap-1.5 transition"
            title="Simulate 1 order from external buyer"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" /> +1 Order
          </button>

          <button
            onClick={() => onSimOrder(5)}
            disabled={state.windowClosed}
            className="px-2.5 py-1.5 bg-blue-950/60 hover:bg-blue-900/60 disabled:opacity-40 text-blue-200 text-xs font-medium rounded-lg border border-blue-800/60 flex items-center gap-1.5 transition"
            title="Add 5 orders quickly for live presentation"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" /> +5 Batch
          </button>

          {/* Fast Forward Window */}
          <button
            onClick={onFastForward}
            disabled={state.windowClosed || !state.windowStarted}
            className="px-2.5 py-1.5 bg-amber-950/50 hover:bg-amber-900/60 disabled:opacity-40 text-amber-200 text-xs font-medium rounded-lg border border-amber-800/50 flex items-center gap-1.5 transition"
            title="Fast forward timer to trigger settlement immediately"
          >
            <FastForward className="w-3.5 h-3.5 text-amber-400" /> Fast-Forward Timer
          </button>

          {/* Key Config */}
          <button
            onClick={() => setShowKeyModal(true)}
            className="px-2.5 py-1.5 bg-[#151E2E] hover:bg-[#1A253A] text-slate-300 text-xs font-medium rounded-lg border border-[#1E293B] flex items-center gap-1.5 transition"
          >
            <Key className="w-3.5 h-3.5 text-slate-400" /> API Keys
          </button>

          {/* Reset Demo Button */}
          <button
            onClick={onReset}
            className="px-3 py-1.5 bg-rose-950/50 hover:bg-rose-900/60 text-rose-200 text-xs font-semibold rounded-lg border border-rose-800/50 flex items-center gap-1.5 transition"
            title="Reset aggregation cycle"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" /> Reset
          </button>
        </div>
      </div>

      {/* Razorpay API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0E1420] border border-[#1E293B] rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h3 className="text-white text-sm font-semibold flex items-center gap-2">
                <Key className="w-4 h-4 text-blue-400" /> Razorpay Test Credentials
              </h3>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveKeys} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">Razorpay Key ID</label>
                <input
                  type="text"
                  placeholder="rzp_test_..."
                  value={keyId}
                  onChange={(e) => setKeyId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#151E2E] border border-[#1E293B] rounded-lg text-xs text-slate-200 font-mono focus:border-[#0C66E4] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">Razorpay Key Secret</label>
                <input
                  type="password"
                  placeholder="Secret key..."
                  value={keySecret}
                  onChange={(e) => setKeySecret(e.target.value)}
                  className="w-full px-3 py-2 bg-[#151E2E] border border-[#1E293B] rounded-lg text-xs text-slate-200 font-mono focus:border-[#0C66E4] focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed bg-[#151E2E] p-2.5 rounded-lg border border-[#1E293B]">
                Leave empty to run in Built-in Razorpay Sandbox Simulation mode (all escrow orders, captures, and refund flows run automatically).
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0C66E4] hover:bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Save Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}

