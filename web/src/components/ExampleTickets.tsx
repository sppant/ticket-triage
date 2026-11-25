import { ShieldAlert } from 'lucide-react';
import { EXAMPLES, type Example } from '@/lib/examples';

export function ExampleTickets({ onPick }: { onPick: (example: Example) => void }) {
  return (
    <section aria-labelledby="examples-heading">
      <h2
        id="examples-heading"
        className="text-xs font-semibold uppercase tracking-wider text-muted"
      >
        Try an example
      </h2>
      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {EXAMPLES.map((example) => (
          <li key={example.id}>
            <button
              type="button"
              onClick={() => onPick(example)}
              className="group flex h-full w-full flex-col items-start gap-0.5 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-left shadow-sm transition duration-150 hover:-translate-y-px hover:border-accent hover:shadow-md"
            >
              <span className="text-sm font-medium text-fg">{example.label}</span>
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                {example.hasPersonalData ? (
                  <ShieldAlert size={12} aria-hidden="true" className="text-accent-text" />
                ) : null}
                {example.hint}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
