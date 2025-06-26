# FastAPI Integration Strategy

## Overview
This document outlines a centralized, incremental strategy for integrating FastAPI into the RAD Monitor dashboard while maintaining simplicity and avoiding disruption to the existing codebase.

## Core Principles

1. **Feature Flag First**: All FastAPI features behind a single toggle
2. **Adapter Pattern**: Create a unified interface that works with both systems
3. **Incremental Migration**: Fix immediate issues first, enhance later
4. **Centralized Configuration**: Single source of truth for all settings
5. **Backward Compatibility**: Existing system remains the default

## Implementation Strategy

### Phase 1: Foundation (1-2 days)
**Goal**: Fix immediate test failures without changing architecture

#### 1.1 Create Central Integration Module
```javascript
// assets/js/fastapi-integration.js
export const FastAPIIntegration = {
  // Feature flag - can be set via localStorage or config
  enabled: false,

  // Central configuration
  config: {
    apiUrl: 'http://localhost:8000',
    wsUrl: 'ws://localhost:8000/ws',
    reconnectInterval: 5000,
    enableRealtime: true
  },

  // Initialize integration
  async initialize() {
    // Check if FastAPI server is available
    this.enabled = await this.checkAvailability();

    if (this.enabled) {
      console.log('🚀 FastAPI mode enabled');
      await this.setupAdapters();
    } else {
      console.log('📦 Using legacy mode');
    }
  },

  // Adapter functions that route to appropriate implementation
  adapters: {
    fetchData: null,
    updateConfig: null,
    getAuthDetails: null
  }
};
```

#### 1.2 Fix WebSocket Implementation
```javascript
// Fix the immediate test failures by using proper event listeners
WebSocketManager.connect() {
  websocket = new WebSocket(WS_URL);

  // Use addEventListener instead of property assignment
  websocket.addEventListener('open', this.handleOpen.bind(this));
  websocket.addEventListener('message', this.handleMessage.bind(this));
  websocket.addEventListener('error', this.handleError.bind(this));
  websocket.addEventListener('close', this.handleClose.bind(this));
}
```

#### 1.3 Create Unified API Interface
```javascript
// assets/js/api-interface.js
export class UnifiedAPI {
  constructor() {
    this.implementation = FastAPIIntegration.enabled
      ? new FastAPIImplementation()
      : new LegacyImplementation();
  }

  async fetchTrafficData(config) {
    return this.implementation.fetchTrafficData(config);
  }

  async updateConfiguration(config) {
    return this.implementation.updateConfiguration(config);
  }
}
```

### Phase 2: Integration Layer (2-3 days)
**Goal**: Connect FastAPI to existing dashboard without breaking anything

#### 2.1 Modify Dashboard Entry Point
```javascript
// dashboard-main.js - Add at initialization
import { FastAPIIntegration } from './fastapi-integration.js';

// Initialize with feature detection
await FastAPIIntegration.initialize();

// Replace direct API calls with unified interface
const api = new UnifiedAPI();
```

#### 2.2 Create Configuration Sync
```javascript
// Sync configuration between systems
class ConfigurationSync {
  constructor() {
    this.sources = {
      localStorage: new LocalStorageConfig(),
      fastapi: FastAPIIntegration.enabled ? new FastAPIConfig() : null,
      dom: new DOMConfig()
    };
  }

  async sync() {
    // Get config from primary source
    const config = await this.getPrimaryConfig();

    // Sync to all other sources
    await this.propagateConfig(config);
  }
}
```

#### 2.3 Implement Real-time Bridge
```javascript
// Bridge WebSocket messages to existing UI
class RealtimeBridge {
  constructor() {
    if (FastAPIIntegration.enabled) {
      FastAPIClient.on('stats', this.handleStats.bind(this));
      FastAPIClient.on('config', this.handleConfig.bind(this));
      FastAPIClient.on('performance_metrics', this.handleMetrics.bind(this));
    }
  }

  handleStats(data) {
    // Route to existing UIUpdater
    const formattedStats = this.formatStats(data);
    UIUpdater.updateSummaryCards(formattedStats);
  }
}
```

### Phase 3: Testing & Validation (1-2 days)
**Goal**: Ensure both modes work correctly

#### 3.1 Create Mode-Aware Tests
```javascript
// tests/fastapi-integration.test.js
describe('FastAPI Integration', () => {
  describe.each([
    ['Legacy Mode', false],
    ['FastAPI Mode', true]
  ])('%s', (mode, enabled) => {
    beforeEach(() => {
      FastAPIIntegration.enabled = enabled;
    });

    it('should fetch data correctly', async () => {
      // Test works in both modes
    });
  });
});
```

#### 3.2 Add Integration Smoke Tests
```javascript
// Verify critical paths work in both modes
const criticalPaths = [
  'Dashboard loads',
  'Data refreshes',
  'Configuration updates',
  'Real-time updates (if available)'
];
```

### Phase 4: Gradual Enhancement (Ongoing)
**Goal**: Incrementally add FastAPI features

#### 4.1 Performance Metrics Integration
```javascript
// Only if FastAPI is enabled
if (FastAPIIntegration.enabled) {
  // Add performance dashboard
  // Add server-side metrics
  // Add WebSocket latency tracking
}
```

#### 4.2 Enhanced Error Handling
```javascript
// Centralized error handler
class ErrorHandler {
  handle(error) {
    if (FastAPIIntegration.enabled && error.validationErrors) {
      // Show FastAPI validation errors nicely
    } else {
      // Use existing error handling
    }
  }
}
```

## File Structure

```
assets/js/
├── fastapi-integration.js      # Central integration module
├── api-interface.js           # Unified API interface
├── adapters/
│   ├── fastapi-adapter.js     # FastAPI implementation
│   └── legacy-adapter.js      # Existing implementation
├── bridges/
│   ├── realtime-bridge.js     # WebSocket to UI bridge
│   └── config-bridge.js       # Configuration sync
└── api-client-fastapi.js      # Fixed FastAPI client
```

## Configuration Approach

### Single Configuration File
```javascript
// config/app-config.js
export const AppConfig = {
  // Feature flags
  features: {
    fastapi: false,  // Main toggle
    realtime: true,
    performanceMetrics: true
  },

  // API settings
  api: {
    legacy: {
      corsProxy: 'http://localhost:8889',
      kibanaUrl: 'https://...'
    },
    fastapi: {
      baseUrl: 'http://localhost:8000',
      wsUrl: 'ws://localhost:8000/ws'
    }
  },

  // Dashboard settings (shared)
  dashboard: {
    refreshInterval: 300000,
    criticalThreshold: -80,
    warningThreshold: -50
  }
};
```

### Environment Detection
```javascript
// Auto-detect best mode
async function detectOptimalMode() {
  // Try FastAPI first
  if (await checkFastAPIHealth()) {
    return 'fastapi';
  }

  // Fall back to legacy
  if (await checkCorsProxy()) {
    return 'legacy';
  }

  return 'offline';
}
```

## Migration Commands

### Quick Toggle Between Modes
```bash
# Enable FastAPI mode
npm run fastapi:enable

# Disable FastAPI mode
npm run fastapi:disable

# Check current mode
npm run fastapi:status
```

### Development Helpers
```javascript
// Add to package.json
{
  "scripts": {
    "dev:legacy": "npm run dev",
    "dev:fastapi": "FASTAPI_MODE=true npm run dev",
    "test:both": "npm test && FASTAPI_MODE=true npm test",
    "fastapi:enable": "node scripts/enable-fastapi.js",
    "fastapi:disable": "node scripts/disable-fastapi.js"
  }
}
```

## Testing Strategy

### 1. Parallel Testing
- Run all tests in both modes
- Ensure feature parity
- Track performance differences

### 2. A/B Testing
- Random assignment to modes
- Collect metrics on reliability
- User feedback on performance

### 3. Gradual Rollout
```javascript
// Percentage-based rollout
function shouldUseFastAPI() {
  const rolloutPercentage = 10; // Start with 10%
  const userHash = hashUserId(getUserId());
  return (userHash % 100) < rolloutPercentage;
}
```

## Monitoring & Rollback

### Health Metrics
```javascript
class IntegrationMonitor {
  metrics = {
    mode: 'legacy',
    errors: [],
    performance: {},
    availability: {}
  };

  report() {
    // Send to analytics
    // Log to console in dev
    // Alert on critical issues
  }
}
```

### Quick Rollback
```javascript
// If issues detected, automatically disable
if (criticalErrorCount > threshold) {
  FastAPIIntegration.disable();
  console.error('FastAPI disabled due to errors');
}
```

## Success Criteria

1. **Zero Disruption**: Existing functionality unchanged
2. **Easy Toggle**: Switch modes without code changes
3. **Performance**: FastAPI mode should be faster
4. **Reliability**: Both modes equally stable
5. **Maintainability**: Clear separation of concerns

## Timeline

- **Week 1**: Foundation & WebSocket fixes
- **Week 2**: Integration layer & testing
- **Week 3**: Documentation & rollout prep
- **Week 4**: Gradual rollout & monitoring

## Next Steps

1. Create `fastapi-integration.js` module
2. Fix WebSocket implementation in `api-client-fastapi.js`
3. Create unified API interface
4. Add feature flag to configuration
5. Update tests to run in both modes
