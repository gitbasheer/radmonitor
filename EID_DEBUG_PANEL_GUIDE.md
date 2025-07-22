# EID Registry Debug Panel Guide

## Overview

The EID Registry Debug Panel provides comprehensive visibility into how Event IDs (EIDs) are processed and mapped to RAD types in the RAD Traffic Monitor. It helps you:

- See all EID-to-RAD mappings in real-time
- Identify unmapped EIDs that need attention
- Monitor the performance of pattern matching vs registry lookups
- Debug issues with EID processing
- Export diagnostic data for analysis

## Features

### 1. **Overview Stats**
- Total Events: Number of events currently loaded
- Registry Mappings: Number of EID patterns in the registry
- Registry Matches: Events matched using the registry
- Pattern Matches: Events matched using pattern detection

### 2. **EID Processing Analysis**
Real-time table showing:
- EID: The event identifier
- Detected RAD: The RAD type assigned
- Source: How the RAD type was determined (registry/pattern/unknown)
- Confidence: Confidence score (0-100%)
- Status: Visual indicator (✅ registry, 🔄 pattern, ❓ unknown)

### 3. **Current Registry Mappings**
Visual display of all EID-to-RAD mappings with:
- EID pattern
- Mapped RAD type
- Optional description
- Visual flow indicator

### 4. **Server Diagnostics**
Fetch real-time diagnostics from the server showing:
- Server-side processing statistics
- Cache analysis
- Unknown EIDs list

### 5. **Activity Log**
Real-time logging of:
- Mapping operations
- API calls
- Errors
- Filter changes

## How to Use

### Accessing the Debug Panel

#### Option 1: Standalone Page
Open `eid-debug-panel.html` in your browser:
```
http://localhost:8000/eid-debug-panel.html
```

#### Option 2: Add to Existing Page
Add this script to any page:
```html
<script src="/assets/js/init-debug-panel.js"></script>
```

#### Option 3: Manual Integration
```javascript
// Load the debug panel
const script = document.createElement('script');
script.src = '/assets/js/components/debug-panel.js';
document.body.appendChild(script);

// After loading, create instance
const debugPanel = new DebugPanel();
document.body.appendChild(debugPanel.render());
```

### Using the Debug Panel

1. **Open the Panel**: Click the 🐛 Debug button

2. **Test Mappings**: Click "Test All Mappings" to verify each mapping has matching events

3. **Fetch Diagnostics**: Click "Fetch Server Diagnostics" to get server-side analysis

4. **Export Data**: Click "Export Debug Data" to download a JSON file with:
   - All events
   - All mappings
   - Processing results
   - Activity logs

5. **Auto-refresh**: Enable to update the display every 2 seconds

## Understanding the Data

### Confidence Scores
- **100%**: Perfect match from registry
- **50-99%**: Pattern match with varying confidence
- **0%**: No match found

### Source Types
- **registry**: EID matched a registry mapping (best)
- **pattern**: EID matched a pattern rule (fallback)
- **unknown**: No match found (needs mapping)

### Color Coding
- 🟢 Green: Registry match
- 🔵 Blue: Pattern match
- 🔴 Red: Unknown/unmapped

## Adding New Mappings

1. Open the EID Registry (📋 button in control panel)
2. Enter the EID pattern (e.g., "USER_LOGIN_EVENT")
3. Select the RAD type
4. Add optional description
5. Click "Add Mapping"

## Troubleshooting

### Common Issues

1. **No events showing**: 
   - Check if data is loaded
   - Verify authentication
   - Refresh the page

2. **Mappings not working**:
   - Check EID pattern spelling
   - Verify pattern is uppercase
   - Test with "Test All Mappings"

3. **Server diagnostics failing**:
   - Check server is running
   - Verify authentication
   - Check browser console for errors

### Debug Tips

1. Watch the Activity Log for real-time feedback
2. Use Export Debug Data to analyze offline
3. Check browser console for additional errors
4. Use pattern confidence scores to improve mappings

## API Endpoints

The debug panel uses these endpoints:

- `GET /api/v1/diagnostics/eid-processing` - EID processing analysis
- `GET /api/v1/diagnostics/cache-analysis` - Cache statistics
- `GET /api/v1/eid-registry` - Get all mappings
- `POST /api/v1/eid-registry` - Add new mapping
- `DELETE /api/v1/eid-registry/{eid}` - Remove mapping

## Best Practices

1. **Map common patterns first**: Start with the most frequent unmapped EIDs
2. **Use descriptive patterns**: Make EID patterns specific but not too narrow
3. **Document mappings**: Add descriptions to explain the purpose
4. **Regular cleanup**: Remove obsolete mappings
5. **Export before major changes**: Keep backups of your mappings

## Advanced Usage

### Custom Integration
```javascript
// Listen for debug events
window.addEventListener('debug:log', (event) => {
    console.log('Debug event:', event.detail);
});

// Programmatically add mappings
const mapping = {
    eid: 'CUSTOM_EVENT',
    rad_type: 'custom',
    description: 'Custom event type'
};
await fetch('/api/v1/eid-registry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mapping)
});
```

### Bulk Import
```javascript
// Import multiple mappings
const mappings = [
    { eid: 'EVENT1', rad_type: 'login' },
    { eid: 'EVENT2', rad_type: 'api_call' }
];
await fetch('/api/v1/eid-registry/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mappings)
});
```

## Support

For issues or questions:
1. Check the Activity Log for errors
2. Export debug data for analysis
3. Check server logs for backend issues
4. Review browser console for frontend errors