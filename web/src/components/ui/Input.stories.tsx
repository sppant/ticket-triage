import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Input } from './Input';
import { Textarea } from './Textarea';

const meta = {
  title: 'UI/Input',
  component: Input,
  args: { placeholder: 'Subject', 'aria-label': 'Subject' },
} satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Filled: Story = { args: { defaultValue: 'Charged twice for my subscription' } };
export const Disabled: Story = { args: { disabled: true } };
export const MultiLine: Story = {
  render: () => <Textarea aria-label="Body" placeholder="Describe the issue" />,
};
