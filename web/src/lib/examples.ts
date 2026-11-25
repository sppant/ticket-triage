import type { Ticket } from './api';

export interface Example extends Ticket {
  id: string;
  label: string;
  hint: string;
  hasPersonalData?: boolean;
}

export const EXAMPLES: Example[] = [
  {
    id: 'billing',
    label: 'Double charge',
    hint: 'Billing',
    subject: 'Charged twice for my March subscription',
    body: 'Hi, I noticed two identical charges of $49.00 on my card for the March subscription. Could you refund the duplicate payment? Thanks!',
  },
  {
    id: 'bug',
    label: 'Export crash',
    hint: 'Bug report',
    subject: 'App crashes when exporting a report to PDF',
    body: 'Every time I click "Export to PDF" on the monthly report, the page freezes and then shows a blank screen. It started after yesterday\'s update. Chrome 126 on Windows 11.',
  },
  {
    id: 'pii',
    label: 'Locked out',
    hint: 'Contains personal data',
    hasPersonalData: true,
    subject: 'Cannot sign in, please call me',
    body: 'Hello, I am locked out of my account. My name is Maria Gonzalez, my email is maria.gonzalez@example.com and my phone number is +1 415 555 0132. Please call me back as soon as you can, it is urgent.',
  },
  {
    id: 'feature',
    label: 'Dark mode request',
    hint: 'Feature request',
    subject: 'Would love a dark mode',
    body: 'I use the dashboard late at night and the bright theme is hard on the eyes. Is a dark mode on the roadmap? It would make the product a lot nicer to use.',
  },
];
