import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'json', 'lcov', 'cobertura'],
      include: ['**/src/**/*.ts'],
    },
  },
  plugins: [swc.vite()],
});
