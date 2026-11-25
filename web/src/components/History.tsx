import clsx from 'clsx';
import type { TriageResult } from '@/lib/api';
import { CATEGORY_META, PRIORITY_META } from './ResultCard';
import { Badge } from './ui/Badge';

export interface HistoryEntry {
  id: number;
  subject: string;
  result: TriageResult;
}

interface HistoryProps {
  entries: HistoryEntry[];
  activeId: number | null;
  onSelect: (entry: HistoryEntry) => void;
}

export function History({ entries, activeId, onSelect }: HistoryProps) {
  return (
    <section aria-labelledby="history-heading">
      <h2
        id="history-heading"
        className="text-xs font-semibold uppercase tracking-wider text-muted"
      >
        Recent triages
      </h2>
      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Your last five results will appear here.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {entries.map((entry) => {
            const category = CATEGORY_META[entry.result.category];
            const priority = PRIORITY_META[entry.result.priority];
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => onSelect(entry)}
                  aria-current={entry.id === activeId ? 'true' : undefined}
                  className={clsx(
                    'flex w-full items-center justify-between gap-3 rounded-xl border bg-surface px-3.5 py-2.5 text-left shadow-sm transition-colors duration-150 hover:border-accent',
                    entry.id === activeId ? 'border-accent bg-accent-soft' : 'border-border',
                  )}
                >
                  <span className="min-w-0 truncate text-sm font-medium">{entry.subject}</span>
                  <span className="flex shrink-0 gap-1.5">
                    <Badge tone={category.tone} icon={category.icon}>
                      {category.label}
                    </Badge>
                    <Badge
                      tone={priority.tone}
                      icon={priority.icon}
                      className="hidden sm:inline-flex"
                    >
                      {priority.label.replace(' priority', '')}
                    </Badge>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
