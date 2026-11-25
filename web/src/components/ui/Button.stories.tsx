import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from './Button';

const meta = {
  title: 'UI/Button',
  component: Button,
  args: { children: 'Triage ticket' },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Ghost: Story = { args: { variant: 'ghost' } };
export const Small: Story = { args: { variant: 'secondary', size: 'sm', children: 'Copy' } };
export const Disabled: Story = { args: { disabled: true } };
export const Busy: Story = { args: { 'aria-busy': true, disabled: true, children: 'Triaging…' } };
