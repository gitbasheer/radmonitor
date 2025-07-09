# Formula Builder Guide

## Overview
The RAD Monitor Formula Builder provides a powerful yet easy-to-use interface for creating custom monitoring formulas. Whether you prefer typing formulas directly or using our visual drag-and-drop builder, you can create sophisticated monitoring rules without deep technical knowledge.

## Quick Start

### Method 1: Using the Visual Builder (Recommended for Beginners)
1. Look for the **🎨 Visual Builder** button in the Custom Formulas section
2. Click to open the drag-and-drop interface
3. Drag functions from the left panel to create your formula
4. Select from pre-built templates for common monitoring patterns
5. Click "Insert Formula" to add it to the main editor

### Method 2: Direct Formula Editor
1. Type directly in the formula editor
2. Use autocomplete suggestions (Ctrl+Space)
3. See real-time validation feedback
4. Test your formula with the "🧪 Test Formula" button

### Method 3: AI-Powered Natural Language (NEW!)
1. Look for the **✨ AI input field** in the dashboard header
2. Type your monitoring needs in plain English
3. Review generated formulas with confidence scores
4. Click "Apply Formula" to use the suggestion
5. Provide feedback with 👍👎 to improve future suggestions

## AI Natural Language Examples

The AI assistant understands many natural language patterns. Here are some examples:

### Basic Monitoring
- **"traffic dropped by 50%"** → `count() < count(shift="1d") * 0.5`
- **"traffic decreased more than 30%"** → `count() < count(shift="1d") * 0.7`
- **"show errors over 10%"** → `ifelse((count(kql='response.status_code >= 400') / count()) > 0.1, 1, 0)`

### Baseline Analysis
- **"baseline traffic for user_login"** → `average(count(), kql="event_id:user_login", shift="1w")`
- **"traffic above baseline"** → `(count() - average(count(), shift="1w")) / average(count(), shift="1w") * 100`
- **"anomaly detection"** → `abs((count() - average(count(), shift="1w")) / standard_deviation(count(), shift="1w")) > 3`

### Advanced Monitoring
- **"health score"** → `100 * (1 - (count(kql="status:error") / count()))`
- **"monitor checkout_flow for drops"** → `ifelse(count(kql="event_id:checkout_flow") < count(kql="event_id:checkout_flow", shift="1d") * 0.8, "ALERT", "OK")`
- **"service degradation"** → `(average(response_time) > average(response_time, shift="1d") * 1.5) || (count(kql="status:error") / count() > 0.05)`
- **"sustained drop"** → `min(count(), shift="30m") < average(count(), shift="1d") * 0.7`

### Time Comparisons
- **"compare vs last week"** → `count() / count(shift="1w")`
- **"week over week revenue"** → `sum(revenue) / sum(revenue, shift='1w')`
- **"traffic trend"** → `(count() - count(shift="1h")) / count(shift="1h") * 100`

### Impact Analysis
- **"business impact"** → `((count(shift="1d") - count()) / count(shift="1d")) * unique_count(user.id)`
- **"impact radius"** → `unique_count(user.id) * ((count(shift="1d") - count()) / count(shift="1d"))`
- **"recovery rate"** → `(count() - min(count(), shift="1h")) / (average(count(), shift="1d") - min(count(), shift="1h"))`

## Common Monitoring Patterns

### Traffic Drop Detection
```
((count() - count(shift='1d')) / count(shift='1d')) * -100
```
**What it does:** Detects percentage drop in traffic compared to yesterday

### Spike Alert
```
ifelse(count() > (average(count(), shift='7d') * 1.5), 1, 0)
```
**What it does:** Alerts when traffic is 50% higher than the 7-day average

### Critical Traffic Drop
```
ifelse((count() / count(shift='1d')) < 0.2, 1, 0)
```
**What it does:** Flags when traffic drops more than 80% (Critical status)

## Available Functions

### Basic Aggregations
- `count()` - Total number of events
- `sum(field)` - Sum of a numeric field
- `average(field)` - Average value
- `min(field)` / `max(field)` - Minimum/Maximum values
- `unique_count(field)` - Count of unique values

### Time-Based Comparisons
- `shift='1d'` - Compare to 1 day ago
- `shift='1w'` - Compare to 1 week ago
- `shift='1h'` - Compare to 1 hour ago

### Math Operations
- `add()`, `subtract()`, `multiply()`, `divide()`
- `abs()` - Absolute value
- `round()` - Round to nearest integer
- `percentage calculations` - Use multiply by 100

### Conditional Logic
- `ifelse(condition, true_value, false_value)` - If-then-else logic
- `gt()`, `lt()`, `gte()`, `lte()` - Greater/less than comparisons
- `eq()` - Equality check

## Visual Builder Features

### User Levels
- **Beginner**: Shows only essential functions and simple templates
- **Intermediate**: Adds time-series functions and advanced templates
- **Advanced**: Full access to all functions and complex operations

### Templates Library
Pre-built formulas for common scenarios:
- Traffic Drop Detection
- Spike Alerts
- Baseline Comparisons
- Business Impact Calculations
- Weekend Traffic Adjustments

### Drag-and-Drop Interface
1. **Function Palette** (Left): Browse and search available functions
2. **Canvas** (Center): Build your formula visually
3. **Preview** (Right): See validation results and formula preview

## Tips for Success

### 1. Start Simple
Begin with basic count comparisons before adding complexity:
```
count() / count(shift='1d')
```

### 2. Use Templates
Browse the template library for pre-built patterns you can customize

### 3. Test Incrementally
Build your formula step by step, testing each addition

### 4. Leverage Autocomplete
Press Ctrl+Space in the editor for function suggestions

### 5. Check Validation
Red underlines indicate errors - hover for details

## Common Use Cases

### Monitor Traffic Drops
```
// Alert when traffic drops more than 50%
(count() / count(shift='1d')) < 0.5
```

### Track Business Impact
```
// Calculate lost traffic * average user value
((count(shift='1d') - count()) * 10.5)
```

### Weekend Adjustments
```
// Normalize weekend traffic (typically 30% lower)
count() * ifelse(date_histogram_interval("day_of_week") >= 6, 1.43, 1)
```

### Multi-RAD Comparison
```
// Compare traffic between RAD types
count(kql='rad_type:A') / count(kql='rad_type:B')
```

## Troubleshooting

### Formula Not Working?
1. Check for red validation errors
2. Ensure all parentheses are balanced
3. Verify field names are correct
4. Test with simpler components first

### Visual Builder Issues?
1. Refresh the page if components don't load
2. Check browser console for errors
3. Ensure you're using a modern browser (Chrome, Firefox, Safari, Edge)

### Need Help?
- Hover over any function for documentation
- Use the template library for examples
- Check validation messages for specific errors

## Keyboard Shortcuts

- `Ctrl+Space` - Show autocomplete
- `Ctrl+Enter` - Format formula
- `Ctrl+S` - Save formula (when in modal)
- `Esc` - Close autocomplete or modal

## Best Practices

1. **Name Your Formulas**: Use descriptive names for saved formulas
2. **Document Complex Logic**: Add comments to explain complex formulas
3. **Regular Testing**: Test formulas with different time ranges
4. **Version Control**: Keep track of formula changes
5. **Share Knowledge**: Export and share useful formulas with your team

---

Ready to create your first formula? Click the **🎨 Visual Builder** button to get started!
