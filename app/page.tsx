'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Header from '@/components/Header';
import BuyerPanel from '@/components/BuyerPanel';
import AgentStackPanel from '@/components/AgentStackPanel';
import SellerDashboard from '@/components/SellerDashboard';
import RazorpayModal from '@/components/RazorpayModal';
import FlowDiagramPage from '@/components/FlowDiagramPage';
import OnboardingModal from '@/components/OnboardingModal';
import { AppState } from '@/lib/store';

export default function Home() {
  const [state, setState] = useState<AppState | null>(null);
  const [viewMode, setViewMode] = useState<'demo' | 'architecture'>('demo');

  // Modal payment state
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    buyerId?: 'phoneA' | 'phoneB' | 'phoneC' | 'phoneD';
    buyerName?: string;
    amount?: number;
    isDiscounted?: boolean;
  }>({ isOpen: false });

  // Onboarding orientation modal state (auto-opens on first load)
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    try {
      const hasSeen = localStorage.getItem('seen_onboarding_v1');
      if (!hasSeen) {
        setShowOnboarding(true);
      }
    } catch {}
  }, []);

  // Poll state every 400ms for smooth real-time updates across panels
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        setState(data);
      }
    } catch (err) {
      console.error('Failed to fetch state:', err);
    }
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 400);
    return () => clearInterval(interval);
  }, [fetchState]);

  // Handlers
  const handleReset = async () => {
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
      }
    } catch (err) {
      console.error('Failed to reset:', err);
    }
  };

  const handleSimOrder = async (count: number) => {
    try {
      const res = await fetch('/api/sim-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      });
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
      }
    } catch (err) {
      console.error('Failed to add sim orders:', err);
    }
  };

  const handleFastForward = async () => {
    try {
      const res = await fetch('/api/close-window', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
      }
    } catch (err) {
      console.error('Failed to fast forward window:', err);
    }
  };

  const handleUpdateKeys = async (keyId: string, keySecret: string) => {
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_keys', keyId, keySecret }),
      });
      if (res.ok) {
        const data = await res.json();
        setState(data);
      }
    } catch (err) {
      console.error('Failed to update keys:', err);
    }
  };

  const handleSwitchProduct = async (productId: string) => {
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'switch_product', productId }),
      });
      if (res.ok) {
        const data = await res.json();
        setState(data);
      }
    } catch (err) {
      console.error('Failed to switch product:', err);
    }
  };

  const handleSetPhoneDWatching = async (prompt: string) => {
    try {
      const res = await fetch('/api/trigger-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_watching', prompt }),
      });
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
      }
    } catch (err) {
      console.error('Failed to set phone D watching:', err);
    }
  };

  const handleForceTriggerCoupon = async () => {
    try {
      const res = await fetch('/api/trigger-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'force_trigger' }),
      });
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
      }
    } catch (err) {
      console.error('Failed to force trigger coupon:', err);
    }
  };

  const [isAuthorizing, setIsAuthorizing] = useState(false);

  const handleOpenPaymentModal = (
    buyerId: 'phoneA' | 'phoneB' | 'phoneC' | 'phoneD',
    buyerName: string,
    amount: number,
    isDiscounted = false
  ) => {
    if (isAuthorizing) return;
    if (state?.phoneStates[buyerId]?.ordered || state?.windowClosed) return;

    setModalState({
      isOpen: true,
      buyerId,
      buyerName,
      amount,
      isDiscounted,
    });
  };

  const handlePaymentSuccess = async (paymentId: string) => {
    const { buyerId, buyerName, amount, isDiscounted } = modalState;
    if (!buyerId || !buyerName || isAuthorizing) return;
    if (state?.phoneStates[buyerId]?.ordered || state?.windowClosed) {
      setModalState({ isOpen: false });
      return;
    }

    setIsAuthorizing(true);
    setModalState({ isOpen: false });

    try {
      const res = await fetch('/api/order/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerId,
          buyerName,
          authorizedPrice: amount,
          isDiscountedOnAuth: isDiscounted || false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setState(data.state);
      }
    } catch (err) {
      console.error('Failed to authorize order:', err);
    } finally {
      setIsAuthorizing(false);
    }
  };

  if (!state) {
    return (
      <div className="h-[100dvh] bg-paper flex items-center justify-center text-muted font-mono text-xs">
        <div className="flex items-center gap-2">
          <span>Initializing Razorpay Agent Stack Decision Engine...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] overflow-hidden bg-paper text-ink flex flex-col font-sans">
      {/* Navigation Top Bar */}
      <Header
        state={state}
        onReset={handleReset}
        onSimOrder={handleSimOrder}
        onFastForward={handleFastForward}
        onUpdateKeys={handleUpdateKeys}
        onSwitchProduct={handleSwitchProduct}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        onOpenOnboarding={() => setShowOnboarding(true)}
      />

      {/* Main Content Area */}
      {viewMode === 'architecture' ? (
        <main className="flex-1 min-h-0 overflow-hidden p-6 max-w-[1700px] w-full mx-auto">
          <FlowDiagramPage onSwitchToDemo={() => setViewMode('demo')} />
        </main>
      ) : (
        <main className="flex-1 min-h-0 flex flex-row gap-4 px-5 pt-3 pb-4 w-full overflow-hidden">
          {/* Panel 1: Buyer Ledger (Left Column ~33%) */}
          <div className="w-[33%] min-w-0 flex flex-col overflow-y-auto custom-scrollbar">
            <BuyerPanel
              state={state}
              onOpenPaymentModal={handleOpenPaymentModal}
              onSetPhoneDWatching={handleSetPhoneDWatching}
              onForceTriggerCoupon={handleForceTriggerCoupon}
            />
          </div>

          {/* Panel 2: Agent Stack Decision Engine (Center Column ~42%) */}
          <div className="flex-1 min-w-0 flex flex-col overflow-y-auto custom-scrollbar">
            <AgentStackPanel state={state} />
          </div>

          {/* Panel 3: Seller Dashboard (Right Column ~25%) */}
          <div className="w-[25%] min-w-0 flex flex-col overflow-y-auto custom-scrollbar">
            <SellerDashboard state={state} />
          </div>
        </main>
      )}

      {/* Razorpay Interactive Checkout Modal */}
      <RazorpayModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false })}
        onSuccess={handlePaymentSuccess}
        amount={modalState.amount || state.activeProduct.retailPrice}
        buyerName={modalState.buyerName || 'Buyer'}
        skuName={state.activeProduct.name}
        isDiscounted={modalState.isDiscounted}
      />

      {/* Onboarding Orientation Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
    </div>
  );
}

