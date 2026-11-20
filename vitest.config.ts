import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'unit', include: ['tests/unit/**/*.test.ts', 'tests/data/**/*.test.ts'] } },
      { test: { name: 'built', include: ['tests/built/**/*.test.ts'] } },
    ],
  },
});
