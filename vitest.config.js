import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.config.js',
        'scripts/**',
        'cors_proxy.py'
      ]
    },
    include: ['tests/**/*.test.js'],
    mockReset: true,
    restoreMocks: true
  }
}); 