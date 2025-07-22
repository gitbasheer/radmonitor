/**
 * Setup for store tests
 * Handles module resolution and mocking for Zustand
 */

import { vi } from 'vitest';

// Don't mock Zustand, let it work normally
// Just ensure we have the necessary globals

// Ensure window exists for browser APIs
if (typeof window === 'undefined') {
  global.window = {
    location: {
      search: '',
      pathname: '/',
    },
    history: {
      replaceState: vi.fn(),
    },
  };
}
