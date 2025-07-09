/**
 * Data Layer for Elasticsearch Operations
 * Clean abstractions for query building, response parsing, and data transformation
 */

// ESM: Import dependencies
import TimeRangeUtils from './time-range-utils.js';
import DataProcessor from './data-processor.js';
import UIUpdater from './ui-updater.js';
// Use unified API client instead of legacy client
import { ConfigService } from './config-service.js';
import { unifiedAPI } from './api-interface.js';

// ESM: Converted from IIFE to ES module export
export const DataLayer = (() => {
    'use strict';

    // State for tracking queries and responses
    const queryState = {
        activeQueries: new Map(),
        responseCache: new Map(),
        parsedCache: new Map(),
        lastProcessedResults: null
    };

    // Performance metrics state
    const performanceMetrics = {
        queryDurations: [], // Rolling array of last N query durations
        maxQueryHistory: 100, // Keep last 100 queries
        slowestQueryLastHour: null,
        cacheHits: 0,
        cacheMisses: 0,
        failedQueries: 0,
        lastCorsHealthCheck: null,
        corsProxyStatus: 'unknown'
    };

    // Event listeners
    const listeners = {
        stateChange: [],
        searchComplete: [],
        error: [],
        actionTriggered: []
    };

    // State logging configuration - start with reduced verbosity
    const stateLogging = {
        enabled: true,
        collapsed: true,  // Start with collapsed logs to reduce console noise
        verbosity: 'normal', // 'quiet', 'normal', 'verbose'
        colors: {
            action: '#03A9F4',
            prevState: '#9E9E9E',
            actionDetails: '#4CAF50',
            nextState: '#FF6B6B',
            error: '#F44336',
            time: '#666666'
        }
    };

    // Define which actions to show at each verbosity level
    const actionVerbosity = {
        quiet: [
            'DASHBOARD_INIT_START',
            'DASHBOARD_INIT_COMPLETE',
            'DASHBOARD_REFRESH_START',
            'DASHBOARD_REFRESH_COMPLETE',
            'DASHBOARD_REFRESH_ERROR',
            'QUERY_EXECUTE_SUCCESS',
            'QUERY_EXECUTE_ERROR',
            'PERFORMANCE_WARNING'
        ],
        normal: [
            'DASHBOARD_INIT_START',
            'DASHBOARD_INIT_COMPLETE',
            'DASHBOARD_REFRESH_START',
            'DASHBOARD_REFRESH_COMPLETE',
            'DASHBOARD_REFRESH_ERROR',
            'FETCH_AND_PARSE_START',
            'FETCH_AND_PARSE_COMPLETE',
            'FETCH_AND_PARSE_ERROR',
            'QUERY_EXECUTE_START',
            'QUERY_EXECUTE_SUCCESS',
            'QUERY_EXECUTE_ERROR',
            'PERFORMANCE_WARNING',
            'CLEAR_CACHE'
        ],
        verbose: null // Show all actions
    };

    // =======================
    // QUERY BUILDING
    // =======================

    const QueryBuilder = {
        // Base query structure
        base() {
            return {
                size: 0,
                query: { bool: { filter: [] } },
                aggs: {}
            };
        },

        // Add time range filter
        timeRange(query, field, start, end) {
            query.query.bool.filter.push({
                range: {
                    [field]: { gte: start, lte: end }
                }
            });
            return query;
        },

        // Add term filter
        term(query, field, value) {
            // Create proper term filter structure
            const termFilter = {};
            termFilter[field] = value;

            query.query.bool.filter.push({
                term: termFilter
            });
            return query;
        },

                // Add match_phrase filter
        matchPhrase(query, field, value) {
            // Create proper match_phrase filter structure
            const matchFilter = {};
            matchFilter[field] = value;

            query.query.bool.filter.push({
                match_phrase: matchFilter
            });
            return query;
        },

        // Add wildcard filter
        wildcard(query, field, pattern) {
            // Create proper wildcard filter structure
            const wildcardFilter = {};
            wildcardFilter[field] = { value: pattern };

            query.query.bool.filter.push({
                wildcard: wildcardFilter
            });
            return query;
        },

                // Add multiple wildcard filters with OR logic
        multiWildcard(query, field, patterns) {
            const shouldClauses = patterns.map(pattern => {
                const wildcardFilter = {};
                wildcardFilter[field] = { value: pattern };
                return { wildcard: wildcardFilter };
            });

            query.query.bool.filter.push({
                bool: {
                    should: shouldClauses,
                    minimum_should_match: 1
                }
            });
            return query;
        },

        // Add terms aggregation
        termsAgg(query, name, field, size = 500) {
            query.aggs[name] = {
                terms: {
                    field: field,
                    size: size,
                    order: { _key: 'asc' }
                }
            };
            return query;
        },

        // Add date histogram aggregation
        dateHistogram(query, name, field, interval) {
            query.aggs[name] = {
                date_histogram: {
                    field: field,
                    calendar_interval: interval,
                    min_doc_count: 0
                }
            };
            return query;
        },

        // Add filter aggregation
        filterAgg(query, name, filter) {
            query.aggs[name] = {
                filter: filter
            };
            return query;
        },

        // Add sub-aggregation to existing aggregation
        addSubAgg(query, parentAggName, subAggName, subAgg) {
            if (!query.aggs[parentAggName]) {
                throw new Error(`Parent aggregation '${parentAggName}' not found`);
            }
            if (!query.aggs[parentAggName].aggs) {
                query.aggs[parentAggName].aggs = {};
            }
            query.aggs[parentAggName].aggs[subAggName] = subAgg;
            return query;
        }
    };

    // =======================
    // QUERY COMPOSITIONS
    // =======================

    const QueryTemplates = {
        // Traffic analysis query
        trafficAnalysis(config) {
            // Build query structure manually to ensure correctness
            const queryConfig = ConfigService.getConfig();
            const eventField = 'detail.event.data.traffic.eid.keyword';
            const hostFilter = 'dashboard.godaddy.com';
            const minEventDate = queryConfig.minEventDate || '2025-05-19T04:00:00.000Z';

            // Get RAD types configuration
            const radTypes = queryConfig.rad_types || {};
            let enabledPatterns = [];

            // Collect enabled RAD patterns with validation
            for (const [radKey, radConfig] of Object.entries(radTypes)) {
                if (radConfig.enabled && radConfig.pattern && radConfig.pattern.trim().length > 0) {
                    enabledPatterns.push(radConfig.pattern.trim());
                }
            }

            // Fallback to default pattern if no valid RAD patterns found
            if (enabledPatterns.length === 0) {
                const defaultPattern = queryConfig.queryEventPattern || 'pandc.vnext.recommendations.feed.feed*';
                enabledPatterns = [defaultPattern];
                console.log('📡 Using default pattern:', defaultPattern);
            }

            console.log('📡 DataLayer query patterns:', enabledPatterns);

            // Build query manually to ensure correct structure
            const query = {
                size: 0,
                query: {
                    bool: {
                        filter: [
                            {
                                range: {
                                    "@timestamp": {
                                        gte: minEventDate,
                                        lte: "now"
                                    }
                                }
                            },
                            {
                                match_phrase: {
                                    "detail.global.page.host": hostFilter
                                }
                            }
                        ]
                    }
                },
                aggs: {
                    events: {
                        terms: {
                            field: eventField,
                            size: 500,
                            order: { _key: 'asc' }
                        },
                        aggs: {
                            baseline: {
                                filter: {
                                    range: {
                                        "@timestamp": {
                                            gte: config.baselineStart,
                                            lt: config.baselineEnd
                                        }
                                    }
                                }
                            },
                            current: {
                                filter: {
                                    range: {
                                        "@timestamp": TimeRangeUtils.parseTimeRangeToFilter(config.currentTimeRange)
                                    }
                                }
                            }
                        }
                    }
                }
            };

            // Add pattern filter
            if (enabledPatterns.length === 1) {
                // Single pattern
                query.query.bool.filter.push({
                    wildcard: {
                        [eventField]: {
                            value: enabledPatterns[0]
                        }
                    }
                });
            } else {
                // Multiple patterns
                const shouldClauses = enabledPatterns.map(pattern => ({
                    wildcard: {
                        [eventField]: {
                            value: pattern
                        }
                    }
                }));

                query.query.bool.filter.push({
                    bool: {
                        should: shouldClauses,
                        minimum_should_match: 1
                    }
                });
            }

            // Debug: Log the query structure before returning
            console.log('📡 Generated query structure:', JSON.stringify(query, null, 2));

            // Add main aggregation
            QueryBuilder.termsAgg(query, 'events', eventField);

            // Add sub-aggregations for baseline and current
            QueryBuilder.addSubAgg(query, 'events', 'baseline', {
                filter: {
                    range: {
                        '@timestamp': {
                            gte: config.baselineStart,
                            lt: config.baselineEnd
                        }
                    }
                }
            });

            // Handle current time range - including inspection_time
            const currentTimeFilter = TimeRangeUtils.parseTimeRangeToFilter(config.currentTimeRange);
            QueryBuilder.addSubAgg(query, 'events', 'current', {
                filter: {
                    range: {
                        '@timestamp': currentTimeFilter
                    }
                }
            });

            return query;
        },

        // Time series analysis
        timeSeries(config) {
            const query = QueryBuilder.base();

            QueryBuilder.timeRange(query, '@timestamp', config.startTime, config.endTime);
            QueryBuilder.dateHistogram(query, 'timeline', '@timestamp', config.interval || '1h');

            if (config.groupBy) {
                QueryBuilder.addSubAgg(query, 'timeline', 'groups', {
                    terms: {
                        field: config.groupBy,
                        size: config.groupSize || 10
                    }
                });
            }

            return query;
        },

        // Error analysis
        errorAnalysis(config) {
            const query = QueryBuilder.base();

            QueryBuilder.timeRange(query, '@timestamp', config.startTime, config.endTime);
            QueryBuilder.termsAgg(query, 'error_types', 'error.type.keyword');
            QueryBuilder.termsAgg(query, 'error_codes', 'response.status_code');

            return query;
        },

        // Health check (simple test query)
        health(config = {}) {
            const query = QueryBuilder.base();
            query.size = 1; // Just need to test connection
            QueryBuilder.timeRange(query, '@timestamp', 'now-1h', 'now');
            return query;
        }
    };

    // =======================
    // RESPONSE PARSING
    // =======================

    const ResponseParser = {
        // Parse aggregation response
        parseAggregations(response) {
            if (!response.aggregations) {
                return null;
            }

            const parsed = {};
            for (const [name, agg] of Object.entries(response.aggregations)) {
                parsed[name] = this.parseAggregation(agg);
            }
            return parsed;
        },

        // Parse single aggregation
        parseAggregation(agg) {
            // Terms aggregation
            if (agg.buckets && Array.isArray(agg.buckets)) {
                return {
                    type: 'terms',
                    buckets: agg.buckets.map(bucket => ({
                        key: bucket.key,
                        doc_count: bucket.doc_count,
                        sub_aggs: this.parseSubAggregations(bucket)
                    }))
                };
            }

            // Date histogram aggregation
            if (agg.buckets && agg.buckets.length > 0 && agg.buckets[0].key_as_string) {
                return {
                    type: 'date_histogram',
                    buckets: agg.buckets.map(bucket => ({
                        key: bucket.key,
                        timestamp: bucket.key_as_string,
                        doc_count: bucket.doc_count,
                        sub_aggs: this.parseSubAggregations(bucket)
                    }))
                };
            }

            // Filter aggregation
            if (agg.doc_count !== undefined) {
                return {
                    type: 'filter',
                    doc_count: agg.doc_count,
                    sub_aggs: this.parseSubAggregations(agg)
                };
            }

            // Generic aggregation
            return {
                type: 'generic',
                data: agg
            };
        },

        // Parse sub-aggregations within buckets
        parseSubAggregations(bucket) {
            const subAggs = {};
            for (const [key, value] of Object.entries(bucket)) {
                if (key !== 'key' && key !== 'doc_count' && key !== 'key_as_string') {
                    subAggs[key] = this.parseAggregation(value);
                }
            }
            return Object.keys(subAggs).length > 0 ? subAggs : null;
        },

        // Parse hits response
        parseHits(response) {
            if (!response.hits || !response.hits.hits) {
                return [];
            }

            return response.hits.hits.map(hit => ({
                id: hit._id,
                source: hit._source,
                score: hit._score,
                index: hit._index
            }));
        },

        // Parse errors
        parseError(response) {
            if (response.error) {
                return {
                    type: response.error.type,
                    reason: response.error.reason,
                    details: response.error.root_cause || []
                };
            }
            return null;
        }
    };

    // =======================
    // DATA TRANSFORMATION
    // =======================

    const DataTransformer = {
        // Flatten nested aggregations into time series
        toTimeSeries(parsedAggs, config = {}) {
            const series = [];

            for (const [aggName, agg] of Object.entries(parsedAggs)) {
                if (agg.type === 'date_histogram') {
                    const timeSeries = {
                        name: aggName,
                        data: agg.buckets.map(bucket => ({
                            timestamp: bucket.timestamp,
                            value: bucket.doc_count,
                            sub_metrics: this.extractSubMetrics(bucket.sub_aggs)
                        }))
                    };
                    series.push(timeSeries);
                }
            }

            return series;
        },

        // Extract metrics from bucket aggregations
        extractMetrics(parsedAggs) {
            const metrics = {};

            for (const [aggName, agg] of Object.entries(parsedAggs)) {
                if (agg.type === 'terms') {
                    metrics[aggName] = agg.buckets.map(bucket => ({
                        key: bucket.key,
                        value: bucket.doc_count,
                        metrics: this.extractSubMetrics(bucket.sub_aggs)
                    }));
                }
            }

            return metrics;
        },

        // Extract sub-metrics from nested aggregations
        extractSubMetrics(subAggs) {
            if (!subAggs) return {};

            const metrics = {};
            for (const [name, agg] of Object.entries(subAggs)) {
                if (agg.type === 'filter') {
                    metrics[name] = agg.doc_count;
                } else if (agg.type === 'terms') {
                    metrics[name] = agg.buckets.reduce((sum, bucket) => sum + bucket.doc_count, 0);
                }
            }

            return metrics;
        },

        // Transform traffic data (specific to your use case)
        transformTrafficData(parsedAggs, config) {
            const eventsAgg = parsedAggs.events;
            if (!eventsAgg || eventsAgg.type !== 'terms') {
                return [];
            }

            // Create raw buckets array for compatibility with DataProcessor
            const rawBuckets = eventsAgg.buckets.map(bucket => ({
                key: bucket.key,
                doc_count: bucket.doc_count,
                baseline: { doc_count: bucket.sub_aggs?.baseline?.doc_count || 0 },
                current: { doc_count: bucket.sub_aggs?.current?.doc_count || 0 }
            }));

            // Use existing DataProcessor for consistency
            // The global DataProcessor will be mocked in the test environment
            if (typeof DataProcessor !== 'undefined' && DataProcessor.processData) {
                // Ensure the rad_types from the config are passed to the processor
                const processingConfig = {
                    ...config,
                    rad_types: config.rad_types || ConfigService.getConfig().rad_types
                };
                return DataProcessor.processData(rawBuckets, processingConfig);
            }

            // Fallback processing if DataProcessor not available
            return rawBuckets.map(bucket => {
                const baseline = bucket.baseline.doc_count;
                const current = bucket.current.doc_count;

                // Calculate baseline period (8-day period to current hours)
                const baselineStart = new Date(config.baselineStart);
                const baselineEnd = new Date(config.baselineEnd);
                const baselineDays = Math.ceil((baselineEnd - baselineStart) / (1000 * 60 * 60 * 24));

                // Parse current time range hours
                const currentHours = TimeRangeUtils.parseTimeRange(config.currentTimeRange).hours || 12;
                const baseline_period = (baseline / baselineDays / 24 * currentHours);
                const daily_avg = baseline / baselineDays;

                // Skip low volume events
                if (daily_avg < config.mediumVolumeThreshold) return null;

                // Calculate score (simplified version)
                let score = 0;
                if (baseline_period > 0) {
                    const ratio = current / baseline_period;
                    if (daily_avg >= config.highVolumeThreshold) {
                        score = ratio < 0.5 ? Math.round((1 - ratio) * -100) : Math.round((ratio - 1) * 100);
                    } else {
                        score = ratio < 0.3 ? Math.round((1 - ratio) * -100) : Math.round((ratio - 1) * 100);
                    }
                }

                // Determine status
                let status = 'NORMAL';
                if (score <= -80) status = 'CRITICAL';
                else if (score <= -50) status = 'WARNING';
                else if (score > 0) status = 'INCREASED';

                // Determine RAD type using the mocked DataProcessor in tests
                const radTypesConfig = config.rad_types || ConfigService.getConfig().rad_types;
                const radType = (typeof DataProcessor !== 'undefined' && DataProcessor.determineRadType)
                    ? DataProcessor.determineRadType(bucket.key, radTypesConfig)
                    : 'unknown';

                return {
                    event_id: bucket.key,
                    displayName: bucket.key.replace('pandc.vnext.recommendations.feed.', ''),
                    current: current,
                    baseline12h: Math.round(baseline_period),
                    baseline_period: Math.round(baseline_period),
                    baseline_count: baseline,
                    score,
                    status,
                    dailyAvg: Math.round(daily_avg),
                    rad_type: radType
                };
            }).filter(item => item !== null);
        }
    };

    // =======================
    // QUERY EXECUTION & CACHING
    // =======================

    const QueryExecutor = {
        // Execute query with caching
        async execute(queryId, query, options = {}) {
            const cacheKey = this.getCacheKey(queryId, query);

            // Check cache first
            if (!options.forceRefresh && queryState.responseCache.has(cacheKey)) {
                const cached = queryState.responseCache.get(cacheKey);
                if (Date.now() - cached.timestamp < (options.cacheTimeout || 300000)) {
                    performanceMetrics.cacheHits++;
                    logAction('QUERY_CACHE_HIT', { queryId, cacheKey });
                    return cached.data;
                }
            }

            // Cache miss
            performanceMetrics.cacheMisses++;

            // Track active query with meaningful details
            const queryDetails = this.extractQueryDetails(query);
            logAction('QUERY_EXECUTE_START', {
                queryId,
                queryType: queryDetails.type,
                timeRange: queryDetails.timeRange,
                filters: queryDetails.filters,
                aggregations: queryDetails.aggregations
            });

            queryState.activeQueries.set(queryId, {
                query,
                startTime: Date.now(),
                status: 'executing'
            });

            try {
                // Execute query (integrate with your existing ApiClient)
                const response = await this.sendQuery(query);

                const duration = Date.now() - queryState.activeQueries.get(queryId).startTime;

                // Track performance metrics
                performanceMetrics.queryDurations.push({
                    queryId,
                    duration,
                    timestamp: Date.now(),
                    queryType: query.aggs ? Object.keys(query.aggs)[0] : 'unknown'
                });

                // Keep only last N queries
                if (performanceMetrics.queryDurations.length > performanceMetrics.maxQueryHistory) {
                    performanceMetrics.queryDurations.shift();
                }

                // Update slowest query in last hour
                const oneHourAgo = Date.now() - 3600000;
                const recentQueries = performanceMetrics.queryDurations.filter(q => q.timestamp > oneHourAgo);
                if (recentQueries.length > 0) {
                    performanceMetrics.slowestQueryLastHour = recentQueries.reduce((slowest, current) =>
                        current.duration > slowest.duration ? current : slowest
                    );
                }

                // Log performance warning if query took too long
                if (duration > 5000) {
                    logAction('PERFORMANCE_WARNING', {
                        queryId,
                        duration,
                        queryType: query.aggs ? Object.keys(query.aggs)[0] : 'unknown',
                        message: `Query exceeded 5 seconds (${duration}ms)`
                    });
                }

                // Log successful response with meaningful data
                const processedResults = this.extractResultSummary(response, queryDetails);
                logAction('QUERY_EXECUTE_SUCCESS', {
                    queryId,
                    duration,
                    hits: processedResults.hits,
                    buckets: processedResults.buckets,
                    aggregations: processedResults.aggregations,
                    dataSize: processedResults.dataSize
                });

                // Cache response
                queryState.responseCache.set(cacheKey, {
                    data: response,
                    timestamp: Date.now()
                });

                // Update query state
                queryState.activeQueries.set(queryId, {
                    query,
                    startTime: queryState.activeQueries.get(queryId).startTime,
                    endTime: Date.now(),
                    status: 'completed'
                });

                return response;
            } catch (error) {
                const duration = Date.now() - queryState.activeQueries.get(queryId).startTime;

                // Track failed query
                performanceMetrics.failedQueries++;

                // Log error
                logAction('QUERY_EXECUTE_ERROR', {
                    queryId,
                    duration,
                    error: error.message
                });

                // Update query state with error
                queryState.activeQueries.set(queryId, {
                    query,
                    startTime: queryState.activeQueries.get(queryId).startTime,
                    endTime: Date.now(),
                    status: 'error',
                    error: error.message
                });

                throw error;
            }
        },

        // Send query to Elasticsearch
        async sendQuery(query) {
            try {
                // Debug: Log the exact query being sent
                console.log('📤 Sending query to Elasticsearch:', JSON.stringify(query, null, 2));

                // Use unified API - ensure it's initialized
                if (!unifiedAPI || !unifiedAPI.initialized) {
                    if (!unifiedAPI) {
                        throw new Error('UnifiedAPI not available');
                    }
                    await unifiedAPI.initialize();
                }

                // Use unified API which will delegate to the appropriate implementation
                const result = await unifiedAPI.executeQuery(query);
                if (!result || !result.success) {
                    throw new Error(result?.error || 'Query execution failed');
                }
                return result.data;
            } catch (error) {
                console.error('sendQuery failed:', error);

                // Provide a more helpful error message
                if (error.message.includes('authentication') || error.message.includes('cookie')) {
                    throw new Error('Authentication required - please set your cookie');
                } else if (error.message.includes('CORS') || error.message.includes('proxy')) {
                    throw new Error('CORS proxy required for localhost - please start the proxy server');
                } else {
                    throw new Error(`Query failed: ${error.message}`);
                }
            }
        },

        // Generate cache key
        getCacheKey(queryId, query) {
            return `${queryId}_${JSON.stringify(query)}`;
        },

        // Extract meaningful query details for logging
        extractQueryDetails(query) {
            const details = {
                type: 'unknown',
                timeRange: 'not specified',
                filters: [],
                aggregations: []
            };

            // Extract aggregations
            if (query.aggs) {
                details.aggregations = Object.keys(query.aggs);
                details.type = details.aggregations[0] || 'aggregation';
            }

            // Extract filters
            if (query.query?.bool?.filter) {
                query.query.bool.filter.forEach(filter => {
                    if (filter.range?.['@timestamp']) {
                        const range = filter.range['@timestamp'];
                        details.timeRange = `${range.gte || 'earliest'} to ${range.lte || range.lt || 'now'}`;
                    } else if (filter.wildcard) {
                        const field = Object.keys(filter.wildcard)[0];
                        const pattern = filter.wildcard[field].value || filter.wildcard[field];
                        details.filters.push(`${field}: ${pattern}`);
                    } else if (filter.term) {
                        const field = Object.keys(filter.term)[0];
                        details.filters.push(`${field}: ${filter.term[field]}`);
                    }
                });
            }

            return details;
        },

        // Extract meaningful result summary for logging
        extractResultSummary(response, queryDetails) {
            const summary = {
                hits: response.hits?.total?.value || 0,
                buckets: 0,
                aggregations: [],
                dataSize: 'unknown'
            };

            // Count aggregation buckets
            if (response.aggregations) {
                summary.aggregations = Object.keys(response.aggregations);

                // Count total buckets across all aggregations
                Object.values(response.aggregations).forEach(agg => {
                    if (agg.buckets && Array.isArray(agg.buckets)) {
                        summary.buckets += agg.buckets.length;
                    }
                });
            }

            // Estimate data size
            const responseStr = JSON.stringify(response);
            const sizeKB = Math.round(responseStr.length / 1024);
            summary.dataSize = sizeKB < 1024 ? `${sizeKB}KB` : `${Math.round(sizeKB / 1024 * 10) / 10}MB`;

            return summary;
        }
    };

    // =======================
    // EVENT LISTENERS & STATE UPDATES
    // =======================

    /**
     * Add event listener
     */
    function addEventListener(event, callback) {
        if (listeners[event]) {
            listeners[event].push(callback);
            logAction('ADD_EVENT_LISTENER', {
                event,
                listenerCount: listeners[event].length,
                callbackName: callback.name || 'anonymous'
            });
        } else {
            console.warn(`Unknown event type: ${event}`);
        }
    }

    function removeEventListener(event, callback) {
        if (listeners[event]) {
            const index = listeners[event].indexOf(callback);
            if (index > -1) {
                listeners[event].splice(index, 1);
                logAction('REMOVE_EVENT_LISTENER', {
                    event,
                    listenerCount: listeners[event].length,
                    callbackName: callback.name || 'anonymous'
                });
            }
        }
    }

    function notifyListeners(event, data) {
        if (listeners[event] && Array.isArray(listeners[event])) {
            logAction(`EVENT_EMIT_${event.toUpperCase()}`, {
                event,
                listenerCount: listeners[event].length,
                dataKeys: data && typeof data === 'object' ? Object.keys(data) : []
            });

            listeners[event].forEach((callback, index) => {
                try {
                    if (typeof callback === 'function') {
                        callback(data);
                    } else {
                        console.warn(`Invalid callback at index ${index} for event '${event}':`, callback);
                    }
                } catch (error) {
                    console.error(`Error in listener ${index} for event '${event}':`, error);
                    logAction('EVENT_LISTENER_ERROR', {
                        event,
                        listenerIndex: index,
                        error: error.message,
                        callbackType: typeof callback
                    });
                }
            });
        } else if (listeners[event]) {
            console.warn(`Event '${event}' listeners is not an array:`, listeners[event]);
        }
    }

    /**
     * Update app configuration
     */
    function updateAppConfig(newConfig) {
        logAction('UPDATE_APP_CONFIG', {
            config: newConfig,
            keys: Object.keys(newConfig)
        });

        // This would integrate with your existing config management
        // You can add more sophisticated config merging here
    }

    /**
     * Execute a search query directly (simpler than fetchAndParse)
     */
    async function executeSearch(searchType, config = {}) {
        try {
            // Handle special cases
            if (searchType === 'health') {
                // Use unified API health check instead of full query
                if (typeof unifiedAPI !== 'undefined' && unifiedAPI.checkHealth) {
                    const result = await unifiedAPI.checkHealth();
                    notifyListeners('searchComplete', {
                        searchType: 'health',
                        data: result.data || { status: result.healthy !== false ? 'ok' : 'error' }
                    });
                    return result;
                }

                // Fallback to simple query
                const query = QueryTemplates.health(config);
                const response = await QueryExecutor.execute(searchType, query);
                const result = { success: true, data: response };

                notifyListeners('searchComplete', {
                    searchType: 'health',
                    data: { status: 'ok', timestamp: new Date().toISOString() }
                });

                return result;
            }

            // For other search types, use fetchAndParse
            return await fetchAndParse(searchType, {
                type: searchType,
                params: config
            });

        } catch (error) {
            notifyListeners('error', {
                searchType,
                error: error.message
            });
            throw error;
        }
    }

    // =======================
    // MAIN DATA OPERATIONS
    // =======================

    async function fetchAndParse(queryId, queryConfig, options = {}) {
        logAction('FETCH_AND_PARSE_START', {
            queryId,
            queryType: queryConfig.type,
            params: queryConfig.params
        });

        try {
            // 1. Build query
            const query = QueryTemplates[queryConfig.type](queryConfig.params);
            logAction('QUERY_BUILD_COMPLETE', { queryId, queryType: queryConfig.type });

            // 2. Execute query
            const response = await QueryExecutor.execute(queryId, query, options);

            // 3. Parse response
            logAction('RESPONSE_PARSE_START', { queryId });
            let parsed = null;
            try {
                parsed = {
                    aggregations: ResponseParser.parseAggregations(response),
                    hits: ResponseParser.parseHits(response),
                    error: ResponseParser.parseError(response)
                };

                // Check for Elasticsearch errors in response
                if (parsed.error) {
                    logAction('ELASTICSEARCH_ERROR_DETECTED', {
                        queryId,
                        errorType: parsed.error.type,
                        errorReason: parsed.error.reason
                    });
                    throw new Error(`Elasticsearch error: ${parsed.error.reason}`);
                }

                logAction('RESPONSE_PARSE_COMPLETE', {
                    queryId,
                    hasAggregations: !!parsed.aggregations,
                    hitCount: parsed.hits.length,
                    aggregationKeys: parsed.aggregations ? Object.keys(parsed.aggregations) : []
                });
            } catch (parseError) {
                logAction('RESPONSE_PARSE_ERROR', {
                    queryId,
                    error: parseError.message,
                    responseType: typeof response,
                    hasResponse: !!response
                });
                throw new Error(`Response parsing failed: ${parseError.message}`);
            }

            // 4. Transform data
            logAction('DATA_TRANSFORM_START', { queryId, transformType: queryConfig.type });
            let transformed = null;
            try {
                switch (queryConfig.type) {
                    case 'trafficAnalysis':
                        transformed = DataTransformer.transformTrafficData(parsed.aggregations, queryConfig.params);
                        break;
                    case 'timeSeries':
                        transformed = DataTransformer.toTimeSeries(parsed.aggregations, queryConfig.params);
                        break;
                    default:
                        transformed = DataTransformer.extractMetrics(parsed.aggregations);
                }
                logAction('DATA_TRANSFORM_COMPLETE', {
                    queryId,
                    recordCount: Array.isArray(transformed) ? transformed.length : 0,
                    hasData: !!transformed
                });
            } catch (transformError) {
                logAction('DATA_TRANSFORM_ERROR', {
                    queryId,
                    transformType: queryConfig.type,
                    error: transformError.message,
                    aggregationsAvailable: !!parsed.aggregations
                });
                throw new Error(`Data transformation failed: ${transformError.message}`);
            }

            // 5. Cache parsed and transformed data
            const cacheKey = QueryExecutor.getCacheKey(queryId, query);
            queryState.parsedCache.set(cacheKey, {
                parsed,
                transformed,
                timestamp: Date.now()
            });
            logAction('PARSED_DATA_CACHED', { queryId, cacheKey });

            // 6. Notify listeners of successful completion
            notifyListeners('searchComplete', {
                searchType: queryId,
                data: transformed,
                parsed,
                raw: response,
                queryConfig
            });

            // Store last traffic results for retrieval by tests
            if (queryConfig.type === 'trafficAnalysis' && transformed) {
                queryState.lastProcessedResults = transformed;
            }

            logAction('FETCH_AND_PARSE_COMPLETE', {
                queryId,
                totalDuration: Date.now() - (queryState.activeQueries.get(queryId)?.startTime || Date.now())
            });

            return {
                raw: response,
                parsed,
                transformed,
                queryId
            };

        } catch (error) {
            logAction('FETCH_AND_PARSE_ERROR', {
                queryId,
                error: error.message,
                stack: error.stack
            });

            // Notify listeners of error
            notifyListeners('error', {
                searchType: queryId,
                error: error.message,
                queryConfig
            });

            throw error;
        }
    }

    // =======================
    // STATE LOGGING
    // =======================

    /**
     * Log state action in Redux DevTools style
     */
    function logAction(actionType, payload, changes = {}) {
        if (!stateLogging.enabled) return;

        // Check if action should be logged based on verbosity level
        if (stateLogging.verbosity !== 'verbose') {
            const allowedActions = actionVerbosity[stateLogging.verbosity];
            if (allowedActions && !allowedActions.includes(actionType)) {
                return; // Skip this action
            }
        }

        const timestamp = new Date().toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        });

        // For quiet mode, show minimal output
        if (stateLogging.verbosity === 'quiet' && stateLogging.collapsed) {
            console.log(
                `%c→ %c${actionType} %c@ ${timestamp}`,
                'color: #666;',
                `color: ${stateLogging.colors.action};`,
                `color: ${stateLogging.colors.time}; font-size: 0.9em;`
            );
            return;
        }

        const prevState = getState();

        // Log action header only if not DASHBOARD_INIT_START
        if (actionType !== 'DASHBOARD_INIT_START') {
            console.log(
                `%c action %c${actionType} %c@ ${timestamp}`,
                'color: #666; font-weight: normal;',
                `color: ${stateLogging.colors.action}; font-weight: bold;`,
                `color: ${stateLogging.colors.time}; font-weight: normal;`
            );
        }

        if (stateLogging.collapsed) {
            console.groupCollapsed('%c prev state', `color: ${stateLogging.colors.prevState};`);
        } else {
            console.group('%c prev state', `color: ${stateLogging.colors.prevState};`);
        }
        console.log(prevState);
        console.groupEnd();

        console.group('%c action    ', `color: ${stateLogging.colors.actionDetails};`);
        console.log({ type: actionType, ...payload });
        console.groupEnd();

        // Apply changes and get next state
        const nextState = getState();

        console.group('%c next state', `color: ${stateLogging.colors.nextState};`);
        console.log(nextState);
        console.groupEnd();

        // Log any errors
        if (payload.error) {
            console.group('%c error', `color: ${stateLogging.colors.error};`);
            console.error(payload.error);
            console.groupEnd();
        }

        console.log(''); // Empty line for readability
    }

    /**
     * Configure state logging
     */
    function configureLogging(options = {}) {
        Object.assign(stateLogging, options);

        // Verbosity changes are applied silently to reduce console noise
    }

    /**
     * Get current DataLayer state
     */
    function getState() {
        return {
            queryState: {
                activeQueries: Array.from(queryState.activeQueries.entries()).map(([id, query]) => ({
                    id,
                    status: query.status,
                    startTime: query.startTime,
                    endTime: query.endTime,
                    duration: query.endTime ? query.endTime - query.startTime : Date.now() - query.startTime,
                    error: query.error
                })),
                responseCacheSize: queryState.responseCache.size,
                parsedCacheSize: queryState.parsedCache.size,
                lastProcessedResults: queryState.lastProcessedResults
            },
            performanceMetrics: {
                ...performanceMetrics,
                recentQueries: performanceMetrics.queryDurations.slice(-10),
                averageQueryDuration: performanceMetrics.queryDurations.length > 0
                    ? Math.round(performanceMetrics.queryDurations.slice(-10).reduce((sum, q) => sum + q.duration, 0) / Math.min(10, performanceMetrics.queryDurations.length))
                    : 0,
                cacheHitRate: (performanceMetrics.cacheHits + performanceMetrics.cacheMisses) > 0
                    ? Math.round((performanceMetrics.cacheHits / (performanceMetrics.cacheHits + performanceMetrics.cacheMisses)) * 100)
                    : 0
            },
            listeners: {
                stateChange: listeners.stateChange.length,
                searchComplete: listeners.searchComplete.length,
                error: listeners.error.length,
                actionTriggered: listeners.actionTriggered.length
            },
            stateLogging: stateLogging
        };
    }

    // =======================
    // PUBLIC API
    // =======================

    return {
        // Query building
        QueryBuilder,
        QueryTemplates,

        // Response parsing
        ResponseParser,

        // Data transformation
        DataTransformer,

        // Main operations
        fetchAndParse,
        executeSearch,

        // State access
        getQueryState: () => ({
            ...queryState,
            lastProcessedResults: queryState.lastProcessedResults
        }),
        getActiveQueries: () => Array.from(queryState.activeQueries.entries()),
        getCachedResponses: () => Array.from(queryState.responseCache.keys()),

        // Event management
        addEventListener,
        removeEventListener,

        // Configuration
        updateAppConfig,

        // Cache management
        clearCache: () => {
            const responseCacheSize = queryState.responseCache.size;
            const parsedCacheSize = queryState.parsedCache.size;

            logAction('CLEAR_CACHE', {
                responseCacheSize,
                parsedCacheSize,
                totalCleared: responseCacheSize + parsedCacheSize
            });

            queryState.responseCache.clear();
            queryState.parsedCache.clear();
        },

        // Utilities
        buildQuery: (type, params) => QueryTemplates[type](params),
        parseResponse: (response) => ({
            aggregations: ResponseParser.parseAggregations(response),
            hits: ResponseParser.parseHits(response),
            error: ResponseParser.parseError(response)
        }),

        // State logging
        logAction,
        configureLogging,

        // Performance metrics
        getPerformanceMetrics: () => {
            const recentQueries = performanceMetrics.queryDurations.slice(-10);
            const avgDuration = recentQueries.length > 0
                ? Math.round(recentQueries.reduce((sum, q) => sum + q.duration, 0) / recentQueries.length)
                : 0;

            const cacheTotal = performanceMetrics.cacheHits + performanceMetrics.cacheMisses;
            const cacheHitRate = cacheTotal > 0
                ? Math.round((performanceMetrics.cacheHits / cacheTotal) * 100)
                : 0;

            return {
                averageQueryDuration: avgDuration,
                slowestQueryLastHour: performanceMetrics.slowestQueryLastHour,
                cacheHitRate,
                cacheHits: performanceMetrics.cacheHits,
                cacheMisses: performanceMetrics.cacheMisses,
                failedQueries: performanceMetrics.failedQueries,
                recentQueries: recentQueries,
                corsProxyStatus: performanceMetrics.corsProxyStatus,
                lastCorsHealthCheck: performanceMetrics.lastCorsHealthCheck
            };
        },

        // Update CORS proxy status
        updateCorsProxyStatus: (status) => {
            performanceMetrics.corsProxyStatus = status;
            performanceMetrics.lastCorsHealthCheck = Date.now();
            logAction('CORS_PROXY_HEALTH_CHECK', {
                status,
                timestamp: new Date().toISOString()
            });
        },

        // Reset performance metrics
        resetPerformanceMetrics: () => {
            performanceMetrics.queryDurations = [];
            performanceMetrics.cacheHits = 0;
            performanceMetrics.cacheMisses = 0;
            performanceMetrics.failedQueries = 0;
            performanceMetrics.slowestQueryLastHour = null;
            logAction('PERFORMANCE_METRICS_RESET', {
                timestamp: new Date().toISOString()
            });
        }
    };
})();

// ESM: Export as default for convenience
export default DataLayer;
