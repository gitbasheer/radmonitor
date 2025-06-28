import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import UIUpdater from '../assets/js/ui-updater.js';

describe('UI RAD Type Display', () => {
    let dom;
    let document;
    let window;

    beforeEach(() => {
        // Create a minimal DOM for testing
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <body>
                <table>
                    <tbody id="tableBody"></tbody>
                </table>
                <div id="criticalCount">0</div>
                <div id="warningCount">0</div>
                <div id="normalCount">0</div>
                <div id="increasedCount">0</div>
            </body>
            </html>
        `);

        document = dom.window.document;
        window = dom.window;

        // Make DOM globals available
        global.document = document;
        global.window = window;

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
                    }
                }
            })
        };
    });

    describe('updateDataTable', () => {
        it('should display full event ID in table', () => {
            const testData = [{
                event_id: 'pandc.vnext.recommendations.feed.feed_domain/index_6.impression',
                displayName: 'feed_domain/index_6.impression',
                rad_type: 'venture_feed',
                current: 0,
                baseline_period: 138,
                score: -100,
                status: 'CRITICAL',
                dailyAvg: 138
            }];

            UIUpdater.updateDataTable(testData);

            const eventNameEl = document.querySelector('.event-name');
            expect(eventNameEl.textContent).toBe('pandc.vnext.recommendations.feed.feed_domain/index_6.impression');
        });

        it('should show correct RAD type badge for venture_feed', () => {
            const testData = [{
                event_id: 'pandc.vnext.recommendations.feed.feed_test',
                rad_type: 'venture_feed',
                current: 100,
                baseline_period: 100,
                score: 0,
                status: 'NORMAL'
            }];

            UIUpdater.updateDataTable(testData);

            const radBadge = document.querySelector('.rad-type-badge');
            expect(radBadge.textContent).toBe('Venture Feed');
            expect(radBadge.style.background).toBe('#4CAF50');
            expect(radBadge.dataset.radType).toBe('venture_feed');
        });

        it('should show correct RAD type badge for venture_metrics', () => {
            const testData = [{
                event_id: 'pandc.vnext.recommendations.metricsevolved.root.impression',
                rad_type: 'venture_metrics',
                current: 350,
                baseline_period: 1000,
                score: -65,
                status: 'WARNING'
            }];

            UIUpdater.updateDataTable(testData);

            const radBadge = document.querySelector('.rad-type-badge');
            expect(radBadge.textContent).toBe('Venture Metrics');
            expect(radBadge.style.background).toBe('#9C27B0');
            expect(radBadge.dataset.radType).toBe('venture_metrics');
        });

        it('should add data-rad-type attribute to table row', () => {
            const testData = [{
                event_id: 'pandc.vnext.recommendations.feed.feed_test',
                rad_type: 'venture_feed',
                current: 100,
                baseline_period: 100,
                score: 0,
                status: 'NORMAL'
            }];

            UIUpdater.updateDataTable(testData);

            const row = document.querySelector('tbody tr');
            expect(row.dataset.radType).toBe('venture_feed');
        });

        it('should handle unknown RAD type gracefully', () => {
            const testData = [{
                event_id: 'some.unknown.event',
                rad_type: 'unknown',
                current: 50,
                baseline_period: 100,
                score: -50,
                status: 'WARNING'
            }];

            UIUpdater.updateDataTable(testData);

            const radBadge = document.querySelector('.rad-type-badge');
            expect(radBadge.textContent).toBe('Unknown');
            expect(radBadge.style.background).toBe('#666');

            const row = document.querySelector('tbody tr');
            expect(row.dataset.radType).toBe('unknown');
        });

        it('should update summary cards correctly', () => {
            const stats = {
                critical: 2,
                warning: 3,
                normal: 10,
                increased: 1
            };

            UIUpdater.updateSummaryCards(stats);

            expect(document.getElementById('criticalCount').textContent).toBe('2');
            expect(document.getElementById('warningCount').textContent).toBe('3');
            expect(document.getElementById('normalCount').textContent).toBe('10');
            expect(document.getElementById('increasedCount').textContent).toBe('1');
        });
    });
});
