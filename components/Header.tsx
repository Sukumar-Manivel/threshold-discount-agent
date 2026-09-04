'use client';

import React, { useState } from 'react';
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
  onOpenOnboarding?: () => void;
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
  onOpenOnboarding,
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
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-oxblood bg-paper border border-hairline">
      Settled & closed
    </span>
  ) : state.windowStarted ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-ledgergreen bg-paper border border-hairline">
      Active ({state.secondsRemaining}s)
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-muted bg-paper border border-hairline">
      Ready (idle)
    </span>
  );

  return (
    <header className="bg-panel border-b border-hairline sticky top-0 z-40 px-6 py-3">
      <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Branding & SKU selector */}
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-base font-bold text-ink tracking-tight">
                Threshold-Discount Agent
              </span>
              <span className="text-[10px] font-mono text-muted bg-paper px-1.5 py-0.5 rounded border border-hairline">
                Razorpay sandbox
              </span>
            </div>
            <p className="text-xs text-muted">
              Autonomous demand aggregation & price equalization ledger
            </p>
          </div>

          {onSwitchProduct && (
            <div className="flex items-center gap-1.5 bg-paper border border-hairline px-2.5 py-1 rounded">
              <span className="text-xs text-muted">SKU:</span>
              <select
                value={state.activeProduct?.id || PRODUCT_CATALOG[0].id}
                onChange={(e) => onSwitchProduct(e.target.value)}
                disabled={state.windowStarted && !state.windowClosed}
                className="bg-transparent text-xs font-medium text-ink focus:outline-none cursor-pointer disabled:opacity-50"
              >
                {PRODUCT_CATALOG.map((prod) => (
                  <option key={prod.id} value={prod.id} className="bg-panel text-ink">
                    {prod.name} (₹{prod.retailPrice.toLocaleString('en-IN')})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="hidden lg:block">{statusBadge}</div>
        </div>

        {/* View Switcher */}
        {onToggleViewMode && (
          <div className="flex bg-paper p-0.5 rounded border border-hairline text-xs">
            <button
              type="button"
              onClick={() => onToggleViewMode('demo')}
              className={`px-3 py-1 rounded font-medium transition ${
                viewMode === 'demo'
                  ? 'bg-panel text-ink shadow-sm border border-hairline'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Operations console
            </button>
            <button
              type="button"
              onClick={() => onToggleViewMode('architecture')}
              className={`px-3 py-1 rounded font-medium transition ${
                viewMode === 'architecture'
                  ? 'bg-panel text-ink shadow-sm border border-hairline'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Architecture workflow
            </button>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSimOrder(1)}
            disabled={state.windowClosed}
            className="px-2.5 py-1 bg-paper hover:bg-[#EAE6DD] disabled:opacity-40 text-ink text-xs font-medium rounded border border-hairline transition"
          >
            +1 Order
          </button>

          <button
            type="button"
            onClick={onFastForward}
            disabled={state.windowClosed || !state.windowStarted}
            className="px-2.5 py-1 bg-paper hover:bg-[#EAE6DD] disabled:opacity-40 text-oxblood text-xs font-medium rounded border border-hairline transition"
            title="Fast forward timer to trigger settlement immediately"
          >
            Fast-forward timer
          </button>

          <button
            type="button"
            onClick={onOpenOnboarding}
            className="px-2.5 py-1 bg-paper hover:bg-[#EAE6DD] text-ink text-xs font-medium rounded border border-hairline transition"
          >
            Guide
          </button>

          <button
            type="button"
            onClick={() => setShowKeyModal(true)}
            className="px-2.5 py-1 bg-paper hover:bg-[#EAE6DD] text-muted hover:text-ink text-xs font-medium rounded border border-hairline transition"
          >
            API keys
          </button>

          <button
            type="button"
            onClick={onReset}
            className="px-3 py-1 bg-paper hover:bg-[#EAE6DD] text-oxblood text-xs font-medium rounded border border-hairline transition"
          >
            Reset
          </button>
        </div>
      </div>

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-panel border border-hairline rounded-lg p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <h3 className="font-serif text-base font-semibold text-ink">
                Razorpay credentials
              </h3>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="text-muted hover:text-ink text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveKeys} className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Key ID</label>
                <input
                  type="text"
                  placeholder="rzp_test_..."
                  value={keyId}
                  onChange={(e) => setKeyId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-paper border border-hairline rounded text-xs font-mono text-ink focus:outline-none focus:border-navy"
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Key secret</label>
                <input
                  type="password"
                  placeholder="Secret key..."
                  value={keySecret}
                  onChange={(e) => setKeySecret(e.target.value)}
                  className="w-full px-3 py-1.5 bg-paper border border-hairline rounded text-xs font-mono text-ink focus:outline-none focus:border-navy"
                />
              </div>
              <p className="text-xs text-muted bg-paper p-2 rounded border border-hairline">
                Leave empty to run in built-in simulated sandbox mode.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-3 py-1 text-xs text-muted hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-navy text-white text-xs font-medium rounded"
                >
                  Save credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}


