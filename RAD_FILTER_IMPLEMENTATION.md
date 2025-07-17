# RAD Filter Implementation Guide

## Overview

The RAD filter functionality has been added to the Event Details UI to allow filtering events by RAD (Recommendation and Discovery) type. This implementation uses the existing EMIL (EID Monitoring Intelligence Layer) infrastructure to parse and classify EIDs.

## How It Works

### 1. EID Classification

EIDs are classified using the `EIDParser.extractRADIdentifier()` method which:
- Parses the EID structure: `namespace.radset.radId.subaction.action`
- Groups Venture Feed RADs (`pandc.vnext.recommendations.feed.feed*`) under a single "venture-feed" identifier
- Uses `namespace.radset.radId` as the identifier for other RADs

Example classifications:
- `pandc.vnext.recommendations.feed.feed_compliance_privacy.impression` → `venture-feed`
- `pandc.vnext.recommendations.cart.upsell.impression` → `pandc.vnext.recommendations`
- `pandc.vnext.metricsevolved.dashboard.view` → `pandc.vnext.metricsevolved`

### 2. RAD Filter Component

The `RADFilter` component (`assets/js/components/rad-filter.js`) provides:
- Dynamic filter chips based on events in the current dataset
- Event counts for each RAD
- Multi-select capability
- Clear filters option

### 3. Integration Points

#### Frontend (TypeScript/Vite)
1. **Store Integration** (`src/store/index.ts`):
   - Added `radFilters: string[]` to `FilterState`
   - Added `setRADFilters()` action
   - Updated `filterEvents()` to handle RAD filtering

2. **FilterBar Component** (`src/components/FilterBar.ts`):
   - Added RAD filter container
   - Initializes RADFilter component
   - Updates filter when events change

3. **Global Availability** (`src/main.ts`):
   - Imports and exposes `EIDParser` globally
   - Imports RAD filter component

#### Backend Integration
- **ui-updater.js**: Adds `data-rad-identifier` attribute to table rows for easy filtering

## Usage

### For Developers

1. **Access RAD identifier for any EID**:
```javascript
const radIdentifier = EIDParser.extractRADIdentifier(eid);
// Returns: 'venture-feed', 'pandc.vnext.cart', etc.
```

2. **Get human-readable RAD name**:
```javascript
const displayName = EIDParser.getRADDisplayName(radIdentifier);
// Returns: 'Venture Feed', 'Cart Recommendations', etc.
```

3. **Filter events programmatically**:
```javascript
const radFilter = new RADFilter(containerElement);
radFilter.init(events);
radFilter.onFilterChange = (activeFilters) => {
    const filtered = radFilter.filterEvents(events);
    // Update UI with filtered events
};
```

### For End Users

1. The RAD filter appears in the Event Details section
2. Click on RAD chips to filter events
3. Multiple RADs can be selected simultaneously
4. Click "Clear" to remove all filters
5. Event counts update dynamically

## Adding New RAD Types

To add support for new RAD types:

1. Update `EIDParser.extractRADIdentifier()` in `assets/js/emil/utils/eid-parser.ts`:
```typescript
// Add special handling for new patterns
if (parsed.namespace === 'new' && parsed.radset === 'pattern') {
    return 'new-rad-type';
}
```

2. Add display name mapping in `EIDParser.getRADDisplayName()`:
```typescript
const radNames: Record<string, string> = {
    'new-rad-type': 'New RAD Type Display Name',
    // ... existing mappings
};
```

3. Rebuild the EMIL module:
```bash
cd assets/js/emil
npm run build
```

## Testing

A test page is available at `test-rad-filter.html` which demonstrates:
- RAD classification for various EID patterns
- Filter functionality with sample data
- Visual representation of RAD identifiers

To test:
1. Open `test-rad-filter.html` in a browser
2. Click on different RAD filter chips
3. Observe how the events table updates
4. Check console for debug information

## Future Enhancements

1. **Persistent Filters**: Save selected RAD filters to localStorage
2. **RAD Grouping**: Group related RADs (e.g., all recommendation types)
3. **Search Integration**: Combine RAD filter with text search
4. **Performance Optimization**: Use indexed lookups for large datasets
5. **Analytics**: Track which RADs are most frequently filtered

## Troubleshooting

### Filter not appearing
- Ensure `window.RADFilter` is available
- Check that `window.EIDParser` is loaded
- Verify events have valid `event_id` field

### Events not filtering correctly
- Check EID format matches expected pattern
- Verify `extractRADIdentifier()` handles the pattern
- Use browser console to debug RAD classification

### TypeScript compilation errors
- Run `npm install` in both root and `assets/js/emil`
- Check for type definition conflicts
- Ensure global declarations are properly set
