import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup-improved.js'],
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
        'bin/cors_proxy.py',
        'coverage/**',
        'archive/**',
        'proxy-service/**'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },
    include: [
      'tests/**/*.test.{js,ts}',
      'tests/unit/**/*.test.{js,ts}',
      'tests/integration/**/*.test.{js,ts}',
      'tests/e2e/**/*.test.{js,ts}',
      'tests/api/**/*.test.{js,ts}'
    ],
    exclude: [
      'tests/test-organization-plan.md',
      'tests/utils/**',
      'tests/setup.js',
      'tests/setup-improved.js'
    ],
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
    testTimeout: 15000,
    hookTimeout: 10000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1
      }
    },
    reporters: ['verbose', 'json', 'html'],
    outputFile: {
      json: './coverage/test-results.json',
      html: './coverage/test-results.html'
    },
    onConsoleLog(log, type) {
      const suppressedMessages = [
        'Config API error',
        'Backend config load failed',
        'Loading configuration for development environment'
      ];

      return !suppressedMessages.some(msg => log.includes(msg));
    },
    retry: 2,
    bail: process.env.CI ? 1 : 0
  },
  resolve: {
    alias: {
      '@': new URL('./assets', import.meta.url).pathname,
      '@tests': new URL('./tests', import.meta.url).pathname
    }
  }
});
