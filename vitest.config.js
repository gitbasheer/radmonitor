import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    env: {
      NODE_ENV: 'test'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.config.js',
        'scripts/**',
        'bin/cors_proxy.py'
      ]
    },
    include: ['tests/**/*.test.{js,ts}'],
    mockReset: true,
    restoreMocks: true,
    testTimeout: 10000 // Increase timeout to 10 seconds
  }
});
