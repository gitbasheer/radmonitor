# Formula Builder System for RAD Traffic Monitor

## Overview

The Formula Builder is a comprehensive system that enables users to build complex Elasticsearch queries using Kibana Lens formulas through an intuitive visual interface. It integrates seamlessly with the RAD Traffic Monitor dashboard and provides real-time formula validation, query generation, and execution capabilities.

## Architecture

### System Components

```
formula-builder/
├── core/                       # Core functionality
│   ├── formula-types.js       # Type definitions and constants
│   ├── formula-parser.js      # Formula string to AST parser
│   ├── formula-validator.js   # Formula validation
│   └── formula-composer.js    # Programmatic formula building
├── functions/                  # Function implementations
│   ├── elasticsearch/         # ES aggregation functions
│   ├── calculations/          # Time series and column calculations
│   ├── math/                  # Mathematical operations
│   └── comparison/            # Conditional logic
├── translator/                # Query translation layer
│   ├── query-builder.js       # AST to ES query conversion
│   ├── aggregation-mapper.js  # Function to aggregation mapping
│   └── filter-translator.js   # KQL/Lucene filter translation
├── ui/                        # User interface components
│   ├── formula-editor.js      # Main editor component
│   ├── function-palette.js    # Function library UI
│   ├── visual-builder.js      # Drag-and-drop interface
│   └── real-time-preview.js   # Live preview functionality
└── integration/               # Dashboard integration
    ├── api-adapter.js         # API integration
    └── dashboard-connector.js  # Dashboard widget creation
```

### Three-Layer Architecture

1. **User Interface Layer**
   - Visual formula builder with drag-and-drop
   - Function palette with search and categorization
   - Real-time syntax highlighting and validation
   - Live preview of AST, query, and mathematical representation

2. **Formula Processing Layer**
   - Formula parser that converts text to Abstract Syntax Tree (AST)
   - Query translator that converts AST to Elasticsearch queries
   - Support for all Lens formula functions and operators
   - KQL and Lucene filter parsing

3. **Execution Layer**
   - Direct integration with Elasticsearch API
   - Query execution and result processing
   - Dashboard widget creation and management
   - Formula persistence and loading

## Features

### Core Features

- **Visual Formula Building**: Drag-and-drop interface for building formulas
- **Real-time Validation**: Instant feedback on formula syntax and semantics
- **Query Generation**: Automatic conversion of formulas to Elasticsearch queries
- **Live Preview**: See AST, generated query, and mathematical representation
- **Function Library**: Comprehensive catalog of all available functions
- **Smart Auto-complete**: Context-aware suggestions for fields and functions
- **Formula Examples**: Pre-built examples for common use cases

### Advanced Features

- **Complex Nested Formulas**: Support for deeply nested conditional logic
- **Time-based Comparisons**: Week-over-week, month-over-month calculations
- **KQL Filter Support**: Full KQL query language support within formulas
- **Multiple Aggregations**: Combine multiple metrics in a single formula
- **Formula Persistence**: Save and load formulas for reuse
- **Dashboard Integration**: Create widgets directly from formulas
- **Export Capabilities**: Export formulas and queries for external use

## Usage Guide

### Basic Usage

1. **Creating a Simple Formula**
   ```javascript
   // Count all documents
   count()

   // Average of a field
   average(bytes)

   // Sum with filter
   sum(price, kql='category:electronics')
   ```

2. **Using the Visual Builder**
   - Click on functions in the palette to insert them
   - Drag functions to rearrange
   - Use the search to find specific functions
   - Click examples to load pre-built formulas

3. **Executing Queries**
   - Enter or build your formula
   - Click "Execute Query" to run
   - View results in the preview pane
   - Add successful queries to dashboard

### Advanced Usage

1. **Complex Calculations**
   ```javascript
   // Error rate calculation
   count(kql='response.status_code > 400') / count()

   // Week-over-week comparison
   average(bytes) / average(bytes, shift='1w')

   // Percentage of total
   sum(revenue) / overall_sum(sum(revenue))
   ```

2. **Nested Conditionals**
   ```javascript
   ifelse(
     count() > 1000,
     round((count() - 1000) / 1000 * 100),
     999
   )
   ```

3. **Time-based Analysis**
   ```javascript
   // Recent change detection
   max(cpu, reducedTimeRange='30m') -
   min(cpu, reducedTimeRange='30m')
   ```

## API Reference

### Formula Parser

```javascript
import { parseFormula } from './core/formula-parser.js';

const ast = parseFormula('count() / 100');
// Returns AST representation
```

### Query Builder

```javascript
import { buildQueryFromFormula } from './translator/query-builder.js';

const query = await buildQueryFromFormula(
  'average(bytes)',
  {
    index: 'traffic-*',
    timeRange: { from: 'now-1h', to: 'now' }
  }
);
```

### Dashboard Integration

```javascript
import { createFormulaIntegration } from './integration/dashboard-connector.js';

const integration = createFormulaIntegration(apiClient, dataService);
integration.init(container, {
  enableRealTimePreview: true,
  debounceDelay: 300
});
```

## Function Reference

### Elasticsearch Functions
- `count([field])` - Count documents or field values
- `average(field)` - Calculate average
- `sum(field)` - Calculate sum
- `max(field)` - Find maximum value
- `min(field)` - Find minimum value
- `median(field)` - Calculate median
- `percentile(field, percentile=n)` - Calculate percentile
- `unique_count(field)` - Count unique values

### Time Series Functions
- `moving_average(metric, window=n)` - Calculate moving average
- `cumulative_sum(metric)` - Calculate cumulative sum
- `differences(metric)` - Calculate differences between values
- `counter_rate(metric)` - Calculate rate of counter
- `overall_sum(metric)` - Sum across all data points
- `overall_average(metric)` - Average across all data points

### Math Functions
- Basic: `add()`, `subtract()`, `multiply()`, `divide()`
- Advanced: `sqrt()`, `pow()`, `log()`, `exp()`
- Rounding: `round()`, `floor()`, `ceil()`
- Utilities: `abs()`, `clamp()`, `defaults()`

### Comparison Functions
- `ifelse(condition, trueValue, falseValue)` - Conditional logic
- `gt()`, `gte()`, `lt()`, `lte()`, `eq()` - Comparisons

## Integration with RAD Dashboard

### Adding Formula Widgets

1. Build and test your formula
2. Click "Add to Dashboard"
3. Configure widget display options
4. Widget auto-refreshes based on settings

### Widget Configuration

```javascript
{
  type: 'formula',
  formula: 'count(kql="status:error") / count()',
  title: 'Error Rate',
  refreshInterval: 60000,
  display: {
    type: 'metric',
    format: 'percent'
  }
}
```

## Development Guide

### Extending Functions

1. Add function definition to `formula-types.js`
2. Implement parser support in `formula-parser.js`
3. Add query translation in `query-builder.js`
4. Update UI components for new function

### Custom Visualizations

Create custom visualization for formula results:

```javascript
class CustomVisualization {
  render(results, container) {
    // Custom rendering logic
  }
}
```

## Best Practices

1. **Formula Design**
   - Keep formulas readable and well-structured
   - Use meaningful field names
   - Add comments for complex logic
   - Test with sample data first

2. **Performance**
   - Use appropriate time ranges
   - Limit aggregation complexity
   - Cache frequently used formulas
   - Monitor query execution time

3. **Error Handling**
   - Validate formulas before execution
   - Handle missing fields gracefully
   - Provide meaningful error messages
   - Log query failures for debugging

## Troubleshooting

### Common Issues

1. **Formula Parse Errors**
   - Check parentheses matching
   - Verify function names
   - Ensure proper quote escaping in KQL

2. **Query Execution Errors**
   - Verify field names exist in index
   - Check time range validity
   - Ensure proper permissions

3. **Performance Issues**
   - Reduce aggregation complexity
   - Use smaller time ranges
   - Add appropriate filters

## Future Enhancements

- Machine learning function support
- Advanced visualization options
- Formula version control
- Collaborative formula editing
- AI-powered formula suggestions
- Export to Kibana Lens
- Advanced debugging tools

## Support

For issues or questions:
1. Check the function reference
2. Review example formulas
3. Consult the troubleshooting guide
4. Submit issues with formula and error details
