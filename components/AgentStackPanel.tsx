'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AppState } from '@/lib/store';
import {
  MAX_DISCOUNT_DEPTH,
  MAX_NOTIFICATIONS_PER_BUYER,
  MAX_WINDOW_SECONDS,
  FINAL_STRETCH_PCT,
} from '@/lib/constants';

interface AgentStackPanelProps {
  state: AppState;
}

interface AuditLogViewerProps {
  logs: string[];
}

const AuditLogViewer = React.memo(function AuditLogViewer({ logs }: AuditLogViewerProps) {
  const [filterType, setFilterType] = useState<'all' | 'escrow' | 'broadcast' | 'settle' | 'ai'>('all');
  const logContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef<boolean>(true);
  const prevLogCountRef = useRef<number>(logs.length);

  const filteredLogs = React.useMemo(() => {
    return logs.filter((log) => {
      const l = log.toLowerCase();
      if (filterType === 'escrow') return l.includes('authorized') || l.includes('escrow') || l.includes('captured');
      if (filterType === 'broadcast') return l.includes('broadcast') || l.includes('final stretch') || l.includes('coupon') || l.includes('nudge') || l.includes('tier check');
      if (filterType === 'settle') return l.includes('settlement') || l.includes('wholesale') || l.includes('refund') || l.includes('closed');
      if (filterType === 'ai') return l.includes('intent parse') || l.includes('reasoning:') || l.includes('nlp') || l.includes('natural language');
      return true;
    });
  }, [logs, filterType]);

  const handleScroll = () => {
    if (logContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
      isNearBottomRef.current = distanceFromBottom <= 50;
    }
  };

  useEffect(() => {
    // Only auto-scroll if new logs were added AND user was already near the bottom
    if (logs.length > prevLogCountRef.current) {
      prevLogCountRef.current = logs.length;
      if (isNearBottomRef.current && logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
      }
    } else {
      prevLogCountRef.current = logs.length;
    }
  }, [logs.length]);

  const handleFilterChange = (type: 'all' | 'escrow' | 'broadcast' | 'settle' | 'ai') => {
    setFilterType(type);
    isNearBottomRef.current = true;
    setTimeout(() => {
      if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
      }
    }, 50);
  };

  return (
    <div className="flex-1 flex flex-col min-h-[190px]">
      <div className="flex items-center justify-between pb-2 border-b border-hairline">
        <span className="text-xs font-semibold text-ink">
          Audit log ledger
        </span>

        <div className="flex items-center gap-1 text-xs">
          {([
            { id: 'all', label: 'All' },
            { id: 'escrow', label: 'Escrow' },
            { id: 'broadcast', label: 'Broadcast' },
            { id: 'settle', label: 'Settle' },
            { id: 'ai', label: 'AI' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleFilterChange(tab.id)}
              className={`px-2 py-0.5 rounded text-[11px] transition ${
                filterType === tab.id
                  ? 'bg-navy text-white font-medium'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={logContainerRef}
        onScroll={handleScroll}
        className="flex-1 bg-paper border border-hairline rounded-lg p-3 font-mono text-[11px] leading-relaxed overflow-y-auto space-y-1.5 mt-2 max-h-[220px] custom-scrollbar"
      >
        {filteredLogs.map((log, idx) => {
          let textColor = 'text-ink';
          if (log.toLowerCase().includes('broadcast') || log.toLowerCase().includes('final stretch') || log.toLowerCase().includes('tier check') || log.toLowerCase().includes('coupon')) {
            textColor = 'text-oxblood';
          } else if (log.toLowerCase().includes('settlement') || log.toLowerCase().includes('final') || log.toLowerCase().includes('refund')) {
            textColor = 'text-ledgergreen font-medium';
          } else if (log.toLowerCase().includes('authorized') || log.toLowerCase().includes('captured')) {
            textColor = 'text-navy';
          } else if (log.toLowerCase().includes('window closed')) {
            textColor = 'text-ink font-semibold';
          }

          return (
            <div key={idx} className={`${textColor} flex items-start gap-1.5`}>
              <span className="text-muted opacity-40 select-none">›</span>
              <span className="break-words">{log}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default function AgentStackPanel({ state }: AgentStackPanelProps) {
  const { orders, secondsRemaining, logs, windowStarted, windowClosed, targetQty } = state;

  const currentCount = orders.length;
  const progressPct = Math.min(100, Math.round((currentCount / targetQty) * 100));

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getLiveStageInfo = () => {
    if (windowClosed) {
      return {
        stage: 5,
        title: 'Stage 5: Escrow capture & price equalization',
        description: 'Group tier captured. Equalized refunds disbursed to early buyers.',
        badgeColor: 'text-ledgergreen bg-paper border-hairline',
      };
    }

    if (currentCount >= targetQty || secondsRemaining === 0) {
      return {
        stage: 4,
        title: 'Stage 4: Window close & wholesale calculation',
        description: 'Target reached or timer expired. Commencing escrow clearing.',
        badgeColor: 'text-navy bg-paper border-hairline',
      };
    }

    const hasBroadcastOccurred =
      state.finalStretchEntered ||
      state.phoneStates.phoneD.couponReceived ||
      state.phoneStates.phoneC.couponReceived ||
      logs.some((l) => l.toLowerCase().includes('broadcast') || l.toLowerCase().includes('final stretch'));

    if (hasBroadcastOccurred) {
      return {
        stage: 3,
        title: 'Stage 3: Equal-opportunity broadcast to eligible pool',
        description: 'Broadcast engine dispatched dynamic discount offer simultaneously to Standing-Order Agent & Buyer C (rule-based, no LLM).',
        badgeColor: 'text-oxblood bg-paper border-hairline',
      };
    }

    if (currentCount >= 2) {
      return {
        stage: 2,
        title: 'Stage 2: Demand aggregation & deterministic tiering',
        description: `Analyzing volume gap: ${currentCount}/${targetQty} orders locked in escrow.`,
        badgeColor: 'text-navy bg-paper border-hairline',
      };
    }

    return {
      stage: 1,
      title: 'Stage 1: Escrow authorization & independent orders',
      description: currentCount === 0
        ? 'Awaiting first order. Payments will be held in Razorpay escrow.'
        : 'First order authorized. Aggregation countdown active.',
      badgeColor: 'text-muted bg-paper border-hairline',
    };
  };

  const stageInfo = getLiveStageInfo();
  const STAGES = [
    { num: 1, label: 'Authorization' },
    { num: 2, label: 'Aggregation' },
    { num: 3, label: 'Broadcast' },
    { num: 4, label: 'Close' },
    { num: 5, label: 'Settlement' },
  ];

  return (
    <div className="bg-panel border border-hairline rounded-lg p-5 flex flex-col h-full space-y-4">
      {/* Panel Header */}
      <div className="flex items-baseline justify-between pb-3.5 border-b border-hairline">
        <div>
          <h2 className="font-serif text-lg font-semibold text-ink">
            Decision engine
          </h2>
          <p className="text-xs text-muted">Razorpay demand aggregation & escrow ledger</p>
        </div>
        <span className="text-xs font-mono text-ledgergreen bg-paper px-2 py-0.5 rounded border border-hairline">
          Escrow active
        </span>
      </div>

      {/* Stage Stepper Bar */}
      <div className="bg-paper border border-hairline rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-ink">{stageInfo.title}</span>
          <span className={`font-mono px-2 py-0.5 rounded border text-[11px] ${stageInfo.badgeColor}`}>
            Phase {stageInfo.stage}/5
          </span>
        </div>

        <div className="grid grid-cols-5 gap-1.5 pt-0.5">
          {STAGES.map((s) => {
            const isCompleted = s.num < stageInfo.stage;
            const isCurrent = s.num === stageInfo.stage;

            return (
              <div
                key={s.num}
                className={`py-1 px-1.5 rounded border text-[11px] text-center transition ${
                  isCurrent
                    ? 'bg-panel border-navy text-navy font-semibold'
                    : isCompleted
                    ? 'bg-panel border-hairline text-ledgergreen font-medium'
                    : 'bg-paper border-transparent text-muted'
                }`}
              >
                <span className="font-mono text-[10px] block opacity-70">0{s.num}</span>
                <span className="truncate block">{s.label}</span>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted leading-relaxed">
          {stageInfo.description}
        </p>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Metric 1: Group Volume Accumulator */}
        <div className="bg-paper p-3.5 rounded-lg border border-hairline flex flex-col justify-between">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted font-medium">Volume accumulator</span>
            <span className="font-mono text-muted">Target: {targetQty}</span>
          </div>

          <div className="my-2">
            <div className="font-serif text-2xl font-bold text-ink">
              {currentCount} <span className="text-sm font-sans font-normal text-muted">/ {targetQty} units</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="w-full bg-[#E5E1D8] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-navy h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted font-mono">
              <span>0</span>
              <span>Mid tier (3)</span>
              <span>Top tier (4)</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Aggregation Window Countdown Timer */}
        <div className="bg-paper p-3.5 rounded-lg border border-hairline flex flex-col justify-between">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted font-medium">Aggregation window</span>
            <span className="text-[10px] font-mono text-muted">{MAX_WINDOW_SECONDS}s demo</span>
          </div>

          <div className="my-2">
            <div
              className={`font-serif text-2xl font-bold font-mono ${
                windowClosed ? 'text-oxblood' : 'text-ledgergreen'
              }`}
            >
              {formatTimer(secondsRemaining)}
            </div>
          </div>

          <div className="text-xs text-muted">
            {windowClosed ? (
              <span className="text-oxblood font-medium">Window closed — settled</span>
            ) : windowStarted ? (
              <span className="text-ledgergreen font-medium">Escrow active — holding funds</span>
            ) : (
              <span>Opens on first buyer order</span>
            )}
          </div>
        </div>
      </div>

      {/* Safety Bounds */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-paper p-2 rounded border border-hairline">
            <span className="text-[10px] text-muted block">Max window</span>
            <span className="font-mono font-medium text-ink">{MAX_WINDOW_SECONDS}s</span>
          </div>
          <div className="bg-paper p-2 rounded border border-hairline">
            <span className="text-[10px] text-muted block">Max discount</span>
            <span className="font-mono font-medium text-ink">{Math.round(MAX_DISCOUNT_DEPTH * 100)}%</span>
          </div>
          <div className="bg-paper p-2 rounded border border-hairline">
            <span className="text-[10px] text-muted block">Min discount qty</span>
            <span className="font-mono font-medium text-ink">{state.minQtyForDiscount} units</span>
          </div>
          <div className="bg-paper p-2 rounded border border-hairline">
            <span className="text-[10px] text-muted block">Max notifs/buyer</span>
            <span className="font-mono font-medium text-ink">{MAX_NOTIFICATIONS_PER_BUYER}</span>
          </div>
        </div>

        {/* Time-gating transparent demo compression note */}
        <div className="text-[10px] font-mono text-muted text-center pt-0.5">
          Broadcast gating: final {Math.round(FINAL_STRETCH_PCT * 100)}% of window ({Math.round(MAX_WINDOW_SECONDS * FINAL_STRETCH_PCT)}s demo / ~3% & 1.5h in 48h prod)
        </div>
      </div>

      {/* Audit Log Stream (Memoized to prevent timer re-render jitter) */}
      <AuditLogViewer logs={logs} />
    </div>
  );
}


