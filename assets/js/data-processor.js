/**
 * Data Processor for RAD Monitor Dashboard
 * Handles processing of Elasticsearch response data
 */

// Import dependencies
import TimeRangeUtils from './time-range-utils.js';

/**
 * Determine RAD type from event ID
 * @param {string} eventId - The event ID to check
 * @param {Object} radTypes - RAD types configuration from settings
 * @returns {string} The RAD type key or 'unknown'
 */
export function determineRadType(eventId, radTypes) {
    if (!radTypes || typeof radTypes !== 'object') {
        return 'unknown';
    }

    for (const [radKey, radConfig] of Object.entries(radTypes)) {
        if (radConfig.enabled && radConfig.pattern) {
            // Convert wildcard pattern to regex
            const regexPattern = '^' + radConfig.pattern
                .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
                .replace(/\*/g, '.*') + '$'; // Replace * with .*
            const regex = new RegExp(regexPattern);

            if (regex.test(eventId)) {
                return radKey;
            }
        }
    }
    return 'unknown';
}

/**
 * Get display name for event based on RAD type
 * @param {string} eventId - The full event ID
 * @param {string} radType - The determined RAD type
 * @param {Object} radTypes - RAD types configuration
 * @returns {string} The display name
 */
export function getDisplayName(eventId, radType, radTypes) {
    if (radType !== 'unknown' && radTypes[radType]?.pattern) {
        // Remove the RAD type prefix based on the pattern
        const pattern = radTypes[radType].pattern;
        const prefix = pattern.substring(0, pattern.indexOf('*'));
        return eventId.replace(prefix, '');
    }
    // Fallback to removing the most common prefix
    return eventId.replace('pandc.vnext.recommendations.feed.', '');
}

/**
 * Process raw Elasticsearch data into structured results
 */
export function processData(buckets, config) {
    const processingStartTime = Date.now();
    const bucketCount = buckets.length;
    const results = [];

    // Log processing start
    if (typeof DataLayer !== 'undefined' && DataLayer.logAction) {
        DataLayer.logAction('DATA_PROCESSING_START', {
            bucketCount,
            timeRange: config.currentTimeRange,
            thresholds: {
                high: config.highVolumeThreshold,
                medium: config.mediumVolumeThreshold
            }
        });
    }

    // Calculate baseline days
    const baselineStart = new Date(config.baselineStart);
    const baselineEnd = new Date(config.baselineEnd);
    const baselineDays = Math.ceil((baselineEnd - baselineStart) / (1000 * 60 * 60 * 24));

    // Parse current time range
    const parsedTimeRange = TimeRangeUtils.parseTimeRange(config.currentTimeRange);
    const currentHours = parsedTimeRange.hours;

    let skippedLowVolume = 0;
    let skippedNoBaseline = 0;

    for (const bucket of buckets) {
        const event_id = bucket.key;
        const baseline_count = bucket.baseline?.doc_count || 0;
        const current_count = bucket.current?.doc_count || 0;

        // Calculate metrics
        const baseline_period = (baseline_count / baselineDays / 24 * currentHours);
        if (baseline_period === 0) {
            skippedNoBaseline++;
            continue;
        }

        const daily_avg = baseline_count / baselineDays;
        if (daily_avg < config.mediumVolumeThreshold) {
            skippedLowVolume++;
            continue;
        }

        // Calculate score
        let score = calculateScore(current_count, baseline_period);

        // Determine status
        let status = determineStatus(score);

        // Determine RAD type
        const radType = determineRadType(event_id, config.rad_types);

        // Get display name
        const displayName = getDisplayName(event_id, radType, config.rad_types);

        results.push({
            event_id,
            displayName,
            current: current_count,
            baseline12h: Math.round(baseline_period),
            baseline_period: Math.round(baseline_period),
            score,
            status,
            dailyAvg: Math.round(daily_avg),
            rad_type: radType
        });
    }

    // Sort by score (worst first)
    results.sort((a, b) => a.score - b.score);

    const processingDuration = Date.now() - processingStartTime;

    // Log processing complete with detailed metrics
    if (typeof DataLayer !== 'undefined' && DataLayer.logAction) {
        const stats = getSummaryStats(results);

        DataLayer.logAction('DATA_PROCESSING_COMPLETE', {
            duration: processingDuration,
            inputBuckets: bucketCount,
            outputResults: results.length,
            skippedLowVolume,
            skippedNoBaseline,
            processingRate: bucketCount > 0 ? Math.round(bucketCount / (processingDuration / 1000)) : 0,
            stats,
            performanceMetrics: {
                avgProcessingTimePerBucket: bucketCount > 0 ? (processingDuration / bucketCount).toFixed(2) : 0,
                processingEfficiency: bucketCount > 0 ? ((results.length / bucketCount) * 100).toFixed(1) : 0
            }
        });

        // Log warning if processing took too long
        if (processingDuration > 100) {
            DataLayer.logAction('DATA_PROCESSING_PERFORMANCE_WARNING', {
                duration: processingDuration,
                bucketCount,
                threshold: 100,
                message: 'Data processing exceeded 100ms'
            });
        }
    }

    return results;
}

/**
 * Calculate health score for an event
 */
export function calculateScore(currentOrMetrics, baseline) {
    // Backward compatibility: if called with two arguments (current, baseline)
    if (arguments.length === 2 && typeof currentOrMetrics === 'number') {
        const current = currentOrMetrics;
        if (baseline === 0) return 0;

        const percentageChange = ((current - baseline) / baseline) * 100;
        return Math.round(percentageChange);
    }

    // New signature: metrics object
    const metrics = currentOrMetrics;
    const { current, baseline_period, daily_avg, highVolumeThreshold } = metrics;

    if (baseline_period === 0) return 0;

    const ratio = current / baseline_period;

    // High volume events (>= 1000 daily average)
    if (daily_avg >= highVolumeThreshold) {
        if (ratio < 0.5) {
            // Dropped by more than 50%
            return Math.round((1 - ratio) * -100);
        } else {
            // Positive/negative score based on increase/decrease
            return Math.round((ratio - 1) * 100);
        }
    }

    // Medium volume events
    else {
        if (ratio < 0.3) {
            // Dropped by more than 70%
            return Math.round((1 - ratio) * -100);
        } else {
            // Positive/negative score based on increase/decrease
            return Math.round((ratio - 1) * 100);
        }
    }
}

/**
 * Determine status based on score
 */
export function determineStatus(score) {
    if (score <= -80) return "CRITICAL";
    else if (score <= -50) return "WARNING";
    else if (score > 0) return "INCREASED";
    else return "NORMAL";
}

/**
 * Get status based on score and daily average (for backward compatibility with tests)
 */
export function getStatus(score, dailyAvg) {
    // High volume (>= 1000 daily)
    if (dailyAvg >= 1000) {
        if (score <= -80) return 'CRITICAL';
        if (score <= -50) return 'WARNING';
        if (score > 0) return 'INCREASED';
        return 'NORMAL';
    }
    // Medium volume (100-999 daily)
    else {
        if (score <= -80) return 'CRITICAL';
        if (score <= -30) return 'WARNING';
        if (score > 0) return 'INCREASED';
        return 'NORMAL';
    }
}

/**
 * Calculate impact message based on current vs baseline
 */
export function calculateImpact(current, baseline) {
    const difference = Math.abs(current - baseline);

    // Small difference - normal variance
    if (difference < 50) {
        return {
            type: 'normal',
            message: 'Normal variance'
        };
    }

    // Determine type and format message
    if (current < baseline) {
        return {
            type: 'loss',
            message: `Lost ~${difference.toLocaleString()} impressions`
        };
    } else {
        return {
            type: 'gain',
            message: `Gained ~${difference.toLocaleString()} impressions`
        };
    }
}

/**
 * Get summary statistics
 */
export function getSummaryStats(results) {
    const stats = {
        critical: 0,
        warning: 0,
        normal: 0,
        increased: 0
    };

    for (const result of results) {
        const status = result.status.toLowerCase();
        if (status in stats) {
            stats[status]++;
        }
    }

    return stats;
}

// Create default export object for backward compatibility
const DataProcessor = {
    processData,
    calculateScore,
    determineStatus,
    getStatus,
    calculateImpact,
    getSummaryStats,
    determineRadType,
    getDisplayName
};

// Export as default for convenience
export default DataProcessor;
