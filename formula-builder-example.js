/**
 * Formula Builder Example - Comprehensive demonstration
 */

import FormulaBuilder from './assets/js/formula-builder/index.js';
import { compose, FormulaPatterns } from './assets/js/formula-builder/core/formula-composer.js';
import { FormulaUtils } from './assets/js/formula-builder/utils/formula-utils.js';
import { validateFormula } from './assets/js/formula-builder/core/formula-validator.js';

// Initialize the Formula Builder system
const fb = FormulaBuilder.initialize({
  elasticsearch: {
    version: '8.x',
    index: 'traffic-*',
    timeField: '@timestamp'
  },
  validation: {
    strictMode: true,
    maxFormulaLength: 5000
  }
});

console.log('Formula Builder initialized:', fb);

// Example 1: Parse and validate formulas
console.log('\n=== Example 1: Parsing and Validation ===');

const formulas = [
  'count()',
  'average(bytes)',
  'count(kql="status:error") / count()',
  'ifelse(count() > 100, 1, 0)',
  'sum(price) / overall_sum(sum(price)) * 100'
];

formulas.forEach(formula => {
  console.log(`\nFormula: ${formula}`);

  // Validate
  const validation = validateFormula(formula);
  console.log('Valid:', validation.valid);
  if (!validation.valid) {
    console.log('Errors:', validation.errors);
  }

  // Parse
  try {
    const ast = FormulaBuilder.parse(formula);
    console.log('AST:', JSON.stringify(ast, null, 2));
  } catch (error) {
    console.error('Parse error:', error.message);
  }
});

// Example 2: Build formulas programmatically
console.log('\n=== Example 2: Programmatic Formula Building ===');

// Simple count with filter
const errorRateFormula = compose()
  .count(null, 'status >= 400')
  .divide()
  .count()
  .build();

console.log('Error Rate Formula:', errorRateFormula);

// Complex nested formula
const complexFormula = compose()
  .ifelse(
    compose().count().gt().number(1000),
    compose().round(
      compose()
        .group(c => c.count().minus().number(1000))
        .divide()
        .number(1000)
        .multiply()
        .number(100)
    ),
    compose().number(999)
  )
  .build();

console.log('Complex Formula:', complexFormula);

// Using formula patterns
const weekOverWeek = FormulaPatterns.weekOverWeek('average', 'response_time');
console.log('Week over Week:', weekOverWeek);

// Example 3: Query generation
console.log('\n=== Example 3: Query Generation ===');

async function generateQueries() {
  const context = {
    index: 'traffic-*',
    timeRange: {
      from: 'now-1h',
      to: 'now'
    },
    additionalFilters: [
      { match: { 'host': 'example.com' } }
    ]
  };

  // Generate query for error rate
  const errorRateQuery = await FormulaBuilder.buildQuery(
    'count(kql="response.status_code >= 400") / count()',
    context
  );

  console.log('Error Rate Query:', JSON.stringify(errorRateQuery, null, 2));

  // Generate query for complex formula
  const complexQuery = await FormulaBuilder.buildQuery(
    'ifelse(count(kql=\'@timestamp >= "2025-06-01"\') > 100, sum(bytes) / count(), 0)',
    context
  );

  console.log('Complex Query:', JSON.stringify(complexQuery, null, 2));
}

generateQueries().catch(console.error);

// Example 4: Formula utilities
console.log('\n=== Example 4: Formula Utilities ===');

const testFormula = 'sum(order.items.price, kql=\'status:completed\') / count(order.id)';

// Extract fields
const fields = FormulaUtils.extractFields(testFormula);
console.log('Fields used:', fields);

// Extract functions
const functions = FormulaUtils.extractFunctions(testFormula);
console.log('Functions used:', functions);

// Extract KQL filters
const filters = FormulaUtils.extractKQLFilters(testFormula);
console.log('KQL filters:', filters);

// Get complexity
const complexity = FormulaUtils.getComplexity(testFormula);
console.log('Complexity metrics:', complexity);

// Replace fields
const updatedFormula = FormulaUtils.replaceFields(testFormula, {
  'order.items.price': 'transaction.amount',
  'order.id': 'transaction.id'
});
console.log('Updated formula:', updatedFormula);

// Example 5: UI Integration
console.log('\n=== Example 5: UI Integration ===');

// This would be in a browser environment
if (typeof document !== 'undefined') {
  // Create formula editor UI
  const container = document.getElementById('formula-builder-container');
  const editor = FormulaBuilder.createUI(container, {
    enableRealTimePreview: true,
    debounceDelay: 300,
    onFormulaChange: (formula) => {
      console.log('Formula changed:', formula);
    },
    onQueryGenerated: (query) => {
      console.log('Query generated:', query);
    }
  });

  // Programmatically set a formula
  editor.loadExample('count(kql="error") / count() * 100');
}

// Example 6: Complex real-world formula
console.log('\n=== Example 6: Real-World Complex Formula ===');

const realWorldFormula = `
ifelse(
  count(kql='@timestamp >= "2025-06-01" AND @timestamp < "2025-06-09"') / 8 < 100,
  999,
  ifelse(
    count(kql='@timestamp >= "2025-06-01" AND @timestamp < "2025-06-09"') / 8 >= 1000,
    ifelse(
      count(kql='@timestamp >= now-12h') / (count(kql='@timestamp >= "2025-06-01" AND @timestamp < "2025-06-09"') / 8 / 24 * 12) < 0.5,
      round((1 - count(kql='@timestamp >= now-12h') / (count(kql='@timestamp >= "2025-06-01" AND @timestamp < "2025-06-09"') / 8 / 24 * 12)) * -100),
      round((count(kql='@timestamp >= now-12h') / (count(kql='@timestamp >= "2025-06-01" AND @timestamp < "2025-06-09"') / 8 / 24 * 12) - 1) * 100)
    ),
    ifelse(
      count(kql='@timestamp >= now-12h') / (count(kql='@timestamp >= "2025-06-01" AND @timestamp < "2025-06-09"') / 8 / 24 * 12) < 0.3,
      round((1 - count(kql='@timestamp >= now-12h') / (count(kql='@timestamp >= "2025-06-01" AND @timestamp < "2025-06-09"') / 8 / 24 * 12)) * -100),
      round((count(kql='@timestamp >= now-12h') / (count(kql='@timestamp >= "2025-06-08"') / 8 / 24 * 12) - 1) * 100)
    )
  )
)
`.trim();

// Validate complex formula
const complexValidation = validateFormula(realWorldFormula);
console.log('Complex formula valid:', complexValidation.valid);
if (complexValidation.warnings.length > 0) {
  console.log('Warnings:', complexValidation.warnings);
}

// Get complexity metrics
const complexMetrics = FormulaUtils.getComplexity(realWorldFormula);
console.log('Complex formula metrics:', complexMetrics);

// Example 7: Formula comparison
console.log('\n=== Example 7: Formula Comparison ===');

const formula1 = 'count() / 100';
const formula2 = 'count() / 100'; // Same
const formula3 = '100 / count()'; // Different

console.log(`"${formula1}" equals "${formula2}":`, FormulaUtils.areEquivalent(formula1, formula2));
console.log(`"${formula1}" equals "${formula3}":`, FormulaUtils.areEquivalent(formula1, formula3));

// Example 8: Formula simplification
console.log('\n=== Example 8: Formula Simplification ===');

const toSimplify = '100 + 200 / 2 * 3';
const simplified = FormulaUtils.simplify(toSimplify);
console.log('Original:', toSimplify);
console.log('Simplified:', simplified);

// Example 9: Chained formula building
console.log('\n=== Example 9: Chained Formula Building ===');

const chainedFormula = compose()
  .chain()
  .count('user.id', 'country:US')
  .dividedBy(c => c.count('user.id'))
  .multipliedBy(100)
  .build();

console.log('Chained Formula:', chainedFormula);

// Example 10: Export and documentation
console.log('\n=== Example 10: System Information ===');
console.log('Formula Builder Version:', FormulaBuilder.VERSION);
console.log('Supported ES Versions:', FormulaBuilder.SUPPORTED_ES_VERSIONS);

// Summary
console.log('\n=== Summary ===');
console.log('The Formula Builder system provides:');
console.log('1. Complete formula parsing and validation');
console.log('2. Programmatic formula building');
console.log('3. Elasticsearch query generation');
console.log('4. Rich utility functions');
console.log('5. UI components for visual building');
console.log('6. Full integration with existing systems');
console.log('7. Extensible architecture');
console.log('8. Comprehensive error handling');
console.log('9. Performance optimization');
console.log('10. Complete documentation');
