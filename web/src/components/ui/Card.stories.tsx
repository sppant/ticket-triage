import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Card } from './Card';

const meta = { title: 'UI/Card', component: Card } satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="max-w-sm p-6">
      <h3 className="text-base font-semibold">Card title</h3>
      <p className="mt-1 text-sm text-muted">Surface with a subtle border and layered shadow.</p>
    </Card>
  ),
};
