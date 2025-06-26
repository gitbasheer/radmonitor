# Inspection Time Feature Documentation

## Overview

The `inspection_time` feature provides a predefined time window for analyzing traffic data from a specific inspection period. Instead of looking at the most recent data, it examines a fixed window from 24 hours ago to 8 hours ago (a 16-hour inspection window).

## Purpose

This feature is useful for:
- **Post-incident analysis**: Review traffic patterns during a specific past time window
- **Scheduled inspections**: Analyze traffic during off-peak hours or maintenance windows
- **Comparative analysis**: Compare current traffic with a known inspection period
- **Debugging**: Investigate issues that occurred in a specific time frame

## Technical Implementation

### Time Window Definition
- **Start**: 24 hours ago from current time
- **End**: 8 hours ago from current time
- **Duration**: 16-hour window

### Components Updated

1. **TimeRangeUtils** (`assets/js/time-range-utils.js`)
   - Added `inspection_time` validation
   - Added parsing logic for inspection time
   - Added to preset time ranges
   - Format display shows "Inspection Time (8-24h ago)"

2. **Enhanced CORS Proxy** (`cors_proxy_enhanced.py`)
   - Updated Pydantic model to accept `inspection_time`
   - Added custom query building for inspection window
   - Calculates correct time ranges for Elasticsearch queries

3. **TypeScript Types** (`assets/js/api-types.ts`)
   - Added `InspectionTimeRange` type
   - Updated response metadata to include time range type

4. **Enhanced API Client** (`assets/js/api-client-enhanced.js`)
   - Added `getInspectionTimeData()` convenience method
   - Updated `getCurrentTrafficData()` to support inspection_time

5. **Data Layer** (`assets/js/data-layer.js`)
   - Supports inspection_time in traffic analysis queries

6. **Config Manager** (`assets/js/config-manager.js`)
   - Added "Inspection" preset button
   - Maps inspection_time to button highlighting

7. **Dashboard Template** (`assets/templates/index.html.template`)
   - Added "Inspection" button to time range presets
   - Updated help text to include inspection_time

## Usage Examples

### In the Dashboard UI

1. **Using the preset button**:
   - Click the "Inspection" button in the time range presets
   - The time range field will be set to `inspection_time`
   - Click "APPLY CONFIGURATION" or "REFRESH NOW"

2. **Manual entry**:
   - Type `inspection_time` in the Current Time Range field
   - The dashboard will validate and accept it

### Using the API

```javascript
// Using the enhanced API client
const result = await EnhancedApiClient.getInspectionTimeData();

// Or using the general method
const result = await EnhancedApiClient.getCurrentTrafficData('inspection_time');
```

### Direct API Call

```bash
curl -X POST http://localhost:8889/api/traffic-analysis \
  -H "Content-Type: application/json" \
  -H "X-Elastic-Cookie: your-cookie" \
  -d '{
    "baseline_start": "2025-06-01T00:00:00Z",
    "baseline_end": "2025-06-09T00:00:00Z",
    "current_time_range": "inspection_time"
  }'
```

## Response Metadata

When using inspection_time, the response includes additional metadata:

```json
{
  "metadata": {
    "time_range_type": "inspection",
    "current_hours": 16,
    // ... other metadata
  }
}
```

## Testing

Run the test script in your browser console:

```javascript
// Load the test script
const script = document.createElement('script');
script.src = 'test_inspection_time.js';
document.head.appendChild(script);
```

Or manually test:

```javascript
// Validate inspection_time
console.log(TimeRangeUtils.validateTimeRange('inspection_time')); // true

// Parse inspection_time
console.log(TimeRangeUtils.parseTimeRange('inspection_time'));
// Output: { type: 'inspection', hours: 16, gte: 'now-24h', lte: 'now-8h', label: 'Inspection Time (8-24h ago)' }
```

## Future Enhancements

Potential improvements for the inspection_time feature:

1. **Configurable window**: Allow users to define custom inspection windows
2. **Multiple presets**: Support multiple inspection time presets (morning, evening, weekend)
3. **Saved inspections**: Save and recall specific inspection periods
4. **Comparison mode**: Compare inspection time with current time side-by-side

## Related Documentation

- [Enhanced Proxy Guide](ENHANCED_PROXY_GUIDE.md)
- [Time Range Utils](assets/js/time-range-utils.js)
- [API Types](assets/js/api-types.ts)
