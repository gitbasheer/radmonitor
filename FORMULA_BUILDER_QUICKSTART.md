# Formula Builder Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### 1. Include the Formula Builder

```html
<!-- Add to your HTML -->
<link rel="stylesheet" href="assets/css/formula-builder.css">
<script type="module">
  import FormulaBuilder from './assets/js/formula-builder/index.js';
  window.FormulaBuilder = FormulaBuilder;
</script>
```

### 2. Create a Container

```html
<div id="formula-builder-container"></div>
```

### 3. Initialize

```javascript
// Initialize with your configuration
const fb = FormulaBuilder.initialize({
  elasticsearch: {
    index: 'your-index-*',
    baseUrl: 'https://your-elasticsearch.com'
  }
});

// Create the UI
const editor = FormulaBuilder.createUI(
  document.getElementById('formula-builder-container')
);
```

### 4. Try Your First Formula

Type this in the editor:
```
count()
```

## 📚 Common Use Cases

### Error Rate Calculation
```javascript
count(kql='status >= 400') / count() * 100
```

### Average Response Time by Status
```javascript
average(response_time, kql='status:success')
```

### Week-over-Week Comparison
```javascript
sum(revenue) / sum(revenue, shift='1w')
```

### Percentage of Total
```javascript
sum(sales) / overall_sum(sum(sales)) * 100
```

## 🛠️ Programmatic Usage

### Build Formulas in Code

```javascript
import { compose } from './assets/js/formula-builder/core/formula-composer.js';

// Build an error rate formula
const errorRate = compose()
  .count(null, 'status >= 400')
  .divide()
  .count()
  .multiply()
  .number(100)
  .build();

console.log(errorRate); // count(kql='status >= 400') / count() * 100
```

### Parse and Validate

```javascript
import { parseFormula, validateFormula } from './assets/js/formula-builder/index.js';

const formula = 'average(cpu) > 80';

// Validate
const validation = validateFormula(formula);
if (validation.valid) {
  // Parse to AST
  const ast = parseFormula(formula);
  console.log(ast);
}
```

### Generate Queries

```javascript
const query = await FormulaBuilder.buildQuery(
  'count(kql="error") / count()',
  {
    index: 'logs-*',
    timeRange: { from: 'now-1h', to: 'now' }
  }
);

// Execute the query
const results = await fetch('/elasticsearch/_search', {
  method: 'POST',
  body: JSON.stringify(query)
});
```

## 🎯 Integration Examples

### Dashboard Widget

```javascript
import { createFormulaIntegration } from './assets/js/formula-builder/integration/dashboard-connector.js';

const integration = createFormulaIntegration(apiClient, dataService);

// Initialize in your dashboard
integration.init(container, {
  onFormulaChange: (formula) => {
    console.log('Formula updated:', formula);
  }
});
```

### React Component

```jsx
import { useEffect, useRef } from 'react';
import FormulaBuilder from '@rad/formula-builder';

function FormulaEditorComponent({ onChange }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const editor = FormulaBuilder.createUI(containerRef.current, {
      onFormulaChange: onChange
    });

    return () => editor.destroy();
  }, []);

  return <div ref={containerRef} />;
}
```

### Vue Component

```vue
<template>
  <div ref="formulaBuilder"></div>
</template>

<script>
import FormulaBuilder from '@rad/formula-builder';

export default {
  mounted() {
    this.editor = FormulaBuilder.createUI(this.$refs.formulaBuilder, {
      onFormulaChange: this.handleChange
    });
  },
  beforeDestroy() {
    this.editor?.destroy();
  },
  methods: {
    handleChange(formula) {
      this.$emit('change', formula);
    }
  }
}
</script>
```

## 🎨 Customization

### Custom Theme

```css
/* Override default styles */
.formula-editor-container {
  --primary-color: #your-color;
  --background-color: #your-bg;
  --text-color: #your-text;
}
```

### Add Custom Functions

```javascript
FormulaBuilder.registerFunction({
  name: 'myCustomMetric',
  category: 'custom',
  description: 'Calculate custom metric',
  parameters: [
    { name: 'field', type: 'string', required: true }
  ],
  validator: (args) => {
    // Custom validation logic
    return { valid: true };
  },
  queryBuilder: (args) => {
    // Return aggregation object
    return {
      myCustomAgg: {
        field: args[0]
      }
    };
  }
});
```

## 🔧 Configuration Options

```javascript
FormulaBuilder.initialize({
  // Elasticsearch settings
  elasticsearch: {
    version: '8.x',
    index: 'traffic-*',
    baseUrl: 'https://es.example.com',
    auth: {
      type: 'bearer',
      token: 'your-token'
    }
  },

  // UI settings
  ui: {
    theme: 'light',
    enableAutoComplete: true,
    enableRealTimeValidation: true,
    debounceDelay: 300
  },

  // Feature flags
  features: {
    enableVisualBuilder: true,
    enableQueryExecution: true,
    enableFormulaPersistence: true
  },

  // Validation rules
  validation: {
    strictMode: false,
    maxFormulaLength: 5000,
    maxNestingDepth: 10
  }
});
```

## 📊 Working with Results

```javascript
// Execute a formula
const response = await editor.executeFormula();

// Process results
const results = QueryUtils.extractAggregationResults(response);
console.log('Count:', results['0-bucket']);
console.log('Average:', results['1-bucket']);

// Format for display
const formatted = editor.formatResults(results, {
  format: 'percentage',
  decimals: 2
});
```

## 🐛 Debugging

### Enable Debug Mode

```javascript
FormulaBuilder.debug = true;

// Or specific components
FormulaBuilder.debug = {
  parser: true,
  validator: true,
  queryBuilder: false
};
```

### Check Formula Complexity

```javascript
import { FormulaUtils } from './assets/js/formula-builder/utils/formula-utils.js';

const complexity = FormulaUtils.getComplexity(formula);
console.log('Complexity score:', complexity.complexity);
console.log('Max depth:', complexity.maxDepth);
console.log('Function count:', complexity.functionCount);
```

## 💡 Tips and Tricks

1. **Use Keyboard Shortcuts**
   - `Ctrl/Cmd + Enter`: Execute formula
   - `Ctrl/Cmd + S`: Save formula
   - `Ctrl/Cmd + Space`: Auto-complete

2. **Formula Patterns**
   ```javascript
   // Pre-built patterns
   import { FormulaPatterns } from './formula-builder/core/formula-composer.js';

   const errorRate = FormulaPatterns.errorRate('status >= 400');
   const weekOverWeek = FormulaPatterns.weekOverWeek('sum', 'revenue');
   ```

3. **Performance Tips**
   - Use specific field names instead of wildcards
   - Limit time ranges when possible
   - Cache frequently used formulas
   - Use `reducedTimeRange` for recent data

4. **Common Gotchas**
   - Escape single quotes in KQL: `kql='user\'s data'`
   - Use parentheses for operation order: `(a + b) / c`
   - Check field existence before using

## 🔗 Resources

- [Full Documentation](./FORMULA_BUILDER_README.md)
- [Architecture Guide](./FORMULA_BUILDER_ARCHITECTURE.md)
- [API Reference](./formula-crafter-readme.md)
- [Examples](./formula-builder-example.js)
- [Demo](http://localhost:8090/formula-builder-demo.html)

## 🤝 Need Help?

- Check the console for detailed error messages
- Enable debug mode for more information
- Review the validation warnings
- Consult the formula reference guide

Happy formula building! 🎉
