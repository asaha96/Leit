import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['server/**/*.test.{js,ts}', 'tests/**/*.test.{js,ts}'],
    testTimeout: 10000,
  },
});
