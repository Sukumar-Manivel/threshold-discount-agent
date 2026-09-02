'use client';

import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import FlowDiagramPage from '@/components/FlowDiagramPage';
import { AppState } from '@/lib/store';
import { useRouter } from 'next/navigation';

export default function WorkflowPage() {
  const [state, setState] = useState<AppState | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/state')
      .then((res) => res.json())
      .then((data) => setState(data))
      .catch(console.error);
  }, []);

  if (!state) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading System Architecture Workflow...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header
        state={state}
        onReset={async () => {
          const res = await fetch('/api/reset', { method: 'POST' });
          const data = await res.json();
          setState(data.state);
        }}
        onSimOrder={async (count) => {
          const res = await fetch('/api/sim-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ count }),
          });
          const data = await res.json();
          setState(data.state);
        }}
        onFastForward={async () => {
          const res = await fetch('/api/close-window', { method: 'POST' });
          const data = await res.json();
          setState(data.state);
        }}
        onUpdateKeys={async (keyId, keySecret) => {
          const res = await fetch('/api/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update_keys', keyId, keySecret }),
          });
          const data = await res.json();
          setState(data);
        }}
        viewMode="architecture"
        onToggleViewMode={(mode) => {
          if (mode === 'demo') {
            router.push('/');
          }
        }}
      />

      <main className="flex-1 p-4 max-w-[1700px] w-full mx-auto">
        <FlowDiagramPage onSwitchToDemo={() => router.push('/')} />
      </main>
    </div>
  );
}
