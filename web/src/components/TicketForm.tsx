import { Loader2, Send } from 'lucide-react';
import type { FormEvent } from 'react';
import { BODY_MAX, SUBJECT_MAX, type Ticket } from '@/lib/api';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';

interface TicketFormProps {
  value: Ticket;
  loading: boolean;
  onChange: (value: Ticket) => void;
  onSubmit: () => void;
}

function Counter({ id, length, max }: { id: string; length: number; max: number }) {
  return (
    <span id={id} className="text-xs tabular-nums text-muted">
      {length} / {max}
    </span>
  );
}

export function TicketForm({ value, loading, onChange, onSubmit }: TicketFormProps) {
  const canSubmit = value.subject.trim() !== '' && value.body.trim() !== '' && !loading;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (canSubmit) onSubmit();
  }

  return (
    <Card className="p-5 sm:p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" aria-label="Support ticket">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label htmlFor="subject" className="text-sm font-medium">
              Subject
            </label>
            <Counter id="subject-count" length={value.subject.length} max={SUBJECT_MAX} />
          </div>
          <Input
            id="subject"
            name="subject"
            value={value.subject}
            maxLength={SUBJECT_MAX}
            required
            placeholder="Short summary of the problem"
            aria-describedby="subject-count"
            onChange={(e) => onChange({ ...value, subject: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label htmlFor="body" className="text-sm font-medium">
              Body
            </label>
            <Counter id="body-count" length={value.body.length} max={BODY_MAX} />
          </div>
          <Textarea
            id="body"
            name="body"
            value={value.body}
            maxLength={BODY_MAX}
            required
            placeholder="Paste the customer's message"
            aria-describedby="body-count"
            onChange={(e) => onChange({ ...value, body: e.target.value })}
          />
        </div>
        <Button
          type="submit"
          disabled={!canSubmit}
          aria-busy={loading}
          className="w-full sm:w-auto sm:self-start"
        >
          {loading ? (
            <Loader2 size={16} aria-hidden="true" className="animate-spin" />
          ) : (
            <Send size={16} aria-hidden="true" />
          )}
          {loading ? 'Triaging…' : 'Triage ticket'}
        </Button>
      </form>
    </Card>
  );
}
