import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: 'packages/storage',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
