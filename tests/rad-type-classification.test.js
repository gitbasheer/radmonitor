import { describe, it, expect, beforeEach } from 'vitest';
import DataProcessor from '../assets/js/data-processor.js';

describe('RAD Type Classification', () => {
    const radTypes = {
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
    };

    describe('determineRadType', () => {
        it('should classify venture feed events correctly', () => {
            const events = [
                'pandc.vnext.recommendations.feed.feed_domain/index_6.impression',
                'pandc.vnext.recommendations.feed.feed_apmc',
                'pandc.vnext.recommendations.feed.feed_test/click'
            ];

            events.forEach(event => {
                const radType = DataProcessor.determineRadType(event, radTypes);
                expect(radType).toBe('venture_feed');
            });
        });

        it('should classify venture metrics events correctly', () => {
            const events = [
                'pandc.vnext.recommendations.metricsevolved.root.impression',
                'pandc.vnext.recommendations.metricsevolved.dashboard.click',
                'pandc.vnext.recommendations.metricsevolved.widget.view'
            ];

            events.forEach(event => {
                const radType = DataProcessor.determineRadType(event, radTypes);
                expect(radType).toBe('venture_metrics');
            });
        });

        it('should return unknown for disabled RAD types', () => {
            const event = 'pandc.vnext.recommendations.cart.add_item';
            const radType = DataProcessor.determineRadType(event, radTypes);
            expect(radType).toBe('unknown'); // cart is disabled
        });

        it('should return unknown for non-matching events', () => {
            const events = [
                'some.other.event',
                'pandc.vnext.other.service',
                'recommendations.feed.test' // missing prefix
            ];

            events.forEach(event => {
                const radType = DataProcessor.determineRadType(event, radTypes);
                expect(radType).toBe('unknown');
            });
        });

        it('should handle edge cases gracefully', () => {
            expect(DataProcessor.determineRadType('', radTypes)).toBe('unknown');
            expect(DataProcessor.determineRadType(null, radTypes)).toBe('unknown');
            expect(DataProcessor.determineRadType('test', null)).toBe('unknown');
            expect(DataProcessor.determineRadType('test', {})).toBe('unknown');
        });
    });

    describe('getDisplayName', () => {
        it('should return full event ID for venture feed events', () => {
            const eventId = 'pandc.vnext.recommendations.feed.feed_domain/index_6.impression';
            const displayName = DataProcessor.getDisplayName(eventId, 'venture_feed', radTypes);

            // For venture_feed, it strips the prefix
            expect(displayName).toBe('feed_domain/index_6.impression');
        });

        it('should handle venture metrics events', () => {
            const eventId = 'pandc.vnext.recommendations.metricsevolved.root.impression';
            const displayName = DataProcessor.getDisplayName(eventId, 'venture_metrics', radTypes);

            // For venture_metrics, it strips the prefix
            expect(displayName).toBe('root.impression');
        });

        it('should handle unknown RAD types', () => {
            const eventId = 'some.unknown.event';
            const displayName = DataProcessor.getDisplayName(eventId, 'unknown', radTypes);

            // For unknown, it falls back to default behavior
            expect(displayName).toBe('some.unknown.event');
        });
    });
});
