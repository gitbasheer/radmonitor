/**
 * Search and Filter functionality for RAD Monitor Dashboard
 * Handles event search and status filtering
 */

// Import dependencies
import { ConfigService } from './config-service.js';

// Module state
let currentFilter = 'all';
let currentSearchTerm = '';
let activeRadTypes = new Set(['all']);

/**
// Store event listeners for cleanup
let eventListeners = new Map();

/**
 * Initialize search and filter functionality
 */
export function initialize() {
    // Set up search input listener
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        const inputHandler = (event) => handleSearch(event);
        searchInput.addEventListener('input', inputHandler);
        searchInput.addEventListener('keyup', inputHandler);

        // Store for cleanup
        eventListeners.set(searchInput, [
            { event: 'input', handler: inputHandler },
            { event: 'keyup', handler: inputHandler }
        ]);
    }

    // Set up filter button listeners
    const filterButtons = document.querySelectorAll('.filter-btn:not(.rad-filter-btn)');
    filterButtons.forEach(button => {
        const clickHandler = (event) => handleFilterClick(event);
        button.addEventListener('click', clickHandler);

        // Store for cleanup
        if (!eventListeners.has(button)) {
            eventListeners.set(button, []);
        }
        eventListeners.get(button).push({ event: 'click', handler: clickHandler });
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
export function applyRadTypeFilter() {
    updateActiveRadTypes();
    applyFilters();
}

/**
 * Apply search and filter to table rows
 */
export function applyFilters() {
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
export function reset() {
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
export function refresh() {
    updateActiveRadTypes();
    applyFilters();
}

/**
 * Search results by term (for backward compatibility with tests)
 */
export function searchResults(results, searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
        return results;
    }

    const term = searchTerm.toLowerCase().trim();
    return results.filter(result => {
        const displayName = (result.displayName || '').toLowerCase();
        const eventId = (result.eventId || result.event_id || '').toLowerCase();
        return displayName.includes(term) || eventId.includes(term);
    });
}

/**
 * Filter results by status (for backward compatibility with tests)
 */
export function filterByStatus(results, status) {
    if (!status) {
        return results;
    }

    const targetStatus = status.toUpperCase();
    return results.filter(result => result.status === targetStatus);
}

/**
 * Filter results by threshold settings (for backward compatibility with tests)
 */
export function filterByThreshold(results, hideNormal, criticalOnly) {
    if (criticalOnly) {
        return results.filter(result => result.status === 'CRITICAL');
    }

    if (hideNormal) {
        return results.filter(result =>
            result.status === 'CRITICAL' || result.status === 'WARNING'
        );
    }

    return results;
}

/**
 * Apply all filters together (for backward compatibility with tests)
 */
export function applyAllFilters(results, filters = {}) {
    let filtered = results;

    // Apply search filter
    if (filters.searchTerm) {
        filtered = searchResults(filtered, filters.searchTerm);
    }

    // Apply status filter
    if (filters.statusFilter) {
        filtered = filterByStatus(filtered, filters.statusFilter);
    }

    // Apply threshold filters
    filtered = filterByThreshold(filtered, filters.hideNormal, filters.criticalOnly);

    return filtered;
}

/**
 * Save preferences to localStorage (for backward compatibility with tests)
 */
export function savePreferences(preferences) {
    try {
        localStorage.setItem('rad_monitor_preferences', JSON.stringify(preferences));
    } catch (error) {
        console.error('Failed to save preferences:', error);
    }
}

/**
 * Load preferences from localStorage (for backward compatibility with tests)
 */
export function loadPreferences() {
    try {
        const stored = localStorage.getItem('rad_monitor_preferences');
        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        console.error('Failed to load preferences:', error);
        return null;
    }
}

/**
 * Apply preferences to config (for backward compatibility with tests)
 */
export function applyPreferences(preferences) {
    if (!preferences) return;

    // Apply to global config if available
    if (typeof window !== 'undefined' && window.config) {
        Object.keys(preferences).forEach(key => {
            if (key in window.config) {
                window.config[key] = preferences[key];
            }
        });
    }
}

/**
 * Clean up all event listeners
 */
export function cleanup() {
    console.log('🧹 SearchFilter: Cleaning up event listeners...');

    // Remove all stored event listeners
    eventListeners.forEach((listeners, element) => {
        listeners.forEach(({ event, handler }) => {
            element.removeEventListener(event, handler);
        });
    });

    // Clear the listeners map
    eventListeners.clear();

    // Reset state
    currentFilter = 'all';
    currentSearchTerm = '';
    activeRadTypes.clear();
    activeRadTypes.add('all');

    console.log('✅ SearchFilter: All event listeners cleaned up');
}

/**
 * Config object for backward compatibility
 */
export const config = {
    criticalThreshold: -80,
    warningThreshold: -50,
    minDailyVolume: 100,
    searchTerm: '',
    hideNormal: false,
    criticalOnly: false,
    statusFilter: null
};

// Create default export object for backward compatibility
const SearchFilter = {
    initialize,
    reset,
    refresh,
    applyFilters,
    applyRadTypeFilter,
    searchResults,
    filterByStatus,
    filterByThreshold,
    applyAllFilters,
    savePreferences,
    loadPreferences,
    applyPreferences,
    cleanup,
    config
};

// Export as default
export default SearchFilter;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
