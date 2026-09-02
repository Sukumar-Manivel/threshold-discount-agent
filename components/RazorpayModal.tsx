'use client';

import React, { useState } from 'react';
import { ShieldCheck, CreditCard, CheckCircle2, Lock, X, Smartphone, Building } from 'lucide-react';

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
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      const simulatedPaymentId = `pay_rzp_${Math.random().toString(36).substring(2, 10)}`;
      onSuccess(simulatedPaymentId);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#0E1420] border border-[#1E293B] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Official Razorpay Header */}
        <div className="bg-[#0C2340] px-5 py-4 border-b border-[#1E293B] flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#0C66E4] flex items-center justify-center font-bold text-white text-sm shadow">
              R
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold text-sm">
                  Razorpay Checkout
                </h3>
                <span className="bg-amber-400/20 text-amber-300 text-[9px] px-1.5 py-0.5 rounded uppercase font-mono font-bold border border-amber-400/30">
                  SANDBOX TEST
                </span>
              </div>
              <p className="text-xs text-blue-200 truncate max-w-[240px]">{skuName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Order Details */}
          <div className="bg-[#151E2E] p-3.5 rounded-xl border border-[#1E293B] flex justify-between items-center">
            <div>
              <span className="text-[11px] text-slate-400 block">Buyer Account</span>
              <span className="text-xs text-slate-200 font-semibold">{buyerName}</span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">Escrow Authorization</span>
              <span className={`text-base font-bold ${isDiscounted ? 'text-emerald-400' : 'text-slate-100'}`}>
                ₹{amount.toLocaleString('en-IN')}
              </span>
              {isDiscounted && (
                <span className="text-[9px] bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded font-medium block mt-0.5 border border-emerald-800">
                  Group Nudge Applied
                </span>
              )}
            </div>
          </div>

          <div className="text-[11px] text-slate-300 bg-[#151E2E] border border-[#1E293B] p-2.5 rounded-lg flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <span>
              <strong>Escrow Hold (Manual Capture):</strong> Funds are authorized now and held safely in Razorpay escrow until group aggregation closes.
            </span>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 block font-medium">Select Sandbox Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMethod('card')}
                className={`py-2 px-2.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition ${
                  method === 'card'
                    ? 'bg-blue-950/80 border-[#0C66E4] text-white shadow-sm'
                    : 'bg-[#151E2E] border-[#1E293B] text-slate-400 hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 text-blue-400" /> Card
              </button>
              <button
                type="button"
                onClick={() => setMethod('upi')}
                className={`py-2 px-2.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition ${
                  method === 'upi'
                    ? 'bg-blue-950/80 border-[#0C66E4] text-white shadow-sm'
                    : 'bg-[#151E2E] border-[#1E293B] text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" /> UPI / QR
              </button>
              <button
                type="button"
                onClick={() => setMethod('netbanking')}
                className={`py-2 px-2.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition ${
                  method === 'netbanking'
                    ? 'bg-blue-950/80 border-[#0C66E4] text-white shadow-sm'
                    : 'bg-[#151E2E] border-[#1E293B] text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building className="w-3.5 h-3.5 text-purple-400" /> NetBanking
              </button>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handlePay}
            disabled={processing}
            className="w-full py-2.5 bg-[#0C66E4] hover:bg-blue-600 text-white font-semibold rounded-xl text-xs shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {processing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Authorizing Escrow with Razorpay...</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Authorize ₹{amount.toLocaleString('en-IN')} Hold</span>
              </>
            )}
          </button>
        </div>

        <div className="bg-[#090D16] px-5 py-2.5 border-t border-[#1E293B] flex justify-between items-center text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> 256-bit Bank-Grade Encryption
          </span>
          <span className="font-mono">Razorpay Escrow SDK v2</span>
        </div>
      </div>
    </div>
  );
}

