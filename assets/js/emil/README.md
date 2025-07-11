# EMIL Phase 1 - EID Registry & Discovery Engine

## Overview

EMIL (EID-Centric Monitoring Intelligence Layer) Phase 1 implements a high-performance EID discovery and selection system using vanilla TypeScript. This implementation replaces the existing array-based search with a Trie data structure for sub-millisecond autocomplete.

## Architecture

### Core Components

1. **RadixTrie** (`trie/radix-trie.ts`)
   - Sub-millisecond prefix search
   - Fuzzy search with scoring
   - Frequency tracking for hot EID detection
   - Memory-efficient storage for 10k+ EIDs

2. **EIDRegistry** (`eid-registry/eid-registry.ts`)
   - Central registry for all EID management
   - Hot EID tracking with ML-ready scoring algorithm
   - Recent EID history
   - Hierarchical organization (namespace → radset → rad → eid)
   - State persistence support

3. **EIDParser** (`utils/eid-parser.ts`)
   - Parse GoDaddy RAD naming conventions
   - Format: `namespace.radset.radId.subaction.action`
   - Validation and hierarchy extraction
   - Human-readable display names

4. **VirtualScroll** (`ui/virtual-scroll.ts`)
   - Handle 10k+ EIDs with smooth 60fps scrolling
   - Memory-efficient rendering (only visible items)
   - Configurable item height and buffer

5. **EIDSelector** (`ui/eid-selector.ts`)
   - Complete UI for EID search and selection
   - Trie-powered autocomplete with highlighting
   - Hot and Recent EID sections
   - Multi-select with bulk operations
   - Virtual scrolling integration

## Features

### Sub-millisecond Search
- Trie-based prefix search optimized for EID patterns
- Fuzzy search with intelligent scoring
- Match highlighting in suggestions

### Hot EID Tracking
- Frequency-based scoring with recency boost
- Trend detection (rising/stable/falling)
- ML-ready architecture for future enhancements

### Virtual Scrolling
- Handles 10,000+ EIDs without performance degradation
- Smooth 60fps scrolling
- Minimal memory footprint

### Bulk Operations
- Multi-select with checkboxes
- Select all/clear all functionality
- Keyboard navigation support

## Usage

### Basic Setup

```typescript
import { initializeEMIL } from './assets/js/emil/index.js';

// Initialize with mock data
const container = document.getElementById('eid-selector-container');
const { registry, selector } = await initializeEMIL({
  container,
  mockData: true
});

// Handle selection
selector.onSelect = (selectedEIDs) => {
  console.log('User selected:', selectedEIDs);
};
```

### Advanced Usage

```typescript
import { EIDRegistry, EIDSelector, EIDParser } from './assets/js/emil/index.js';

// Create registry
const registry = new EIDRegistry();

// Load your EID data
const eids = await fetchEIDsFromElasticsearch();
for (const eid of eids) {
  const metadata = EIDParser.createMetadata(eid, {
    frequency: eid.doc_count,
    lastSeen: new Date(eid.last_event_time)
  });
  registry.addEID(metadata);
}

// Create selector UI
const selector = new EIDSelector({
  container: document.getElementById('container'),
  registry,
  multiSelect: true,
  showHotSection: true,
  showRecentSection: true,
  onSelect: (eids) => {
    // Handle selection
    createDashboard(eids);
  }
});
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

## Development

### Building

```bash
# TypeScript compilation
npx tsc -p assets/js/emil/tsconfig.json

# Run tests
npm test -- assets/js/emil
```

### Testing

```bash
# Run all EMIL tests
npm test -- --run assets/js/emil

# Run with coverage
npm test -- --coverage assets/js/emil

# Watch mode
npm test -- --watch assets/js/emil
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

## Troubleshooting

### Common Issues

1. **Search not working**
   - Ensure EIDs are properly loaded into registry
   - Check console for parsing errors
   - Verify Trie initialization

2. **Performance issues**
   - Check total EID count
   - Ensure virtual scrolling is enabled
   - Monitor memory usage

3. **UI not rendering**
   - Verify container element exists
   - Check for CSS conflicts
   - Ensure TypeScript is compiled

## License

This implementation is part of the VH RAD Traffic Monitor project.