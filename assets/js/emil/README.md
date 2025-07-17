# EMIL - EID Monitoring Intelligence Layer

## Overview

EMIL (EID-Centric Monitoring Intelligence Layer) is a comprehensive system for monitoring, querying, and managing EIDs (Event IDs) in the VH RAD Traffic Monitor. It provides high-performance EID discovery, ES|QL query building, and automated metrics tracking with a complete registry system.

## Architecture

### Core Components

#### 1. Query Engine (`query-engine/`)
- **ESQLQueryBuilder**: Build ES|QL queries from intents or templates
- **QueryExecutor**: Execute queries with caching and retry logic
- **Validation**: Type-safe parameter validation
- **Error Handling**: Custom error classes for better debugging

#### 2. EID Registry System (`eid-registry/`)
- **EIDRegistryService**: Complete CRUD operations for EID management
- **Classification System**: RAD-only, Experiment-only, or Both
- **Status Tracking**: Testing, Live, or Old status
- **Metrics Storage**: Automatic storage of query results
- **PostgreSQL Schema**: Full database design with views and indexes

#### 3. Search & Discovery
- **RadixTrie** (`trie/radix-trie.ts`): Sub-millisecond prefix search
- **EIDRegistry** (`eid-registry/eid-registry.ts`): Central registry with hot EID tracking
- **EIDParser** (`utils/eid-parser.ts`): Parse RAD naming conventions

#### 4. UI Components
- **EIDSelector** (`ui/eid-selector.ts`): Trie-powered autocomplete
- **QueryPanel** (`ui/query-panel.ts`): Quick actions for queries
- **QueryResultsViewer** (`ui/query-results-viewer.ts`): Result visualization
- **EIDRegistryUI** (`eid-registry/eid-registry-ui.ts`): Registry management interface
- **VirtualScroll** (`ui/virtual-scroll.ts`): Handle 10k+ EIDs efficiently

#### 5. Query Templates (`esql/`)
- Pre-defined templates for common monitoring scenarios
- Health checks, baseline comparisons, trend analysis
- Performance metrics and A/B test comparisons

## Features

### EID Classification & Registry
- **Binary Classification**: RAD (10), Experiment (01), or Both (11)
- **Status Management**: Testing, Live, or Old
- **Automatic Metrics**: Store query results as EID metrics
- **Comprehensive Search**: Filter by type, status, health, tags
- **Batch Operations**: Update multiple EIDs at once

### ES|QL Query Engine
- **Intent-Based Queries**: Build from high-level intents
- **Template System**: Pre-defined templates for common queries
- **Type-Safe Validation**: Validate all parameters before execution
- **Smart Caching**: Configurable TTL with automatic cleanup
- **Error Recovery**: Retry logic with exponential backoff

### Sub-millisecond Search
- Trie-based prefix search optimized for EID patterns
- Fuzzy search with intelligent scoring
- Match highlighting in suggestions
- Hot EID tracking with ML-ready scoring

### Performance Monitoring
- **Health Scores**: 0-100 scoring with status indicators
- **Latency Tracking**: Average, P95, P99 percentiles
- **Error Rates**: Success/failure ratio tracking
- **Traffic Analysis**: Baseline comparisons and trend detection
- **Real-time Alerts**: Critical status detection

### UI Components
- Virtual scrolling for 10k+ EIDs
- Multi-select with bulk operations
- Interactive query results with visualizations
- Export to CSV functionality

## Usage

### Quick Start - Complete System

```typescript
import { initializeEMIL } from './assets/js/emil/index.js';
import { ESQLQueryBuilder, QueryExecutor } from './assets/js/emil/query-engine/index.js';
import { EIDRegistryService, EIDMetricsStore } from './assets/js/emil/eid-registry/index.js';

// Initialize EMIL with registry
const container = document.getElementById('eid-container');
const { registry, selector } = await initializeEMIL({
  container,
  mockData: true
});

// Initialize services
const registryService = new EIDRegistryService('/api/eid-registry');
const metricsStore = new EIDMetricsStore(registryService);

// Handle EID selection and run queries
selector.onSelect = async (selectedEIDs) => {
  // Build and execute health check
  const query = ESQLQueryBuilder.buildFromIntent({
    action: 'health-check',
    eids: selectedEIDs,
    parameters: { time_window: '1h' }
  });
  
  const result = await QueryExecutor.execute(query);
  
  // Automatically store metrics
  await metricsStore.processQueryResult(result, 'healthCheck', '1h');
};
```

### EID Registry Management

```typescript
import { EIDRegistryService, EIDType, EIDStatus } from './assets/js/emil/eid-registry/index.js';

const registryService = new EIDRegistryService();

// Register a new EID
await registryService.registerEID({
  id: 'checkout.payment.v2.success',  // From detail.event.data.traffic.eid.keyword
  name: 'Checkout Payment V2 Success',
  is_rad: true,      // Revenue acceleration
  is_experiment: true, // Also an experiment
  status: EIDStatus.TESTING,
  description: 'New payment flow with improved conversion',
  tags: ['checkout', 'payment', 'revenue'],
  owner: 'payments-team'
});

// Search for problematic RAD EIDs
const criticalRADs = await registryService.searchEIDs({
  type: EIDType.RAD_ONLY,
  status: EIDStatus.LIVE,
  health_status: ['CRITICAL', 'WARNING']
});
```

### Query Templates

```typescript
import { ESQLQueryBuilder } from './assets/js/emil/query-engine/index.js';

// Health Check - Monitor EID health status
const healthQuery = ESQLQueryBuilder.buildFromTemplate('healthCheck', {
  eids: ['checkout.success', 'cart.add'],
  time_window: '2h',
  critical_error_threshold: 0.1,  // 10% errors = critical
  low_traffic_threshold: 100      // < 100 events = low traffic
});

// Baseline Comparison - Compare current vs historical
const baselineQuery = ESQLQueryBuilder.buildFromTemplate('baselineComparison', {
  eids: ['homepage.view'],
  baseline_start: '2024-01-01T00:00:00Z',
  baseline_end: '2024-01-07T23:59:59Z',
  current_window: '24h',
  traffic_drop_threshold: 30  // Alert on 30% traffic drop
});

// Performance Metrics - Detailed latency analysis
const perfQuery = ESQLQueryBuilder.buildFromTemplate('performanceMetrics', {
  eids: ['api.search', 'api.recommendations'],
  time_window: '1h',
  timeout_threshold: 5000,    // 5s timeout
  critical_latency: 3000,     // 3s = critical
  warning_latency: 1500       // 1.5s = warning
});
```

### Continuous Monitoring

```typescript
import { continuousMonitoringExample } from './assets/js/emil/integration-example.js';

// Start monitoring all live EIDs every 5 minutes
continuousMonitoringExample();

// Or create custom monitoring
const monitor = async () => {
  const liveEIDs = await registryService.searchEIDs({ 
    status: EIDStatus.LIVE 
  });
  
  for (const eid of liveEIDs) {
    const query = ESQLQueryBuilder.buildFromIntent({
      action: 'health-check',
      eids: [eid.id],
      parameters: { time_window: '15m' }
    });
    
    const result = await QueryExecutor.execute(query);
    await metricsStore.processQueryResult(result, 'healthCheck', '15m');
  }
};

// Run every 5 minutes
setInterval(monitor, 5 * 60 * 1000);
```

### Search API

```typescript
// Search with options
const suggestions = registry.search('pandc.vnext', {
  maxResults: 20,
  filterByNamespace: 'pandc',
  sortBy: 'frequency' // or 'alphabetical', 'recent'
});

// Get hot EIDs
const hotEIDs = registry.getHotEIDs(10);

// Get recent EIDs
const recentEIDs = registry.getRecentEIDs(5);

// Record usage (updates hot scores)
registry.recordUsage('pandc.vnext.recommendations.click');
```

### State Persistence

```typescript
// Export state
const state = registry.exportState();
localStorage.setItem('emil-state', JSON.stringify(state));

// Import state
const savedState = JSON.parse(localStorage.getItem('emil-state'));
registry.importState(savedState);
```

## Performance

### Benchmarks
- **Insert**: 10,000 EIDs in < 1 second
- **Search**: < 1ms for prefix search
- **UI Render**: 60fps with 10,000+ items
- **Memory**: ~10MB for 10,000 EIDs with metadata

### Optimizations
- Trie structure for O(k) search (k = query length)
- Virtual scrolling renders only visible items
- Debounced search input
- RAF-based scroll handling

## Integration with Existing Codebase

### Using with Formula Builder

```typescript
// Import EMIL
import { EIDRegistry } from './assets/js/emil/index.js';

// In formula-builder initialization
const registry = new EIDRegistry();

// Replace array search with Trie search
// Before:
const results = eids.filter(eid => eid.includes(query));

// After:
const results = registry.search(query).map(s => s.eid);
```

### Using with Dashboard

```typescript
// In dashboard-simplified.js
import { initializeEMIL } from './assets/js/emil/index.js';

// Add EID selector to dashboard
const eidContainer = document.createElement('div');
eidContainer.id = 'eid-selector';
document.querySelector('.dashboard-header').appendChild(eidContainer);

const { selector } = await initializeEMIL({
  container: eidContainer,
  mockData: false // Use real data
});

// Connect to existing filters
selector.onSelect = (eids) => {
  updateDashboardFilters({ eids });
};
```

## Database Schema

The EID Registry uses PostgreSQL with the following structure:

```sql
-- Main EID table
CREATE TABLE eid_registry.eids (
    id VARCHAR(255) PRIMARY KEY,  -- detail.event.data.traffic.eid.keyword
    name VARCHAR(255) NOT NULL UNIQUE,
    is_rad BOOLEAN NOT NULL,
    is_experiment BOOLEAN NOT NULL,
    type SMALLINT GENERATED,  -- 1=Experiment, 2=RAD, 3=Both
    status VARCHAR(20),       -- testing/live/old
    -- ... metadata fields
);

-- Metrics storage
CREATE TABLE eid_registry.eid_metrics (
    eid_id VARCHAR(255) REFERENCES eids(id),
    health_score NUMERIC(5,2),
    avg_latency NUMERIC(10,2),
    error_rate NUMERIC(5,4),
    -- ... other metrics
    calculated_at TIMESTAMP
);

-- Views for quick access
CREATE VIEW eid_latest_metrics AS ...
CREATE VIEW eids_with_metrics AS ...
```

See `eid-registry/schema.sql` for the complete schema.

## Development

### Building

```bash
# Build TypeScript
npm run build:emil

# Build specific modules
npx tsc -p assets/js/emil/tsconfig.json
```

### Testing

```bash
# Run all EMIL tests
npm run test:emil

# Run with coverage
npm test -- --coverage assets/js/emil

# Watch mode
npm test -- --watch assets/js/emil

# Test specific module
npm test -- query-engine
```

## Future Enhancements (Phase 2+)

1. **ML Scoring**
   - Replace heuristic scoring with ML model
   - User behavior learning
   - Anomaly detection for EIDs

2. **ES|QL Integration**
   - Query templates for common EID patterns
   - Direct ES|QL execution from selector

3. **Advanced Visualizations**
   - EID relationship graphs
   - Traffic flow visualizations
   - Real-time monitoring widgets

## API Reference

### RadixTrie<T>

```typescript
class RadixTrie<T> {
  insert(key: string, value: T): void
  search(key: string): T | undefined
  prefixSearch(prefix: string, maxResults?: number): SearchResult<T>[]
  fuzzySearch(query: string, maxResults?: number): SearchResult<T>[]
  updateFrequency(key: string, increment?: number): void
  getAllKeys(): string[]
  getSize(): number
  clear(): void
}
```

### EIDRegistry

```typescript
class EIDRegistry {
  initialize(historicalData?: EIDMetadata[]): Promise<void>
  addEID(metadata: EIDMetadata): void
  search(query: string, options?: EIDSearchOptions): EIDSuggestion[]
  getHotEIDs(limit?: number): HotEIDEntry[]
  getRecentEIDs(limit?: number): EIDMetadata[]
  getHierarchy(): EIDHierarchy[]
  recordUsage(eid: string): void
  exportState(): RegistryState
  importState(state: RegistryState): void
}
```

### EIDSelector

```typescript
class EIDSelector {
  constructor(options: EIDSelectorOptions)
  getSelectedEIDs(): string[]
  setSelectedEIDs(eids: string[]): void
  destroy(): void
}
```

## Error Handling

EMIL provides comprehensive error handling with custom error classes:

```typescript
import { QueryErrorFactory } from './assets/js/emil/query-engine/index.js';

try {
  const query = ESQLQueryBuilder.buildFromIntent(intent);
  const result = await QueryExecutor.execute(query);
} catch (error) {
  // Get user-friendly error message
  const message = QueryErrorFactory.getUserMessage(error);
  console.error(message);
  
  // Check error type
  if (QueryErrorFactory.isQueryEngineError(error)) {
    switch (error.code) {
      case 'TEMPLATE_NOT_FOUND':
        // Handle missing template
        break;
      case 'PARAMETER_VALIDATION_FAILED':
        // Handle validation error
        console.log('Invalid parameter:', error.details?.parameterName);
        break;
    }
  }
}
```

## Best Practices

### 1. EID Naming Convention
- Use dot notation: `namespace.radset.action.subaction`
- Keep names descriptive but concise
- Examples: `checkout.payment.success`, `search.api.autocomplete`

### 2. Query Optimization
- Use appropriate cache TTLs (60s for real-time, 5m for dashboards)
- Batch EID queries when possible
- Enable virtual scrolling for large result sets

### 3. Registry Management
- Always classify EIDs (RAD, Experiment, or Both)
- Update status promptly (Testing → Live → Old)
- Use tags for easier filtering and discovery
- Set meaningful owners for accountability

### 4. Monitoring Best Practices
- Run health checks on all live EIDs regularly
- Set appropriate thresholds for your use case
- Store metrics for historical analysis
- Act on critical alerts immediately

## Troubleshooting

### Common Issues

1. **Query Failures**
   - Check EID exists in Elasticsearch
   - Verify time range is valid
   - Ensure proper permissions for ES|QL queries
   - Check query syntax with `validateQuery()`

2. **Registry Issues**
   - Ensure PostgreSQL connection is active
   - Verify unique EID names
   - Check classification is set (is_rad OR is_experiment)
   - Validate EID format matches Elasticsearch field

3. **Performance Issues**
   - Enable query caching for repeated queries
   - Use virtual scrolling for large datasets
   - Limit result sets with appropriate filters
   - Monitor cache hit rates

4. **UI Problems**
   - Verify container elements exist
   - Check for CSS conflicts
   - Ensure TypeScript is compiled
   - Clear browser cache if needed

## License

This implementation is part of the VH RAD Traffic Monitor project.