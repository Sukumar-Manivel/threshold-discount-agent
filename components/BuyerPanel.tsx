'use client';

import React, { useState, useRef } from 'react';
import {
  Smartphone,
  Search,
  ShoppingCart,
  CheckCircle2,
  Bell,
  Sparkles,
  Check,
  Wifi,
  Battery,
  Flame,
  Loader2,
  Brain,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { AppState } from '@/lib/store';
import { PRODUCT_CATALOG } from '@/lib/constants';

interface BuyerPanelProps {
  state: AppState;
  onOpenPaymentModal: (buyerId: 'phoneA' | 'phoneB' | 'phoneC' | 'phoneD', buyerName: string, amount: number, isDiscounted?: boolean) => void;
  onSetPhoneDWatching: (prompt: string) => void;
  onForceTriggerCoupon?: () => void;
}

export default function BuyerPanel({
  state,
  onOpenPaymentModal,
  onSetPhoneDWatching,
  onForceTriggerCoupon,
}: BuyerPanelProps) {
  const { phoneStates, windowClosed, activeProduct } = state;
  const product = activeProduct;

  // Local UI states for Phone C and Phone D inputs
  const [phoneCPrompt, setPhoneCPrompt] = useState(`buy ${product.name}`);
  const [phoneDPrompt, setPhoneDPrompt] = useState('buy this for me only if the price drops, ask before you pay');
  const [phoneCParsing, setPhoneCParsing] = useState(false);
  const [phoneCParseResult, setPhoneCParseResult] = useState<{
    matchedSkuId: string | null;
    maxPrice: number | null;
    confidence: number;
    reasoning: string;
    modelUsed: string;
  } | null>(state.lastParseResult || null);

  const formatPrice = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedPhone, setSelectedPhone] = useState<'A' | 'B' | 'C' | 'D'>('A');

  const scrollToPhone = (key: 'A' | 'B' | 'C' | 'D') => {
    setSelectedPhone(key);
    const el = document.getElementById(`phone-viewport-${key}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }
  };

  const handleScrollPrev = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -280, behavior: 'smooth' });
    }
  };

  const handleScrollNext = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 280, behavior: 'smooth' });
    }
  };

  const handleParseWithAI = async () => {
    setPhoneCParsing(true);
    setPhoneCParseResult(null);
    try {
      const res = await fetch('/api/parse-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: phoneCPrompt,
          availableSkus: PRODUCT_CATALOG.map((p) => ({
            id: p.id,
            name: p.name,
            retailPrice: p.retailPrice,
            category: p.category,
          })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPhoneCParseResult(data);
      } else {
        setPhoneCParseResult({
          matchedSkuId: null,
          maxPrice: null,
          confidence: 0,
          reasoning: 'LLM request failed — OpenRouter key may not be set. Falling back to direct match.',
          modelUsed: 'fallback',
        });
      }
    } catch (err) {
      setPhoneCParseResult({
        matchedSkuId: null,
        maxPrice: null,
        confidence: 0,
        reasoning: 'Network error — falling back to direct match.',
        modelUsed: 'fallback',
      });
    } finally {
      setPhoneCParsing(false);
    }
  };

  return (
    <div className="bg-[#0E1420] border border-[#1E293B] rounded-xl p-3.5 flex flex-col h-full shadow-lg">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1E293B] mb-3">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-blue-400" />
          <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Panel 1 — Buyer Viewports (Multi-Agent Mockups)
          </h2>
        </div>
        <span className="text-[10px] text-slate-300 bg-[#151E2E] border border-[#1E293B] px-2 py-0.5 rounded font-mono">
          Live SKU: {product.sku}
        </span>
      </div>

      {/* Phone Quick-Switch Navigation Bar */}
      <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-[#1E293B]/70 mb-2">
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => scrollToPhone('A')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition whitespace-nowrap ${
              selectedPhone === 'A'
                ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                : 'bg-[#151E2E] text-slate-400 border border-[#1E293B] hover:text-slate-200'
            }`}
          >
            📱 Phone A
          </button>
          <button
            type="button"
            onClick={() => scrollToPhone('B')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition whitespace-nowrap ${
              selectedPhone === 'B'
                ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                : 'bg-[#151E2E] text-slate-400 border border-[#1E293B] hover:text-slate-200'
            }`}
          >
            📱 Phone B
          </button>
          <button
            type="button"
            onClick={() => scrollToPhone('C')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition whitespace-nowrap ${
              selectedPhone === 'C'
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
                : 'bg-[#151E2E] text-slate-400 border border-[#1E293B] hover:text-slate-200'
            }`}
          >
            🧠 Phone C (AI)
          </button>
          <button
            type="button"
            onClick={() => scrollToPhone('D')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition whitespace-nowrap ${
              selectedPhone === 'D'
                ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50'
                : 'bg-[#151E2E] text-slate-400 border border-[#1E293B] hover:text-slate-200'
            }`}
          >
            🤖 Phone D (Auto)
          </button>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleScrollPrev}
            className="p-1 bg-[#151E2E] hover:bg-[#1E293B] border border-[#1E293B] rounded text-slate-400 hover:text-slate-200 transition"
            title="Scroll left"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleScrollNext}
            className="p-1 bg-[#151E2E] hover:bg-[#1E293B] border border-[#1E293B] rounded text-slate-400 hover:text-slate-200 transition"
            title="Scroll right"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Horizontal Scroll of Phone Viewports */}
      <div ref={scrollContainerRef} className="flex-1 overflow-x-auto pb-2 px-1 scroll-smooth snap-x snap-mandatory custom-scrollbar">
        <div className="flex gap-3.5 min-w-max pb-1">
          {/* ======================================================== */}
          {/* PHONE A: Manual Buyer #1 */}
          {/* ======================================================== */}
          <div id="phone-viewport-A" className="w-[260px] snap-start shrink-0 bg-[#090D16] border-2 border-[#1E293B] rounded-[30px] p-2.5 flex flex-col shadow-xl relative">
            {/* iOS Status Bar */}
            <div className="flex justify-between items-center px-3 pt-1 pb-2 text-[10px] text-slate-400 font-medium">
              <span>9:41</span>
              <div className="w-14 h-3 bg-[#151E2E] rounded-full mx-auto" />
              <div className="flex items-center gap-1 text-[10px]">
                <Wifi className="w-2.5 h-2.5" />
                <Battery className="w-3 h-3" />
              </div>
            </div>

            {/* Buyer Badge */}
            <div className="bg-[#151E2E] px-2.5 py-1 rounded-lg text-center mb-2.5 border border-[#1E293B]">
              <span className="text-[11px] font-bold text-blue-300 block">Phone A</span>
              <span className="text-[10px] text-slate-400">Manual Buyer #1 (Searcher)</span>
            </div>

            {/* Phone Screen Body */}
            <div className="flex-1 bg-[#101726] rounded-2xl p-2.5 border border-[#1E293B] flex flex-col justify-between space-y-2.5">
              <div className="space-y-2">
                {/* Product Card */}
                <div className="bg-[#151E2E] p-2 rounded-xl border border-[#1E293B]">
                  <div className="h-20 bg-[#090D16] rounded-lg flex items-center justify-center mb-2 overflow-hidden relative">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover opacity-90 hover:scale-105 transition duration-300"
                    />
                    <span className="absolute top-1 right-1 text-[9px] bg-slate-900/90 text-slate-300 px-1.5 py-0.5 rounded font-medium border border-slate-700">
                      {product.category}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-100 line-clamp-1">{product.name}</h4>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[10px] text-slate-400">Retail Price</span>
                    <span className="text-xs font-bold text-slate-100">{formatPrice(product.retailPrice)}</span>
                  </div>
                </div>

                {/* Targeted Nudge Coupon */}
                {phoneStates.phoneA.couponReceived && !phoneStates.phoneA.ordered && (
                  <div className="bg-emerald-950/40 border border-emerald-700/60 p-2.5 rounded-xl space-y-1.5 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] bg-emerald-900/60 text-emerald-300 font-bold px-1.5 py-0.5 rounded border border-emerald-700/50 flex items-center gap-1">
                        <Flame className="w-3 h-3 text-amber-400" /> GROUP DEAL UNLOCKED
                      </span>
                      <span className="text-[10px] text-emerald-300 font-bold font-mono">
                        {phoneStates.phoneA.couponDetails?.discountPct}% OFF
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-tight">
                      High group volume detected! Special rate unlocked for recent searchers.
                    </p>
                    <div className="flex justify-between items-center text-[10px] pt-0.5">
                      <span className="text-slate-400 line-through">{formatPrice(product.retailPrice)}</span>
                      <span className="font-bold text-emerald-300">
                        {formatPrice(phoneStates.phoneA.couponDetails?.discountedPrice || product.retailPrice)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Notifications */}
                {phoneStates.phoneA.notification && (
                  <div className="bg-[#151E2E] border border-blue-800/60 p-2 rounded-xl text-[10px] text-slate-200 flex items-start gap-1.5 animate-in fade-in">
                    <Bell className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span>{phoneStates.phoneA.notification}</span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              {phoneStates.phoneA.ordered ? (
                <div className="bg-emerald-950/50 border border-emerald-800/60 p-2 rounded-xl text-center">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Escrow Authorized
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Funds safely reserved
                  </span>
                </div>
              ) : phoneStates.phoneA.couponReceived ? (
                <button
                  onClick={() =>
                    onOpenPaymentModal(
                      'phoneA',
                      'Manual Buyer #1',
                      phoneStates.phoneA.couponDetails?.discountedPrice || product.retailPrice,
                      true
                    )
                  }
                  disabled={windowClosed}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition"
                >
                  <ShoppingCart className="w-3.5 h-3.5" /> Buy @ {formatPrice(phoneStates.phoneA.couponDetails?.discountedPrice || product.retailPrice)}
                </button>
              ) : (
                <button
                  onClick={() =>
                    onOpenPaymentModal('phoneA', 'Manual Buyer #1', product.retailPrice)
                  }
                  disabled={windowClosed}
                  className="w-full py-2 bg-[#0C66E4] hover:bg-blue-600 disabled:opacity-40 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition"
                >
                  <ShoppingCart className="w-3.5 h-3.5" /> Buy Now ({formatPrice(product.retailPrice)})
                </button>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* PHONE B: Manual Buyer #2 */}
          {/* ======================================================== */}
          <div id="phone-viewport-B" className="w-[260px] snap-start shrink-0 bg-[#090D16] border-2 border-[#1E293B] rounded-[30px] p-2.5 flex flex-col shadow-xl relative">
            <div className="flex justify-between items-center px-3 pt-1 pb-2 text-[10px] text-slate-400 font-medium">
              <span>9:41</span>
              <div className="w-14 h-3 bg-[#151E2E] rounded-full mx-auto" />
              <div className="flex items-center gap-1 text-[10px]">
                <Wifi className="w-2.5 h-2.5" />
                <Battery className="w-3 h-3" />
              </div>
            </div>

            <div className="bg-[#151E2E] px-2.5 py-1 rounded-lg text-center mb-2.5 border border-[#1E293B]">
              <span className="text-[11px] font-bold text-blue-300 block">Phone B</span>
              <span className="text-[10px] text-slate-400">Manual Buyer #2 (Searcher)</span>
            </div>

            <div className="flex-1 bg-[#101726] rounded-2xl p-2.5 border border-[#1E293B] flex flex-col justify-between space-y-2.5">
              <div className="space-y-2">
                <div className="bg-[#151E2E] p-2 rounded-xl border border-[#1E293B]">
                  <div className="h-20 bg-[#090D16] rounded-lg flex items-center justify-center mb-2 overflow-hidden relative">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover opacity-90 hover:scale-105 transition duration-300"
                    />
                    <span className="absolute top-1 right-1 text-[9px] bg-slate-900/90 text-slate-300 px-1.5 py-0.5 rounded font-medium border border-slate-700">
                      {product.category}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-100 line-clamp-1">{product.name}</h4>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[10px] text-slate-400">Retail Price</span>
                    <span className="text-xs font-bold text-slate-100">{formatPrice(product.retailPrice)}</span>
                  </div>
                </div>

                {phoneStates.phoneB.couponReceived && !phoneStates.phoneB.ordered && (
                  <div className="bg-emerald-950/40 border border-emerald-700/60 p-2.5 rounded-xl space-y-1.5 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] bg-emerald-900/60 text-emerald-300 font-bold px-1.5 py-0.5 rounded border border-emerald-700/50 flex items-center gap-1">
                        <Flame className="w-3 h-3 text-amber-400" /> GROUP DEAL UNLOCKED
                      </span>
                      <span className="text-[10px] text-emerald-300 font-bold font-mono">
                        {phoneStates.phoneB.couponDetails?.discountPct}% OFF
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-tight">
                      High group volume detected! Special rate unlocked for recent searchers.
                    </p>
                    <div className="flex justify-between items-center text-[10px] pt-0.5">
                      <span className="text-slate-400 line-through">{formatPrice(product.retailPrice)}</span>
                      <span className="font-bold text-emerald-300">
                        {formatPrice(phoneStates.phoneB.couponDetails?.discountedPrice || product.retailPrice)}
                      </span>
                    </div>
                  </div>
                )}

                {phoneStates.phoneB.notification && (
                  <div className="bg-[#151E2E] border border-blue-800/60 p-2 rounded-xl text-[10px] text-slate-200 flex items-start gap-1.5 animate-in fade-in">
                    <Bell className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span>{phoneStates.phoneB.notification}</span>
                  </div>
                )}
              </div>

              {phoneStates.phoneB.ordered ? (
                <div className="bg-emerald-950/50 border border-emerald-800/60 p-2 rounded-xl text-center">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Escrow Authorized
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Funds safely reserved
                  </span>
                </div>
              ) : phoneStates.phoneB.couponReceived ? (
                <button
                  onClick={() =>
                    onOpenPaymentModal(
                      'phoneB',
                      'Manual Buyer #2',
                      phoneStates.phoneB.couponDetails?.discountedPrice || product.retailPrice,
                      true
                    )
                  }
                  disabled={windowClosed}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition"
                >
                  <ShoppingCart className="w-3.5 h-3.5" /> Buy @ {formatPrice(phoneStates.phoneB.couponDetails?.discountedPrice || product.retailPrice)}
                </button>
              ) : (
                <button
                  onClick={() =>
                    onOpenPaymentModal('phoneB', 'Manual Buyer #2', product.retailPrice)
                  }
                  disabled={windowClosed}
                  className="w-full py-2 bg-[#0C66E4] hover:bg-blue-600 disabled:opacity-40 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition"
                >
                  <ShoppingCart className="w-3.5 h-3.5" /> Buy Now ({formatPrice(product.retailPrice)})
                </button>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* PHONE C: Prompt Agent (Immediate) */}
          {/* ======================================================== */}
          <div id="phone-viewport-C" className="w-[260px] snap-start shrink-0 bg-[#090D16] border-2 border-[#1E293B] rounded-[30px] p-2.5 flex flex-col shadow-xl relative">
            <div className="flex justify-between items-center px-3 pt-1 pb-2 text-[10px] text-slate-400 font-medium">
              <span>9:41</span>
              <div className="w-14 h-3 bg-[#151E2E] rounded-full mx-auto" />
              <div className="flex items-center gap-1 text-[10px]">
                <Wifi className="w-2.5 h-2.5" />
                <Battery className="w-3 h-3" />
              </div>
            </div>

            <div className="bg-[#151E2E] px-2.5 py-1 rounded-lg text-center mb-2.5 border border-[#1E293B]">
              <span className="text-[11px] font-bold text-sky-300 block">Phone C</span>
              <span className="text-[10px] text-slate-400">Prompt Agent (Immediate)</span>
            </div>

            <div className="flex-1 bg-[#101726] rounded-2xl p-2.5 border border-[#1E293B] flex flex-col justify-between space-y-2.5">
              <div className="space-y-2">
                <div className="bg-[#151E2E] p-2 rounded-xl border border-[#1E293B]">
                  <label className="text-[10px] text-slate-400 font-medium block mb-1">
                    Buyer Prompt Instruction
                  </label>
                  <input
                    type="text"
                    value={phoneCPrompt}
                    onChange={(e) => setPhoneCPrompt(e.target.value)}
                    className="w-full bg-[#090D16] border border-[#1E293B] rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-blue-500 mb-1.5"
                  />
                  <button
                    onClick={handleParseWithAI}
                    disabled={phoneCParsing || windowClosed}
                    className="w-full py-1.5 bg-violet-700 hover:bg-violet-600 disabled:opacity-40 text-white font-semibold text-[10px] rounded-lg flex items-center justify-center gap-1.5 transition"
                  >
                    {phoneCParsing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Parsing with LLM...
                      </>
                    ) : (
                      <>
                        <Brain className="w-3 h-3" />
                        Parse with AI (OpenRouter)
                      </>
                    )}
                  </button>
                </div>

                {/* LLM AI Reasoning Output */}
                {phoneCParseResult && (
                  <div className="bg-violet-950/30 border border-violet-700/60 p-2.5 rounded-xl space-y-1.5 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-violet-300">
                        <Brain className="w-3 h-3 text-violet-400" /> LLM Intent Parse
                      </div>
                      <span className="text-[9px] bg-violet-900/60 text-violet-200 px-1.5 py-0.5 rounded font-mono border border-violet-700/50">
                        {phoneCParseResult.modelUsed?.split('/').pop() || 'model'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-slate-400">Confidence:</span>
                      <div className="flex-1 bg-[#090D16] h-1.5 rounded-full overflow-hidden border border-[#1E293B]">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            phoneCParseResult.confidence >= 0.8 ? 'bg-emerald-500' :
                            phoneCParseResult.confidence >= 0.5 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.round(phoneCParseResult.confidence * 100)}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-slate-200">
                        {(phoneCParseResult.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-tight italic">
                      "{phoneCParseResult.reasoning}"
                    </p>
                    {phoneCParseResult.matchedSkuId && (
                      <div className="text-[10px] text-violet-200 font-medium">
                        Matched: {PRODUCT_CATALOG.find(p => p.id === phoneCParseResult.matchedSkuId)?.name || phoneCParseResult.matchedSkuId}
                      </div>
                    )}
                  </div>
                )}

                {/* Recommendation Card (shows after parse or as default) */}
                <div className="bg-[#151E2E] border border-[#1E293B] p-2.5 rounded-xl space-y-1">
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-sky-300">
                    <Sparkles className="w-3 h-3 text-sky-400" /> AI Recommendation
                  </div>
                  <p className="text-[10px] text-slate-300 leading-tight">
                    Found <strong>{product.name}</strong> at <strong>{formatPrice(product.retailPrice)}</strong>. Approving will authorize payment directly.
                  </p>
                  <span className="text-[9px] text-slate-500 block">
                    Unaware of window (participates in group refund).
                  </span>
                </div>

                {phoneStates.phoneC.notification && (
                  <div className="bg-[#151E2E] border border-blue-800/60 p-2 rounded-xl text-[10px] text-slate-200 flex items-start gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span>{phoneStates.phoneC.notification}</span>
                  </div>
                )}
              </div>

              {phoneStates.phoneC.ordered ? (
                <div className="bg-emerald-950/50 border border-emerald-800/60 p-2 rounded-xl text-center">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approved & Authorized
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {formatPrice(product.retailPrice)} Retail Hold
                  </span>
                </div>
              ) : (
                <button
                  onClick={() =>
                    onOpenPaymentModal('phoneC', 'Prompt Agent (Phone C)', product.retailPrice)
                  }
                  disabled={windowClosed}
                  className="w-full py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition"
                >
                  <Check className="w-3.5 h-3.5" /> Authorize Order ({formatPrice(product.retailPrice)})
                </button>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* PHONE D: Standing-Order Agent (Waits for Price Drop) */}
          {/* ======================================================== */}
          <div id="phone-viewport-D" className="w-[260px] snap-start shrink-0 bg-[#090D16] border-2 border-amber-900/60 rounded-[30px] p-2.5 flex flex-col shadow-xl relative">
            <div className="flex justify-between items-center px-3 pt-1 pb-2 text-[10px] text-slate-400 font-medium">
              <span>9:41</span>
              <div className="w-14 h-3 bg-[#151E2E] rounded-full mx-auto" />
              <div className="flex items-center gap-1 text-[10px]">
                <Wifi className="w-2.5 h-2.5" />
                <Battery className="w-3 h-3" />
              </div>
            </div>

            <div className="bg-amber-950/40 border border-amber-800/50 px-2.5 py-1 rounded-lg text-center mb-2.5">
              <span className="text-[11px] font-bold text-amber-300 block">Phone D</span>
              <span className="text-[10px] text-amber-200/80">Standing-Order Agent (Nudged)</span>
            </div>

            <div className="flex-1 bg-[#101726] rounded-2xl p-2.5 border border-[#1E293B] flex flex-col justify-between space-y-2.5">
              <div className="space-y-2">
                {!phoneStates.phoneD.isWatching && !phoneStates.phoneD.ordered && (
                  <div className="bg-[#151E2E] p-2 rounded-xl border border-[#1E293B]">
                    <label className="text-[10px] text-slate-400 font-medium block mb-1">
                      Standing Order Command
                    </label>
                    <input
                      type="text"
                      value={phoneDPrompt}
                      onChange={(e) => setPhoneDPrompt(e.target.value)}
                      className="w-full bg-[#090D16] border border-[#1E293B] rounded-lg px-2 py-1 text-[10px] text-slate-200 mb-2 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      onClick={() => onSetPhoneDWatching(phoneDPrompt)}
                      className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[11px] rounded-lg transition"
                    >
                      Activate Watcher Agent
                    </button>
                  </div>
                )}

                {phoneStates.phoneD.isWatching && !phoneStates.phoneD.couponReceived && !phoneStates.phoneD.ordered && (
                  <div className="bg-amber-950/30 border border-amber-800/50 p-3 rounded-xl text-center space-y-1.5">
                    <div className="w-7 h-7 rounded-full bg-amber-900/50 text-amber-300 flex items-center justify-center mx-auto">
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    </div>
                    <span className="text-[11px] font-bold text-amber-300 block">
                      Monitoring Aggregation Volume
                    </span>
                    <p className="text-[10px] text-slate-300">
                      Standing order active for {product.name}. Will trigger when group threshold is reachable.
                    </p>
                    {onForceTriggerCoupon && (
                      <button
                        onClick={onForceTriggerCoupon}
                        className="w-full py-1 bg-amber-900/40 hover:bg-amber-800/60 text-amber-200 border border-amber-700/50 text-[10px] font-medium rounded-lg transition mt-1"
                      >
                        ⚡ Trigger Threshold Check Now
                      </button>
                    )}
                  </div>
                )}

                {phoneStates.phoneD.couponReceived && !phoneStates.phoneD.ordered && (
                  <div className="bg-amber-950/40 border border-amber-600/70 p-2.5 rounded-xl space-y-1.5 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] bg-amber-900/60 text-amber-300 font-bold px-1.5 py-0.5 rounded border border-amber-700/50 flex items-center gap-1">
                        <Flame className="w-3 h-3" /> THRESHOLD NUDGE
                      </span>
                      <span className="text-[10px] text-amber-300 font-mono font-bold">
                        {phoneStates.phoneD.couponDetails?.expiresSeconds}s remaining
                      </span>
                    </div>

                    <p className="text-[11px] font-semibold text-slate-100 leading-tight">
                      Price dropped to unlock {phoneStates.phoneD.couponDetails?.discountPct}% OFF group tier!
                    </p>

                    <div className="bg-[#090D16] p-1.5 rounded-lg border border-[#1E293B] flex justify-between items-center text-[11px]">
                      <span className="text-slate-400 line-through">{formatPrice(product.retailPrice)}</span>
                      <span className="font-bold text-emerald-300 text-xs">
                        {formatPrice(phoneStates.phoneD.couponDetails?.discountedPrice || product.retailPrice)}
                      </span>
                    </div>
                  </div>
                )}

                {phoneStates.phoneD.notification && (
                  <div className="bg-[#151E2E] border border-blue-800/60 p-2 rounded-xl text-[10px] text-slate-200 flex items-start gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span>{phoneStates.phoneD.notification}</span>
                  </div>
                )}
              </div>

              {phoneStates.phoneD.ordered ? (
                <div className="bg-emerald-950/50 border border-emerald-800/60 p-2 rounded-xl text-center">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Standing Order Executed
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Authorized @ {formatPrice(phoneStates.phoneD.couponDetails?.discountedPrice || product.retailPrice)}
                  </span>
                </div>
              ) : phoneStates.phoneD.couponReceived ? (
                <button
                  onClick={() =>
                    onOpenPaymentModal(
                      'phoneD',
                      'Standing-Order Agent (Phone D)',
                      phoneStates.phoneD.couponDetails?.discountedPrice || product.retailPrice,
                      true
                    )
                  }
                  disabled={windowClosed}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition"
                >
                  <Check className="w-3.5 h-3.5" /> Approve & Authorize
                </button>
              ) : null}
            </div>
          </div>

          {/* ======================================================== */}
          {/* PHONE E: Control Viewport (Unrelated SKU) */}
          {/* ======================================================== */}
          <div className="w-[260px] bg-[#090D16] border-2 border-[#1E293B]/70 rounded-[30px] p-2.5 flex flex-col shadow-md opacity-75">
            <div className="flex justify-between items-center px-3 pt-1 pb-2 text-[10px] text-slate-400 font-medium">
              <span>9:41</span>
              <div className="w-14 h-3 bg-[#151E2E] rounded-full mx-auto" />
              <div className="flex items-center gap-1 text-[10px]">
                <Wifi className="w-2.5 h-2.5" />
                <Battery className="w-3 h-3" />
              </div>
            </div>

            <div className="bg-[#151E2E] px-2.5 py-1 rounded-lg text-center mb-2.5 border border-[#1E293B]">
              <span className="text-[11px] font-bold text-slate-400 block">Phone E</span>
              <span className="text-[10px] text-slate-500">Control Buyer (Other Product)</span>
            </div>

            <div className="flex-1 bg-[#101726] rounded-2xl p-2.5 border border-[#1E293B] flex flex-col justify-between space-y-2">
              <div className="space-y-2">
                <div className="bg-[#151E2E] p-2 rounded-xl border border-[#1E293B] flex items-center gap-1.5 text-xs text-slate-400">
                  <Search className="w-3 h-3" />
                  <span>Searching: "AirPods Max"</span>
                </div>
                <div className="bg-[#151E2E] p-2.5 rounded-xl border border-[#1E293B] text-[11px] space-y-1">
                  <span className="font-semibold text-slate-300 block">AirPods Max — ₹59,900</span>
                  <span className="text-[10px] text-slate-400 block">
                    No nudge targeted (Proves algorithm is strictly SKU-bounded).
                  </span>
                </div>
              </div>
              <div className="p-2 bg-[#151E2E] border border-[#1E293B] rounded-xl text-[10px] text-slate-400 text-center">
                Uninvolved Control Buyer
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
