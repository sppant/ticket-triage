import { CATEGORIES, PRIORITIES } from '../src/contracts';
import { loadDataset, parseDataset } from './dataset';

describe('dataset.jsonl (AC-E1, AC-E2)', () => {
  const tickets = loadDataset();

  it('has exactly 40 valid tickets with unique ids', () => {
    expect(tickets).toHaveLength(40);
    expect(new Set(tickets.map((t) => t.id)).size).toBe(40);
  });

  it('covers all categories and priorities', () => {
    expect(new Set(tickets.map((t) => t.category))).toEqual(new Set(CATEGORIES));
    expect(new Set(tickets.map((t) => t.priority))).toEqual(new Set(PRIORITIES));
  });

  const text = (t: (typeof tickets)[number]): string => `${t.subject} ${t.body}`;

  it('uses only example.com / example.org email addresses', () => {
    const emails = tickets.flatMap((t) => text(t).match(/[\w.+-]+@[\w.-]+\.\w+/g) ?? []);
    expect(emails.length).toBeGreaterThan(0);
    for (const email of emails) expect(email).toMatch(/@example\.(com|org)$/);
  });

  it('uses only fictional phone numbers and well-known test cards', () => {
    const phones = tickets.flatMap(
      (t) => text(t).match(/\+1 555 010 \d{4}|\(555\) 010-\d{4}/g) ?? [],
    );
    expect(phones.length).toBeGreaterThan(0);
    // Any long digit run with a 555 prefix or 7+ digits must be one of the allowed shapes.
    const phoneLike = tickets.flatMap(
      (t) => text(t).match(/\+\d[\d ()-]{8,}\d|\(\d{3}\) \d{3}-\d{4}/g) ?? [],
    );
    expect(phoneLike.sort()).toEqual([...phones].sort());

    const allowedCards = new Set(['4111 1111 1111 1111', '4242 4242 4242 4242']);
    const cards = tickets.flatMap((t) => text(t).match(/\b(?:\d{4} ){3}\d{4}\b/g) ?? []);
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) expect(allowedCards.has(card)).toBe(true);
  });

  it('contains at least 5 tickets with personal data', () => {
    // TODO(integration): replace these regexes with the real detectPii from src.
    const pii =
      /[\w.+-]+@example\.(com|org)|\+1 555 010 \d{4}|\(555\) 010-\d{4}|\b(?:\d{4} ){3}\d{4}\b/;
    expect(tickets.filter((t) => pii.test(text(t))).length).toBeGreaterThanOrEqual(5);
  });

  it('keeps bodies short (1-4 sentences)', () => {
    for (const t of tickets) {
      const sentences = t.body.split(/(?<=[.!?])\s+/).filter(Boolean);
      expect(sentences.length).toBeGreaterThanOrEqual(1);
      expect(sentences.length).toBeLessThanOrEqual(4);
    }
  });
});

describe('parseDataset', () => {
  it('rejects invalid JSON, bad labels and duplicate ids', () => {
    expect(() => parseDataset('nope')).toThrow(/line 1: invalid JSON/);
    expect(() =>
      parseDataset('{"id":"a","subject":"s","body":"b","category":"x","priority":"low"}'),
    ).toThrow(/line 1/);
    const row = '{"id":"a","subject":"s","body":"b","category":"bug","priority":"low"}';
    expect(() => parseDataset(`${row}\n${row}`)).toThrow(/duplicate/);
  });
});
