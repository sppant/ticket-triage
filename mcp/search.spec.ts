import path from 'node:path';
import { loadDataset } from './dataset';
import { extractKeywords, findSimilarTickets } from './search';

const tickets = loadDataset(path.join(__dirname, '__fixtures__', 'tickets.jsonl'));
const ids = (query: string, limit?: number): (string | number)[] =>
  findSimilarTickets(tickets, query, limit).map((t) => t.id);

describe('extractKeywords', () => {
  it('lowercases, splits on non-alphanumerics, drops stop-words and duplicates', () => {
    expect(extractKeywords('The Login, the LOGIN & a crash!')).toEqual(['login', 'crash']);
  });
});

describe('findSimilarTickets', () => {
  it('ranks by number of distinct keywords found in subject and body', () => {
    // t2 and t8 match crashes+login (2); t3 and t6 match only dashboard (1), in dataset order.
    expect(ids('crashes login dashboard')).toEqual(['t2', 't8', 't3']);
    expect(ids('crashes login dashboard', 10)).toEqual(['t2', 't8', 't3', 't6']);
  });

  it('breaks ties by dataset order', () => {
    expect(ids('billing')).toEqual(['t5']);
    expect(ids('invoice')).toEqual(['t1', 't5']);
  });

  it('counts a repeated keyword once', () => {
    expect(ids('login login login crashes')).toEqual(['t2', 't8']);
    expect(ids('invoice invoice dashboard')).toEqual(['t1', 't3', 't5']);
  });

  it('matches whole words only, so "on" does not match "subscription"', () => {
    expect(ids('on')).toEqual([]);
    expect(ids('crash')).toEqual([]);
  });

  it('returns at most the limit (default 3)', () => {
    expect(findSimilarTickets(tickets, 'the app login dashboard invoice')).toHaveLength(3);
    expect(ids('login', 1)).toEqual(['t2']);
  });

  it('returns an empty list when nothing matches', () => {
    expect(ids('zzzunmatched')).toEqual([]);
  });

  it('returns an empty list for an empty query', () => {
    expect(ids('')).toEqual([]);
    expect(ids('   ')).toEqual([]);
  });

  it('returns full tickets', () => {
    expect(findSimilarTickets(tickets, 'refund')[0]).toEqual({
      id: 't1',
      subject: 'Charged twice this month',
      body: 'I was billed twice for my subscription. Please refund the duplicate invoice.',
      category: 'billing',
      priority: 'high',
    });
  });
});
