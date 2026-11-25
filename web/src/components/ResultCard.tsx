import {
  ArrowDown,
  ArrowUp,
  Bug,
  Check,
  Clock,
  Copy,
  CreditCard,
  Cpu,
  Lightbulb,
  CircleHelp,
  Minus,
  Route,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { Category, Priority, TriageResult } from '@/lib/api';
import { Badge, type BadgeTone } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

export const CATEGORY_META: Record<Category, { label: string; tone: BadgeTone; icon: ReactNode }> =
  {
    billing: { label: 'Billing', tone: 'blue', icon: <CreditCard size={13} /> },
    bug: { label: 'Bug', tone: 'red', icon: <Bug size={13} /> },
    feature_request: { label: 'Feature request', tone: 'violet', icon: <Lightbulb size={13} /> },
    account: { label: 'Account', tone: 'teal', icon: <UserRound size={13} /> },
    other: { label: 'Other', tone: 'neutral', icon: <CircleHelp size={13} /> },
  };

export const PRIORITY_META: Record<Priority, { label: string; tone: BadgeTone; icon: ReactNode }> =
  {
    low: { label: 'Low priority', tone: 'green', icon: <ArrowDown size={13} /> },
    medium: { label: 'Medium priority', tone: 'amber', icon: <Minus size={13} /> },
    high: { label: 'High priority', tone: 'red', icon: <ArrowUp size={13} /> },
  };

export function formatLatency(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}

function isPrivateRoute(reason: string): boolean {
  return /^local\b|contains personal data|\bpii\b/i.test(reason);
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fall back to a hidden textarea for insecure contexts or denied permissions.
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try {
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      area.remove();
    }
  }
}

function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function handleCopy() {
    setState((await copyText(text)) ? 'copied' : 'failed');
    setTimeout(() => setState('idle'), 2000);
  }

  return (
    <div className="flex items-center gap-2">
      <span aria-live="polite" className="text-xs text-muted">
        {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : ''}
      </span>
      <Button variant="secondary" size="sm" onClick={handleCopy}>
        {state === 'copied' ? (
          <Check size={14} aria-hidden="true" />
        ) : (
          <Copy size={14} aria-hidden="true" />
        )}
        Copy
      </Button>
    </div>
  );
}

export function ResultCard({ result }: { result: TriageResult }) {
  const category = CATEGORY_META[result.category];
  const priority = PRIORITY_META[result.priority];
  const isPrivate = isPrivateRoute(result.route_reason);

  return (
    <Card className="animate-rise overflow-hidden" data-testid="result-card">
      <div className="flex flex-wrap items-center gap-2 p-5 pb-0 sm:px-6 sm:pt-6">
        <Badge tone={category.tone} icon={category.icon} data-testid="category-badge">
          {category.label}
        </Badge>
        <Badge tone={priority.tone} icon={priority.icon} data-testid="priority-badge">
          {priority.label}
        </Badge>
      </div>
      <div className="p-5 sm:p-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Draft reply</h3>
          <CopyButton text={result.draft_reply} />
        </div>
        <p
          data-testid="draft-reply"
          className="whitespace-pre-wrap rounded-xl border border-border bg-surface-2 p-4 text-[15px] leading-7"
        >
          {result.draft_reply}
        </p>
      </div>
      <dl className="grid gap-3 border-t border-border bg-surface-2/60 px-5 py-4 text-sm sm:px-6">
        <div className="flex items-start gap-2.5">
          <dt className="flex items-center gap-2 text-muted">
            <Cpu size={15} aria-hidden="true" />
            <span>Model</span>
          </dt>
          <dd className="min-w-0 break-words font-medium" data-testid="model">
            {result.model} <span className="font-normal text-muted">via {result.provider}</span>
          </dd>
        </div>
        <div className="flex items-start gap-2.5">
          <dt className="flex items-center gap-2 text-muted">
            {isPrivate ? (
              <ShieldCheck size={15} aria-hidden="true" className="text-[var(--green-fg)]" />
            ) : (
              <Route size={15} aria-hidden="true" />
            )}
            <span>Routing</span>
          </dt>
          <dd className="min-w-0 break-words font-medium" data-testid="route-reason">
            {result.route_reason}
          </dd>
        </div>
        <div className="flex items-start gap-2.5">
          <dt className="flex items-center gap-2 text-muted">
            <Clock size={15} aria-hidden="true" />
            <span>Latency</span>
          </dt>
          <dd className="font-medium tabular-nums" data-testid="latency">
            {formatLatency(result.latency_ms)}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
