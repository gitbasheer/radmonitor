/**
 * Data Layer Usage Examples
 * Simple, clean examples of how to use the new data layer
 */

// ESM: Import dependencies
import DataLayer from './data-layer.js';

// ESM: Converted from IIFE to ES module export
export const DataLayerExample = (() => {
    'use strict';

    // =======================
    // BASIC QUERY BUILDING
    // =======================

    function exampleQueryBuilding() {
        console.log('🔧 Building queries with DataLayer.QueryBuilder...');

        // 1. Simple terms aggregation
        const query1 = DataLayer.QueryBuilder.base();
        DataLayer.QueryBuilder.termsAgg(query1, 'events', 'event_type.keyword');
        DataLayer.QueryBuilder.timeRange(query1, '@timestamp', 'now-24h', 'now');

        console.log('Terms aggregation query:', JSON.stringify(query1, null, 2));

        // 2. Date histogram with sub-aggregation
        const query2 = DataLayer.QueryBuilder.base();
        DataLayer.QueryBuilder.dateHistogram(query2, 'timeline', '@timestamp', '1h');
        DataLayer.QueryBuilder.addSubAgg(query2, 'timeline', 'event_types', {
            terms: { field: 'event_type.keyword', size: 5 }
        });

        console.log('Date histogram query:', JSON.stringify(query2, null, 2));
    }

    // =======================
    // USING QUERY TEMPLATES
    // =======================

    async function exampleQueryTemplates() {
        console.log('📋 Using query templates...');

        // 1. Traffic analysis (your main use case)
        const trafficConfig = {
            baselineStart: '2025-06-01',
            baselineEnd: '2025-06-09',
            currentTimeRange: 'now-12h'
        };

        const trafficQuery = DataLayer.QueryTemplates.trafficAnalysis(trafficConfig);
        console.log('Traffic analysis query built');

        // 2. Time series analysis
        const timeSeriesConfig = {
            startTime: 'now-24h',
            endTime: 'now',
            interval: '1h',
            groupBy: 'event_type.keyword',
            groupSize: 10
        };

        const timeSeriesQuery = DataLayer.QueryTemplates.timeSeries(timeSeriesConfig);
        console.log('Time series query built');
    }

    // =======================
    // FETCHING AND PARSING DATA
    // =======================

    async function exampleFetchAndParse() {
        console.log('🔄 Fetching and parsing data...');

        try {
            // Fetch traffic data
            const result = await DataLayer.fetchAndParse('traffic_analysis', {
                type: 'trafficAnalysis',
                params: {
                    baselineStart: '2025-06-01',
                    baselineEnd: '2025-06-09',
                    currentTimeRange: 'now-12h'
                }
            });

            console.log('Raw response sample:', Object.keys(result.raw));
            console.log('Parsed aggregations:', Object.keys(result.parsed.aggregations || {}));
            console.log('Transformed data count:', result.transformed?.length || 0);

            return result;

        } catch (error) {
            console.error('Fetch failed:', error.message);
        }
    }

    // =======================
    // RESPONSE PARSING
    // =======================

    function exampleResponseParsing() {
        console.log('🔍 Parsing responses...');

        // Example Elasticsearch response
        const sampleResponse = {
            aggregations: {
                events: {
                    buckets: [
                        {
                            key: 'feed_example.impression',
                            doc_count: 1000,
                            baseline: { doc_count: 800 },
                            current: { doc_count: 1200 }
                        }
                    ]
                }
            }
        };

        // Parse the response
        const parsed = DataLayer.ResponseParser.parseAggregations(sampleResponse);
        console.log('Parsed result:', JSON.stringify(parsed, null, 2));

        // Transform to usable format
        const transformed = DataLayer.DataTransformer.extractMetrics(parsed);
        console.log('Transformed metrics:', JSON.stringify(transformed, null, 2));
    }

    // =======================
    // STATE MANAGEMENT
    // =======================

    function exampleStateInspection() {
        console.log(' Inspecting query state...');

        const state = DataLayer.getQueryState();
        console.log('Active queries:', state.activeQueries.size);
        console.log('Cached responses:', state.responseCache.size);

        const activeQueries = DataLayer.getActiveQueries();
        activeQueries.forEach(([queryId, queryInfo]) => {
            console.log(`Query ${queryId}:`, queryInfo.status);
        });
    }

    // =======================
    // PRACTICAL EXAMPLE
    // =======================

    async function practicalExample() {
        console.log('🎯 Practical example: Compare current vs baseline traffic...');

        try {
            // Step 1: Build a custom query
            const query = DataLayer.QueryBuilder.base();
            DataLayer.QueryBuilder.wildcard(query, 'event_id.keyword', 'feed_*');
            DataLayer.QueryBuilder.timeRange(query, '@timestamp', 'now-7d', 'now');
            DataLayer.QueryBuilder.termsAgg(query, 'feeds', 'event_id.keyword', 20);

            // Add baseline and current sub-aggregations
            DataLayer.QueryBuilder.addSubAgg(query, 'feeds', 'baseline', {
                filter: {
                    range: {
                        '@timestamp': { gte: 'now-14d', lt: 'now-7d' }
                    }
                }
            });

            DataLayer.QueryBuilder.addSubAgg(query, 'feeds', 'current', {
                filter: {
                    range: {
                        '@timestamp': { gte: 'now-7d', lt: 'now' }
                    }
                }
            });

            console.log('Custom query built successfully');

            // Step 2: Execute query (if we have auth)
            // const response = await DataLayer.QueryExecutor.execute('comparison', query);

            // Step 3: Parse and transform
            // const parsed = DataLayer.ResponseParser.parseAggregations(response);
            // const metrics = DataLayer.DataTransformer.extractMetrics(parsed);

            console.log('Example complete - query ready for execution');

        } catch (error) {
            console.error('Practical example failed:', error);
        }
    }

    // =======================
    // PUBLIC API
    // =======================

    return {
        // Run all examples
        runAll: async function() {
            console.log('🚀 Running DataLayer examples...');

            exampleQueryBuilding();
            await exampleQueryTemplates();
            exampleResponseParsing();
            exampleStateInspection();
            await practicalExample();

            // Try to fetch real data if possible
            try {
                await exampleFetchAndParse();
            } catch (error) {
                console.log('Real data fetch skipped (no auth):', error.message);
            }

            console.log('(✓)All examples complete!');
        },

        // Individual examples
        queryBuilding: exampleQueryBuilding,
        queryTemplates: exampleQueryTemplates,
        fetchAndParse: exampleFetchAndParse,
        responseParsing: exampleResponseParsing,
        stateInspection: exampleStateInspection,
        practical: practicalExample
    };
})();

// ESM: Export as default for convenience
export default DataLayerExample;

// ESM: Remove window assignment, handle it differently
