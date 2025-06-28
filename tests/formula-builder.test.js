/**
 * Formula Builder Test Suite
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseFormula, FormulaParser } from '../assets/js/formula-builder/core/formula-parser.js';
import { queryBuilder, buildQueryFromFormula } from '../assets/js/formula-builder/translator/query-builder.js';
import { FunctionTypes, ASTNodeTypes } from '../assets/js/formula-builder/core/formula-types.js';

describe('Formula Parser', () => {
  let parser;

  beforeEach(() => {
    parser = new FormulaParser();
  });

  describe('Basic Parsing', () => {
    it('should parse simple function calls', () => {
      const ast = parseFormula('count()');
      expect(ast).toEqual({
        type: ASTNodeTypes.FUNCTION_CALL,
        name: 'count',
        arguments: [],
        namedArguments: {}
      });
    });

    it('should parse function with field argument', () => {
      const ast = parseFormula('average(bytes)');
      expect(ast).toEqual({
        type: ASTNodeTypes.FUNCTION_CALL,
        name: 'average',
        arguments: [{
          type: ASTNodeTypes.FIELD_REFERENCE,
          field: 'bytes'
        }],
        namedArguments: {}
      });
    });

    it('should parse function with named arguments', () => {
      const ast = parseFormula('count(kql=\'status:error\')');
      expect(ast).toEqual({
        type: ASTNodeTypes.FUNCTION_CALL,
        name: 'count',
        arguments: [],
        namedArguments: {
          kql: {
            type: ASTNodeTypes.LITERAL,
            value: 'status:error',
            valueType: 'string'
          }
        }
      });
    });

    it('should parse nested field paths', () => {
      const ast = parseFormula('sum(order.items.price)');
      expect(ast).toEqual({
        type: ASTNodeTypes.FUNCTION_CALL,
        name: 'sum',
        arguments: [{
          type: ASTNodeTypes.FIELD_REFERENCE,
          field: 'order.items.price'
        }],
        namedArguments: {}
      });
    });
  });

  describe('Binary Operations', () => {
    it('should parse addition', () => {
      const ast = parseFormula('count() + 100');
      expect(ast.type).toBe(ASTNodeTypes.BINARY_OPERATION);
      expect(ast.operator).toBe('+');
      expect(ast.left.name).toBe('count');
      expect(ast.right.value).toBe(100);
    });

    it('should parse division', () => {
      const ast = parseFormula('sum(bytes) / count()');
      expect(ast.type).toBe(ASTNodeTypes.BINARY_OPERATION);
      expect(ast.operator).toBe('/');
      expect(ast.left.name).toBe('sum');
      expect(ast.right.name).toBe('count');
    });

    it('should parse complex arithmetic', () => {
      const ast = parseFormula('(sum(a) + sum(b)) / (count() * 2)');
      expect(ast.type).toBe(ASTNodeTypes.BINARY_OPERATION);
      expect(ast.operator).toBe('/');
    });
  });

  describe('Comparison Operations', () => {
    it('should parse greater than', () => {
      const ast = parseFormula('count() > 100');
      expect(ast.type).toBe(ASTNodeTypes.BINARY_OPERATION);
      expect(ast.operator).toBe('>');
    });

    it('should parse less than or equal', () => {
      const ast = parseFormula('average(bytes) <= 1000');
      expect(ast.type).toBe(ASTNodeTypes.BINARY_OPERATION);
      expect(ast.operator).toBe('<=');
    });

    it('should parse equality', () => {
      const ast = parseFormula('sum(price) == 0');
      expect(ast.type).toBe(ASTNodeTypes.BINARY_OPERATION);
      expect(ast.operator).toBe('==');
    });
  });

  describe('Complex Formulas', () => {
    it('should parse ifelse conditions', () => {
      const ast = parseFormula('ifelse(count() > 100, 1, 0)');
      expect(ast.name).toBe('ifelse');
      expect(ast.arguments.length).toBe(3);
      expect(ast.arguments[0].type).toBe(ASTNodeTypes.BINARY_OPERATION);
    });

    it('should parse nested ifelse', () => {
      const formula = 'ifelse(count() > 1000, 100, ifelse(count() > 500, 50, 0))';
      const ast = parseFormula(formula);
      expect(ast.name).toBe('ifelse');
      expect(ast.arguments[2].name).toBe('ifelse');
    });

    it('should parse complex KQL filters', () => {
      const formula = 'count(kql=\'@timestamp >= "2025-06-01" AND @timestamp < "2025-06-09"\')';
      const ast = parseFormula(formula);
      expect(ast.namedArguments.kql.value).toContain('@timestamp');
    });
  });

  describe('Error Handling', () => {
    it('should throw on unclosed parentheses', () => {
      expect(() => parseFormula('count(')).toThrow();
    });

    it('should throw on invalid syntax', () => {
      expect(() => parseFormula('count() +')).toThrow();
    });

    it('should throw on mismatched quotes', () => {
      expect(() => parseFormula('count(kql="test)')).toThrow();
    });
  });
});

describe('Query Builder', () => {
  beforeEach(() => {
    queryBuilder.reset();
  });

  describe('Basic Query Generation', () => {
    it('should generate count query', async () => {
      const query = await buildQueryFromFormula('count()', {
        index: 'test-*'
      });

      expect(query.index).toBe('test-*');
      expect(query.body.size).toBe(0);
      expect(query.body.aggs).toBeDefined();
    });

    it('should generate average aggregation', async () => {
      const query = await buildQueryFromFormula('average(cpu)', {
        index: 'metrics-*'
      });

      const aggs = Object.values(query.body.aggs);
      expect(aggs[0].avg).toBeDefined();
      expect(aggs[0].avg.field).toBe('cpu');
    });

    it('should add time range filter', async () => {
      const query = await buildQueryFromFormula('sum(bytes)', {
        index: 'logs-*',
        timeRange: {
          from: 'now-1h',
          to: 'now'
        }
      });

      const rangeFilter = query.body.query.bool.filter.find(f => f.range);
      expect(rangeFilter).toBeDefined();
      expect(rangeFilter.range['@timestamp']).toBeDefined();
    });
  });

  describe('KQL Filter Translation', () => {
    it('should translate simple KQL', async () => {
      const query = await buildQueryFromFormula('count(kql=\'status:error\')', {
        index: 'logs-*'
      });

      const agg = Object.values(query.body.aggs)[0];
      expect(agg.filter).toBeDefined();
    });

    it('should translate timestamp ranges', async () => {
      const formula = 'count(kql=\'@timestamp >= "2025-06-01"\')';
      const query = await buildQueryFromFormula(formula, {
        index: 'logs-*'
      });

      const agg = Object.values(query.body.aggs)[0];
      const filter = agg.filter.bool.filter[0];
      expect(filter.bool.should[0].range['@timestamp'].gte).toBe('2025-06-01');
    });
  });

  describe('Complex Queries', () => {
    it('should handle multiple aggregations', async () => {
      const formula = 'sum(bytes) / count()';
      const query = await buildQueryFromFormula(formula, {
        index: 'logs-*'
      });

      const aggKeys = Object.keys(query.body.aggs);
      expect(aggKeys.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle nested aggregations with filters', async () => {
      const formula = 'count(kql=\'status:error\') / count()';
      const query = await buildQueryFromFormula(formula, {
        index: 'logs-*'
      });

      const aggs = Object.values(query.body.aggs);
      const filteredAgg = aggs.find(a => a.filter);
      expect(filteredAgg).toBeDefined();
    });
  });
});

describe('Formula Integration', () => {
  it('should parse and build query for real-world formula', async () => {
    const formula = `
      ifelse(
        count(kql='@timestamp >= "2025-06-01" AND @timestamp < "2025-06-09"') / 8 < 100,
        999,
        round((count(kql='@timestamp >= now-12h') / count()) * 100)
      )
    `;

    // Should parse without errors
    const ast = parseFormula(formula);
    expect(ast.name).toBe('ifelse');

    // Should generate valid query
    const query = await buildQueryFromFormula(formula, {
      index: 'traffic-*'
    });
    expect(query.body.aggs).toBeDefined();
  });
});

// Test utilities
export function createMockFormula() {
  return {
    simple: 'count()',
    withField: 'average(bytes)',
    withFilter: 'count(kql=\'status:error\')',
    complex: 'count(kql=\'status:error\') / count()',
    nested: 'ifelse(count() > 100, sum(bytes) / count(), 0)'
  };
}
