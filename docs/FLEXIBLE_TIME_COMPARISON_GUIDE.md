# Flexible Time Comparison Guide

## Overview

The RAD Monitor now supports flexible time period comparisons, allowing you to compare any arbitrary time period against any baseline period with intelligent normalization.

## New Features

### 1. Precise Time Period Specification

Instead of being limited to preset time ranges like "12h" or "24h", you can now specify exact start and end times for your comparison period:

```typescript
// TypeScript interface
export interface TrafficQueryRequest {
  baseline_start: string;      // ISO 8601 datetime
  baseline_end: string;        // ISO 8601 datetime

  // NEW: Precise comparison period
  comparison_start?: string;   // ISO 8601 datetime
  comparison_end?: string;     // ISO 8601 datetime

  // NEW: Normalization strategy
  time_comparison_strategy?: 'linear_scale' | 'hourly_average' | 'daily_pattern';

  // Existing fields
  current_time_range?: string; // Still supported for backward compatibility
  event_pattern?: string;
  host?: string;
}
```

### 2. Time Normalization Strategies

When comparing different time periods (e.g., 39 minutes vs 3.5 days), the system uses one of three strategies:

- **`linear_scale`** (default): Scales counts proportionally based on time duration ratio
- **`hourly_average`**: Uses hourly averages from the baseline period
- **`daily_pattern`**: Uses daily pattern analysis (original behavior)

### 3. Enhanced Response Metadata

The response now includes detailed normalization information:

```typescript
export interface TrafficQueryResponse {
  events: TrafficEvent[];
  metadata: {
    // Existing fields
    total_events: number;
    query_time: number;
    baseline_days: number;
    current_hours: number;

    // NEW: Normalization details
    baseline_duration_ms: number;     // Baseline period in milliseconds
    comparison_duration_ms: number;   // Comparison period in milliseconds
    normalization_factor: number;     // Ratio used for scaling
    comparison_method: string;        // Strategy used
  };
}
```

## Usage Examples

### Example 1: Compare Last 39 Minutes to 3.5 Days from Last Week

```javascript
import { FlexibleTimeComparison } from './assets/js/flexible-time-comparison.js';

// Compare last 39 minutes to 3.5 days from last week
const result = await FlexibleTimeComparison.compareLastMinutes(39, 7, 3.5);

console.log('Normalization factor:', result.metadata.normalization_factor);
// Output: ~128.6 (3.5 days is ~128.6 times longer than 39 minutes)
```

### Example 2: Custom Time Periods with Different Strategies

```javascript
const now = new Date();
const comparisonStart = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
const comparisonEnd = now;

const baselineEnd = new Date(now);
baselineEnd.setMonth(baselineEnd.getMonth() - 1); // 1 month ago
const baselineStart = new Date(baselineEnd.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days

// Try different strategies
const results = await FlexibleTimeComparison.compareWithStrategies({
    comparisonStart: comparisonStart.toISOString(),
    comparisonEnd: comparisonEnd.toISOString(),
    baselineStart: baselineStart.toISOString(),
    baselineEnd: baselineEnd.toISOString()
});

// Compare results from different strategies
console.log('Linear Scale:', results.linear_scale.summary);
console.log('Hourly Average:', results.hourly_average.summary);
console.log('Daily Pattern:', results.daily_pattern.summary);
```

### Example 3: Direct API Usage

```javascript
import { EnhancedApiClient } from './assets/js/api-client-enhanced.js';

const request = {
    baseline_start: "2023-11-01T00:00:00Z",
    baseline_end: "2023-11-04T12:00:00Z",    // 3.5 days
    comparison_start: "2023-11-11T11:21:00Z",
    comparison_end: "2023-11-11T12:00:00Z",   // 39 minutes
    time_comparison_strategy: "linear_scale",
    event_pattern: "pandc.vnext.recommendations.feed.feed*",
    host: "dashboard.godaddy.com"
};

const result = await EnhancedApiClient.trafficAnalysis(request);

// The system automatically calculates:
// - Baseline duration: 302,400,000 ms (3.5 days)
// - Comparison duration: 2,340,000 ms (39 minutes)
// - Normalization factor: 129.23
//
// Each baseline count is divided by 129.23 to get the expected count for 39 minutes
```

## Mathematical Explanation

### Linear Scale Strategy

For comparing period A (e.g., 39 minutes) to period B (e.g., 3.5 days):

```
normalization_factor = duration_B / duration_A
expected_count_A = actual_count_B / normalization_factor
```

This assumes traffic is evenly distributed across the baseline period.

### Hourly Average Strategy

```
hourly_average = total_baseline_count / baseline_hours
expected_count = hourly_average * comparison_hours
```

This is useful when you expect consistent hourly patterns.

### Daily Pattern Strategy

```
daily_average = total_baseline_count / baseline_days
hourly_fraction = comparison_hours / 24
expected_count = daily_average * hourly_fraction
```

This maintains the original behavior for backward compatibility.

## Integration with Existing Code

### Backward Compatibility

The system maintains full backward compatibility. Existing code using `current_time_range` continues to work:

```javascript
// Old style - still works
const request = {
    baseline_start: "2023-11-01T00:00:00Z",
    baseline_end: "2023-11-08T00:00:00Z",
    current_time_range: "12h"  // Uses last 12 hours
};

// New style - more flexible
const request = {
    baseline_start: "2023-11-01T00:00:00Z",
    baseline_end: "2023-11-08T00:00:00Z",
    comparison_start: "2023-11-11T00:00:00Z",
    comparison_end: "2023-11-11T12:00:00Z"
};
```

### Migration Path

1. **Phase 1**: Update to latest types (`api-types.ts`)
2. **Phase 2**: Test with new fields alongside existing `current_time_range`
3. **Phase 3**: Gradually migrate to using precise time periods where beneficial
4. **Phase 4**: Leverage different strategies based on your use case

## Best Practices

1. **Choose the Right Strategy**:
   - Use `linear_scale` for general comparisons
   - Use `hourly_average` for intraday patterns
   - Use `daily_pattern` for maintaining existing behavior

2. **Consider Time Zone**:
   - Always use UTC timestamps (with 'Z' suffix)
   - Convert to local time only for display

3. **Validate Durations**:
   - Ensure comparison period is shorter than baseline
   - Avoid comparing very short periods (< 5 minutes) to very long baselines (> 30 days)

4. **Monitor Normalization Factor**:
   - Very high factors (> 1000) may indicate unrealistic comparisons
   - Log and monitor the normalization factor for debugging

## Testing

Run the test suite to verify the implementation:

```bash
# Python tests
python tests/test_flexible_time_comparison.py

# JavaScript example
# In browser console:
await FlexibleTimeComparison.runExamples()
```

## Performance Considerations

- The calculation overhead is minimal (< 1ms)
- No additional database queries are required
- Response size increases slightly due to metadata
- Cache keys automatically include comparison parameters

## Future Enhancements

1. **Seasonal Patterns**: Account for day-of-week or seasonal variations
2. **Confidence Intervals**: Provide statistical confidence for comparisons
3. **Auto-Strategy Selection**: Automatically choose best strategy based on data
4. **Multi-Period Comparison**: Compare against multiple baseline periods simultaneously
