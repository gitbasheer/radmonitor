#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Input schemas for RAD Monitor tools
const MonitorRADTrafficSchema = z.object({
  radType: z.string().optional().describe('Specific RAD type to monitor (e.g., checkout_flow)'),
  compareWith: z.string().default('1d').describe('Time period to compare with (e.g., "1d", "1w")'),
  threshold: z.number().default(0.8).describe('Drop threshold (0-1, default: 0.8 for 80%)')
});

const DetectAnomaliesSchema = z.object({
  radType: z.string().optional().describe('RAD type to analyze'),
  timeWindow: z.string().default('1h').describe('Time window to analyze (e.g., "1h", "6h")'),
  sensitivity: z.enum(['low', 'medium', 'high']).default('medium').describe('Detection sensitivity level')
});

const AlertOnThresholdsSchema = z.object({
  radTypes: z.array(z.string()).default([]).describe('RAD types to check (empty for all)'),
  customThresholds: z.record(z.number()).default({}).describe('Custom thresholds per RAD type'),
  includeMetrics: z.boolean().default(true).describe('Include all metrics or just alerts')
});

const GetRealtimeStatusSchema = z.object({
  includeHistory: z.boolean().default(false).describe('Include recent status history')
});

// Create the server
const server = new Server({
  name: 'vh-rad-monitor',
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
        name: 'monitorRADTraffic',
        description: 'Monitor RAD traffic in real-time and detect drops',
        inputSchema: zodToJsonSchema(MonitorRADTrafficSchema)
      },
      {
        name: 'detectAnomalies',
        description: 'Detect anomalies in RAD traffic patterns',
        inputSchema: zodToJsonSchema(DetectAnomaliesSchema)
      },
      {
        name: 'alertOnThresholds',
        description: 'Check multiple RAD types against configured thresholds',
        inputSchema: zodToJsonSchema(AlertOnThresholdsSchema)
      },
      {
        name: 'getRealtimeStatus',
        description: 'Get real-time status of all RAD systems',
        inputSchema: zodToJsonSchema(GetRealtimeStatusSchema)
      }
    ]
  };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'monitorRADTraffic': {
      const validatedArgs = MonitorRADTrafficSchema.parse(args);
      const { radType, compareWith, threshold } = validatedArgs;

      // Simulate real-time monitoring
      const currentCount = Math.floor(Math.random() * 5000) + 10000;
      const baselineCount = Math.floor(Math.random() * 5000) + 12000;
      const dropPercentage = ((baselineCount - currentCount) / baselineCount) * 100;

      const status = dropPercentage > 50 ? 'CRITICAL' :
                    dropPercentage > 20 ? 'WARNING' :
                    dropPercentage < -10 ? 'INCREASED' : 'NORMAL';

      const alert = status === 'CRITICAL' || status === 'WARNING';

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            radType: radType || 'all',
            timestamp: new Date().toISOString(),
            monitoring: {
              current: {
                count: currentCount,
                timeRange: 'last 12h'
              },
              baseline: {
                count: baselineCount,
                timeRange: `${compareWith} ago`
              },
              comparison: {
                dropPercentage: dropPercentage.toFixed(2),
                status,
                threshold: (threshold * 100) + '%',
                alert
              }
            },
            recommendation: status === 'CRITICAL' ?
              'IMMEDIATE ACTION REQUIRED: Traffic has dropped significantly. Check system health and recent deployments.' :
              status === 'WARNING' ?
              'Monitor closely - moderate traffic drop detected. Review recent changes.' :
              status === 'INCREASED' ?
              'Traffic has increased - ensure systems can handle the load.' :
              'Traffic levels are within normal range.'
          }, null, 2)
        }]
      };
    }

    case 'detectAnomalies': {
      const validatedArgs = DetectAnomaliesSchema.parse(args);
      const { radType, timeWindow, sensitivity } = validatedArgs;

      // Simulate anomaly detection
      const sensitivityThresholds = {
        low: 0.3,
        medium: 0.2,
        high: 0.1
      };

      const thresholdVal = sensitivityThresholds[sensitivity];
      const anomalyScore = Math.random();
      const anomalyDetected = anomalyScore > (1 - thresholdVal);

      const anomalies = anomalyDetected ? [
        {
          type: 'traffic_spike',
          timestamp: new Date(Date.now() - 900000).toISOString(),
          severity: 'medium',
          confidence: 0.82,
          description: 'Unusual traffic spike detected'
        },
        {
          type: 'error_rate_increase',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          severity: 'low',
          confidence: 0.65,
          description: 'Error rate increased by 15%'
        }
      ] : [];

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            radType: radType || 'all',
            timeWindow,
            sensitivity,
            scanTimestamp: new Date().toISOString(),
            anomaliesDetected: anomalyDetected,
            anomalies,
            summary: anomalyDetected ?
              `${anomalies.length} anomalies detected in the last ${timeWindow}` :
              'No anomalies detected - system operating normally',
            nextScan: new Date(Date.now() + 300000).toISOString()
          }, null, 2)
        }]
      };
    }

    case 'alertOnThresholds': {
      const validatedArgs = AlertOnThresholdsSchema.parse(args);
      const { radTypes, customThresholds, includeMetrics } = validatedArgs;

      // Check multiple RAD types against thresholds
      const radTypesToCheck = radTypes.length > 0 ? radTypes :
        ['checkout_flow', 'api_gateway', 'user_auth'];

      const alerts = radTypesToCheck.map(radType => {
        const currentValue = Math.floor(Math.random() * 1000) + 500;
        const threshold = customThresholds[radType] || 800;
        const triggered = currentValue < threshold;

        return {
          radType,
          metric: 'traffic_count',
          currentValue,
          threshold,
          triggered,
          severity: triggered ? 'high' : 'none',
          message: triggered ?
            `${radType} traffic (${currentValue}) below threshold (${threshold})` :
            `${radType} traffic normal`
        };
      });

      const triggeredAlerts = alerts.filter(a => a.triggered);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            checkTimestamp: new Date().toISOString(),
            totalChecked: alerts.length,
            alertsTriggered: triggeredAlerts.length,
            alerts: includeMetrics ? alerts : triggeredAlerts,
            summary: triggeredAlerts.length > 0 ?
              `${triggeredAlerts.length} alerts triggered - immediate attention required` :
              'All systems operating within thresholds',
            actions: triggeredAlerts.map(a => ({
              radType: a.radType,
              action: 'investigate',
              priority: a.severity
            }))
          }, null, 2)
        }]
      };
    }

    case 'getRealtimeStatus': {
      const validatedArgs = GetRealtimeStatusSchema.parse(args);
      const { includeHistory } = validatedArgs;

      // Get current system status
      const radTypes = ['checkout_flow', 'api_gateway', 'user_auth'];

      const statusData = radTypes.map(radType => ({
        radType,
        status: Math.random() > 0.8 ? 'degraded' : 'healthy',
        lastUpdate: new Date().toISOString(),
        metrics: {
          requestsPerMinute: Math.floor(Math.random() * 500) + 100,
          errorRate: (Math.random() * 0.05).toFixed(3),
          avgResponseTime: Math.floor(Math.random() * 200) + 50
        }
      }));

      const overallStatus = statusData.some(s => s.status === 'degraded') ?
        'degraded' : 'healthy';

      const response = {
        timestamp: new Date().toISOString(),
        overallStatus,
        systems: statusData,
        alerts: {
          active: statusData.filter(s => s.status === 'degraded').length,
          acknowledged: 0,
          resolved: includeHistory ? 3 : undefined
        },
        nextUpdate: new Date(Date.now() + 60000).toISOString()
      };

      if (includeHistory) {
        response.history = [
          {
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            status: 'healthy',
            duration: '45m'
          },
          {
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            status: 'degraded',
            duration: '15m'
          }
        ];
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response, null, 2)
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
  console.error('VH RAD Monitor MCP running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
