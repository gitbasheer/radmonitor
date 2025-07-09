# RAD Monitoring and EID Guide

## Overview
This guide provides comprehensive information about RADset monitoring, Event IDs (EIDs), impression tracking, and click tracking for GoDaddy's RAD (Rapid API Development) system.

## Event ID (EID) Structure

### Naming Convention
EIDs follow a hierarchical structure:
```
{namespace}.{product}.{component}.{radset}.{action}.{event_type}
```

### Common Namespaces
- `pandc.vnext` - Platform and Commerce, vNext
- `ai.assistant` - AI/Airo assistant events
- `venture.home` - Venture Home specific events
- `gce.cart` - Cart events
- `ind.marketing` - Marketing events

## RADset-Specific Tracking

### 1. Venture Feed RADset
Primary RADset for dashboard recommendations.

**Standard EIDs:**
```javascript
// Impression when RAD card appears
"pandc.vnext.recommendations.feed.{radId}.impression"

// Primary CTA click
"pandc.vnext.recommendations.feed.{radId}.click"

// Secondary actions
"pandc.vnext.recommendations.feed.{radId}.expand_click"
"pandc.vnext.recommendations.feed.{radId}.dismiss_click"
```

**Example Implementation:**
```javascript
// Feed-DomainProtection RAD
{
  radId: "Feed-DomainProtection-K18FmXDmk",
  impression: "pandc.vnext.recommendations.feed.feed_compliance_privacy.impression",
  click: "pandc.vnext.recommendations.feed.feed_compliance_privacy.click"
}
```

### 2. Venture Metrics RADset
Handles all metric tiles on the dashboard.

**Zero State vs Populated State:**
```javascript
// Different EIDs for different states
const metricsEIDs = {
  // When metric has no data
  zeroState: {
    impression: "pandc.vnext.recommendations.metricsevolved.{metric}_zerostate.impression",
    recommendation: "pandc.vnext.recommendations.metricsevolved.{metric}_zerostate/recommendation.impression"
  },

  // When metric has data
  populated: {
    impression: "pandc.vnext.recommendations.metricsevolved.{metric}.impression",
    graph: "pandc.vnext.recommendations.metricsevolved.graph.impression",
    manage: "pandc.vnext.recommendations.metricsevolved.{metric}_manage.click"
  }
};
```

**Supported Metrics:**
- `visitors`
- `sales`
- `conversations`
- `social_views`
- `orders`
- `bookings`
- `performance_score`

### 3. Venture Setup RADset
Onboarding and setup guidance.

```javascript
// Setup checklist tracking
"pandc.vnext.recommendations.setup.{taskId}.impression"
"pandc.vnext.recommendations.setup.{taskId}.start_click"
"pandc.vnext.recommendations.setup.{taskId}.complete"
```

### 4. Discover RADset
Product discovery and recommendations.

```javascript
// Domain tile flip experiment
"pandc.vnext.recommendations.discover.cta.click" // Front side click
"pandc.vnext.recommendations.discover.back_cta.click" // Back side click
```

## Impression Tracking Best Practices

### 1. Avoid Bulk Impressions
**Critical Learning from August 2024 Incident:**

```javascript
// ❌ WRONG - Can cause severe performance issues
_signalsDataLayer.push({
  impressions: [imp1, imp2, imp3, imp4, imp5]
});

// ✅ CORRECT - Push one at a time
impressions.forEach(impression => {
  _signalsDataLayer.push(impression);
});
```

### 2. Always Validate EIDs
```javascript
function sendImpression(eid, customProps = {}) {
  // Critical: Never send empty EIDs
  if (!eid || eid.trim() === '') {
    console.error('Attempted to send empty EID:', eid);
    return false;
  }

  // Validate EID format
  const eidPattern = /^[a-z]+(\.[a-z0-9_]+)+$/;
  if (!eidPattern.test(eid)) {
    console.error('Invalid EID format:', eid);
    return false;
  }

  // Safe to send
  window._signalsDataLayer = window._signalsDataLayer || [];
  window._signalsDataLayer.push({
    eid: eid,
    customProperties: customProps
  });

  return true;
}
```

### 3. Include Context in Custom Properties
```javascript
const impressionData = {
  eid: "pandc.vnext.recommendations.feed.example.impression",
  customProperties: {
    // Required context
    radId: "Feed-Example-123",
    radset: "venture-feed",
    timestamp: Date.now(),

    // User context
    source: "vh_rad_feed",      // Where shown
    placement: "above_fold",    // Position
    userSegment: "new_user",    // User type

    // Performance metrics
    renderTime: 245,            // ms to render
    apiResponseTime: 89,        // ms API call
    position: 3,                // Position in feed

    // Experiment tracking
    experimentId: "genai_ranking",
    cohort: "treatment"
  }
};
```

## Click Tracking Patterns

### 1. Primary vs Secondary CTAs
```javascript
// Primary CTA (main action)
"pandc.vnext.recommendations.{radset}.{radId}.click"
"pandc.vnext.recommendations.{radset}.{radId}.cta_primary_click"

// Secondary CTAs
"pandc.vnext.recommendations.{radset}.{radId}.cta_secondary_click"
"pandc.vnext.recommendations.{radset}.{radId}.learn_more_click"
"pandc.vnext.recommendations.{radset}.{radId}.dismiss_click"
```

### 2. Multi-step Tracking
```javascript
// Track user flow through multi-step processes
const multiStepEIDs = {
  start: "pandc.vnext.recommendations.setup.airo_wizard.start",
  step1: "pandc.vnext.recommendations.setup.airo_wizard.step1_complete",
  step2: "pandc.vnext.recommendations.setup.airo_wizard.step2_complete",
  complete: "pandc.vnext.recommendations.setup.airo_wizard.complete",
  abandon: "pandc.vnext.recommendations.setup.airo_wizard.abandon"
};
```

## Monitoring Infrastructure

### 1. Kibana Dashboards
Primary tool for real-time EID monitoring.

**Key Dashboards:**
- Event Horizon: `https://usieventho-prod-usw2.kb.us-west-2.aws.found.io`
- RAD Performance: Custom dashboards per RADset

**Example Kibana Query:**
```
eid: "pandc.vnext.recommendations.*"
AND @timestamp: [now-24h TO now]
AND customProperties.radset: "venture-feed"
```

### 2. FullStory Integration
Session replay and funnel analysis.

**Key Metrics:**
- RAD impression to click funnel
- Time to interaction
- Scroll depth before interaction
- Session length after RAD click

### 3. Performance Monitoring

**Critical Metrics:**
```javascript
const performanceMetrics = {
  // API Performance
  apiLatency: {
    p50: 100,  // 50th percentile < 100ms
    p95: 500,  // 95th percentile < 500ms
    p99: 1000  // 99th percentile < 1s
  },

  // Impression Performance
  impressionRate: {
    baseline: 18500,     // Daily impressions
    alertThreshold: 0.5  // Alert if < 50%
  },

  // Engagement
  clickThroughRate: {
    minimum: 0.02,  // 2% CTR minimum
    target: 0.05    // 5% CTR target
  }
};
```

## Alert Configuration

### 1. Impression Drop Alerts
```javascript
{
  name: "RAD Impression Drop",
  condition: "impressions < baseline * 0.5",
  window: "1h",
  severity: "P1",
  notify: ["#quokka-alerts", "#im-ops"],
  runbook: "https://wiki/rad-impression-drop"
}
```

### 2. Error Rate Alerts
```javascript
{
  name: "RAD Error Rate High",
  condition: "error_rate > 0.05", // 5%
  window: "15m",
  severity: "P2",
  notify: ["#quokka-alerts"],
  runbook: "https://wiki/rad-error-rate"
}
```

### 3. Empty EID Detection
```javascript
{
  name: "Empty EID Detected",
  condition: "eid = '' OR eid = null",
  window: "5m",
  severity: "P3",
  notify: ["#platform-monitoring"],
  action: "Investigate source immediately"
}
```

## Common Issues and Solutions

### 1. Signal Capture Client (SCC) Slowdown
**Symptoms:**
- Page becomes unresponsive
- DOM doesn't reach ready state
- Exponential performance degradation

**Root Cause:**
- Multiple empty EIDs pushed to SCC
- Bulk impression arrays
- Invalid event format

**Solution:**
- Validate all EIDs before sending
- Push events one at a time
- Monitor SCC performance metrics

### 2. Missing Impressions
**Symptoms:**
- Impression count drops suddenly
- CTR appears artificially high
- Incomplete funnel data

**Common Causes:**
- Entity migration issues (missing fields)
- Synthesizer logic errors
- Client-side rendering failures

**Debugging Steps:**
1. Check entity field availability
2. Validate synthesizer output
3. Monitor browser console errors
4. Review recent deployments

### 3. Tracking Discrepancies
**Symptoms:**
- Kibana and FullStory numbers don't match
- Missing events in certain browsers
- Duplicate events

**Solutions:**
- Implement deduplication logic
- Add browser compatibility checks
- Use consistent timestamp formats
- Validate tracking implementation

## Implementation Checklist

- [ ] Define all EIDs following naming convention
- [ ] Implement impression tracking with validation
- [ ] Add click tracking for all CTAs
- [ ] Include required custom properties
- [ ] Set up Kibana dashboards
- [ ] Configure alerts and thresholds
- [ ] Test bulk impression handling
- [ ] Validate empty EID prevention
- [ ] Document radset-specific patterns
- [ ] Create runbooks for common issues
- [ ] Set up performance monitoring
- [ ] Implement error tracking

## References

- [RAD Documentation](https://cto-docs.int.gdcorp.tools/docs/products/product-experience/rad/)
- [Event Tracking Guidelines](https://wiki/event-tracking-guidelines)
- [Kibana Dashboard Creation](https://wiki/kibana-dashboards)
- [SCC Integration Guide](https://wiki/signal-capture-client)
