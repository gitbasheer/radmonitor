# JavaScript Module Architecture

## Overview

The RAD Monitor Dashboard uses a modern ES6 module architecture with centralized state management, dependency injection, and a clean separation of concerns. The architecture supports both legacy CORS proxy mode and FastAPI WebSocket mode through a unified interface.

## Module Dependency Graph

```
index.html
    └── main.js (Entry Point)
        ├── dashboard-main.js (Main Controller)
        │   ├── data-layer.js (State Management)
        │   ├── api-interface.js (Unified API)
        │   ├── config-manager.js (Configuration)
        │   ├── ui-updater.js (UI Updates)
        │   └── console-visualizer.js (Debug Viz)
        ├── api-client.js (Legacy API)
        ├── api-client-fastapi.js (FastAPI Client)
        ├── fastapi-integration.js (WebSocket Handler)
        ├── data-processor.js (Data Transformation)
        ├── time-range-utils.js (Time Utilities)
        └── config-service.js (Config Backend)
```

## Core Architecture Patterns

### 1. ES6 Module Pattern
All modules use ES6 `import`/`export` syntax with IIFE wrappers for encapsulation:

```javascript
// ESM: Import dependencies
import Dependency from './dependency.js';

// ESM: Converted from IIFE to ES module export
export const ModuleName = (() => {
    'use strict';
    
    // Private state and methods
    const privateState = {};
    
    // Public API
    return {
        publicMethod1,
        publicMethod2
    };
})();

// ESM: Export as default for convenience
export default ModuleName;
```

### 2. Initialization Order

1. **Browser loads `index.html`**
   - Includes `<script type="module" src="assets/js/main.js"></script>`

2. **`main.js` executes**
   - Imports all modules
   - Makes modules globally available for backward compatibility
   - Waits for DOM ready
   - Calls `Dashboard.init()`

3. **`Dashboard.init()` orchestrates initialization**
   ```javascript
   async function init() {
       // 1. Initialize unified API (selects FastAPI or Legacy)
       await unifiedAPI.initialize();
       
       // 2. Set up event listeners
       setupFastAPIListeners();
       setupStateListeners();
       
       // 3. Initialize configuration
       initializeConfiguration();
       
       // 4. Initialize UI components
       initializeUIComponents();
       
       // 5. Start monitoring
       startSystemMonitoring();
   }
   ```

4. **DataLayer initializes on first use**
   - Sets up state management
   - Configures event system
   - Initializes performance monitoring

## Module Responsibilities

### Entry Point

#### `main.js`
- **Purpose**: Browser entry point and module loader
- **Dependencies**: All application modules
- **Exports**: All modules for ES6 usage
- **Global**: Makes modules available on `window` object
- **Special**: Auto-runs examples and demos after 2-3 seconds

### Core Modules

#### `dashboard-main.js` (Main Controller)
- **Purpose**: Orchestrates all dashboard functionality
- **Dependencies**: DataLayer, UnifiedAPI, ConfigManager, UIUpdater
- **Key Functions**:
  - `init()` - Initialize dashboard
  - `refresh()` - Main refresh entry point
  - `setupStateListeners()` - React to DataLayer events
  - `startAutoRefresh()` - Timer management
- **State**: Manages timers and UI state

#### `data-layer.js` (State Management)
- **Purpose**: Centralized state management and query execution
- **Dependencies**: TimeRangeUtils, DataProcessor, ApiClient, UnifiedAPI
- **Key Components**:
  - `QueryBuilder` - Elasticsearch query construction
  - `ResponseParser` - Parse ES responses
  - `DataTransformer` - Transform data for UI
  - `QueryExecutor` - Execute queries with caching
- **State**: 
  - Query state (active, cached)
  - Performance metrics
  - Event listeners
- **Events**: `stateChange`, `searchComplete`, `error`

#### `api-interface.js` (Unified API)
- **Purpose**: Provides consistent API regardless of backend
- **Dependencies**: FastAPIIntegration, ApiClient, FastAPIClient
- **Pattern**: Adapter pattern for API implementations
- **Key Classes**:
  - `UnifiedAPI` - Main interface
  - `LegacyAdapter` - Wraps legacy ApiClient
  - `FastAPIAdapter` - Wraps FastAPI client
- **Initialization**: Auto-detects which API to use

### API Implementations

#### `api-client.js` (Legacy CORS Proxy)
- **Purpose**: Original API client using CORS proxy
- **Dependencies**: TimeRangeUtils
- **Features**:
  - Cookie management
  - CORS proxy detection
  - Direct Kibana access fallback
  - Query building

#### `api-client-fastapi.js` (FastAPI WebSocket)
- **Purpose**: WebSocket-based API client
- **Dependencies**: None (standalone)
- **Features**:
  - WebSocket connection management
  - Real-time updates
  - Configuration sync
  - Auto-reconnection

#### `fastapi-integration.js` (FastAPI Controller)
- **Purpose**: Manages FastAPI mode and WebSocket lifecycle
- **Dependencies**: FastAPIClient
- **Features**:
  - Mode switching (enable/disable)
  - WebSocket initialization
  - Event dispatching
  - State persistence

### Data Processing

#### `data-processor.js`
- **Purpose**: Process Elasticsearch data into dashboard format
- **Dependencies**: None (pure functions)
- **Key Functions**:
  - `processData()` - Main processing pipeline
  - `calculateScore()` - Traffic drop scoring
  - `determineStatus()` - Status classification
  - `getSummaryStats()` - Aggregate statistics

#### `time-range-utils.js`
- **Purpose**: Time range parsing and validation
- **Dependencies**: None (utility module)
- **Features**:
  - Parse relative time ranges (e.g., "now-6h")
  - Parse custom ranges (e.g., "-3h-6h")
  - Validate time range syntax
  - Format for display

### UI Layer

#### `ui-updater.js`
- **Purpose**: DOM manipulation and UI updates
- **Dependencies**: DataLayer (for performance metrics)
- **Responsibilities**:
  - Update summary cards
  - Update data table
  - Show/hide loading states
  - Update status indicators
  - Build Kibana URLs

#### `console-visualizer.js`
- **Purpose**: ASCII visualization in browser console
- **Dependencies**: None (standalone)
- **Features**:
  - ASCII bar charts
  - Color-coded output
  - Performance stats
  - Debug information

### Configuration

#### `config-manager.js`
- **Purpose**: Configuration management facade
- **Dependencies**: TimeRangeUtils, ConfigService
- **Pattern**: Compatibility layer over ConfigService
- **Features**:
  - Get/set configuration
  - Import/export JSON
  - Preset management
  - Validation

#### `config-service.js`
- **Purpose**: Centralized configuration with backend sync
- **Dependencies**: UnifiedAPI
- **Features**:
  - Local storage management
  - FastAPI backend sync
  - Change notifications
  - Default values

## State Management

### DataLayer State Flow

1. **Action Triggered**
   ```javascript
   DataLayer.logAction('QUERY_START', { queryId, timestamp });
   ```

2. **State Updated**
   ```javascript
   queryState.activeQueries.set(queryId, { status: 'executing' });
   ```

3. **Listeners Notified**
   ```javascript
   notifyListeners('stateChange', { path: 'activeQueries', value });
   ```

4. **UI Reacts**
   ```javascript
   DataLayer.addEventListener('searchComplete', (event) => {
       UIUpdater.updateDataTable(event.data);
   });
   ```

## Event System

### Global Events
- `DOMContentLoaded` - Initialize dashboard
- `fastapi:config` - Configuration updates from WebSocket
- `fastapi:stats` - Statistics updates from WebSocket
- `fastapi:data` - Data updates from WebSocket

### DataLayer Events
- `stateChange` - Any state modification
- `searchComplete` - Query execution success
- `error` - Query execution failure
- `actionTriggered` - State action logged

## Performance Optimizations

### 1. Query Caching
- Responses cached for 5 minutes by default
- Cache key includes query parameters
- Cache hit rate tracked in metrics

### 2. Lazy Loading
- Modules loaded on demand
- WebSocket connection deferred until needed
- Heavy visualizations loaded after core UI

### 3. Debouncing
- Configuration changes debounced
- Auto-refresh skipped if query in progress
- Health checks limited to 30-second intervals

## Error Handling

### Graceful Degradation
1. FastAPI unavailable → Fall back to legacy API
2. CORS proxy down → Use direct Kibana access
3. Authentication failed → Show cookie prompt
4. Network error → Display cached data

### Error Propagation
```javascript
try {
    const result = await DataLayer.executeQuery(query);
} catch (error) {
    // Logged to DataLayer state
    DataLayer.logAction('QUERY_ERROR', { error: error.message });
    
    // Propagated to UI
    notifyListeners('error', { searchType, error });
    
    // User-friendly message
    UIUpdater.hideLoading('Query failed - see console');
}
```

## Testing Considerations

### Module Isolation
- Each module exports pure functions where possible
- Dependencies injected, not hard-coded
- State changes observable through events

### Global Availability
```javascript
// All modules available globally for testing
window.DataLayer = DataLayer;
window.Dashboard = Dashboard;
window.ConfigManager = ConfigManager;
```

### Mock-Friendly Architecture
- API clients behind unified interface
- Time utilities in separate module
- UI updates in dedicated module

## Future Enhancements

### Planned Improvements
1. **TypeScript Migration** - Type definitions exist, full migration pending
2. **Web Workers** - Move data processing off main thread
3. **Service Worker** - Offline support and advanced caching
4. **Module Federation** - Dynamic module loading

### Extension Points
- Custom data processors via `DataProcessor` interface
- Additional API adapters via `UnifiedAPI`
- New visualizations via event listeners
- Custom time range formats via `TimeRangeUtils` 