# App Store Tests

This directory contains comprehensive tests for the Zustand app store.

## Overview

The app store (`assets/js/stores/app-store.js`) is the central state management solution for the RAD Monitor dashboard. It uses Zustand for state management and handles:

- Authentication state
- Connection status
- UI state (loading, modals, growl messages)
- Dashboard data and filtering
- Application initialization

## Test Coverage

The test file `app-store.test.js` includes 46 comprehensive tests covering:

### Unit Tests

1. **State Initialization**
   - Default state shape and values
   - Required actions presence

2. **Selector Functions**
   - `useAuth()` - Returns auth state
   - `useConnection()` - Returns connection state
   - `useUI()` - Returns UI state
   - `useData()` - Returns data state
   - `useFilters()` - Returns filters state
   - `useActions()` - Returns all actions

3. **Auth Actions**
   - `checkAuth()` - Authentication checking with CentralizedAuth, localStorage, and URL params
   - `setCookie()` - Cookie setting with proper formatting
   - `clearAuth()` - Auth clearing and state reset

4. **UI Actions**
   - `setLoading()` - Loading state management
   - `showModal()` / `hideModal()` - Modal state management
   - `showGrowl()` / `removeGrowl()` - Growl notification system with auto-removal

5. **Data Actions**
   - `setData()` - Data setting with automatic stats calculation
   - Filter application after data updates

6. **Filter Actions**
   - `setFilter()` - Individual filter updates
   - `applyFilters()` - Multi-criteria filtering (status, search, RAD types)

7. **Connection Actions**
   - `updateConnection()` - System connection status updates

### Integration Tests

1. **Login Flow**
   - Successful login with stored cookie
   - Login with URL parameter
   - Failed login handling
   - Error handling during initialization

2. **Data Loading Flow**
   - Data loading and filtering
   - Filter persistence across data updates

3. **Configuration Change Flow**
   - Runtime configuration changes
   - State persistence across auth changes

### Other Tests

- Store subscription mechanism
- Global store access for debugging

## Test Utilities

### Store Reset

The `resetStore()` function resets the store to its initial state between tests to ensure proper test isolation:

```javascript
const resetStore = () => {
  appStore.setState({
    // Initial state...
  });
};
```

### Mocking

The tests mock several browser APIs:
- `localStorage` - For cookie storage
- `window.CentralizedAuth` - For centralized authentication
- `URLSearchParams` - For URL parameter parsing
- `window.history.replaceState` - For URL manipulation

## Running Tests

```bash
# Run store tests only
npm run test:store

# Run all tests including store tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Structure

```
tests/
  stores/
    app-store.test.js      # Main test file
    setup-store-tests.js   # Test setup utilities
    README.md             # This file
```

## Writing New Store Tests

When adding new store functionality:

1. Add the state/action to the store
2. Add unit tests for the new functionality
3. Add integration tests if the feature affects app flows
4. Ensure proper mocking and state reset

Example test structure:

```javascript
describe('New Feature', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  it('should handle new action', () => {
    // Test implementation
  });
});
```

## Common Issues

1. **Import Issues**: The store uses ESM modules. Make sure your test environment supports ESM.
2. **Mock Persistence**: Always clear mocks between tests using `vi.clearAllMocks()`.
3. **Async Actions**: Remember to await async actions and use proper async test syntax.
4. **Timer-based Tests**: Use `vi.useFakeTimers()` for testing time-dependent features like growl auto-removal.

## Future Improvements

1. Add performance tests for large data sets
2. Add tests for concurrent action handling
3. Add tests for store persistence/hydration
4. Add tests for store middleware/subscriptions
