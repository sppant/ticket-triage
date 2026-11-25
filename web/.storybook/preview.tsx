import type { Decorator, Preview } from '@storybook/nextjs-vite';
import '../src/app/globals.css';

const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  return (
    <div className="p-6">
      <Story />
    </div>
  );
};

const preview: Preview = {
  decorators: [withTheme],
  parameters: { layout: 'fullscreen' },
  globalTypes: {
    theme: {
      description: 'Colour theme',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
};

export default preview;
