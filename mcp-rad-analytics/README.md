# VH RAD Analytics MCP

A Model Context Protocol server for deep RAD traffic analysis and insights generation. This MCP focuses on historical analysis, pattern detection, and actionable insights to help understand and optimize your RAD systems.

## Features

- **Traffic Drop Analysis** - Deep dive into traffic drops with root cause analysis
- **Pattern Detection** - Identify daily, weekly, and seasonal patterns
- **AI-Powered Insights** - Generate actionable insights and recommendations
- **Time Range Comparison** - Compare metrics across different periods

## Installation

```bash
cd mcp-rad-analytics
npm install
```

## Usage with Cursor

### 1. Add to Cursor Settings

Open Cursor settings and add:

```json
{
  "mcpServers": {
    "vh-rad-analytics": {
      "command": "node",
      "args": ["${workspaceFolder}/mcp-rad-analytics/index.js"]
    }
  }
}
```

### 2. Available Commands

Once configured, you can ask Cursor:

#### Traffic Drop Analysis
- **"Analyze the traffic drop from last hour"**
  - Provides timeline of events
  - Identifies possible causes
  - Suggests immediate actions

- **"What caused the checkout_flow drop?"**
  - Root cause analysis
  - Confidence-scored causes
  - Evidence-based recommendations

#### Pattern Analysis
- **"Analyze traffic patterns for the last week"**
  - Detects daily/weekly cycles
  - Identifies anomalies
  - Provides baseline metrics

- **"Find anomalies in API gateway traffic"**
  - Adjustable sensitivity detection
  - Pattern deviation analysis
  - Forecasting capabilities

#### Insights Generation
- **"Generate insights for user_auth performance"**
  - AI-powered analysis
  - Multi-category insights
  - Prioritized recommendations

- **"Give me a 30-day analysis with recommendations"**
  - Comprehensive metrics review
  - Trend analysis
  - Action items with impact

#### Time Comparison
- **"Compare this week's performance to last week"**
  - Side-by-side metrics
  - Change percentages
  - Improvement/degradation analysis

- **"Show me month-over-month trends"**
  - Long-term pattern analysis
  - Seasonal adjustments
  - Growth tracking

## Tool Reference

### `analyzeTrafficDrop`
Perform root cause analysis on traffic drops.

```javascript
{
  radType: "checkout_flow",      // RAD type to analyze
  timeWindow: "2h",              // Analysis window
  granularity: "10m"             // Time bucket size
}
```

**Response includes:**
- Drop timeline with events
- Severity and pattern classification
- Possible causes with confidence scores
- Evidence for each cause
- Immediate action recommendations

### `analyzeTrafficPattern`
Detect patterns and anomalies in traffic.

```javascript
{
  radType: "api_gateway",
  timeWindow: "7d",              // Pattern analysis period
  sensitivity: "medium",         // Detection sensitivity
  compareWith: "baseline"        // Comparison method
}
```

**Response includes:**
- Detected patterns (daily, weekly, etc.)
- Pattern confidence scores
- Baseline statistics
- Anomaly detection
- Traffic forecast

### `generateInsights`
Generate AI-powered insights and recommendations.

```javascript
{
  radType: "user_auth",
  period: "30d",                 // Analysis period
  includeRecommendations: true   // Include action items
}
```

**Response includes:**
- Multi-category insights
- Performance metrics
- Health score
- Prioritized recommendations
- Expected impact of actions

### `compareTimeRanges`
Compare metrics between time periods.

```javascript
{
  radType: "checkout_flow",
  range1: { from: "now-7d", to: "now" },
  range2: { from: "now-14d", to: "now-7d" },
  metrics: ["traffic", "errors", "latency"]
}
```

**Response includes:**
- Metric comparisons
- Change percentages
- Trend analysis
- Improved/degraded metrics
- Visualization recommendations

## Examples

### Root Cause Analysis

```javascript
// Analyze recent drop
const analysis = await analyzeTrafficDrop({
  radType: "checkout_flow",
  timeWindow: "3h",
  granularity: "15m"
});

// Output:
{
  "dropDetected": true,
  "dropDetails": {
    "startTime": "2025-01-13T10:30:00Z",
    "severity": "HIGH",
    "pattern": "sudden_drop"
  },
  "possibleCauses": [
    {
      "cause": "Upstream service degradation",
      "confidence": 0.85,
      "evidence": [
        "Sudden drop pattern",
        "High error rate correlation"
      ],
      "suggestedAction": "Check upstream service health"
    }
  ]
}
```

### Pattern Detection

```javascript
// Weekly pattern analysis
const patterns = await analyzeTrafficPattern({
  radType: "api_gateway",
  timeWindow: "14d",
  sensitivity: "high"
});

// Output:
{
  "patterns": [
    {
      "type": "daily_cycle",
      "confidence": 0.92,
      "details": {
        "peakHours": ["10:00", "14:00", "20:00"],
        "lowHours": ["02:00", "03:00", "04:00"]
      }
    },
    {
      "type": "weekly_trend",
      "confidence": 0.78,
      "details": {
        "highDays": ["Monday", "Friday"],
        "weekendDrop": "35%"
      }
    }
  ],
  "forecast": {
    "next24h": "Normal traffic expected",
    "confidence": 0.88
  }
}
```

### Insights Generation

```javascript
// Monthly insights
const insights = await generateInsights({
  radType: "user_auth",
  period: "30d",
  includeRecommendations: true
});

// Output:
{
  "insights": [
    {
      "category": "performance",
      "insight": "user_auth showing positive growth trend",
      "confidence": 0.89,
      "impact": "medium"
    }
  ],
  "recommendations": [
    {
      "priority": "high",
      "action": "Optimize peak hour performance",
      "expectedImpact": "+15% throughput"
    }
  ],
  "summary": {
    "overallHealth": "good",
    "keyTakeaway": "System performing well with 87% user satisfaction"
  }
}
```

## Analysis Capabilities

### 1. Drop Detection
- **Sudden drops**: Immediate detection
- **Gradual degradation**: Trend analysis
- **Recovery tracking**: Monitor improvements
- **Impact assessment**: User and revenue impact

### 2. Pattern Recognition
- **Daily patterns**: Peak/off-peak identification
- **Weekly cycles**: Business day variations
- **Seasonal trends**: Long-term patterns
- **Anomaly detection**: Unusual events

### 3. Predictive Analysis
- **Traffic forecasting**: Next 24h predictions
- **Capacity planning**: Growth projections
- **Risk assessment**: Potential issue detection
- **Trend extrapolation**: Future state modeling

## Best Practices

1. **Regular Analysis**
   - Run weekly pattern analysis
   - Daily insight generation
   - Monthly trend reviews

2. **Combine with Monitoring**
   - Use Monitor MCP for alerts
   - Use Analytics for investigation
   - Create feedback loops

3. **Action on Insights**
   - Prioritize high-impact recommendations
   - Track improvement metrics
   - Adjust based on results

4. **Historical Context**
   - Compare similar time periods
   - Account for known events
   - Build baseline profiles

## Integration with Other MCPs

### Workflow Example

```javascript
// 1. Monitor detects issue
const alert = await radMonitor.monitorRADTraffic({
  radType: "checkout_flow"
});

// 2. Analyze the drop
if (alert.status === "CRITICAL") {
  const analysis = await radAnalytics.analyzeTrafficDrop({
    radType: "checkout_flow",
    timeWindow: "3h"
  });

  // 3. Generate insights
  const insights = await radAnalytics.generateInsights({
    radType: "checkout_flow",
    period: "7d"
  });

  // 4. Query for details
  const details = await queryEngine.searchRADEvents({
    eventPattern: "*checkout*",
    timeRange: { from: "now-3h", to: "now" }
  });
}
```

## Configuration

Default analysis settings:
```javascript
{
  defaultTimeWindow: '24h',
  defaultGranularity: '5m',
  patternSensitivity: 'medium',
  insightsPeriod: '7d',
  comparisonBaseline: 'previous_period'
}
```

## Troubleshooting

### Incomplete analysis
- Extend time window
- Reduce granularity for longer periods
- Check data availability

### No patterns detected
- Increase analysis period
- Lower sensitivity
- Check for data gaps

### Inaccurate insights
- Verify RAD type selection
- Review time period
- Check for external factors

## License

Part of the VH RAD Traffic Monitor project.
