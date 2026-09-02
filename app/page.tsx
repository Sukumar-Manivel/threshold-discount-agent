'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Header from '@/components/Header';
import BuyerPanel from '@/components/BuyerPanel';
import AgentStackPanel from '@/components/AgentStackPanel';
import SellerDashboard from '@/components/SellerDashboard';
import RazorpayModal from '@/components/RazorpayModal';
import FlowDiagramPage from '@/components/FlowDiagramPage';
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

  // Poll state every 500ms for smooth real-time updates across panels
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
    const interval = setInterval(fetchState, 500);
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

  const handleOpenPaymentModal = (
    buyerId: 'phoneA' | 'phoneB' | 'phoneC' | 'phoneD',
    buyerName: string,
    amount: number,
    isDiscounted = false
  ) => {
    setModalState({
      isOpen: true,
      buyerId,
      buyerName,
      amount,
      isDiscounted,
    });
  };

  const handlePaymentSuccess = async (paymentId: string) => {
    if (!modalState.buyerId || !modalState.buyerName) return;

    try {
      const res = await fetch('/api/order/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerId: modalState.buyerId,
          buyerName: modalState.buyerName,
          authorizedPrice: modalState.amount,
          isDiscountedOnAuth: modalState.isDiscounted || false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setState(data.state);
      }
    } catch (err) {
      console.error('Failed to authorize order:', err);
    } finally {
      setModalState({ isOpen: false });
    }
  };

  if (!state) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>Initializing Razorpay Agent Stack Decision Engine...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
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
      />

      {/* Main Content Area */}
      {viewMode === 'architecture' ? (
        <main className="flex-1 p-4 max-w-[1700px] w-full mx-auto">
          <FlowDiagramPage onSwitchToDemo={() => setViewMode('demo')} />
        </main>
      ) : (
        <main className="flex-1 p-4 max-w-[1700px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Panel 1: Buyer Panel (Left Column - 4 Phone Frames) */}
          <div className="lg:col-span-4 h-[calc(100vh-100px)] min-h-[620px]">
            <BuyerPanel
              state={state}
              onOpenPaymentModal={handleOpenPaymentModal}
              onSetPhoneDWatching={handleSetPhoneDWatching}
              onForceTriggerCoupon={handleForceTriggerCoupon}
            />
          </div>

          {/* Panel 2: Agent Stack Decision Engine (Center Column) */}
          <div className="lg:col-span-5 h-[calc(100vh-100px)] min-h-[620px]">
            <AgentStackPanel state={state} />
          </div>

          {/* Panel 3: Seller Dashboard (Right Column) */}
          <div className="lg:col-span-3 h-[calc(100vh-100px)] min-h-[620px]">
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
    </div>
  );
}
