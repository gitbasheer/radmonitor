/**
 * Search and Filter functionality for RAD Monitor Dashboard
 * Handles event search and status filtering
 */

export const SearchFilter = (() => {
    'use strict';

    let currentFilter = 'all';
    let currentSearchTerm = '';
    let activeRadTypes = new Set(['all']);

    /**
     * Initialize search and filter functionality
     */
    function initialize() {
        // Set up search input listener
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', handleSearch);
            searchInput.addEventListener('keyup', handleSearch);
        }

        // Set up filter button listeners
        const filterButtons = document.querySelectorAll('.filter-btn:not(.rad-filter-btn)');
        filterButtons.forEach(button => {
            button.addEventListener('click', handleFilterClick);
        });

        // Initial state
        applyFilters();
    }

    /**
     * Handle search input changes
     */
    function handleSearch(event) {
        currentSearchTerm = event.target.value.toLowerCase().trim();
        applyFilters();
    }

    /**
     * Handle filter button clicks
     */
    function handleFilterClick(event) {
        // Update active button
        document.querySelectorAll('.filter-btn:not(.rad-filter-btn)').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');

        // Update current filter
        currentFilter = event.target.getAttribute('data-filter');
        applyFilters();
    }

    /**
     * Update active RAD types based on button states
     */
    function updateActiveRadTypes() {
        activeRadTypes.clear();

        const radButtons = document.querySelectorAll('.rad-filter-btn.active');
        radButtons.forEach(btn => {
            const radType = btn.dataset.radType;
            if (radType) {
                activeRadTypes.add(radType);
            }
        });

        // If "all" is active or no specific types selected, include all
        if (activeRadTypes.has('all') || activeRadTypes.size === 0) {
            activeRadTypes.add('all');
        }
    }

    /**
     * Apply RAD type filter (called from UI buttons)
     */
    function applyRadTypeFilter() {
        updateActiveRadTypes();
        applyFilters();
    }

    /**
     * Apply search and filter to table rows
     */
    function applyFilters() {
        const rows = document.querySelectorAll('table tbody tr');
        let visibleCount = 0;
        let hiddenCount = 0;

        rows.forEach(row => {
            let shouldShow = true;

            // Apply status filter
            if (currentFilter !== 'all') {
                const statusCell = row.querySelector('.badge');
                if (statusCell) {
                    const rowStatus = statusCell.textContent.toLowerCase();
                    shouldShow = rowStatus === currentFilter;
                } else {
                    shouldShow = false;
                }
            }

            // Apply RAD type filter
            if (shouldShow && !activeRadTypes.has('all')) {
                // Use the data attribute from the row for efficient filtering
                const rowRadType = row.dataset.radType || 'unknown';
                shouldShow = activeRadTypes.has(rowRadType);
            }

            // Apply search filter
            if (shouldShow && currentSearchTerm) {
                const eventIdCell = row.querySelector('td:first-child');
                const eventId = eventIdCell ? eventIdCell.textContent.toLowerCase() : '';
                shouldShow = eventId.includes(currentSearchTerm);
            }

            // Show/hide row
            if (shouldShow) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
                hiddenCount++;
            }
        });

        // Update results info
        updateResultsInfo(visibleCount, hiddenCount);
    }

    /**
     * Update results info display
     */
    function updateResultsInfo(visible, hidden) {
        const resultsInfo = document.getElementById('resultsInfo');
        if (resultsInfo) {
            const total = visible + hidden;
            let message = `Showing ${visible} of ${total} events`;

            if (currentSearchTerm) {
                message += ` matching "${currentSearchTerm}"`;
            }

            if (currentFilter !== 'all') {
                message += ` (${currentFilter} only)`;
            }

            if (!activeRadTypes.has('all') && activeRadTypes.size > 0) {
                const config = ConfigService.getConfig();
                const radTypeNames = Array.from(activeRadTypes)
                    .map(key => config.rad_types?.[key]?.display_name || key)
                    .join(', ');
                message += ` [${radTypeNames}]`;
            }

            resultsInfo.textContent = message;
        }
    }

    /**
     * Reset filters
     */
    function reset() {
        currentFilter = 'all';
        currentSearchTerm = '';
        activeRadTypes.clear();
        activeRadTypes.add('all');

        // Reset UI
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }

        // Reset status filter buttons
        document.querySelectorAll('.filter-btn:not(.rad-filter-btn)').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-filter') === 'all') {
                btn.classList.add('active');
            }
        });

        // Reset RAD type filter buttons
        document.querySelectorAll('.rad-filter-btn').forEach(btn => {
            btn.classList.add('active');
        });

        applyFilters();
    }

    /**
     * Refresh filters (call after table update)
     */
    function refresh() {
        updateActiveRadTypes();
        applyFilters();
    }

    // Public API
    return {
        initialize,
        reset,
        refresh,
        applyFilters,
        applyRadTypeFilter
    };
})();

// Export as default
export default SearchFilter;

// Make available globally
if (typeof window !== 'undefined') {
    window.SearchFilter = SearchFilter;

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', SearchFilter.initialize);
    } else {
        SearchFilter.initialize();
    }
}
