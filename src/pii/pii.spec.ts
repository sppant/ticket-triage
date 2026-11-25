import { detectPii } from './pii';

describe('detectPii', () => {
  it('AC-P1 returns hasPii and kinds', () => {
    expect(detectPii('nothing here')).toEqual({ hasPii: false, kinds: [] });
    expect(detectPii('jane.doe@example.com')).toEqual({ hasPii: true, kinds: ['email'] });
  });

  it('AC-P2 detects emails but not bare domains', () => {
    expect(detectPii('jane.doe@example.com').kinds).toContain('email');
    expect(detectPii('write to a+b@sub.example.org please').kinds).toContain('email');
    expect(detectPii('see docs at example.com').hasPii).toBe(false);
    expect(detectPii('meet @ 5pm').hasPii).toBe(false);
  });

  it.each(['+30 694 123 4567', '(555) 123-4567', '555-123-4567', 'call me on +44 20 7946 0958'])(
    'AC-P3 detects phone %s',
    (text) => {
      expect(detectPii(text).kinds).toEqual(['phone']);
    },
  );

  it.each(['order #48213', 'version 3.2.1', 'ticket 123456', 'on 2024-05-06', 'build 1.2.3.4567'])(
    'AC-P3 ignores %s',
    (text) => {
      expect(detectPii(text).hasPii).toBe(false);
    },
  );

  it.each(['4111 1111 1111 1111', '4111-1111-1111-1111', '4111111111111111', '378282246310005'])(
    'AC-P4 detects card %s',
    (text) => {
      expect(detectPii(`card ${text} thanks`).kinds).toEqual(['card']);
    },
  );

  it('AC-P4 ignores a 6-digit number and 12-digit runs', () => {
    expect(detectPii('code 123456').hasPii).toBe(false);
    expect(detectPii('id 123456789012').hasPii).toBe(false);
  });

  it('AC-P5 reports each kind once, even for repeated matches', () => {
    const text =
      'a@example.com, b@example.com, 555-123-4567, 555-987-6543, card 4111 1111 1111 1111 and 5500-0000-0000-0004';
    expect(detectPii(text).kinds).toEqual(['email', 'phone', 'card']);
  });

  it('AC-P5 scans concatenated subject and body', () => {
    expect(detectPii('Refund\nmy mail is jane@example.com').kinds).toEqual(['email']);
  });
});
