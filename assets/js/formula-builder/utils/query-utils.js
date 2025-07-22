/**
 * Query Utilities - Helper functions for Elasticsearch queries
 */

export class QueryUtils {
  /**
   * Merge multiple queries into one
   * @param {Object[]} queries - Array of ES queries
   * @returns {Object} Merged query
   */
  static mergeQueries(queries) {
    if (!queries || queries.length === 0) return null;
    if (queries.length === 1) return queries[0];

    // Merge aggregations
    const mergedAggs = {};
    let aggCounter = 0;

    queries.forEach(query => {
      if (query.body && query.body.aggs) {
        Object.entries(query.body.aggs).forEach(([key, agg]) => {
          mergedAggs[`${aggCounter++}-merged`] = agg;
        });
      }
    });

    // Use the first query as base
    const merged = JSON.parse(JSON.stringify(queries[0]));
    merged.body.aggs = mergedAggs;

    return merged;
  }

  /**
   * Add a filter to an existing query
   * @param {Object} query - ES query
   * @param {Object} filter - Filter to add
   * @returns {Object} Modified query
   */
  static addFilter(query, filter) {
    const modifiedQuery = JSON.parse(JSON.stringify(query));

    if (!modifiedQuery.body) modifiedQuery.body = {};
    if (!modifiedQuery.body.query) modifiedQuery.body.query = { bool: {} };
    if (!modifiedQuery.body.query.bool) modifiedQuery.body.query.bool = {};
    if (!modifiedQuery.body.query.bool.filter) modifiedQuery.body.query.bool.filter = [];

    modifiedQuery.body.query.bool.filter.push(filter);

    return modifiedQuery;
  }

  /**
   * Extract aggregation results from ES response
   * @param {Object} response - ES response
   * @returns {Object} Extracted aggregation values
   */
  static extractAggregationResults(response) {
    const results = {};

    if (response.aggregations) {
      Object.entries(response.aggregations).forEach(([key, agg]) => {
        results[key] = this.extractAggValue(agg);
      });
    }

    return results;
  }

  /**
   * Extract value from an aggregation
   * @param {Object} agg - Aggregation object
   * @returns {any} Extracted value
   */
  static extractAggValue(agg) {
    // Handle different aggregation types
    if (agg.value !== undefined) return agg.value;
    if (agg.doc_count !== undefined) return agg.doc_count;

    // Handle percentiles
    if (agg.values) {
      const keys = Object.keys(agg.values);
      if (keys.length === 1) return agg.values[keys[0]];
      return agg.values;
    }

    // Handle nested aggregations
    if (agg.buckets) {
      return agg.buckets.map(bucket => ({
        key: bucket.key,
        value: bucket.doc_count,
        ...this.extractAggregationResults(bucket)
      }));
    }

    // Handle filter aggregations
    const innerAggs = Object.keys(agg).filter(k => !['doc_count', 'value', 'values', 'buckets'].includes(k));
    if (innerAggs.length > 0) {
      const innerResults = {};
      innerAggs.forEach(innerKey => {
        innerResults[innerKey] = this.extractAggValue(agg[innerKey]);
      });
      return innerResults;
    }

    return agg;
  }

  /**
   * Convert a simple filter object to ES query format
   * @param {Object} filter - Simple filter object
   * @returns {Object} ES query filter
   */
  static buildFilter(filter) {
    if (!filter || typeof filter !== 'object') return null;

    const esFilter = { bool: { must: [] } };

    Object.entries(filter).forEach(([field, value]) => {
      if (value === null || value === undefined) return;

      if (Array.isArray(value)) {
        // Terms query for arrays
        esFilter.bool.must.push({
          terms: { [field]: value }
        });
      } else if (typeof value === 'object' && value.gte) {
        // Range query
        esFilter.bool.must.push({
          range: { [field]: value }
        });
      } else {
        // Term query
        esFilter.bool.must.push({
          term: { [field]: value }
        });
      }
    });

    return esFilter.bool.must.length > 0 ? esFilter : null;
  }

  /**
   * Optimize a query by removing redundant parts
   * @param {Object} query - ES query
   * @returns {Object} Optimized query
   */
  static optimizeQuery(query) {
    const optimized = JSON.parse(JSON.stringify(query));

    // Remove empty arrays and objects
    function cleanEmpty(obj) {
      Object.keys(obj).forEach(key => {
        if (obj[key] && typeof obj[key] === 'object') {
          cleanEmpty(obj[key]);

          if (Array.isArray(obj[key]) && obj[key].length === 0) {
            delete obj[key];
          } else if (Object.keys(obj[key]).length === 0) {
            delete obj[key];
          }
        }
      });
    }

    if (optimized.body) {
      cleanEmpty(optimized.body);
    }

    return optimized;
  }

  /**
   * Calculate query complexity score
   * @param {Object} query - ES query
   * @returns {number} Complexity score
   */
  static calculateComplexity(query) {
    let complexity = 0;

    function traverse(obj, depth = 0) {
      if (!obj || typeof obj !== 'object') return;

      complexity += depth * 0.1;

      if (obj.aggs || obj.aggregations) {
        complexity += Object.keys(obj.aggs || obj.aggregations).length * 2;
      }

      if (obj.bool) {
        complexity += 1;
        ['must', 'should', 'must_not', 'filter'].forEach(clause => {
          if (obj.bool[clause]) {
            complexity += obj.bool[clause].length * 0.5;
          }
        });
      }

      Object.values(obj).forEach(value => {
        if (typeof value === 'object') {
          traverse(value, depth + 1);
        }
      });
    }

    traverse(query.body);

    return Math.round(complexity * 10) / 10;
  }
}
