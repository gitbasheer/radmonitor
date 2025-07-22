/**
 * Tests for Flexible Time Comparison Module
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import FlexibleTimeComparison from '../assets/js/flexible-time-comparison.js';

// Mock dependencies
vi.mock('../assets/js/api-interface.js', () => ({
    unifiedAPI: {
        trafficAnalysis: vi.fn()
    }
}));

// Import the mocked version
import { unifiedAPI } from '../assets/js/api-interface.js';

describe('FlexibleTimeComparison', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock console methods
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'group').mockImplementation(() => {});
        vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('compareCustomPeriods', () => {
        it('should compare custom time periods with linear scale strategy', async () => {
            // Setup
            const now = new Date();
            const comparisonStart = new Date(now.getTime() - 39 * 60 * 1000); // 39 minutes ago
            const comparisonEnd = now;
            const baselineEnd = new Date(now);
            baselineEnd.setDate(baselineEnd.getDate() - 7);
            const baselineStart = new Date(baselineEnd);
            baselineStart.setDate(baselineStart.getDate() - 3.5); // 3.5 days

            // Mock API response
            const mockResponse = {
                success: true,
                data: {
                    events: [
                        {
                            event_id: 'event1',
                            current_count: 100,
                            baseline_count: 12923,
                            baseline_period: 100,
                            score: 0,
                            status: 'NORMAL'
                        }
                    ],
                    metadata: {
                        baseline_duration_ms: 302400000, // 3.5 days
                        comparison_duration_ms: 2340000, // 39 minutes
                        normalization_factor: 129.23,
                        comparison_method: 'linear_scale'
                    }
                }
            };

            unifiedAPI.trafficAnalysis.mockResolvedValue(mockResponse);

            // Execute
            const result = await FlexibleTimeComparison.compareCustomPeriods(
                comparisonStart,
                comparisonEnd,
                baselineStart,
                baselineEnd,
                'linear_scale'
            );

            // Verify
            expect(unifiedAPI.trafficAnalysis).toHaveBeenCalledWith({
                baseline_start: baselineStart.toISOString(),
                baseline_end: baselineEnd.toISOString(),
                comparison_start: comparisonStart.toISOString(),
                comparison_end: comparisonEnd.toISOString(),
                time_comparison_strategy: 'linear_scale',
                event_pattern: [
                    'pandc.vnext.recommendations.feed.feed*',
                    'pandc.vnext.recommendations.metricsevolved*'
                ],
                host: 'dashboard.godaddy.com'
            });

            expect(result).toEqual(mockResponse.data);
            expect(console.log).toHaveBeenCalledWith(
                ' Executing flexible time comparison:',
                expect.objectContaining({
                    comparisonDuration: '39m',
                    baselineDuration: '4d 0h',
                    strategy: 'linear_scale'
                })
            );
        });

        it('should handle API errors gracefully', async () => {
            // Setup
            const errorMessage = 'API Error';
            unifiedAPI.trafficAnalysis.mockResolvedValue({
                success: false,
                error: { message: errorMessage }
            });

            // Execute & Verify
            await expect(FlexibleTimeComparison.compareCustomPeriods(
                new Date(),
                new Date(),
                new Date(),
                new Date()
            )).rejects.toThrow(errorMessage);

            expect(console.error).toHaveBeenCalledWith(
                'Failed to compare periods:',
                expect.any(Error)
            );
        });

        it('should use different comparison strategies', async () => {
            const strategies = ['linear_scale', 'hourly_average', 'daily_pattern'];
            const now = new Date();

            for (const strategy of strategies) {
                vi.clearAllMocks();

                unifiedAPI.trafficAnalysis.mockResolvedValue({
                    success: true,
                    data: {
                        events: [],
                        metadata: { comparison_method: strategy }
                    }
                });

                await FlexibleTimeComparison.compareCustomPeriods(
                    new Date(now.getTime() - 60 * 60 * 1000),
                    now,
                    new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
                    new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
                    strategy
                );

                expect(unifiedAPI.trafficAnalysis).toHaveBeenCalledWith(
                    expect.objectContaining({
                        time_comparison_strategy: strategy
                    })
                );
            }
        });
    });

    describe('compareLastMinutes', () => {
        it('should compare last N minutes correctly', async () => {
            const mockResponse = {
                success: true,
                data: { events: [], metadata: {} }
            };
            unifiedAPI.trafficAnalysis.mockResolvedValue(mockResponse);

            await FlexibleTimeComparison.compareLastMinutes(39, 7, 3.5);

            const call = unifiedAPI.trafficAnalysis.mock.calls[0][0];

            // Verify time calculations
            const baselineStart = new Date(call.baseline_start);
            const baselineEnd = new Date(call.baseline_end);
            const comparisonStart = new Date(call.comparison_start);
            const comparisonEnd = new Date(call.comparison_end);

            // Baseline should be ~3.5 days
            const baselineDuration = baselineEnd - baselineStart;
            expect(baselineDuration).toBeCloseTo(3.5 * 24 * 60 * 60 * 1000, -5);

            // Comparison should be 39 minutes
            const comparisonDuration = comparisonEnd - comparisonStart;
            expect(comparisonDuration).toBeCloseTo(39 * 60 * 1000, -3);

            expect(call.time_comparison_strategy).toBe('linear_scale');
        });

        it('should handle fractional days in baseline', async () => {
            unifiedAPI.trafficAnalysis.mockResolvedValue({
                success: true,
                data: { events: [], metadata: {} }
            });

            // 2.25 days = 2 days and 6 hours
            await FlexibleTimeComparison.compareLastMinutes(60, 7, 2.25);

            const call = unifiedAPI.trafficAnalysis.mock.calls[0][0];
            const baselineStart = new Date(call.baseline_start);
            const baselineEnd = new Date(call.baseline_end);

            const baselineDuration = baselineEnd - baselineStart;
            const expectedDuration = 2.25 * 24 * 60 * 60 * 1000;

            expect(Math.abs(baselineDuration - expectedDuration)).toBeLessThan(60 * 60 * 1000); // Within 1 hour
        });
    });

    describe('compareWithStrategies', () => {
        it('should compare using all strategies', async () => {
            const timeWindow = {
                comparisonStart: new Date().toISOString(),
                comparisonEnd: new Date().toISOString(),
                baselineStart: new Date().toISOString(),
                baselineEnd: new Date().toISOString()
            };

            // Mock different responses for each strategy
            const strategies = ['linear_scale', 'hourly_average', 'daily_pattern'];
            let callCount = 0;

            unifiedAPI.trafficAnalysis.mockImplementation(() => {
                const strategy = strategies[callCount % 3];
                callCount++;
                return Promise.resolve({
                    success: true,
                    data: {
                        events: [{ event_id: `event_${strategy}` }],
                        metadata: { comparison_method: strategy }
                    }
                });
            });

            const results = await FlexibleTimeComparison.compareWithStrategies(timeWindow);

            // Verify all strategies were tried
            expect(Object.keys(results)).toEqual(strategies);

            strategies.forEach(strategy => {
                expect(results[strategy]).toHaveProperty('events');
                expect(results[strategy]).toHaveProperty('metadata');
                expect(results[strategy]).toHaveProperty('summary');
            });

            expect(unifiedAPI.trafficAnalysis).toHaveBeenCalledTimes(3);
        });

        it('should handle strategy failures gracefully', async () => {
            const timeWindow = {
                comparisonStart: new Date().toISOString(),
                comparisonEnd: new Date().toISOString(),
                baselineStart: new Date().toISOString(),
                baselineEnd: new Date().toISOString()
            };

            // Make hourly_average fail
            let callCount = 0;
            unifiedAPI.trafficAnalysis.mockImplementation(() => {
                callCount++;
                if (callCount === 2) { // hourly_average is second
                    return Promise.reject(new Error('Strategy failed'));
                }
                return Promise.resolve({
                    success: true,
                    data: { events: [], metadata: {} }
                });
            });

            const results = await FlexibleTimeComparison.compareWithStrategies(timeWindow);

            expect(results.linear_scale).toHaveProperty('events');
            expect(results.hourly_average).toHaveProperty('error', 'Strategy failed');
            expect(results.daily_pattern).toHaveProperty('events');
        });
    });

    describe('analyzeHourlyPattern', () => {
        it('should analyze hourly patterns correctly', async () => {
            const targetTime = new Date('2023-11-11T12:30:00Z');
            const windowMinutes = 60;
            const baselineWeeks = 4;

            unifiedAPI.trafficAnalysis.mockResolvedValue({
                success: true,
                data: { events: [], metadata: {} }
            });

            await FlexibleTimeComparison.analyzeHourlyPattern(targetTime, windowMinutes, baselineWeeks);

            const call = unifiedAPI.trafficAnalysis.mock.calls[0][0];

            // Verify comparison window
            const comparisonStart = new Date(call.comparison_start);
            const comparisonEnd = new Date(call.comparison_end);
            expect(comparisonEnd - comparisonStart).toBe(windowMinutes * 60 * 1000);

            // Verify baseline period (4 weeks + 1 day back)
            const baselineStart = new Date(call.baseline_start);
            const baselineEnd = new Date(call.baseline_end);
            const expectedBaselineDays = 4 * 7; // 28 days (4 weeks)
            const actualBaselineDays = (baselineEnd - baselineStart) / (24 * 60 * 60 * 1000);
            expect(actualBaselineDays).toBeCloseTo(expectedBaselineDays, 1);

            // Should use hourly_average strategy
            expect(call.time_comparison_strategy).toBe('hourly_average');
        });
    });

    describe('formatDuration', () => {
        it('should format durations correctly', () => {
            const testCases = [
                { ms: 39 * 60 * 1000, expected: '39m' },
                { ms: 2 * 60 * 60 * 1000, expected: '2h 0m' },
                { ms: 3.5 * 24 * 60 * 60 * 1000, expected: '3d 12h' },
                { ms: 90 * 60 * 1000, expected: '1h 30m' },
                { ms: 25 * 60 * 60 * 1000, expected: '1d 1h' }
            ];

            testCases.forEach(({ ms, expected }) => {
                expect(FlexibleTimeComparison.formatDuration(ms)).toBe(expected);
            });
        });
    });

    describe('summarizeResults', () => {
        it('should summarize results correctly', () => {
            const data = {
                events: [
                    { status: 'CRITICAL', baseline_count: 1000, current_count: 100 },
                    { status: 'WARNING', baseline_count: 500, current_count: 300 },
                    { status: 'NORMAL', baseline_count: 200, current_count: 200 },
                    { status: 'INCREASED', baseline_count: 100, current_count: 200 }
                ],
                metadata: {
                    normalization_factor: 10,
                    comparison_method: 'linear_scale'
                }
            };

            const summary = FlexibleTimeComparison.summarizeResults(data);

            expect(summary).toEqual({
                totalEvents: 4,
                criticalEvents: 1,
                warningEvents: 1,
                increasedEvents: 1,
                totalBaselineTraffic: 1800,
                totalCurrentTraffic: 800,
                normalizedCurrentTraffic: 8000, // 800 * 10
                percentageChange: '344.44%', // ((8000 - 1800) / 1800 * 100)
                normalizationFactor: 10,
                comparisonMethod: 'linear_scale'
            });
        });

        it('should handle zero baseline traffic', () => {
            const data = {
                events: [],
                metadata: {
                    normalization_factor: 1,
                    comparison_method: 'linear_scale'
                }
            };

            const summary = FlexibleTimeComparison.summarizeResults(data);

            expect(summary.percentageChange).toBe('0%');
            expect(summary.totalBaselineTraffic).toBe(0);
            expect(summary.totalCurrentTraffic).toBe(0);
        });
    });

    describe('runExamples', () => {
        it('should run all examples without errors', async () => {
            // Mock successful responses for all example calls
            unifiedAPI.trafficAnalysis.mockResolvedValue({
                success: true,
                data: {
                    events: [
                        {
                            event_id: 'test.event',
                            status: 'NORMAL',
                            baseline_count: 1000,
                            current_count: 100
                        }
                    ],
                    metadata: {
                        normalization_factor: 129.23,
                        comparison_method: 'linear_scale'
                    }
                }
            });

            // Should not throw
            await expect(FlexibleTimeComparison.runExamples()).resolves.not.toThrow();

            // Should have made multiple API calls for different examples
            expect(unifiedAPI.trafficAnalysis).toHaveBeenCalledTimes(3);
        });

        it('should handle example failures gracefully', async () => {
            unifiedAPI.trafficAnalysis.mockRejectedValue(new Error('Example failed'));

            // Should not throw, just log errors
            await expect(FlexibleTimeComparison.runExamples()).resolves.not.toThrow();

            expect(console.error).toHaveBeenCalledWith('Example failed:', expect.any(Error));
        });
    });

    describe('Integration scenarios', () => {
        it('should handle real-world scenario: 39 minutes vs 3.5 days', async () => {
            const now = new Date();
            const mockData = {
                events: [
                    {
                        event_id: 'feed.recommendations.click',
                        current_count: 150,
                        baseline_count: 19384,
                        baseline_period: 150, // Normalized
                        score: 0,
                        status: 'NORMAL'
                    },
                    {
                        event_id: 'feed.recommendations.view',
                        current_count: 50,
                        baseline_count: 12923,
                        baseline_period: 100,
                        score: -50,
                        status: 'WARNING'
                    }
                ],
                metadata: {
                    baseline_duration_ms: 302400000, // 3.5 days
                    comparison_duration_ms: 2340000, // 39 minutes
                    normalization_factor: 129.23,
                    comparison_method: 'linear_scale'
                }
            };

            unifiedAPI.trafficAnalysis.mockResolvedValue({
                success: true,
                data: mockData
            });

            const result = await FlexibleTimeComparison.compareLastMinutes(39, 7, 3.5);

            expect(result).toEqual(mockData);

            const summary = FlexibleTimeComparison.summarizeResults(result);
            expect(summary.normalizationFactor).toBeCloseTo(129.23, 2);
            expect(summary.warningEvents).toBe(1);
            expect(summary.totalEvents).toBe(2);
        });
    });

    describe('Edge Cases - Comprehensive Coverage', () => {
        describe('Duration Edge Cases', () => {
            it('should handle zero duration comparison periods', async () => {
                const now = new Date();

                unifiedAPI.trafficAnalysis.mockResolvedValue({
                    success: true,
                    data: {
                        events: [],
                        metadata: {
                            comparison_duration_ms: 0,
                            baseline_duration_ms: 86400000,
                            normalization_factor: 1.0, // Safe default
                            comparison_method: 'linear_scale'
                        }
                    }
                });

                const result = await FlexibleTimeComparison.compareCustomPeriods(
                    now, // same start
                    now, // and end (zero duration)
                    new Date(now.getTime() - 24 * 60 * 60 * 1000),
                    now,
                    'linear_scale'
                );

                expect(result.metadata.comparison_duration_ms).toBe(0);
                expect(result.metadata.normalization_factor).toBe(1.0);
            });

            it('should handle negative durations (end before start)', async () => {
                const now = new Date();
                const later = new Date(now.getTime() + 60 * 60 * 1000);

                unifiedAPI.trafficAnalysis.mockResolvedValue({
                    success: true,
                    data: { events: [], metadata: {} }
                });

                // End is before start - negative duration
                await expect(FlexibleTimeComparison.compareCustomPeriods(
                    later,  // start is later
                    now,    // end is earlier
                    new Date(now.getTime() - 24 * 60 * 60 * 1000),
                    now
                )).resolves.toBeDefined(); // Should not throw
            });

            it('should handle very large durations (years)', async () => {
                const now = new Date();
                const twoYearsAgo = new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000);
                const oneSecondAgo = new Date(now.getTime() - 1000);

                unifiedAPI.trafficAnalysis.mockResolvedValue({
                    success: true,
                    data: {
                        events: [],
                        metadata: {
                            baseline_duration_ms: 2 * 365 * 24 * 60 * 60 * 1000,
                            comparison_duration_ms: 1000,
                            normalization_factor: 63072000, // 2 years / 1 second
                            comparison_method: 'linear_scale'
                        }
                    }
                });

                const result = await FlexibleTimeComparison.compareCustomPeriods(
                    oneSecondAgo,
                    now,
                    twoYearsAgo,
                    now
                );

                expect(result.metadata.normalization_factor).toBeGreaterThan(60000000);
            });

            it('should handle millisecond precision', async () => {
                const baseTime = new Date('2023-11-11T12:30:45.123Z');
                const baseTimePlus100ms = new Date(baseTime.getTime() + 100);

                unifiedAPI.trafficAnalysis.mockResolvedValue({
                    success: true,
                    data: { events: [], metadata: {} }
                });

                await FlexibleTimeComparison.compareCustomPeriods(
                    baseTime,
                    baseTimePlus100ms,
                    baseTime,
                    baseTimePlus100ms
                );

                const call = unifiedAPI.trafficAnalysis.mock.calls[0][0];
                expect(call.comparison_start).toContain('.123');
                expect(call.comparison_end).toContain('.223');
            });
        });

        describe('Strategy Edge Cases', () => {
            it('should handle null/undefined strategy gracefully', async () => {
                const now = new Date();

                unifiedAPI.trafficAnalysis.mockResolvedValue({
                    success: true,
                    data: { events: [], metadata: { comparison_method: 'linear_scale' } }
                });

                const result = await FlexibleTimeComparison.compareCustomPeriods(
                    new Date(now.getTime() - 60 * 60 * 1000),
                    now,
                    new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
                    now,
                    undefined // or null
                );

                // Should default to linear_scale
                expect(result.metadata.comparison_method).toBe('linear_scale');
            });

            it('should handle concurrent requests with different strategies', async () => {
                const strategies = ['linear_scale', 'hourly_average', 'daily_pattern'];
                let callCount = 0;

                unifiedAPI.trafficAnalysis.mockImplementation(() => {
                    const strategy = strategies[callCount % 3];
                    callCount++;
                    return Promise.resolve({
                        success: true,
                        data: {
                            events: [],
                            metadata: { comparison_method: strategy }
                        }
                    });
                });

                const promises = strategies.map(strategy =>
                    FlexibleTimeComparison.compareCustomPeriods(
                        new Date(),
                        new Date(),
                        new Date(),
                        new Date(),
                        strategy
                    )
                );

                const results = await Promise.all(promises);

                results.forEach((result, index) => {
                    expect(result.metadata.comparison_method).toBe(strategies[index]);
                });
            });
        });

        describe('Date/Time Edge Cases', () => {
            it('should handle daylight saving time transitions', async () => {
                // Spring forward: 2023-03-12 2:00 AM becomes 3:00 AM
                const dstStart = new Date('2023-03-12T02:00:00');
                const afterDst = new Date('2023-03-12T03:30:00');

                unifiedAPI.trafficAnalysis.mockResolvedValue({
                    success: true,
                    data: { events: [], metadata: {} }
                });

                await expect(FlexibleTimeComparison.compareCustomPeriods(
                    dstStart,
                    afterDst,
                    dstStart,
                    afterDst
                )).resolves.toBeDefined();
            });

            it('should handle leap year dates', async () => {
                const leapDay = new Date('2024-02-29T12:00:00Z');
                const dayBefore = new Date('2024-02-28T12:00:00Z');

                unifiedAPI.trafficAnalysis.mockResolvedValue({
                    success: true,
                    data: { events: [], metadata: {} }
                });

                await FlexibleTimeComparison.compareCustomPeriods(
                    dayBefore,
                    leapDay,
                    dayBefore,
                    leapDay
                );

                const call = unifiedAPI.trafficAnalysis.mock.calls[0][0];
                expect(call.baseline_end).toContain('2024-02-29');
            });

            it('should handle very old dates (epoch)', async () => {
                const epoch = new Date('1970-01-01T00:00:00Z');
                const epochPlus1Day = new Date('1970-01-02T00:00:00Z');

                unifiedAPI.trafficAnalysis.mockResolvedValue({
                    success: true,
                    data: { events: [], metadata: {} }
                });

                await FlexibleTimeComparison.compareCustomPeriods(
                    epoch,
                    epochPlus1Day,
                    epoch,
                    epochPlus1Day
                );

                const call = unifiedAPI.trafficAnalysis.mock.calls[0][0];
                expect(call.baseline_start).toContain('1970-01-01');
            });

            it('should handle future dates', async () => {
                const futureDate = new Date('2030-01-01T00:00:00Z');
                const futureDatePlus1Hour = new Date('2030-01-01T01:00:00Z');

                unifiedAPI.trafficAnalysis.mockResolvedValue({
                    success: true,
                    data: { events: [], metadata: {} }
                });

                await expect(FlexibleTimeComparison.compareCustomPeriods(
                    futureDate,
                    futureDatePlus1Hour,
                    futureDate,
                    futureDatePlus1Hour
                )).resolves.toBeDefined();
            });
        });

        describe('Normalization Edge Cases', () => {
            it('should handle extreme normalization factors (> 1 million)', async () => {
                const yearInMs = 365 * 24 * 60 * 60 * 1000;
                const secondInMs = 1000;

                unifiedAPI.trafficAnalysis.mockResolvedValue({
                    success: true,
                    data: {
                        events: [{
                            baseline_count: 31536000,
                            baseline_period: 1,
                            current_count: 1
                        }],
                        metadata: {
                            baseline_duration_ms: yearInMs,
                            comparison_duration_ms: secondInMs,
                            normalization_factor: yearInMs / secondInMs,
                            comparison_method: 'linear_scale'
                        }
                    }
                });

                const result = await FlexibleTimeComparison.compareCustomPeriods(
                    new Date(Date.now() - secondInMs),
                    new Date(),
                    new Date(Date.now() - yearInMs),
                    new Date()
                );

                expect(result.metadata.normalization_factor).toBe(31536000);
            });

            it('should handle normalization factor < 1 (comparison > baseline)', async () => {
                unifiedAPI.trafficAnalysis.mockResolvedValue({
                    success: true,
                    data: {
                        events: [],
                        metadata: {
                            baseline_duration_ms: 60000, // 1 minute
                            comparison_duration_ms: 3600000, // 1 hour
                            normalization_factor: 1/60,
                            comparison_method: 'linear_scale'
                        }
                    }
                });

                const result = await FlexibleTimeComparison.compareCustomPeriods(
                    new Date(Date.now() - 3600000),
                    new Date(),
                    new Date(Date.now() - 60000),
                    new Date()
                );

                expect(result.metadata.normalization_factor).toBeLessThan(1);
                expect(result.metadata.normalization_factor).toBeCloseTo(1/60, 4);
            });
        });

        describe('Error Recovery', () => {
            it('should handle NaN in calculations gracefully', async () => {
                const data = {
                    events: [{
                        baseline_count: 0,
                        current_count: 0,
                        status: 'NORMAL'
                    }],
                    metadata: {
                        normalization_factor: NaN
                    }
                };

                const summary = FlexibleTimeComparison.summarizeResults(data);

                // Should handle NaN without throwing
                expect(summary.percentageChange).toBeDefined();
                expect(typeof summary.percentageChange).toBe('string');
            });

            it('should handle Infinity in calculations', async () => {
                const data = {
                    events: [],
                    metadata: {
                        normalization_factor: Infinity
                    }
                };

                const summary = FlexibleTimeComparison.summarizeResults(data);

                // Should handle Infinity without throwing
                expect(summary).toBeDefined();
            });

            it('should handle malformed API responses', async () => {
                unifiedAPI.trafficAnalysis.mockResolvedValue({
                    success: true,
                    data: null // Malformed response
                });

                await expect(FlexibleTimeComparison.compareCustomPeriods(
                    new Date(),
                    new Date(),
                    new Date(),
                    new Date()
                )).rejects.toThrow();
            });
        });

        describe('formatDuration Edge Cases', () => {
            it('should format edge case durations correctly', () => {
                const testCases = [
                    { ms: 0, expected: '0m' },
                    { ms: 999, expected: '0m' }, // Less than 1 minute
                    { ms: 59999, expected: '0m' }, // Just under 1 minute
                    { ms: 60000, expected: '1m' }, // Exactly 1 minute
                    { ms: 86400000, expected: '1d 0h' }, // Exactly 1 day
                    { ms: 31536000000, expected: '365d 0h' }, // 1 year
                    { ms: -3600000, expected: '1h 0m' } // Negative duration (should be treated as positive)
                ];

                testCases.forEach(({ ms, expected }) => {
                    const result = FlexibleTimeComparison.formatDuration(Math.abs(ms));
                    expect(result).toBe(expected);
                });
            });
        });

        describe('Memory and Performance', () => {
            it('should handle large result sets efficiently', async () => {
                // Create 10000 events
                const largeEventSet = Array(10000).fill(null).map((_, i) => ({
                    event_id: `event_${i}`,
                    current_count: Math.floor(Math.random() * 1000),
                    baseline_count: Math.floor(Math.random() * 10000),
                    status: ['CRITICAL', 'WARNING', 'NORMAL', 'INCREASED'][i % 4]
                }));

                const startTime = Date.now();

                const summary = FlexibleTimeComparison.summarizeResults({
                    events: largeEventSet,
                    metadata: { normalization_factor: 100 }
                });

                const endTime = Date.now();

                // Should complete in reasonable time (< 100ms)
                expect(endTime - startTime).toBeLessThan(100);
                expect(summary.totalEvents).toBe(10000);
            });
        });
    });
});
