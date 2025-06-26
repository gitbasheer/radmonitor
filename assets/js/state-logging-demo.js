/**
 * State Logging Demo
 * Shows how Redux-style logging works in DataLayer
 */

// ESM: Import dependencies
// DataLayer and Dashboard are available globally when needed

// ESM: Converted from IIFE to ES module export
export const StateLoggingDemo = (() => {
    'use strict';

    function demo() {
        // Demo is disabled by default - too much console noise
        if (window.ENABLE_STATE_DEMO !== true) {
            return;
        }
        
        // Check if demo was already run
        if (window._stateLoggingDemoRan) {
            console.log('%c⚠️ State logging demo already ran', 'color: #ffaa00;');
            return;
        }
        window._stateLoggingDemoRan = true;

        console.log('%c🎬 State Logging Demo', 'color: #FF6B6B; font-size: 16px; font-weight: bold;');
        console.log('');

        // Show a sample action log
        console.log('%cSample Output (what you\'ll see):', 'color: #666; font-weight: bold;');
        console.log('');

        // Simulate what the logs look like
        const timestamp = new Date().toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        });

        // Sample action header
        console.log(
            `%c action %cDASHBOARD_REFRESH_START %c@ ${timestamp}`,
            'color: #666; font-weight: normal;',
            'color: #03A9F4; font-weight: bold;',
            'color: #666666; font-weight: normal;'
        );

        // Sample state groups
        console.group('%c prev state', 'color: #9E9E9E;');
        console.log({
            activeQueries: { size: 0 },
            responseCache: { size: 5 },
            parsedCache: { size: 5 }
        });
        console.groupEnd();

        console.group('%c action    ', 'color: #4CAF50;');
        console.log({
            type: 'DASHBOARD_REFRESH_START',
            refreshId: 'refresh_1734567890123',
            timestamp: new Date().toISOString()
        });
        console.groupEnd();

        console.group('%c next state', 'color: #FF6B6B;');
        console.log({
            activeQueries: { size: 1, executing: ['main_traffic_refresh_1734567890123'] },
            responseCache: { size: 5 },
            parsedCache: { size: 5 }
        });
        console.groupEnd();

        console.log('');
        console.log('%c⬆️ This is what you\'ll see for every state action!', 'color: #4CAF50; font-style: italic;');
        console.log('');

        // Show available actions
        console.log('%c📋 Available Actions:', 'color: #FF6B6B; font-weight: bold;');
        console.log(`
• DASHBOARD_INIT_START / DASHBOARD_INIT_COMPLETE
• DASHBOARD_REFRESH_START / DASHBOARD_REFRESH_COMPLETE / DASHBOARD_REFRESH_ERROR
• FETCH_AND_PARSE_START / FETCH_AND_PARSE_COMPLETE / FETCH_AND_PARSE_ERROR
• QUERY_BUILD_COMPLETE
• QUERY_EXECUTE_START / QUERY_EXECUTE_SUCCESS / QUERY_EXECUTE_ERROR
• QUERY_CACHE_HIT
• RESPONSE_PARSE_START / RESPONSE_PARSE_COMPLETE
• DATA_TRANSFORM_START / DATA_TRANSFORM_COMPLETE
• PARSED_DATA_CACHED
• ADD_EVENT_LISTENER / REMOVE_EVENT_LISTENER
• EVENT_EMIT_STATECHANGE / EVENT_EMIT_SEARCHCOMPLETE / EVENT_EMIT_ERROR
• UPDATE_APP_CONFIG
• CLEAR_CACHE
        `);

        // Show how to use it
        console.log('%c🛠️ How to Use:', 'color: #4CAF50; font-weight: bold;');
        console.log(`
// Control logging:
DataLayer.configureLogging({
    enabled: true,      // Turn on/off
    collapsed: false    // Expand/collapse state details
});

// Custom logging:
DataLayer.logAction('MY_CUSTOM_ACTION', {
    data: 'anything',
    timestamp: Date.now()
});

// Test it:
Dashboard.refresh();  // Watch the action flow!
        `);
    }

    return {
        demo
    };
})();

// ESM: Export as default for convenience
export default StateLoggingDemo;

// Make demo available globally but don't auto-run
if (typeof window !== 'undefined') {
    window.StateLoggingDemo = StateLoggingDemo;
}
