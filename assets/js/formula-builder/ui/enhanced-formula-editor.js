/**
 * Enhanced Formula Editor with Syntax Highlighting and Autocomplete
 * Features:
 * - Real-time syntax highlighting
 * - Context-aware autocomplete (<100ms)
 * - Error underlining
 * - Keyboard shortcuts
 * - Mobile support
 */

import { EnhancedFormulaParser } from '../core/enhanced-ast-parser.js';
import { FUNCTION_METADATA } from '../core/formula-functions.js';

// Editor configuration
const EDITOR_CONFIG = {
  autocompleteDelay: 150, // ms
  autocompleteMinChars: 1,
  maxSuggestions: 10,
  syntaxHighlightDelay: 50, // ms
  lineHeight: 24,
  fontSize: 14,
  tabSize: 2
};

// Syntax highlighting theme
const SYNTAX_THEME = {
  function: '#2563eb', // blue
  field: '#10b981', // green
  number: '#f59e0b', // amber
  string: '#ec4899', // pink
  operator: '#8b5cf6', // purple
  parenthesis: '#64748b', // gray
  keyword: '#ef4444', // red
  comment: '#94a3b8', // light gray
  error: '#dc2626' // dark red
};

/**
 * Enhanced formula editor component
 */
export class EnhancedFormulaEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // Core services
    this.parser = new EnhancedFormulaParser();

    // State
    this.value = '';
    this.cursorPosition = 0;
    this.selectionStart = 0;
    this.selectionEnd = 0;
    this.suggestions = [];
    this.selectedSuggestion = -1;
    this.syntaxHighlightTimer = null;
    this.autocompleteTimer = null;
    this.lastParseResult = null;
    this.history = [];
    this.historyIndex = -1;

    // Performance tracking
    this.lastAutocompleteTime = 0;

    // Mobile detection
    this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.setupKeyboardShortcuts();

    // Initialize with value if provided
    if (this.hasAttribute('value')) {
      this.setValue(this.getAttribute('value'));
    } else if (this._pendingValue) {
      // Set pending value if there was one
      this.setValue(this._pendingValue);
      this._pendingValue = null;
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --editor-bg: #ffffff;
          --editor-border: #e2e8f0;
          --editor-focus-border: #2563eb;
          --editor-text: #1e293b;
          --editor-selection: rgba(37, 99, 235, 0.2);
          --editor-cursor: #2563eb;
          --autocomplete-bg: #ffffff;
          --autocomplete-border: #e2e8f0;
          --autocomplete-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          --autocomplete-selected: #f8fafc;
          --line-number-color: #94a3b8;
          --error-underline: #ef4444;

          display: block;
          position: relative;
          font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
        }

        .editor-container {
          position: relative;
          background: var(--editor-bg);
          border: 1px solid var(--editor-border);
          border-radius: 0.375rem;
          overflow: hidden;
          transition: border-color 0.2s;
        }

        .editor-container:focus-within {
          border-color: var(--editor-focus-border);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .editor-wrapper {
          display: flex;
          min-height: 100px;
          max-height: 400px;
          overflow: auto;
        }

        .line-numbers {
          background: #f8fafc;
          border-right: 1px solid var(--editor-border);
          padding: 0.75rem 0;
          text-align: right;
          user-select: none;
          flex-shrink: 0;
        }

        .line-number {
          display: block;
          padding: 0 0.75rem;
          color: var(--line-number-color);
          font-size: ${EDITOR_CONFIG.fontSize}px;
          line-height: ${EDITOR_CONFIG.lineHeight}px;
        }

        .editor-content {
          flex: 1;
          position: relative;
          padding: 0.75rem 1rem;
        }

        .editor-layers {
          position: relative;
        }

        .editor-layer {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          font-size: ${EDITOR_CONFIG.fontSize}px;
          line-height: ${EDITOR_CONFIG.lineHeight}px;
          white-space: pre-wrap;
          word-wrap: break-word;
          pointer-events: none;
        }

        .syntax-highlight {
          color: transparent;
        }

        .syntax-highlight .token-function { color: ${SYNTAX_THEME.function}; }
        .syntax-highlight .token-field { color: ${SYNTAX_THEME.field}; }
        .syntax-highlight .token-number { color: ${SYNTAX_THEME.number}; }
        .syntax-highlight .token-string { color: ${SYNTAX_THEME.string}; }
        .syntax-highlight .token-operator { color: ${SYNTAX_THEME.operator}; }
        .syntax-highlight .token-parenthesis { color: ${SYNTAX_THEME.parenthesis}; }
        .syntax-highlight .token-keyword { color: ${SYNTAX_THEME.keyword}; }
        .syntax-highlight .token-error {
          color: ${SYNTAX_THEME.error};
          text-decoration: wavy underline;
          text-decoration-color: ${SYNTAX_THEME.error};
        }

        .editor-input {
          position: relative;
          background: transparent;
          border: none;
          outline: none;
          font-family: inherit;
          font-size: ${EDITOR_CONFIG.fontSize}px;
          line-height: ${EDITOR_CONFIG.lineHeight}px;
          color: var(--editor-text);
          resize: none;
          width: 100%;
          min-height: ${EDITOR_CONFIG.lineHeight * 3}px;
          padding: 0;
          margin: 0;
          white-space: pre-wrap;
          word-wrap: break-word;
          caret-color: var(--editor-cursor);
        }

        .editor-input::selection {
          background: var(--editor-selection);
        }

        /* Autocomplete dropdown */
        .autocomplete-container {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 4px;
          background: var(--autocomplete-bg);
          border: 1px solid var(--autocomplete-border);
          border-radius: 0.375rem;
          box-shadow: var(--autocomplete-shadow);
          max-height: 200px;
          overflow-y: auto;
          z-index: 1000;
          opacity: 0;
          transform: translateY(-10px);
          transition: opacity 0.2s, transform 0.2s;
          pointer-events: none;
        }

        .autocomplete-container.visible {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }

        .autocomplete-list {
          padding: 0.5rem 0;
        }

        .autocomplete-item {
          display: flex;
          align-items: center;
          padding: 0.5rem 1rem;
          cursor: pointer;
          transition: background-color 0.1s;
        }

        .autocomplete-item:hover,
        .autocomplete-item.selected {
          background: var(--autocomplete-selected);
        }

        .autocomplete-icon {
          width: 1rem;
          height: 1rem;
          margin-right: 0.5rem;
          opacity: 0.7;
        }

        .autocomplete-content {
          flex: 1;
        }

        .autocomplete-name {
          font-weight: 500;
          font-size: 0.875rem;
          color: var(--editor-text);
        }

        .autocomplete-match {
          background: rgba(37, 99, 235, 0.2);
          font-weight: 600;
        }

        .autocomplete-description {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 0.125rem;
        }

        .autocomplete-signature {
          font-size: 0.75rem;
          color: #8b5cf6;
          margin-left: 0.5rem;
        }

        /* Status bar */
        .status-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.375rem 1rem;
          background: #f8fafc;
          border-top: 1px solid var(--editor-border);
          font-size: 0.75rem;
          color: #64748b;
        }

        .status-position {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .status-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .status-indicator {
          display: inline-block;
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 50%;
          margin-right: 0.25rem;
        }

        .status-indicator.valid { background: #10b981; }
        .status-indicator.invalid { background: #ef4444; }
        .status-indicator.typing { background: #f59e0b; }

        /* Mobile optimizations */
        @media (max-width: 640px) {
          .editor-wrapper {
            min-height: 150px;
          }

          .line-numbers {
            padding: 0.5rem 0;
          }

          .editor-content {
            padding: 0.5rem 0.75rem;
          }

          .autocomplete-container {
            position: fixed;
            left: 1rem;
            right: 1rem;
            bottom: 1rem;
            top: auto;
            max-height: 50vh;
          }
        }

        /* Accessibility */
        @media (prefers-reduced-motion: reduce) {
          .autocomplete-container {
            transition: none;
          }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          :host {
            --editor-bg: #1e293b;
            --editor-border: #334155;
            --editor-text: #f1f5f9;
            --autocomplete-bg: #1e293b;
            --autocomplete-selected: #334155;
          }

          .line-numbers {
            background: #0f172a;
          }

          .status-bar {
            background: #0f172a;
          }
        }
      </style>

      <div class="editor-container" role="textbox" aria-multiline="true" aria-label="Formula editor">
        <div class="editor-wrapper">
          <div class="line-numbers" aria-hidden="true">
            ${this.renderLineNumbers()}
          </div>

          <div class="editor-content">
            <div class="editor-layers">
              <div class="editor-layer syntax-highlight" aria-hidden="true">
                ${this.renderSyntaxHighlight()}
              </div>
              <textarea
                class="editor-input"
                spellcheck="false"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                aria-label="Formula input"
                placeholder="Enter formula..."
              ></textarea>
            </div>
          </div>
        </div>

        <div class="status-bar">
          <div class="status-position">
            <span>Ln <span class="line-num">1</span>, Col <span class="col-num">1</span></span>
            <span><span class="char-count">0</span> characters</span>
          </div>
          <div class="status-info">
            <span class="validation-status">
              <span class="status-indicator typing"></span>
              Ready
            </span>
            <span class="autocomplete-time" hidden>
              AC: <span class="time-value">0</span>ms
            </span>
          </div>
        </div>

        <div class="autocomplete-container" role="listbox" aria-label="Suggestions">
          <div class="autocomplete-list">
            ${this.renderAutocomplete()}
          </div>
        </div>
      </div>
    `;

    // Cache DOM elements
    this.editorInput = this.shadowRoot.querySelector('.editor-input');
    this.syntaxLayer = this.shadowRoot.querySelector('.syntax-highlight');
    this.autocompleteContainer = this.shadowRoot.querySelector('.autocomplete-container');
    this.autocompleteList = this.shadowRoot.querySelector('.autocomplete-list');
    this.lineNumbers = this.shadowRoot.querySelector('.line-numbers');
    this.statusBar = this.shadowRoot.querySelector('.status-bar');
  }

  renderLineNumbers() {
    const lines = this.value.split('\n').length;
    return Array.from({ length: Math.max(3, lines) }, (_, i) =>
      `<span class="line-number">${i + 1}</span>`
    ).join('');
  }

  renderSyntaxHighlight() {
    if (!this.value) return '';

    // Use cached parse result if available
    if (!this.lastParseResult) {
      return this.escapeHtml(this.value);
    }

    // Tokenize and highlight
    const tokens = this.tokenizeForHighlight(this.value);
    return tokens.map(token => {
      const className = this.getTokenClass(token);
      const content = this.escapeHtml(token.value);
      return className ? `<span class="${className}">${content}</span>` : content;
    }).join('');
  }

  renderAutocomplete() {
    if (this.suggestions.length === 0) {
      return '<div class="autocomplete-item">No suggestions</div>';
    }

    return this.suggestions.map((suggestion, index) => `
      <div class="autocomplete-item ${index === this.selectedSuggestion ? 'selected' : ''}"
           data-index="${index}"
           role="option"
           aria-selected="${index === this.selectedSuggestion}">
        <svg class="autocomplete-icon" fill="currentColor" viewBox="0 0 20 20">
          ${this.getIconForSuggestion(suggestion)}
        </svg>
        <div class="autocomplete-content">
          <span class="autocomplete-name">
            ${this.highlightMatch(suggestion.name, suggestion.match)}
          </span>
          ${suggestion.signature ? `<span class="autocomplete-signature">${suggestion.signature}</span>` : ''}
          ${suggestion.description ? `<div class="autocomplete-description">${suggestion.description}</div>` : ''}
        </div>
      </div>
    `).join('');
  }

  setupEventListeners() {
    // Input events
    this.editorInput.addEventListener('input', (e) => {
      this.handleInput(e);
    });

    this.editorInput.addEventListener('keydown', (e) => {
      this.handleKeyDown(e);
    });

    this.editorInput.addEventListener('selectionchange', (e) => {
      this.updateCursorPosition();
    });

    // Autocomplete events
    this.autocompleteList.addEventListener('click', (e) => {
      const item = e.target.closest('.autocomplete-item');
      if (item) {
        const index = parseInt(item.dataset.index);
        this.acceptSuggestion(index);
      }
    });

    // Focus management
    this.editorInput.addEventListener('focus', () => {
      this.dispatchEvent(new Event('focus'));
    });

    this.editorInput.addEventListener('blur', () => {
      // Hide autocomplete on blur (with delay for click handling)
      setTimeout(() => {
        this.hideAutocomplete();
      }, 200);
      this.dispatchEvent(new Event('blur'));
    });

    // Mobile-specific events
    if (this.isMobile) {
      this.setupMobileEvents();
    }
  }

  setupKeyboardShortcuts() {
    // Keyboard shortcuts map
    this.shortcuts = new Map([
      // Autocomplete navigation
      ['ArrowDown', (e) => {
        if (this.isAutocompleteVisible()) {
          e.preventDefault();
          this.selectNextSuggestion();
        }
      }],
      ['ArrowUp', (e) => {
        if (this.isAutocompleteVisible()) {
          e.preventDefault();
          this.selectPreviousSuggestion();
        }
      }],
      ['Enter', (e) => {
        if (this.isAutocompleteVisible() && this.selectedSuggestion >= 0) {
          e.preventDefault();
          this.acceptSuggestion(this.selectedSuggestion);
        }
      }],
      ['Tab', (e) => {
        if (this.isAutocompleteVisible() && this.selectedSuggestion >= 0) {
          e.preventDefault();
          this.acceptSuggestion(this.selectedSuggestion);
        }
      }],
      ['Escape', (e) => {
        if (this.isAutocompleteVisible()) {
          e.preventDefault();
          this.hideAutocomplete();
        }
      }],

      // History navigation
      ['Ctrl+Z', (e) => {
        e.preventDefault();
        this.undo();
      }],
      ['Cmd+Z', (e) => {
        e.preventDefault();
        this.undo();
      }],
      ['Ctrl+Shift+Z', (e) => {
        e.preventDefault();
        this.redo();
      }],
      ['Cmd+Shift+Z', (e) => {
        e.preventDefault();
        this.redo();
      }],

      // Formatting
      ['Ctrl+Space', (e) => {
        e.preventDefault();
        this.triggerAutocomplete();
      }],
      ['Cmd+Space', (e) => {
        e.preventDefault();
        this.triggerAutocomplete();
      }]
    ]);
  }

  handleInput(e) {
    const newValue = this.editorInput.value;
    const changed = newValue !== this.value;

    if (changed) {
      // Update value
      this.value = newValue;

      // Add to history
      this.addToHistory(newValue);

      // Update UI
      this.updateLineNumbers();
      this.updateStatus();

      // Schedule syntax highlighting
      this.scheduleSyntaxHighlight();

      // Schedule autocomplete
      this.scheduleAutocomplete();

      // Dispatch change event
      this.dispatchEvent(new CustomEvent('input', {
        detail: { value: newValue }
      }));
    }
  }

  handleKeyDown(e) {
    // Check shortcuts
    const shortcutKey = this.getShortcutKey(e);
    const handler = this.shortcuts.get(shortcutKey);

    if (handler) {
      handler(e);
    }
  }

  getShortcutKey(e) {
    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.metaKey) parts.push('Cmd');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');
    parts.push(e.key);
    return parts.join('+');
  }

  scheduleSyntaxHighlight() {
    // Clear existing timer
    if (this.syntaxHighlightTimer) {
      clearTimeout(this.syntaxHighlightTimer);
    }

    // Schedule new highlight
    this.syntaxHighlightTimer = setTimeout(() => {
      this.performSyntaxHighlight();
    }, EDITOR_CONFIG.syntaxHighlightDelay);
  }

  performSyntaxHighlight() {
    const startTime = performance.now();

    // Parse formula
    this.lastParseResult = this.parser.parse(this.value);

    // Update syntax highlighting
    this.syntaxLayer.innerHTML = this.renderSyntaxHighlight();

    // Update status
    const parseTime = performance.now() - startTime;
    this.updateValidationStatus(this.lastParseResult.success, parseTime);
  }

  scheduleAutocomplete() {
    // Clear existing timer
    if (this.autocompleteTimer) {
      clearTimeout(this.autocompleteTimer);
    }

    // Schedule autocomplete
    this.autocompleteTimer = setTimeout(() => {
      this.performAutocomplete();
    }, EDITOR_CONFIG.autocompleteDelay);
  }

  async performAutocomplete() {
    const startTime = performance.now();

    // Get current context
    const context = this.getAutocompleteContext();

    if (!context || context.prefix.length < EDITOR_CONFIG.autocompleteMinChars) {
      this.hideAutocomplete();
      return;
    }

    // Generate suggestions
    this.suggestions = await this.generateSuggestions(context);

    // Update autocomplete UI
    if (this.suggestions.length > 0) {
      this.autocompleteList.innerHTML = this.renderAutocomplete();
      this.showAutocomplete();
      this.selectedSuggestion = 0;
    } else {
      this.hideAutocomplete();
    }

    // Track performance
    this.lastAutocompleteTime = Math.round(performance.now() - startTime);
    this.updateAutocompleteTime();
  }

  getAutocompleteContext() {
    const position = this.editorInput.selectionStart;
    const value = this.value;

    // Find word boundaries
    let start = position;
    while (start > 0 && /[a-zA-Z0-9_.]/.test(value[start - 1])) {
      start--;
    }

    const prefix = value.substring(start, position);

    // Determine context type
    let contextType = 'function'; // default

    // Check if we're inside parentheses
    let parenDepth = 0;
    for (let i = 0; i < start; i++) {
      if (value[i] === '(') parenDepth++;
      if (value[i] === ')') parenDepth--;
    }

    if (parenDepth > 0) {
      // We're inside a function call - suggest fields
      contextType = 'field';
    }

    return {
      prefix,
      position,
      start,
      type: contextType
    };
  }

  async generateSuggestions(context) {
    const suggestions = [];
    const prefix = context.prefix.toLowerCase();

    if (context.type === 'function') {
      // Suggest functions
      for (const [name, metadata] of Object.entries(FUNCTION_METADATA)) {
        if (name.toLowerCase().includes(prefix)) {
          suggestions.push({
            name,
            type: 'function',
            description: metadata.description,
            signature: this.getFunctionSignature(name),
            match: prefix,
            score: this.calculateMatchScore(name, prefix)
          });
        }
      }
    } else if (context.type === 'field') {
      // Suggest fields (would come from schema in real implementation)
      const sampleFields = ['bytes', 'response_time', 'status_code', 'user.id', 'product.price'];
      for (const field of sampleFields) {
        if (field.toLowerCase().includes(prefix)) {
          suggestions.push({
            name: field,
            type: 'field',
            match: prefix,
            score: this.calculateMatchScore(field, prefix)
          });
        }
      }
    }

    // Sort by score and limit
    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, EDITOR_CONFIG.maxSuggestions);
  }

  calculateMatchScore(text, prefix) {
    const lowerText = text.toLowerCase();
    const lowerPrefix = prefix.toLowerCase();

    // Exact match
    if (lowerText === lowerPrefix) return 100;

    // Starts with
    if (lowerText.startsWith(lowerPrefix)) return 90;

    // Contains at word boundary
    const words = lowerText.split(/[_.-]/);
    if (words.some(w => w.startsWith(lowerPrefix))) return 80;

    // Contains anywhere
    const index = lowerText.indexOf(lowerPrefix);
    if (index >= 0) return 70 - index;

    return 0;
  }

  getFunctionSignature(functionName) {
    // Simplified signature generation
    const metadata = FUNCTION_METADATA[functionName];
    if (!metadata) return '()';

    // Would be enhanced with actual parameter info
    return '(field)';
  }

  highlightMatch(text, match) {
    if (!match) return this.escapeHtml(text);

    const regex = new RegExp(`(${this.escapeRegex(match)})`, 'gi');
    return this.escapeHtml(text).replace(regex, '<span class="autocomplete-match">$1</span>');
  }

  selectNextSuggestion() {
    if (this.suggestions.length === 0) return;

    this.selectedSuggestion = (this.selectedSuggestion + 1) % this.suggestions.length;
    this.updateAutocompleteSelection();
  }

  selectPreviousSuggestion() {
    if (this.suggestions.length === 0) return;

    this.selectedSuggestion = this.selectedSuggestion <= 0
      ? this.suggestions.length - 1
      : this.selectedSuggestion - 1;
    this.updateAutocompleteSelection();
  }

  updateAutocompleteSelection() {
    const items = this.autocompleteList.querySelectorAll('.autocomplete-item');
    items.forEach((item, index) => {
      item.classList.toggle('selected', index === this.selectedSuggestion);
      item.setAttribute('aria-selected', index === this.selectedSuggestion);
    });

    // Scroll selected item into view
    if (this.selectedSuggestion >= 0 && items[this.selectedSuggestion]) {
      items[this.selectedSuggestion].scrollIntoView({ block: 'nearest' });
    }
  }

  acceptSuggestion(index) {
    const suggestion = this.suggestions[index];
    if (!suggestion) return;

    const context = this.getAutocompleteContext();
    const before = this.value.substring(0, context.start);
    const after = this.value.substring(context.position);

    // Insert suggestion
    let insertion = suggestion.name;
    if (suggestion.type === 'function') {
      insertion += '()';
      // Position cursor inside parentheses
      this.cursorPosition = context.start + insertion.length - 1;
    } else {
      this.cursorPosition = context.start + insertion.length;
    }

    this.value = before + insertion + after;
    this.editorInput.value = this.value;
    this.editorInput.setSelectionRange(this.cursorPosition, this.cursorPosition);

    // Update UI
    this.hideAutocomplete();
    this.scheduleSyntaxHighlight();

    // Dispatch event
    this.dispatchEvent(new CustomEvent('suggestion-accepted', {
      detail: { suggestion }
    }));
  }

  showAutocomplete() {
    this.autocompleteContainer.classList.add('visible');
    this.autocompleteContainer.setAttribute('aria-expanded', 'true');
  }

  hideAutocomplete() {
    this.autocompleteContainer.classList.remove('visible');
    this.autocompleteContainer.setAttribute('aria-expanded', 'false');
    this.selectedSuggestion = -1;
  }

  isAutocompleteVisible() {
    return this.autocompleteContainer.classList.contains('visible');
  }

  triggerAutocomplete() {
    this.performAutocomplete();
  }

  // History management
  addToHistory(value) {
    // Remove any history after current position
    this.history = this.history.slice(0, this.historyIndex + 1);

    // Add new value
    this.history.push(value);
    this.historyIndex = this.history.length - 1;

    // Limit history size
    if (this.history.length > 100) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.setValue(this.history[this.historyIndex]);
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.setValue(this.history[this.historyIndex]);
    }
  }

  // UI updates
  updateLineNumbers() {
    const lines = this.value.split('\n').length;
    this.lineNumbers.innerHTML = this.renderLineNumbers();
  }

  updateCursorPosition() {
    const position = this.editorInput.selectionStart;
    const lines = this.value.substring(0, position).split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;

    this.shadowRoot.querySelector('.line-num').textContent = line;
    this.shadowRoot.querySelector('.col-num').textContent = col;
  }

  updateStatus() {
    this.shadowRoot.querySelector('.char-count').textContent = this.value.length;
    this.updateCursorPosition();
  }

  updateValidationStatus(isValid, parseTime) {
    const status = this.shadowRoot.querySelector('.validation-status');
    const indicator = status.querySelector('.status-indicator');

    if (this.value.length === 0) {
      indicator.className = 'status-indicator typing';
      status.lastChild.textContent = ' Ready';
    } else if (isValid) {
      indicator.className = 'status-indicator valid';
      status.lastChild.textContent = ` Valid (${Math.round(parseTime)}ms)`;
    } else {
      indicator.className = 'status-indicator invalid';
      status.lastChild.textContent = ' Invalid syntax';
    }
  }

  updateAutocompleteTime() {
    const timeElement = this.shadowRoot.querySelector('.autocomplete-time');
    const timeValue = timeElement.querySelector('.time-value');

    if (this.lastAutocompleteTime > 0) {
      timeValue.textContent = this.lastAutocompleteTime;
      timeElement.hidden = false;
    } else {
      timeElement.hidden = true;
    }
  }

  // Helper methods
  tokenizeForHighlight(text) {
    // Simplified tokenization for syntax highlighting
    const tokens = [];
    const regex = /(\w+)\s*\(|'[^']*'|"[^"]*"|\d+\.?\d*|[+\-*\/><=!]+|[(),:]/g;
    let match;
    let lastIndex = 0;

    while ((match = regex.exec(text)) !== null) {
      // Add any text between matches
      if (match.index > lastIndex) {
        tokens.push({
          type: 'text',
          value: text.substring(lastIndex, match.index)
        });
      }

      // Add matched token
      if (match[1]) {
        // Function name
        tokens.push({
          type: 'function',
          value: match[1]
        });
        tokens.push({
          type: 'parenthesis',
          value: '('
        });
      } else if (match[0].startsWith("'") || match[0].startsWith('"')) {
        // String
        tokens.push({
          type: 'string',
          value: match[0]
        });
      } else if (/^\d/.test(match[0])) {
        // Number
        tokens.push({
          type: 'number',
          value: match[0]
        });
      } else if (/^[+\-*\/><=!]+$/.test(match[0])) {
        // Operator
        tokens.push({
          type: 'operator',
          value: match[0]
        });
      } else if (/^[(),:]$/.test(match[0])) {
        // Delimiter
        tokens.push({
          type: 'parenthesis',
          value: match[0]
        });
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      tokens.push({
        type: 'text',
        value: text.substring(lastIndex)
      });
    }

    return tokens;
  }

  getTokenClass(token) {
    const typeToClass = {
      'function': 'token-function',
      'field': 'token-field',
      'number': 'token-number',
      'string': 'token-string',
      'operator': 'token-operator',
      'parenthesis': 'token-parenthesis',
      'keyword': 'token-keyword',
      'error': 'token-error'
    };

    return typeToClass[token.type] || '';
  }

  getIconForSuggestion(suggestion) {
    if (suggestion.type === 'function') {
      return '<path d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" />';
    } else if (suggestion.type === 'field') {
      return '<path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />';
    }
    return '';
  }

  setupMobileEvents() {
    // Virtual keyboard handling
    let viewportHeight = window.innerHeight;

    window.addEventListener('resize', () => {
      const newHeight = window.innerHeight;
      if (newHeight < viewportHeight * 0.75) {
        // Keyboard is likely open
        this.editorContainer.classList.add('keyboard-open');
      } else {
        // Keyboard is likely closed
        this.editorContainer.classList.remove('keyboard-open');
      }
      viewportHeight = newHeight;
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Public API
  getValue() {
    return this.value;
  }

  setValue(value) {
    this.value = value;
    if (this.editorInput) {
      this.editorInput.value = value;
      this.updateLineNumbers();
      this.updateStatus();
      this.scheduleSyntaxHighlight();
    } else {
      // Store value to be set when element is connected
      this._pendingValue = value;
    }
  }

  focus() {
    if (this.editorInput) {
      this.editorInput.focus();
    }
  }

  blur() {
    if (this.editorInput) {
      this.editorInput.blur();
    }
  }

  setFieldSchema(schema) {
    this.fieldSchema = schema;
  }
}

// Register custom element
if (!customElements.get('enhanced-formula-editor')) {
  customElements.define('enhanced-formula-editor', EnhancedFormulaEditor);
}
