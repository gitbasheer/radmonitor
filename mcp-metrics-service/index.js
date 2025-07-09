#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Input schemas for Metrics Service tools
const FetchMetricsSchema = z.object({
  radType: z.string().optional().describe('RAD type to fetch metrics for'),
  timeRange: z.object({
    from: z.string(),
    to: z.string()
  }).optional().describe('Time range for the query'),
  formula: z.string().optional().describe('Formula to apply to the data')
});

const GetAvailableRadTypesSchema = z.object({});

const ValidateDataConnectionSchema = z.object({
  endpoint: z.string().optional().describe('API endpoint to test'),
  apiKey: z.string().optional().describe('API key for authentication')
});

const GetHistoricalDataSchema = z.object({
  radType: z.string().optional().describe('RAD type to fetch data for'),
  startDate: z.string().optional().describe('Start date (ISO format)'),
  endDate: z.string().optional().describe('End date (ISO format)'),
  interval: z.enum(['hour', 'day', 'week']).default('day').describe('Data aggregation interval'),
  aggregation: z.enum(['sum', 'average', 'max', 'min']).default('sum').describe('Aggregation method')
});

const AnalyzeTrafficPatternSchema = z.object({
  radType: z.string().optional().describe('RAD type to analyze'),
  timeWindow: z.string().default('24h').describe('Time window for analysis (e.g., "24h", "7d")')
});

// Create the server
const server = new Server({
  name: 'vh-rad-metrics-service',
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
        name: 'fetchMetrics',
        description: 'Fetch RAD metrics with optional formula application',
        inputSchema: zodToJsonSchema(FetchMetricsSchema)
      },
      {
        name: 'getAvailableRadTypes',
        description: 'Get list of configured RAD types',
        inputSchema: zodToJsonSchema(GetAvailableRadTypesSchema)
      },
      {
        name: 'validateDataConnection',
        description: 'Test connection to data source',
        inputSchema: zodToJsonSchema(ValidateDataConnectionSchema)
      },
      {
        name: 'getHistoricalData',
        description: 'Retrieve historical metrics data',
        inputSchema: zodToJsonSchema(GetHistoricalDataSchema)
      },
      {
        name: 'analyzeTrafficPattern',
        description: 'Analyze traffic patterns and detect anomalies',
        inputSchema: zodToJsonSchema(AnalyzeTrafficPatternSchema)
      }
    ]
  };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'fetchMetrics': {
      const validatedArgs = FetchMetricsSchema.parse(args);
      const { radType, timeRange, formula } = validatedArgs;

      // Simulate fetching metrics
      const mockData = {
        radType: radType || 'all',
        timeRange: timeRange || { from: 'now-24h', to: 'now' },
        formula: formula || 'count()',
        data: [
          { timestamp: new Date().toISOString(), value: 1234 },
          { timestamp: new Date(Date.now() - 3600000).toISOString(), value: 1156 },
          { timestamp: new Date(Date.now() - 7200000).toISOString(), value: 1089 }
        ],
        metadata: {
          totalHits: 3,
          formulaResult: 1234,
          status: 'success'
        }
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(mockData, null, 2)
        }]
      };
    }

    case 'getAvailableRadTypes': {
      // Simulate reading RAD types configuration
      const radTypes = [
        { id: 'checkout_flow', name: 'Checkout Flow', description: 'E-commerce checkout process' },
        { id: 'api_gateway', name: 'API Gateway', description: 'API gateway traffic' },
        { id: 'user_auth', name: 'User Authentication', description: 'Authentication events' },
        { id: 'feed_recommendations', name: 'Feed Recommendations', description: 'Recommendation feed events' },
        { id: 'discover_tiles', name: 'Discover Tiles', description: 'Discovery tile interactions' }
      ];

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            radTypes,
            timestamp: new Date().toISOString(),
            total: radTypes.length
          }, null, 2)
        }]
      };
    }

    case 'validateDataConnection': {
      const validatedArgs = ValidateDataConnectionSchema.parse(args);
      const { endpoint, apiKey } = validatedArgs;

      // Simulate connection validation
      const hasApiKey = !!apiKey;
      const connectionSuccessful = Math.random() > 0.05; // 95% success rate

      const validation = {
        endpoint: endpoint || 'default-elasticsearch-endpoint',
        status: connectionSuccessful ? 'connected' : 'failed',
        authentication: hasApiKey ? 'authenticated' : 'unauthenticated',
        latency: connectionSuccessful ? Math.floor(Math.random() * 100) + 50 : null,
        timestamp: new Date().toISOString(),
        capabilities: connectionSuccessful ? {
          formulas: true,
          realtime: true,
          historical: true,
          aggregations: true
        } : null,
        error: connectionSuccessful ? null : 'Connection timeout',
        recommendation: !hasApiKey ?
          'Consider providing API key for authenticated access' :
          connectionSuccessful ?
          'Connection successful - all features available' :
          'Check endpoint URL and network connectivity'
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(validation, null, 2)
        }]
      };
    }

    case 'getHistoricalData': {
      const validatedArgs = GetHistoricalDataSchema.parse(args);
      const { radType, startDate, endDate, interval, aggregation } = validatedArgs;

      // Generate mock historical data
      const data = [];
      const start = new Date(startDate || Date.now() - 7 * 24 * 60 * 60 * 1000);
      const end = new Date(endDate || Date.now());
      const intervalMs = interval === 'hour' ? 3600000 :
                       interval === 'week' ? 7 * 24 * 3600000 :
                       86400000; // day

      for (let time = start.getTime(); time <= end.getTime(); time += intervalMs) {
        data.push({
          timestamp: new Date(time).toISOString(),
          value: Math.floor(Math.random() * 1000) + 500,
          radType: radType || 'all'
        });
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            query: {
              radType: radType || 'all',
              startDate: start.toISOString(),
              endDate: end.toISOString(),
              interval,
              aggregation
            },
            data,
            metadata: {
              points: data.length,
              aggregationType: aggregation,
              dataRange: {
                min: Math.min(...data.map(d => d.value)),
                max: Math.max(...data.map(d => d.value)),
                average: Math.round(data.reduce((sum, d) => sum + d.value, 0) / data.length)
              }
            }
          }, null, 2)
        }]
      };
    }

    case 'analyzeTrafficPattern': {
      const validatedArgs = AnalyzeTrafficPatternSchema.parse(args);
      const { radType, timeWindow } = validatedArgs;

      // Simulate pattern analysis
      const baseTraffic = Math.floor(Math.random() * 1000) + 1000;
      const analysis = {
        radType: radType || 'all',
        timeWindow,
        analysisTimestamp: new Date().toISOString(),
        patterns: {
          trend: ['stable', 'increasing', 'decreasing'][Math.floor(Math.random() * 3)],
          averageTraffic: baseTraffic,
          peakHour: Math.floor(Math.random() * 24),
          lowHour: Math.floor(Math.random() * 24),
          dayOfWeekPattern: {
            monday: 1.1,
            tuesday: 1.0,
            wednesday: 0.95,
            thursday: 1.05,
            friday: 1.2,
            saturday: 0.8,
            sunday: 0.7
          },
          hourlyPattern: Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            multiplier: Math.sin((i - 6) * Math.PI / 12) * 0.3 + 1
          }))
        },
        anomalies: Math.random() > 0.7 ? [
          {
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            type: 'spike',
            severity: 'medium',
            description: 'Unusual traffic increase detected'
          }
        ] : [],
        insights: [
          `Traffic shows a ${['stable', 'increasing', 'decreasing'][Math.floor(Math.random() * 3)]} trend`,
          'Peak activity occurs during business hours',
          'Weekend traffic is 25% lower than weekdays'
        ],
        recommendations: [
          'Traffic patterns are within normal range',
          'Consider scaling during peak hours (2-3 PM)',
          'Monitor weekend performance for optimization opportunities'
        ]
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(analysis, null, 2)
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
  console.error('VH RAD Metrics Service MCP running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
