/**
 * Tests for AI Formula Integration
 * @vitest-environment jsdom
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

// Set test flag before importing modules that auto-initialize
if (typeof window !== 'undefined') {
  window.__TEST__ = true;
}

import { FormulaAIAssistant } from '../assets/js/formula-builder/ai/formula-ai-assistant.js';
import '../assets/js/ai-formula-integration.js';

// Mock the enhanced modules
vi.mock('../assets/js/formula-builder/core/enhanced-validator.js', () => ({
  EnhancedFormulaValidator: class {
    async validate(ast) {
      return { valid: true, errors: [] };
    }
  }
}));

vi.mock('../assets/js/formula-builder/core/enhanced-ast-parser.js', () => ({
  EnhancedFormulaParser: class {
    parse(formula) {
      return {
        success: true,
        ast: { type: 'FunctionCall', name: 'count', args: [] },
        errors: []
      };
    }
  }
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  clear: vi.fn(),
  removeItem: vi.fn()
};
global.localStorage = localStorageMock;

// Mock the formula editor component
if (!customElements.get('enhanced-formula-editor')) {
  customElements.define('enhanced-formula-editor', class extends HTMLElement {
    constructor() {
      super();
      this._value = '';
    }
    setValue(val) { this._value = val; }
    getValue() { return this._value; }
    get value() { return this._value; }
    set value(val) { this._value = val; }
  });
}

// Helper to wait for async operations
const waitFor = (condition, timeout = 1000) => {
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (condition()) {
        clearInterval(interval);
        resolve();
      }
    }, 10);

    setTimeout(() => {
      clearInterval(interval);
      reject(new Error('Timeout waiting for condition'));
    }, timeout);
  });
};

describe('FormulaAIAssistant', () => {
  let assistant;

  beforeEach(() => {
    assistant = new FormulaAIAssistant({
      enableRemoteAI: false,
      cacheEnabled: true,
      maxSuggestions: 3
    });
    // Reset all mocks
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.clear.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Natural Language Pattern Matching', () => {
    test('matches traffic drop patterns', async () => {
      const queries = [
        { input: 'traffic dropped by 50%', expectedFormula: 'ifelse(count() < count(shift="1d") * 0.5, "CRITICAL", "NORMAL")' },
        { input: 'traffic drops by 30%', expectedFormula: 'ifelse(count() < count(shift="1d") * 0.7, "CRITICAL", "NORMAL")' },
        { input: 'Show me when traffic dropped more than 80% last week', expectedFormula: 'ifelse((count() / count(shift="1w")) < 0.2, 1, 0)' }
      ];

      for (const query of queries) {
        const result = await assistant.generateFormula(query.input);
        expect(result.formula).toBe(query.expectedFormula);
        expect(result.confidence).toBeGreaterThan(0.7);
      }
    });

    test('matches baseline deviation patterns', async () => {
      const result = await assistant.generateFormula('baseline deviation');
      expect(result.formula).toBe('(count() - overall_average(count())) / overall_average(count()) * 100');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test('matches error rate patterns', async () => {
      const result = await assistant.generateFormula('Alert when errors exceed 10%');
      expect(result.formula).toBe('ifelse((count(kql=\'response.status_code >= 400\') / count()) > 0.1, 1, 0)');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test('matches health score patterns', async () => {
      const result = await assistant.generateFormula('health score');
      expect(result.formula).toBe('100 * (1 - (count(kql="status:error") / count()))');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test('matches anomaly detection patterns', async () => {
      const result = await assistant.generateFormula('anomaly detection');
      expect(result.formula).toBe('abs((count() - average(count(), shift="1w")) / standard_deviation(count(), shift="1w")) > 3');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test('matches business impact patterns', async () => {
      const result = await assistant.generateFormula('business impact');
      expect(result.formula).toBe('((count(shift="1d") - count()) / count(shift="1d")) * unique_count(user.id)');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test('matches time comparison patterns', async () => {
      const queries = [
        { input: 'week over week revenue', expectedFormula: 'sum(revenue) / sum(revenue, shift=\'1w\')' },
        { input: 'compare vs last week', expectedFormula: 'count() / count(shift="1w")' }
      ];

      for (const query of queries) {
        const result = await assistant.generateFormula(query.input);
        expect(result.formula).toBe(query.expectedFormula);
      }
    });

    test('returns alternatives when multiple patterns match', async () => {
      const result = await assistant.generateFormula('traffic drop');
      expect(result.formula).toBeTruthy();
      expect(result.alternatives).toBeDefined();
      expect(Array.isArray(result.alternatives)).toBe(true);
    });
  });

  describe('Learning System', () => {
    test('learns from user patterns', async () => {
      const customQuery = 'my custom pattern';
      const customFormula = 'custom_function()';

      assistant.learnPattern(customQuery, customFormula);

      const result = await assistant.generateFormula(customQuery);
      expect(result.formula).toBe(customFormula);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test('prioritizes learned patterns over predefined ones', async () => {
      const query = 'traffic drops by 50%';
      const customFormula = 'my_custom_formula()';

      assistant.learnPattern(query, customFormula);

      const result = await assistant.generateFormula(query);
      expect(result.formula).toBe(customFormula);
      expect(result.confidence).toBe(0.9); // Learned patterns have 0.9 confidence
    });

    test('limits learned patterns to prevent memory issues', () => {
      // Add 150 patterns (more than the limit)
      for (let i = 0; i < 150; i++) {
        assistant.learnPattern(`pattern ${i}`, `formula${i}()`);
      }

      // Check that userPatterns size is limited
      expect(assistant.userPatterns.size).toBeLessThanOrEqual(100);
    });
  });

  describe('Caching', () => {
    test('caches successful results', async () => {
      const query = 'traffic drops by 50%';

      const result1 = await assistant.generateFormula(query);
      expect(result1.cached).toBeFalsy();

      const result2 = await assistant.generateFormula(query);
      expect(result2.cached).toBe(true);
      expect(result2.formula).toBe(result1.formula);
    });

    test('respects cache TTL', async () => {
      assistant.config.cacheTTL = 100; // 100ms TTL

      const query = 'baseline deviation';
      await assistant.generateFormula(query);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      const result = await assistant.generateFormula(query);
      expect(result.cached).toBeFalsy();
    });

    test('can disable caching', async () => {
      assistant.config.cacheEnabled = false;

      const query = 'health score';
      await assistant.generateFormula(query);

      const result = await assistant.generateFormula(query);
      expect(result.cached).toBeFalsy();
    });
  });

  describe('Formula Explanation', () => {
    test('explains simple formulas', () => {
      const explanation = assistant.explainFormula('count()');
      expect(explanation).toContain('Total count');
    });

    test('explains complex formulas', () => {
      const explanation = assistant.explainFormula('sum(bytes) / count()');
      expect(explanation).toContain('divided by');
    });

    test('handles invalid formulas gracefully', () => {
      const explanation = assistant.explainFormula('invalid formula syntax');
      expect(explanation).toBe('Invalid formula syntax');
    });
  });

  describe('Performance', () => {
    test('generates formulas quickly', async () => {
      const start = performance.now();
      await assistant.generateFormula('traffic drops by 50%');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });

    test('handles concurrent requests', async () => {
      const queries = [
        'traffic drops by 50%',
        'baseline deviation',
        'health score',
        'anomaly detection'
      ];

      const results = await Promise.all(
        queries.map(q => assistant.generateFormula(q))
      );

      expect(results).toHaveLength(4);
      results.forEach(result => {
        expect(result.formula).toBeTruthy();
        expect(result.confidence).toBeGreaterThan(0);
      });
    });
  });
});

describe('AI Formula Integration UI', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <div class="header">
        <h1>Test Dashboard</h1>
      </div>
      <enhanced-formula-editor id="formulaEditor"></enhanced-formula-editor>
    `;

    // Reset all mocks
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.clear.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.getItem.mockReturnValue(null);

    // Reset module state
    if (window.aiFormulaIntegration) {
      window.aiFormulaIntegration.initialized = false;
    }
  });

  afterEach(() => {
    // Clean up
    document.body.innerHTML = '';
  });

  test('initializes UI components', async () => {
    // Ensure DOM is ready before initialization
    expect(document.querySelector('.header')).toBeTruthy();
    expect(document.getElementById('formulaEditor')).toBeTruthy();

    await window.aiFormulaIntegration.init();

    expect(document.getElementById('aiFormulaInput')).toBeTruthy();
    expect(document.getElementById('aiGenerateBtn')).toBeTruthy();
    expect(document.getElementById('aiFormulaResults')).toBeTruthy();
  });

  test('handles input with debouncing', async () => {
    await window.aiFormulaIntegration.init();

    const input = document.getElementById('aiFormulaInput');
    const generateSpy = vi.spyOn(window.aiFormulaIntegration, 'generateFormula');

    // Type quickly
    input.value = 't';
    input.dispatchEvent(new Event('input'));
    await new Promise(resolve => setTimeout(resolve, 100));

    input.value = 'tr';
    input.dispatchEvent(new Event('input'));
    await new Promise(resolve => setTimeout(resolve, 100));

    input.value = 'traffic drops';
    input.dispatchEvent(new Event('input'));

    // Should not call immediately
    expect(generateSpy).not.toHaveBeenCalled();

    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 600));

    // Should call once after debounce
    expect(generateSpy).toHaveBeenCalledTimes(1);
  });

  test('displays results correctly', async () => {
    await window.aiFormulaIntegration.init();

    const mockResult = {
      formula: 'count() < count(shift="1d") * 0.5',
      explanation: 'Traffic drop detection',
      confidence: 0.85,
      alternatives: [
        {
          formula: 'count() / count(shift="1d")',
          explanation: 'Traffic ratio',
          confidence: 0.7
        }
      ]
    };

    window.aiFormulaIntegration.displayResults(mockResult);

    const results = document.getElementById('aiFormulaResults');
    expect(results.style.display).toBe('block');

    const resultItems = results.querySelectorAll('.ai-result-item');
    expect(resultItems).toHaveLength(2); // Main + 1 alternative

    // Check confidence display
    const confidenceElements = results.querySelectorAll('.ai-confidence');
    expect(confidenceElements[0].textContent).toContain('85%');
    expect(confidenceElements[1].textContent).toContain('70%');
  });

  test('applies formula to editor', async () => {
    await window.aiFormulaIntegration.init();

    // Mock the formula editor
    const editor = document.getElementById('formulaEditor');
    editor.setValue = vi.fn();
    editor.dispatchEvent = vi.fn();

    const testFormula = 'count() > 100';
    await window.aiFormulaIntegration.applyFormula(testFormula);

    expect(editor.setValue).toHaveBeenCalledWith(testFormula);
    expect(editor.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'formula-change',
        detail: expect.objectContaining({
          formula: testFormula,
          source: 'ai-assistant'
        })
      })
    );
  });

  test('handles feedback correctly', async () => {
    await window.aiFormulaIntegration.init();

    const learnSpy = vi.spyOn(window.aiFormulaIntegration, 'learnPattern');
    window.aiFormulaIntegration.lastQuery = 'test query';

    await window.aiFormulaIntegration.provideFeedback('test_formula()', true);

    expect(learnSpy).toHaveBeenCalledWith('test query', 'test_formula()');
  });

  test('saves and loads learned patterns', async () => {
    await window.aiFormulaIntegration.init();

    // Save a pattern
    window.aiFormulaIntegration.learnPattern('my test pattern', 'my_formula()');

    // Check localStorage was called
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'aiLearnedPatterns',
      expect.stringContaining('my test pattern')
    );

    // Mock localStorage return
    localStorageMock.getItem.mockReturnValue(JSON.stringify({
      'my test pattern': {
        formula: 'my_formula()',
        count: 1,
        lastUsed: Date.now()
      }
    }));

    // Create new instance and load patterns
    const newIntegration = new window.aiFormulaIntegration.constructor();
    newIntegration.loadLearnedPatterns();

    // Verify pattern was loaded
    const result = await newIntegration.aiAssistant.generateFormula('my test pattern');
    expect(result.formula).toBe('my_formula()');
  });

  test('shows error messages appropriately', async () => {
    await window.aiFormulaIntegration.init();

    const results = document.getElementById('aiFormulaResults');

    window.aiFormulaIntegration.showError('Test error message');

    expect(results.style.display).toBe('block');
    expect(results.innerHTML).toContain('ai-error');
    expect(results.innerHTML).toContain('Test error message');
  });

  test('cleans up properly', async () => {
    await window.aiFormulaIntegration.init();

    const input = document.getElementById('aiFormulaInput');
    const results = document.getElementById('aiFormulaResults');

    // Set some state
    input.value = 'test query';
    results.style.display = 'block';

    // Apply a formula (which should clean up)
    const editor = document.getElementById('formulaEditor');
    editor.setValue = vi.fn();
    editor.dispatchEvent = vi.fn();

    await window.aiFormulaIntegration.applyFormula('test()');

    // Check cleanup
    expect(input.value).toBe('');
    expect(results.style.display).toBe('none');
  });
});

describe('RAD-Specific Patterns', () => {
  let assistant;

  beforeEach(() => {
    assistant = new FormulaAIAssistant();
  });

  test('generates correct formulas for all RAD monitoring patterns', async () => {
    const radPatterns = [
      {
        query: 'critical traffic drop',
        expected: 'ifelse((count() / count(shift="1d")) < 0.2, 1, 0)'
      },
      {
        query: 'monitor checkout_flow for drops',
        expected: 'ifelse(count(kql="event_id:checkout_flow") < count(kql="event_id:checkout_flow", shift="1d") * 0.8, "ALERT", "OK")'
      },
      {
        query: 'service degradation',
        expected: '(average(response_time) > average(response_time, shift="1d") * 1.5) || (count(kql="status:error") / count() > 0.05)'
      },
      {
        query: 'recovery rate',
        expected: '(count() - min(count(), shift="1h")) / (average(count(), shift="1d") - min(count(), shift="1h"))'
      },
      {
        query: 'sustained drop',
        expected: 'min(count(), shift="30m") < average(count(), shift="1d") * 0.7'
      }
    ];

    for (const pattern of radPatterns) {
      const result = await assistant.generateFormula(pattern.query);
      expect(result.formula).toBe(pattern.expected);
      expect(result.confidence).toBeGreaterThan(0.7);
    }
  });
});
