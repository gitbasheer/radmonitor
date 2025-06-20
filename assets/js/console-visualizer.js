/**
 * Console Visualizer for RAD Monitor Dashboard
 * Provides visual console output for monitoring and debugging
 */

// ESM: Converted from IIFE to ES module export
export const ConsoleVisualizer = (() => {
    'use strict';

    /**
     * Show welcome message in console
     */
    function showWelcomeMessage() {
        console.clear();
        console.log('%cRAD Monitor Console Dashboard', 'color: #00ff41; font-size: 16px; font-weight: bold;');
        console.log('%c' + '='.repeat(50), 'color: #00ff41;');
        console.log('%cConsole visualization enabled!', 'color: #ff6b35; font-size: 14px; font-weight: bold;');
        console.log('%cYou\'ll see ASCII bar charts here every time data refreshes', 'color: #4ecdc4;');
        console.log('');
        console.log('%cFeatures:', 'color: #ffe66d; font-weight: bold;');
        console.log('%c- Live ASCII bar charts for data fetches', 'color: #a8e6cf;');
        console.log('%c- Time window info (now-6h, -3h-6h, etc.)', 'color: #a8e6cf;');
        console.log('%c- Current vs expected traffic comparison', 'color: #a8e6cf;');
        console.log('%c- Status indicators', 'color: #a8e6cf;');
        console.log('%c- Performance metrics (query time, cache rate)', 'color: #a8e6cf;');
        console.log('%c- CORS proxy health monitoring', 'color: #a8e6cf;');
        console.log('');
        console.log('%cPerformance Commands:', 'color: #ff6b35; font-weight: bold;');
        console.log('%c- Dashboard.showPerformanceStats() - View detailed metrics', 'color: #4ecdc4;');
        console.log('%c- DataLayer.getPerformanceMetrics() - Get raw metrics', 'color: #4ecdc4;');
        console.log('%c- DataLayer.resetPerformanceMetrics() - Clear metrics', 'color: #4ecdc4;');
        console.log('');
        console.log('%cTry custom time ranges:', 'color: #ff6b35; font-weight: bold;');
        console.log('%c- -3h-6h (3 hours ago to 6 hours ago)', 'color: #4ecdc4;');
        console.log('%c- -1h-4h (1 hour ago to 4 hours ago)', 'color: #4ecdc4;');
        console.log('%c- -2h-1d (2 hours ago to 1 day ago)', 'color: #4ecdc4;');
        console.log('');
        console.log('%cLive data coming up...', 'color: #00ff41; font-size: 14px; font-weight: bold;');
        console.log('%c' + '='.repeat(50), 'color: #00ff41;');
    }

    /**
     * Create ASCII bar
     */
    function createBar(value, maxValue, width, char) {
        if (maxValue === 0) return '░'.repeat(width);
        const barLength = Math.round((value / maxValue) * width);
        const bar = char.repeat(barLength);
        const empty = '░'.repeat(width - barLength);
        return bar + empty;
    }

    /**
     * Get status icon
     */
    function getStatusIcon(status) {
        switch (status) {
            case 'CRITICAL': return '[CRIT]';
            case 'WARNING': return '[WARN]';
            case 'INCREASED': return '[HIGH]';
            case 'NORMAL':
            default: return '[NORM]';
        }
    }

    /**
     * Visualize data in console
     */
    function visualizeData(data, timeRange, config) {
        try {
            const buckets = data.aggregations.events.buckets;
            const results = DataProcessor.processData(buckets, config);

            const parsedTime = TimeRangeUtils.parseTimeRange(timeRange);

            // Create the header with solid colors
            console.log('\n%cRAD MONITOR - CONSOLE DASHBOARD', 'color: #00ff41; font-size: 16px; font-weight: bold;');
            console.log('%c' + '='.repeat(80), 'color: #00ff41;');

            // Show time range info
            if (parsedTime.type === 'custom') {
                console.log(`%cTIME WINDOW: ${parsedTime.gte} → ${parsedTime.lte} (${parsedTime.hours}h window)`, 'color: #4ecdc4; font-weight: bold;');
            } else {
                console.log(`%cTIME WINDOW: ${parsedTime.gte} (${parsedTime.hours}h window)`, 'color: #4ecdc4; font-weight: bold;');
            }

            console.log('%c' + '-'.repeat(80), 'color: #00ff41;');

            // Get top 20 results for visualization
            const topResults = results.slice(0, 20);
            const maxCurrent = Math.max(...topResults.map(r => r.current));
            const maxBaseline = Math.max(...topResults.map(r => r.baseline12h));
            const maxValue = Math.max(maxCurrent, maxBaseline);

            console.log('%cTRAFFIC VISUALIZATION (Current vs Expected)', 'color: #ff6b35; font-size: 14px; font-weight: bold;');
            console.log('');

            topResults.forEach((result, index) => {
                const eventName = result.displayName.length > 25
                    ? result.displayName.substring(0, 22) + '...'
                    : result.displayName.padEnd(25);

                // Create bars with different characters for better visibility
                const currentBar = createBar(result.current, maxValue, 30, '█');
                const baselineBar = createBar(result.baseline12h, maxValue, 30, '░');

                // Status color based on status
                let statusColor, statusIcon;
                switch (result.status) {
                    case 'CRITICAL':
                        statusColor = '#ff0000';
                        statusIcon = '[CRIT]';
                        break;
                    case 'WARNING':
                        statusColor = '#ffaa00';
                        statusIcon = '[WARN]';
                        break;
                    case 'INCREASED':
                        statusColor = '#0099ff';
                        statusIcon = '[HIGH]';
                        break;
                    default:
                        statusColor = '#00ff00';
                        statusIcon = '[NORM]';
                }

                // Score text with appropriate color
                const scoreText = `${result.score > 0 ? '+' : ''}${result.score}%`.padStart(6);
                const scoreColor = result.score < -50 ? '#ff0000' : result.score < 0 ? '#ffaa00' : '#00ff00';

                // Print the visualization
                console.log(`%c${statusIcon} ${eventName} %c${scoreText}`,
                    `color: ${statusColor}; font-weight: bold;`,
                    `color: ${scoreColor}; font-weight: bold;`
                );

                // Current bar (solid color based on status)
                console.log(`   %cCurrent  %c${currentBar} %c${result.current.toLocaleString()}`,
                    'color: #a8e6cf;',
                    `color: ${result.status === 'CRITICAL' ? '#ff6666' : result.status === 'WARNING' ? '#ffcc66' : '#66ff66'};`,
                    'color: #ffffff;'
                );

                // Expected/baseline bar (always gray)
                console.log(`   %cExpected %c${baselineBar} %c${result.baseline12h.toLocaleString()}`,
                    'color: #a8e6cf;',
                    'color: #888888;',
                    'color: #cccccc;'
                );

                console.log('');
            });

            // Summary stats with colors
            const critical = results.filter(r => r.status === 'CRITICAL').length;
            const warning = results.filter(r => r.status === 'WARNING').length;
            const normal = results.filter(r => r.status === 'NORMAL').length;
            const increased = results.filter(r => r.status === 'INCREASED').length;

            console.log('%c' + '-'.repeat(80), 'color: #00ff41;');
            console.log(
                '%cSUMMARY: %c' + critical + ' Critical %c| %c' + warning + ' Warning %c| %c' + normal + ' Normal %c| %c' + increased + ' Increased',
                'color: #ffe66d; font-weight: bold;',
                'color: #ff0000; font-weight: bold;',
                'color: #666666;',
                'color: #ffaa00; font-weight: bold;',
                'color: #666666;',
                'color: #00ff00; font-weight: bold;',
                'color: #666666;',
                'color: #0099ff; font-weight: bold;'
            );

            // Add performance metrics
            if (typeof DataLayer !== 'undefined') {
                const metrics = DataLayer.getPerformanceMetrics();
                console.log('%c' + '-'.repeat(80), 'color: #00ff41;');
                console.log('%cPERFORMANCE METRICS:', 'color: #ffe66d; font-weight: bold;');

                // Query performance
                const avgColor = metrics.averageQueryDuration > 3000 ? '#ff0000' :
                               metrics.averageQueryDuration > 1000 ? '#ffaa00' : '#00ff00';
                console.log(
                    `  %cAvg Query Time: %c${metrics.averageQueryDuration}ms %c| Cache Hit Rate: %c${metrics.cacheHitRate}%`,
                    'color: #a8e6cf;',
                    `color: ${avgColor}; font-weight: bold;`,
                    'color: #a8e6cf;',
                    `color: ${metrics.cacheHitRate > 70 ? '#00ff00' : metrics.cacheHitRate > 50 ? '#ffaa00' : '#ff0000'}; font-weight: bold;`
                );

                // Reliability metrics
                const totalQueries = metrics.cacheHits + metrics.cacheMisses + metrics.failedQueries;
                const reliability = totalQueries > 0 ? Math.round(((totalQueries - metrics.failedQueries) / totalQueries) * 100) : 100;
                console.log(
                    `  %cReliability: %c${reliability}% %c| Failed Queries: %c${metrics.failedQueries}`,
                    'color: #a8e6cf;',
                    `color: ${reliability === 100 ? '#00ff00' : reliability > 90 ? '#ffaa00' : '#ff0000'}; font-weight: bold;`,
                    'color: #a8e6cf;',
                    `color: ${metrics.failedQueries === 0 ? '#00ff00' : metrics.failedQueries < 3 ? '#ffaa00' : '#ff0000'}; font-weight: bold;`
                );

                // CORS proxy status (for localhost)
                if (window.location.hostname === 'localhost') {
                    const proxyColor = metrics.corsProxyStatus === 'running' ? '#00ff00' :
                                     metrics.corsProxyStatus === 'not_running' ? '#ff0000' : '#ffaa00';
                    console.log(
                        `  %cCORS Proxy: %c${metrics.corsProxyStatus}`,
                        'color: #a8e6cf;',
                        `color: ${proxyColor}; font-weight: bold;`
                    );
                }
            }

            console.log(`%cFETCH TIME: ${new Date().toLocaleString()}`, 'color: #4ecdc4;');
            console.log('%c' + '='.repeat(80), 'color: #00ff41;');
        } catch (error) {
            console.log('Console visualization failed:', error.message);
        }
    }

    // Public API
    return {
        showWelcomeMessage,
        visualizeData,
        createBar,
        getStatusIcon
    };
})();

// ESM: Export as default for convenience
export default ConsoleVisualizer;
