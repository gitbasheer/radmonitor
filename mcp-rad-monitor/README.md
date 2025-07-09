# VH RAD Monitor MCP

A Model Context Protocol server for real-time RAD traffic monitoring and alerting. This MCP focuses on continuous monitoring, anomaly detection, and threshold-based alerting for your RAD systems.

## Features

- **Real-time Traffic Monitoring** - Monitor RAD traffic with configurable baselines
- **Anomaly Detection** - Detect unusual patterns with adjustable sensitivity
- **Threshold Alerting** - Check multiple RAD types against custom thresholds
- **System Status** - Get real-time health status of all RAD systems

## Installation

```bash
cd mcp-rad-monitor
npm install
```

## Usage with Cursor

### 1. Add to Cursor Settings

Open Cursor settings and add:

```json
{
  "mcpServers": {
    "vh-rad-monitor": {
      "command": "node",
      "args": ["${workspaceFolder}/mcp-rad-monitor/index.js"]
    }
  }
}
```

### 2. Available Commands

Once configured, you can ask Cursor:

#### Real-time Monitoring
- **"Monitor checkout_flow traffic"**
  - Compares current traffic to baseline
  - Returns: CRITICAL, WARNING, NORMAL, or INCREASED

- **"Check if any RAD traffic has dropped"**
  - Monitors all RAD types simultaneously
  - Provides immediate alerts for issues

#### Anomaly Detection
- **"Detect anomalies in API gateway traffic"**
  - Scans for unusual patterns
  - Adjustable sensitivity levels

- **"Check for traffic anomalies with high sensitivity"**
  - More aggressive anomaly detection
  - Catches subtle issues

#### Threshold Monitoring
- **"Alert me if any RAD drops below threshold"**
  - Checks all configured RAD types
  - Returns actionable alerts

- **"Check specific thresholds for checkout and auth"**
  - Custom threshold checking
  - Prioritized alert list

#### System Status
- **"Get current RAD system status"**
  - Real-time health dashboard
  - Overall system health

- **"Show RAD status with history"**
  - Includes recent incidents
  - Tracks resolution times

## Tool Reference

### `monitorRADTraffic`
Monitor specific RAD type traffic in real-time.

```javascript
{
  radType: "checkout_flow",      // Optional: specific RAD type
  compareWith: "1d",             // Baseline period (1h, 1d, 1w)
  threshold: 0.8                 // Alert if drops below 80%
}
```

**Response includes:**
- Current traffic count
- Baseline comparison
- Drop percentage
- Status (CRITICAL/WARNING/NORMAL/INCREASED)
- Actionable recommendations

### `detectAnomalies`
Scan for anomalies in traffic patterns.

```javascript
{
  radType: "api_gateway",        // RAD type to analyze
  timeWindow: "1h",              // Analysis window
  sensitivity: "medium"          // low, medium, high
}
```

**Response includes:**
- Anomalies detected (true/false)
- List of specific anomalies
- Confidence scores
- Next scan time

### `alertOnThresholds`
Check multiple RAD types against thresholds.

```javascript
{
  radTypes: ["checkout_flow", "user_auth"],  // Empty for all
  customThresholds: {                        // Custom per type
    checkout_flow: 1000,
    user_auth: 500
  },
  includeMetrics: true                       // Show all metrics
}
```

**Response includes:**
- Triggered alerts
- Current values vs thresholds
- Prioritized actions
- Summary status

### `getRealtimeStatus`
Get comprehensive system status.

```javascript
{
  includeHistory: true           // Include recent history
}
```

**Response includes:**
- Overall system health
- Per-RAD type status
- Active alerts count
- Recent incident history

## Examples

### Basic Monitoring

```javascript
// Monitor for drops
const result = await monitorRADTraffic({
  radType: "checkout_flow",
  compareWith: "1d",
  threshold: 0.5  // Alert if 50% drop
});

// Output:
{
  "status": "CRITICAL",
  "monitoring": {
    "current": { "count": 4523 },
    "baseline": { "count": 12450 },
    "comparison": {
      "dropPercentage": "63.67",
      "status": "CRITICAL",
      "alert": true
    }
  },
  "recommendation": "IMMEDIATE ACTION REQUIRED..."
}
```

### Anomaly Detection

```javascript
// High-sensitivity scan
const anomalies = await detectAnomalies({
  radType: "api_gateway",
  timeWindow: "2h",
  sensitivity: "high"
});

// Output:
{
  "anomaliesDetected": true,
  "anomalies": [
    {
      "type": "traffic_spike",
      "severity": "medium",
      "confidence": 0.82,
      "description": "Unusual traffic spike detected"
    }
  ],
  "summary": "2 anomalies detected in the last 2h"
}
```

### Multi-threshold Checking

```javascript
// Check all systems
const alerts = await alertOnThresholds({
  customThresholds: {
    checkout_flow: 5000,
    api_gateway: 10000,
    user_auth: 3000
  }
});

// Output:
{
  "alertsTriggered": 1,
  "alerts": [
    {
      "radType": "user_auth",
      "currentValue": 2450,
      "threshold": 3000,
      "triggered": true,
      "message": "user_auth traffic (2450) below threshold (3000)"
    }
  ],
  "actions": [
    {
      "radType": "user_auth",
      "action": "investigate",
      "priority": "high"
    }
  ]
}
```

## Alert Levels

The MCP uses these default alert levels:

- **CRITICAL**: >50% traffic drop - Immediate action required
- **WARNING**: >20% traffic drop - Close monitoring needed
- **NORMAL**: <10% variation - System operating normally
- **INCREASED**: >10% traffic increase - Capacity check recommended

## Best Practices

1. **Set Appropriate Baselines**
   - Use "1d" for daily patterns
   - Use "1w" for weekly comparisons
   - Consider business cycles

2. **Tune Sensitivity**
   - Start with "medium" sensitivity
   - Increase for critical systems
   - Decrease to reduce false positives

3. **Configure Thresholds**
   - Set realistic thresholds per RAD type
   - Account for expected variations
   - Review and adjust regularly

4. **Monitor Continuously**
   - Set up regular status checks
   - Respond quickly to alerts
   - Track resolution times

## Integration with Other MCPs

Works seamlessly with:

1. **RAD Analytics MCP**
   - Monitor detects issues
   - Analytics provides deep analysis

2. **Query Engine MCP**
   - Monitor triggers alerts
   - Query engine investigates details

Example workflow:
```javascript
// 1. Monitor detects issue
const monitor = await radMonitor.monitorRADTraffic({
  radType: "checkout_flow"
});

// 2. If critical, analyze
if (monitor.status === "CRITICAL") {
  const analysis = await radAnalytics.analyzeTrafficDrop({
    timeWindow: "2h"
  });
}
```

## Troubleshooting

### Too many false alerts
- Adjust sensitivity to "low"
- Increase threshold values
- Check baseline periods

### Missing real issues
- Increase sensitivity to "high"
- Lower threshold values
- Shorten comparison windows

### Inconsistent results
- Check time window settings
- Verify RAD type names
- Review baseline data

## Configuration

Default settings:
```javascript
{
  radEventPattern: 'pandc.vnext.recommendations.feed.feed*',
  defaultThreshold: 0.8,
  defaultTimeWindow: '12h',
  alertLevels: {
    critical: 0.5,
    warning: 0.2,
    normal: 0.1
  }
}
```

## License

Part of the VH RAD Traffic Monitor project.
