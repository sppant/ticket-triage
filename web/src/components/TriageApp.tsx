'use client';

import { AlertTriangle, Inbox, RotateCw } from 'lucide-react';
import { useRef, useState } from 'react';
import { ApiError, triage, type Ticket, type TriageResult } from '@/lib/api';
import type { Example } from '@/lib/examples';
import { CATEGORY_META, PRIORITY_META, ResultCard } from './ResultCard';
import { ExampleTickets } from './ExampleTickets';
import { History, type HistoryEntry } from './History';
import { TicketForm } from './TicketForm';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

type View =
  | { kind: 'empty' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'result'; result: TriageResult; id: number | null };

const HISTORY_SIZE = 5;

function EmptyState() {
  return (
    <Card className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-text">
        <Inbox size={28} aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold">No ticket triaged yet</h3>
      <p className="mt-1 max-w-xs text-sm text-muted">
        Fill in the form and submit it, or pick one of the examples to see the category, priority
        and a draft reply.
      </p>
    </Card>
  );
}

function LoadingState() {
  return (
    <Card className="p-5 sm:p-6" aria-hidden="true">
      <div className="flex gap-2">
        <div className="skeleton h-6 w-24 rounded-full" />
        <div className="skeleton h-6 w-32 rounded-full" />
      </div>
      <div className="skeleton mt-6 h-4 w-28" />
      <div className="mt-3 space-y-2.5">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-11/12" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-2/3" />
      </div>
    </Card>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="border-[var(--red-fg)]/40 p-6" role="alert">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--red-bg)] text-[var(--red-fg)]">
          <AlertTriangle size={18} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold">Triage failed</h3>
          <p className="mt-1 break-words text-sm text-muted">{message}</p>
          <p className="mt-1 text-sm text-muted">Your ticket is still in the form.</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
            <RotateCw size={14} aria-hidden="true" />
            Try again
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function TriageApp() {
  const [ticket, setTicket] = useState<Ticket>({ subject: '', body: '' });
  const [view, setView] = useState<View>({ kind: 'empty' });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const nextId = useRef(1);
  const resultRef = useRef<HTMLElement>(null);

  async function submit() {
    const payload = { subject: ticket.subject.trim(), body: ticket.body.trim() };
    setView({ kind: 'loading' });
    // On single-column layouts the result sits below the form; bring it into view.
    resultRef.current?.scrollIntoView({ block: 'nearest' });
    try {
      const result = await triage(payload);
      const id = nextId.current++;
      setHistory((prev) =>
        [{ id, subject: payload.subject, result }, ...prev].slice(0, HISTORY_SIZE),
      );
      setView({ kind: 'result', result, id });
    } catch (error) {
      setView({
        kind: 'error',
        message:
          error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      });
    }
  }

  function pickExample(example: Example) {
    setTicket({ subject: example.subject, body: example.body });
  }

  const status =
    view.kind === 'loading'
      ? 'Triaging ticket…'
      : view.kind === 'error'
        ? `Triage failed: ${view.message}`
        : view.kind === 'result'
          ? `Triage complete: ${CATEGORY_META[view.result.category].label}, ${PRIORITY_META[view.result.priority].label}.`
          : '';

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-10">
      <div className="flex min-w-0 flex-col gap-6">
        <TicketForm
          value={ticket}
          loading={view.kind === 'loading'}
          onChange={setTicket}
          onSubmit={submit}
        />
        <ExampleTickets onPick={pickExample} />
      </div>
      <div className="flex min-w-0 flex-col gap-8">
        <section ref={resultRef} aria-labelledby="result-heading" className="scroll-mt-4">
          <h2
            id="result-heading"
            className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted"
          >
            Result
          </h2>
          <p role="status" aria-live="polite" className="sr-only">
            {status}
          </p>
          {view.kind === 'empty' && <EmptyState />}
          {view.kind === 'loading' && <LoadingState />}
          {view.kind === 'error' && <ErrorState message={view.message} onRetry={submit} />}
          {view.kind === 'result' && <ResultCard key={view.id} result={view.result} />}
        </section>
        <History
          entries={history}
          activeId={view.kind === 'result' ? view.id : null}
          onSelect={(entry) => setView({ kind: 'result', result: entry.result, id: entry.id })}
        />
      </div>
    </div>
  );
}
