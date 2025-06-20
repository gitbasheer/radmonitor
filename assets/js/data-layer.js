/**
 * Data Layer for Elasticsearch Operations
 * Clean abstractions for query building, response parsing, and data transformation
 */

// ESM: Import dependencies
import TimeRangeUtils from './time-range-utils.js';
import DataProcessor from './data-processor.js';
import UIUpdater from './ui-updater.js';
import ApiClient from './api-client.js';

// ESM: Converted from IIFE to ES module export
export const DataLayer = (() => {
    'use strict';

    // State for tracking queries and responses
    const queryState = {
        activeQueries: new Map(),
        responseCache: new Map(),
        parsedCache: new Map()
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

    // State logging configuration
    const stateLogging = {
        enabled: true,
        collapsed: false,
        colors: {
            action: '#03A9F4',
            prevState: '#9E9E9E',
            actionDetails: '#4CAF50',
            nextState: '#FF6B6B',
            error: '#F44336',
            time: '#666666'
        }
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
            query.query.bool.filter.push({
                term: { [field]: value }
            });
            return query;
        },

        // Add wildcard filter
        wildcard(query, field, pattern) {
            query.query.bool.filter.push({
                wildcard: { [field]: { value: pattern } }
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
            const query = QueryBuilder.base();

            // Add filters
            QueryBuilder.timeRange(query, '@timestamp', '2025-05-19T04:00:00.000Z', 'now');
            QueryBuilder.wildcard(query, 'detail.event.data.traffic.eid.keyword', 'pandc.vnext.recommendations.feed.feed*');
            QueryBuilder.term(query, 'detail.global.page.host', 'dashboard.godaddy.com');

            // Add main aggregation
            QueryBuilder.termsAgg(query, 'events', 'detail.event.data.traffic.eid.keyword');

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
            if (typeof DataProcessor !== 'undefined' && DataProcessor.processData) {
                return DataProcessor.processData(rawBuckets, config);
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

                return {
                    event_id: bucket.key,
                    displayName: bucket.key.replace('pandc.vnext.recommendations.feed.', ''),
                    current: current,
                    baseline12h: Math.round(baseline_period),
                    baseline_period: Math.round(baseline_period),
                    baseline_count: baseline,
                    score,
                    status,
                    dailyAvg: Math.round(daily_avg)
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

            // Track active query
            logAction('QUERY_EXECUTE_START', {
                queryId,
                cacheKey,
                queryType: query.aggs ? Object.keys(query.aggs)[0] : 'unknown'
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

                // Log successful response
                logAction('QUERY_EXECUTE_SUCCESS', {
                    queryId,
                    duration,
                    hits: response.hits?.total?.value || 0,
                    aggregations: response.aggregations ? Object.keys(response.aggregations) : []
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
            // Use your existing ApiClient
            const result = await ApiClient.executeQuery(query);
            if (!result.success) {
                throw new Error(result.error);
            }
            return result.data;
        },

        // Generate cache key
        getCacheKey(queryId, query) {
            return `${queryId}_${JSON.stringify(query)}`;
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
        if (listeners[event]) {
            logAction(`EVENT_EMIT_${event.toUpperCase()}`, {
                event,
                listenerCount: listeners[event].length,
                dataKeys: data ? Object.keys(data) : []
            });

            listeners[event].forEach((callback, index) => {
                try {
                    callback(data);
                } catch (error) {
                    logAction('EVENT_LISTENER_ERROR', {
                        event,
                        listenerIndex: index,
                        error: error.message
                    });
                }
            });
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
                // Use ApiClient health check instead of full query
                if (typeof ApiClient !== 'undefined' && ApiClient.checkHealth) {
                    const result = await ApiClient.checkHealth();
                    notifyListeners('searchComplete', {
                        searchType: 'health',
                        data: result.data || { status: result.success ? 'ok' : 'error' }
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
            const parsed = {
                aggregations: ResponseParser.parseAggregations(response),
                hits: ResponseParser.parseHits(response),
                error: ResponseParser.parseError(response)
            };
            logAction('RESPONSE_PARSE_COMPLETE', {
                queryId,
                hasAggregations: !!parsed.aggregations,
                hitCount: parsed.hits.length,
                hasError: !!parsed.error
            });

            // 4. Transform data
            logAction('DATA_TRANSFORM_START', { queryId, transformType: queryConfig.type });
            let transformed = null;
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
                recordCount: Array.isArray(transformed) ? transformed.length : 0
            });

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

        const timestamp = new Date().toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        });

        const prevState = getState();

        // Log action header
        console.log(
            `%c action %c${actionType} %c@ ${timestamp}`,
            'color: #666; font-weight: normal;',
            `color: ${stateLogging.colors.action}; font-weight: bold;`,
            `color: ${stateLogging.colors.time}; font-weight: normal;`
        );

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
                parsedCacheSize: queryState.parsedCache.size
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
        getQueryState: () => ({ ...queryState }),
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
