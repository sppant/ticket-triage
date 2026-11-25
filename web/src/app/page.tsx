import { Sparkles } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { TriageApp } from '@/components/TriageApp';

export default function Page() {
  return (
    <>
      <header className="border-b border-border/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-fg shadow-sm">
              <Sparkles size={16} aria-hidden="true" />
            </span>
            <span className="text-base font-semibold tracking-tight">Ticket Triage</span>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6">
        <div className="mb-8 max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Triage a support ticket
          </h1>
          <p className="mt-2 text-base text-muted">
            Get a category, a priority and a draft reply. Tickets containing personal data are
            handled by the local model.
          </p>
        </div>
        <TriageApp />
      </main>
    </>
  );
}
