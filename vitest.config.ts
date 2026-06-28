import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/*'],
    setupFiles: ['packages/llm-client/src/vitest.setup.ts'],
  },
});
