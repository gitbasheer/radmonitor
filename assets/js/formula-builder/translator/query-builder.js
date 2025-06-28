/**
 * Query Builder - Converts Formula AST to Elasticsearch Queries
 */

import { ASTNodeTypes, FunctionTypes } from '../core/formula-types.js';

export class QueryBuilder {
  constructor() {
    this.aggregations = {};
    this.bucketCounter = 0;
    this.timeRange = null;
    this.filters = [];
  }

  /**
   * Build Elasticsearch query from formula AST
   * @param {Object} ast - The formula AST
   * @param {Object} context - Query context (index, time range, etc.)
   * @returns {Object} Elasticsearch query
   */
  buildQuery(ast, context = {}) {
    this.reset();
    this.timeRange = context.timeRange;
    this.filters = context.filters || [];

    // Process the AST to extract aggregations
    this.processNode(ast);

    // Build the final query
    return this.constructElasticsearchQuery(context);
  }

  reset() {
    this.aggregations = {};
    this.bucketCounter = 0;
  }

  processNode(node) {
    switch (node.type) {
      case ASTNodeTypes.FUNCTION_CALL:
        return this.processFunctionCall(node);

      case ASTNodeTypes.BINARY_OPERATION:
        // Process both sides of the operation
        this.processNode(node.left);
        this.processNode(node.right);
        break;

      case ASTNodeTypes.LITERAL:
      case ASTNodeTypes.FIELD_REFERENCE:
        // These don't generate aggregations directly
        break;
    }
  }

  processFunctionCall(node) {
    const { name, arguments: args, namedArguments } = node;

    // Handle Elasticsearch aggregation functions
    if (this.isElasticsearchFunction(name)) {
      return this.createElasticsearchAggregation(name, args, namedArguments);
    }

    // Handle time series functions (they wrap ES functions)
    if (this.isTimeSeriesFunction(name)) {
      // Process the metric argument
      if (args[0] && args[0].type === ASTNodeTypes.FUNCTION_CALL) {
        this.processNode(args[0]);
      }
    }

    // Process nested function calls in arguments
    args.forEach(arg => {
      if (arg.type === ASTNodeTypes.FUNCTION_CALL) {
        this.processNode(arg);
      }
    });
  }

  createElasticsearchAggregation(functionName, args, namedArgs) {
    const bucketId = `${this.bucketCounter++}-bucket`;

    // Build the aggregation based on function type
    switch (functionName) {
      case FunctionTypes.COUNT:
        return this.createCountAggregation(bucketId, args[0], namedArgs);

      case FunctionTypes.AVERAGE:
        return this.createAvgAggregation(bucketId, args[0], namedArgs);

      case FunctionTypes.SUM:
        return this.createSumAggregation(bucketId, args[0], namedArgs);

      case FunctionTypes.MAX:
        return this.createMaxAggregation(bucketId, args[0], namedArgs);

      case FunctionTypes.MIN:
        return this.createMinAggregation(bucketId, args[0], namedArgs);

      case FunctionTypes.PERCENTILE:
        return this.createPercentileAggregation(bucketId, args[0], namedArgs);

      // Add more cases as needed
    }

    return bucketId;
  }

  createCountAggregation(bucketId, field, namedArgs) {
    const agg = {};

    if (namedArgs.kql) {
      // Create a filter bucket for KQL
      agg.filter = {
        bool: {
          must: [],
          filter: [this.parseKQLFilter(namedArgs.kql.value)],
          should: [],
          must_not: []
        }
      };
    } else if (field) {
      // Count specific field values
      agg.value_count = {
        field: field.field || field.value
      };
    } else {
      // Simple doc count - no explicit aggregation needed
      // This will be handled by the bucket doc_count
    }

    this.aggregations[bucketId] = agg;
    return bucketId;
  }

  createAvgAggregation(bucketId, field, namedArgs) {
    const agg = {
      avg: {
        field: field.field || field.value
      }
    };

    if (namedArgs.kql) {
      // Wrap in filter
      this.aggregations[bucketId] = {
        filter: {
          bool: {
            must: [],
            filter: [this.parseKQLFilter(namedArgs.kql.value)],
            should: [],
            must_not: []
          }
        },
        aggs: {
          'filtered_avg': agg
        }
      };
    } else {
      this.aggregations[bucketId] = agg;
    }

    return bucketId;
  }

  createSumAggregation(bucketId, field, namedArgs) {
    const agg = {
      sum: {
        field: field.field || field.value
      }
    };

    if (namedArgs.kql) {
      this.aggregations[bucketId] = {
        filter: {
          bool: {
            must: [],
            filter: [this.parseKQLFilter(namedArgs.kql.value)],
            should: [],
            must_not: []
          }
        },
        aggs: {
          'filtered_sum': agg
        }
      };
    } else {
      this.aggregations[bucketId] = agg;
    }

    return bucketId;
  }

  createMaxAggregation(bucketId, field, namedArgs) {
    const agg = {
      max: {
        field: field.field || field.value
      }
    };

    if (namedArgs.kql) {
      this.aggregations[bucketId] = {
        filter: {
          bool: {
            must: [],
            filter: [this.parseKQLFilter(namedArgs.kql.value)],
            should: [],
            must_not: []
          }
        },
        aggs: {
          'filtered_max': agg
        }
      };
    } else {
      this.aggregations[bucketId] = agg;
    }

    return bucketId;
  }

  createMinAggregation(bucketId, field, namedArgs) {
    const agg = {
      min: {
        field: field.field || field.value
      }
    };

    if (namedArgs.kql) {
      this.aggregations[bucketId] = {
        filter: {
          bool: {
            must: [],
            filter: [this.parseKQLFilter(namedArgs.kql.value)],
            should: [],
            must_not: []
          }
        },
        aggs: {
          'filtered_min': agg
        }
      };
    } else {
      this.aggregations[bucketId] = agg;
    }

    return bucketId;
  }

  createPercentileAggregation(bucketId, field, namedArgs) {
    const percentile = namedArgs.percentile ? namedArgs.percentile.value : 50;

    const agg = {
      percentiles: {
        field: field.field || field.value,
        percents: [percentile]
      }
    };

    if (namedArgs.kql) {
      this.aggregations[bucketId] = {
        filter: {
          bool: {
            must: [],
            filter: [this.parseKQLFilter(namedArgs.kql.value)],
            should: [],
            must_not: []
          }
        },
        aggs: {
          'filtered_percentile': agg
        }
      };
    } else {
      this.aggregations[bucketId] = agg;
    }

    return bucketId;
  }

  parseKQLFilter(kql) {
    // Parse KQL into Elasticsearch query
    // This is a simplified version - you'd want a full KQL parser

    // Handle @timestamp comparisons
    if (kql.includes('@timestamp')) {
      if (kql.includes('>=') && kql.includes('<')) {
        // Range query
        const matches = kql.match(/@timestamp\s*>=\s*"([^"]+)".*@timestamp\s*<\s*"([^"]+)"/);
        if (matches) {
          return {
            bool: {
              filter: [
                {
                  bool: {
                    should: [{
                      range: {
                        '@timestamp': {
                          gte: matches[1],
                          time_zone: 'America/Los_Angeles'
                        }
                      }
                    }],
                    minimum_should_match: 1
                  }
                },
                {
                  bool: {
                    should: [{
                      range: {
                        '@timestamp': {
                          lt: matches[2],
                          time_zone: 'America/Los_Angeles'
                        }
                      }
                    }],
                    minimum_should_match: 1
                  }
                }
              ]
            }
          };
        }
      } else if (kql.includes('>=')) {
        // Greater than or equal
        const match = kql.match(/@timestamp\s*>=\s*"?([^"\s]+)"?/);
        if (match) {
          return {
            bool: {
              should: [{
                range: {
                  '@timestamp': {
                    gte: match[1],
                    time_zone: 'America/Los_Angeles'
                  }
                }
              }],
              minimum_should_match: 1
            }
          };
        }
      }
    }

    // Handle simple field:value queries
    const fieldMatch = kql.match(/(\w+):\s*"?([^"\s]+)"?/);
    if (fieldMatch) {
      return {
        match: {
          [fieldMatch[1]]: fieldMatch[2]
        }
      };
    }

    // Default: return as query string
    return {
      query_string: {
        query: kql
      }
    };
  }

  constructElasticsearchQuery(context) {
    const query = {
      index: context.index || 'traffic-*',
      body: {
        size: 0,
        query: {
          bool: {
            must: [],
            filter: [...this.filters],
            should: [],
            must_not: []
          }
        },
        aggs: this.aggregations
      }
    };

    // Add time range filter if provided
    if (this.timeRange) {
      query.body.query.bool.filter.push({
        range: {
          '@timestamp': {
            gte: this.timeRange.from,
            lte: this.timeRange.to,
            format: 'strict_date_optional_time'
          }
        }
      });
    }

    // Add any additional context filters
    if (context.additionalFilters) {
      query.body.query.bool.filter.push(...context.additionalFilters);
    }

    // Add runtime mappings if needed
    query.body.runtime_mappings = {};

    // Add fields for formatting
    query.body.fields = [
      { field: '@timestamp', format: 'date_time' }
    ];

    return query;
  }

  isElasticsearchFunction(name) {
    const esFunctions = [
      FunctionTypes.COUNT,
      FunctionTypes.AVERAGE,
      FunctionTypes.SUM,
      FunctionTypes.MAX,
      FunctionTypes.MIN,
      FunctionTypes.MEDIAN,
      FunctionTypes.PERCENTILE,
      FunctionTypes.PERCENTILE_RANK,
      FunctionTypes.STANDARD_DEVIATION,
      FunctionTypes.UNIQUE_COUNT,
      FunctionTypes.LAST_VALUE
    ];

    return esFunctions.includes(name);
  }

  isTimeSeriesFunction(name) {
    const tsFunctions = [
      FunctionTypes.MOVING_AVERAGE,
      FunctionTypes.CUMULATIVE_SUM,
      FunctionTypes.DIFFERENCES,
      FunctionTypes.COUNTER_RATE,
      FunctionTypes.NORMALIZE_BY_UNIT,
      FunctionTypes.OVERALL_AVERAGE,
      FunctionTypes.OVERALL_MAX,
      FunctionTypes.OVERALL_MIN,
      FunctionTypes.OVERALL_SUM
    ];

    return tsFunctions.includes(name);
  }
}

// Export singleton instance
export const queryBuilder = new QueryBuilder();

// Export helper function
export async function buildQueryFromFormula(formula, context) {
  const { parseFormula } = await import('../core/formula-parser.js');
  const ast = parseFormula(formula);
  return queryBuilder.buildQuery(ast, context);
}
