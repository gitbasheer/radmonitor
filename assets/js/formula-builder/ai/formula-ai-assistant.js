/**
 * AI-Assisted Formula Generation Module
 * Features:
 * - Natural language to formula conversion
 * - Context-aware suggestions
 * - Cost-optimized with caching
 * - Multi-modal support (future)
 */

import { FUNCTION_METADATA, FORMULA_PATTERNS } from '../core/formula-functions.js';
import { EnhancedFormulaParser } from '../core/enhanced-ast-parser.js';
import { EnhancedFormulaValidator } from '../core/enhanced-validator.js';

// AI Configuration
const AI_CONFIG = {
  // For demo purposes, using a local pattern matching system
  // In production, this would connect to GPT-4, Claude, or specialized formula LLMs
  enableRemoteAI: false,
  apiEndpoint: '/api/v1/formula-ai',
  // SECURITY: API keys must never be exposed in client-side code
  // Authentication should be handled by the backend server
  // The backend should validate user sessions and proxy AI requests
  
  // Cache configuration
  cacheEnabled: true,
  cacheTTL: 3600000, // 1 hour
  maxCacheSize: 1000,

  // Response configuration
  maxSuggestions: 5,
  confidenceThreshold: 0.7,
  temperature: 0.3
};

// Natural language patterns for formula generation
const NL_PATTERNS = [
  // Aggregations
  { pattern: /(?:sum|total|add up) (?:of |the )?(\w+)/i, template: 'sum($1)' },
  { pattern: /average (?:of |the )?(\w+)/i, template: 'average($1)' },
  { pattern: /(?:count|number) (?:of |the )?(\w+)?/i, template: 'count($1)' },
  { pattern: /(?:max|maximum|highest) (?:of |the )?(\w+)/i, template: 'max($1)' },
  { pattern: /(?:min|minimum|lowest) (?:of |the )?(\w+)/i, template: 'min($1)' },
  { pattern: /unique (?:count of |values in )?(\w+)/i, template: 'unique_count($1)' },

  // Percentiles
  { pattern: /(\d+)(?:th|st|nd|rd)? percentile (?:of |the )?(\w+)/i, template: 'percentile($2, percentile=$1)' },
  { pattern: /median (?:of |the )?(\w+)/i, template: 'median($1)' },

  // Comparisons and filters
  { pattern: /(\w+) (?:greater than|>) (\d+)/i, template: '$1 > $2' },
  { pattern: /(\w+) (?:less than|<) (\d+)/i, template: '$1 < $2' },
  { pattern: /(\w+) (?:equals?|=) (\d+)/i, template: '$1 == $2' },
  { pattern: /errors?|failed?|failure/i, template: 'count(kql=\'status:error\') / count()' },
  { pattern: /success(?:ful)?|passed/i, template: 'count(kql=\'status:success\') / count()' },

  // RAD-specific patterns
  { pattern: /traffic (?:drop|dropped|drops) (?:more than |over )?(\d+)%/i, template: 'ifelse((count() / count(shift="1d")) < (1 - $1/100), 1, 0)' },
  { pattern: /traffic (?:drop|dropped|drops) (?:by )?(\d+)%/i, template: 'ifelse(count() < count(shift="1d") * (1 - $1/100), "CRITICAL", "NORMAL")' },
  { pattern: /when traffic (?:is )?(?:less|lower) than (\d+)% (?:of )?yesterday/i, template: 'ifelse((count() / count(shift="1d")) < ($1/100), 1, 0)' },
  { pattern: /(?:show|find|alert) (?:when )?errors? (?:exceed|above|over) (\d+)%/i, template: 'ifelse((count(kql=\'response.status_code >= 400\') / count()) > ($1/100), 1, 0)' },
  { pattern: /baseline deviation/i, template: '(count() - overall_average(count())) / overall_average(count()) * 100' },
  { pattern: /traffic (?:spike|increase) (?:above|over) (\d+)%/i, template: 'ifelse(count() > count(shift="1d") * (1 + $1/100), 1, 0)' },
  { pattern: /critical traffic (?:drop|loss)/i, template: 'ifelse((count() / count(shift="1d")) < 0.2, 1, 0)' },
  { pattern: /warning traffic (?:drop|loss)/i, template: 'ifelse((count() / count(shift="1d")) < 0.5 && (count() / count(shift="1d")) >= 0.2, 1, 0)' },
  { pattern: /business impact/i, template: '((count(shift="1d") - count()) / count(shift="1d")) * unique_count(user.id)' },
  { pattern: /weekend traffic/i, template: 'count() * ifelse(date_histogram_interval("day_of_week") >= 6, 1.43, 1)' },

  // Enhanced monitoring patterns
  { pattern: /traffic (?:dropped|decreased) (?:by |more than )?(\d+)%/i, template: 'count() < count(shift="1d") * (1 - $1/100)' },
  { pattern: /(?:baseline|normal) traffic for (\w+)/i, template: 'average(count(), kql="event_id:$1", shift="1w")' },
  { pattern: /anomaly detection/i, template: 'abs((count() - average(count(), shift="1w")) / standard_deviation(count(), shift="1w")) > 3' },
  { pattern: /(?:traffic|events?) (?:above|over) baseline/i, template: '(count() - average(count(), shift="1w")) / average(count(), shift="1w") * 100' },
  { pattern: /(?:slow|high) response times?/i, template: 'average(response_time) > percentile(response_time, percentile=90, shift="1w")' },
  { pattern: /(?:compare|vs) last (\w+)/i, template: 'count() / count(shift="1$1")' },
  { pattern: /health score/i, template: '100 * (1 - (count(kql="status:error") / count()))' },
  { pattern: /(?:traffic|volume) trend/i, template: '(count() - count(shift="1h")) / count(shift="1h") * 100' },
  { pattern: /peak traffic/i, template: 'max(count()) / average(count())' },
  { pattern: /minimum traffic threshold/i, template: 'ifelse(count() < overall_min(count()) * 1.2, "LOW", "NORMAL")' },
  { pattern: /service degradation/i, template: '(average(response_time) > average(response_time, shift="1d") * 1.5) || (count(kql="status:error") / count() > 0.05)' },
  { pattern: /recovery (?:rate|time)/i, template: '(count() - min(count(), shift="1h")) / (average(count(), shift="1d") - min(count(), shift="1h"))' },
  { pattern: /impact radius/i, template: 'unique_count(user.id) * ((count(shift="1d") - count()) / count(shift="1d"))' },
  { pattern: /(?:monitor|watch) (\w+) for drops/i, template: 'ifelse(count(kql="event_id:$1") < count(kql="event_id:$1", shift="1d") * 0.8, "ALERT", "OK")' },
  { pattern: /sustained (?:drop|decrease)/i, template: 'min(count(), shift="30m") < average(count(), shift="1d") * 0.7' },

  // Time-based
  { pattern: /week over week (?:for |of )?(\w+)/i, template: 'sum($1) / sum($1, shift=\'1w\')' },
  { pattern: /day over day (?:for |of )?(\w+)/i, template: 'sum($1) / sum($1, shift=\'1d\')' },
  { pattern: /month over month (?:for |of )?(\w+)/i, template: 'sum($1) / sum($1, shift=\'1M\')' },
  { pattern: /moving average (?:of |the )?(\w+)(?: over (\d+))?/i, template: 'moving_average(average($1), window=$2)' },
  { pattern: /cumulative (?:sum |total )?(?:of |the )?(\w+)/i, template: 'cumulative_sum(sum($1))' },

  // Ratios and percentages
  { pattern: /(\w+) (?:as a )?percentage of (\w+)/i, template: '100 * sum($1) / sum($2)' },
  { pattern: /ratio (?:of |between )?(\w+) (?:to|and) (\w+)/i, template: 'sum($1) / sum($2)' },
  { pattern: /percent(?:age)? (?:of )?total (?:for |of )?(\w+)/i, template: 'sum($1) / overall_sum(sum($1))' },

  // Complex patterns
  { pattern: /error rate/i, template: 'count(kql=\'response.status_code >= 400\') / count()' },
  { pattern: /response time/i, template: 'average(response_time)' },
  { pattern: /conversion rate/i, template: 'count(kql=\'event.type:purchase\') / count(kql=\'event.type:view\')' },
  { pattern: /bounce rate/i, template: 'count(kql=\'session.pages_viewed:1\') / count()' },
  { pattern: /availability/i, template: '100 * (1 - count(kql=\'status:error\') / count())' }
];

/**
 * AI-powered formula assistant
 */
export class FormulaAIAssistant {
  constructor(config = {}) {
    this.config = { ...AI_CONFIG, ...config };
    this.parser = new EnhancedFormulaParser();
    this.validator = new EnhancedFormulaValidator();
    this.cache = new Map();
    this.contextHistory = [];
    this.userPatterns = new Map();
  }

  /**
   * Generate formula from natural language
   */
  async generateFormula(naturalLanguage, context = {}) {
    const startTime = performance.now();

    // Check cache
    const cacheKey = this.getCacheKey(naturalLanguage, context);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        ...cached,
        cached: true,
        generationTime: performance.now() - startTime
      };
    }

    try {
      // Try local pattern matching first
      const localResult = await this.generateFromPatterns(naturalLanguage, context);

      if (localResult.confidence >= this.config.confidenceThreshold) {
        // Validate the generated formula
        const validationResult = await this.validateFormula(localResult.formula);

        if (validationResult.valid) {
          const result = {
            formula: localResult.formula,
            explanation: localResult.explanation,
            confidence: localResult.confidence,
            alternatives: localResult.alternatives,
            generationTime: performance.now() - startTime
          };

          // Cache successful result
          this.addToCache(cacheKey, result);

          // Learn from successful generation
          this.learnPattern(naturalLanguage, localResult.formula);

          return result;
        }
      }

      // If local generation fails and remote AI is enabled
      if (this.config.enableRemoteAI) {
        return await this.generateFromRemoteAI(naturalLanguage, context);
      }

      // Fallback response
      return {
        formula: '',
        explanation: 'Could not generate formula from the given description',
        confidence: 0,
        alternatives: this.getSimilarExamples(naturalLanguage),
        generationTime: performance.now() - startTime
      };

    } catch (error) {
      console.error('Formula generation error:', error);
      return {
        formula: '',
        explanation: `Error: ${error.message}`,
        confidence: 0,
        alternatives: [],
        generationTime: performance.now() - startTime
      };
    }
  }

  /**
   * Generate formula using local pattern matching
   */
  async generateFromPatterns(naturalLanguage, context) {
    const input = naturalLanguage.toLowerCase().trim();
    const results = [];

    // Check user-learned patterns first
    for (const [pattern, formula] of this.userPatterns) {
      if (this.fuzzyMatch(input, pattern)) {
        results.push({
          formula,
          confidence: 0.9,
          explanation: 'Based on previously used pattern',
          source: 'learned'
        });
      }
    }

    // Check predefined patterns
    for (const patternDef of NL_PATTERNS) {
      const match = input.match(patternDef.pattern);
      if (match) {
        let formula = patternDef.template;

        // Replace placeholders
        for (let i = 1; i < match.length; i++) {
          if (match[i]) {
            // Handle optional groups
            formula = formula.replace(`$${i}`, match[i] || '10'); // Default window size
          }
        }

        // Clean up the formula
        formula = formula.replace(/\$\d+/g, ''); // Remove unused placeholders

        results.push({
          formula,
          confidence: 0.8,
          explanation: `Interpreted "${naturalLanguage}" as ${this.explainFormula(formula)}`,
          source: 'pattern'
        });
      }
    }

    // Check formula patterns library
    for (const [name, pattern] of Object.entries(FORMULA_PATTERNS)) {
      if (this.matchesFormulaPattern(input, name, pattern)) {
        results.push({
          formula: pattern.formula,
          confidence: 0.75,
          explanation: pattern.description,
          source: 'library'
        });
      }
    }

    // Sort by confidence and return best match
    results.sort((a, b) => b.confidence - a.confidence);

    if (results.length > 0) {
      return {
        formula: results[0].formula,
        explanation: results[0].explanation,
        confidence: results[0].confidence,
        alternatives: results.slice(1, this.config.maxSuggestions).map(r => ({
          formula: r.formula,
          explanation: r.explanation,
          confidence: r.confidence
        }))
      };
    }

    return {
      formula: '',
      explanation: 'No matching pattern found',
      confidence: 0,
      alternatives: []
    };
  }

  /**
   * Get contextual suggestions based on current formula
   */
  async getSuggestions(currentFormula, cursorPosition, context = {}) {
    const suggestions = [];

    // Parse current formula to understand context
    const parseResult = this.parser.parse(currentFormula);

    if (!parseResult.success) {
      // Suggest fixes for syntax errors
      return this.getSyntaxFixSuggestions(currentFormula, parseResult.errors);
    }

    // Get context at cursor position
    const nodeAtCursor = this.findNodeAtPosition(parseResult.ast, cursorPosition);

    if (nodeAtCursor) {
      // Suggest based on node type
      if (nodeAtCursor.type === 'FunctionCall') {
        suggestions.push(...this.getFunctionSuggestions(nodeAtCursor, context));
      } else if (nodeAtCursor.type === 'FieldRef') {
        suggestions.push(...this.getFieldSuggestions(nodeAtCursor, context));
      }
    }

    // Add general suggestions
    suggestions.push(...this.getGeneralSuggestions(currentFormula, context));

    // Rank and filter suggestions
    return this.rankSuggestions(suggestions, context)
      .slice(0, this.config.maxSuggestions);
  }

  /**
   * Explain a formula in natural language
   */
  explainFormula(formula) {
    try {
      const parseResult = this.parser.parse(formula);
      if (!parseResult.success) {
        return 'Invalid formula syntax';
      }

      return this.explainNode(parseResult.ast);
    } catch (error) {
      return 'Unable to explain formula';
    }
  }

  explainNode(node) {
    switch (node.type) {
      case 'FunctionCall':
        const funcMeta = FUNCTION_METADATA[node.name];
        if (funcMeta) {
          const args = node.args.map(arg => this.explainNode(arg)).join(', ');
          return `${funcMeta.description} of ${args}`;
        }
        return `${node.name} function`;

      case 'BinaryOp':
        const left = this.explainNode(node.left);
        const right = this.explainNode(node.right);
        const opName = this.getOperatorName(node.operator);
        return `${left} ${opName} ${right}`;

      case 'FieldRef':
        return `field "${node.field}"`;

      case 'Literal':
        return node.dataType === 'string' ? `"${node.value}"` : String(node.value);

      default:
        return 'expression';
    }
  }

  getOperatorName(op) {
    const names = {
      '+': 'plus',
      '-': 'minus',
      '*': 'times',
      '/': 'divided by',
      '>': 'greater than',
      '<': 'less than',
      '>=': 'greater than or equal to',
      '<=': 'less than or equal to',
      '==': 'equals',
      '!=': 'not equals'
    };
    return names[op] || op;
  }

  /**
   * Learn from user patterns
   */
  learnPattern(naturalLanguage, formula) {
    // Simple learning: remember exact matches
    const key = naturalLanguage.toLowerCase().trim();
    this.userPatterns.set(key, formula);

    // Limit learned patterns
    if (this.userPatterns.size > 100) {
      const firstKey = this.userPatterns.keys().next().value;
      this.userPatterns.delete(firstKey);
    }
  }

  /**
   * Cache management
   */
  getCacheKey(nl, context) {
    return `${nl.toLowerCase().trim()}-${JSON.stringify(context)}`;
  }

  getFromCache(key) {
    if (!this.config.cacheEnabled) return null;

    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
      return cached.data;
    }

    // Remove expired entry
    if (cached) {
      this.cache.delete(key);
    }

    return null;
  }

  addToCache(key, data) {
    if (!this.config.cacheEnabled) return;

    // Implement LRU eviction
    if (this.cache.size >= this.config.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Helper methods
   */
  async validateFormula(formula) {
    const parseResult = this.parser.parse(formula);
    if (!parseResult.success) {
      return { valid: false, errors: parseResult.errors };
    }

    return await this.validator.validate(parseResult.ast);
  }

  fuzzyMatch(input, pattern) {
    // Simple fuzzy matching
    const inputWords = input.split(/\s+/);
    const patternWords = pattern.split(/\s+/);

    let matched = 0;
    for (const patternWord of patternWords) {
      if (inputWords.some(w => w.includes(patternWord) || patternWord.includes(w))) {
        matched++;
      }
    }

    return matched / patternWords.length > 0.7;
  }

  matchesFormulaPattern(input, name, pattern) {
    const keywords = name.toLowerCase().split(/\s+/);
    const inputWords = input.split(/\s+/);

    return keywords.every(keyword =>
      inputWords.some(word => word.includes(keyword) || keyword.includes(word))
    );
  }

  getSimilarExamples(input) {
    const examples = [];

    for (const [name, pattern] of Object.entries(FORMULA_PATTERNS)) {
      const similarity = this.calculateSimilarity(input, name + ' ' + pattern.description);
      if (similarity > 0.3) {
        examples.push({
          formula: pattern.formula,
          explanation: pattern.description,
          confidence: similarity
        });
      }
    }

    return examples
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
  }

  calculateSimilarity(str1, str2) {
    // Simple word overlap similarity
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  findNodeAtPosition(ast, position) {
    // Simplified node finding - would be more complex in production
    return null;
  }

  getSyntaxFixSuggestions(formula, errors) {
    // Provide helpful suggestions for common syntax errors
    return errors.map(error => ({
      type: 'fix',
      description: error.message,
      action: 'fix-syntax',
      confidence: 0.9
    }));
  }

  getFunctionSuggestions(node, context) {
    // Suggest function arguments, related functions, etc.
    return [];
  }

  getFieldSuggestions(node, context) {
    // Suggest available fields from schema
    return [];
  }

  getGeneralSuggestions(formula, context) {
    // Suggest common patterns, optimizations, etc.
    return [];
  }

  rankSuggestions(suggestions, context) {
    // Rank by relevance, user history, etc.
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Remote AI integration (stub for production)
   */
  async generateFromRemoteAI(naturalLanguage, context) {
    // In production, this would call GPT-4, Claude, or specialized formula LLMs
    const response = await fetch(this.config.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        prompt: naturalLanguage,
        context,
        temperature: this.config.temperature,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.statusText}`);
    }

    return await response.json();
  }
}

/**
 * Web component for AI-powered formula input
 */
export class AIFormulaInput extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.ai = new FormulaAIAssistant();
    this.isProcessing = false;
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .ai-input-container {
          position: relative;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          overflow: hidden;
        }

        .ai-input-header {
          display: flex;
          align-items: center;
          padding: 0.75rem 1rem;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .ai-icon {
          width: 1.25rem;
          height: 1.25rem;
          margin-right: 0.5rem;
          color: #8b5cf6;
        }

        .ai-title {
          font-size: 0.875rem;
          font-weight: 500;
          color: #1e293b;
        }

        .ai-input-wrapper {
          padding: 1rem;
        }

        .nl-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          resize: none;
          min-height: 80px;
          font-family: inherit;
        }

        .nl-input:focus {
          outline: none;
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .ai-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.75rem;
        }

        .ai-button {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .ai-button.primary {
          background: #8b5cf6;
          color: white;
        }

        .ai-button.primary:hover {
          background: #7c3aed;
        }

        .ai-button.secondary {
          background: #f1f5f9;
          color: #475569;
        }

        .ai-button.secondary:hover {
          background: #e2e8f0;
        }

        .ai-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .ai-result {
          margin-top: 1rem;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 0.375rem;
          display: none;
        }

        .ai-result.visible {
          display: block;
        }

        .result-formula {
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 0.875rem;
          padding: 0.75rem;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 0.375rem;
          margin-bottom: 0.75rem;
        }

        .result-explanation {
          font-size: 0.813rem;
          color: #64748b;
          margin-bottom: 0.5rem;
        }

        .result-confidence {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .confidence-bar {
          flex: 1;
          height: 4px;
          background: #e2e8f0;
          border-radius: 2px;
          overflow: hidden;
        }

        .confidence-fill {
          height: 100%;
          background: #8b5cf6;
          transition: width 0.3s;
        }

        .alternatives {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e2e8f0;
        }

        .alternatives-title {
          font-size: 0.813rem;
          font-weight: 500;
          color: #64748b;
          margin-bottom: 0.5rem;
        }

        .alternative-item {
          padding: 0.5rem;
          margin: 0.25rem 0;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.813rem;
        }

        .alternative-item:hover {
          border-color: #8b5cf6;
          background: #faf5ff;
        }

        .spinner {
          display: inline-block;
          width: 1rem;
          height: 1rem;
          border: 2px solid #e2e8f0;
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>

      <div class="ai-input-container">
        <div class="ai-input-header">
          <svg class="ai-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
          </svg>
          <span class="ai-title">AI Formula Assistant</span>
        </div>

        <div class="ai-input-wrapper">
          <textarea
            class="nl-input"
            placeholder="Describe what you want to calculate in plain English...&#10;&#10;Examples:&#10;• Calculate the error rate&#10;• Show week over week revenue growth&#10;• Find the 95th percentile of response times"
            rows="4"
          ></textarea>

          <div class="ai-actions">
            <button class="ai-button primary" data-action="generate">
              <span class="button-text">Generate Formula</span>
            </button>
            <button class="ai-button secondary" data-action="clear">Clear</button>
          </div>

          <div class="ai-result">
            <div class="result-content"></div>
          </div>
        </div>
      </div>
    `;

    this.nlInput = this.shadowRoot.querySelector('.nl-input');
    this.generateButton = this.shadowRoot.querySelector('[data-action="generate"]');
    this.clearButton = this.shadowRoot.querySelector('[data-action="clear"]');
    this.resultContainer = this.shadowRoot.querySelector('.ai-result');
    this.resultContent = this.shadowRoot.querySelector('.result-content');
  }

  setupEventListeners() {
    this.generateButton.addEventListener('click', () => this.generateFormula());
    this.clearButton.addEventListener('click', () => this.clear());

    this.nlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.generateFormula();
      }
    });

    // Handle alternative selection
    this.shadowRoot.addEventListener('click', (e) => {
      if (e.target.closest('.alternative-item')) {
        const formula = e.target.closest('.alternative-item').dataset.formula;
        this.selectFormula(formula);
      }
    });
  }

  async generateFormula() {
    const input = this.nlInput.value.trim();
    if (!input || this.isProcessing) return;

    this.isProcessing = true;
    this.generateButton.disabled = true;
    this.generateButton.querySelector('.button-text').innerHTML = '<span class="spinner"></span> Generating...';

    try {
      const result = await this.ai.generateFormula(input);
      this.displayResult(result);
    } catch (error) {
      this.displayError(error.message);
    } finally {
      this.isProcessing = false;
      this.generateButton.disabled = false;
      this.generateButton.querySelector('.button-text').textContent = 'Generate Formula';
    }
  }

  displayResult(result) {
    if (!result.formula) {
      this.resultContent.innerHTML = `
        <div style="color: #ef4444; font-size: 0.875rem;">
          ${result.explanation || 'Could not generate a formula from your description.'}
        </div>
      `;
    } else {
      this.resultContent.innerHTML = `
        <div class="result-formula">${result.formula}</div>
        <div class="result-explanation">${result.explanation}</div>
        <div class="result-confidence">
          <span>Confidence:</span>
          <div class="confidence-bar">
            <div class="confidence-fill" style="width: ${result.confidence * 100}%"></div>
          </div>
          <span>${Math.round(result.confidence * 100)}%</span>
        </div>

        ${result.alternatives && result.alternatives.length > 0 ? `
          <div class="alternatives">
            <div class="alternatives-title">Alternative formulas:</div>
            ${result.alternatives.map(alt => `
              <div class="alternative-item" data-formula="${alt.formula}">
                <div style="font-family: Monaco, Consolas, monospace; font-size: 0.813rem;">
                  ${alt.formula}
                </div>
                <div style="color: #94a3b8; font-size: 0.75rem; margin-top: 0.25rem;">
                  ${alt.explanation}
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      `;

      // Dispatch event with generated formula
      this.dispatchEvent(new CustomEvent('formula-generated', {
        detail: { formula: result.formula, result }
      }));
    }

    this.resultContainer.classList.add('visible');
  }

  displayError(message) {
    this.resultContent.innerHTML = `
      <div style="color: #ef4444; font-size: 0.875rem;">
        Error: ${message}
      </div>
    `;
    this.resultContainer.classList.add('visible');
  }

  selectFormula(formula) {
    this.dispatchEvent(new CustomEvent('formula-selected', {
      detail: { formula }
    }));
  }

  clear() {
    this.nlInput.value = '';
    this.resultContainer.classList.remove('visible');
    this.resultContent.innerHTML = '';
  }
}

// Register custom element
customElements.define('ai-formula-input', AIFormulaInput);
