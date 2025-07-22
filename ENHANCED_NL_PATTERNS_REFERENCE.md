# Enhanced Natural Language Patterns Reference

## Overview

This document provides a comprehensive reference for all natural language patterns supported by the AI Formula Assistant in the RAD Monitor Dashboard. These patterns enable users to create complex monitoring formulas using simple English phrases.

## Pattern Categories

### 1. Traffic Drop Patterns

| Natural Language | Generated Formula | Use Case |
|-----------------|-------------------|----------|
| `traffic dropped by 50%` | `count() < count(shift="1d") * 0.5` | Detect if current traffic is less than 50% of yesterday |
| `traffic decreased more than 30%` | `count() < count(shift="1d") * 0.7` | Find traffic decreases exceeding a threshold |
| `traffic drops over 80%` | `ifelse((count() / count(shift="1d")) < 0.2, 1, 0)` | Boolean flag for severe drops |
| `critical traffic drop` | `ifelse((count() / count(shift="1d")) < 0.2, 1, 0)` | Pre-defined critical threshold (80% drop) |
| `warning traffic drop` | `ifelse((count() / count(shift="1d")) < 0.5 && (count() / count(shift="1d")) >= 0.2, 1, 0)` | Warning level (50-80% drop) |
| `sustained drop` | `min(count(), shift="30m") < average(count(), shift="1d") * 0.7` | Detect sustained traffic drops |

### 2. Baseline Analysis

| Natural Language | Generated Formula | Use Case |
|-----------------|-------------------|----------|
| `baseline traffic for user_login` | `average(count(), kql="event_id:user_login", shift="1w")` | Get baseline for specific event |
| `normal traffic for checkout_flow` | `average(count(), kql="event_id:checkout_flow", shift="1w")` | Normal traffic pattern |
| `baseline deviation` | `(count() - overall_average(count())) / overall_average(count()) * 100` | Percentage deviation from baseline |
| `traffic above baseline` | `(count() - average(count(), shift="1w")) / average(count(), shift="1w") * 100` | Percentage above weekly baseline |
| `anomaly detection` | `abs((count() - average(count(), shift="1w")) / standard_deviation(count(), shift="1w")) > 3` | Statistical anomaly (3-sigma) |

### 3. Health & Performance

| Natural Language | Generated Formula | Use Case |
|-----------------|-------------------|----------|
| `health score` | `100 * (1 - (count(kql="status:error") / count()))` | Overall service health percentage |
| `error rate` | `count(kql='response.status_code >= 400') / count()` | Percentage of errors |
| `slow response times` | `average(response_time) > percentile(response_time, percentile=90, shift="1w")` | Detect performance degradation |
| `high response times` | `average(response_time) > percentile(response_time, percentile=90, shift="1w")` | Alternative phrasing |
| `service degradation` | `(average(response_time) > average(response_time, shift="1d") * 1.5) \|\| (count(kql="status:error") / count() > 0.05)` | Multi-factor degradation |
| `availability` | `100 * (1 - count(kql='status:error') / count())` | Service availability percentage |

### 4. Time Comparisons

| Natural Language | Generated Formula | Use Case |
|-----------------|-------------------|----------|
| `compare vs last week` | `count() / count(shift="1w")` | Week-over-week ratio |
| `week over week revenue` | `sum(revenue) / sum(revenue, shift='1w')` | WoW for specific metric |
| `day over day for sales` | `sum(sales) / sum(sales, shift='1d')` | DoD comparison |
| `month over month` | `sum($1) / sum($1, shift='1M')` | MoM comparison |
| `traffic trend` | `(count() - count(shift="1h")) / count(shift="1h") * 100` | Hourly trend percentage |
| `moving average of response time over 10` | `moving_average(average(response_time), window=10)` | Smoothed metrics |

### 5. Alert & Monitoring

| Natural Language | Generated Formula | Use Case |
|-----------------|-------------------|----------|
| `alert when errors exceed 10%` | `ifelse((count(kql='response.status_code >= 400') / count()) > 0.1, 1, 0)` | Error threshold alert |
| `monitor checkout_flow for drops` | `ifelse(count(kql="event_id:checkout_flow") < count(kql="event_id:checkout_flow", shift="1d") * 0.8, "ALERT", "OK")` | Event-specific monitoring |
| `traffic spike above 50%` | `ifelse(count() > count(shift="1d") * 1.5, 1, 0)` | Spike detection |
| `minimum traffic threshold` | `ifelse(count() < overall_min(count()) * 1.2, "LOW", "NORMAL")` | Low traffic detection |

### 6. Business Impact

| Natural Language | Generated Formula | Use Case |
|-----------------|-------------------|----------|
| `business impact` | `((count(shift="1d") - count()) / count(shift="1d")) * unique_count(user.id)` | Users affected by drop |
| `impact radius` | `unique_count(user.id) * ((count(shift="1d") - count()) / count(shift="1d"))` | Alternative phrasing |
| `recovery rate` | `(count() - min(count(), shift="1h")) / (average(count(), shift="1d") - min(count(), shift="1h"))` | Recovery progress |
| `weekend traffic` | `count() * ifelse(date_histogram_interval("day_of_week") >= 6, 1.43, 1)` | Weekend normalization |

### 7. Advanced Analytics

| Natural Language | Generated Formula | Use Case |
|-----------------|-------------------|----------|
| `peak traffic` | `max(count()) / average(count())` | Peak to average ratio |
| `cumulative total of revenue` | `cumulative_sum(sum(revenue))` | Running total |
| `unique count of users` | `unique_count(users)` | Distinct count |
| `percentile of response_time` | `percentile(response_time, percentile=95)` | 95th percentile |
| `conversion rate` | `count(kql='event.type:purchase') / count(kql='event.type:view')` | Funnel analysis |

## Usage Tips

### 1. Flexibility in Phrasing
The AI understands various phrasings:
- "traffic dropped by 50%" = "traffic decreased 50%" = "traffic down 50%"
- "baseline for X" = "normal traffic for X" = "expected traffic for X"

### 2. Parameter Extraction
The AI extracts numeric values and event names:
- Numbers: "50%", "30 percent", "twenty percent" (numeric only)
- Event IDs: Extracted from phrases like "for user_login" or "monitor checkout_flow"
- Time units: "week", "day", "hour", "month"

### 3. Confidence Levels
- **High (80%+)**: Direct pattern match
- **Medium (60-79%)**: Fuzzy match or library pattern
- **Low (<60%)**: Partial match or fallback

### 4. Learning System
The AI learns from:
- Positive feedback (👍) on suggestions
- Successfully applied formulas
- Repeated usage patterns

## Best Practices

1. **Be Specific**: "traffic dropped by 50%" is better than "traffic low"
2. **Include Context**: "monitor checkout_flow for drops" vs just "monitor drops"
3. **Use Standard Terms**: Use common monitoring terminology
4. **Provide Feedback**: Use 👍👎 buttons to improve suggestions

## Extending Patterns

To add new patterns, update the `NL_PATTERNS` array in `formula-ai-assistant.js`:

```javascript
{
  pattern: /your pattern regex/i,
  template: 'your_formula_template'
}
```

Variables are captured with regex groups and replaced using `$1`, `$2`, etc.

## Troubleshooting

### Pattern Not Recognized?
1. Try alternative phrasing
2. Check for typos
3. Be more specific
4. Use simpler language

### Wrong Formula Generated?
1. Provide feedback with 👎
2. Try more specific phrasing
3. Check if numbers/names are clear
4. Review similar examples above

### Low Confidence Score?
- Add more context
- Use standard monitoring terms
- Check pattern reference above
- Try exact phrases from examples
