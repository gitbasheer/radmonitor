# RAD Monitor Test Suite

This directory contains comprehensive unit tests for the RAD Monitor dashboard JavaScript functionality using Vitest.

## 📁 Test Structure

- **`cookie.test.js`** - Cookie management functions (setCookie, getCookie, deleteCookie)
- **`authentication.test.js`** - Authentication and CORS proxy detection
- **`scoring.test.js`** - Score calculation, status determination, and impact calculation
- **`dataProcessing.test.js`** - Elasticsearch response processing and API calls
- **`uiUpdates.test.js`** - DOM manipulation and UI update functions
- **`integration.test.js`** - End-to-end scenarios and auto-refresh functionality
- **`setup.js`** - Global test setup, mocks, and utilities

## 🚀 Running Tests

```bash
# Install dependencies first
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## 📊 Test Coverage

The test suite covers:

### ✅ JavaScript Functions (100% coverage target)
- Cookie management (get, set, delete)
- Authentication flow (local vs production)
- CORS proxy detection
- Score calculations
- Status determination based on thresholds
- Impact calculations
- Elasticsearch response processing
- API calls (proxy and direct methods)
- UI updates (cards, table, timestamp)
- Auto-refresh functionality
- Configuration management
- Error handling

### 📝 Non-JavaScript Components

The following components are **not** covered by Vitest tests (as they're not JavaScript):

#### Python Components
- **`cors_proxy.py`** - Would need Python tests using pytest or unittest
  - Health endpoint
  - Proxy functionality
  - SSL certificate handling
  - Error responses

#### Bash Scripts
- **`run_with_cors.sh`** - Would need bash/shell testing
- **`run_local_auto.sh`**
- **`test_locally.sh`**
- **`scripts/generate_dashboard.sh`**

#### GitHub Actions
- **`.github/workflows/update-dashboard.yml`** - Would need workflow testing in GitHub

## 🧪 Test Patterns

### Mocking
- **Fetch API** - All network calls are mocked
- **localStorage** - Custom mock implementation
- **document.cookie** - Custom getter/setter
- **DOM** - jsdom environment

### Test Utilities
- `createMockResponse()` - Creates mock HTTP responses
- `createElasticsearchResponse()` - Creates mock ES responses  
- `createBucket()` - Creates mock aggregation buckets

### Best Practices
- Each test file focuses on a specific module
- Tests are isolated with `beforeEach` cleanup
- Both positive and negative cases are tested
- Edge cases are covered
- Integration tests verify complete flows

## 🔧 Configuration

### Vitest Config (`vitest.config.js`)
- Environment: jsdom
- Globals: enabled
- Coverage: v8 provider
- Setup file: `tests/setup.js`

### Test Environment
- Node.js with ES modules
- Mocked browser APIs
- Fake timers for auto-refresh tests

## 💡 Writing New Tests

When adding new functionality:

1. Create unit tests for individual functions
2. Test edge cases and error conditions
3. Add integration tests for complete flows
4. Update this README with coverage info

Example test structure:
```javascript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup
  });

  it('should handle normal case', () => {
    // Test implementation
  });

  it('should handle error case', () => {
    // Test error handling
  });
});
```

## 🐛 Debugging Tests

- Use `console.log()` for debugging
- Run specific test file: `npx vitest cookie.test.js`
- Use `it.only()` to run single test
- Check coverage gaps: `npm run test:coverage`

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Jest Matchers](https://jestjs.io/docs/expect) (Vitest compatible) 