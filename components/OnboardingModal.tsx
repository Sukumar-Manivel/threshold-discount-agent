'use client';

import React, { useState, useEffect } from 'react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [currentScreen, setCurrentScreen] = useState(1);

  useEffect(() => {
    if (isOpen) {
      setCurrentScreen(1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalScreens = 4;

  const handleNext = () => {
    if (currentScreen < totalScreens) {
      setCurrentScreen((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentScreen > 1) {
      setCurrentScreen((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('seen_onboarding_v1', 'true');
      } catch {}
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-panel border border-hairline rounded-lg shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-hairline bg-paper">
          <span className="text-xs font-semibold text-ink uppercase tracking-wider">
            Orientation guide
          </span>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    step === currentScreen
                      ? 'w-6 bg-navy'
                      : step < currentScreen
                      ? 'w-2 bg-ledgergreen'
                      : 'w-2 bg-[#D5D1C8]'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleComplete}
              className="text-muted hover:text-ink text-sm p-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6 min-h-[240px] flex flex-col justify-center">
          {currentScreen === 1 && (
            <div className="space-y-3">
              <span className="text-xs font-mono text-oxblood">Step 1 of 4: The problem</span>
              <h3 className="font-serif text-xl font-bold text-ink">
                The retail deadweight loss
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                Multiple buyers can order the exact same item within the same window and each pay full retail — one order at a time. Tiered wholesale pricing exists for volume, but isolated checkouts leave those savings uncaptured.
              </p>
            </div>
          )}

          {currentScreen === 2 && (
            <div className="space-y-3">
              <span className="text-xs font-mono text-ledgergreen">Step 2 of 4: The solution</span>
              <h3 className="font-serif text-xl font-bold text-ink">
                Autonomous escrow demand aggregation
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                This agent pre-authorizes buyer payments into escrow, aggregates group demand over a short window, and captures everyone at the earned volume tier — automatically equalizing prices with instant refunds.
              </p>
            </div>
          )}

          {currentScreen === 3 && (
            <div className="space-y-3">
              <span className="text-xs font-mono text-navy">Step 3 of 4: The 5-participant flow</span>
              <h3 className="font-serif text-xl font-bold text-ink">
                How this run is structured
              </h3>
              <ul className="text-xs text-muted space-y-1.5 list-disc pl-4">
                <li><strong>Buyer A & Buyer B:</strong> Manual retail buyers (triggering the aggregation window).</li>
                <li><strong>Standing-Order Agent:</strong> Auto-buys when a targeted 6% price drop is issued.</li>
                <li><strong>Buyer C:</strong> Receives the nudge coupon but does not convert (deliberate 3/4 gap).</li>
                <li><strong>Control shopper:</strong> Unrelated search to prove bounded targeting.</li>
              </ul>
            </div>
          )}

          {currentScreen === 4 && (
            <div className="space-y-3 text-center py-2">
              <h3 className="font-serif text-2xl font-bold text-ink">
                Ready to watch the ledger update?
              </h3>
              <p className="text-xs text-muted max-w-sm mx-auto">
                Place orders, trigger threshold checks, or fast-forward timer to inspect settlement.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleComplete}
                  className="w-full py-2.5 bg-navy hover:bg-[#1B273A] text-white text-xs font-medium rounded transition"
                >
                  Start live operations console
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-hairline bg-paper text-xs">
          <div>
            {currentScreen > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="text-muted hover:text-ink font-medium"
              >
                ← Back
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                className="text-muted hover:text-ink"
              >
                Skip guide
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-muted font-mono text-[11px]">
              {currentScreen} / {totalScreens}
            </span>
            {currentScreen < totalScreens && (
              <button
                type="button"
                onClick={handleNext}
                className="px-3 py-1 bg-navy text-white text-xs font-medium rounded"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

