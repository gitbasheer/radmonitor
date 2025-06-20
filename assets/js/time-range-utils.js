/**
 * Time Range Utilities for RAD Monitor Dashboard
 * Handles parsing and formatting of time range strings
 */

// ESM: Converted from IIFE to ES module export
export const TimeRangeUtils = (() => {
    'use strict';

    /**
     * Parse time range string to Elasticsearch filter object
     * Supports formats like "now-6h", "now-3d", "-3h-6h", and "inspection_time"
     */
    function parseTimeRangeToFilter(timeRange) {
        // Handle null/undefined/empty input
        if (!timeRange) {
            return {
                "gte": "now-12h"
            };
        }

        // Support for inspection_time - uses a specific inspection window
        if (timeRange === 'inspection_time') {
            // Default inspection time: from 24 hours ago to 8 hours ago (16 hour window)
            // This can be configured based on requirements
            return {
                "gte": "now-24h",
                "lte": "now-8h"
            };
        }

        // Support for custom time windows like "-8h-24h" (from 24 hours ago to 8 hours ago)
        const customMatch = timeRange.match(/^-(\d+)([hd])-(\d+)([hd])$/);
        if (customMatch) {
            const fromValue = parseInt(customMatch[1]);
            const fromUnit = customMatch[2];
            const toValue = parseInt(customMatch[3]);
            const toUnit = customMatch[4];

            const fromHours = fromUnit === 'h' ? fromValue : fromValue * 24;
            const toHours = toUnit === 'h' ? toValue : toValue * 24;

            // Return filter with both gte (greater than or equal) and lte (less than or equal)
            // For -8h-24h: gte: now-24h, lte: now-8h
            return {
                "gte": `now-${toValue}${toUnit}`,
                "lte": `now-${fromValue}${fromUnit}`
            };
        }

        // Support for existing format like "now-6h"
        const nowMatch = timeRange.match(/^now-(\d+)([hd])$/);
        if (nowMatch) {
            // For "now-6h", return just gte (from 6 hours ago to now)
            return {
                "gte": timeRange
            };
        }

        // Default fallback
        return {
            "gte": "now-12h"
        };
    }

    /**
     * Parse time range string to get hours
     * Returns object with type, hours, and elasticsearch format
     */
    function parseTimeRange(timeRange) {
        // Handle null/undefined/empty input
        if (!timeRange) {
            return {
                type: 'relative',
                hours: 12,
                gte: 'now-12h'
            };
        }

        // Support for inspection_time
        if (timeRange === 'inspection_time') {
            return {
                type: 'inspection',
                hours: 16, // 24h - 8h = 16h window
                gte: 'now-24h',
                lte: 'now-8h',
                label: 'Inspection Time (8-24h ago)'
            };
        }

        // Support for custom time windows like "-3h-6h" (from 3 hours ago to 6 hours ago)
        const customMatch = timeRange.match(/^-(\d+)([hd])-(\d+)([hd])$/);
        if (customMatch) {
            const fromValue = parseInt(customMatch[1]);
            const fromUnit = customMatch[2];
            const toValue = parseInt(customMatch[3]);
            const toUnit = customMatch[4];

            const fromHours = fromUnit === 'h' ? fromValue : fromValue * 24;
            const toHours = toUnit === 'h' ? toValue : toValue * 24;

            return {
                type: 'custom',
                hours: toHours - fromHours, // duration of the window
                gte: `now-${toValue}${toUnit}`,
                lte: `now-${fromValue}${fromUnit}`
            };
        }

        // Support for existing format like "now-6h"
        const nowMatch = timeRange.match(/^now-(\d+)([hd])$/);
        if (nowMatch) {
            const value = parseInt(nowMatch[1]);
            const unit = nowMatch[2];
            const hours = unit === 'h' ? value : value * 24;

            return {
                type: 'relative',
                hours: hours,
                gte: timeRange
            };
        }

        // Default fallback
        return {
            type: 'relative',
            hours: 12,
            gte: 'now-12h'
        };
    }

    /**
     * Validate time range format
     */
    function validateTimeRange(timeRange) {
        if (!timeRange) return false;

        // Check for inspection_time
        if (timeRange === 'inspection_time') return true;

        // Check for standard format: now-Xh or now-Xd
        const standardMatch = timeRange.match(/^now-(\d+)([hd])$/);
        if (standardMatch) return true;

        // Check for custom format: -Xh-Yh or -Xd-Yd
        const customMatch = timeRange.match(/^-(\d+)([hd])-(\d+)([hd])$/);
        if (customMatch) {
            // Ensure the first time is less than the second time
            const fromValue = parseInt(customMatch[1]);
            const fromUnit = customMatch[2];
            const toValue = parseInt(customMatch[3]);
            const toUnit = customMatch[4];

            const fromHours = fromUnit === 'h' ? fromValue : fromValue * 24;
            const toHours = toUnit === 'h' ? toValue : toValue * 24;

            return fromHours < toHours;
        }

        return false;
    }

    /**
     * Format time range for display
     */
    function formatTimeRange(timeRange) {
        const parsed = parseTimeRange(timeRange);

        if (parsed.type === 'inspection') {
            return parsed.label;
        } else if (parsed.type === 'custom') {
            return `${parsed.gte} → ${parsed.lte} (${parsed.hours}h window)`;
        } else {
            return `${parsed.gte} (${parsed.hours}h window)`;
        }
    }

    /**
     * Get preset time ranges
     */
    function getPresets() {
        return [
            { label: '6h', value: 'now-6h' },
            { label: '12h', value: 'now-12h' },
            { label: '24h', value: 'now-24h' },
            { label: '3d', value: 'now-3d' },
            { label: 'Inspection Time', value: 'inspection_time' }
        ];
    }

    /**
     * Validate if a string is a valid preset range
     */
    function validatePresetRange(preset) {
        const presets = getPresets();
        return presets.some(p => p.value === preset);
    }

    // Public API
    return {
        parseTimeRange,
        parseTimeRangeToFilter,
        validateTimeRange,
        formatTimeRange,
        getPresets,
        validatePresetRange
    };
})();

// ESM: Export as default for convenience
export default TimeRangeUtils;
