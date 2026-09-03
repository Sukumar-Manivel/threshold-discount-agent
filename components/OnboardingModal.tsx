'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  ShieldCheck,
  Zap,
  Users,
  Cpu,
  Building2,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [currentScreen, setCurrentScreen] = useState(1);

  // Reset to screen 1 when reopened
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#0E1420] border border-[#1E293B] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E293B] bg-[#111827]/50">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Quick Orientation Guide
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Step indicator dots */}
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    step === currentScreen
                      ? 'w-6 bg-blue-500'
                      : step < currentScreen
                      ? 'w-2 bg-emerald-500/70'
                      : 'w-2 bg-slate-700'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleComplete}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800/60 transition"
              title="Skip orientation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: 4 Screens */}
        <div className="px-6 py-6 min-h-[260px] flex flex-col justify-center">
          {/* ======================================================== */}
          {/* SCREEN 1: The Problem */}
          {/* ======================================================== */}
          {currentScreen === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-rose-400" /> Step 1 of 4 — The Problem
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight leading-snug">
                The Retail Deadweight Loss
              </h3>
              <div className="bg-[#151E2E] border border-[#1E293B] p-4 rounded-xl">
                <p className="text-sm text-slate-200 leading-relaxed font-medium">
                  &ldquo;Ten buyers can order the same product in the same week and each still pay full retail — one order at a time. Wholesale pricing exists for that volume. Nothing at checkout ever notices.&rdquo;
                </p>
              </div>
              <p className="text-xs text-slate-400">
                Atomic purchases leave money on the table for buyers and leave volume commitments unorganized for merchants.
              </p>
            </div>
          )}

          {/* ======================================================== */}
          {/* SCREEN 2: The Idea */}
          {/* ======================================================== */}
          {currentScreen === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-950/60 border border-blue-800/60 text-blue-300 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Step 2 of 4 — The Idea
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight leading-snug">
                Autonomous Escrow Demand Aggregation
              </h3>
              <div className="bg-[#151E2E] border border-[#1E293B] p-4 rounded-xl">
                <p className="text-sm text-slate-200 leading-relaxed font-medium">
                  &ldquo;This agent authorizes each buyer&apos;s payment, holds a short window, and captures everyone at the best discount tier the group actually earns together — automatically.&rdquo;
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                <div className="bg-[#090D16] p-2.5 rounded-lg border border-[#1E293B] flex items-center gap-2">
                  <span className="text-blue-400 font-bold">🔒 Escrow Hold</span>
                  <span>Zero permanent debits upfront</span>
                </div>
                <div className="bg-[#090D16] p-2.5 rounded-lg border border-[#1E293B] flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">💸 Auto Refund</span>
                  <span>Direct price equalization</span>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SCREEN 3: What You're About to Watch */}
          {/* ======================================================== */}
          {currentScreen === 3 && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Step 3 of 4 — What You&apos;re About to Watch
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                The 3-Panel Operational Command Center
              </h3>
              <div className="space-y-2 text-xs">
                {/* Left */}
                <div className="bg-[#151E2E] border border-blue-900/40 p-2.5 rounded-xl flex items-start gap-2.5">
                  <div className="p-1 rounded bg-blue-950 text-blue-400 border border-blue-800/50 mt-0.5 shrink-0">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-blue-300">Left Panel (Buyer Simulation):</span>{' '}
                    <span className="text-slate-300">
                      Four different buyers, including an AI agent that buys autonomously.
                    </span>
                  </div>
                </div>
                {/* Center */}
                <div className="bg-[#151E2E] border border-indigo-900/40 p-2.5 rounded-xl flex items-start gap-2.5">
                  <div className="p-1 rounded bg-indigo-950 text-indigo-400 border border-indigo-800/50 mt-0.5 shrink-0">
                    <Cpu className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-indigo-300">Center Panel (Decision Engine):</span>{' '}
                    <span className="text-slate-300">
                      The decision engine — live counter, timer, and a full audit trail of every choice it makes.
                    </span>
                  </div>
                </div>
                {/* Right */}
                <div className="bg-[#151E2E] border border-emerald-900/40 p-2.5 rounded-xl flex items-start gap-2.5">
                  <div className="p-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50 mt-0.5 shrink-0">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-emerald-300">Right Panel (Seller Dashboard):</span>{' '}
                    <span className="text-slate-300">
                      The seller&apos;s payout once the group deal closes.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SCREEN 4: CTA */}
          {/* ======================================================== */}
          {currentScreen === 4 && (
            <div className="space-y-4 text-center py-2 animate-in fade-in duration-200">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  Ready? Watch it happen.
                </h3>
                <p className="text-xs text-slate-300 max-w-sm mx-auto mt-2">
                  Place an order, trigger an AI targeted nudge, or simulate volume to see wholesale settlement execute in real time.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleComplete}
                  className="w-full py-3 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2"
                >
                  <span>Launch Live Run</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer Navigation */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#1E293B] bg-[#111827]/60">
          <div>
            {currentScreen > 1 ? (
              <button
                onClick={handleBack}
                className="text-xs text-slate-400 hover:text-slate-200 font-medium flex items-center gap-1.5 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="text-xs text-slate-500 hover:text-slate-300 font-medium transition"
              >
                Skip intro
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-mono">
              {currentScreen} of {totalScreens}
            </span>

            {currentScreen < totalScreens && (
              <button
                onClick={handleNext}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition"
              >
                Next <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
