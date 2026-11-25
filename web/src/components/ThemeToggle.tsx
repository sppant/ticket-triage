'use client';

import { Moon, Sun } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { getTheme, setTheme, subscribeTheme } from '@/lib/theme';
import { Button } from './ui/Button';

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, getTheme, () => null);
  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => setTheme(next)}
      aria-label={theme ? `Switch to ${next} theme` : 'Toggle theme'}
      className="w-8 px-0!"
    >
      {theme === 'dark' ? (
        <Sun size={16} aria-hidden="true" />
      ) : (
        <Moon size={16} aria-hidden="true" />
      )}
    </Button>
  );
}
