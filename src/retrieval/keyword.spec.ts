import { extractKeywords, keywordSearch } from './keyword';
import type { KbArticle } from './kb';

const articles: KbArticle[] = [
  { id: 'a', title: 'Refunds', text: 'How to get a refund for a duplicate charge.' },
  { id: 'b', title: 'Crashes', text: 'The app crashes on sign in. Clear the cache.' },
  { id: 'c', title: 'Charges', text: 'Understanding every charge on your invoice.' },
  { id: 'd', title: 'Profile', text: 'Change your display name.' },
];

describe('keywordSearch (AC-K5)', () => {
  it('drops stop-words, one-letter words and duplicates', () => {
    expect(extractKeywords('How do I get the refund refund?')).toEqual(['get', 'refund']);
  });

  it('ranks by distinct keywords found, ties by article order', () => {
    const r = keywordSearch(articles, 'duplicate charge refund');
    expect(r.map((a) => a.id)).toEqual(['a', 'c']);
  });

  it('matches whole words only', () => {
    expect(keywordSearch(articles, 'crash')).toEqual([]);
    expect(keywordSearch(articles, 'crashes').map((a) => a.id)).toEqual(['b']);
  });

  it('returns at most `limit` articles and [] when nothing matches', () => {
    expect(keywordSearch(articles, 'charge invoice refund crashes name', 2)).toHaveLength(2);
    expect(keywordSearch(articles, 'zebra')).toEqual([]);
    expect(keywordSearch(articles, '   ')).toEqual([]);
  });
});
