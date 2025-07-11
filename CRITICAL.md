## Developer Ticket: EID-Centric Monitoring Intelligence Layer (EMIL)

**Ticket ID**: ARCH-2025-001
**Priority**: P0 - Critical Path
**Epic**: Replace Formula Builder with Native ES|QL Intelligence Layer

### Executive Technical Context

The current formula builder represents 2,300+ lines of translation logic that impedes direct Elasticsearch access. This ticket implements an **EID-Centric Monitoring Intelligence Layer (EMIL)** that leverages ES|QL's native capabilities while solving the fundamental problem: **EID discovery and rapid health assessment**. The solution transforms monitoring from query construction to intent expression.

### Architectural Specification

#### Core Architecture Pattern: Three-Layer Intelligence Stack

```typescript
interface EMILArchitecture {
  // Layer 1: EID Registry & Discovery Engine
  eidRegistry: {
    activeEIDs: Map<string, EIDMetadata>;
    hotEIDs: PriorityQueue<EID>; // ML-ranked by query frequency
    eidSearch: TrieSearchIndex; // Sub-ms autocomplete
    eidCategories: HierarchicalClassifier; // RAD/RADset mapping
  };

  // Layer 2: Intent-to-Query Translator
  queryEngine: {
    templates: ES_QL_TemplateLibrary;
    baselineCalculator: TimeSeriesComparator;
    cacheLayer: EdgeComputeCache;
  };

  // Layer 3: Visualization Pipeline
  renderPipeline: {
    dataShaper: StreamProcessor;
    vizLibrary: LightweightChartAdapter;
    exportBridge: GrafanaCompatibilityLayer;
  };
}
```

### Implementation Deliverables

#### EID Registry Infrastructure

**1.1 Build EID Discovery Engine**
```typescript
class EIDRegistry {
  private trie: RadixTrie<EIDMetadata>;
  private hotCache: LRUCache<string, EIDStats>;

  async initialize() {
    // Query all EIDs from last 30 days using ES|QL
    const eidQuery = `
      FROM logs-*
      | WHERE @timestamp > NOW() - INTERVAL 30 DAYS
      | STATS doc_count = COUNT(*) BY eid
      | SORT doc_count DESC
      | LIMIT 10000
    `;

    // Build trie for instant search
    this.buildSearchIndex(results);

    // ML ranking for "hot" EIDs
    this.computeHotScore(results);
  }

  // Sub-ms autocomplete with fuzzy matching
  search(prefix: string): EIDSuggestion[] {
    return this.trie.prefixSearch(prefix)
      .scoredBy(this.hotCache)
      .limit(10);
  }
}
```

**1.2 Implement RAD/RADset Hierarchy Mapping**
- Parse EID naming conventions to auto-classify
- Build hierarchical navigation (RADset → RAD → EID)
- Visual tree representation for discovery

**1.3 Create React Component for EID Selection**
```typescript
const EIDSelector: React.FC = () => {
  // Virtualized list for 10k+ EIDs
  // Instant search with highlighting
  // Recent/Favorite EIDs section
  // Bulk selection for comparison
};
```

#### Phase 2: ES|QL Template Engine (Days 6-10)

**2.1 Build Core Query Templates**
```typescript
const queryTemplates = {
  healthCheck: {
    template: `
      FROM logs-{{index}}
      | WHERE eid == "{{eid}}"
        AND @timestamp > NOW() - INTERVAL {{comparison_window}}
      | STATS
          current_count = COUNT(*),
          avg_latency = AVG(latency),
          error_rate = COUNT(*) WHERE status >= 400 / COUNT(*)
      | EVAL health_score = CASE(
          error_rate > {{error_threshold}}, "CRITICAL",
          current_count < {{traffic_threshold}}, "WARNING",
          "HEALTHY"
        )
    `,
    parameters: {
      index: { default: '*', type: 'index_pattern' },
      eid: { required: true, type: 'eid' },
      comparison_window: { default: '1h', type: 'interval' },
      error_threshold: { default: 0.05, type: 'percentage' },
      traffic_threshold: { default: 100, type: 'number' }
    }
  },

  baselineComparison: {
    template: `
      WITH baseline AS (
        FROM logs-{{index}}
        | WHERE eid == "{{eid}}"
          AND @timestamp >= "{{baseline_start}}"
          AND @timestamp <= "{{baseline_end}}"
        | STATS baseline_avg = AVG(COUNT(*))
      ),
      current AS (
        FROM logs-{{index}}
        | WHERE eid == "{{eid}}"
          AND @timestamp > NOW() - INTERVAL {{current_window}}
        | STATS current_avg = AVG(COUNT(*))
      )
      | EVAL
          deviation_percent = (current_avg - baseline_avg) / baseline_avg * 100,
          status = CASE(
            deviation_percent < -50, "TRAFFIC_DROP",
            deviation_percent > 200, "TRAFFIC_SPIKE",
            "NORMAL"
          )
    `
  },

  abTestTracking: {
    template: `
      FROM experiments-*
      | WHERE eid == "{{eid}}"
        AND experiment_id == "{{experiment_id}}"
      | STATS
          conversions = COUNT(*) WHERE converted == true,
          total = COUNT(*),
          conversion_rate = conversions / total
        BY variant
      | SORT conversion_rate DESC
    `
  }
};
```

**2.2 Implement Smart Caching Layer**
```typescript
class EdgeComputeCache {
  private cache: Map<string, CachedResult>;
  private invalidationRules: InvalidationStrategy[];

  async get(query: string, params: QueryParams): Promise<Results> {
    const cacheKey = this.computeKey(query, params);

    // Check if data is fresh enough based on query type
    if (this.isFresh(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Execute with automatic cache warming
    const results = await this.execute(query, params);

    // Predictive prefetch for related queries
    this.prefetchRelated(query, params);

    return results;
  }
}
```

#### Phase 3: Visualization Pipeline (Days 11-15)

**3.1 Build Lightweight Chart Adapter**
```typescript
class VizPipeline {
  // Use Apache ECharts for performance
  private charts = new EChartsAdapter();

  async renderHealthDashboard(eids: string[]) {
    // Parallel ES|QL execution
    const queries = eids.map(eid => ({
      query: queryTemplates.healthCheck,
      params: { eid }
    }));

    const results = await Promise.all(
      queries.map(q => this.cache.get(q))
    );

    // Real-time streaming updates
    return this.charts.render({
      type: 'health-matrix',
      data: results,
      updateInterval: 5000,
      animations: false // Performance
    });
  }
}
```

**3.2 Create Main Dashboard Component**
```typescript
const MonitoringDashboard: React.FC = () => {
  return (
    <div className="emil-dashboard">
      <EIDSelector onSelect={handleEIDSelection} />

      <QuickActions>
        <HealthCheck eids={selectedEIDs} />
        <BaselineComparison eids={selectedEIDs} />
        <CreateDashboard eids={selectedEIDs} />
      </QuickActions>

      <RADSetView>
        {/* Hierarchical view of all RADsets/RADs */}
      </RADSetView>

      <ActiveMonitors>
        {/* Real-time view of all active monitoring */}
      </ActiveMonitors>
    </div>
  );
};
```

### Technical Implementation Requirements

#### Performance Optimizations
1. **Virtual scrolling** for EID lists (react-window)
2. **Web Workers** for data processing
3. **Request debouncing** with intelligent batching
4. **Differential updates** for real-time data
5. **Canvas rendering** for high-frequency updates

#### Data Flow Architecture
```
User Intent → Template Selection → ES|QL Generation →
Edge Cache → Elasticsearch → Stream Processing →
Visualization → Interactive Dashboard
```

#### Integration Points
1. **Elasticsearch**: Direct ES|QL via fetch with SID cookie
4. **Non-ES Sources**: Adapter pattern for external data

### Success Metrics
- **EID Discovery Time**: <2 seconds (from 5+ minutes)
- **Health Check Latency**: <100ms (from 3+ seconds)
- **Dashboard Creation**: <30 seconds (from 15+ minutes)
- **Query Performance**: 10x improvement via ES|QL
- **Code Reduction**: 80% less code than formula builder

### Migration Strategy
2. **EID registry population** from historical data
3. **Template library** seeded from common queries
5. **Complete cutover** after 2-week validation

### Risk Mitigation
- **Fallback**: Keep formula builder dormant for 30 days
- **Monitoring**: Track query performance regression
- **Training**: 1-hour video walkthrough for team
- **Documentation**: Interactive tutorial built-in

### Why This Architecture Wins

The **EID-Centric Monitoring Intelligence Layer** solves the actual problem: developers struggle to find EIDs and assess health quickly. By making EID discovery instant and providing pre-built ES|QL templates, we eliminate the cognitive overhead while maintaining full Elasticsearch power. The edge caching and streaming architecture ensure sub-100ms response times, while the template system grows organically with your monitoring needs.

This isn't just a formula builder replacement—it's a **monitoring nervous system** that learns your EID patterns, predicts your queries, and transforms intent into insights at the speed of thought.
