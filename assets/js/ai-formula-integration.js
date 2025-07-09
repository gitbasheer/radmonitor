/**
 * AI Formula Integration Module (Simplified)
 * Natural language interface for creating monitoring formulas
 *
 * @module AIFormulaIntegration
 */

import { FormulaAIAssistant } from './formula-builder/ai/formula-ai-assistant.js';
import { EnhancedFormulaValidator } from './formula-builder/core/enhanced-validator.js';
import { EnhancedFormulaParser } from './formula-builder/core/enhanced-ast-parser.js';

// Configuration
const CONFIG = {
  placeholder: '🤖 Ask me anything: "Show traffic drops over 50%", "Alert when errors exceed 10%"...',
  minInputLength: 5,
  debounceDelay: 500,
  maxSuggestions: 3,
  showConfidenceScores: true,
  enableLearning: true,
  maxLearnedPatterns: 100,
  successDuration: 3000,
  errorDuration: 5000
};

// CSS styles as a constant
const STYLES = `
  .ai-formula-container { width: 100%; margin: 20px 0; }
  .ai-formula-wrapper { position: relative; }
  .ai-input-group { display: flex; gap: 8px; margin-bottom: 12px; }

  .ai-formula-input {
    flex: 1; padding: 12px 16px; font-size: 14px;
    border: 2px solid #e0e0e0; border-radius: 8px;
    background: white; transition: all 0.2s; outline: none;
  }

  .ai-formula-input:focus {
    border-color: #2196F3;
    box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
  }

  .ai-generate-btn {
    padding: 12px 20px; background: #2196F3; color: white;
    border: none; border-radius: 8px; cursor: pointer;
    font-size: 16px; transition: all 0.2s;
    display: flex; align-items: center; gap: 6px;
  }

  .ai-generate-btn:hover {
    background: #1976D2; transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .ai-generate-btn.loading { background: #ccc; cursor: not-allowed; }

  .ai-formula-results {
    background: white; border: 1px solid #e0e0e0;
    border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    padding: 16px; animation: slideDown 0.3s ease-out;
  }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .ai-result-item {
    padding: 12px; margin-bottom: 12px;
    border: 1px solid #e0e0e0; border-radius: 6px;
    cursor: pointer; transition: all 0.2s;
  }

  .ai-result-item:hover { border-color: #2196F3; background: #f5f5f5; }

  .ai-formula-code {
    font-family: monospace; font-size: 13px;
    background: #f0f4f8; padding: 8px 12px;
    border-radius: 4px; color: #1976D2;
  }

  .ai-confidence {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 12px; color: #666; float: right;
  }

  .ai-confidence-bar {
    width: 60px; height: 6px; background: #e0e0e0;
    border-radius: 3px; overflow: hidden;
  }

  .ai-confidence-fill {
    height: 100%; background: #4CAF50; transition: width 0.3s;
  }

  .ai-confidence-fill.medium { background: #FFC107; }
  .ai-confidence-fill.low { background: #f44336; }

  .ai-explanation { font-size: 12px; color: #666; margin-top: 6px; }

  .ai-actions { display: flex; gap: 8px; margin-top: 10px; }

  .ai-action-btn {
    padding: 6px 12px; font-size: 12px;
    border: none; border-radius: 4px;
    cursor: pointer; transition: all 0.2s;
  }

  .ai-apply-btn { background: #4CAF50; color: white; }
  .ai-apply-btn:hover { background: #45a049; }

  .ai-feedback-btn { background: #f0f0f0; color: #666; }
  .ai-feedback-btn:hover { background: #e0e0e0; }
  .ai-feedback-btn.positive { background: #E8F5E9; color: #4CAF50; }
  .ai-feedback-btn.negative { background: #FFEBEE; color: #f44336; }

  .ai-error {
    background: #FFEBEE; color: #c62828;
    padding: 12px; border-radius: 6px; font-size: 13px;
  }

  .ai-no-results {
    text-align: center; color: #999;
    padding: 20px; font-size: 14px;
  }

  .ai-success-message {
    position: fixed; top: 20px; right: 20px;
    background: #4CAF50; color: white;
    padding: 16px 24px; border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    animation: slideInRight 0.3s ease-out; z-index: 10000;
  }

  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(100px); }
    to { opacity: 1; transform: translateX(0); }
  }
`;

/**
 * AI Formula Integration - Simplified and optimized
 */
class AIFormulaIntegration {
  constructor() {
    this.aiAssistant = new FormulaAIAssistant({
      enableRemoteAI: false,
      cacheEnabled: true,
      maxSuggestions: CONFIG.maxSuggestions
    });

    this.validator = new EnhancedFormulaValidator();
    this.parser = new EnhancedFormulaParser();
    this.elements = {};
    this.debounceTimer = null;
    this.initialized = false;
    this.lastQuery = '';
  }

  /**
   * Initialize the integration
   */
  async init() {
    if (this.initialized) return;

    try {
      this.injectStyles();
      this.createUI();
      this.setupEventListeners();
      this.loadLearnedPatterns();

      this.initialized = true;
      console.log('(✓)AI Formula Integration ready');
    } catch (error) {
      console.error('(✗) AI Integration failed:', error);
    }
  }

  /**
   * Inject styles once
   */
  injectStyles() {
    if (document.getElementById('ai-formula-styles')) return;

    const style = document.createElement('style');
    style.id = 'ai-formula-styles';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  /**
   * Create UI elements
   */
  createUI() {
    const header = document.querySelector('.header');
    if (!header) {
      console.warn('Dashboard header not found - skipping UI creation');
      return; // Gracefully handle missing header in test environments
    }

    const container = this.createElement('div', {
      className: 'ai-formula-container',
      innerHTML: `
        <div class="ai-formula-wrapper">
          <div class="ai-input-group">
            <input type="text" id="aiFormulaInput" class="ai-formula-input"
                   placeholder="${CONFIG.placeholder}" autocomplete="off">
            <button id="aiGenerateBtn" class="ai-generate-btn" title="Generate Formula">
              <span class="ai-icon">✨</span>
            </button>
          </div>
          <div id="aiFormulaResults" class="ai-formula-results" style="display: none;"></div>
        </div>
      `
    });

    // Insert after title
    const title = header.querySelector('h1');
    header.insertBefore(container, title ? title.nextSibling : header.firstChild);

    // Store element references
    this.elements = {
      container,
      input: document.getElementById('aiFormulaInput'),
      button: document.getElementById('aiGenerateBtn'),
      results: document.getElementById('aiFormulaResults')
    };
  }

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    const { input, button, container } = this.elements;

    // Check if elements exist before setting up listeners
    if (!input || !button || !container) {
      console.warn('UI elements not found - skipping event listener setup');
      return;
    }

    // Input handling with debounce
    input.addEventListener('input', (e) => this.handleInput(e.target.value));
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.generateFormula();
    });

    // Generate button
    button.addEventListener('click', () => this.generateFormula());

    // Click outside to close
    document.addEventListener('click', (e) => {
      if (!container.contains(e.target)) this.hideResults();
    });
  }

  /**
   * Handle input with debouncing
   */
  handleInput(value) {
    clearTimeout(this.debounceTimer);

    if (value.trim().length < CONFIG.minInputLength) {
      this.hideResults();
      return;
    }

    this.debounceTimer = setTimeout(() => this.generateFormula(), CONFIG.debounceDelay);
  }

  /**
   * Generate formula from input
   */
  async generateFormula() {
    const input = this.elements.input.value.trim();

    if (input.length < CONFIG.minInputLength) {
      this.showError('Please enter a more detailed description');
      return;
    }

    this.setLoading(true);
    this.lastQuery = input;

    try {
      const result = await this.aiAssistant.generateFormula(input, {
        dashboardContext: this.getDashboardContext()
      });

      this.displayResults(result);
    } catch (error) {
      console.error('Generation error:', error);
      this.showError('Failed to generate formula. Please try again.');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Display results in a cleaner way
   */
  displayResults(result) {
    const { results } = this.elements;

    if (!result?.formula && !result?.alternatives?.length) {
      results.innerHTML = this.createNoResultsHTML();
      results.style.display = 'block';
      return;
    }

    // Collect all results
    const allResults = [];
    if (result.formula) {
      allResults.push({
        formula: result.formula,
        explanation: result.explanation,
        confidence: result.confidence
      });
    }
    if (result.alternatives) {
      allResults.push(...result.alternatives);
    }

    // Render results
    results.innerHTML = allResults.map((item, index) =>
      this.createResultHTML(item, index)
    ).join('');

    results.style.display = 'block';
    this.attachResultListeners();
  }

  /**
   * Create result item HTML
   */
  createResultHTML(result, index) {
    const confidence = Math.round(result.confidence * 100);
    const confidenceClass = result.confidence >= 0.8 ? 'high' :
                          result.confidence >= 0.6 ? 'medium' : 'low';

    return `
      <div class="ai-result-item" data-formula="${this.escape(result.formula)}">
        <div class="ai-formula-code">
          ${this.escape(result.formula)}
          ${CONFIG.showConfidenceScores ? `
            <div class="ai-confidence">
              <span>${confidence}%</span>
              <div class="ai-confidence-bar">
                <div class="ai-confidence-fill ${confidenceClass}"
                     style="width: ${confidence}%"></div>
              </div>
            </div>
          ` : ''}
        </div>
        <div class="ai-explanation">${this.escape(result.explanation)}</div>
        <div class="ai-actions">
          <button class="ai-action-btn ai-apply-btn" data-action="apply">
            Apply Formula
          </button>
          <button class="ai-action-btn ai-feedback-btn" data-action="positive" title="👍">
            👍
          </button>
          <button class="ai-action-btn ai-feedback-btn" data-action="negative" title="👎">
            👎
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Create no results HTML
   */
  createNoResultsHTML() {
    return `
      <div class="ai-no-results">
        <p>I couldn't understand that request. Try describing it differently.</p>
        <p style="margin-top: 8px; font-size: 12px;">
          Examples: "Show traffic drops over 50%", "Alert when errors exceed 10%"
        </p>
      </div>
    `;
  }

  /**
   * Attach event listeners to results
   */
  attachResultListeners() {
    this.elements.results.addEventListener('click', (e) => {
      const button = e.target.closest('.ai-action-btn');
      if (!button) return;

      const resultItem = button.closest('.ai-result-item');
      const formula = resultItem.dataset.formula;
      const action = button.dataset.action;

      switch (action) {
        case 'apply':
          this.applyFormula(formula);
          break;
        case 'positive':
        case 'negative':
          this.provideFeedback(formula, action === 'positive');
          button.classList.add(action);
          break;
      }
    });
  }

  /**
   * Apply formula to dashboard
   */
  async applyFormula(formula) {
    try {
      // Validate formula
      const parseResult = this.parser.parse(formula);
      if (!parseResult.success) {
        throw new Error('Invalid formula syntax');
      }

      const validation = await this.validator.validate(parseResult.ast);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      // Apply to editor
      const editor = document.getElementById('formulaEditor');
      if (!editor?.setValue) {
        throw new Error('Formula editor not found');
      }

      editor.setValue(formula);
      editor.dispatchEvent(new CustomEvent('formula-change', {
        detail: { formula, source: 'ai-assistant' },
        bubbles: true
      }));

      // Success
      this.hideResults();
      this.elements.input.value = '';
      this.showSuccess('Formula applied successfully!');

      // Learn from success
      if (this.lastQuery) {
        this.learnPattern(this.lastQuery, formula);
      }

    } catch (error) {
      this.showError(error.message || 'Failed to apply formula');
    }
  }

  /**
   * Provide feedback and learn
   */
  provideFeedback(formula, positive) {
    if (positive && this.lastQuery) {
      this.learnPattern(this.lastQuery, formula);
    }

    this.showSuccess(positive ? 'Thanks for the feedback!' : 'Thanks, we\'ll improve', 2000);
  }

  /**
   * Learn pattern helper
   */
  learnPattern(query, formula) {
    if (!CONFIG.enableLearning) return;

    this.aiAssistant.learnPattern(query, formula);

    try {
      const patterns = JSON.parse(localStorage.getItem('aiLearnedPatterns') || '{}');
      patterns[query.toLowerCase()] = {
        formula,
        count: (patterns[query.toLowerCase()]?.count || 0) + 1,
        lastUsed: Date.now()
      };

      // Keep only recent patterns
      const recent = Object.entries(patterns)
        .sort((a, b) => b[1].lastUsed - a[1].lastUsed)
        .slice(0, CONFIG.maxLearnedPatterns);

      localStorage.setItem('aiLearnedPatterns', JSON.stringify(Object.fromEntries(recent)));
    } catch (error) {
      console.error('Failed to save pattern:', error);
    }
  }

  /**
   * Load learned patterns
   */
  loadLearnedPatterns() {
    if (!CONFIG.enableLearning) return;

    try {
      const patterns = JSON.parse(localStorage.getItem('aiLearnedPatterns') || '{}');
      Object.entries(patterns).forEach(([query, data]) => {
        this.aiAssistant.learnPattern(query, data.formula);
      });
    } catch (error) {
      console.error('Failed to load patterns:', error);
    }
  }

  /**
   * Get dashboard context
   */
  getDashboardContext() {
    return {
      timeRange: document.getElementById('quickTimeRange')?.textContent || 'now-12h',
      baseline: document.getElementById('quickBaseline')?.textContent || 'unknown',
      activeFilters: this.getActiveFilters()
    };
  }

  /**
   * Get active filters
   */
  getActiveFilters() {
    const filters = [];

    // Status filter
    const statusFilter = document.querySelector('.filter-btn.active');
    if (statusFilter?.dataset.filter !== 'all') {
      filters.push({ type: 'status', value: statusFilter.dataset.filter });
    }

    // RAD type filters
    document.querySelectorAll('#radTypeButtons .filter-btn.active').forEach(btn => {
      if (btn.dataset.radType !== 'all') {
        filters.push({ type: 'rad_type', value: btn.dataset.radType });
      }
    });

    return filters;
  }

  /**
   * UI Helper Methods
   */
  setLoading(loading) {
    const { button, results } = this.elements;
    button.classList.toggle('loading', loading);
    button.disabled = loading;

    if (loading) {
      results.innerHTML = '<div class="ai-no-results">Generating formula...</div>';
      results.style.display = 'block';
    }
  }

  hideResults() {
    this.elements.results.style.display = 'none';
  }

  showError(message) {
    const { results } = this.elements;
    results.innerHTML = `<div class="ai-error">${this.escape(message)}</div>`;
    results.style.display = 'block';

    setTimeout(() => this.hideResults(), CONFIG.errorDuration);
  }

  showSuccess(message, duration = CONFIG.successDuration) {
    const success = this.createElement('div', {
      className: 'ai-success-message',
      textContent: message
    });

    document.body.appendChild(success);
    setTimeout(() => success.remove(), duration);
  }

  /**
   * Utility methods
   */
  createElement(tag, props = {}) {
    const element = document.createElement(tag);
    Object.assign(element, props);
    return element;
  }

  escape(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize
const aiFormulaIntegration = new AIFormulaIntegration();

// Only auto-initialize in non-test environments
if (typeof window !== 'undefined' && typeof window.__TEST__ === 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => aiFormulaIntegration.init());
  } else {
    aiFormulaIntegration.init();
  }
}

// Export
if (typeof window !== 'undefined') {
  window.aiFormulaIntegration = aiFormulaIntegration;
}
export { aiFormulaIntegration };
