import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataLayer } from '../assets/js/data-layer.js';

describe('DataLayer RAD Type Integration', () => {
    beforeEach(() => {
        // Mock ConfigService
        global.ConfigService = {
            getConfig: () => ({
                rad_types: {
                    venture_feed: {
                        pattern: 'pandc.vnext.recommendations.feed.feed*',
                        display_name: 'Venture Feed',
                        enabled: true,
                        color: '#4CAF50'
                    },
                    venture_metrics: {
                        pattern: 'pandc.vnext.recommendations.metricsevolved*',
                        display_name: 'Venture Metrics',
                        enabled: true,
                        color: '#9C27B0'
                    },
                    cart_recommendations: {
                        pattern: 'pandc.vnext.recommendations.cart*',
                        display_name: 'Cart Recommendations',
                        enabled: false,
                        color: '#2196F3'
                    }
                },
                baselineStart: '2025-06-01',
                baselineEnd: '2025-06-09',
                highVolumeThreshold: 1000,
                mediumVolumeThreshold: 100
            })
        };

        // Mock DataProcessor
        global.DataProcessor = {
            determineRadType: vi.fn((eventId, radTypes) => {
                if (eventId.includes('feed.feed')) return 'venture_feed';
                if (eventId.includes('metricsevolved')) return 'venture_metrics';
                return 'unknown';
            })
        };

        // Mock unifiedAPI
        global.unifiedAPI = {
            initialized: true,
            executeQuery: vi.fn()
        };
    });

    describe('Query Building with Multiple RAD Types', () => {
        it('should build query with multiple enabled RAD patterns', () => {
            const config = {
                currentTimeRange: 'now-12h',
                baselineStart: '2025-06-01T00:00:00Z',
                baselineEnd: '2025-06-09T00:00:00Z'
            };

            const query = DataLayer.QueryTemplates.trafficAnalysis(config);

            // Check that the query includes both enabled patterns
            const filters = query.query.bool.filter;
            const wildcardFilter = filters.find(f => f.bool?.should);

            expect(wildcardFilter).toBeDefined();
            expect(wildcardFilter.bool.should).toHaveLength(2); // venture_feed and venture_metrics

            const patterns = wildcardFilter.bool.should.map(f =>
                f.wildcard['detail.event.data.traffic.eid.keyword'].value
            );

            expect(patterns).toContain('pandc.vnext.recommendations.feed.feed*');
            expect(patterns).toContain('pandc.vnext.recommendations.metricsevolved*');
            expect(patterns).not.toContain('pandc.vnext.recommendations.cart*'); // disabled
        });
    });

    describe('Data Transformation with RAD Types', () => {
        it('should add rad_type field to transformed data', () => {
            const mockBuckets = [
                {
                    key: 'pandc.vnext.recommendations.feed.feed_domain/index_6.impression',
                    baseline: { doc_count: 1000 },
                    current: { doc_count: 0 }
                },
                {
                    key: 'pandc.vnext.recommendations.metricsevolved.root.impression',
                    baseline: { doc_count: 2000 },
                    current: { doc_count: 500 }
                }
            ];

            const config = {
                baselineStart: '2025-06-01',
                baselineEnd: '2025-06-09',
                currentTimeRange: 'now-12h',
                highVolumeThreshold: 1000,
                mediumVolumeThreshold: 100,
                rad_types: ConfigService.getConfig().rad_types
            };

            const transformed = DataLayer.DataTransformer.transformTrafficData(
                { events: { buckets: mockBuckets } },
                config
            );

            expect(transformed).toHaveLength(2);

            // Check first event (venture_feed)
            expect(transformed[0].event_id).toBe('pandc.vnext.recommendations.feed.feed_domain/index_6.impression');
            expect(transformed[0].rad_type).toBe('venture_feed');
            expect(DataProcessor.determineRadType).toHaveBeenCalledWith(
                transformed[0].event_id,
                config.rad_types
            );

            // Check second event (venture_metrics)
            expect(transformed[1].event_id).toBe('pandc.vnext.recommendations.metricsevolved.root.impression');
            expect(transformed[1].rad_type).toBe('venture_metrics');
        });
    });

    describe('Query Patterns Fallback', () => {
        it('should use default pattern when no RAD types are enabled', () => {
            // Override config to have no enabled RAD types
            global.ConfigService.getConfig = () => ({
                rad_types: {
                    venture_feed: { pattern: 'test*', enabled: false },
                    venture_metrics: { pattern: 'test2*', enabled: false }
                },
                queryEventPattern: 'default.pattern*'
            });

            const config = {
                currentTimeRange: 'now-12h',
                baselineStart: '2025-06-01T00:00:00Z',
                baselineEnd: '2025-06-09T00:00:00Z'
            };

            const query = DataLayer.QueryTemplates.trafficAnalysis(config);

            const filters = query.query.bool.filter;
            const wildcardFilter = filters.find(f => f.bool?.should);

            expect(wildcardFilter.bool.should).toHaveLength(1);
            expect(wildcardFilter.bool.should[0].wildcard['detail.event.data.traffic.eid.keyword'].value)
                .toBe('default.pattern*');
        });
    });
});
