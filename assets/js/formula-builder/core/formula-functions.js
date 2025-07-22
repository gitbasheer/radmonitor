/**
 * Formula Functions Reference
 * Complete list of supported functions based on Kibana Lens
 */

// Elasticsearch aggregation functions
export const ELASTICSEARCH_FUNCTIONS = new Set([
  'average',
  'count',
  'last_value',
  'max',
  'median',
  'min',
  'percentile',
  'percentile_rank',
  'standard_deviation',
  'sum',
  'unique_count'
]);

// Column calculation functions (window functions)
export const COLUMN_FUNCTIONS = new Set([
  'counter_rate',
  'cumulative_sum',
  'differences',
  'moving_average',
  'normalize_by_unit',
  'overall_average',
  'overall_max',
  'overall_min',
  'overall_sum'
]);

// Math functions
export const MATH_FUNCTIONS = new Set([
  'abs',
  'add',
  'cbrt',
  'ceil',
  'clamp',
  'cube',
  'defaults',
  'divide',
  'exp',
  'fix',
  'floor',
  'log',
  'mod',
  'multiply',
  'pick_max',
  'pick_min',
  'pow',
  'round',
  'sqrt',
  'square',
  'subtract'
]);

// Comparison functions
export const COMPARISON_FUNCTIONS = new Set([
  'eq',
  'gt',
  'gte',
  'ifelse',
  'lt',
  'lte'
]);

// Kibana context functions
export const CONTEXT_FUNCTIONS = new Set([
  'interval',
  'now',
  'time_range'
]);

// Function metadata for UI and validation
export const FUNCTION_METADATA = {
  // Elasticsearch functions
  average: {
    category: 'elasticsearch',
    description: 'Returns the average of a field',
    examples: ['average(price)', 'average(price, kql=\'location:UK\')'],
    icon: 'aggregate'
  },
  count: {
    category: 'elasticsearch',
    description: 'Total number of documents or field values',
    examples: ['count()', 'count(products.id)', 'count(kql=\'price > 500\')'],
    icon: 'aggregate'
  },
  last_value: {
    category: 'elasticsearch',
    description: 'Returns the value from the last document',
    examples: ['last_value(server.status)', 'last_value(server.status, kql=\'server.name="A"\')'],
    icon: 'aggregate'
  },
  max: {
    category: 'elasticsearch',
    description: 'Returns the maximum value of a field',
    examples: ['max(price)', 'max(price, kql=\'location:UK\')'],
    icon: 'aggregate'
  },
  median: {
    category: 'elasticsearch',
    description: 'Returns the median value of a field',
    examples: ['median(price)', 'median(price, kql=\'location:UK\')'],
    icon: 'aggregate'
  },
  min: {
    category: 'elasticsearch',
    description: 'Returns the minimum value of a field',
    examples: ['min(price)', 'min(price, kql=\'location:UK\')'],
    icon: 'aggregate'
  },
  percentile: {
    category: 'elasticsearch',
    description: 'Returns the specified percentile of values',
    examples: ['percentile(bytes, percentile=95)', 'percentile(response_time, percentile=99)'],
    icon: 'aggregate'
  },
  percentile_rank: {
    category: 'elasticsearch',
    description: 'Returns the percentage of values below a certain value',
    examples: ['percentile_rank(bytes, value=100)', 'percentile_rank(score, value=80)'],
    icon: 'aggregate'
  },
  standard_deviation: {
    category: 'elasticsearch',
    description: 'Returns the amount of variation of the field',
    examples: ['standard_deviation(price)', 'square(standard_deviation(price, kql=\'location:UK\'))'],
    icon: 'aggregate'
  },
  sum: {
    category: 'elasticsearch',
    description: 'Returns the sum of a field',
    examples: ['sum(price)', 'sum(price, kql=\'location:UK\')'],
    icon: 'aggregate'
  },
  unique_count: {
    category: 'elasticsearch',
    description: 'Calculates the number of unique values',
    examples: ['unique_count(product.name)', 'unique_count(user.id, kql=\'status:active\')'],
    icon: 'aggregate'
  },

  // Column functions
  counter_rate: {
    category: 'column',
    description: 'Calculates the rate of an ever-increasing counter',
    examples: ['counter_rate(max(network.bytes))', 'counter_rate(max(cpu.ticks))'],
    icon: 'timeseries'
  },
  cumulative_sum: {
    category: 'column',
    description: 'Calculates the cumulative sum over time',
    examples: ['cumulative_sum(sum(bytes))', 'cumulative_sum(count())'],
    icon: 'timeseries'
  },
  differences: {
    category: 'column',
    description: 'Calculates the difference to the last value',
    examples: ['differences(sum(bytes))', 'differences(average(cpu))'],
    icon: 'timeseries'
  },
  moving_average: {
    category: 'column',
    description: 'Calculates the moving average over time',
    examples: ['moving_average(sum(bytes), window=5)', 'moving_average(average(response_time), window=10)'],
    icon: 'timeseries'
  },
  normalize_by_unit: {
    category: 'column',
    description: 'Normalizes counts to a specific time interval',
    examples: ['normalize_by_unit(sum(bytes), unit=\'s\')', 'normalize_by_unit(count(), unit=\'m\')'],
    icon: 'timeseries'
  },
  overall_average: {
    category: 'column',
    description: 'Calculates the average for all data points in a series',
    examples: ['overall_average(sum(bytes))', 'sum(bytes) - overall_average(sum(bytes))'],
    icon: 'timeseries'
  },
  overall_max: {
    category: 'column',
    description: 'Calculates the maximum for all data points in a series',
    examples: ['overall_max(sum(bytes))', '(sum(bytes) - overall_min(sum(bytes))) / (overall_max(sum(bytes)) - overall_min(sum(bytes)))'],
    icon: 'timeseries'
  },
  overall_min: {
    category: 'column',
    description: 'Calculates the minimum for all data points in a series',
    examples: ['overall_min(sum(bytes))', 'sum(bytes) - overall_min(sum(bytes))'],
    icon: 'timeseries'
  },
  overall_sum: {
    category: 'column',
    description: 'Calculates the sum for all data points in a series',
    examples: ['overall_sum(sum(bytes))', 'sum(bytes) / overall_sum(sum(bytes))'],
    icon: 'timeseries'
  },

  // Math functions
  abs: {
    category: 'math',
    description: 'Calculates absolute value',
    examples: ['abs(average(altitude))', 'abs(differences(sum(bytes)))'],
    icon: 'math'
  },
  add: {
    category: 'math',
    description: 'Adds two numbers',
    examples: ['add(sum(price), sum(tax))', 'add(count(), 5)'],
    icon: 'math'
  },
  cbrt: {
    category: 'math',
    description: 'Cube root of value',
    examples: ['cbrt(last_value(volume))', 'cbrt(sum(bytes))'],
    icon: 'math'
  },
  ceil: {
    category: 'math',
    description: 'Rounds up to nearest integer',
    examples: ['ceil(sum(price))', 'ceil(average(score))'],
    icon: 'math'
  },
  clamp: {
    category: 'math',
    description: 'Limits value between min and max',
    examples: ['clamp(average(bytes), percentile(bytes, percentile=5), percentile(bytes, percentile=95))'],
    icon: 'math'
  },
  cube: {
    category: 'math',
    description: 'Calculates the cube of a number',
    examples: ['cube(last_value(length))', 'cube(average(size))'],
    icon: 'math'
  },
  defaults: {
    category: 'math',
    description: 'Returns default value when null',
    examples: ['defaults(average(bytes), -1)', 'defaults(sum(revenue), 0)'],
    icon: 'math'
  },
  divide: {
    category: 'math',
    description: 'Divides first number by second',
    examples: ['divide(sum(profit), sum(revenue))', 'sum(bytes) / count()'],
    icon: 'math'
  },
  exp: {
    category: 'math',
    description: 'Raises e to the nth power',
    examples: ['exp(last_value(rate))', 'exp(average(factor))'],
    icon: 'math'
  },
  fix: {
    category: 'math',
    description: 'Rounds towards zero',
    examples: ['fix(sum(profit))', 'fix(average(score))'],
    icon: 'math'
  },
  floor: {
    category: 'math',
    description: 'Rounds down to nearest integer',
    examples: ['floor(sum(price))', 'floor(average(rating))'],
    icon: 'math'
  },
  log: {
    category: 'math',
    description: 'Logarithm with optional base',
    examples: ['log(sum(bytes))', 'log(sum(bytes), 2)'],
    icon: 'math'
  },
  mod: {
    category: 'math',
    description: 'Remainder after division',
    examples: ['mod(sum(price), 1000)', 'mod(count(), 10)'],
    icon: 'math'
  },
  multiply: {
    category: 'math',
    description: 'Multiplies two numbers',
    examples: ['multiply(sum(price), 1.2)', 'sum(bytes) * last_value(factor)'],
    icon: 'math'
  },
  pick_max: {
    category: 'math',
    description: 'Returns maximum of two numbers',
    examples: ['pick_max(average(bytes), average(memory))', 'pick_max(sum(a), sum(b))'],
    icon: 'math'
  },
  pick_min: {
    category: 'math',
    description: 'Returns minimum of two numbers',
    examples: ['pick_min(average(bytes), average(memory))', 'pick_min(sum(a), sum(b))'],
    icon: 'math'
  },
  pow: {
    category: 'math',
    description: 'Raises value to a power',
    examples: ['pow(last_value(length), 3)', 'pow(average(size), 2)'],
    icon: 'math'
  },
  round: {
    category: 'math',
    description: 'Rounds to decimal places',
    examples: ['round(sum(bytes))', 'round(average(price), 2)'],
    icon: 'math'
  },
  sqrt: {
    category: 'math',
    description: 'Square root of value',
    examples: ['sqrt(last_value(area))', 'sqrt(sum(variance))'],
    icon: 'math'
  },
  square: {
    category: 'math',
    description: 'Raises value to 2nd power',
    examples: ['square(last_value(length))', 'square(standard_deviation(price))'],
    icon: 'math'
  },
  subtract: {
    category: 'math',
    description: 'Subtracts second from first',
    examples: ['subtract(max(bytes), min(bytes))', 'sum(revenue) - sum(costs)'],
    icon: 'math'
  },

  // Comparison functions
  eq: {
    category: 'comparison',
    description: 'Equality comparison',
    examples: ['eq(sum(bytes), 1000000)', 'average(bytes) == average(memory)'],
    icon: 'compare'
  },
  gt: {
    category: 'comparison',
    description: 'Greater than comparison',
    examples: ['gt(average(bytes), 1000)', 'average(bytes) > average(memory)'],
    icon: 'compare'
  },
  gte: {
    category: 'comparison',
    description: 'Greater than or equal comparison',
    examples: ['gte(average(bytes), 1000)', 'average(bytes) >= average(memory)'],
    icon: 'compare'
  },
  ifelse: {
    category: 'comparison',
    description: 'Conditional value return',
    examples: ['ifelse(count() > 100, sum(revenue), 0)', 'ifelse(average(cpu) > 80, \'High\', \'Normal\')'],
    icon: 'compare'
  },
  lt: {
    category: 'comparison',
    description: 'Less than comparison',
    examples: ['lt(average(bytes), 1000)', 'average(bytes) < average(memory)'],
    icon: 'compare'
  },
  lte: {
    category: 'comparison',
    description: 'Less than or equal comparison',
    examples: ['lte(average(bytes), 1000)', 'average(bytes) <= average(memory)'],
    icon: 'compare'
  },

  // Context functions
  interval: {
    category: 'context',
    description: 'Date histogram interval in milliseconds',
    examples: ['sum(bytes) / interval()', 'count() * (60000 / interval())'],
    icon: 'context'
  },
  now: {
    category: 'context',
    description: 'Current time in milliseconds',
    examples: ['now() - last_value(start_time)', 'now() - 86400000'],
    icon: 'context'
  },
  time_range: {
    category: 'context',
    description: 'Selected time range in milliseconds',
    examples: ['time_range()', '(sum(bytes) / time_range()) * 86400000'],
    icon: 'context'
  }
};

// Common formula patterns
export const FORMULA_PATTERNS = {
  'Error Rate': {
    formula: 'count(kql=\'response.status_code >= 400\') / count()',
    description: 'Calculate the percentage of errors',
    category: 'metrics'
  },
  'Week over Week': {
    formula: 'sum(revenue) / sum(revenue, shift=\'1w\')',
    description: 'Compare current week to previous week',
    category: 'timeseries'
  },
  'Percent of Total': {
    formula: 'sum(sales) / overall_sum(sum(sales))',
    description: 'Calculate percentage of total for each group',
    category: 'metrics'
  },
  'Moving Average': {
    formula: 'moving_average(average(response_time), window=10)',
    description: 'Smooth out fluctuations with moving average',
    category: 'timeseries'
  },
  'Rate of Change': {
    formula: 'differences(sum(total)) / sum(total, shift=\'1d\')',
    description: 'Calculate day-over-day rate of change',
    category: 'timeseries'
  },
  'Conversion Rate': {
    formula: 'count(kql=\'event.type:purchase\') / count(kql=\'event.type:view\')',
    description: 'Calculate conversion from views to purchases',
    category: 'metrics'
  },
  'Average Session Duration': {
    formula: 'average(session.duration) / 60000',
    description: 'Convert milliseconds to minutes',
    category: 'metrics'
  },
  'Percentile Range': {
    formula: 'percentile(response_time, percentile=95) - percentile(response_time, percentile=5)',
    description: 'Calculate range between 5th and 95th percentile',
    category: 'metrics'
  },
  'Cumulative Total': {
    formula: 'cumulative_sum(sum(revenue))',
    description: 'Running total over time',
    category: 'timeseries'
  },
  'Outlier Detection': {
    formula: 'ifelse(abs(average(value) - overall_average(average(value))) > 2 * standard_deviation(value), 1, 0)',
    description: 'Flag values more than 2 standard deviations from mean',
    category: 'analytics'
  },

  // RAD-specific monitoring patterns
  'Traffic Drop Detection': {
    formula: '((count() - count(shift=\'1d\')) / count(shift=\'1d\')) * -100',
    description: 'Detect traffic drops compared to yesterday (RAD Monitor)',
    category: 'rad-monitoring'
  },
  'Spike Alert': {
    formula: 'ifelse(count() > (average(count(), shift=\'7d\') * 1.5), 1, 0)',
    description: 'Alert when traffic spikes 50% above 7-day average',
    category: 'rad-monitoring'
  },
  'Comparison to Baseline': {
    formula: '(count() - average(count(), shift=\'7d\')) / average(count(), shift=\'7d\') * 100',
    description: 'Compare current traffic to 7-day baseline percentage',
    category: 'rad-monitoring'
  },
  'Critical Traffic Drop': {
    formula: 'ifelse((count() / count(shift=\'1d\')) < 0.2, 1, 0)',
    description: 'Flag when traffic drops more than 80% (Critical)',
    category: 'rad-monitoring'
  },
  'Warning Traffic Drop': {
    formula: 'ifelse((count() / count(shift=\'1d\')) < 0.5 && (count() / count(shift=\'1d\')) >= 0.2, 1, 0)',
    description: 'Flag when traffic drops 50-80% ⚠',
    category: 'rad-monitoring'
  },
  'Hourly Traffic Pattern': {
    formula: 'count() / average(count(), shift=\'1w\')',
    description: 'Compare current hour to same hour last week',
    category: 'rad-monitoring'
  },
  'Business Impact Score': {
    formula: '((count(shift=\'1d\') - count()) / count(shift=\'1d\')) * unique_count(user.id)',
    description: 'Calculate business impact based on traffic drop and unique users',
    category: 'rad-monitoring'
  },
  'Weekend Traffic Adjustment': {
    formula: 'count() * ifelse(date_histogram_interval("day_of_week") >= 6, 1.43, 1)',
    description: 'Adjust traffic expectations for weekends (30% lower baseline)',
    category: 'rad-monitoring'
  },
  'Multi-RAD Comparison': {
    formula: 'count(kql=\'rad_type:A\') / count(kql=\'rad_type:B\')',
    description: 'Compare traffic between different RAD types',
    category: 'rad-monitoring'
  },
  'Traffic Recovery Rate': {
    formula: '(count() - min(count(), shift=\'1h\')) / (count(shift=\'1d\') - min(count(), shift=\'1h\'))',
    description: 'Measure how quickly traffic is recovering from a drop',
    category: 'rad-monitoring'
  },
  'Traffic Drop Alert': {
    formula: 'ifelse(count() < count(shift="1d") * 0.5, "CRITICAL", "NORMAL")',
    description: 'Alert when traffic drops by 50% compared to yesterday',
    category: 'rad-monitoring'
  },
  'Baseline Deviation': {
    formula: '(count() - overall_average(count())) / overall_average(count()) * 100',
    description: 'Percentage deviation from average baseline',
    category: 'rad-monitoring'
  }
};

// Function categories for UI organization
export const FUNCTION_CATEGORIES = {
  elasticsearch: {
    name: 'Elasticsearch',
    description: 'Aggregation functions that run on raw documents',
    functions: Array.from(ELASTICSEARCH_FUNCTIONS)
  },
  column: {
    name: 'Column Calculations',
    description: 'Window functions that operate on entire columns',
    functions: Array.from(COLUMN_FUNCTIONS)
  },
  math: {
    name: 'Math',
    description: 'Mathematical operations on numbers',
    functions: Array.from(MATH_FUNCTIONS)
  },
  comparison: {
    name: 'Comparison',
    description: 'Compare values and conditional logic',
    functions: Array.from(COMPARISON_FUNCTIONS)
  },
  context: {
    name: 'Context',
    description: 'Access Kibana context like time range',
    functions: Array.from(CONTEXT_FUNCTIONS)
  }
};
