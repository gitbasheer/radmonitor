/**
 * JSDoc Type Definitions for RAD Monitor
 * Provides better IDE support and documentation
 */

/**
 * @typedef {Object} AuthStatus
 * @property {boolean} authenticated - Whether user is authenticated
 * @property {string} [method] - Authentication method used
 * @property {boolean} [temporary] - Whether auth is temporary
 * @property {string} [error] - Error message if any
 */

/**
 * @typedef {'critical'|'warning'|'normal'|'increased'} EventStatus
 */

/**
 * @typedef {Object} ProcessedEvent
 * @property {string} id - Event identifier
 * @property {string} name - Event name
 * @property {EventStatus} status - Event status
 * @property {number} score - Score percentage (-100 to 100)
 * @property {number} current - Current period count
 * @property {number} baseline - Expected count
 * @property {string} impact - Business impact description
 * @property {string} impact_class - CSS class for impact
 * @property {string} rad_type - RAD type identifier
 * @property {string} rad_display_name - RAD display name
 * @property {string} rad_color - RAD color hex code
 * @property {string} kibana_url - Kibana discovery URL
 */

/**
 * @typedef {Object} DashboardStats
 * @property {number} critical_count - Number of critical events
 * @property {number} warning_count - Number of warning events
 * @property {number} normal_count - Number of normal events
 * @property {number} increased_count - Number of increased events
 * @property {number} total_events - Total number of events
 * @property {string} last_update - ISO timestamp of last update
 */

/**
 * @typedef {Object} DashboardFilters
 * @property {string} status - Status filter ('all'|'critical'|'warning'|'normal'|'increased')
 * @property {string} search - Search query string
 * @property {string[]} radTypes - Selected RAD type filters
 */

/**
 * @typedef {Object} DashboardState
 * @property {ProcessedEvent[]} data - Array of events
 * @property {DashboardStats} stats - Statistics
 * @property {DashboardFilters} filters - Active filters
 * @property {boolean} loading - Loading state
 * @property {string|null} error - Error message if any
 * @property {string|null} lastUpdate - ISO timestamp
 * @property {string} [timeRange] - Time range setting
 */

/**
 * @typedef {Object} APIResponse
 * @property {boolean} success - Whether request succeeded
 * @property {any} [data] - Response data
 * @property {string} [error] - Error message
 * @property {any} [fallback] - Fallback data
 */

/**
 * @typedef {Object} DashboardQueryRequest
 * @property {string} time_range - Time range (e.g., 'now-12h')
 * @property {Object.<string, any>} filters - Query filters
 * @property {Object.<string, any>} options - Query options
 */

/**
 * @typedef {Object} DashboardQueryResponse
 * @property {ProcessedEvent[]} data - Processed events
 * @property {DashboardStats} stats - Statistics
 * @property {Object.<string, any>} metadata - Response metadata
 */

/**
 * @typedef {Object} ClientMetrics
 * @property {number} requests - Total requests made
 * @property {number} errors - Total errors encountered
 * @property {number} cacheHits - Cache hits
 * @property {number} cacheSize - Current cache size
 * @property {number} cacheHitRate - Cache hit rate percentage
 */

export default {};
