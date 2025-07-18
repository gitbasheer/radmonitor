/**
 * WAM General ET Integration Refactoring Guide
 * 
 * This document outlines critical refactoring requirements to achieve
 * architectural coherence with the existing radmonitor ecosystem.
 */

// ========================================================================
// ISSUE 1: Global Namespace Pollution
// ========================================================================

// CURRENT ANTI-PATTERN:
window.setWamPreset = function(type, preset) { /* ... */ }
window.runWamGeneralHealthCheck = async function() { /* ... */ }

// ARCHITECTURAL RATIONALE:
// The existing codebase follows a namespace pattern where all dashboard
// functions are encapsulated within the Dashboard object (e.g., Dashboard.refresh()).
// Global pollution violates the Principle of Least Privilege and creates
// potential naming conflicts in production environments.

// RECOMMENDED REFACTORING:
// Extend the existing Dashboard object with WAM-specific methods
Dashboard.WAM = {
    // Encapsulate all WAM-related functionality
    setPreset: function(type, preset) {
        // Implementation maintains existing pattern
    },
    
    runHealthCheck: async function() {
        // Leverage existing Dashboard.showLoading() and Dashboard.hideLoading()
        Dashboard.showLoading('Running WAM General ET analysis...');
        
        try {
            const result = await apiClient.compareWindowsWamGeneral(/* ... */);
            this.displayResults(result);
        } catch (error) {
            // Use existing error display pattern
            Dashboard.showError('WAM Analysis Failed', error.message);
        } finally {
            Dashboard.hideLoading();
        }
    },
    
    displayResults: function(result) {
        // Reuse existing UIUpdater patterns for consistency
        UIUpdater.renderWamResults('#wamGeneralResults', result);
    }
};

// ========================================================================
// ISSUE 2: Hard-Coded Precision Threshold
// ========================================================================

// CURRENT LIMITATION:
precision_threshold: 40000  // Static value limits adaptability

// ARCHITECTURAL RATIONALE:
// HyperLogLog++ precision directly impacts memory usage and accuracy.
// Research by Heule et al. (2013) demonstrates that optimal precision
// varies based on cardinality distribution. Static thresholds create
// suboptimal memory/accuracy tradeoffs at scale.

// RECOMMENDED IMPLEMENTATION:
class AdaptivePrecisionCalculator {
    constructor(settings) {
        // Leverage existing settings.json infrastructure
        this.baseThreshold = settings.monitoring?.precisionThreshold || 10000;
        this.scalingFactor = settings.monitoring?.precisionScaling || 3;
    }
    
    calculate(expectedCardinality, availableMemory) {
        // Flajolet's formula: memory = 2^p * 4 bytes
        // Solve for p given memory constraints
        const maxPrecision = Math.log2(availableMemory / 4);
        
        // Apply scaling based on expected cardinality
        const optimalPrecision = Math.min(
            this.baseThreshold * this.scalingFactor,
            Math.pow(2, maxPrecision)
        );
        
        return Math.floor(optimalPrecision);
    }
}

// Integration with existing config service:
const precision = new AdaptivePrecisionCalculator(ConfigService.getConfig())
    .calculate(estimatedUniqueUsers, navigator.deviceMemory * 1024 * 1024);

// ========================================================================
// ISSUE 3: Threshold Configuration Divergence
// ========================================================================

// CURRENT INCONSISTENCY:
if (eventDiff < -50 || visitorDiff < -50) {  // Hard-coded thresholds
    status = 'CRITICAL';
}

// EXISTING CONFIGURATION:
settings.processing.critical_threshold = -80
settings.processing.warning_threshold = -50

// ARCHITECTURAL RATIONALE:
// Threshold divergence creates cognitive dissonance for operators.
// The main dashboard uses -80% for critical, but WAM uses -50%.
// This violates the Principle of Least Astonishment.

// RECOMMENDED REFACTORING:
const getStatus = (eventDiff, visitorDiff, settings) => {
    // Reuse existing threshold configuration
    const criticalThreshold = settings.processing.critical_threshold;
    const warningThreshold = settings.processing.warning_threshold;
    
    // Apply consistent business logic
    const minDiff = Math.min(eventDiff, visitorDiff);
    
    if (minDiff <= criticalThreshold) return { status: 'CRITICAL', emoji: '🔴' };
    if (minDiff <= warningThreshold) return { status: 'WARNING', emoji: '🟡' };
    if (minDiff > 20) return { status: 'INCREASED', emoji: '🔵' };
    return { status: 'NORMAL', emoji: '🟢' };
};

// ========================================================================
// ISSUE 4: Event Handler Memory Leaks
// ========================================================================

// CURRENT ANTI-PATTERN:
onmouseover="this.style.transform='translateY(-2px)'"
onmouseout="this.style.transform='translateY(0)'"

// ARCHITECTURAL RATIONALE:
// Inline handlers create closure references preventing garbage collection.
// In long-running monitoring sessions (24+ hours), this accumulates to
// significant memory pressure. WeakMap-based event delegation eliminates
// this architectural weakness.

// RECOMMENDED PATTERN (matching existing filter button implementation):
class WamEventDelegator {
    constructor() {
        this.handlers = new WeakMap();
    }
    
    init(containerEl) {
        // Single listener for all EID cards
        containerEl.addEventListener('mouseover', this.handleMouseOver.bind(this));
        containerEl.addEventListener('mouseout', this.handleMouseOut.bind(this));
    }
    
    handleMouseOver(e) {
        const card = e.target.closest('.wam-eid-card');
        if (card) {
            // Use CSS classes instead of inline styles
            card.classList.add('elevated');
        }
    }
    
    handleMouseOut(e) {
        const card = e.target.closest('.wam-eid-card');
        if (card) {
            card.classList.remove('elevated');
        }
    }
}

// CSS (add to dashboard.css):
.wam-eid-card {
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.wam-eid-card.elevated {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

// ========================================================================
// ISSUE 5: Alert() Usage vs Existing Notification System
// ========================================================================

// CURRENT ANTI-PATTERN:
alert('⚠️ Please fill in all date/time fields for WAM General analysis');

// EXISTING PATTERN:
// The codebase has sophisticated error display in the loading indicator div

// RECOMMENDED INTEGRATION:
const showValidationError = (message) => {
    const loadingDiv = document.getElementById('loadingIndicator');
    loadingDiv.innerHTML = `
        <div class="validation-error">
            <span class="error-icon">⚠️</span>
            <span class="error-message">${message}</span>
        </div>
    `;
    loadingDiv.style.display = 'block';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        loadingDiv.style.display = 'none';
    }, 3000);
};

// ========================================================================
// ISSUE 6: Missing Query Cancellation
// ========================================================================

// ARCHITECTURAL REQUIREMENT:
// Long-running Elasticsearch queries must be cancellable to prevent
// resource exhaustion during rapid re-queries (user changing date ranges)

class WamQueryManager {
    constructor() {
        this.activeQuery = null;
    }
    
    async executeHealthCheck(params) {
        // Cancel any in-flight query
        if (this.activeQuery) {
            this.activeQuery.cancel();
        }
        
        // Create cancellable query wrapper
        this.activeQuery = new CancellableQuery(async (signal) => {
            return await apiClient.compareWindowsWamGeneral(
                params.baselineStart,
                params.baselineEnd,
                params.recentStart,
                params.recentEnd,
                params.eidPattern,
                { signal }  // Pass AbortSignal to API client
            );
        });
        
        try {
            const result = await this.activeQuery.execute();
            return result;
        } finally {
            this.activeQuery = null;
        }
    }
}

// ========================================================================
// INTEGRATION EXCELLENCE EXAMPLES
// ========================================================================

// 1. Reusing existing time utilities:
// Instead of duplicate formatDateTimeLocal, use existing TimeRangeUtils
const formattedDate = TimeRangeUtils.formatForInput(date);

// 2. Leveraging existing data processing patterns:
// The DataProcessor class already handles score calculations
const processedResults = DataProcessor.processWamResults(result, settings);

// 3. Utilizing existing theme manager:
// For color consistency with dark mode
const statusColors = ThemeManager.getStatusColors();

// ========================================================================
// PERFORMANCE OPTIMIZATION OPPORTUNITIES
// ========================================================================

// 1. Virtual scrolling for large EID lists (>100 items)
// 2. Web Worker for cardinality calculations
// 3. IndexedDB caching for baseline comparisons
// 4. SharedArrayBuffer for parallel aggregation processing

// ========================================================================
// MONITORING & OBSERVABILITY
// ========================================================================

// Add performance metrics to existing metrics collection:
apiClient.metrics.wam = {
    queries: 0,
    avgCardinality: 0,
    precisionAccuracy: 0,
    queryTime: []
};

// Log cardinality estimation accuracy for continuous improvement:
const logCardinalityAccuracy = (estimated, actual) => {
    const accuracy = 1 - Math.abs(estimated - actual) / actual;
    console.log(`[WAM] Cardinality accuracy: ${(accuracy * 100).toFixed(2)}%`);
    
    // Send to existing metrics endpoint
    apiClient.post('/metrics/wam', {
        type: 'cardinality_accuracy',
        value: accuracy,
        timestamp: Date.now()
    });
};
