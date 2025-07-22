/**
 * Tests for ES|QL Query Builder
 */

import { describe, it, expect } from 'vitest';
import { ESQLQueryBuilder } from '../../../../assets/js/emil/query-engine/query-builder.js';
import { QueryIntent } from '../../../../assets/js/emil/esql/template-types.js';

describe('ESQLQueryBuilder', () => {
  describe('buildFromIntent', () => {
    it('should build health check query from intent', () => {
      const intent: QueryIntent = {
        action: 'health-check',
        eids: ['pandc.vnext.recommendations.view'],
        parameters: {
          time_window: '2h',
          critical_error_threshold: 0.15
        }
      };

      const query = ESQLQueryBuilder.buildFromIntent(intent);
      
      expect(query).toContain('FROM logs-traffic-*');
      expect(query).toContain('WHERE eid IN ["pandc.vnext.recommendations.view"]');
      expect(query).toContain('INTERVAL 2h');
      expect(query).toContain('error_rate > 0.15');
    });

    it('should use default parameters when not provided', () => {
      const intent: QueryIntent = {
        action: 'health-check',
        eids: ['test.eid']
      };

      const query = ESQLQueryBuilder.buildFromIntent(intent);
      
      expect(query).toContain('INTERVAL 1h'); // default time window
      expect(query).toContain('error_rate > 0.1'); // default critical threshold
    });

    it('should handle baseline comparison intent', () => {
      const intent: QueryIntent = {
        action: 'baseline-compare',
        eids: ['test.eid'],
        parameters: {
          baseline_start: '2024-01-01T00:00:00Z',
          baseline_end: '2024-01-02T00:00:00Z',
          current_window: '1h'
        }
      };

      const query = ESQLQueryBuilder.buildFromIntent(intent);
      
      expect(query).toContain('@timestamp >= "2024-01-01T00:00:00Z"');
      expect(query).toContain('@timestamp <= "2024-01-02T00:00:00Z"');
      expect(query).toContain('INTERVAL 1h');
    });

    it('should calculate time window from context', () => {
      const intent: QueryIntent = {
        action: 'health-check',
        eids: ['test.eid'],
        context: {
          eids: ['test.eid'],
          timeRange: {
            start: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString()
          }
        }
      };

      const query = ESQLQueryBuilder.buildFromIntent(intent);
      expect(query).toContain('INTERVAL 6h');
    });
  });

  describe('buildFromTemplate', () => {
    it('should build query from template with parameters', () => {
      const params = {
        eids: ['eid1', 'eid2'],
        time_window: '30m',
        error_threshold: 0.02
      };

      const query = ESQLQueryBuilder.buildFromTemplate('healthCheck', params);
      
      expect(query).toContain('"eid1", "eid2"');
      expect(query).toContain('30m');
    });

    it('should throw error for unknown template', () => {
      expect(() => {
        ESQLQueryBuilder.buildFromTemplate('unknownTemplate', {});
      }).toThrow('Template not found: unknownTemplate');
    });

    it('should throw error for missing required parameters', () => {
      expect(() => {
        ESQLQueryBuilder.buildFromTemplate('healthCheck', {
          // missing required 'eids' parameter
          time_window: '1h'
        });
      }).toThrow('Required parameter missing: eids');
    });
  });

  describe('parameter validation', () => {
    it('should validate parameter types', () => {
      expect(() => {
        ESQLQueryBuilder.buildFromTemplate('healthCheck', {
          eids: ['test'],
          time_window: 123 // should be string
        });
      }).toThrow('Invalid type for parameter time_window');
    });

    it('should validate interval format', () => {
      expect(() => {
        ESQLQueryBuilder.buildFromTemplate('healthCheck', {
          eids: ['test'],
          time_window: 'invalid'
        });
      }).toThrow('Invalid type for parameter time_window');
    });

    it('should validate percentage values', () => {
      expect(() => {
        ESQLQueryBuilder.buildFromTemplate('healthCheck', {
          eids: ['test'],
          critical_error_threshold: 150 // > 100
        });
      }).toThrow('Invalid type for parameter critical_error_threshold');
    });

    it('should format array parameters correctly', () => {
      const query = ESQLQueryBuilder.buildFromTemplate('healthCheck', {
        eids: ['eid1', 'eid2', 'eid3']
      });

      expect(query).toContain('"eid1", "eid2", "eid3"');
    });
  });

  describe('validateQuery', () => {
    it('should validate valid query', () => {
      const query = 'FROM logs-* | WHERE eid == "test" | STATS COUNT(*)';
      const result = ESQLQueryBuilder.validateQuery(query);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should detect missing FROM clause', () => {
      const query = 'WHERE eid == "test" | STATS COUNT(*)';
      const result = ESQLQueryBuilder.validateQuery(query);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Query must contain FROM clause');
    });

    it('should detect unclosed brackets', () => {
      const query = 'FROM logs-* | WHERE eid IN ["test", "test2"';
      const result = ESQLQueryBuilder.validateQuery(query);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unclosed brackets in query');
    });

    it('should detect unresolved placeholders', () => {
      const query = 'FROM logs-* | WHERE eid == "{{unresolved}}"';
      const result = ESQLQueryBuilder.validateQuery(query);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Query contains unresolved placeholders');
    });
  });

  describe('parseQuery', () => {
    it('should extract parameters from query template', () => {
      const query = 'FROM {{index}} | WHERE eid == "{{eid}}" AND time > {{time_window}}';
      const params = ESQLQueryBuilder.parseQuery(query);
      
      expect(params).toEqual(['index', 'eid', 'time_window']);
    });

    it('should handle duplicate parameters', () => {
      const query = 'FROM {{index}} | WHERE eid == "{{eid}}" OR eid == "{{eid}}"';
      const params = ESQLQueryBuilder.parseQuery(query);
      
      expect(params).toEqual(['index', 'eid']);
    });
  });

  describe('edge cases', () => {
    it('should handle empty EID array', () => {
      const intent: QueryIntent = {
        action: 'health-check',
        eids: []
      };

      const query = ESQLQueryBuilder.buildFromIntent(intent);
      expect(query).toContain('WHERE eid IN []');
    });

    it('should escape special characters in EIDs', () => {
      const query = ESQLQueryBuilder.buildFromTemplate('healthCheck', {
        eids: ['test"eid', 'test,eid']
      });

      expect(query).toContain('"test\\"eid"');
      expect(query).toContain('"test,eid"');
    });

    it('should handle very long time ranges', () => {
      const intent: QueryIntent = {
        action: 'trend-analysis',
        eids: ['test'],
        parameters: {
          time_range: '90d'
        }
      };

      const query = ESQLQueryBuilder.buildFromIntent(intent);
      expect(query).toContain('INTERVAL 90d');
    });

    it('should clean up extra whitespace', () => {
      const template = `
        FROM logs-*
        
        
        | WHERE test == true
        
        | STATS COUNT(*)
      `;

      const cleaned = ESQLQueryBuilder['renderTemplate'](template, {});
      const lines = cleaned.split('\n');
      
      expect(lines).toHaveLength(3);
      expect(lines.every(line => line.trim().length > 0)).toBe(true);
    });
  });

  describe('performance', () => {
    it('should build queries quickly', () => {
      const start = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        ESQLQueryBuilder.buildFromIntent({
          action: 'health-check',
          eids: [`eid${i}`]
        });
      }
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100); // Should build 1000 queries in under 100ms
    });
  });
});