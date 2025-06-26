# Advanced Query Filtering System - Implementation Plan

## Overview

This document outlines the plan to implement a world-class query filtering system for the vh-rad-traffic-monitor project, inspired by Kibana's Lens formula language. The system will provide powerful, flexible querying capabilities while maintaining the simplicity and performance standards expected by millions of open-source users.

## Architecture Integration

### Leveraging Existing Components

The new filtering system will build upon the existing architecture:

1. **QueryBuilder (data-layer.js)**: Already supports modular query construction
2. **Multi-RAD Support**: Seamlessly integrates with RAD type filtering
3. **Unified API Client**: Extends the existing query execution pipeline
4. **WebSocket Integration**: Enables real-time formula evaluation

### Core Design Principles

1. **Progressive Enhancement**: Basic queries work without formulas
2. **Backward Compatibility**: Existing queries continue to function
3. **Performance First**: Query optimization built-in from the start
4. **Developer Friendly**: Clear APIs and extensive documentation
5. **User Centric**: Intuitive UI with helpful error messages

## Formula Language Specification

### Syntax Overview

```
# Basic metric
count()

# Filtered metric
sum(bytes, kql='status:200')

# Math operations
sum(bytes) / count() 

# Complex formula
round(100 * count(kql='status:error') / count(), 2)

# Time comparison
sum(revenue) / sum(revenue, shift='1w') - 1

# RAD-specific
count(kql='rad_type:venture_feed') / count() * 100
```

### Function Categories

#### 1. Elasticsearch Metrics
Direct mappings to Elasticsearch aggregations:
- `count([field])` - Document or field value count
- `sum(field)` - Sum of numeric field
- `average(field)` - Average of numeric field
- `min(field)` / `max(field)` - Min/max values
- `percentile(field, percentile=95)` - Percentile calculation
- `unique_count(field)` - Cardinality aggregation

#### 2. Time Series Functions
Operations across time buckets:
- `cumulative_sum(metric)` - Running total
- `moving_average(metric, window=5)` - Smoothing
- `differences(metric)` - Period-over-period change
- `counter_rate(metric)` - Rate of counter increase

#### 3. Window Functions
Calculations across all results:
- `overall_sum(metric)` - Total across all buckets
- `overall_average(metric)` - Average across all buckets
- `overall_max(metric)` / `overall_min(metric)` - Global extremes

#### 4. Math Functions
Standard mathematical operations:
- Basic: `+`, `-`, `*`, `/`
- Advanced: `pow()`, `sqrt()`, `log()`, `exp()`
- Rounding: `round()`, `floor()`, `ceil()`
- Comparison: `>`, `<`, `>=`, `<=`, `==`
- Conditional: `ifelse(condition, true_value, false_value)`

## Implementation Architecture

### Component Structure

```
assets/js/
├── query-language-parser.js    # Formula parsing & AST generation
├── formula-functions.js        # Function implementations
├── kql-parser.js              # KQL to ES DSL conversion
├── query-optimizer.js         # Query optimization logic
├── filter-builder-ui.js       # Visual filter builder
└── formula-editor.js          # Code editor component
```

### Parser Design

Using a recursive descent parser for flexibility:

```javascript
class FormulaParser {
  constructor(formula) {
    this.tokens = this.tokenize(formula);
    this.position = 0;
  }
  
  parse() {
    return this.parseExpression();
  }
  
  parseExpression() {
    let left = this.parseTerm();
    while (this.match('+', '-')) {
      const op = this.previous();
      const right = this.parseTerm();
      left = new BinaryExpression(left, op, right);
    }
    return left;
  }
  
  // ... additional parsing methods
}
```

### Query Translation Pipeline

1. **Parse Formula** → AST
2. **Validate AST** → Check functions & fields
3. **Optimize AST** → Simplify expressions
4. **Generate ES Query** → DSL with aggregations
5. **Execute Query** → Via existing API
6. **Apply Math** → Post-processing calculations

### Example Translation

Formula:
```
count(kql='status:error') / count() * 100
```

Generated Elasticsearch Query:
```json
{
  "size": 0,
  "aggs": {
    "total_count": {
      "value_count": {
        "field": "_id"
      }
    },
    "error_count": {
      "filter": {
        "term": {
          "status": "error"
        }
      },
      "aggs": {
        "count": {
          "value_count": {
            "field": "_id"
          }
        }
      }
    }
  }
}
```

Post-processing:
```javascript
const errorRate = (response.aggregations.error_count.count.value / 
                   response.aggregations.total_count.value) * 100;
```

## User Interface Design

### Formula Editor Features

1. **Syntax Highlighting**: Color-coded functions, operators, strings
2. **Auto-completion**: Function names, field names, common patterns
3. **Error Indicators**: Real-time validation with helpful messages
4. **Formula Preview**: Show generated query and sample results
5. **Performance Warnings**: Alert for expensive operations

### Visual Query Builder

Drag-and-drop interface for non-technical users:
- Field selector sidebar
- Function palette
- Formula construction area
- Live preview panel

## Performance Considerations

### Query Optimization Strategies

1. **Aggregation Pruning**: Remove unused aggregations
2. **Filter Pushdown**: Apply filters at the lowest level
3. **Result Caching**: Cache formula results with TTL
4. **Batch Execution**: Combine similar queries
5. **Progressive Loading**: Stream results as available

### Performance Targets

- Parse time: < 10ms for typical formulas
- Query generation: < 50ms
- First result: < 500ms
- Complete results: < 2s for 90% of queries

## Security & Validation

### Input Validation

1. **Formula Syntax**: Strict parsing, no code injection
2. **Field Access**: Validate against schema
3. **Query Complexity**: Limit nesting depth
4. **Resource Limits**: Max execution time/memory

### Security Measures

```javascript
class FormulaSecurity {
  validateFormula(formula) {
    // Check for injection attempts
    if (this.containsMaliciousPatterns(formula)) {
      throw new SecurityError('Invalid formula syntax');
    }
    
    // Validate field access
    const fields = this.extractFields(formula);
    for (const field of fields) {
      if (!this.isAllowedField(field)) {
        throw new SecurityError(`Access denied to field: ${field}`);
      }
    }
    
    // Check complexity
    const complexity = this.calculateComplexity(formula);
    if (complexity > MAX_COMPLEXITY) {
      throw new Error('Formula too complex');
    }
  }
}
```

## Testing Strategy

### Test Coverage

1. **Parser Tests**: All syntax variations
2. **Function Tests**: Each function with edge cases
3. **Integration Tests**: End-to-end formula execution
4. **Performance Tests**: Query optimization verification
5. **Security Tests**: Injection and access control

### Example Test Case

```javascript
describe('Formula Parser', () => {
  it('should parse complex formulas', () => {
    const formula = 'sum(bytes, kql="status:200") / sum(bytes) * 100';
    const ast = parser.parse(formula);
    
    expect(ast.type).toBe('BinaryExpression');
    expect(ast.operator).toBe('*');
    expect(ast.left.type).toBe('BinaryExpression');
    expect(ast.left.left.type).toBe('FunctionCall');
    expect(ast.left.left.name).toBe('sum');
    expect(ast.left.left.args[0].value).toBe('bytes');
    expect(ast.left.left.args[1].name).toBe('kql');
    expect(ast.left.left.args[1].value).toBe('status:200');
  });
});
```

## Migration Path

### Phase 1: Core Implementation (Week 1)
- Formula parser
- Basic functions
- Query generation

### Phase 2: Advanced Features (Week 2)
- KQL support
- Time series functions
- Query optimization

### Phase 3: UI Integration (Week 3)
- Formula editor
- Visual builder
- Real-time preview

### Phase 4: Polish & Performance (Week 4)
- Optimization
- Caching
- Documentation

### Phase 5: Release (Week 5)
- Testing
- Performance tuning
- User documentation

## Success Metrics

1. **Adoption**: 50% of users using formulas within 3 months
2. **Performance**: 90% of queries < 500ms
3. **Reliability**: < 1% error rate
4. **Satisfaction**: > 4.5/5 user rating

## Future Enhancements

1. **Natural Language Processing**: Convert questions to formulas
2. **AI-Powered Suggestions**: Learn from usage patterns
3. **Collaborative Formulas**: Share and remix queries
4. **Custom Functions**: User-defined formula extensions
5. **Multi-Data Source**: Query across different systems

## Conclusion

This advanced query filtering system will transform the vh-rad-traffic-monitor from a basic monitoring tool into a powerful analytics platform. By building on the existing architecture and following open-source best practices, we'll create a system that's both powerful for advanced users and approachable for beginners.

The implementation focuses on:
- **Seamless Integration**: Works with existing code
- **Progressive Enhancement**: Basic features work without formulas
- **World-Class UX**: Intuitive, fast, and helpful
- **Open Source Excellence**: Well-documented, tested, and extensible

This positions the project as a leading open-source monitoring solution, ready for adoption by millions of users worldwide. 