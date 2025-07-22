import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import DataProcessor from '../assets/js/data-processor.js';
import UIUpdater from '../assets/js/ui-updater.js';
import { SearchFilter } from '../assets/js/search-filter.js';

describe('RAD Type Integration Test', () => {
    let dom;
    let document;
    let window;

    beforeEach(() => {
        // Create full DOM structure
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <body>
                <div id="criticalCount">0</div>
                <div id="warningCount">0</div>
                <div id="normalCount">0</div>
                <div id="increasedCount">0</div>
                <input type="text" id="searchInput" />
                <div class="filter-buttons">
                    <button class="filter-btn active" data-filter="all">ALL</button>
                    <button class="filter-btn" data-filter="critical">CRITICAL</button>
                </div>
                <div class="filter-buttons">
                    <button class="rad-filter-btn active" data-rad-type="all">ALL</button>
                    <button class="rad-filter-btn active" data-rad-type="venture_feed">Venture Feed</button>
                    <button class="rad-filter-btn active" data-rad-type="venture_metrics">Venture Metrics</button>
                </div>
                <div id="resultsInfo"></div>
                <table class="data-table">
                    <tbody id="tableBody"></tbody>
                </table>
            </body>
            </html>
        `);

        document = dom.window.document;
        window = dom.window;
        global.document = document;
        global.window = window;

        // Mock ConfigService with full config
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

        // Initialize SearchFilter
        SearchFilter.initialize();
    });

    describe('Full Flow Integration', () => {
        it('should process data, display in UI, and filter correctly', () => {
            // Step 1: Process raw data with RAD type classification
            const testData = [
                {
                    event_id: 'pandc.vnext.recommendations.feed.feed_domain/index_6.impression',
                    current: 0,
                    baseline_period: 138,
                    score: -100,
                    status: 'CRITICAL',
                    dailyAvg: 138
                },
                {
                    event_id: 'pandc.vnext.recommendations.metricsevolved.root.impression',
                    current: 350,
                    baseline_period: 1000,
                    score: -65,
                    status: 'WARNING',
                    dailyAvg: 1000
                },
                {
                    event_id: 'pandc.vnext.recommendations.feed.feed_test',
                    current: 950,
                    baseline_period: 1000,
                    score: -5,
                    status: 'NORMAL',
                    dailyAvg: 1000
                }
            ];

            // Add RAD types to data
            const processedData = testData.map(item => ({
                ...item,
                rad_type: DataProcessor.determineRadType(
                    item.event_id,
                    ConfigService.getConfig().rad_types
                )
            }));

            // Verify RAD type classification
            expect(processedData[0].rad_type).toBe('venture_feed');
            expect(processedData[1].rad_type).toBe('venture_metrics');
            expect(processedData[2].rad_type).toBe('venture_feed');

            // Step 2: Update UI with processed data
            UIUpdater.updateDataTable(processedData);

            // Verify full event IDs are displayed
            const eventNames = document.querySelectorAll('.event-name');
            expect(eventNames[0].textContent).toBe('pandc.vnext.recommendations.feed.feed_domain/index_6.impression');
            expect(eventNames[1].textContent).toBe('pandc.vnext.recommendations.metricsevolved.root.impression');
            expect(eventNames[2].textContent).toBe('pandc.vnext.recommendations.feed.feed_test');

            // Verify RAD type badges
            const radBadges = document.querySelectorAll('.rad-type-badge');
            expect(radBadges[0].textContent).toBe('Venture Feed');
            expect(radBadges[0].style.background).toBe('#4CAF50');
            expect(radBadges[1].textContent).toBe('Venture Metrics');
            expect(radBadges[1].style.background).toBe('#9C27B0');

            // Verify data attributes on rows
            const rows = document.querySelectorAll('tbody tr');
            expect(rows[0].dataset.radType).toBe('venture_feed');
            expect(rows[1].dataset.radType).toBe('venture_metrics');

            // Step 3: Test filtering by RAD type
            // Deselect ALL and venture_metrics
            document.querySelector('.rad-filter-btn[data-rad-type="all"]').classList.remove('active');
            document.querySelector('.rad-filter-btn[data-rad-type="venture_metrics"]').classList.remove('active');

            SearchFilter.applyRadTypeFilter();

            // Only venture_feed rows should be visible
            expect(rows[0].style.display).not.toBe('none');
            expect(rows[1].style.display).toBe('none');
            expect(rows[2].style.display).not.toBe('none');

            // Step 4: Test combined filters
            // Add status filter for CRITICAL
            document.querySelector('.filter-btn[data-filter="all"]').classList.remove('active');
            document.querySelector('.filter-btn[data-filter="critical"]').classList.add('active');

            SearchFilter.applyFilters();

            // Only the critical venture_feed row should be visible
            expect(rows[0].style.display).not.toBe('none');
            expect(rows[1].style.display).toBe('none');
            expect(rows[2].style.display).toBe('none');

            // Step 5: Test search functionality
            SearchFilter.reset();
            const searchInput = document.getElementById('searchInput');
            searchInput.value = 'metricsevolved';
            const event = new dom.window.Event('input');
            searchInput.dispatchEvent(event);

            // Only the venture_metrics row should be visible
            expect(rows[0].style.display).toBe('none');
            expect(rows[1].style.display).not.toBe('none');
            expect(rows[2].style.display).toBe('none');
        });

        it('should update summary cards correctly', () => {
            const testData = [
                { event_id: 'test1', rad_type: 'venture_feed', status: 'CRITICAL', current: 0, baseline_period: 100, score: -100 },
                { event_id: 'test2', rad_type: 'venture_feed', status: 'CRITICAL', current: 0, baseline_period: 100, score: -100 },
                { event_id: 'test3', rad_type: 'venture_metrics', status: 'WARNING', current: 50, baseline_period: 100, score: -50 },
                { event_id: 'test4', rad_type: 'venture_feed', status: 'NORMAL', current: 90, baseline_period: 100, score: -10 },
                { event_id: 'test5', rad_type: 'venture_metrics', status: 'INCREASED', current: 150, baseline_period: 100, score: 50 }
            ];

            // Update table
            UIUpdater.updateDataTable(testData);

            // Calculate stats
            const stats = DataProcessor.getSummaryStats(testData);
            UIUpdater.updateSummaryCards(stats);

            // Verify summary cards
            expect(document.getElementById('criticalCount').textContent).toBe('2');
            expect(document.getElementById('warningCount').textContent).toBe('1');
            expect(document.getElementById('normalCount').textContent).toBe('1');
            expect(document.getElementById('increasedCount').textContent).toBe('1');

            // Verify all rows have proper RAD type attributes
            const rows = document.querySelectorAll('tbody tr');
            expect(rows[0].dataset.radType).toBe('venture_feed');
            expect(rows[1].dataset.radType).toBe('venture_feed');
            expect(rows[2].dataset.radType).toBe('venture_metrics');
        });
    });
});
