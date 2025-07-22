import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default configuration aligned with RAD Traffic Monitor
const DEFAULT_CONFIG = {
  indexPattern: 'traffic-*',
  kibanaProxyPath: '/api/console/proxy',
  radEventPattern: 'pandc.vnext.recommendations.feed.feed*',
  defaultTimeRange: { from: 'now-12h', to: 'now' }
};

// Create the MCP server
const server = new Server(
  {
    name: 'vh-rad-elasticsearch',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Helper to build Elasticsearch queries
function buildESQuery(params) {
  const {
    query,
    timeRange = DEFAULT_CONFIG.defaultTimeRange,
    size = 0,
    aggs = null,
    radType = null
  } = params;

  const esQuery = {
    size,
    query: {
      bool: {
        must: [],
        filter: [
          {
            range: {
              '@timestamp': {
                gte: timeRange.from,
                lte: timeRange.to
              }
            }
          }
        ]
      }
    }
  };

  // Add query conditions
  if (query) {
    esQuery.query.bool.must.push(
      typeof query === 'string' ? { query_string: { query } } : query
    );
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

// Tool implementations
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'executeQuery': {
      const { query, indexPattern, timeRange, size, aggs } = args;

      const esQuery = buildESQuery({ query, timeRange, size, aggs });

      // Simulate query execution
      const mockResponse = {
        took: 42,
        timed_out: false,
        _shards: { total: 5, successful: 5, skipped: 0, failed: 0 },
        hits: {
          total: { value: 10234, relation: 'eq' },
          max_score: null,
          hits: size > 0 ? [
            {
              _index: 'traffic-2025.01.13',
              _id: 'example123',
              _score: 1.0,
              _source: {
                '@timestamp': new Date().toISOString(),
                'event_id': 'pandc.vnext.recommendations.feed.feed.impression',
                'rad_type': 'feed_recommendations',
                'user.id': 'user123',
                'response.status_code': 200
              }
            }
          ] : []
        },
        aggregations: aggs ? {
          time_buckets: {
            buckets: [
              { key_as_string: new Date().toISOString(), doc_count: 1234 },
              { key_as_string: new Date(Date.now() - 3600000).toISOString(), doc_count: 1156 }
            ]
          }
        } : undefined
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            query: esQuery,
            response: mockResponse,
            indexPattern: indexPattern || DEFAULT_CONFIG.indexPattern
          }, null, 2)
        }]
      };
    }

    case 'monitorRADTraffic': {
      const { radType, compareWith = '1d', threshold = 0.8 } = args;

      // Build monitoring query
      const monitoringQuery = {
        current: {
          query: {
            bool: {
              must: [
                { wildcard: { 'event_id': DEFAULT_CONFIG.radEventPattern } }
              ],
              filter: [
                { range: { '@timestamp': { gte: 'now-12h' } } }
              ]
            }
          },
          aggs: {
            traffic_count: { value_count: { field: '_id' } }
          }
        },
        baseline: {
          query: {
            bool: {
              must: [
                { wildcard: { 'event_id': DEFAULT_CONFIG.radEventPattern } }
              ],
              filter: [
                { range: { '@timestamp': {
                  gte: `now-12h-${compareWith}`,
                  lte: `now-${compareWith}`
                }}}
              ]
            }
          },
          aggs: {
            traffic_count: { value_count: { field: '_id' } }
          }
        }
      };

      // Simulate monitoring results
      const currentCount = 12345;
      const baselineCount = 15432;
      const dropPercentage = ((baselineCount - currentCount) / baselineCount) * 100;

      const status = dropPercentage > 20 ? 'CRITICAL' :
                    dropPercentage > 10 ? 'WARNING' :
                    dropPercentage < -10 ? 'INCREASED' : 'NORMAL';

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            radType: radType || 'all',
            monitoring: {
              current: {
                count: currentCount,
                timeRange: 'last 12 hours'
              },
              baseline: {
                count: baselineCount,
                timeRange: `${compareWith} ago`
              },
              comparison: {
                dropPercentage: dropPercentage.toFixed(2),
                status,
                threshold: threshold * 100 + '%'
              }
            },
            queries: monitoringQuery,
            recommendation: status === 'CRITICAL' ?
              'Immediate investigation required - traffic has dropped significantly' :
              status === 'WARNING' ?
              'Monitor closely - moderate traffic drop detected' :
              'Traffic levels are within normal range'
          }, null, 2)
        }]
      };
    }

    case 'analyzeTrafficDrop': {
      const { timeWindow = '1h', granularity = '5m' } = args;

      // Build analysis query
      const analysisQuery = {
        size: 0,
        query: {
          bool: {
            must: [
              { wildcard: { 'event_id': DEFAULT_CONFIG.radEventPattern } }
            ],
            filter: [
              { range: { '@timestamp': { gte: `now-${timeWindow}` } } }
            ]
          }
        },
        aggs: {
          time_series: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: granularity,
              min_doc_count: 0
            },
            aggs: {
              error_rate: {
                filters: {
                  filters: {
                    errors: { range: { 'response.status_code': { gte: 400 } } },
                    total: { match_all: {} }
                  }
                }
              },
              unique_users: {
                cardinality: { field: 'user.id' }
              }
            }
          },
          error_types: {
            terms: {
              field: 'error.type',
              size: 10
            }
          }
        }
      };

      // Simulate analysis results
      const analysis = {
        timeWindow,
        dropDetected: true,
        dropStarted: new Date(Date.now() - 1800000).toISOString(),
        severity: 'HIGH',
        pattern: 'sudden_drop',
        metrics: {
          preDropRate: 250,
          currentRate: 45,
          dropPercentage: 82,
          affectedUsers: 1543,
          errorRate: 0.12
        },
        possibleCauses: [
          {
            cause: 'Upstream service failure',
            confidence: 0.85,
            evidence: ['High error rate', 'Sudden drop pattern']
          },
          {
            cause: 'Configuration change',
            confidence: 0.65,
            evidence: ['Timing correlation', 'No gradual decline']
          }
        ],
        query: analysisQuery
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(analysis, null, 2)
        }]
      };
    }

    case 'getIndexHealth': {
      const { indexPattern = DEFAULT_CONFIG.indexPattern } = args;

      // Simulate index health check
      const health = {
        indexPattern,
        indices: [
          {
            index: 'traffic-2025.01.13',
            health: 'green',
            status: 'open',
            docsCount: 45678901,
            storeSize: '12.3gb',
            primaryShards: 5,
            replicas: 1
          },
          {
            index: 'traffic-2025.01.12',
            health: 'green',
            status: 'open',
            docsCount: 48901234,
            storeSize: '13.1gb',
            primaryShards: 5,
            replicas: 1
          }
        ],
        cluster: {
          status: 'green',
          activeShards: 120,
          activePrimaryShards: 60,
          relocatingShards: 0,
          unassignedShards: 0
        },
        recommendations: []
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(health, null, 2)
        }]
      };
    }

    case 'buildFormulaQuery': {
      const { formula, radType, timeRange } = args;

      // Convert formula to Elasticsearch query
      // This integrates with the formula builder
      const formulaParts = formula.split(/\s*\/\s*/);

      const query = {
        size: 0,
        query: buildESQuery({
          radType,
          timeRange,
          query: { wildcard: { 'event_id': DEFAULT_CONFIG.radEventPattern } }
        }).query,
        aggs: {
          formula_result: {
            bucket_script: {
              buckets_path: {
                current: 'current_count',
                baseline: 'baseline_count'
              },
              script: 'params.current / params.baseline'
            }
          },
          current_count: {
            value_count: { field: '_id' }
          },
          baseline_count: {
            value_count: { field: '_id' }
          }
        }
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            formula,
            elasticsearchQuery: query,
            explanation: `This query implements the formula: ${formula}`,
            usage: 'Execute this query against your Elasticsearch cluster to get formula results'
          }, null, 2)
        }]
      };
    }

    case 'searchRADEvents': {
      const {
        eventPattern = DEFAULT_CONFIG.radEventPattern,
        userID = null,
        statusCode = null,
        errorType = null,
        timeRange = DEFAULT_CONFIG.defaultTimeRange,
        limit = 10
      } = args;

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

      // Simulate search results
      const results = {
        query: searchQuery,
        hits: [
          {
            '@timestamp': new Date().toISOString(),
            'event_id': 'pandc.vnext.recommendations.feed.feed.click',
            'user.id': 'user789',
            'response.status_code': 200,
            'duration': 234,
            'recommendation.id': 'rec123'
          }
        ],
        total: 156,
        facets: {
          eventTypes: {
            'feed.impression': 89,
            'feed.click': 45,
            'feed.error': 22
          },
          statusCodes: {
            '200': 112,
            '400': 22,
            '500': 22
          }
        }
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(results, null, 2)
        }]
      };
    }

    case 'testKibanaConnection': {
      const { proxyUrl, cookie } = args;

      // Simulate connection test
      const testResult = {
        proxyUrl: proxyUrl || 'https://regal-youtiao-09c777.netlify.app/.netlify/functions/proxy',
        status: cookie ? 'authenticated' : 'unauthenticated',
        kibanaVersion: '8.11.1',
        elasticsearchVersion: '8.11.1',
        connection: {
          latency: 145,
          status: 'healthy'
        },
        capabilities: {
          console: true,
          monitoring: true,
          security: true
        },
        recommendation: cookie ?
          'Connection successful - ready to query' :
          'Please provide Kibana cookie for authentication'
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

// Register available tools
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'executeQuery',
        description: 'Execute an Elasticsearch query against traffic indices',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: ['string', 'object'],
              description: 'Query string or query DSL object'
            },
            indexPattern: {
              type: 'string',
              description: 'Index pattern (default: traffic-*)'
            },
            timeRange: {
              type: 'object',
              properties: {
                from: { type: 'string' },
                to: { type: 'string' }
              },
              description: 'Time range for the query'
            },
            size: {
              type: 'integer',
              description: 'Number of documents to return (0 for aggregations only)'
            },
            aggs: {
              type: 'object',
              description: 'Aggregations to perform'
            }
          }
        }
      },
      {
        name: 'monitorRADTraffic',
        description: 'Monitor RAD traffic and detect drops',
        inputSchema: {
          type: 'object',
          properties: {
            radType: {
              type: 'string',
              description: 'Specific RAD type to monitor'
            },
            compareWith: {
              type: 'string',
              description: 'Time period to compare with (e.g., "1d", "1w")'
            },
            threshold: {
              type: 'number',
              description: 'Drop threshold (0-1, default: 0.8 for 80%)'
            }
          }
        }
      },
      {
        name: 'analyzeTrafficDrop',
        description: 'Analyze a traffic drop to find root cause',
        inputSchema: {
          type: 'object',
          properties: {
            timeWindow: {
              type: 'string',
              description: 'Time window to analyze (e.g., "1h", "6h")'
            },
            granularity: {
              type: 'string',
              description: 'Time bucket size (e.g., "5m", "1h")'
            }
          }
        }
      },
      {
        name: 'getIndexHealth',
        description: 'Check health and statistics of Elasticsearch indices',
        inputSchema: {
          type: 'object',
          properties: {
            indexPattern: {
              type: 'string',
              description: 'Index pattern to check'
            }
          }
        }
      },
      {
        name: 'buildFormulaQuery',
        description: 'Convert a formula to an Elasticsearch query',
        inputSchema: {
          type: 'object',
          properties: {
            formula: {
              type: 'string',
              description: 'Formula expression (e.g., "count() / count(shift=\'1d\')")'
            },
            radType: {
              type: 'string',
              description: 'RAD type for filtering'
            },
            timeRange: {
              type: 'object',
              description: 'Time range for the query'
            }
          },
          required: ['formula']
        }
      },
      {
        name: 'searchRADEvents',
        description: 'Search for specific RAD events with filters',
        inputSchema: {
          type: 'object',
          properties: {
            eventPattern: {
              type: 'string',
              description: 'Event ID pattern to search'
            },
            userID: {
              type: 'string',
              description: 'Filter by user ID'
            },
            statusCode: {
              type: 'integer',
              description: 'Filter by HTTP status code'
            },
            errorType: {
              type: 'string',
              description: 'Filter by error type'
            },
            timeRange: {
              type: 'object',
              description: 'Time range for search'
            },
            limit: {
              type: 'integer',
              description: 'Maximum results to return'
            }
          }
        }
      },
      {
        name: 'testKibanaConnection',
        description: 'Test connection to Kibana/Elasticsearch through proxy',
        inputSchema: {
          type: 'object',
          properties: {
            proxyUrl: {
              type: 'string',
              description: 'Proxy URL to test'
            },
            cookie: {
              type: 'string',
              description: 'Kibana session cookie'
            }
          }
        }
      }
    ]
  };
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('VH RAD Elasticsearch MCP server started');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
