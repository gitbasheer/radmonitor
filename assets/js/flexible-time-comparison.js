/**
 * Flexible Time Comparison Module
 * Demonstrates how to use the enhanced time comparison features
 */

import { unifiedAPI } from './api-interface.js';
import { ConfigService } from './config-service.js';

export const FlexibleTimeComparison = (() => {
    'use strict';

    /**
     * Get enabled RAD patterns from configuration
     */
    function getEnabledPatterns() {
        const config = ConfigService.getConfig();
        const patterns = [];
        
        if (config.rad_types) {
            for (const [key, radConfig] of Object.entries(config.rad_types)) {
                if (radConfig.enabled && radConfig.pattern) {
                    patterns.push(radConfig.pattern);
                }
            }
        }
        
        // Fallback to default if no patterns configured
        if (patterns.length === 0) {
            patterns.push("pandc.vnext.recommendations.feed.feed*");
        }
        
        return patterns;
    }

    /**
     * Compare traffic for a specific period against a baseline
     * @param {Date} comparisonStart - Start of the period to analyze (e.g., 39 minutes ago)
     * @param {Date} comparisonEnd - End of the period to analyze (e.g., now)
     * @param {Date} baselineStart - Start of the baseline period
     * @param {Date} baselineEnd - End of the baseline period
     * @param {string} strategy - Comparison strategy: 'linear_scale', 'hourly_average', or 'daily_pattern'
     */
    async function compareCustomPeriods(comparisonStart, comparisonEnd, baselineStart, baselineEnd, strategy = 'linear_scale') {
        try {
            // Get patterns from config instead of hardcoding
            const patterns = getEnabledPatterns();
            
            const request = {
                baseline_start: baselineStart.toISOString(),
                baseline_end: baselineEnd.toISOString(),

                // Use the new precise comparison fields
                comparison_start: comparisonStart.toISOString(),
                comparison_end: comparisonEnd.toISOString(),

                // Specify how to normalize the time differences
                time_comparison_strategy: strategy || 'linear_scale',

                // Use dynamic patterns (api-interface will handle multiple patterns)
                event_pattern: patterns.length === 1 ? patterns[0] : patterns,
                host: "dashboard.godaddy.com"
            };

            console.log(' Executing flexible time comparison:', {
                comparisonDuration: formatDuration(comparisonEnd - comparisonStart),
                baselineDuration: formatDuration(baselineEnd - baselineStart),
                strategy
            });

            const result = await unifiedAPI.trafficAnalysis(request);

            if (result.success) {
                if (!result.data) {
                    throw new Error('Invalid response: missing data');
                }

                // Log the normalization metadata
                console.log('⚙️ Time normalization details:', {
                    baselineDurationMs: result.data.metadata.baseline_duration_ms,
                    comparisonDurationMs: result.data.metadata.comparison_duration_ms,
                    normalizationFactor: result.data.metadata.normalization_factor,
                    comparisonMethod: result.data.metadata.comparison_method
                });

                return result.data;
            } else {
                throw new Error(result.error ? result.error.message : 'Unknown error');
            }
        } catch (error) {
            console.error('Failed to compare periods:', error);
            throw error;
        }
    }

    /**
     * Compare the last N minutes against a baseline from last week
     * @param {number} minutes - Number of minutes to analyze
     * @param {number} baselineDaysAgo - How many days ago to use for baseline
     * @param {number} baselineDurationDays - Duration of baseline in days
     */
    async function compareLastMinutes(minutes, baselineDaysAgo = 7, baselineDurationDays = 3.5) {
        const now = new Date();
        const comparisonEnd = new Date(now);
        const comparisonStart = new Date(now.getTime() - minutes * 60 * 1000);

        // Calculate baseline period
        const baselineEnd = new Date(now);
        baselineEnd.setDate(baselineEnd.getDate() - baselineDaysAgo);
        baselineEnd.setHours(now.getHours(), now.getMinutes(), 0, 0);

        const baselineStart = new Date(baselineEnd);
        baselineStart.setDate(baselineStart.getDate() - Math.floor(baselineDurationDays));

        // Handle fractional days
        const fractionalHours = (baselineDurationDays % 1) * 24;
        baselineStart.setHours(baselineStart.getHours() - Math.floor(fractionalHours));

        console.log(`🕒 Comparing last ${minutes} minutes to ${baselineDurationDays} days from ${baselineDaysAgo} days ago`);

        return compareCustomPeriods(comparisonStart, comparisonEnd, baselineStart, baselineEnd, 'linear_scale');
    }

    /**
     * Compare a specific time window using different strategies
     * @param {object} timeWindow - Object with comparison and baseline periods
     */
    async function compareWithStrategies(timeWindow) {
        const strategies = ['linear_scale', 'hourly_average', 'daily_pattern'];
        const results = {};

        for (const strategy of strategies) {
            try {
                console.log(`\n🔄 Trying strategy: ${strategy}`);
                const result = await compareCustomPeriods(
                    new Date(timeWindow.comparisonStart),
                    new Date(timeWindow.comparisonEnd),
                    new Date(timeWindow.baselineStart),
                    new Date(timeWindow.baselineEnd),
                    strategy
                );

                results[strategy] = {
                    events: result.events,
                    metadata: result.metadata,
                    summary: summarizeResults(result)
                };

            } catch (error) {
                results[strategy] = { error: error.message };
            }
        }

        return results;
    }

    /**
     * Analyze traffic patterns with hourly precision
     * @param {Date} targetTime - The specific time to analyze
     * @param {number} windowMinutes - Window size in minutes
     * @param {number} baselineWeeks - How many weeks of baseline data to use
     */
    async function analyzeHourlyPattern(targetTime, windowMinutes = 60, baselineWeeks = 4) {
        const comparisonEnd = new Date(targetTime);
        const comparisonStart = new Date(targetTime.getTime() - windowMinutes * 60 * 1000);

        // For hourly patterns, we want to compare the same hour across multiple days
        const baselineEnd = new Date(targetTime);
        baselineEnd.setDate(baselineEnd.getDate() - 1); // Start from yesterday

        const baselineStart = new Date(baselineEnd);
        baselineStart.setDate(baselineStart.getDate() - (baselineWeeks * 7));

        console.log(`📈 Analyzing hourly pattern for ${targetTime.toLocaleTimeString()}`);
        console.log(`   Window: ${windowMinutes} minutes`);
        console.log(`   Baseline: ${baselineWeeks} weeks of data`);

        return compareCustomPeriods(
            comparisonStart,
            comparisonEnd,
            baselineStart,
            baselineEnd,
            'hourly_average' // Use hourly average for pattern analysis
        );
    }

    /**
     * Helper function to format duration
     */
    function formatDuration(milliseconds) {
        // Handle edge cases
        if (!milliseconds || milliseconds < 0) {
            milliseconds = Math.abs(milliseconds) || 0;
        }

        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            const remainingHours = hours % 24;
            return `${days}d ${remainingHours}h`;
        } else if (hours > 0) {
            const remainingMinutes = minutes % 60;
            return `${hours}h ${remainingMinutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    /**
     * Summarize results for easy comparison
     */
    function summarizeResults(data) {
        const criticalEvents = data.events.filter(e => e.status === 'CRITICAL').length;
        const warningEvents = data.events.filter(e => e.status === 'WARNING').length;
        const increasedEvents = data.events.filter(e => e.status === 'INCREASED').length;

        const totalBaselineTraffic = data.events.reduce((sum, e) => sum + e.baseline_count, 0);
        const totalCurrentTraffic = data.events.reduce((sum, e) => sum + e.current_count, 0);

                // Calculate normalized comparison using the normalization factor
        const normFactor = data.metadata.normalization_factor || 1;
        const safeNormFactor = isFinite(normFactor) ? normFactor : 1;
        const normalizedCurrent = totalCurrentTraffic * safeNormFactor;

        let percentageChange = 0;
        if (totalBaselineTraffic > 0 && isFinite(normalizedCurrent)) {
            percentageChange = ((normalizedCurrent - totalBaselineTraffic) / totalBaselineTraffic * 100);
            percentageChange = isFinite(percentageChange) ? percentageChange.toFixed(2) : '0';
        } else {
            percentageChange = '0';
        }

        return {
            totalEvents: data.events.length,
            criticalEvents,
            warningEvents,
            increasedEvents,
            totalBaselineTraffic,
            totalCurrentTraffic,
            normalizedCurrentTraffic: Math.round(normalizedCurrent),
            percentageChange: `${percentageChange}%`,
            normalizationFactor: data.metadata.normalization_factor,
            comparisonMethod: data.metadata.comparison_method
        };
    }

    /**
     * Demo function showing various use cases
     */
    async function runExamples() {
        console.group('🎯 Flexible Time Comparison Examples');

        try {
            // Example 1: Last 39 minutes vs 3.5 days from last week
            console.log('\n1️⃣ Example: Last 39 minutes vs 3.5 days from last week');
            const example1 = await compareLastMinutes(39, 7, 3.5);
            console.log('Summary:', summarizeResults(example1));

            // Example 2: Specific 2-hour window vs same time last month
            console.log('\n2️⃣ Example: 2-hour window vs same time last month');
            const now = new Date();
            const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

            const lastMonth = new Date(now);
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            const lastMonthTwoHoursAgo = new Date(lastMonth.getTime() - 2 * 60 * 60 * 1000);

            const example2 = await compareCustomPeriods(
                twoHoursAgo, now,
                lastMonthTwoHoursAgo, lastMonth,
                'daily_pattern'
            );
            console.log('Summary:', summarizeResults(example2));

            // Example 3: Analyze lunch hour pattern
            console.log('\n3️⃣ Example: Lunch hour pattern analysis');
            const lunchTime = new Date();
            lunchTime.setHours(12, 30, 0, 0); // 12:30 PM

            const example3 = await analyzeHourlyPattern(lunchTime, 60, 4);
            console.log('Summary:', summarizeResults(example3));

        } catch (error) {
            console.error('Example failed:', error);
        }

        console.groupEnd();
    }

    // Public API
    return {
        compareCustomPeriods,
        compareLastMinutes,
        compareWithStrategies,
        analyzeHourlyPattern,
        runExamples,
        formatDuration,
        summarizeResults
    };
})();

// Export for ES modules
export default FlexibleTimeComparison;
