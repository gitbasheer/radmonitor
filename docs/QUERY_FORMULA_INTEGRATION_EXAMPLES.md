# Query Formula Integration Examples

This document provides concrete examples of how the Advanced Query Filtering System integrates with the existing vh-rad-traffic-monitor codebase.

## 1. Extending the Existing QueryBuilder

### Current Implementation (data-layer.js)
```javascript
const QueryBuilder = {
    base() {
        return {
            size: 0,
            query: { bool: { filter: [] } },
            aggs: {}
        };
    },
    
    wildcard(query, field, pattern) {
        query.query.bool.filter.push({
            wildcard: { [field]: { value: pattern } }
        });
        return query;
    }
    // ... other methods
}
```

### Enhanced with Formula Support
```javascript
// New methods to add to QueryBuilder
const QueryBuilder = {
    // ... existing methods ...
    
    // Add metric aggregation
    metric(query, name, type, field, options = {}) {
        const agg = { [type]: { field } };
        
        // Handle percentile special case
        if (type === 'percentile' && options.percentile) {
            agg.percentiles = { 
                field, 
                percents: [options.percentile] 
            };
        }
        
        // Handle sub-aggregations
        if (options.filter) {
            query.aggs[name] = {
                filter: options.filter,
                aggs: { value: agg }
            };
        } else {
            query.aggs[name] = agg;
        }
        
        return query;
    },
    
    // Add pipeline aggregation for calculations
    pipeline(query, name, type, options) {
        query.aggs[name] = {
            [type]: options
        };
        return query;
    },
    
    // Add date histogram for time series
    dateHistogram(query, name, field, interval, options = {}) {
        query.aggs[name] = {
            date_histogram: {
                field,
                interval,
                ...options
            }
        };
        return query;
    }
}
```

## 2. Formula to Query Translation

### Example 1: Error Rate Calculation
**Formula**: `count(kql='status:error') / count() * 100`

**Translation Process**:
```javascript
// In formula-translator.js
function translateFormula(ast) {
    const query = QueryBuilder.base();
    
    // For count() - total count
    QueryBuilder.metric(query, 'total_count', 'value_count', '_id');
    
    // For count(kql='status:error') - filtered count
    QueryBuilder.metric(query, 'error_count', 'value_count', '_id', {
        filter: { term: { status: 'error' } }
    });
    
    return {
        query,
        postProcess: (response) => {
            const total = response.aggregations.total_count.value;
            const errors = response.aggregations.error_count.value;
            return (errors / total) * 100;
        }
    };
}
```

### Example 2: RAD Type Comparison
**Formula**: `average(response_time, kql='rad_type:venture_feed') - average(response_time, kql='rad_type:cart_recommendations')`

**Generated Query**:
```javascript
{
    "size": 0,
    "aggs": {
        "venture_avg": {
            "filter": {
                "wildcard": {
                    "detail.event.data.traffic.eid.keyword": {
                        "value": "pandc.vnext.recommendations.feed.feed*"
                    }
                }
            },
            "aggs": {
                "value": {
                    "avg": {
                        "field": "response_time"
                    }
                }
            }
        },
        "cart_avg": {
            "filter": {
                "wildcard": {
                    "detail.event.data.traffic.eid.keyword": {
                        "value": "pandc.vnext.recommendations.cart*"
                    }
                }
            },
            "aggs": {
                "value": {
                    "avg": {
                        "field": "response_time"
                    }
                }
            }
        }
    }
}
```

## 3. Integration with Existing API Interface

### Current API Interface (api-interface.js)
```javascript
export class UnifiedAPI {
    async query(request) {
        // Current implementation
        const query = DataLayer.buildQuery(request);
        return await this.client.executeQuery(query);
    }
}
```

### Enhanced with Formula Support
```javascript
export class UnifiedAPI {
    async query(request) {
        // Check if request contains a formula
        if (request.formula) {
            return await this.executeFormula(request.formula, request.context);
        }
        
        // Fall back to existing implementation
        const query = DataLayer.buildQuery(request);
        return await this.client.executeQuery(query);
    }
    
    async executeFormula(formula, context) {
        // Parse the formula
        const parser = new FormulaParser(formula);
        const ast = parser.parse();
        
        // Validate against current configuration
        const validator = new FormulaValidator(ConfigService.getConfig());
        validator.validate(ast);
        
        // Translate to Elasticsearch query
        const translator = new FormulaTranslator(context);
        const { query, postProcess } = translator.translate(ast);
        
        // Execute query
        const response = await this.client.executeQuery(query);
        
        // Apply post-processing
        return postProcess(response);
    }
}
```

## 4. UI Integration Examples

### Adding Formula Bar to Dashboard
```javascript
// In dashboard-main.js
function initializeFormulaBar() {
    const formulaBar = document.createElement('div');
    formulaBar.className = 'formula-bar';
    formulaBar.innerHTML = `
        <div class="formula-input-container">
            <input type="text" 
                   id="formula-input" 
                   placeholder="Enter formula: e.g., count(kql='status:error') / count() * 100"
                   class="formula-input">
            <button id="apply-formula" class="btn btn-primary">Apply</button>
            <button id="formula-help" class="btn btn-secondary">?</button>
        </div>
        <div id="formula-preview" class="formula-preview"></div>
    `;
    
    // Insert after existing controls
    const controls = document.querySelector('.dashboard-controls');
    controls.appendChild(formulaBar);
    
    // Wire up events
    document.getElementById('apply-formula').addEventListener('click', applyFormula);
    document.getElementById('formula-input').addEventListener('input', previewFormula);
}

async function applyFormula() {
    const formula = document.getElementById('formula-input').value;
    if (!formula) return;
    
    try {
        // Show loading state
        ui.showLoading('Applying formula...');
        
        // Execute formula
        const result = await api.query({
            formula: formula,
            context: {
                timeRange: TimeRangeUtils.getCurrentRange(),
                radTypes: getEnabledRadTypes()
            }
        });
        
        // Display results
        displayFormulaResults(result);
    } catch (error) {
        ui.showError(`Formula error: ${error.message}`);
    }
}
```

### Formula Builder Dialog
```javascript
// In filter-builder-ui.js
class FormulaBuilder {
    constructor() {
        this.selectedFunction = null;
        this.parameters = {};
    }
    
    render() {
        return `
            <div class="formula-builder">
                <div class="function-palette">
                    <h3>Functions</h3>
                    ${this.renderFunctionGroups()}
                </div>
                <div class="formula-workspace">
                    <h3>Formula</h3>
                    <div class="formula-visual" id="formula-visual"></div>
                    <div class="formula-text">
                        <code id="formula-code"></code>
                    </div>
                </div>
                <div class="field-selector">
                    <h3>Fields</h3>
                    ${this.renderAvailableFields()}
                </div>
            </div>
        `;
    }
    
    renderFunctionGroups() {
        const groups = {
            'Metrics': ['count', 'sum', 'average', 'min', 'max'],
            'Time Series': ['cumulative_sum', 'moving_average', 'differences'],
            'Math': ['+', '-', '*', '/', 'round', 'sqrt']
        };
        
        return Object.entries(groups).map(([group, functions]) => `
            <div class="function-group">
                <h4>${group}</h4>
                <div class="function-list">
                    ${functions.map(fn => `
                        <div class="function-item draggable" 
                             data-function="${fn}"
                             draggable="true">
                            ${fn}
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }
}
```

## 5. Real-time Formula Updates via WebSocket

### WebSocket Message Format
```javascript
// New message types for formula updates
const FormulaWebSocketMessages = {
    // Client -> Server: Subscribe to formula updates
    SUBSCRIBE_FORMULA: {
        type: 'subscribe_formula',
        formula: 'count(kql="status:error") / count() * 100',
        interval: 5000, // Update every 5 seconds
        context: {
            timeRange: 'now-15m',
            radTypes: ['venture_feed', 'cart_recommendations']
        }
    },
    
    // Server -> Client: Formula result update
    FORMULA_UPDATE: {
        type: 'formula_update',
        subscriptionId: 'formula_123',
        result: 23.5,
        timestamp: '2025-01-15T10:30:00Z',
        metadata: {
            executionTime: 125,
            documentsScanned: 15000
        }
    }
};

// In WebSocket handler
function handleFormulaSubscription(ws, message) {
    const { formula, interval, context } = message;
    
    // Create subscription
    const subscription = {
        id: generateId(),
        formula,
        context,
        interval: setInterval(async () => {
            try {
                const result = await executeFormula(formula, context);
                ws.send(JSON.stringify({
                    type: 'formula_update',
                    subscriptionId: subscription.id,
                    result: result.value,
                    timestamp: new Date().toISOString(),
                    metadata: result.metadata
                }));
            } catch (error) {
                ws.send(JSON.stringify({
                    type: 'formula_error',
                    subscriptionId: subscription.id,
                    error: error.message
                }));
            }
        }, interval)
    };
    
    activeSubscriptions.set(subscription.id, subscription);
}
```

## 6. Caching Strategy for Formula Results

### Cache Implementation
```javascript
// In query-cache.js
class FormulaCache {
    constructor(redis) {
        this.redis = redis;
        this.localCache = new Map();
    }
    
    async get(formula, context) {
        const key = this.generateKey(formula, context);
        
        // Check local cache first
        if (this.localCache.has(key)) {
            const cached = this.localCache.get(key);
            if (Date.now() - cached.timestamp < cached.ttl) {
                return cached.value;
            }
        }
        
        // Check Redis
        const redisValue = await this.redis.get(key);
        if (redisValue) {
            const cached = JSON.parse(redisValue);
            this.localCache.set(key, cached);
            return cached.value;
        }
        
        return null;
    }
    
    async set(formula, context, value, ttl = 60000) {
        const key = this.generateKey(formula, context);
        const cached = {
            value,
            timestamp: Date.now(),
            ttl
        };
        
        // Store in both caches
        this.localCache.set(key, cached);
        await this.redis.setex(key, Math.ceil(ttl / 1000), JSON.stringify(cached));
    }
    
    generateKey(formula, context) {
        // Create deterministic cache key
        const normalized = {
            formula: formula.toLowerCase().replace(/\s+/g, ' '),
            timeRange: context.timeRange,
            radTypes: context.radTypes?.sort()
        };
        return `formula:${crypto.createHash('md5').update(JSON.stringify(normalized)).digest('hex')}`;
    }
}
```

## 7. Performance Monitoring Integration

### Formula Execution Metrics
```javascript
// In performance-monitor.js
class FormulaPerformanceMonitor {
    trackExecution(formula, executionTime, documentsScanned) {
        // Send to metrics collector
        metrics.record({
            metric: 'formula.execution',
            value: executionTime,
            tags: {
                formula_complexity: this.calculateComplexity(formula),
                documents_scanned: documentsScanned,
                cache_hit: false
            }
        });
        
        // Check for slow queries
        if (executionTime > 1000) {
            logger.warn('Slow formula execution', {
                formula,
                executionTime,
                suggestion: this.suggestOptimization(formula)
            });
        }
    }
    
    suggestOptimization(formula) {
        // Analyze formula for optimization opportunities
        if (formula.includes('count()') && !formula.includes('kql=')) {
            return 'Consider using value_count aggregation instead of count()';
        }
        
        if (formula.match(/sum\(.+\) \/ sum\(.+\)/)) {
            return 'Consider using a single query with sub-aggregations';
        }
        
        return null;
    }
}
```

## Conclusion

These examples demonstrate how the Advanced Query Filtering System seamlessly integrates with the existing codebase:

1. **Extends existing components** rather than replacing them
2. **Maintains backward compatibility** with current query patterns
3. **Leverages existing infrastructure** (WebSockets, caching, API)
4. **Follows established patterns** in the codebase
5. **Adds value incrementally** without disrupting current functionality

The implementation is designed to be:
- **Non-invasive**: Existing code continues to work
- **Progressive**: Features can be adopted gradually
- **Performant**: Built-in optimization and caching
- **Maintainable**: Clear separation of concerns
- **Testable**: Each component can be tested independently 