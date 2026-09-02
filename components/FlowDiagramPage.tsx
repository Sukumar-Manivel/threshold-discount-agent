'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Bot,
  Zap,
  Building2,
  RotateCcw,
  Sparkles,
  Play,
  Pause,
  RotateCw,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface FlowDiagramPageProps {
  onSwitchToDemo?: () => void;
}

export default function FlowDiagramPage({ onSwitchToDemo }: FlowDiagramPageProps) {
  const [activeStep, setActiveStep] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);

  // Auto-play phase switching loop (3.5 seconds per phase)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setInterval(() => {
        setActiveStep((prev) => (prev >= 5 ? 1 : prev + 1));
      }, 3500);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  const workflowPhases = [
    {
      step: 1,
      title: 'Phase 1: Escrow Stocking & Independent Orders',
      actor: 'Buyer 1 (Manual) & Buyer 2 (Prompt Agent)',
      color: '#0C66E4',
      summary: 'Members order the same SKU asynchronously. Payments are authorized and held in Razorpay Escrow.',
      details:
        'Buyer 1 (Human) and Buyer 2 (AI Prompt Agent) place orders. Both payments are safely held in Razorpay Escrow (Manual Capture hold), without immediately charging the card permanently.',
      badge: 'Escrow Volume: 2 Orders Locked',
    },
    {
      step: 2,
      title: 'Phase 2: Decision Engine Demand Analytics',
      actor: 'Razorpay Agent Stack Decision Engine',
      color: '#3B82F6',
      summary: 'Decision Engine analyzes volume: 2 buyers locked, gap to unlock 10% wholesale threshold detected.',
      details:
        'The Decision Engine on Razorpay Stack computes the marginal unit economics. It discovers that accumulating orders triggers tiered wholesale rates with the merchant, unlocking 10% OFF for the entire group.',
      badge: 'Target: 10% Wholesale Tier',
    },
    {
      step: 3,
      title: 'Phase 3: Targeted Nudge to High-Intent Searchers',
      actor: 'High-Intent Nudge Trigger Engine',
      color: '#F59E0B',
      summary: 'Dynamic Nudge triggered to Standing-Order Agents and recent searchers to close the volume gap.',
      details:
        'To reach wholesale scale before the countdown window closes, the Decision Engine emits dynamic in-app/push alerts to standing order agents and recent high-intent catalog searchers with upfront projected discounts.',
      badge: 'Offer Code: GROUP-UNLOCKED',
    },
    {
      step: 4,
      title: 'Phase 4: Aggregation Window Close & Wholesale Settlement',
      actor: 'Razorpay Route Merchant Settlement',
      color: '#10B981',
      summary: 'Window closes. Bulk purchase dispatched to Seller with wholesale discount deducted via Razorpay Route.',
      details:
        'Upon countdown timer expiry, the Decision Engine locks the final wholesale discount rate, dispatches the aggregated purchase order to the merchant, and routes net funds using the Razorpay Route API.',
      badge: 'Net Merchant Payout Routed',
    },
    {
      step: 5,
      title: 'Phase 5: Automated Escrow Capture & Equalized Refunds',
      actor: 'Razorpay Equalized Refund Engine',
      color: '#6366F1',
      summary: 'AI Engine calculates individual refund deltas and issues instant equalized credits to all buyers.',
      details:
        'Because early buyers authorized standard retail holds while nudged buyers authorized discounted holds, the Refund Engine executes individual price equalization refunds, ensuring every participant pays the exact lowest group price.',
      badge: 'All Buyers Equalized to Group Tier',
    },
  ];

  const nodes = [
    { id: 'b1', step: 1, name: 'Buyer 1 (Manual)', val: '₹79,900 Escrow', x: 140, y: 70, col: '#0C66E4' },
    { id: 'b2', step: 1, name: 'Buyer 2 (AI Agent)', val: '₹79,900 Escrow', x: 420, y: 70, col: '#3B82F6' },
    { id: 'b3', step: 3, name: 'Buyer 3 (Nudged)', val: '₹71,910 Escrow', x: 700, y: 70, col: '#F59E0B' },
    { id: 'offer_loop', step: 3, name: 'Threshold Nudge Engine', val: 'Targeted Unlock', x: 140, y: 220, col: '#F59E0B' },
    { id: 'razorpay_stack', step: 2, name: 'Razorpay Escrow & Decision Engine', val: 'Analyzing Marginal Unit Economics', x: 420, y: 220, col: '#0C66E4' },
    { id: 'seller', step: 4, name: 'Seller Merchant Account', val: 'Wholesale Route Transfer', x: 700, y: 220, col: '#10B981' },
    { id: 'refunds', step: 5, name: 'Razorpay Refund Engine', val: 'Price Equalization Engine', x: 420, y: 370, col: '#6366F1' },
  ];

  const links = [
    { step: 1, from: 'b1', to: 'razorpay_stack' },
    { step: 1, from: 'b2', to: 'razorpay_stack' },
    { step: 2, from: 'razorpay_stack', to: 'razorpay_stack' },
    { step: 3, from: 'razorpay_stack', to: 'offer_loop' },
    { step: 3, from: 'offer_loop', to: 'b3' },
    { step: 3, from: 'b3', to: 'razorpay_stack' },
    { step: 4, from: 'razorpay_stack', to: 'seller' },
    { step: 5, from: 'razorpay_stack', to: 'refunds' },
    { step: 5, from: 'refunds', to: 'b1' },
    { step: 5, from: 'refunds', to: 'b2' },
    { step: 5, from: 'refunds', to: 'b3' },
  ];

  const currentPhase = workflowPhases.find((p) => p.step === activeStep) || workflowPhases[0];

  const getNodePos = (id: string) => {
    const node = nodes.find((n) => n.id === id);
    return node ? { x: node.x, y: node.y } : { x: 0, y: 0 };
  };

  return (
    <div className="w-full max-w-[1300px] mx-auto p-3 sm:p-5 font-sans">
      <style>{`
        @keyframes flowSubtle { 
          0% { stroke-dashoffset: 24; } 
          100% { stroke-dashoffset: 0; } 
        }
        .flow-line-active { 
          stroke-dasharray: 6 6; 
          animation: flowSubtle 1.5s linear infinite; 
        }
        @keyframes progressFill { 
          0% { width: 0%; } 
          100% { width: 100%; } 
        }
        .phase-progress-bar { 
          animation: progressFill 3.5s linear infinite; 
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-3 border-b border-[#1E293B] pb-3.5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-blue-950 text-blue-300 border border-blue-800/60 px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-400" /> Architecture Workflow Sequence
            </span>
            {onSwitchToDemo && (
              <button
                onClick={onSwitchToDemo}
                className="text-xs text-slate-400 hover:text-slate-200 underline flex items-center gap-1 font-medium ml-2"
              >
                Back to Operations Console <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
          <h1 className="text-lg md:text-xl font-bold text-slate-100 tracking-tight">
            Razorpay Demand Aggregation System Architecture
          </h1>
          <p className="text-xs text-slate-400">
            5-Phase Escrow Authorization, Threshold Nudge Triggering, and Equalized Refund Settlement
          </p>
        </div>

        {/* Auto-Play Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border ${
              isPlaying
                ? 'bg-rose-950/60 border-rose-800 text-rose-200 hover:bg-rose-900/60'
                : 'bg-[#0C66E4] border-blue-600 text-white hover:bg-blue-600'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3 h-3" /> Pause Auto-Cycle
              </>
            ) : (
              <>
                <Play className="w-3 h-3" /> Resume Auto-Cycle
              </>
            )}
          </button>
          <button
            onClick={() => setActiveStep(1)}
            className="px-3 py-1.5 rounded-lg bg-[#151E2E] hover:bg-[#1A253A] text-slate-200 border border-[#1E293B] text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RotateCw className="w-3 h-3 text-blue-400" /> Restart
          </button>
        </div>
      </div>

      {/* 5 Phase Progress Stepper Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-5">
        {workflowPhases.map((phase) => {
          const isActive = activeStep === phase.step;
          return (
            <div
              key={phase.step}
              onClick={() => {
                setActiveStep(phase.step);
                setIsPlaying(false);
              }}
              style={{
                borderColor: isActive ? phase.color : 'rgba(30, 41, 59, 0.8)',
                backgroundColor: isActive ? '#151E2E' : '#0E1420',
              }}
              className={`relative p-2.5 rounded-xl border transition cursor-pointer overflow-hidden ${
                isActive ? 'text-white font-bold shadow-md' : 'text-slate-400 font-medium hover:bg-[#151E2E]'
              }`}
            >
              <div className="text-[9px] font-bold tracking-wider uppercase mb-0.5" style={{ color: phase.color }}>
                PHASE 0{phase.step}
              </div>
              <div className="text-xs truncate text-slate-200">{phase.title.split(':')[1]}</div>
              {isActive && isPlaying && (
                <div
                  style={{ backgroundColor: phase.color }}
                  className="absolute bottom-0 left-0 h-0.5 phase-progress-bar"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Node Canvas */}
      <div
        className="relative bg-[#090D16] border border-[#1E293B] rounded-2xl p-5 mb-5 min-h-[440px] overflow-hidden shadow-xl"
      >
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <defs>
            <marker
              id="arrow-active"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={currentPhase.color} />
            </marker>
          </defs>

          {links.map((link, idx) => {
            const p1 = getNodePos(link.from);
            const p2 = getNodePos(link.to);
            const isActive = activeStep === link.step;
            const dx = p2.x - p1.x;
            const pathStr = `M ${p1.x} ${p1.y} C ${p1.x + dx * 0.5} ${p1.y}, ${p1.x + dx * 0.5} ${p2.y}, ${p2.x} ${p2.y}`;

            return (
              <g key={idx}>
                <path
                  d={pathStr}
                  stroke={isActive ? currentPhase.color : '#1E293B'}
                  strokeWidth={isActive ? 2.5 : 1}
                  fill="none"
                  opacity={isActive ? 0.4 : 1}
                />
                {isActive && (
                  <path
                    d={pathStr}
                    className="flow-line-active"
                    stroke={currentPhase.color}
                    strokeWidth={2.5}
                    fill="none"
                    markerEnd="url(#arrow-active)"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {nodes.map((n) => {
          const isActive = n.step === activeStep;
          return (
            <div
              key={n.id}
              onClick={() => {
                setActiveStep(n.step);
                setIsPlaying(false);
              }}
              style={{
                left: n.x,
                top: n.y,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 cursor-pointer z-20 transition-all duration-150"
            >
              <div
                style={{
                  backgroundColor: isActive ? currentPhase.color : '#1E293B',
                }}
                className={`rounded-full border-2 border-[#090D16] transition-all ${
                  isActive ? 'w-4 h-4 scale-110' : 'w-3 h-3'
                }`}
              />
              <div
                style={{
                  borderColor: isActive ? currentPhase.color : '#1E293B',
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs transition-all ${
                  isActive
                    ? 'bg-[#151E2E] font-bold text-white shadow-lg scale-105'
                    : 'bg-[#0E1420] font-medium text-slate-300 hover:bg-[#151E2E]'
                }`}
              >
                <div className="text-slate-100">{n.name}</div>
                <div className="text-[10px] font-mono font-medium" style={{ color: isActive ? currentPhase.color : '#94A3B8' }}>
                  {n.val}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Phase Narrative Card */}
      <div
        style={{
          borderLeftColor: currentPhase.color,
        }}
        className="p-4 bg-[#0E1420] border-l-4 border border-[#1E293B] rounded-xl shadow-md space-y-2"
      >
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-[#1E293B] pb-2.5">
          <div className="flex items-center gap-2">
            <span
              style={{ backgroundColor: currentPhase.color }}
              className="text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
            >
              PHASE 0{activeStep} OF 5
            </span>
            <h3 className="text-sm font-bold text-slate-100">{currentPhase.title}</h3>
          </div>
          <span
            style={{
              color: currentPhase.color,
              borderColor: `${currentPhase.color}60`,
            }}
            className="px-2 py-0.5 rounded text-xs font-semibold border font-mono bg-[#151E2E] self-start sm:self-auto"
          >
            {currentPhase.badge}
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          {currentPhase.details}
        </p>
      </div>
    </div>
  );
}

