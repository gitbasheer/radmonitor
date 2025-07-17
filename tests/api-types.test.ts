/**
 * Tests for api-types.ts
 * Verifies TypeScript type definitions for flexible time comparison
 */

import { describe, it, expect, expectTypeOf } from 'vitest';
import type {
    TrafficQueryRequest,
    TrafficQueryResponse,
    TrafficEvent,
    TimeRange,
    StandardTimeRange,
    CustomTimeRange,
    InspectionTimeRange,
    TimeRangeValue
} from '../assets/js/api-types';

describe('TrafficQueryRequest Type', () => {
    it('should accept new comparison fields', () => {
        const request: TrafficQueryRequest = {
            baseline_start: '2023-11-01T00:00:00Z',
            baseline_end: '2023-11-04T12:00:00Z',
            comparison_start: '2023-11-11T11:21:00Z',
            comparison_end: '2023-11-11T12:00:00Z',
            time_comparison_strategy: 'linear_scale'
        };

        expect(request.comparison_start).toBe('2023-11-11T11:21:00Z');
        expect(request.comparison_end).toBe('2023-11-11T12:00:00Z');
        expect(request.time_comparison_strategy).toBe('linear_scale');
    });

    it('should allow all time comparison strategies', () => {
        const strategies = ['linear_scale', 'hourly_average', 'daily_pattern'] as const;

        strategies.forEach(strategy => {
            const request: TrafficQueryRequest = {
                baseline_start: '2023-11-01T00:00:00Z',
                baseline_end: '2023-11-08T00:00:00Z',
                time_comparison_strategy: strategy
            };

            expect(request.time_comparison_strategy).toBe(strategy);
        });
    });

    it('should maintain backward compatibility with current_time_range', () => {
        const request: TrafficQueryRequest = {
            baseline_start: '2023-11-01T00:00:00Z',
            baseline_end: '2023-11-08T00:00:00Z',
            current_time_range: '12h'
        };

        expect(request.current_time_range).toBe('12h');
        expect(request.comparison_start).toBeUndefined();
        expect(request.comparison_end).toBeUndefined();
    });

    it('should allow mixing old and new fields', () => {
        const request: TrafficQueryRequest = {
            baseline_start: '2023-11-01T00:00:00Z',
            baseline_end: '2023-11-08T00:00:00Z',
            current_time_range: '12h',
            comparison_start: '2023-11-11T00:00:00Z',
            comparison_end: '2023-11-11T12:00:00Z',
            time_comparison_strategy: 'hourly_average'
        };

        expect(request).toBeDefined();
    });

    it('should type check optional fields correctly', () => {
        // Minimal request
        const minimal: TrafficQueryRequest = {
            baseline_start: '2023-11-01T00:00:00Z',
            baseline_end: '2023-11-08T00:00:00Z'
        };

        // Full request
        const full: TrafficQueryRequest = {
            baseline_start: '2023-11-01T00:00:00Z',
            baseline_end: '2023-11-08T00:00:00Z',
            current_time_range: 'inspection_time',
            comparison_start: '2023-11-11T00:00:00Z',
            comparison_end: '2023-11-11T01:00:00Z',
            time_comparison_strategy: 'daily_pattern',
            event_pattern: 'custom.event.*',
            host: 'custom.host.com'
        };

        expect(minimal).toBeDefined();
        expect(full).toBeDefined();
    });
});

describe('TrafficQueryResponse Type', () => {
    it('should include new metadata fields', () => {
        const response: TrafficQueryResponse = {
            events: [],
            metadata: {
                total_events: 10,
                query_time: 50,
                baseline_days: 7,
                current_hours: 1,
                baseline_duration_ms: 604800000,
                comparison_duration_ms: 3600000,
                normalization_factor: 168.0,
                comparison_method: 'linear_scale'
            }
        };

        expect(response.metadata.baseline_duration_ms).toBe(604800000);
        expect(response.metadata.comparison_duration_ms).toBe(3600000);
        expect(response.metadata.normalization_factor).toBe(168.0);
        expect(response.metadata.comparison_method).toBe('linear_scale');
    });

    it('should allow comparison_method to be any strategy', () => {
        const methods = ['linear_scale', 'hourly_average', 'daily_pattern', 'scaled', 'averaged', 'projected'];

        methods.forEach(method => {
            const response: TrafficQueryResponse = {
                events: [],
                metadata: {
                    total_events: 0,
                    query_time: 0,
                    baseline_days: 0,
                    current_hours: 0,
                    baseline_duration_ms: 0,
                    comparison_duration_ms: 0,
                    normalization_factor: 1,
                    comparison_method: method as any
                }
            };

            expect(response.metadata.comparison_method).toBe(method);
        });
    });

    it('should type TrafficEvent correctly', () => {
        const event: TrafficEvent = {
            event_id: 'test.event.1',
            display_name: 'Test Event 1',
            current_count: 100,
            baseline_count: 12923,
            baseline_period: 100,
            daily_avg: 1849,
            score: 0,
            status: 'NORMAL'
        };

        expect(event.status).toBe('NORMAL');
        expectTypeOf(event.status).toEqualTypeOf<'CRITICAL' | 'WARNING' | 'NORMAL' | 'INCREASED'>();
    });
});

describe('Type Safety', () => {
    it('should enforce literal types for strategies', () => {
        type Strategy = NonNullable<TrafficQueryRequest['time_comparison_strategy']>;

        const validStrategy: Strategy = 'linear_scale';
        expect(validStrategy).toBe('linear_scale');

        // This would cause a TypeScript error:
        // const invalidStrategy: Strategy = 'invalid_strategy';
    });

    it('should enforce literal types for event status', () => {
        type Status = TrafficEvent['status'];

        const validStatuses: Status[] = ['CRITICAL', 'WARNING', 'NORMAL', 'INCREASED'];
        expect(validStatuses).toHaveLength(4);

        // This would cause a TypeScript error:
        // const invalidStatus: Status = 'UNKNOWN';
    });

    it('should handle time range types correctly', () => {
        const standard: StandardTimeRange = 'now-12h';
        const custom: CustomTimeRange = '-8h-24h';
        const inspection: InspectionTimeRange = 'inspection_time';

        const allRanges: TimeRangeValue[] = [standard, custom, inspection];
        expect(allRanges).toHaveLength(3);
    });
});

describe('Real-world Usage Scenarios', () => {
    it('should handle 39 minutes vs 3.5 days comparison', () => {
        const request: TrafficQueryRequest = {
            baseline_start: '2023-11-01T00:00:00.000Z',
            baseline_end: '2023-11-04T12:00:00.000Z',
            comparison_start: '2023-11-11T11:21:00.000Z',
            comparison_end: '2023-11-11T12:00:00.000Z',
            time_comparison_strategy: 'linear_scale',
            event_pattern: 'pandc.vnext.recommendations.feed.feed*',
            host: 'dashboard.godaddy.com'
        };

        const response: TrafficQueryResponse = {
            events: [
                {
                    event_id: 'pandc.vnext.recommendations.feed.click',
                    display_name: 'feed.click',
                    current_count: 150,
                    baseline_count: 19384,
                    baseline_period: 150,
                    daily_avg: 5538,
                    score: 0,
                    status: 'NORMAL'
                }
            ],
            metadata: {
                total_events: 1,
                query_time: 123,
                baseline_days: 3.5,
                current_hours: 0.65,
                baseline_duration_ms: 302400000,
                comparison_duration_ms: 2340000,
                normalization_factor: 129.23,
                comparison_method: 'linear_scale'
            }
        };

        expect(response.metadata.normalization_factor).toBeCloseTo(129.23, 2);
    });

    it('should handle inspection time with new fields', () => {
        const request: TrafficQueryRequest = {
            baseline_start: '2023-11-01T00:00:00Z',
            baseline_end: '2023-11-08T00:00:00Z',
            current_time_range: 'inspection_time',
            time_comparison_strategy: 'hourly_average'
        };

        expect(request.current_time_range).toBe('inspection_time');
        expect(request.time_comparison_strategy).toBe('hourly_average');
    });
});

describe('Type Exports', () => {
    it('should export all necessary types', () => {
        // These imports at the top verify the types are exported
        expectTypeOf<TrafficQueryRequest>().not.toBeAny();
        expectTypeOf<TrafficQueryResponse>().not.toBeAny();
        expectTypeOf<TrafficEvent>().not.toBeAny();
        expectTypeOf<TimeRange>().not.toBeAny();
        expectTypeOf<TimeRangeValue>().not.toBeAny();
    });
});
