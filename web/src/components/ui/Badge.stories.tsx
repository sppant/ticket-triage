import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Bug, ShieldCheck } from 'lucide-react';
import { Badge } from './Badge';

const meta = {
  title: 'UI/Badge',
  component: Badge,
  args: { children: 'Billing', tone: 'blue' },
} satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithIcon: Story = { args: { tone: 'red', children: 'Bug', icon: <Bug size={14} /> } };
export const Private: Story = {
  args: { tone: 'green', children: 'Local', icon: <ShieldCheck size={14} /> },
};
export const AllTones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {(['neutral', 'blue', 'red', 'violet', 'teal', 'green', 'amber'] as const).map((t) => (
        <Badge key={t} tone={t}>
          {t}
        </Badge>
      ))}
    </div>
  ),
};
