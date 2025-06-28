/**
 * Formula Builder Type Definitions and Constants
 */

// Function Categories
export const FunctionCategories = {
  ELASTICSEARCH: 'elasticsearch',
  TIME_SERIES: 'timeSeries',
  MATH: 'math',
  COMPARISON: 'comparison',
  KIBANA_CONTEXT: 'kibanaContext'
};

// Function Types
export const FunctionTypes = {
  // Elasticsearch Functions
  AVERAGE: 'average',
  COUNT: 'count',
  LAST_VALUE: 'last_value',
  MAX: 'max',
  MEDIAN: 'median',
  MIN: 'min',
  PERCENTILE: 'percentile',
  PERCENTILE_RANK: 'percentile_rank',
  STANDARD_DEVIATION: 'standard_deviation',
  SUM: 'sum',
  UNIQUE_COUNT: 'unique_count',

  // Time Series Functions
  COUNTER_RATE: 'counter_rate',
  CUMULATIVE_SUM: 'cumulative_sum',
  DIFFERENCES: 'differences',
  MOVING_AVERAGE: 'moving_average',
  NORMALIZE_BY_UNIT: 'normalize_by_unit',
  OVERALL_AVERAGE: 'overall_average',
  OVERALL_MAX: 'overall_max',
  OVERALL_MIN: 'overall_min',
  OVERALL_SUM: 'overall_sum',

  // Math Functions
  ABS: 'abs',
  ADD: 'add',
  CBRT: 'cbrt',
  CEIL: 'ceil',
  CLAMP: 'clamp',
  CUBE: 'cube',
  DEFAULTS: 'defaults',
  DIVIDE: 'divide',
  EXP: 'exp',
  FIX: 'fix',
  FLOOR: 'floor',
  LOG: 'log',
  MOD: 'mod',
  MULTIPLY: 'multiply',
  PICK_MAX: 'pick_max',
  PICK_MIN: 'pick_min',
  POW: 'pow',
  ROUND: 'round',
  SQRT: 'sqrt',
  SQUARE: 'square',
  SUBTRACT: 'subtract',

  // Comparison Functions
  EQ: 'eq',
  GT: 'gt',
  GTE: 'gte',
  IFELSE: 'ifelse',
  LT: 'lt',
  LTE: 'lte',

  // Kibana Context Functions
  INTERVAL: 'interval',
  NOW: 'now',
  TIME_RANGE: 'time_range'
};

// Function Metadata
export const FunctionMetadata = {
  [FunctionTypes.COUNT]: {
    name: 'count',
    category: FunctionCategories.ELASTICSEARCH,
    description: 'Count documents or field values',
    parameters: [
      { name: 'field', type: 'string', optional: true },
      { name: 'kql', type: 'string', optional: true },
      { name: 'lucene', type: 'string', optional: true }
    ],
    returns: 'number',
    examples: [
      'count()',
      'count(products.id)',
      'count(kql=\'price > 500\')'
    ]
  },

  [FunctionTypes.AVERAGE]: {
    name: 'average',
    category: FunctionCategories.ELASTICSEARCH,
    description: 'Returns the average of a field',
    parameters: [
      { name: 'field', type: 'string', required: true },
      { name: 'kql', type: 'string', optional: true }
    ],
    returns: 'number',
    examples: [
      'average(price)',
      'average(price, kql=\'location:UK\')'
    ]
  },

  [FunctionTypes.IFELSE]: {
    name: 'ifelse',
    category: FunctionCategories.COMPARISON,
    description: 'Conditional logic - if condition then value1 else value2',
    parameters: [
      { name: 'condition', type: 'boolean', required: true },
      { name: 'trueValue', type: 'number', required: true },
      { name: 'falseValue', type: 'number', required: true }
    ],
    returns: 'number',
    examples: [
      'ifelse(count() > 100, 1, 0)',
      'ifelse(average(bytes) > 1000, round(average(bytes) / 1000), 0)'
    ]
  },

  [FunctionTypes.MOVING_AVERAGE]: {
    name: 'moving_average',
    category: FunctionCategories.TIME_SERIES,
    description: 'Calculate moving average over time',
    parameters: [
      { name: 'metric', type: 'number', required: true },
      { name: 'window', type: 'number', optional: true, default: 5 }
    ],
    returns: 'number',
    examples: [
      'moving_average(sum(bytes))',
      'moving_average(sum(bytes), window=10)'
    ]
  }

  // Add more function metadata as needed
};

// Operator mappings
export const Operators = {
  PLUS: '+',
  MINUS: '-',
  MULTIPLY: '*',
  DIVIDE: '/',
  EQUALS: '==',
  NOT_EQUALS: '!=',
  GREATER_THAN: '>',
  GREATER_THAN_EQUALS: '>=',
  LESS_THAN: '<',
  LESS_THAN_EQUALS: '<='
};

// Time units for normalize_by_unit
export const TimeUnits = {
  SECOND: 's',
  MINUTE: 'm',
  HOUR: 'h',
  DAY: 'd',
  WEEK: 'w',
  MONTH: 'M',
  YEAR: 'y'
};

// AST Node Types
export const ASTNodeTypes = {
  FUNCTION_CALL: 'FunctionCall',
  BINARY_OPERATION: 'BinaryOperation',
  UNARY_OPERATION: 'UnaryOperation',
  LITERAL: 'Literal',
  FIELD_REFERENCE: 'FieldReference',
  PARAMETER: 'Parameter'
};

// Export helper to get function info
export function getFunctionInfo(functionType) {
  return FunctionMetadata[functionType] || null;
}

// Export helper to categorize functions
export function getFunctionsByCategory(category) {
  return Object.entries(FunctionMetadata)
    .filter(([_, metadata]) => metadata.category === category)
    .map(([type, metadata]) => ({ type, ...metadata }));
}
