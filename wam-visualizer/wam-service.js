/**
 * WAM Data Service
 * Fetches and manages WAM data from Elasticsearch
 */

export class WamDataService {
    constructor(config = {}) {
        this.config = {
            proxyUrl: 'http://localhost:8001',
            esIndex: '*',
            eidPattern: 'pandc.vnext.recommendations.metricsevolved*',
            cardinalityPrecision: 1000,
            baselineWeeks: 3,
            timestampField: '@timestamp',
            eidField: 'detail.event.data.traffic.eid.keyword',
            userIdField: 'detail.event.data.traffic.userId.keyword',
            ...config
        };
        this.proxyUrl = this.config.proxyUrl;
        this.cookie = localStorage.getItem('elastic_cookie') || '';
    }

    setCookie(cookie) {
        this.cookie = cookie;
        localStorage.setItem('elastic_cookie', cookie);
    }
    
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.proxyUrl = this.config.proxyUrl;
    }

    async fetchEidTimeline(eid, timeRange = '24h', includeBaseline = true) {
        if (!this.cookie) {
            throw new Error('No authentication cookie set');
        }

        const now = new Date();
        console.log(`[fetchEidTimeline] Starting fetch for EID: ${eid}, timeRange: ${timeRange}`);
        const ranges = {
            '1h': 60 * 60 * 1000,
            '6h': 6 * 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000
        };

        const duration = ranges[timeRange] || ranges['24h'];
        const startTime = new Date(now.getTime() - duration);
        
        // Build time-based aggregation query
        const query = {
            size: 0,
            query: {
                bool: {
                    filter: [
                        {
                            term: {
                                [this.config.eidField]: eid
                            }
                        },
                        {
                            range: {
                                [this.config.timestampField]: {
                                    gte: startTime.toISOString(),
                                    lte: now.toISOString()
                                }
                            }
                        }
                    ]
                }
            },
            aggs: {
                timeline: {
                    date_histogram: {
                        field: this.config.timestampField,
                        ...this.getIntervalConfig(timeRange),
                        min_doc_count: 0,
                        extended_bounds: {
                            min: startTime.toISOString(),
                            max: now.toISOString()
                        }
                    },
                    aggs: {
                        unique_visitors: {
                            cardinality: {
                                field: this.config.userIdField,
                                precision_threshold: this.config.cardinalityPrecision
                            }
                        }
                    }
                }
            }
        };

        try {
            const response = await fetch(this.proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cookie: this.cookie,
                    query: query
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to fetch data');
            }

            const data = await response.json();
            
            // Check if the response is an error even with 200 status
            if (data.error) {
                console.error('Elasticsearch error response:', data);
                throw new Error(data.error.reason || data.error || 'Elasticsearch query error');
            }
            
            // Validate response structure
            if (!data.aggregations || !data.aggregations.timeline || !data.aggregations.timeline.buckets) {
                console.error('Invalid response structure:', {
                    hasAggregations: !!data.aggregations,
                    hasTimeline: !!(data.aggregations && data.aggregations.timeline),
                    hasBuckets: !!(data.aggregations && data.aggregations.timeline && data.aggregations.timeline.buckets),
                    responseKeys: Object.keys(data),
                    aggregationKeys: data.aggregations ? Object.keys(data.aggregations) : 'N/A',
                    timeRange: timeRange,
                    interval: this.getInterval(timeRange)
                });
                
                // Log first 500 chars of response to avoid huge logs
                const responseStr = JSON.stringify(data);
                console.error('Response preview:', responseStr.substring(0, 500) + (responseStr.length > 500 ? '...' : ''));
                
                // Check if it's a shard failure
                if (data._shards && data._shards.failed > 0) {
                    throw new Error(`Elasticsearch query failed - ${data._shards.failed} shards failed`);
                }
                
                // Check if response has hits but no aggregations (might happen with no data)
                if (data.hits && (data.hits.total === 0 || (data.hits.total && data.hits.total.value === 0))) {
                    console.log('No data found for this time range');
                    return { current: [], baseline: [] };
                }
                
                throw new Error('Invalid response from Elasticsearch - no timeline data found');
            }
            
            const currentData = this.transformTimelineData(data.aggregations.timeline.buckets);
            
            // Fetch baseline data if requested
            if (includeBaseline) {
                const baselineData = await this.fetchBaselineData(eid, timeRange, startTime, now);
                return {
                    current: currentData,
                    baseline: baselineData
                };
            }
            
            return { current: currentData, baseline: [] };
        } catch (error) {
            console.error('Failed to fetch EID timeline:', error);
            throw error;
        }
    }

    async fetchBaselineData(eid, timeRange, currentStart, currentEnd) {
        // For baseline, we'll fetch data from multiple previous periods
        // and aggregate by hour of day to capture patterns
        const baselinePeriods = this.getBaselinePeriods(timeRange, currentStart);
        console.log('Fetching baseline for periods:', baselinePeriods.map(p => ({
            start: p.start.toISOString(),
            end: p.end.toISOString()
        })));
        
        // Fetch data from multiple baseline periods in parallel
        const promises = baselinePeriods.map(period => 
            this.fetchPeriodData(eid, period.start, period.end, timeRange)
        );
        
        try {
            const results = await Promise.all(promises);
            console.log('Baseline fetch results:', results.map(r => r.length));
            
            // For longer time ranges, aggregate by time slot position rather than hour of day
            const slotAggregates = new Map();
            
            // Find the minimum number of data points across all periods
            const minLength = Math.min(...results.map(r => r.length));
            
            // Aggregate data by position in the time series
            for (let i = 0; i < minLength; i++) {
                const events = [];
                const visitors = [];
                
                results.forEach(periodData => {
                    if (periodData[i]) {
                        events.push(periodData[i].events);
                        visitors.push(periodData[i].visitors);
                    }
                });
                
                if (events.length > 0) {
                    slotAggregates.set(i, {
                        events,
                        visitors,
                        timestamp: results[0][i].timestamp // Use timestamp from first result as reference
                    });
                }
            }
            
            // Calculate percentiles for each time slot
            const baseline = [];
            slotAggregates.forEach((data, index) => {
                baseline.push({
                    timestamp: data.timestamp,
                    p10: this.percentile(data.events, 10),
                    p25: this.percentile(data.events, 25),
                    p50: this.percentile(data.events, 50),
                    p75: this.percentile(data.events, 75),
                    p90: this.percentile(data.events, 90),
                    visitorsP50: this.percentile(data.visitors, 50)
                });
            });
            
            console.log('Baseline calculation sample:', baseline.slice(0, 3).map(b => ({
                p50: b.p50,
                p10: b.p10,
                p90: b.p90
            })));
            
            return baseline;
            
        } catch (error) {
            console.error('Failed to fetch baseline data:', error);
            return [];
        }
    }

    getBaselinePeriods(timeRange, currentStart) {
        const periods = [];
        const msInWeek = 7 * 24 * 60 * 60 * 1000;
        
        // Use configured baseline weeks or default based on time range
        const weeksToFetch = this.config.baselineWeeks || (
            timeRange === '1h' || timeRange === '6h' ? 4 : 
            timeRange === '24h' ? 3 : 
            timeRange === '7d' ? 2 : 1
        );
        
        // Get same period from previous weeks
        for (let i = 1; i <= weeksToFetch; i++) {
            const weekOffset = i * msInWeek;
            const start = new Date(currentStart.getTime() - weekOffset);
            const duration = new Date().getTime() - currentStart.getTime();
            const end = new Date(start.getTime() + duration);
            
            periods.push({ start, end });
        }
        
        return periods;
    }

    async fetchPeriodData(eid, start, end, timeRange = '24h') {
        const query = {
            size: 0,
            query: {
                bool: {
                    filter: [
                        { term: { [this.config.eidField]: eid } },
                        { range: { [this.config.timestampField]: { gte: start.toISOString(), lte: end.toISOString() } } }
                    ]
                }
            },
            aggs: {
                timeline: {
                    date_histogram: {
                        field: this.config.timestampField,
                        ...this.getIntervalConfig(timeRange),
                        min_doc_count: 0,
                        extended_bounds: {
                            min: start.toISOString(),
                            max: end.toISOString()
                        }
                    },
                    aggs: {
                        unique_visitors: {
                            cardinality: {
                                field: this.config.userIdField,
                                precision_threshold: this.config.cardinalityPrecision
                            }
                        }
                    }
                }
            }
        };
        
        const response = await fetch(this.proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cookie: this.cookie, query })
        });
        
        if (!response.ok) {
            console.error(`Failed to fetch baseline period: ${response.status}`);
            return [];
        }
        
        const data = await response.json();
        
        if (!data.aggregations || !data.aggregations.timeline) {
            console.error('Invalid baseline response structure');
            return [];
        }
        
        return this.transformTimelineData(data.aggregations.timeline.buckets);
    }

    percentile(arr, p) {
        if (arr.length === 0) return 0;
        const sorted = arr.slice().sort((a, b) => a - b);
        const index = (p / 100) * (sorted.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index % 1;
        
        if (lower === upper) return sorted[lower];
        return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    }

    mapBaselineToTimeRange(baselineByHour, start, end) {
        const baseline = [];
        const current = new Date(start);
        
        while (current <= end) {
            const hour = current.getHours();
            const hourData = baselineByHour.get(hour) || {
                p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, visitorsP50: 0
            };
            
            baseline.push({
                timestamp: new Date(current),
                ...hourData
            });
            
            // Move to next interval based on duration
            const totalDuration = end.getTime() - start.getTime();
            if (totalDuration <= 60 * 60 * 1000) { // 1 hour or less
                current.setMinutes(current.getMinutes() + 5);
            } else if (totalDuration <= 6 * 60 * 60 * 1000) { // 6 hours or less
                current.setMinutes(current.getMinutes() + 30);
            } else if (totalDuration <= 24 * 60 * 60 * 1000) { // 24 hours or less
                current.setHours(current.getHours() + 1);
            } else {
                current.setHours(current.getHours() + 6);
            }
        }
        
        return baseline;
    }

    async fetchTopEids(timeRange = '1h', limit = 10) {
        if (!this.cookie) {
            throw new Error('No authentication cookie set');
        }

        const now = new Date();
        const ranges = {
            '10m': 10 * 60 * 1000,
            '1h': 60 * 60 * 1000,
            '6h': 6 * 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000
        };

        const startTime = new Date(now.getTime() - (ranges[timeRange] || ranges['1h']));

        const query = {
            size: 0,
            query: {
                bool: {
                    filter: [
                        {
                            wildcard: {
                                [this.config.eidField]: this.config.eidPattern
                            }
                        },
                        {
                            range: {
                                [this.config.timestampField]: {
                                    gte: startTime.toISOString(),
                                    lte: now.toISOString()
                                }
                            }
                        }
                    ]
                }
            },
            aggs: {
                top_eids: {
                    terms: {
                        field: this.config.eidField,
                        size: limit
                    },
                    aggs: {
                        unique_visitors: {
                            cardinality: {
                                field: this.config.userIdField,
                                precision_threshold: this.config.cardinalityPrecision
                            }
                        }
                    }
                }
            }
        };

        try {
            const response = await fetch(this.proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cookie: this.cookie,
                    query: query
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to fetch data');
            }

            const data = await response.json();
            
            // Validate response structure
            if (!data.aggregations || !data.aggregations.top_eids || !data.aggregations.top_eids.buckets) {
                console.error('Invalid response structure for top EIDs:', data);
                return []; // Return empty array instead of throwing to prevent breaking the UI
            }
            
            return data.aggregations.top_eids.buckets.map(bucket => ({
                eid: bucket.key,
                events: bucket.doc_count,
                visitors: Math.round(bucket.unique_visitors.value)
            }));
        } catch (error) {
            console.error('Failed to fetch top EIDs:', error);
            throw error;
        }
    }

    getInterval(timeRange) {
        const intervals = {
            '1h': '5m',
            '6h': '30m',
            '24h': '1h',
            '7d': '6h',
            '30d': '1d'
        };
        return intervals[timeRange] || '1h';
    }
    
    getIntervalConfig(timeRange) {
        const interval = this.getInterval(timeRange);
        // Use fixed_interval for minute/hour-based intervals that aren't calendar units
        // Calendar intervals only support: minute, hour, day, week, month, quarter, year
        if (interval.includes('m') || interval === '6h') {
            return { fixed_interval: interval };
        } else {
            return { calendar_interval: interval };
        }
    }

    transformTimelineData(buckets) {
        return buckets.map(bucket => ({
            timestamp: new Date(bucket.key_as_string),
            time: bucket.key_as_string,
            events: bucket.doc_count,
            visitors: Math.round(bucket.unique_visitors.value)
        }));
    }
}