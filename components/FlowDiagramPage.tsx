'use client';

import React, { useState, useEffect } from 'react';

interface FlowDiagramPageProps {
  onSwitchToDemo?: () => void;
}

export default function FlowDiagramPage({ onSwitchToDemo }: FlowDiagramPageProps) {
  const [activeStep, setActiveStep] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setInterval(() => {
        setActiveStep((prev) => (prev >= 5 ? 1 : prev + 1));
      }, 4000);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  const workflowPhases = [
    {
      step: 1,
      title: 'Phase 1: Escrow pre-authorization',
      actor: 'Buyer A & Buyer B (Manual)',
      color: '#24344D',
      summary: 'Buyers place orders asynchronously. Payments are authorized and held in Razorpay escrow.',
      details:
        'Buyer A and Buyer B place orders independently at standard retail (₹79,900 each). Payments are held in Razorpay Escrow (pre-authorization holds) without immediate capture, starting the demand aggregation countdown.',
      badge: 'Escrow: 2 of 4 units',
      activeNodeIds: ['b1', 'b2', 'razorpay_stack'],
      activeLinkKeys: ['b1-razorpay_stack', 'b2-razorpay_stack'],
    },
    {
      step: 2,
      title: 'Phase 2: Demand aggregation & threshold check',
      actor: 'Decision Engine & Volume Accumulator',
      color: '#24344D',
      summary: 'Engine detects 2 units locked and computes dynamic 6.5% mid-tier discount via linear interpolation.',
      details:
        'With 2 orders locked in escrow, the Decision Engine deterministically calculates the 3-unit mid-tier discount (3% + (3-2)/(4-2) × (10%-3%) = 6.5% off, saving ₹5,193 per unit). It signals the LLM targeting engine to evaluate active candidate sessions.',
      badge: 'Target: 4 units (mid tier: 3 units / 6.5%)',
      activeNodeIds: ['razorpay_stack', 'offer_loop'],
      activeLinkKeys: ['razorpay_stack-offer_loop'],
    },
    {
      step: 3,
      title: 'Phase 3: Targeted coupon nudge',
      actor: 'LLM Targeting Engine',
      color: '#8C2F2F',
      summary: 'Targeted unlock offers dispatched to Standing-Order Agent and Buyer C.',
      details:
        'The LLM targeting model evaluates candidates based on recency and search intent. It dispatches a 6.5% discount coupon (₹74,707) to Standing-Order Agent and Buyer C. Unrelated sessions (Control shopper) are strictly excluded.',
      badge: 'Nudge sent: 2 candidates',
      activeNodeIds: ['offer_loop', 'b3', 'b4', 'b5'],
      activeLinkKeys: ['offer_loop-b3', 'offer_loop-b4'],
    },
    {
      step: 4,
      title: 'Phase 4: Autonomous execution & gap',
      actor: 'Standing-Order Agent & Buyer C',
      color: '#2F6B4F',
      summary: 'Standing-Order Agent auto-executes upon price drop; Buyer C remains undecided.',
      details:
        'Standing-Order Agent’s automated rule (buy if price drops to ₹75,000 or below) is met, auto-authorizing the 3rd unit into escrow. Buyer C leaves the offer unredeemed. Total locked volume reaches 3/4 units before window expiration.',
      badge: 'Volume locked: 3 of 4 units',
      activeNodeIds: ['b3', 'razorpay_stack', 'seller'],
      activeLinkKeys: ['b3-razorpay_stack', 'razorpay_stack-seller'],
    },
    {
      step: 5,
      title: 'Phase 5: Escrow capture & price equalization',
      actor: 'Razorpay Route & Refund Engine',
      color: '#2F6B4F',
      summary: 'Dynamic 3-unit tier (6.5% off) applied. Equalized refunds issued instantly.',
      details:
        'Aggregation window closes. The dynamic tier for 3 units (6.5% off, ₹74,707/unit) is finalized. Razorpay captures escrow for all 3 buyers, instantly credits ₹5,193 equalized refunds to Buyer A & B, and routes net wholesale payout (₹2,24,121) to the seller.',
      badge: 'Settlement: ₹2,24,121 net payout',
      activeNodeIds: ['razorpay_stack', 'refunds', 'b1', 'b2', 'seller'],
      activeLinkKeys: ['razorpay_stack-refunds', 'refunds-b1', 'refunds-b2', 'razorpay_stack-seller'],
    },
  ];

  // 5 Participants matching Buyer Ledger + 4 System Engine Nodes
  const nodes = [
    // Top Row: 5 Participants
    { id: 'b1', name: 'Buyer A (Manual)', val: '₹79,900 Escrow', sub: 'Early buyer', x: 75, y: 55, type: 'buyer' },
    { id: 'b2', name: 'Buyer B (Manual)', val: '₹79,900 Escrow', sub: 'Early buyer', x: 225, y: 55, type: 'buyer' },
    { id: 'b3', name: 'Standing-Order Agent', val: 'Auto-orders @ ≤ ₹75k', sub: 'Autonomous trigger', x: 385, y: 55, type: 'agent' },
    { id: 'b4', name: 'Buyer C (Manual)', val: 'Nudged (6.5% offer)', sub: 'Deliberate gap', x: 545, y: 55, type: 'candidate' },
    { id: 'b5', name: 'Control Shopper', val: 'No offer sent', sub: 'Unrelated search', x: 695, y: 55, type: 'control' },

    // Middle Row: Processing Engines
    { id: 'razorpay_stack', name: 'Decision Engine & Escrow', val: 'Razorpay Escrow Hold', sub: 'Volume: 3/4 units', x: 225, y: 195, type: 'engine' },
    { id: 'offer_loop', name: 'LLM Targeting Nudge', val: 'OpenRouter Model Cascade', sub: 'Bounded candidate pool', x: 465, y: 195, type: 'nudge' },
    { id: 'seller', name: 'Seller Merchant Account', val: 'Wholesale Settlement', sub: '₹2,24,121 Net payout', x: 695, y: 195, type: 'seller' },

    // Bottom Row: Settlement & Equalization
    { id: 'refunds', name: 'Price Equalization Engine', val: 'Instant Delta Refunds', sub: '₹5,193 credit to early buyers', x: 225, y: 335, type: 'refund' },
  ];

  // Orthogonal connection definitions
  const links = [
    { key: 'b1-razorpay_stack', from: 'b1', to: 'razorpay_stack', label: 'Auth hold (₹79.9k)' },
    { key: 'b2-razorpay_stack', from: 'b2', to: 'razorpay_stack', label: 'Auth hold (₹79.9k)' },
    { key: 'razorpay_stack-offer_loop', from: 'razorpay_stack', to: 'offer_loop', label: 'Threshold trigger' },
    { key: 'offer_loop-b3', from: 'offer_loop', to: 'b3', label: '6.5% unlock coupon' },
    { key: 'offer_loop-b4', from: 'offer_loop', to: 'b4', label: '6.5% unlock coupon' },
    { key: 'b3-razorpay_stack', from: 'b3', to: 'razorpay_stack', label: 'Auto-order (3rd unit)' },
    { key: 'razorpay_stack-seller', from: 'razorpay_stack', to: 'seller', label: 'Wholesale payout' },
    { key: 'razorpay_stack-refunds', from: 'razorpay_stack', to: 'refunds', label: 'Escrow equalization' },
    { key: 'refunds-b1', from: 'refunds', to: 'b1', label: '₹4,794 refund' },
    { key: 'refunds-b2', from: 'refunds', to: 'b2', label: '₹4,794 refund' },
  ];

  const currentPhase = workflowPhases.find((p) => p.step === activeStep) || workflowPhases[0];

  const getNodePos = (id: string) => {
    const node = nodes.find((n) => n.id === id);
    return node ? { x: node.x, y: node.y } : { x: 0, y: 0 };
  };

  // Generate orthogonal (right-angle) SVG path between two points
  const generateOrthogonalPath = (fromId: string, toId: string) => {
    const p1 = getNodePos(fromId);
    const p2 = getNodePos(toId);

    // If perfectly aligned vertically or horizontally
    if (p1.x === p2.x) {
      return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
    }
    if (p1.y === p2.y) {
      return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
    }

    // Direct custom routing for clean ledger aesthetic
    if (fromId === 'refunds' && (toId === 'b1' || toId === 'b2')) {
      const sweepX = toId === 'b1' ? 75 : 150;
      return `M ${p1.x} ${p1.y} L ${sweepX} ${p1.y} L ${sweepX} ${p2.y + 25} L ${p2.x} ${p2.y + 25}`;
    }

    if (fromId === 'b3' && toId === 'razorpay_stack') {
      return `M ${p1.x} ${p1.y + 25} L ${p1.x} 145 L ${p2.x + 40} 145 L ${p2.x + 40} ${p2.y}`;
    }

    if (fromId === 'offer_loop' && (toId === 'b3' || toId === 'b4')) {
      return `M ${p1.x} ${p1.y - 25} L ${p1.x} 125 L ${p2.x} 125 L ${p2.x} ${p2.y + 25}`;
    }

    const midY = Math.round((p1.y + p2.y) / 2);
    return `M ${p1.x} ${p1.y} L ${p1.x} ${midY} L ${p2.x} ${midY} L ${p2.x} ${p2.y}`;
  };

  return (
    <div className="w-full max-w-[1340px] mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-hairline pb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-muted bg-paper px-2 py-0.5 rounded border border-hairline">
              Sequence architecture
            </span>
            {onSwitchToDemo && (
              <button
                type="button"
                onClick={onSwitchToDemo}
                className="text-xs text-navy hover:underline ml-2"
              >
                ← Back to operations console
              </button>
            )}
          </div>
          <h1 className="font-serif text-2xl font-bold text-ink tracking-tight">
            Demand aggregation system architecture
          </h1>
          <p className="text-xs text-muted">
            5-phase escrow authorization, targeted nudge execution, and equalized refund settlement
          </p>
        </div>

        {/* Auto-Play Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-3 py-1.5 rounded text-xs font-medium bg-panel border border-hairline text-ink hover:bg-paper transition"
          >
            {isPlaying ? 'Pause sequence' : 'Resume sequence'}
          </button>
          <button
            type="button"
            onClick={() => setActiveStep(1)}
            className="px-3 py-1.5 rounded bg-panel border border-hairline text-xs font-medium text-muted hover:text-ink transition"
          >
            Restart
          </button>
        </div>
      </div>

      {/* 5 Phase Progress Stepper */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {workflowPhases.map((phase) => {
          const isActive = activeStep === phase.step;
          return (
            <div
              key={phase.step}
              onClick={() => {
                setActiveStep(phase.step);
                setIsPlaying(false);
              }}
              className={`p-2.5 rounded-lg border transition cursor-pointer ${
                isActive
                  ? 'bg-panel border-navy text-ink shadow-sm'
                  : 'bg-paper border-hairline text-muted hover:bg-panel'
              }`}
            >
              <div className="text-[10px] font-mono text-muted mb-0.5">
                Phase 0{phase.step}
              </div>
              <div className="text-xs font-medium text-ink truncate">
                {phase.title.split(':')[1]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Side-by-Side Main Layout: Canvas on Left, Fixed Phase Narrative Panel on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column (8 cols): Interactive SVG Diagram Canvas */}
        <div className="lg:col-span-8 bg-panel border border-hairline rounded-lg p-4 min-h-[440px] relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-center pb-2 border-b border-hairline text-xs text-muted">
            <span className="font-semibold text-ink">Interactive participant & escrow graph</span>
            <span className="font-mono text-[11px]">Active: Phase 0{activeStep}</span>
          </div>

          <div className="relative w-full h-[380px] my-1">
            {/* SVG Connector Layer */}
            <svg
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              viewBox="0 0 770 380"
              preserveAspectRatio="xMidYMid meet"
            >
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
                  <path d="M 0 1 L 8 5 L 0 9 z" fill={currentPhase.color} />
                </marker>
                <marker
                  id="arrow-dimmed"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#D5D1C8" />
                </marker>
              </defs>

              {links.map((link) => {
                const isActive = currentPhase.activeLinkKeys.includes(link.key);
                const pathStr = generateOrthogonalPath(link.from, link.to);

                return (
                  <g key={link.key} className="transition-all duration-300">
                    <path
                      d={pathStr}
                      stroke={isActive ? currentPhase.color : '#E5E1D8'}
                      strokeWidth={isActive ? 2 : 1}
                      strokeDasharray={isActive ? 'none' : '3 3'}
                      strokeOpacity={isActive ? 1 : 0.35}
                      fill="none"
                      markerEnd={isActive ? 'url(#arrow-active)' : 'url(#arrow-dimmed)'}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Nodes Layer */}
            {nodes.map((n) => {
              const isRelevantToPhase = currentPhase.activeNodeIds.includes(n.id);
              const isControl = n.id === 'b5';

              return (
                <div
                  key={n.id}
                  onClick={() => setIsPlaying(false)}
                  style={{
                    left: `${(n.x / 770) * 100}%`,
                    top: `${(n.y / 380) * 100}%`,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 transition-all duration-300 ${
                    isRelevantToPhase ? 'scale-105' : 'opacity-60'
                  }`}
                >
                  <div
                    className={`px-2.5 py-1.5 rounded-lg border text-xs text-center min-w-[115px] max-w-[140px] transition ${
                      isRelevantToPhase
                        ? 'bg-panel shadow-sm border-navy text-ink'
                        : isControl
                        ? 'bg-paper border-hairline text-muted opacity-70'
                        : 'bg-paper border-hairline text-muted'
                    }`}
                  >
                    <div className="font-medium text-ink truncate">{n.name}</div>
                    <div className="text-[10px] font-mono text-muted truncate">{n.val}</div>
                    <div className="text-[9px] text-muted opacity-80 mt-0.5 truncate">{n.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Canvas Footer Legend */}
          <div className="pt-2 border-t border-hairline flex flex-wrap justify-between items-center text-[11px] text-muted font-mono">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-navy inline-block" /> Active links
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-0.5 bg-[#D5D1C8] inline-block" /> Inactive paths (dimmed)
              </span>
            </div>
            <span>5 Participants · Razorpay Escrow · LLM Nudge</span>
          </div>
        </div>

        {/* Right Column (4 cols): Fixed Phase Narrative Panel (Visible without scrolling) */}
        <div className="lg:col-span-4 bg-panel border border-hairline rounded-lg p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-baseline justify-between pb-2.5 border-b border-hairline">
              <div>
                <span className="text-xs font-mono text-muted bg-paper px-2 py-0.5 rounded border border-hairline block w-max mb-1">
                  Phase 0{activeStep} of 5
                </span>
                <h2 className="font-serif text-lg font-semibold text-ink">
                  {currentPhase.title.split(':')[1]}
                </h2>
              </div>
            </div>

            {/* Key Actor Badge */}
            <div className="bg-paper p-3 rounded-md border border-hairline space-y-1">
              <div className="text-[10px] font-mono text-muted uppercase tracking-wider">
                Primary Actor / Subsystem
              </div>
              <div className="text-xs font-semibold text-ink">
                {currentPhase.actor}
              </div>
              <div className="text-[11px] font-mono text-ledgergreen pt-0.5">
                {currentPhase.badge}
              </div>
            </div>

            {/* Phase Executive Summary */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-ink block">
                Workflow execution
              </span>
              <p className="text-xs text-muted leading-relaxed">
                {currentPhase.summary}
              </p>
            </div>

            {/* Detailed Mechanics */}
            <div className="space-y-1.5 pt-1">
              <span className="text-xs font-semibold text-ink block">
                Escrow & settlement mechanics
              </span>
              <p className="text-xs text-muted leading-relaxed">
                {currentPhase.details}
              </p>
            </div>
          </div>

          {/* Quick Navigation Footer */}
          <div className="pt-3 border-t border-hairline flex justify-between items-center text-xs">
            <button
              type="button"
              onClick={() => {
                setActiveStep((prev) => (prev <= 1 ? 5 : prev - 1));
                setIsPlaying(false);
              }}
              className="px-2.5 py-1 rounded bg-paper border border-hairline text-ink hover:bg-[#EAE6DD] transition"
            >
              ← Previous
            </button>
            <span className="font-mono text-muted">0{activeStep} / 05</span>
            <button
              type="button"
              onClick={() => {
                setActiveStep((prev) => (prev >= 5 ? 1 : prev + 1));
                setIsPlaying(false);
              }}
              className="px-2.5 py-1 rounded bg-paper border border-hairline text-ink hover:bg-[#EAE6DD] transition"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


