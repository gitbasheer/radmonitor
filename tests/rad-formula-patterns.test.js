/**
 * Tests for RAD-specific Formula Patterns
 * @vitest-environment jsdom
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { FORMULA_PATTERNS, FUNCTION_METADATA } from '../assets/js/formula-builder/core/formula-functions.js';

describe('RAD-Specific Formula Patterns', () => {
  describe('Formula Patterns Registry', () => {
    test('contains RAD monitoring patterns', () => {
      expect(FORMULA_PATTERNS['Traffic Drop Alert']).toBeDefined();
      expect(FORMULA_PATTERNS['Baseline Deviation']).toBeDefined();
    });

    test('Traffic Drop Alert pattern is correct', () => {
      const pattern = FORMULA_PATTERNS['Traffic Drop Alert'];
      expect(pattern.formula).toBe('ifelse(count() < count(shift="1d") * 0.5, "CRITICAL", "NORMAL")');
      expect(pattern.category).toBe('rad-monitoring');
      expect(pattern.description).toContain('Alert when traffic drops by 50%');
    });

    test('Baseline Deviation pattern is correct', () => {
      const pattern = FORMULA_PATTERNS['Baseline Deviation'];
      expect(pattern.formula).toBe('(count() - overall_average(count())) / overall_average(count()) * 100');
      expect(pattern.category).toBe('rad-monitoring');
      expect(pattern.description).toContain('Percentage deviation from average baseline');
    });

    test('all RAD patterns have required fields', () => {
      const radPatterns = Object.entries(FORMULA_PATTERNS)
        .filter(([_, pattern]) => pattern.category === 'rad-monitoring');

      expect(radPatterns.length).toBeGreaterThan(0);

      radPatterns.forEach(([name, pattern]) => {
        expect(pattern).toHaveProperty('formula');
        expect(pattern).toHaveProperty('description');
        expect(pattern).toHaveProperty('category');
        expect(pattern.category).toBe('rad-monitoring');
        expect(typeof pattern.formula).toBe('string');
        expect(typeof pattern.description).toBe('string');
      });
    });
  });

  describe('Function Metadata', () => {
    test('contains all required monitoring functions', () => {
      const requiredFunctions = [
        'count', 'sum', 'average', 'overall_average',
        'ifelse', 'min', 'max', 'abs'
      ];

      requiredFunctions.forEach(func => {
        expect(FUNCTION_METADATA[func]).toBeDefined();
        expect(FUNCTION_METADATA[func].description).toBeTruthy();
      });
    });

    test('functions have correct metadata', () => {
      // Check count function
      const countFunc = FUNCTION_METADATA.count;
      expect(countFunc.category).toBe('elasticsearch');
      expect(countFunc.description).toContain('Total number of documents');
      expect(countFunc.examples).toBeDefined();
      expect(countFunc.examples).toContain('count()');

      // Check ifelse function
      const ifelseFunc = FUNCTION_METADATA.ifelse;
      expect(ifelseFunc.category).toBe('comparison');
      expect(ifelseFunc.description).toContain('Conditional value return');
      expect(ifelseFunc.examples).toBeDefined();
    });

    test('functions have examples', () => {
      const functions = ['count', 'average', 'ifelse', 'overall_average'];

      functions.forEach(func => {
        expect(FUNCTION_METADATA[func].examples).toBeDefined();
        expect(Array.isArray(FUNCTION_METADATA[func].examples)).toBe(true);
        expect(FUNCTION_METADATA[func].examples.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Pattern Usage in Templates', () => {
    test('patterns use valid functions from metadata', () => {
      const radPatterns = Object.entries(FORMULA_PATTERNS)
        .filter(([_, pattern]) => pattern.category === 'rad-monitoring');

      radPatterns.forEach(([name, pattern]) => {
        // Extract function names from formula
        const functionNames = pattern.formula.match(/\b(\w+)\s*\(/g);

        if (functionNames) {
          functionNames.forEach(match => {
            const funcName = match.replace('(', '').trim();

            // Check if it's a known function (skip variables and date functions)
            if (!/^(shift|percentile|date_histogram_interval|day_of_week)$/.test(funcName)) {
              expect(FUNCTION_METADATA[funcName]).toBeDefined();
            }
          });
        }
      });
    });

    test('patterns have valid formula syntax', () => {
      const radPatterns = Object.entries(FORMULA_PATTERNS)
        .filter(([_, pattern]) => pattern.category === 'rad-monitoring');

      radPatterns.forEach(([name, pattern]) => {
        // Basic syntax checks
        const openParens = (pattern.formula.match(/\(/g) || []).length;
        const closeParens = (pattern.formula.match(/\)/g) || []).length;
        expect(openParens).toBe(closeParens);

        // Check for balanced quotes
        const singleQuotes = (pattern.formula.match(/'/g) || []).length;
        const doubleQuotes = (pattern.formula.match(/"/g) || []).length;
        expect(singleQuotes % 2).toBe(0);
        expect(doubleQuotes % 2).toBe(0);
      });
    });
  });

  describe('Integration with Visual Builder', () => {
    test('RAD patterns are categorized correctly', () => {
      const categories = new Set();
      Object.values(FORMULA_PATTERNS).forEach(pattern => {
        categories.add(pattern.category);
      });

      expect(categories.has('rad-monitoring')).toBe(true);
    });

    test('RAD patterns have appropriate complexity levels', () => {
      const trafficDropPattern = FORMULA_PATTERNS['Traffic Drop Alert'];
      const baselinePattern = FORMULA_PATTERNS['Baseline Deviation'];

      // Traffic drop should be simpler (using ifelse)
      expect(trafficDropPattern.formula).toContain('ifelse');

      // Baseline deviation should use mathematical operations
      expect(baselinePattern.formula).toContain('overall_average');
      expect(baselinePattern.formula).toContain('/');
      expect(baselinePattern.formula).toContain('*');
    });
  });

  describe('Pattern Descriptions', () => {
    test('descriptions are clear and helpful', () => {
      const radPatterns = Object.entries(FORMULA_PATTERNS)
        .filter(([_, pattern]) => pattern.category === 'rad-monitoring');

            radPatterns.forEach(([name, pattern]) => {
        // Description should be meaningful
        expect(pattern.description.length).toBeGreaterThan(20);

        // Should mention what it does
        const hasValidKeyword =
          pattern.description.toLowerCase().includes('alert') ||
          pattern.description.toLowerCase().includes('calculate') ||
          pattern.description.toLowerCase().includes('show') ||
          pattern.description.toLowerCase().includes('detect') ||
          pattern.description.toLowerCase().includes('percentage') ||
          pattern.description.toLowerCase().includes('compared') ||
          pattern.description.toLowerCase().includes('flag') ||
          pattern.description.toLowerCase().includes('compare') ||
          pattern.description.toLowerCase().includes('measure') ||
          pattern.description.toLowerCase().includes('adjust');

        if (!hasValidKeyword) {
          console.log(`Pattern "${name}" description doesn't have valid keywords: "${pattern.description}"`);
        }
        expect(hasValidKeyword).toBe(true);
      });
    });

    test('descriptions match the formula intent', () => {
      const trafficDrop = FORMULA_PATTERNS['Traffic Drop Alert'];
      expect(trafficDrop.description.toLowerCase()).toContain('traffic');
      expect(trafficDrop.description.toLowerCase()).toContain('drop');

      const baseline = FORMULA_PATTERNS['Baseline Deviation'];
      expect(baseline.description.toLowerCase()).toContain('baseline');
      expect(baseline.description.toLowerCase()).toContain('deviation');
    });
  });
});
