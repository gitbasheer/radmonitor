# Formula Builder Subsystem - Exhaustive Analysis

## Executive Summary

The Formula Builder is a sophisticated subsystem within the RAD Traffic Monitor that enables users to create, validate, and execute complex data analysis formulas using a Kibana Lens-compatible syntax. It implements RAD (Recommend-A-Domain) patterns from GoDaddy, including entity-based architecture, synthesizer patterns for eligibility scoring, and comprehensive event tracking.

## Architecture Overview

### Core Architecture Pattern

The Formula Builder follows a **multi-layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     UI Layer (Web Components)                │
├─────────────────────────────────────────────────────────────┤
│                    Integration Layer                         │
├─────────────────────────────────────────────────────────────┤
│                      Core Layer                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Parser  │  │Validator │  │Synthesizer│  │ Functions│  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
├─────────────────────────────────────────────────────────────┤
│                   Translation Layer                          │
│                   (Query Builder)                            │
├─────────────────────────────────────────────────────────────┤
│                  Infrastructure Layer                        │
│  (Event Tracking, Experiments, Entities)                    │
└─────────────────────────────────────────────────────────────┘
```

## Core Components Deep Dive

### 1. AST (Abstract Syntax Tree) Implementation

The Formula Builder uses two parser implementations:

#### Basic Parser (`formula-parser.js`)
- **Algorithm**: Recursive descent parser
- **Precedence Handling**: Manual precedence climbing for operators
- **Features**:
  - Supports basic arithmetic and comparison operators
  - Function calls with positional and named arguments
  - Field references with dot notation
  - String and number literals

#### Enhanced Parser (`enhanced-ast-parser.js`)
- **Algorithm**: Tokenizer + Parser combination
- **Token Types**: 21 different token types including operators, literals, and keywords
- **Precedence Levels**: 9 levels (OR=1 to UNARY=9)
- **Security Features**:
  - Maximum formula length: 10,000 characters
  - Forbidden patterns detection (eval, Function, etc.)
  - Escape sequence handling in strings

**AST Node Types**:
```javascript
const NodeType = {
  FUNCTION_CALL: 'FunctionCall',
  BINARY_OP: 'BinaryOp',
  UNARY_OP: 'UnaryOp',
  FIELD_REF: 'FieldRef',
  LITERAL: 'Literal',
  IDENTIFIER: 'Identifier'
};
```

### 2. Validation System

The validation system has two implementations:

#### Basic Validator (`formula-validator.js`)
- Basic syntax validation
- Function parameter checking
- Type compatibility verification
- Semantic validation (division by zero, etc.)

#### Enhanced Validator (`enhanced-validator.js`)
**Security Configuration**:
```javascript
const SECURITY_CONFIG = {
  maxFormulaLength: 10000,
  maxNestingDepth: 20,
  maxFunctionCalls: 100,
  maxStringLength: 1000,
  maxArraySize: 1000,
  forbiddenPatterns: [/* regex patterns */],
  maxQueryComplexity: 50,
  maxTimeRange: 365 * 24 * 60 * 60 * 1000 // 1 year
};
```

**Validation Process**:
1. Security scanning (forbidden patterns, length limits)
2. Structural validation (AST traversal)
3. Type checking (function signatures)
4. Performance analysis (complexity scoring)
5. Real-time feedback (<100ms response time)

### 3. Query Generation Process

The `QueryBuilder` translates formula AST to Elasticsearch queries:

**Translation Steps**:
1. **AST Traversal**: Recursively process nodes
2. **Aggregation Building**: Create ES aggregations for functions
3. **Filter Integration**: Apply KQL filters
4. **Query Construction**: Build final ES query structure

**Example Translation**:
```javascript
// Formula: count(kql='status:error') / count()
// Generates:
{
  "aggs": {
    "0-bucket": {
      "filter": {
        "bool": {
          "filter": [{
            "match": { "status": "error" }
          }]
        }
      }
    },
    "1-bucket": {} // Simple doc count
  }
}
```

### 4. Visual Builder Implementation

The enhanced visual builder (`enhanced-visual-builder.js`) is a **Web Component** with:

**Features**:
- Drag-and-drop formula construction
- Real-time validation feedback
- Progressive disclosure UI
- Mobile-friendly responsive design
- Accessibility support (ARIA labels, keyboard navigation)

**Component Structure**:
```javascript
class EnhancedFormulaBuilder extends HTMLElement {
  // Shadow DOM for encapsulation
  // Parser and validator instances
  // State management (formula, AST, validation)
  // Drag-drop handlers
  // Event dispatching
}
```

### 5. AI Integration

The AI Assistant (`formula-ai-assistant.js`) provides:

**Natural Language Processing**:
- 100+ predefined patterns for formula generation
- RAD-specific patterns (traffic drops, spikes, baselines)
- Pattern matching with fuzzy search
- Context-aware suggestions

**Pattern Categories**:
1. **Aggregations**: sum, average, count, unique values
2. **Percentiles**: median, percentile calculations
3. **Comparisons**: greater than, less than, equals
4. **RAD Monitoring**: traffic drops, spikes, anomalies
5. **Time-based**: week-over-week, moving averages
6. **Ratios**: percentages, conversion rates

**AI Configuration**:
```javascript
const AI_CONFIG = {
  enableRemoteAI: false, // Local patterns by default
  cacheEnabled: true,
  cacheTTL: 3600000, // 1 hour
  maxCacheSize: 1000,
  maxSuggestions: 5,
  confidenceThreshold: 0.7
};
```

### 6. Function Library

The system supports **533 lines of function definitions** across 5 categories:

#### Function Categories:

1. **Elasticsearch Functions** (11 functions):
   - Aggregations: `average`, `count`, `sum`, `max`, `min`
   - Statistics: `median`, `percentile`, `standard_deviation`
   - Unique values: `unique_count`, `last_value`

2. **Column Functions** (9 functions):
   - Time series: `moving_average`, `cumulative_sum`
   - Rates: `counter_rate`, `normalize_by_unit`
   - Overall calculations: `overall_average`, `overall_max`

3. **Math Functions** (22 functions):
   - Basic: `add`, `subtract`, `multiply`, `divide`
   - Advanced: `sqrt`, `pow`, `log`, `exp`
   - Rounding: `ceil`, `floor`, `round`
   - Utilities: `clamp`, `defaults`, `pick_max`

4. **Comparison Functions** (6 functions):
   - Binary: `eq`, `gt`, `lt`, `gte`, `lte`
   - Conditional: `ifelse`

5. **Context Functions** (3 functions):
   - Time: `now`, `time_range`, `interval`

### 7. RAD Pattern Implementation

#### Synthesizer Pattern
The Formula Synthesizer (`formula-synthesizer.js`) implements RAD eligibility patterns:

**Base Synthesizer Flow**:
```javascript
async evaluate(entities, customData) {
  // 1. Data validation
  // 2. Basic eligibility check
  // 3. Calculate relevance score
  // 4. Performance tracking
  // 5. Return eligibility result
}
```

**Specialized Synthesizers**:
- `SumFormulaSynthesizer`: Scoring based on numeric fields
- `FilterFormulaSynthesizer`: Scoring based on data size
- `TrendFormulaSynthesizer`: Requires date + numeric fields
- `PercentageFormulaSynthesizer`: Multi-field calculations

#### Entity System
Following RAD's entity pattern (`formula-entities.js`):

**Entity Types**:
1. **DataSourceEntity**: Schema, fields, complexity scoring
2. **UserEntity**: Experience level, formula history
3. **FormulaContextEntity**: Experiments, allowed formulas
4. **EntitlementsEntity**: Feature access, usage limits

**Entity Validation**:
- Required field checking
- Type validation
- Nested field access support
- Error accumulation (never fails silently)

#### RAD Cards
Formula suggestions as RAD cards (`formula-rad-cards.js`):

**Card Lifecycle**:
1. **Evaluation**: Check eligibility via synthesizer
2. **Scoring**: Calculate relevance (0-100)
3. **Rendering**: Display with tracking
4. **Interaction**: Handle CTAs with event tracking

**Predefined Cards**:
- `MCP-Formula-Sum`: Basic aggregation
- `MCP-Formula-SumByCategory`: Grouped calculations
- `MCP-Formula-Filter`: Data filtering
- `MCP-Formula-Trend`: Time series analysis
- `MCP-Formula-Percentage`: Ratio calculations

### 8. Event Tracking System

Comprehensive tracking (`formula-event-tracker.js`):

**EID Pattern**:
```
pandc.vnext.formula_builder.[radset].[radId].[subaction].action
```

**Tracked Events**:
- Impressions (never batched)
- Clicks (primary/secondary CTAs)
- Formula applications (success/failure)
- Validation results
- AI assistance usage
- Performance issues
- Errors (never silent)

**Health Monitoring**:
- CTR threshold: 1% minimum
- Error rate threshold: 10% maximum
- No-impression detection
- Automatic alerting

### 9. Experiment Manager

A/B testing framework (`formula-experiment-manager.js`):

**Features**:
- Consistent hashing for cohort assignment
- Targeting rules (user level, data source type)
- Configuration variations per cohort
- Persistent assignments (localStorage)

**Predefined Experiments**:
1. **AI Formula Ranking**: Test AI-powered suggestions
2. **Simplified Builder**: Beginner-friendly UI
3. **Card Limit Test**: Optimal number of suggestions

## Implementation Patterns

### 1. Error Handling
- **Never fail silently**: All errors are logged and tracked
- **Graceful degradation**: Fallback to basic functionality
- **User feedback**: Clear error messages with context

### 2. Performance Optimization
- **Caching**: LRU cache for parsed formulas and AI results
- **Debouncing**: Real-time validation with 500ms delay
- **Web Workers**: Validation in separate thread (validation-worker.js)
- **Lazy Loading**: Components loaded on demand

### 3. Security Measures
- **Input Sanitization**: Forbidden pattern detection
- **Length Limits**: Formula, string, array size limits
- **Complexity Limits**: Maximum nesting, function calls
- **Safe Parsing**: No eval() or dynamic code execution

### 4. Accessibility
- **ARIA Labels**: All interactive elements labeled
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Support**: Announcements for state changes
- **Focus Management**: Logical tab order

## Integration Points

### 1. Dashboard Integration
- **API Client**: Authenticated requests to Kibana
- **Data Service**: Formula execution and results
- **Widget System**: Formula-based dashboard widgets
- **Auto-refresh**: Configurable refresh intervals

### 2. Storage
- **Local Storage**: Saved formulas, experiments
- **Session Storage**: Temporary state
- **Cookie Storage**: Authentication tokens

### 3. External APIs
- **Elasticsearch**: Query execution
- **Kibana Internal API**: /internal/bsearch endpoint
- **AI Services**: Optional remote AI integration

## Usage Examples

### Basic Formula Creation
```javascript
// Simple count
count()

// Filtered count
count(kql='status:error')

// Error rate calculation
count(kql='response.status_code >= 400') / count()
```

### RAD-Specific Monitoring
```javascript
// Traffic drop detection
ifelse((count() / count(shift="1d")) < 0.5, "CRITICAL", "NORMAL")

// Business impact score
((count(shift="1d") - count()) / count(shift="1d")) * unique_count(user.id)

// Weekend traffic adjustment
count() * ifelse(date_histogram_interval("day_of_week") >= 6, 1.43, 1)
```

### Advanced Calculations
```javascript
// Moving average with outlier detection
ifelse(
  abs(average(value) - overall_average(average(value))) > 
  2 * standard_deviation(value), 
  1, 
  0
)

// Percentile range
percentile(response_time, percentile=95) - 
percentile(response_time, percentile=5)
```

## Performance Characteristics

### Parser Performance
- **Basic Parser**: ~5ms for typical formulas
- **Enhanced Parser**: ~10ms with security checks
- **Caching**: <1ms for cached formulas

### Validation Performance
- **Target**: <100ms for real-time feedback
- **Complex Formulas**: Up to 50ms
- **Worker Thread**: Non-blocking validation

### Query Generation
- **Simple Queries**: ~2ms
- **Complex Queries**: ~10ms
- **Network Latency**: Primary bottleneck

## Future Enhancements

### Planned Features
1. **Visual Query Builder**: Drag-drop query construction
2. **Formula Templates**: Industry-specific templates
3. **Collaborative Editing**: Real-time collaboration
4. **Version Control**: Formula versioning and rollback
5. **Performance Profiler**: Query optimization suggestions

### AI Enhancements
1. **GPT-4 Integration**: Advanced natural language understanding
2. **Learning System**: Personalized suggestions
3. **Anomaly Detection**: Automatic pattern recognition
4. **Formula Optimization**: AI-suggested improvements

## Conclusion

The Formula Builder represents a sophisticated implementation of data analysis tooling, combining:
- **RAD Patterns**: Entity-based architecture with eligibility scoring
- **Modern Web Technologies**: Web Components, Shadow DOM
- **Enterprise Features**: Security, monitoring, experiments
- **User Experience**: Progressive disclosure, AI assistance
- **Performance**: Optimized parsing, caching, async operations

The system successfully bridges the gap between Kibana's powerful query capabilities and user-friendly formula creation, making complex data analysis accessible to users of all skill levels.