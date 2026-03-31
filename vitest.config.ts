import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@stacklance/envguard-audit': resolve(__dirname, 'packages/audit/src/index.ts'),
      '@stacklance/envguard-core': resolve(__dirname, 'packages/core/src/index.ts'),
      '@stacklance/envguard-cli': resolve(__dirname, 'packages/cli/src/index.ts'),
      '@stacklance/envguard-nestjs': resolve(__dirname, 'packages/nestjs/src/index.ts'),
    },
  },
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/*.d.ts', '**/index.ts'],
    },
  },
});
