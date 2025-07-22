/**
 * Formula Event Tracker - RAD-style Event Tracking
 * Implements EID tracking patterns from GoDaddy's RAD system
 * Prevents silent failures and tracks all formula interactions
 */

/**
 * Formula Event Tracker following RAD EID patterns
 */
export class FormulaEventTracker {
  constructor(config = {}) {
    this.config = {
      namespace: 'pandc.vnext.formula_builder',
      radset: config.radset || 'formula-builder',
      radId: config.radId,
      enableBatching: false, // Lesson from RAD: don't batch impressions
      validateEIDs: true,
      ...config
    };

    // Initialize tracking layer
    this.initializeDataLayer();

    // Track metrics locally
    this.metrics = {
      impressions: 0,
      clicks: 0,
      applications: 0,
      errors: 0,
      validations: 0
    };
  }

  /**
   * Initialize signals data layer
   */
  initializeDataLayer() {
    if (typeof window !== 'undefined') {
      window._signalsDataLayer = window._signalsDataLayer || [];
    }
  }

  /**
   * Build EID following RAD naming convention
   */
  buildEID(action, subaction = null) {
    const parts = [
      this.config.namespace,
      this.config.radset
    ];

    if (this.config.radId) {
      parts.push(this.config.radId);
    }

    if (subaction) {
      parts.push(subaction);
    }

    parts.push(action);

    return parts.join('.');
  }

  /**
   * Validate EID to prevent empty tracking (critical lesson from RAD)
   */
  validateEID(eid) {
    if (!eid || typeof eid !== 'string' || eid.trim() === '') {
      console.error('Invalid EID detected:', eid);
      return false;
    }
    return true;
  }

  /**
   * Push event to tracking layer
   */
  pushEvent(eid, customProperties = {}) {
    // Never send empty EIDs
    if (this.config.validateEIDs && !this.validateEID(eid)) {
      this.metrics.errors++;
      return false;
    }

    const event = {
      eid,
      customProperties: {
        timestamp: Date.now(),
        sessionId: this.getSessionId(),
        ...customProperties
      }
    };

    // Log for debugging
    if (this.config.debug) {
      console.log('Formula Event:', event);
    }

    // Push to data layer
    if (typeof window !== 'undefined' && window._signalsDataLayer) {
      window._signalsDataLayer.push(event);
    }

    return true;
  }

  /**
   * Track RAD card impression
   */
  trackImpression(index = null, customData = {}) {
    const eid = this.buildEID('impression');
    const properties = {
      ...customData
    };

    // Include index for position tracking (important for experiments)
    if (index !== null) {
      properties.index = index;
      properties.position = `index_${index}`;
    }

    this.metrics.impressions++;
    return this.pushEvent(eid, properties);
  }

  /**
   * Track click events
   */
  trackClick(ctaType = 'primary', customData = {}) {
    const eid = this.buildEID('click', ctaType);
    const properties = {
      ctaType,
      ...customData
    };

    this.metrics.clicks++;
    return this.pushEvent(eid, properties);
  }

  /**
   * Track formula application
   */
  trackFormulaApplication(formulaType, success, customData = {}) {
    const action = success ? 'applied' : 'failed';
    const eid = this.buildEID(action, formulaType);

    const properties = {
      formulaType,
      success,
      ...customData
    };

    if (success) {
      this.metrics.applications++;
    } else {
      this.metrics.errors++;
    }

    return this.pushEvent(eid, properties);
  }

  /**
   * Track formula validation
   */
  trackValidation(formulaType, valid, errorType = null, customData = {}) {
    const eid = this.buildEID('validation', valid ? 'success' : 'error');

    const properties = {
      formulaType,
      valid,
      ...customData
    };

    if (errorType) {
      properties.errorType = errorType;
    }

    this.metrics.validations++;
    if (!valid) {
      this.metrics.errors++;
    }

    return this.pushEvent(eid, properties);
  }

  /**
   * Track AI assistance events
   */
  trackAIAssistance(action, accepted = null, customData = {}) {
    const subaction = accepted === true ? 'accepted' :
                     accepted === false ? 'rejected' : null;
    const eid = this.buildEID(action, subaction ? `ai_${subaction}` : 'ai');

    const properties = {
      aiAction: action,
      accepted,
      ...customData
    };

    return this.pushEvent(eid, properties);
  }

  /**
   * Track performance issues
   */
  trackPerformance(operation, duration, threshold, customData = {}) {
    if (duration <= threshold) {
      return; // Only track slow operations
    }

    const eid = this.buildEID('performance', 'slow');

    const properties = {
      operation,
      duration,
      threshold,
      exceedance: duration - threshold,
      ...customData
    };

    return this.pushEvent(eid, properties);
  }

  /**
   * Track generic events
   */
  trackEvent(eventName, customData = {}) {
    const eid = this.buildEID(eventName);
    return this.pushEvent(eid, customData);
  }

  /**
   * Track error events (never fail silently)
   */
  trackError(errorType, errorMessage, context = {}) {
    const eid = this.buildEID('error', errorType);

    const properties = {
      errorType,
      errorMessage,
      context,
      stack: new Error().stack
    };

    this.metrics.errors++;

    // Always log errors
    console.error('Formula Builder Error:', {
      errorType,
      errorMessage,
      context
    });

    return this.pushEvent(eid, properties);
  }

  /**
   * Get or create session ID
   */
  getSessionId() {
    if (!this.sessionId) {
      this.sessionId = `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    return this.sessionId;
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      impressions: 0,
      clicks: 0,
      applications: 0,
      errors: 0,
      validations: 0
    };
  }
}

/**
 * Formula Event Monitor - Health checks and alerts
 */
export class FormulaEventMonitor {
  constructor(tracker, config = {}) {
    this.tracker = tracker;
    this.config = {
      impressionThreshold: 0.01, // 1% CTR minimum
      errorThreshold: 0.1, // 10% error rate maximum
      checkInterval: 60000, // Check every minute
      ...config
    };

    this.lastCheck = Date.now();
    this.alerts = [];

    // Start monitoring if enabled
    if (this.config.autoStart) {
      this.startMonitoring();
    }
  }

  /**
   * Start health monitoring
   */
  startMonitoring() {
    this.intervalId = setInterval(() => {
      this.performHealthCheck();
    }, this.config.checkInterval);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Perform health check
   */
  performHealthCheck() {
    const metrics = this.tracker.getMetrics();
    const alerts = [];

    // Check CTR
    if (metrics.impressions > 0) {
      const ctr = metrics.clicks / metrics.impressions;
      if (ctr < this.config.impressionThreshold) {
        alerts.push({
          type: 'low_ctr',
          message: `Formula builder CTR below threshold: ${(ctr * 100).toFixed(2)}%`,
          severity: 'warning',
          metrics: { ctr, threshold: this.config.impressionThreshold }
        });
      }
    }

    // Check error rate
    const totalOperations = metrics.applications + metrics.validations;
    if (totalOperations > 0) {
      const errorRate = metrics.errors / totalOperations;
      if (errorRate > this.config.errorThreshold) {
        alerts.push({
          type: 'high_error_rate',
          message: `Formula error rate above threshold: ${(errorRate * 100).toFixed(2)}%`,
          severity: 'critical',
          metrics: { errorRate, threshold: this.config.errorThreshold }
        });
      }
    }

    // Check for no impressions (potential silent failure)
    const timeSinceLastCheck = Date.now() - this.lastCheck;
    if (metrics.impressions === 0 && timeSinceLastCheck > this.config.checkInterval * 2) {
      alerts.push({
        type: 'no_impressions',
        message: 'No formula impressions detected - potential silent failure',
        severity: 'critical',
        metrics: { timeSinceLastCheck }
      });
    }

    // Process alerts
    if (alerts.length > 0) {
      this.handleAlerts(alerts);
    }

    this.lastCheck = Date.now();
    this.alerts = alerts;
  }

  /**
   * Handle alerts
   */
  handleAlerts(alerts) {
    for (const alert of alerts) {
      // Log to console
      const logMethod = alert.severity === 'critical' ? 'error' : 'warn';
      console[logMethod](`Formula Monitor Alert: ${alert.message}`, alert);

      // Track alert event
      this.tracker.trackEvent('monitor_alert', {
        alertType: alert.type,
        severity: alert.severity,
        metrics: alert.metrics
      });
    }
  }

  /**
   * Get current alerts
   */
  getAlerts() {
    return [...this.alerts];
  }
}

// Export singleton instances
export const formulaEventTracker = new FormulaEventTracker();
export const formulaEventMonitor = new FormulaEventMonitor(formulaEventTracker, {
  autoStart: true
});

export default {
  tracker: formulaEventTracker,
  monitor: formulaEventMonitor
};
