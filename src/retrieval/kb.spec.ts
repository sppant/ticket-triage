import { loadKnowledgeBase, parseArticle } from './kb';

describe('knowledge base (AC-K1)', () => {
  it('parses the title and text of an article', () => {
    const a = parseArticle('x', '# Hello\n\nBody text.\n');
    expect(a).toEqual({ id: 'x', title: 'Hello', text: 'Body text.' });
  });

  it('rejects an article without a title', () => {
    expect(() => parseArticle('x', 'no heading')).toThrow(/Title/);
  });

  it('kb/ has 15 to 20 titled articles with unique ids and synthetic contact details only', () => {
    const articles = loadKnowledgeBase();
    expect(articles.length).toBeGreaterThanOrEqual(15);
    expect(articles.length).toBeLessThanOrEqual(20);
    expect(new Set(articles.map((a) => a.id)).size).toBe(articles.length);
    for (const a of articles) {
      expect(a.title.length).toBeGreaterThan(0);
      expect(a.text.length).toBeGreaterThan(50);
      for (const email of a.text.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) ?? []) {
        expect(email).toMatch(/@example\.com$/);
      }
    }
  });
});
