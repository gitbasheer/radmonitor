import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { SearchFilter } from '../assets/js/search-filter.js';

describe('SearchFilter RAD Type Filtering', () => {
    let dom;
    let document;

    beforeEach(() => {
        // Create DOM with test data
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <body>
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
                <table>
                    <tbody>
                        <tr data-rad-type="venture_feed">
                            <td>pandc.vnext.recommendations.feed.feed_test</td>
                            <td><span class="rad-type-badge">Venture Feed</span></td>
                            <td><span class="badge">critical</span></td>
                        </tr>
                        <tr data-rad-type="venture_metrics">
                            <td>pandc.vnext.recommendations.metricsevolved.root</td>
                            <td><span class="rad-type-badge">Venture Metrics</span></td>
                            <td><span class="badge">warning</span></td>
                        </tr>
                        <tr data-rad-type="unknown">
                            <td>some.other.event</td>
                            <td><span class="rad-type-badge">Unknown</span></td>
                            <td><span class="badge">normal</span></td>
                        </tr>
                    </tbody>
                </table>
            </body>
            </html>
        `);

        document = dom.window.document;
        global.document = document;
        global.window = dom.window;

        // Mock ConfigService
        global.ConfigService = {
            getConfig: () => ({
                rad_types: {
                    venture_feed: {
                        display_name: 'Venture Feed',
                        enabled: true
                    },
                    venture_metrics: {
                        display_name: 'Venture Metrics',
                        enabled: true
                    }
                }
            })
        };

        // Initialize SearchFilter
        SearchFilter.initialize();
    });

    describe('RAD Type Filtering', () => {
        it('should show all rows when ALL RAD type is selected', () => {
            SearchFilter.applyRadTypeFilter();

            const rows = document.querySelectorAll('tbody tr');
            let visibleCount = 0;
            rows.forEach(row => {
                if (row.style.display !== 'none') visibleCount++;
            });

            expect(visibleCount).toBe(3);
        });

        it('should filter by specific RAD type using data attribute', () => {
            // Deselect ALL and venture_metrics
            document.querySelector('.rad-filter-btn[data-rad-type="all"]').classList.remove('active');
            document.querySelector('.rad-filter-btn[data-rad-type="venture_metrics"]').classList.remove('active');

            SearchFilter.applyRadTypeFilter();

            const rows = document.querySelectorAll('tbody tr');
            const ventureFeeedRow = rows[0];
            const ventureMetricsRow = rows[1];
            const unknownRow = rows[2];

            expect(ventureFeeedRow.style.display).not.toBe('none');
            expect(ventureMetricsRow.style.display).toBe('none');
            expect(unknownRow.style.display).toBe('none');
        });

        it('should filter by multiple RAD types', () => {
            // Deselect ALL
            document.querySelector('.rad-filter-btn[data-rad-type="all"]').classList.remove('active');

            SearchFilter.applyRadTypeFilter();

            const rows = document.querySelectorAll('tbody tr');
            const ventureFeeedRow = rows[0];
            const ventureMetricsRow = rows[1];
            const unknownRow = rows[2];

            expect(ventureFeeedRow.style.display).not.toBe('none');
            expect(ventureMetricsRow.style.display).not.toBe('none');
            expect(unknownRow.style.display).toBe('none');
        });

        it('should combine RAD type filter with status filter', () => {
            // Set status filter to critical
            document.querySelector('.filter-btn[data-filter="all"]').classList.remove('active');
            document.querySelector('.filter-btn[data-filter="critical"]').classList.add('active');

            SearchFilter.applyFilters();

            const rows = document.querySelectorAll('tbody tr');
            let visibleCount = 0;
            rows.forEach(row => {
                if (row.style.display !== 'none') visibleCount++;
            });

            // Only the venture_feed row with critical status should be visible
            expect(visibleCount).toBe(1);
            expect(rows[0].style.display).not.toBe('none');
        });

        it('should combine RAD type filter with search', () => {
            const searchInput = document.getElementById('searchInput');
            searchInput.value = 'metricsevolved';

            // Trigger search
            const event = new dom.window.Event('input');
            searchInput.dispatchEvent(event);

            const rows = document.querySelectorAll('tbody tr');
            let visibleCount = 0;
            rows.forEach(row => {
                if (row.style.display !== 'none') visibleCount++;
            });

            // Only the venture_metrics row should be visible
            expect(visibleCount).toBe(1);
            expect(rows[1].style.display).not.toBe('none');
        });

        it('should update results info with RAD type information', () => {
            // Deselect ALL and venture_metrics
            document.querySelector('.rad-filter-btn[data-rad-type="all"]').classList.remove('active');
            document.querySelector('.rad-filter-btn[data-rad-type="venture_metrics"]').classList.remove('active');

            SearchFilter.applyRadTypeFilter();

            const resultsInfo = document.getElementById('resultsInfo');
            expect(resultsInfo.textContent).toContain('[Venture Feed]');
        });
    });

    describe('Edge Cases', () => {
        it('should handle rows without data-rad-type attribute', () => {
            // Add a row without data-rad-type
            const tbody = document.querySelector('tbody');
            const newRow = document.createElement('tr');
            newRow.innerHTML = '<td>No RAD type</td>';
            tbody.appendChild(newRow);

            SearchFilter.applyRadTypeFilter();

            // Row without rad type should be treated as 'unknown'
            expect(newRow.style.display).toBe('none');
        });

        it('should reset filters correctly', () => {
            // Apply some filters
            document.querySelector('.filter-btn[data-filter="all"]').classList.remove('active');
            document.querySelector('.filter-btn[data-filter="critical"]').classList.add('active');
            document.querySelector('.rad-filter-btn[data-rad-type="all"]').classList.remove('active');

            SearchFilter.reset();

            // All rows should be visible
            const rows = document.querySelectorAll('tbody tr');
            let visibleCount = 0;
            rows.forEach(row => {
                if (row.style.display !== 'none') visibleCount++;
            });

            expect(visibleCount).toBe(3);

            // Check button states
            expect(document.querySelector('.filter-btn[data-filter="all"]').classList.contains('active')).toBe(true);
            expect(document.querySelector('.rad-filter-btn[data-rad-type="all"]').classList.contains('active')).toBe(true);
        });
    });
});
