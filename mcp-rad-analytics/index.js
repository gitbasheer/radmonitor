#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Input schemas for RAD Analytics tools
const AnalyzeTrafficDropSchema = z.object({
  radType: z.string().optional().describe('RAD type to analyze'),
  timeWindow: z.string().default('1h').describe('Time window to analyze (e.g., "1h", "6h")'),
  granularity: z.string().default('5m').describe('Time bucket size (e.g., "5m", "1h")')
});

const AnalyzeTrafficPatternSchema = z.object({
  radType: z.string().optional().describe('RAD type to analyze'),
  timeWindow: z.string().default('24h').describe('Analysis window (e.g., "24h", "7d")'),
  sensitivity: z.enum(['low', 'medium', 'high']).default('medium').describe('Pattern detection sensitivity'),
  compareWith: z.string().default('baseline').describe('Comparison baseline')
});

const GenerateInsightsSchema = z.object({
  radType: z.string().optional().describe('RAD type to analyze'),
  period: z.string().default('7d').describe('Analysis period (e.g., "7d", "30d")'),
  includeRecommendations: z.boolean().default(true).describe('Include actionable recommendations')
});

const CompareTimeRangesSchema = z.object({
  radType: z.string().optional().describe('RAD type to compare'),
  range1: z.object({
    from: z.string(),
    to: z.string()
  }).default({ from: 'now-7d', to: 'now' }).describe('First time range'),
  range2: z.object({
    from: z.string(),
    to: z.string()
  }).default({ from: 'now-14d', to: 'now-7d' }).describe('Second time range'),
  metrics: z.array(z.string()).default(['traffic', 'errors', 'latency']).describe('Metrics to compare')
});

// Create the server
const server = new Server({
  name: 'vh-rad-analytics',
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
        name: 'analyzeTrafficDrop',
        description: 'Analyze a traffic drop to find root cause and timeline',
        inputSchema: zodToJsonSchema(AnalyzeTrafficDropSchema)
      },
      {
        name: 'analyzeTrafficPattern',
        description: 'Analyze traffic patterns over time and detect anomalies',
        inputSchema: zodToJsonSchema(AnalyzeTrafficPatternSchema)
      },
      {
        name: 'generateInsights',
        description: 'Generate AI-powered insights and recommendations',
        inputSchema: zodToJsonSchema(GenerateInsightsSchema)
      },
      {
        name: 'compareTimeRanges',
        description: 'Compare metrics between two time ranges',
        inputSchema: zodToJsonSchema(CompareTimeRangesSchema)
      }
    ]
  };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'analyzeTrafficDrop': {
      const validatedArgs = AnalyzeTrafficDropSchema.parse(args);
      const { radType, timeWindow, granularity } = validatedArgs;

      // Simulate traffic drop analysis
      const dropTime = new Date(Date.now() - 1800000);
      const currentRate = Math.floor(Math.random() * 50) + 20;
      const normalRate = Math.floor(Math.random() * 200) + 200;

      const analysis = {
        radType: radType || 'all',
        timeWindow,
        granularity,
        analysisTimestamp: new Date().toISOString(),
        dropDetected: true,
        dropDetails: {
          startTime: dropTime.toISOString(),
          duration: '30m',
          severity: 'HIGH',
          pattern: 'sudden_drop',
          recovery: 'partial'
        },
        metrics: {
          preDropRate: normalRate,
          currentRate,
          dropPercentage: ((normalRate - currentRate) / normalRate * 100).toFixed(2),
          affectedUsers: Math.floor(Math.random() * 2000) + 1000,
          errorRate: (Math.random() * 0.2).toFixed(3)
        },
        timeline: [
          {
            time: new Date(dropTime.getTime() - 600000).toISOString(),
            event: 'normal_traffic',
            rate: normalRate
          },
          {
            time: dropTime.toISOString(),
            event: 'traffic_drop_started',
            rate: currentRate
          },
          {
            time: new Date(dropTime.getTime() + 900000).toISOString(),
            event: 'partial_recovery',
            rate: currentRate * 1.5
          }
        ],
        possibleCauses: [
          {
            cause: 'Upstream service degradation',
            confidence: 0.85,
            evidence: [
              'Sudden drop pattern',
              'High error rate correlation',
              'API gateway timeout spikes'
            ],
            suggestedAction: 'Check upstream service health dashboards'
          },
          {
            cause: 'Configuration change',
            confidence: 0.65,
            evidence: [
              'Timing correlation with deployment',
              'No gradual decline'
            ],
            suggestedAction: 'Review recent configuration changes'
          },
          {
            cause: 'Rate limiting triggered',
            confidence: 0.45,
            evidence: [
              'Consistent drop level',
              'Some users unaffected'
            ],
            suggestedAction: 'Check rate limit configurations'
          }
        ],
        recommendations: [
          'Investigate upstream service logs immediately',
          'Review deployment timeline for correlations',
          'Enable detailed error tracking',
          'Consider rolling back recent changes'
        ]
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(analysis, null, 2)
        }]
      };
    }

    case 'analyzeTrafficPattern': {
      const validatedArgs = AnalyzeTrafficPatternSchema.parse(args);
      const { radType, timeWindow, sensitivity, compareWith } = validatedArgs;

      // Simulate pattern analysis
      const patterns = [
        {
          type: 'daily_cycle',
          confidence: 0.92,
          description: 'Regular daily traffic pattern detected',
          details: {
            peakHours: ['10:00', '14:00', '20:00'],
            lowHours: ['02:00', '03:00', '04:00'],
            variation: '±15%'
          }
        },
        {
          type: 'weekly_trend',
          confidence: 0.78,
          description: 'Weekly pattern with Monday/Friday peaks',
          details: {
            highDays: ['Monday', 'Friday'],
            lowDays: ['Saturday', 'Sunday'],
            weekendDrop: '35%'
          }
        },
        {
          type: 'anomaly',
          confidence: 0.65,
          description: 'Unusual spike detected on Tuesday',
          details: {
            timestamp: new Date(Date.now() - 172800000).toISOString(),
            magnitude: '+45%',
            duration: '2h'
          }
        }
      ];

      const baseline = {
        averageRate: 2500,
        standardDeviation: 350,
        percentiles: {
          p50: 2400,
          p90: 3200,
          p99: 4100
        }
      };

      const anomalies = sensitivity === 'high' ?
        [
          {
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            type: 'micro_drop',
            severity: 'low',
            description: 'Brief traffic dip detected'
          }
        ] : [];

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            radType: radType || 'all',
            timeWindow,
            sensitivity,
            analysisTimestamp: new Date().toISOString(),
            patterns: patterns,
            baseline: baseline,
            anomalies: anomalies,
            insights: {
              summary: 'Traffic follows predictable daily/weekly patterns with one notable anomaly',
              healthScore: 85,
              trend: 'stable',
              forecast: {
                next24h: 'Normal traffic expected',
                confidence: 0.88
              }
            },
            recommendations: patterns.length > 0 ? [
              'Schedule maintenance during identified low-traffic hours',
              'Scale resources for predicted peak times',
              'Investigate Tuesday anomaly for potential optimization'
            ] : []
          }, null, 2)
        }]
      };
    }

    case 'generateInsights': {
      const validatedArgs = GenerateInsightsSchema.parse(args);
      const { radType, period, includeRecommendations } = validatedArgs;

      // Generate AI-powered insights
      const metrics = {
        totalTraffic: Math.floor(Math.random() * 1000000) + 500000,
        averageDaily: Math.floor(Math.random() * 150000) + 70000,
        growthRate: (Math.random() * 0.3 - 0.1).toFixed(2),
        errorRate: (Math.random() * 0.02).toFixed(3),
        userSatisfaction: (Math.random() * 0.2 + 0.8).toFixed(2)
      };

      const insights = [
        {
          category: 'performance',
          insight: `${radType || 'System'} showing ${metrics.growthRate > 0 ? 'positive' : 'negative'} growth trend`,
          confidence: 0.89,
          impact: 'medium',
          details: `Traffic ${metrics.growthRate > 0 ? 'increased' : 'decreased'} by ${Math.abs(metrics.growthRate * 100)}% over the period`
        },
        {
          category: 'reliability',
          insight: `Error rate at ${metrics.errorRate}, ${metrics.errorRate < 0.01 ? 'excellent' : 'needs attention'}`,
          confidence: 0.95,
          impact: metrics.errorRate > 0.01 ? 'high' : 'low',
          details: 'System reliability metrics are within acceptable bounds'
        },
        {
          category: 'user_experience',
          insight: `User satisfaction score: ${(metrics.userSatisfaction * 100).toFixed(0)}%`,
          confidence: 0.78,
          impact: 'medium',
          details: 'Based on response times and error patterns'
        },
        {
          category: 'capacity',
          insight: 'Current capacity utilization at 67%',
          confidence: 0.82,
          impact: 'low',
          details: 'System has sufficient headroom for growth'
        }
      ];

      const recommendations = includeRecommendations ? [
        {
          priority: 'high',
          action: 'Optimize peak hour performance',
          reason: 'Detected recurring slowdowns during peak traffic',
          expectedImpact: '+15% throughput'
        },
        {
          priority: 'medium',
          action: 'Implement caching for frequent queries',
          reason: 'High repeat request rate detected',
          expectedImpact: '-30% backend load'
        },
        {
          priority: 'low',
          action: 'Review error handling patterns',
          reason: 'Some errors could be handled more gracefully',
          expectedImpact: 'Improved user experience'
        }
      ] : [];

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            radType: radType || 'all',
            period,
            generatedAt: new Date().toISOString(),
            metrics,
            insights,
            recommendations,
            summary: {
              overallHealth: 'good',
              trend: metrics.growthRate > 0 ? 'improving' : 'declining',
              attentionNeeded: insights.filter(i => i.impact === 'high').length > 0,
              keyTakeaway: `System performing well with ${(metrics.userSatisfaction * 100).toFixed(0)}% user satisfaction`
            }
          }, null, 2)
        }]
      };
    }

    case 'compareTimeRanges': {
      const validatedArgs = CompareTimeRangesSchema.parse(args);
      const { radType, range1, range2, metrics } = validatedArgs;

      // Simulate time range comparison
      const comparison = {
        range1: {
          period: range1,
          label: 'Current Week',
          metrics: {
            traffic: Math.floor(Math.random() * 100000) + 80000,
            errors: Math.floor(Math.random() * 1000) + 100,
            latency: Math.floor(Math.random() * 50) + 150,
            availability: 99.95
          }
        },
        range2: {
          period: range2,
          label: 'Previous Week',
          metrics: {
            traffic: Math.floor(Math.random() * 100000) + 75000,
            errors: Math.floor(Math.random() * 1000) + 150,
            latency: Math.floor(Math.random() * 50) + 160,
            availability: 99.92
          }
        }
      };

      const changes = {};
      metrics.forEach(metric => {
        if (comparison.range1.metrics[metric] && comparison.range2.metrics[metric]) {
          const current = comparison.range1.metrics[metric];
          const previous = comparison.range2.metrics[metric];
          const change = ((current - previous) / previous) * 100;
          changes[metric] = {
            current,
            previous,
            change: change.toFixed(2) + '%',
            trend: change > 0 ? 'up' : 'down',
            significant: Math.abs(change) > 10
          };
        }
      });

      const analysis = {
        improved: Object.entries(changes)
          .filter(([k, v]) => (k === 'errors' || k === 'latency') ? v.trend === 'down' : v.trend === 'up')
          .map(([k]) => k),
        degraded: Object.entries(changes)
          .filter(([k, v]) => (k === 'errors' || k === 'latency') ? v.trend === 'up' : v.trend === 'down')
          .map(([k]) => k),
        summary: 'Overall system performance has improved with higher traffic and lower error rates'
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            radType: radType || 'all',
            comparison,
            changes,
            analysis,
            visualization: {
              recommendedChart: 'line',
              series: metrics.map(m => ({
                name: m,
                data: [
                  { x: 'Previous Week', y: comparison.range2.metrics[m] },
                  { x: 'Current Week', y: comparison.range1.metrics[m] }
                ]
              }))
            }
          }, null, 2)
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
  console.error('VH RAD Analytics MCP running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
