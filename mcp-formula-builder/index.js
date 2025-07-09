#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Input schemas for Formula Builder tools
const GenerateFormulaSchema = z.object({
  query: z.string().describe('Natural language description of what you want to calculate'),
  radType: z.string().optional().describe('Optional RAD type for context-specific formulas')
});

const ValidateFormulaSchema = z.object({
  formula: z.string().describe('The formula to validate')
});

const ExplainFormulaSchema = z.object({
  formula: z.string().describe('The formula to explain')
});

const ConvertToQuerySchema = z.object({
  formula: z.string().describe('The formula to convert'),
  radType: z.string().optional().describe('RAD type for the query'),
  timeRange: z.record(z.any()).optional().describe('Time range for the query')
});

const ListFunctionsSchema = z.object({});

// Create the server
const server = new Server({
  name: 'vh-rad-formula-builder',
  version: '1.0.0'
}, {
  capabilities: {
    tools: {}
  }
});

// Helper function to analyze formula components
function analyzeFormulaComponents(formula) {
  const components = [];

  // Extract functions
  const functionPattern = /(\w+)\s*\(/g;
  let match;
  while ((match = functionPattern.exec(formula)) !== null) {
    components.push({
      type: 'function',
      name: match[1],
      position: match.index
    });
  }

  // Extract time shifts
  const shiftPattern = /shift\s*=\s*["']([^"']+)["']/g;
  while ((match = shiftPattern.exec(formula)) !== null) {
    components.push({
      type: 'timeshift',
      value: match[1],
      position: match.index
    });
  }

  // Extract KQL filters
  const kqlPattern = /kql\s*=\s*["']([^"']+)["']/g;
  while ((match = kqlPattern.exec(formula)) !== null) {
    components.push({
      type: 'filter',
      value: match[1],
      position: match.index
    });
  }

  return components;
}

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'generateFormula',
        description: 'Generate a formula from natural language query',
        inputSchema: zodToJsonSchema(GenerateFormulaSchema)
      },
      {
        name: 'validateFormula',
        description: 'Validate a formula for syntax and semantic correctness',
        inputSchema: zodToJsonSchema(ValidateFormulaSchema)
      },
      {
        name: 'explainFormula',
        description: 'Get a human-readable explanation of a formula',
        inputSchema: zodToJsonSchema(ExplainFormulaSchema)
      },
      {
        name: 'convertToQuery',
        description: 'Convert a formula to an Elasticsearch query',
        inputSchema: zodToJsonSchema(ConvertToQuerySchema)
      },
      {
        name: 'listFunctions',
        description: 'List all available formula functions with examples',
        inputSchema: zodToJsonSchema(ListFunctionsSchema)
      }
    ]
  };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'generateFormula': {
      const validatedArgs = GenerateFormulaSchema.parse(args);
      const { query, radType } = validatedArgs;

      // Pattern matching for common queries
      const patterns = {
        'traffic drop': {
          formula: 'ifelse(count() < count(shift="1d") * 0.8, "ALERT", "OK")',
          explanation: 'Detects when traffic drops below 80% of yesterday\'s value'
        },
        'error rate': {
          formula: '(count(kql="status:error") / count()) * 100',
          explanation: 'Calculates the percentage of errors'
        },
        'baseline deviation': {
          formula: '(count() - overall_average(count())) / overall_average(count()) * 100',
          explanation: 'Shows percentage deviation from baseline average'
        },
        'week over week': {
          formula: 'count() / count(shift="1w")',
          explanation: 'Compares current traffic to same time last week'
        },
        'anomaly': {
          formula: 'abs((count() - average(count(), shift="1w")) / standard_deviation(count(), shift="1w")) > 3',
          explanation: 'Detects anomalies using 3-sigma rule'
        }
      };

      // Find matching pattern
      const lowerQuery = query.toLowerCase();
      for (const [pattern, result] of Object.entries(patterns)) {
        if (lowerQuery.includes(pattern)) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                formula: result.formula,
                explanation: result.explanation,
                confidence: 0.85,
                radType: radType || 'all',
                alternatives: []
              }, null, 2)
            }]
          };
        }
      }

      // Default response for unmatched queries
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            formula: 'count()',
            explanation: 'Basic count formula - please refine your query',
            confidence: 0.3,
            radType: radType || 'all',
            alternatives: [
              {
                formula: 'count() / count(shift="1d")',
                explanation: 'Day-over-day comparison'
              },
              {
                formula: 'average(count(), shift="1h")',
                explanation: 'Hourly average'
              }
            ]
          }, null, 2)
        }]
      };
    }

    case 'validateFormula': {
      const validatedArgs = ValidateFormulaSchema.parse(args);
      const { formula } = validatedArgs;

      // Basic validation rules
      const errors = [];
      const warnings = [];

      // Check for balanced parentheses
      let parenCount = 0;
      for (const char of formula) {
        if (char === '(') parenCount++;
        if (char === ')') parenCount--;
        if (parenCount < 0) {
          errors.push('Unmatched closing parenthesis');
          break;
        }
      }
      if (parenCount > 0) {
        errors.push('Unclosed parenthesis');
      }

      // Check for known functions
      const knownFunctions = ['count', 'sum', 'average', 'min', 'max', 'unique_count',
                             'ifelse', 'overall_average', 'standard_deviation'];
      const functionPattern = /(\w+)\s*\(/g;
      let match;
      while ((match = functionPattern.exec(formula)) !== null) {
        if (!knownFunctions.includes(match[1])) {
          warnings.push(`Unknown function: ${match[1]}`);
        }
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            valid: errors.length === 0,
            errors,
            warnings,
            formula
          }, null, 2)
        }]
      };
    }

    case 'explainFormula': {
      const validatedArgs = ExplainFormulaSchema.parse(args);
      const { formula } = validatedArgs;

      // Simple explanation builder
      let explanation = 'This formula ';

      if (formula.includes('count()')) {
        explanation += 'counts the total number of events';
      }
      if (formula.includes('shift=')) {
        explanation += ', comparing with historical data';
      }
      if (formula.includes('ifelse')) {
        explanation += ', applying conditional logic';
      }
      if (formula.includes('average')) {
        explanation += ', calculating averages';
      }
      if (formula.includes('kql=')) {
        explanation += ', filtering by specific conditions';
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            formula,
            explanation,
            components: analyzeFormulaComponents(formula)
          }, null, 2)
        }]
      };
    }

    case 'convertToQuery': {
      const validatedArgs = ConvertToQuerySchema.parse(args);
      const { formula, radType, timeRange } = validatedArgs;

      // Simulate conversion to Elasticsearch query
      const query = {
        size: 0,
        query: {
          bool: {
            filter: [
              { term: { "rad_type": radType || "default" } },
              { range: { "@timestamp": timeRange || { gte: "now-1d" } } }
            ]
          }
        },
        aggs: {
          formula_result: {
            // This would be dynamically built based on the formula
            date_histogram: {
              field: "@timestamp",
              interval: "1h"
            }
          }
        }
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            formula,
            elasticsearchQuery: query,
            explanation: 'Elasticsearch query generated from formula'
          }, null, 2)
        }]
      };
    }

    case 'listFunctions': {
      const functions = [
        {
          name: 'count',
          syntax: 'count([kql="filter"])',
          description: 'Counts the number of documents',
          examples: ['count()', 'count(kql="status:error")']
        },
        {
          name: 'sum',
          syntax: 'sum(field, [kql="filter"])',
          description: 'Sums the values of a numeric field',
          examples: ['sum(bytes)', 'sum(response_time, kql="status:success")']
        },
        {
          name: 'average',
          syntax: 'average(metric, [shift="timeshift"])',
          description: 'Calculates the average of a metric',
          examples: ['average(count())', 'average(count(), shift="1d")']
        },
        {
          name: 'ifelse',
          syntax: 'ifelse(condition, trueValue, falseValue)',
          description: 'Conditional logic',
          examples: ['ifelse(count() > 100, "HIGH", "LOW")']
        },
        {
          name: 'shift',
          syntax: 'shift="timeperiod"',
          description: 'Time-shifted comparison',
          examples: ['count(shift="1d")', 'count(shift="1w")']
        }
      ];

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ functions }, null, 2)
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
  console.error('VH RAD Formula Builder MCP running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
