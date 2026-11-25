export type PiiKind = 'email' | 'phone' | 'card';

export interface PiiResult {
  hasPii: boolean;
  kinds: PiiKind[];
}

/**
 * Heuristic personal-data detector (AC-P1..P5). It favours simplicity over
 * completeness: it can miss exotic formats and can flag look-alikes.
 *
 * - email: `local@domain.tld` with a TLD of at least two letters.
 * - card:  13-19 digits, optionally separated by single spaces or hyphens.
 *          No Luhn check (the spec asks for card-like numbers).
 * - phone: `(555) 123-4567`, `555-123-4567` (separators required, so plain
 *          digit runs such as `order #48213` do not match), or an
 *          international `+` number with 8-15 digits.
 *
 * Card-like matches are blanked out before the phone check so one number is
 * not reported twice. The caller concatenates subject and body.
 */
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,}/i;
const CARD = /(?<![\d])\d(?:[ -]?\d){12,18}(?![\d])/g;
const PHONE_NATIONAL = /(?<![\w#.])(?:\(\d{3}\)\s?|\d{3}[ -])\d{3}[ -]\d{4}(?![\w-])/;
const PHONE_INTERNATIONAL = /(?<![\w+])\+\d[\d ()-]{6,18}\d(?!\d)/g;

export function detectPii(text: string): PiiResult {
  const kinds: PiiKind[] = [];

  if (EMAIL.test(text)) kinds.push('email');

  const withoutCards = text.replace(CARD, ' ');
  if (withoutCards !== text) kinds.push('card');

  if (hasPhone(withoutCards)) kinds.push('phone');

  // Keep a stable order: email, phone, card.
  const order: PiiKind[] = ['email', 'phone', 'card'];
  const sorted = order.filter((k) => kinds.includes(k));
  return { hasPii: sorted.length > 0, kinds: sorted };
}

function hasPhone(text: string): boolean {
  if (PHONE_NATIONAL.test(text)) return true;
  for (const match of text.matchAll(PHONE_INTERNATIONAL)) {
    const digits = match[0].replace(/\D/g, '').length;
    if (digits >= 8 && digits <= 15) return true;
  }
  return false;
}
