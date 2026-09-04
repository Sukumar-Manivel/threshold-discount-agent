'use client';

import React, { useState } from 'react';

interface RazorpayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentId: string) => void;
  amount: number; // in INR
  buyerName: string;
  skuName: string;
  isDiscounted?: boolean;
}

export default function RazorpayModal({
  isOpen,
  onClose,
  onSuccess,
  amount,
  buyerName,
  skuName,
  isDiscounted = false,
}: RazorpayModalProps) {
  const [processing, setProcessing] = useState(false);
  const [method, setMethod] = useState<'card' | 'upi' | 'netbanking'>('card');

  if (!isOpen) return null;

  const handlePay = () => {
    if (processing) return;
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      const simulatedPaymentId = `pay_rzp_${Math.random().toString(36).substring(2, 10)}`;
      onSuccess(simulatedPaymentId);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-panel border border-hairline rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-navy px-5 py-3.5 flex justify-between items-center text-white">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-sm font-semibold tracking-tight">
                Razorpay checkout
              </h3>
              <span className="bg-white/20 text-white text-[9px] px-1.5 py-0.5 rounded font-mono uppercase">
                Sandbox
              </span>
            </div>
            <p className="text-xs opacity-80 truncate max-w-[260px]">{skuName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Order Details */}
          <div className="bg-paper p-3 rounded border border-hairline flex justify-between items-center text-xs">
            <div>
              <span className="text-muted block text-[11px]">Buyer account</span>
              <span className="font-medium text-ink">{buyerName}</span>
            </div>
            <div className="text-right">
              <span className="text-muted block text-[11px]">Escrow authorization</span>
              <span className={`font-serif text-base font-bold ${isDiscounted ? 'text-ledgergreen' : 'text-ink'}`}>
                ₹{amount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <p className="text-xs text-muted leading-relaxed">
            <strong>Escrow hold (manual capture):</strong> Funds are authorized and held safely in Razorpay escrow until group aggregation closes.
          </p>

          {/* Payment Method Selector */}
          <div className="space-y-1.5 text-xs">
            <label className="text-muted block font-medium">Sandbox payment method</label>
            <div className="grid grid-cols-3 gap-2">
              {(['card', 'upi', 'netbanking'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`py-1.5 px-2 rounded border text-xs font-medium capitalize transition ${
                    method === m
                      ? 'bg-paper border-navy text-navy font-semibold'
                      : 'bg-panel border-hairline text-muted hover:text-ink'
                  }`}
                >
                  {m === 'netbanking' ? 'NetBanking' : m}
                </button>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handlePay}
            disabled={processing}
            className="w-full py-2.5 bg-navy hover:bg-[#1B273A] text-white font-medium rounded text-xs transition disabled:opacity-50"
          >
            {processing ? (
              <span>Authorizing with Razorpay...</span>
            ) : (
              <span>Authorize ₹{amount.toLocaleString('en-IN')} escrow hold</span>
            )}
          </button>
        </div>

        <div className="bg-paper px-5 py-2 border-t border-hairline flex justify-between items-center text-[10px] text-muted">
          <span>256-bit bank-grade encryption</span>
          <span className="font-mono">Razorpay Escrow SDK v2</span>
        </div>
      </div>
    </div>
  );
}


