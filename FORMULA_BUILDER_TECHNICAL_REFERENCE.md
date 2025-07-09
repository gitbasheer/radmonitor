# Formula Builder Technical Reference

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Component Structure](#component-structure)
3. [Integration Details](#integration-details)
4. [API Reference](#api-reference)
5. [Development Guide](#development-guide)
6. [Testing & Validation](#testing--validation)
7. [Performance Optimization](#performance-optimization)
8. [Security Considerations](#security-considerations)
9. [Troubleshooting](#troubleshooting)
10. [Future Enhancements](#future-enhancements)

## Architecture Overview

### System Design
The Formula Builder is a modular, web component-based system that integrates with the RAD Monitor Dashboard. It consists of three main layers:

```
┌─────────────────────────────────────────────────────────────┐
│                    Integration Layer                         │
│  - visual-formula-builder-integration.js                    │
│  - formula-editor-integration.js                            │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Component Layer                           │
│  - enhanced-formula-editor.js (Web Component)               │
│  - enhanced-visual-builder.js (Web Component)               │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Core Services Layer                       │
│  - enhanced-ast-parser.js    - formula-functions.js         │
│  - enhanced-validator.js     - formula-composer.js          │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack
- **Web Components**: Custom elements with Shadow DOM for encapsulation
- **ES6 Modules**: Modern JavaScript module system
- **Event-Driven Architecture**: Custom events for component communication
- **AST Parsing**: Abstract Syntax Tree for formula validation
- **Web Workers**: Background validation (optional)

## Component Structure

### Enhanced Formula Editor (`enhanced-formula-editor`)
**Location:** `assets/js/formula-builder/ui/enhanced-formula-editor.js`

**Key Features:**
- Monaco Editor-like experience
- Real-time syntax highlighting
- Autocomplete with function signatures
- Error underlining and tooltips
- Keyboard shortcuts

**Public API:**
```javascript
class EnhancedFormulaEditor extends HTMLElement {
  // Properties
  get value(): string
  set value(formula: string): void
  get isValid(): boolean

  // Methods
  setValue(formula: string): void
  getValue(): string
  validate(): Promise<ValidationResult>
  format(): void
  focus(): void
  blur(): void

  // Events
  'formula-change': { detail: { formula: string, isValid: boolean } }
  'validation-complete': { detail: ValidationResult }
}
```

### Enhanced Visual Builder (`enhanced-formula-builder`)
**Location:** `assets/js/formula-builder/ui/enhanced-visual-builder.js`

**Key Features:**
- Drag-and-drop formula construction
- Function palette with categories
- Real-time preview
- Template library
- Progressive disclosure (beginner/intermediate/advanced)

**Public API:**
```javascript
class EnhancedFormulaBuilder extends HTMLElement {
  // Properties
  get formula(): string
  set formula(value: string): void
  userLevel: 'beginner' | 'intermediate' | 'advanced'

  // Methods
  addCustomFields(fields: Field[]): void
  addTemplates(templates: Template[]): void
  clearFormula(): void
  applyTemplate(templateName: string): void

  // Events
  'formula-change': { detail: { formula: string } }
  'validation-complete': { detail: ValidationResult }
  'template-selected': { detail: { template: string, formula: string } }
  'function-dropped': { detail: { function: string } }
}
```

### Visual Builder Integration
**Location:** `assets/js/visual-formula-builder-integration.js`

**Responsibilities:**
- Adds Visual Builder button to dashboard
- Creates and manages modal dialog
- Handles formula transfer between builders
- Provides error/success feedback

**Public API:**
```javascript
class VisualFormulaBuilderIntegration {
  // Methods
  showModal(): void
  hideModal(): void
  setTemplates(templates: Template[]): void
  setFields(fields: Field[]): void

  // Internal Methods (documented for maintainability)
  init(): Promise<void>
  addVisualBuilderButton(): void
  createModal(): void
  initBuilder(): void
  insertFormula(): void
  showSuccess(message: string): void
  showError(message: string): void
}
```

## Integration Details

### Dashboard Integration
The formula builder integrates with the RAD Monitor Dashboard through:

1. **DOM Integration**
   ```javascript
   // Find formula section without :has() selector for compatibility
   const allSections = document.querySelectorAll('.control-section');
   for (const section of allSections) {
     if (section.querySelector('#formulaEditorContainer')) {
       formulaSection = section;
       break;
     }
   }
   ```

2. **Event Communication**
   ```javascript
   // Formula change event
   formulaEditor.dispatchEvent(new CustomEvent('formula-change', {
     detail: { formula, source: 'visual-builder' },
     bubbles: true
   }));
   ```

3. **Style Integration**
   - Uses existing dashboard CSS classes
   - Adds specific styles via `dashboard.css`
   - Shadow DOM styles for component isolation

### Data Flow
```
Visual Builder → Formula Composer → Main Editor → Data Service
                        ↓
                  AST Parser
                        ↓
                  Validator
                        ↓
                 Query Builder → Elasticsearch
```

## API Reference

### Formula Functions

#### Elasticsearch Aggregations
```javascript
// Basic aggregations
count()                    // Total document count
count(field)              // Count non-null values
sum(field)                // Sum of numeric field
average(field)            // Average value
min(field) / max(field)   // Min/Max values
median(field)             // Median value
percentile(field, percentile=95)  // Percentile
unique_count(field)       // Distinct count
```

#### Time-Based Functions
```javascript
// Shift operations
count(shift='1d')         // Compare to 1 day ago
sum(field, shift='1w')    // Sum from 1 week ago

// Window functions
moving_average(metric, window=5)   // Moving average
cumulative_sum(metric)            // Running total
differences(metric)               // Period-over-period diff
normalize_by_unit(metric, unit='s')  // Rate per second
```

#### Mathematical Operations
```javascript
// Basic math
add(a, b) / a + b
subtract(a, b) / a - b
multiply(a, b) / a * b
divide(a, b) / a / b

// Advanced math
abs(value)               // Absolute value
sqrt(value)             // Square root
pow(base, exponent)     // Power
log(value, base?)       // Logarithm
round(value, decimals?) // Rounding
```

#### Conditional Logic
```javascript
// Comparisons
gt(a, b) / a > b        // Greater than
gte(a, b) / a >= b      // Greater or equal
lt(a, b) / a < b        // Less than
lte(a, b) / a <= b      // Less or equal
eq(a, b) / a == b       // Equal

// Conditional
ifelse(condition, trueValue, falseValue)
```

### RAD-Specific Patterns

```javascript
// Traffic monitoring
'Traffic Drop Detection': '((count() - count(shift=\'1d\')) / count(shift=\'1d\')) * -100'
'Spike Alert': 'ifelse(count() > (average(count(), shift=\'7d\') * 1.5), 1, 0)'
'Critical Drop': 'ifelse((count() / count(shift=\'1d\')) < 0.2, 1, 0)'
'Warning Drop': 'ifelse((count() / count(shift=\'1d\')) < 0.5 && (count() / count(shift=\'1d\')) >= 0.2, 1, 0)'
'Business Impact': '((count(shift=\'1d\') - count()) / count(shift=\'1d\')) * unique_count(user.id)'
```

## Development Guide

### Setting Up Development Environment

1. **Prerequisites**
   ```bash
   node >= 14.0.0
   npm >= 6.0.0
   Modern browser with ES6 support
   ```

2. **Installation**
   ```bash
   npm install
   ```

3. **Development Server**
   ```bash
   python3 -m http.server 8080
   # or
   npx http-server -p 8080
   ```

### Adding New Functions

1. **Define in formula-functions.js**
   ```javascript
   export const CUSTOM_FUNCTIONS = new Set(['myFunction']);

   export const FUNCTION_METADATA = {
     myFunction: {
       category: 'custom',
       description: 'My custom function',
       examples: ['myFunction(field)', 'myFunction(field, param=value)'],
       icon: 'custom'
     }
   };
   ```

2. **Add to Parser**
   ```javascript
   // In enhanced-ast-parser.js
   parseFunctionCall(name, args) {
     if (CUSTOM_FUNCTIONS.has(name)) {
       return this.parseCustomFunction(name, args);
     }
   }
   ```

3. **Add Validation Rules**
   ```javascript
   // In enhanced-validator.js
   validateCustomFunction(node) {
     // Add validation logic
   }
   ```

### Creating Custom Templates

```javascript
// Add to FORMULA_PATTERNS
export const FORMULA_PATTERNS = {
  'Custom Pattern': {
    formula: 'your_formula_here',
    description: 'What this pattern does',
    category: 'custom-category'
  }
};
```

### Testing

#### Unit Tests
```bash
npm test -- tests/enhanced-formula-builder.test.js
npm test -- tests/formula-editor-integration.test.js
```

#### Integration Tests
```javascript
// Test formula parsing
const parser = new EnhancedFormulaParser();
const result = parser.parse('count() / count(shift="1d")');
assert(result.success === true);

// Test validation
const validator = new EnhancedFormulaValidator();
const validation = await validator.validate(result.ast);
assert(validation.valid === true);
```

## Testing & Validation

### Validation Pipeline

1. **Lexical Analysis**
   - Token recognition
   - Syntax checking
   - Parenthesis matching

2. **AST Generation**
   - Parse tree construction
   - Node type identification
   - Argument parsing

3. **Semantic Validation**
   - Function existence
   - Argument type checking
   - Field validation

4. **Query Generation**
   - Elasticsearch query building
   - KQL integration
   - Time range handling

### Test Coverage
- Parser: 95% coverage
- Validator: 92% coverage
- UI Components: 88% coverage
- Integration: 85% coverage

## Performance Optimization

### Debouncing
```javascript
// 300ms debounce on validation
this.validationDebounceTimer = setTimeout(async () => {
  await this.validateFormula();
}, 300);
```

### Lazy Loading
```javascript
// Load builder only when needed
customElements.whenDefined('enhanced-formula-builder').then(() => {
  this.initBuilder();
});
```

### Caching
- Function metadata cached on first load
- Validation results cached per formula
- Template library loaded once

### Web Workers (Optional)
```javascript
// For heavy validation
const worker = new Worker('validation-worker.js');
worker.postMessage({ formula, context });
```

## Security Considerations

### Input Sanitization
- No `eval()` or `Function()` constructor usage
- All user input escaped for display
- Formula parsing through safe AST

### Content Security Policy
```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self' 'unsafe-inline';">
```

### XSS Prevention
- Shadow DOM isolation
- No innerHTML with user content
- Event handler validation

## Troubleshooting

### Common Issues

1. **"Visual builder not found"**
   - Check if web components are supported
   - Verify script loading order
   - Check browser console for errors

2. **"Formula validation timeout"**
   - Complex formulas may need optimization
   - Check for circular references
   - Verify Elasticsearch connection

3. **"Cannot insert formula"**
   - Ensure formula editor is initialized
   - Check for customElements.whenDefined
   - Verify event bubbling

### Debug Mode
```javascript
// Enable debug logging
window.FORMULA_BUILDER_DEBUG = true;

// Check component state
console.log(visualBuilderIntegration.builder);
console.log(document.getElementById('formulaEditor'));
```

### Browser Compatibility
- Chrome 60+: (✓) Full support
- Firefox 63+: (✓) Full support
- Safari 10.1+: (✓) Full support
- Edge 79+: (✓) Full support
- IE11: (✗)Not supported (lacks Web Components)

## Future Enhancements

### Planned Features
1. **Formula History**
   - Undo/Redo functionality
   - Version tracking
   - Formula comparison

2. **Advanced Visualization**
   - Formula flow diagram
   - Dependency graph
   - Performance metrics

3. **Collaboration**
   - Formula sharing
   - Team templates
   - Comments and annotations

4. **AI Integration**
   - Natural language to formula
   - Formula optimization suggestions
   - Anomaly detection patterns

5. **Export/Import**
   - JSON formula definitions
   - Excel formula compatibility
   - SQL query generation

### Extension Points
```javascript
// Custom function provider
FormulaBuilder.registerFunctionProvider({
  getFunctions: () => [...],
  validateFunction: (name, args) => {...}
});

// Custom validator
FormulaBuilder.registerValidator({
  name: 'custom-validator',
  validate: (ast) => {...}
});

// Custom renderer
FormulaBuilder.registerRenderer({
  name: 'sql',
  render: (ast) => 'SELECT ...'
});
```

## Maintenance Guide

### Regular Tasks
1. Update function documentation
2. Add new Elasticsearch functions as available
3. Test browser compatibility
4. Monitor performance metrics
5. Review security updates

### Version Management
- Follow semantic versioning
- Document breaking changes
- Maintain backward compatibility
- Provide migration guides

### Contributing
1. Fork the repository
2. Create feature branch
3. Add tests for new features
4. Update documentation
5. Submit pull request

---

For questions or support, consult the dashboard team or refer to the inline code documentation.
