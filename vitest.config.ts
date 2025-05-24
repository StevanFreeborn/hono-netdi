import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'json', 'lcov'],
      include: ['**/src/**/*.ts'],
      exclude: ['**/src/index.ts'],
    },
  },
  plugins: [swc.vite()],
});
