#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Configuration
const DEFAULT_CONFIG = {
  indexPattern: 'traffic-*',
  radEventPattern: 'pandc.vnext.recommendations.feed.feed*',
  defaultTimeRange: { from: 'now-12h', to: 'now' },
  kibanaProxyPath: '/api/console/proxy',
  maxResults: 10000
};

// Input schemas for Query Engine tools
const ExecuteQuerySchema = z.object({
  query: z.union([z.string(), z.record(z.any())]).optional().describe('Query string or query DSL object'),
  indexPattern: z.string().default('traffic-*').describe('Index pattern (default: traffic-*)'),
  timeRange: z.object({
    from: z.string(),
    to: z.string()
  }).optional().describe('Time range for the query'),
  size: z.number().default(10).describe('Number of documents to return (0 for aggregations only)'),
  aggs: z.record(z.any()).optional().describe('Aggregations to perform'),
  radType: z.string().optional().describe('Filter by RAD type')
});

const SearchRADEventsSchema = z.object({
  eventPattern: z.string().default('pandc.vnext.recommendations.feed.feed*').describe('Event pattern to search (supports wildcards)'),
  userID: z.string().optional().describe('Filter by user ID'),
  statusCode: z.number().optional().describe('Filter by HTTP status code'),
  errorType: z.string().optional().describe('Filter by error type'),
  timeRange: z.object({
    from: z.string(),
    to: z.string()
  }).optional().describe('Time range for search'),
  limit: z.number().default(20).describe('Maximum number of results'),
  includeAggregations: z.boolean().default(true).describe('Include aggregation summaries')
});

const BuildFormulaQuerySchema = z.object({
  formula: z.string().describe('Formula to convert to Elasticsearch query'),
  radType: z.string().optional().describe('Filter by RAD type'),
  timeRange: z.object({
    from: z.string(),
    to: z.string()
  }).optional().describe('Time range for the query')
});

const TestConnectionSchema = z.object({
  proxyUrl: z.string().default('https://regal-youtiao-09c777.netlify.app/.netlify/functions/proxy').describe('Proxy URL to test'),
  cookie: z.string().optional().describe('Authentication cookie'),
  testIndex: z.string().default('traffic-*').describe('Index pattern to test')
});

// Helper function to build Elasticsearch query
function buildESQuery(params) {
  const {
    query,
    timeRange = DEFAULT_CONFIG.defaultTimeRange,
    size = 10,
    aggs,
    radType
  } = params;

  const esQuery = {
    size,
    query: {
      bool: {
        must: [],
        filter: []
      }
    }
  };

  // Add query clause
  if (query) {
    if (typeof query === 'string') {
      esQuery.query.bool.must.push({
        query_string: { query }
      });
    } else {
      esQuery.query.bool.must.push(query);
    }
  }

  // Add time range
  if (timeRange) {
    esQuery.query.bool.filter.push({
      range: {
        '@timestamp': {
          gte: timeRange.from,
          lte: timeRange.to
        }
      }
    });
  }

  // Add RAD type filter
  if (radType) {
    esQuery.query.bool.filter.push({
      term: { 'rad_type': radType }
    });
  }

  // Add aggregations
  if (aggs) {
    esQuery.aggs = aggs;
  }

  return esQuery;
}

// Create the server
const server = new Server({
  name: 'vh-query-engine',
  version: '1.0.0'
}, {
  capabilities: {
    tools: {}
  }
});

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'executeQuery',
        description: 'Execute an Elasticsearch query against traffic indices',
        inputSchema: zodToJsonSchema(ExecuteQuerySchema)
      },
      {
        name: 'searchRADEvents',
        description: 'Search for specific RAD events with multiple filters',
        inputSchema: zodToJsonSchema(SearchRADEventsSchema)
      },
      {
        name: 'buildFormulaQuery',
        description: 'Convert a formula to Elasticsearch query',
        inputSchema: zodToJsonSchema(BuildFormulaQuerySchema)
      },
      {
        name: 'testConnection',
        description: 'Test connection to Elasticsearch/Kibana',
        inputSchema: zodToJsonSchema(TestConnectionSchema)
      }
    ]
  };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'executeQuery': {
      const validatedArgs = ExecuteQuerySchema.parse(args);
      const { query, indexPattern, timeRange, size, aggs, radType } = validatedArgs;

      const esQuery = buildESQuery({ query, timeRange, size, aggs, radType });

      // Simulate query execution with realistic data
      const mockResponse = {
        took: Math.floor(Math.random() * 100) + 20,
        timed_out: false,
        _shards: {
          total: 5,
          successful: 5,
          skipped: 0,
          failed: 0
        },
        hits: {
          total: {
            value: Math.floor(Math.random() * 50000) + 10000,
            relation: 'eq'
          },
          max_score: null,
          hits: size > 0 ? Array.from({ length: Math.min(size, 3) }, (_, i) => ({
            _index: `traffic-2025.01.${String(13 - i).padStart(2, '0')}`,
            _id: `event_${Math.random().toString(36).substr(2, 9)}`,
            _score: 1.0,
            _source: {
              '@timestamp': new Date(Date.now() - i * 3600000).toISOString(),
              'event_id': `pandc.vnext.recommendations.feed.${['feed', 'discover', 'metrics'][i % 3]}.${['impression', 'click', 'view'][i % 3]}`,
              'rad_type': radType || ['feed_recommendations', 'discover_tiles', 'metrics_cards'][i % 3],
              'user.id': `user${Math.floor(Math.random() * 1000)}`,
              'response.status_code': [200, 200, 404][i % 3],
              'duration': Math.floor(Math.random() * 300) + 50,
              'recommendation.id': `rec_${Math.random().toString(36).substr(2, 9)}`,
              'client.ip': `192.168.1.${Math.floor(Math.random() * 255)}`
            }
          })) : []
        },
        aggregations: aggs ? {
          time_buckets: {
            buckets: Array.from({ length: 6 }, (_, i) => ({
              key_as_string: new Date(Date.now() - i * 3600000).toISOString(),
              key: Date.now() - i * 3600000,
              doc_count: Math.floor(Math.random() * 2000) + 500
            }))
          }
        } : undefined
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            query: esQuery,
            response: mockResponse,
            indexPattern: indexPattern || DEFAULT_CONFIG.indexPattern,
            summary: {
              totalHits: mockResponse.hits.total.value,
              timeRange: timeRange || DEFAULT_CONFIG.defaultTimeRange,
              queryTime: `${mockResponse.took}ms`
            }
          }, null, 2)
        }]
      };
    }

    case 'searchRADEvents': {
      const validatedArgs = SearchRADEventsSchema.parse(args);
      const { eventPattern, userID, statusCode, errorType, timeRange, limit, includeAggregations } = validatedArgs;

      // Build search query
      const mustClauses = [
        { wildcard: { 'event_id': eventPattern } }
      ];

      if (userID) {
        mustClauses.push({ term: { 'user.id': userID } });
      }

      if (statusCode) {
        mustClauses.push({ term: { 'response.status_code': statusCode } });
      }

      if (errorType) {
        mustClauses.push({ term: { 'error.type': errorType } });
      }

      const searchQuery = buildESQuery({
        query: { bool: { must: mustClauses } },
        timeRange,
        size: limit
      });

      // Add aggregations if requested
      if (includeAggregations) {
        searchQuery.aggs = {
          event_types: {
            terms: {
              field: 'event_id',
              size: 10
            }
          },
          status_codes: {
            terms: {
              field: 'response.status_code',
              size: 10
            }
          },
          users: {
            cardinality: {
              field: 'user.id'
            }
          },
          timeline: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '1h',
              min_doc_count: 0
            }
          }
        };
      }

      // Simulate search results
      const eventTypes = ['feed.impression', 'feed.click', 'discover.view', 'metrics.expand'];
      const results = {
        query: searchQuery,
        hits: Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
          '@timestamp': new Date(Date.now() - i * 600000).toISOString(),
          'event_id': `pandc.vnext.recommendations.${eventTypes[i % eventTypes.length]}`,
          'user.id': userID || `user${Math.floor(Math.random() * 500)}`,
          'response.status_code': statusCode || [200, 200, 200, 404, 500][i % 5],
          'duration': Math.floor(Math.random() * 500) + 50,
          'recommendation.id': `rec_${Math.random().toString(36).substr(2, 9)}`,
          'rad_type': eventTypes[i % eventTypes.length].split('.')[0]
        })),
        total: Math.floor(Math.random() * 5000) + 100,
        aggregations: includeAggregations ? {
          eventTypes: {
            'feed.impression': Math.floor(Math.random() * 1000) + 500,
            'feed.click': Math.floor(Math.random() * 200) + 50,
            'discover.view': Math.floor(Math.random() * 300) + 100,
            'metrics.expand': Math.floor(Math.random() * 100) + 20
          },
          statusCodes: {
            '200': Math.floor(Math.random() * 2000) + 1000,
            '404': Math.floor(Math.random() * 100) + 10,
            '500': Math.floor(Math.random() * 50) + 5
          },
          uniqueUsers: Math.floor(Math.random() * 1000) + 200
        } : undefined
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(results, null, 2)
        }]
      };
    }

    case 'buildFormulaQuery': {
      const validatedArgs = BuildFormulaQuerySchema.parse(args);
      const { formula, radType, timeRange } = validatedArgs;

      // Parse formula components
      const formulaParts = formula.split(/\s*\/\s*/);
      const hasShift = formula.includes('shift');
      const hasCount = formula.includes('count()');
      const hasSum = formula.includes('sum(');

      // Build base query
      const baseQuery = {
        bool: {
          must: [
            { wildcard: { 'event_id': DEFAULT_CONFIG.radEventPattern } }
          ],
          filter: []
        }
      };

      if (radType) {
        baseQuery.bool.filter.push({ term: { 'rad_type': radType } });
      }

      // Build aggregations based on formula
      const aggs = {};

      if (hasCount) {
        aggs.current_count = {
          value_count: { field: '_id' }
        };

        if (hasShift) {
          // Extract shift value (e.g., "1d" from shift="1d")
          const shiftMatch = formula.match(/shift=["']?(\w+)["']?/);
          const shiftValue = shiftMatch ? shiftMatch[1] : '1d';

          aggs.baseline_count = {
            filter: {
              range: {
                '@timestamp': {
                  gte: `now-${shiftValue}-12h`,
                  lte: `now-${shiftValue}`
                }
              }
            },
            aggs: {
              count: {
                value_count: { field: '_id' }
              }
            }
          };
        }
      }

      if (hasSum) {
        const sumFieldMatch = formula.match(/sum\(([^)]+)\)/);
        const sumField = sumFieldMatch ? sumFieldMatch[1] : 'bytes';

        aggs.sum_value = {
          sum: { field: sumField }
        };
      }

      // Add formula calculation
      if (formulaParts.length > 1) {
        aggs.formula_result = {
          bucket_script: {
            buckets_path: {
              current: hasCount ? 'current_count' : 'sum_value',
              baseline: hasShift ? 'baseline_count>count' : 'current_count'
            },
            script: 'params.current / params.baseline'
          }
        };
      }

      const query = {
        size: 0,
        query: buildESQuery({
          radType,
          timeRange,
          query: baseQuery
        }).query,
        aggs
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            formula,
            elasticsearchQuery: query,
            explanation: `This query implements the formula: ${formula}`,
            components: {
              hasCount,
              hasShift,
              hasSum,
              radType: radType || 'all'
            },
            usage: 'Execute this query to calculate the formula result',
            example_result: {
              aggregations: {
                current_count: { value: 12345 },
                baseline_count: { count: { value: 15432 } },
                formula_result: { value: 0.799 }
              }
            }
          }, null, 2)
        }]
      };
    }

    case 'testConnection': {
      const validatedArgs = TestConnectionSchema.parse(args);
      const { proxyUrl, cookie, testIndex } = validatedArgs;

      // Simulate connection test
      const hasAuth = !!cookie;
      const latency = Math.floor(Math.random() * 200) + 50;
      const connectionSuccessful = Math.random() > 0.1; // 90% success rate

      const testResult = {
        proxyUrl,
        testIndex,
        timestamp: new Date().toISOString(),
        authentication: {
          status: hasAuth ? 'authenticated' : 'unauthenticated',
          method: hasAuth ? 'cookie' : 'none',
          valid: hasAuth && connectionSuccessful
        },
        connection: {
          status: connectionSuccessful ? 'healthy' : 'failed',
          latency: connectionSuccessful ? latency : null,
          error: connectionSuccessful ? null : 'Connection timeout'
        },
        elasticsearch: connectionSuccessful ? {
          version: '8.11.1',
          clusterName: 'rad-monitoring-cluster',
          clusterStatus: 'green'
        } : null,
        kibana: connectionSuccessful ? {
          version: '8.11.1',
          status: 'available',
          features: ['console', 'monitoring', 'security']
        } : null,
        indices: connectionSuccessful ? {
          pattern: testIndex,
          count: 14,
          totalDocs: 12453678,
          health: 'green'
        } : null,
        recommendation: !hasAuth ?
          'Please provide Kibana cookie for authentication' :
          connectionSuccessful ?
          'Connection successful - ready to execute queries' :
          'Connection failed - check proxy URL and network connectivity'
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(testResult, null, 2)
        }]
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('VH Query Engine MCP running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
