import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    projects: ['packages/*'],
  },
  resolve: {
    alias: {
      '@issueos/github-app': path.resolve(__dirname, 'packages/github-app/src/index.ts'),
      '@issueos/commands-plan': path.resolve(__dirname, 'packages/commands/plan/src/index.ts'),
    },
  },
});
