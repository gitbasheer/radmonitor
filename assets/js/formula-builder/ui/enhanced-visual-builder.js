/**
 * Enhanced Visual Formula Builder Web Component
 * Features:
 * - Drag-drop formula construction
 * - Real-time validation feedback
 * - Progressive disclosure
 * - Accessibility support
 * - Mobile-friendly
 */

import { EnhancedFormulaParser } from '../core/enhanced-ast-parser.js';
import { EnhancedFormulaValidator } from '../core/enhanced-validator.js';
import { FUNCTION_CATEGORIES, FUNCTION_METADATA, FORMULA_PATTERNS } from '../core/formula-functions.js';

// Custom events
export const FormulaBuilderEvents = {
  FORMULA_CHANGE: 'formula-change',
  VALIDATION_COMPLETE: 'validation-complete',
  PREVIEW_UPDATE: 'preview-update',
  FUNCTION_DROPPED: 'function-dropped',
  TEMPLATE_SELECTED: 'template-selected'
};

/**
 * Main visual formula builder component
 */
export class EnhancedFormulaBuilder extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // Core services
    this.parser = new EnhancedFormulaParser();
    this.validator = new EnhancedFormulaValidator();

    // State
    this.formula = '';
    this.ast = null;
    this.validationResult = null;
    this.userLevel = 'beginner'; // beginner, intermediate, advanced
    this.selectedCategory = 'all';
    this.draggedFunction = null;

    // Performance tracking
    this.lastValidationTime = 0;
    this.validationDebounceTimer = null;

    // Accessibility
    this.announcer = null;
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.initializeDragDrop();
    this.setupAccessibility();
    this.loadUserPreferences();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --primary-color: #2563eb;
          --secondary-color: #64748b;
          --success-color: #10b981;
          --error-color: #ef4444;
          --warning-color: #f59e0b;
          --bg-primary: #ffffff;
          --bg-secondary: #f8fafc;
          --bg-tertiary: #f1f5f9;
          --text-primary: #1e293b;
          --text-secondary: #64748b;
          --border-color: #e2e8f0;
          --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
          --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
          --radius: 0.375rem;
          --transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

          display: block;
          width: 100%;
          height: 100%;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: var(--text-primary);
        }

        .builder-container {
          display: grid;
          grid-template-columns: 280px 1fr 320px;
          grid-template-rows: auto 1fr;
          gap: 1rem;
          height: 100%;
          padding: 1rem;
          background: var(--bg-secondary);
        }

        @media (max-width: 1024px) {
          .builder-container {
            grid-template-columns: 1fr;
            grid-template-rows: auto auto 1fr auto;
          }

          .function-palette {
            order: 2;
            max-height: 200px;
          }

          .canvas-area {
            order: 3;
          }

          .preview-panel {
            order: 4;
          }
        }

        .header {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: var(--bg-primary);
          border-radius: var(--radius);
          box-shadow: var(--shadow-sm);
        }

        .title {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .user-level-toggle {
          display: flex;
          gap: 0.5rem;
          background: var(--bg-secondary);
          padding: 0.25rem;
          border-radius: var(--radius);
        }

        .level-button {
          padding: 0.5rem 1rem;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-size: 0.875rem;
          border-radius: calc(var(--radius) - 2px);
          cursor: pointer;
          transition: var(--transition);
        }

        .level-button:hover {
          background: var(--bg-tertiary);
        }

        .level-button.active {
          background: var(--bg-primary);
          color: var(--primary-color);
          font-weight: 500;
          box-shadow: var(--shadow-sm);
        }

        /* Function Palette */
        .function-palette {
          background: var(--bg-primary);
          border-radius: var(--radius);
          box-shadow: var(--shadow-sm);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .palette-header {
          padding: 1rem;
          border-bottom: 1px solid var(--border-color);
        }

        .search-box {
          position: relative;
        }

        .search-input {
          width: 100%;
          padding: 0.5rem 2.5rem 0.5rem 1rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius);
          font-size: 0.875rem;
          transition: var(--transition);
        }

        .search-input:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 3px rgb(37 99 235 / 0.1);
        }

        .search-icon {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          width: 1rem;
          height: 1rem;
          color: var(--text-secondary);
        }

        .category-tabs {
          display: flex;
          gap: 0.25rem;
          padding: 0.5rem;
          border-bottom: 1px solid var(--border-color);
          overflow-x: auto;
          scrollbar-width: thin;
        }

        .category-tab {
          padding: 0.375rem 0.75rem;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-size: 0.813rem;
          border-radius: var(--radius);
          cursor: pointer;
          white-space: nowrap;
          transition: var(--transition);
        }

        .category-tab:hover {
          background: var(--bg-secondary);
        }

        .category-tab.active {
          background: var(--primary-color);
          color: white;
        }

        .function-list {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem;
        }

        .function-group {
          margin-bottom: 1rem;
        }

        .function-group-title {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--text-secondary);
          padding: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .function-item {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius);
          padding: 0.75rem;
          margin: 0.25rem 0;
          cursor: move;
          transition: var(--transition);
          user-select: none;
        }

        .function-item:hover {
          background: var(--bg-tertiary);
          border-color: var(--primary-color);
          transform: translateX(2px);
        }

        .function-item.dragging {
          opacity: 0.5;
          cursor: grabbing;
        }

        .function-name {
          font-weight: 500;
          font-size: 0.875rem;
          color: var(--text-primary);
          font-family: 'Monaco', 'Consolas', monospace;
        }

        .function-description {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
        }

        /* Canvas Area */
        .canvas-area {
          background: var(--bg-primary);
          border-radius: var(--radius);
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .canvas-toolbar {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--border-color);
        }

        .toolbar-button {
          padding: 0.5rem;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          border-radius: var(--radius);
          cursor: pointer;
          transition: var(--transition);
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .toolbar-button:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .toolbar-divider {
          width: 1px;
          height: 1.5rem;
          background: var(--border-color);
          margin: 0 0.5rem;
        }

        .formula-canvas {
          flex: 1;
          padding: 1.5rem;
          overflow-y: auto;
          position: relative;
          min-height: 300px;
        }

        .drop-zone {
          min-height: 80px;
          border: 2px dashed var(--border-color);
          border-radius: var(--radius);
          padding: 1rem;
          transition: var(--transition);
          position: relative;
          background: var(--bg-secondary);
        }

        .drop-zone.drag-over {
          border-color: var(--primary-color);
          background: rgb(37 99 235 / 0.05);
        }

        .drop-zone-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          font-size: 0.875rem;
          pointer-events: none;
        }

        .formula-node {
          display: inline-flex;
          align-items: center;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius);
          padding: 0.5rem;
          margin: 0.25rem;
          position: relative;
          transition: var(--transition);
        }

        .formula-node.function {
          background: var(--primary-color);
          color: white;
          border-color: var(--primary-color);
        }

        .formula-node.operator {
          background: var(--secondary-color);
          color: white;
          padding: 0.375rem 0.75rem;
          font-weight: 600;
        }

        .formula-node.field {
          background: var(--success-color);
          color: white;
          border-color: var(--success-color);
        }

        .formula-node.literal {
          background: var(--warning-color);
          color: white;
          border-color: var(--warning-color);
        }

        .formula-node.error {
          background: var(--error-color);
          color: white;
          border-color: var(--error-color);
        }

        .node-content {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .node-name {
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .node-args {
          display: flex;
          gap: 0.375rem;
          align-items: center;
        }

        .arg-input {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: calc(var(--radius) - 2px);
          padding: 0.25rem 0.5rem;
          font-size: 0.813rem;
          color: white;
          min-width: 60px;
          transition: var(--transition);
        }

        .arg-input:focus {
          outline: none;
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.5);
        }

        .arg-input::placeholder {
          color: rgba(255, 255, 255, 0.7);
        }

        .node-remove {
          position: absolute;
          top: -0.5rem;
          right: -0.5rem;
          width: 1.25rem;
          height: 1.25rem;
          background: var(--error-color);
          color: white;
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: var(--transition);
        }

        .formula-node:hover .node-remove {
          opacity: 1;
        }

        /* Preview Panel */
        .preview-panel {
          background: var(--bg-primary);
          border-radius: var(--radius);
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .preview-tabs {
          display: flex;
          border-bottom: 1px solid var(--border-color);
        }

        .preview-tab {
          flex: 1;
          padding: 0.75rem;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-size: 0.875rem;
          cursor: pointer;
          transition: var(--transition);
          position: relative;
        }

        .preview-tab:hover {
          background: var(--bg-secondary);
        }

        .preview-tab.active {
          color: var(--primary-color);
          font-weight: 500;
        }

        .preview-tab.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--primary-color);
        }

        .preview-content {
          flex: 1;
          padding: 1rem;
          overflow-y: auto;
        }

        .formula-text {
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 0.875rem;
          line-height: 1.5;
          padding: 1rem;
          background: var(--bg-secondary);
          border-radius: var(--radius);
          white-space: pre-wrap;
          word-break: break-all;
        }

        .validation-messages {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .validation-message {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          padding: 0.75rem;
          border-radius: var(--radius);
          font-size: 0.813rem;
        }

        .validation-message.error {
          background: rgb(239 68 68 / 0.1);
          color: var(--error-color);
        }

        .validation-message.warning {
          background: rgb(245 158 11 / 0.1);
          color: var(--warning-color);
        }

        .validation-message.info {
          background: rgb(37 99 235 / 0.1);
          color: var(--primary-color);
        }

        .validation-icon {
          width: 1rem;
          height: 1rem;
          flex-shrink: 0;
          margin-top: 0.125rem;
        }

        .query-preview {
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 0.75rem;
          line-height: 1.5;
          padding: 1rem;
          background: #1e293b;
          color: #e2e8f0;
          border-radius: var(--radius);
          overflow-x: auto;
        }

        .performance-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
        }

        .stat-item {
          display: flex;
          flex-direction: column;
        }

        .stat-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .stat-value {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        /* Templates */
        .templates-section {
          padding: 1rem;
          border-top: 1px solid var(--border-color);
        }

        .templates-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.75rem;
        }

        .template-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .template-item {
          padding: 0.75rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius);
          cursor: pointer;
          transition: var(--transition);
        }

        .template-item:hover {
          background: var(--bg-tertiary);
          border-color: var(--primary-color);
        }

        .template-name {
          font-size: 0.813rem;
          font-weight: 500;
          color: var(--text-primary);
        }

        .template-description {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
        }

        /* Accessibility */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }

        /* Focus styles */
        *:focus-visible {
          outline: 2px solid var(--primary-color);
          outline-offset: 2px;
        }

        /* Loading states */
        .loading {
          position: relative;
          overflow: hidden;
        }

        .loading::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.4),
            transparent
          );
          animation: shimmer 1.5s infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        /* Mobile adjustments */
        @media (max-width: 640px) {
          .builder-container {
            padding: 0.5rem;
            gap: 0.5rem;
          }

          .function-item {
            font-size: 0.813rem;
          }

          .formula-canvas {
            padding: 1rem;
          }
        }
      </style>

      <div class="builder-container">
        <header class="header">
          <h2 class="title">Formula Builder</h2>
          <div class="user-level-toggle" role="tablist">
            <button class="level-button ${this.userLevel === 'beginner' ? 'active' : ''}"
                    data-level="beginner" role="tab" aria-selected="${this.userLevel === 'beginner'}">
              Beginner
            </button>
            <button class="level-button ${this.userLevel === 'intermediate' ? 'active' : ''}"
                    data-level="intermediate" role="tab" aria-selected="${this.userLevel === 'intermediate'}">
              Intermediate
            </button>
            <button class="level-button ${this.userLevel === 'advanced' ? 'active' : ''}"
                    data-level="advanced" role="tab" aria-selected="${this.userLevel === 'advanced'}">
              Advanced
            </button>
          </div>
        </header>

        <aside class="function-palette">
          <div class="palette-header">
            <div class="search-box">
              <input type="search"
                     class="search-input gd-input"
                     placeholder="Search functions..."
                     aria-label="Search functions">
              <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
          </div>

          <div class="category-tabs" role="tablist">
            <button class="category-tab ${this.selectedCategory === 'all' ? 'active' : ''}"
                    data-category="all" role="tab">
              All
            </button>
            ${Object.entries(FUNCTION_CATEGORIES).map(([key, category]) => `
              <button class="category-tab ${this.selectedCategory === key ? 'active' : ''}"
                      data-category="${key}" role="tab">
                ${category.name}
              </button>
            `).join('')}
            <button class="category-tab ${this.selectedCategory === 'templates' ? 'active' : ''}"
                    data-category="templates" role="tab">
              Templates
            </button>
          </div>

          <div class="function-list" role="list">
            ${this.renderFunctionList()}
          </div>

          ${this.userLevel !== 'beginner' ? `
            <div class="templates-section">
              <h3 class="templates-title">Common Patterns</h3>
              <div class="template-list">
                ${this.renderTemplates()}
              </div>
            </div>
          ` : ''}
        </aside>

        <main class="canvas-area">
          <div class="canvas-toolbar">
            <button class="toolbar-button" data-action="undo" aria-label="Undo">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path>
              </svg>
              <span>Undo</span>
            </button>
            <button class="toolbar-button" data-action="redo" aria-label="Redo">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"></path>
              </svg>
              <span>Redo</span>
            </button>
            <div class="toolbar-divider"></div>
            <button class="toolbar-button" data-action="clear" aria-label="Clear formula">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
              <span>Clear</span>
            </button>
            <button class="toolbar-button" data-action="copy" aria-label="Copy formula">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
              <span>Copy</span>
            </button>
          </div>

          <div class="formula-canvas">
            <div class="drop-zone main-drop" data-accepts="all">
              <div class="drop-zone-placeholder">
                Drag functions here to build your formula
              </div>
            </div>
          </div>
        </main>

        <aside class="preview-panel">
          <div class="preview-tabs" role="tablist">
            <button class="preview-tab active" data-tab="formula" role="tab">Formula</button>
            <button class="preview-tab" data-tab="validation" role="tab">Validation</button>
            <button class="preview-tab" data-tab="query" role="tab">ES Query</button>
          </div>

          <div class="preview-content">
            <div data-panel="formula" class="preview-pane active">
              <div class="formula-text">${this.formula || 'No formula yet'}</div>
              <div class="performance-stats">
                <div class="stat-item">
                  <span class="stat-label">Parse Time</span>
                  <span class="stat-value">-</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Validation Time</span>
                  <span class="stat-value">${this.lastValidationTime || '-'}ms</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Complexity</span>
                  <span class="stat-value">-</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Functions</span>
                  <span class="stat-value">-</span>
                </div>
              </div>
            </div>

            <div data-panel="validation" class="preview-pane" hidden>
              <div class="validation-messages">
                ${this.renderValidationMessages()}
              </div>
            </div>

            <div data-panel="query" class="preview-pane" hidden>
              <div class="query-preview">
                ${this.renderQueryPreview()}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
    `;

    this.announcer = this.shadowRoot.querySelector('[role="status"]');
  }

  renderFunctionList() {
    const functions = this.getFilteredFunctions();
    const grouped = this.groupFunctionsByCategory(functions);

    return Object.entries(grouped).map(([category, funcs]) => `
      <div class="function-group">
        <div class="function-group-title">
          ${FUNCTION_CATEGORIES[category]?.name || category}
        </div>
        ${funcs.map(func => `
          <div class="function-item"
               draggable="true"
               data-function="${func}"
               data-category="${category}"
               role="listitem"
               tabindex="0">
            <div class="function-name">${func}()</div>
            <div class="function-description">
              ${FUNCTION_METADATA[func]?.description || ''}
            </div>
          </div>
        `).join('')}
      </div>
    `).join('');
  }

  renderTemplates() {
    const templates = this.getTemplatesForLevel();

    return Object.entries(templates).map(([name, template]) => `
      <div class="template-item" data-template="${name}">
        <div class="template-name">${name}</div>
        <div class="template-description">${template.description}</div>
      </div>
    `).join('');
  }

  renderValidationMessages() {
    if (!this.validationResult || !this.validationResult.results) {
      return '<p class="validation-message info">No validation results yet</p>';
    }

    if (this.validationResult.results.length === 0) {
      return `
        <div class="validation-message info">
          <svg class="validation-icon" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
          </svg>
          <span>Formula is valid!</span>
        </div>
      `;
    }

    return this.validationResult.results.map(result => `
      <div class="validation-message ${result.severity}">
        <svg class="validation-icon" fill="currentColor" viewBox="0 0 20 20">
          ${result.severity === 'error' ? `
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
          ` : result.severity === 'warning' ? `
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
          ` : `
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
          `}
        </svg>
        <span>${result.message}</span>
      </div>
    `).join('');
  }

  renderQueryPreview() {
    // TODO: Implement ES query generation
    return 'Query preview will be shown here';
  }

  setupEventListeners() {
    // User level toggle
    this.shadowRoot.querySelectorAll('.level-button').forEach(button => {
      button.addEventListener('click', (e) => {
        this.userLevel = e.target.dataset.level;
        this.updateUserLevel();
      });
    });

    // Category tabs
    this.shadowRoot.querySelectorAll('.category-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.selectedCategory = e.target.dataset.category;
        this.updateCategoryFilter();
      });
    });

    // Search
    const searchInput = this.shadowRoot.querySelector('.search-input');
    searchInput.addEventListener('input', (e) => {
      this.filterFunctions(e.target.value);
    });

    // Toolbar actions
    this.shadowRoot.querySelectorAll('.toolbar-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        this.handleToolbarAction(action);
      });
    });

    // Preview tabs
    this.shadowRoot.querySelectorAll('.preview-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchPreviewTab(e.target.dataset.tab);
      });
    });

    // Template selection
    this.shadowRoot.addEventListener('click', (e) => {
      if (e.target.closest('.template-item')) {
        const templateName = e.target.closest('.template-item').dataset.template;
        this.applyTemplate(templateName);
      }
    });
  }

  initializeDragDrop() {
    // Make function items draggable
    this.shadowRoot.querySelectorAll('.function-item').forEach(item => {
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('function', e.currentTarget.dataset.function);
        this.draggedFunction = e.currentTarget.dataset.function;
        e.currentTarget.classList.add('dragging');
      });

      item.addEventListener('dragend', (e) => {
        e.currentTarget.classList.remove('dragging');
        this.draggedFunction = null;
      });

      // Keyboard support
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.insertFunction(e.currentTarget.dataset.function);
        }
      });
    });

    // Setup drop zones
    const dropZone = this.shadowRoot.querySelector('.drop-zone');

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
      if (!dropZone.contains(e.relatedTarget)) {
        dropZone.classList.remove('drag-over');
      }
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');

      const functionName = e.dataTransfer.getData('function');
      if (functionName) {
        this.handleDrop(functionName, e.target);
      }
    });
  }

  setupAccessibility() {
    // Announce changes for screen readers
    this.shadowRoot.addEventListener('formula-change', () => {
      this.announce(`Formula updated: ${this.formula}`);
    });

    this.shadowRoot.addEventListener('validation-complete', () => {
      const errorCount = this.validationResult?.results?.filter(r => r.severity === 'error').length || 0;
      if (errorCount > 0) {
        this.announce(`Validation found ${errorCount} error${errorCount !== 1 ? 's' : ''}`);
      } else {
        this.announce('Formula is valid');
      }
    });
  }

  // Helper methods
  getFilteredFunctions() {
    if (this.selectedCategory === 'all') {
      return this.getAllFunctions();
    }

    if (this.selectedCategory === 'templates') {
      return [];
    }

    return FUNCTION_CATEGORIES[this.selectedCategory]?.functions || [];
  }

  getAllFunctions() {
    const functions = [];
    for (const category of Object.values(FUNCTION_CATEGORIES)) {
      functions.push(...category.functions);
    }
    return functions;
  }

  groupFunctionsByCategory(functions) {
    const grouped = {};

    for (const func of functions) {
      // Find which category this function belongs to
      for (const [categoryKey, category] of Object.entries(FUNCTION_CATEGORIES)) {
        if (category.functions.includes(func)) {
          if (!grouped[categoryKey]) {
            grouped[categoryKey] = [];
          }
          grouped[categoryKey].push(func);
          break;
        }
      }
    }

    return grouped;
  }

  getTemplatesForLevel() {
    const allTemplates = FORMULA_PATTERNS;

    if (this.userLevel === 'beginner') {
      // Show only basic templates
      return Object.fromEntries(
        Object.entries(allTemplates).filter(([_, template]) =>
          template.category === 'metrics'
        ).slice(0, 3)
      );
    } else if (this.userLevel === 'intermediate') {
      // Show metrics and timeseries
      return Object.fromEntries(
        Object.entries(allTemplates).filter(([_, template]) =>
          ['metrics', 'timeseries'].includes(template.category)
        ).slice(0, 6)
      );
    } else {
      // Show all templates
      return allTemplates;
    }
  }

  handleDrop(functionName, target) {
    // Create formula node
    const node = this.createFormulaNode(functionName);

    // Replace placeholder if dropping on empty zone
    const placeholder = target.querySelector('.drop-zone-placeholder');
    if (placeholder) {
      placeholder.remove();
    }

    // Add node to drop zone
    target.appendChild(node);

    // Update formula
    this.updateFormula();

    // Dispatch event
    this.dispatchEvent(new CustomEvent(FormulaBuilderEvents.FUNCTION_DROPPED, {
      detail: { function: functionName }
    }));
  }

  createFormulaNode(functionName) {
    const node = document.createElement('div');
    node.className = 'formula-node function';
    node.dataset.function = functionName;

    const metadata = FUNCTION_METADATA[functionName];
    const signature = this.getFunctionSignature(functionName);

    node.innerHTML = `
      <div class="node-content">
        <span class="node-name">${functionName}</span>
        <span class="node-args">
          (${this.createArgumentInputs(signature)})
        </span>
      </div>
      <button class="node-remove" aria-label="Remove ${functionName}">×</button>
    `;

    // Setup event listeners
    node.querySelector('.node-remove').addEventListener('click', () => {
      node.remove();
      this.updateFormula();
    });

    // Listen to argument changes
    node.querySelectorAll('.arg-input').forEach(input => {
      input.addEventListener('input', () => {
        this.updateFormula();
      });
    });

    return node;
  }

  createArgumentInputs(signature) {
    if (!signature || !signature.args) return '';

    return signature.args.map((arg, index) => {
      const placeholder = arg.optional ? `${arg.name} (optional)` : arg.name;
      return `<input type="text"
                     class="arg-input"
                     placeholder="${placeholder}"
                     data-arg-index="${index}"
                     data-arg-name="${arg.name}">`;
    }).join(', ');
  }

  getFunctionSignature(functionName) {
    // TODO: Get from enhanced validator
    return {
      args: [
        { name: 'field', type: 'string' }
      ]
    };
  }

  updateFormula() {
    // Build formula from visual nodes
    const dropZone = this.shadowRoot.querySelector('.drop-zone');
    const nodes = dropZone.querySelectorAll('.formula-node');

    const formulaParts = [];
    nodes.forEach(node => {
      if (node.dataset.function) {
        const funcName = node.dataset.function;
        const args = Array.from(node.querySelectorAll('.arg-input'))
          .map(input => input.value || '')
          .filter(val => val.length > 0);

        formulaParts.push(`${funcName}(${args.join(', ')})`);
      }
    });

    this.formula = formulaParts.join(' ');

    // Update preview
    this.updatePreview();

    // Validate
    this.validateFormula();

    // Dispatch event
    this.dispatchEvent(new CustomEvent(FormulaBuilderEvents.FORMULA_CHANGE, {
      detail: { formula: this.formula }
    }));
  }

  async validateFormula() {
    if (!this.formula) {
      this.validationResult = null;
      return;
    }

    // Clear existing timer
    if (this.validationDebounceTimer) {
      clearTimeout(this.validationDebounceTimer);
    }

    // Debounce validation
    this.validationDebounceTimer = setTimeout(async () => {
      const startTime = performance.now();

      try {
        // Parse formula
        const parseResult = this.parser.parse(this.formula);

        if (parseResult.success) {
          // Validate AST
          this.validationResult = await this.validator.validate(parseResult.ast);
          this.lastValidationTime = Math.round(performance.now() - startTime);

          // Update UI
          this.updateValidationDisplay();

          // Dispatch event
          this.dispatchEvent(new CustomEvent(FormulaBuilderEvents.VALIDATION_COMPLETE, {
            detail: this.validationResult
          }));
        } else {
          this.validationResult = {
            valid: false,
            results: parseResult.errors.map(err => ({
              severity: 'error',
              message: err.message,
              position: err.position
            }))
          };
          this.updateValidationDisplay();
        }
      } catch (error) {
        console.error('Validation error:', error);
        this.validationResult = {
          valid: false,
          results: [{
            severity: 'error',
            message: `Validation error: ${error.message}`,
            position: 0
          }]
        };
        this.updateValidationDisplay();
      }
    }, 300); // 300ms debounce
  }

  updatePreview() {
    const formulaText = this.shadowRoot.querySelector('.formula-text');
    formulaText.textContent = this.formula || 'No formula yet';
  }

  updateValidationDisplay() {
    const validationPanel = this.shadowRoot.querySelector('[data-panel="validation"]');
    const validationMessages = validationPanel.querySelector('.validation-messages');
    validationMessages.innerHTML = this.renderValidationMessages();

    // Update stats
    const validationTime = this.shadowRoot.querySelector('.stat-value:nth-of-type(2)');
    validationTime.textContent = `${this.lastValidationTime}ms`;
  }

  handleToolbarAction(action) {
    switch (action) {
      case 'undo':
        // TODO: Implement undo
        this.announce('Undo not yet implemented');
        break;

      case 'redo':
        // TODO: Implement redo
        this.announce('Redo not yet implemented');
        break;

      case 'clear':
        this.clearFormula();
        break;

      case 'copy':
        this.copyFormula();
        break;
    }
  }

  clearFormula() {
    const dropZone = this.shadowRoot.querySelector('.drop-zone');
    dropZone.innerHTML = `
      <div class="drop-zone-placeholder">
        Drag functions here to build your formula
      </div>
    `;

    this.formula = '';
    this.updatePreview();
    this.validationResult = null;
    this.updateValidationDisplay();

    this.announce('Formula cleared');
  }

  copyFormula() {
    if (!this.formula) {
      this.announce('No formula to copy');
      return;
    }

    navigator.clipboard.writeText(this.formula).then(() => {
      this.announce('Formula copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy:', err);
      this.announce('Failed to copy formula');
    });
  }

  switchPreviewTab(tabName) {
    // Update tab states
    this.shadowRoot.querySelectorAll('.preview-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
      tab.setAttribute('aria-selected', tab.dataset.tab === tabName);
    });

    // Update panel visibility
    this.shadowRoot.querySelectorAll('.preview-pane').forEach(pane => {
      pane.hidden = pane.dataset.panel !== tabName;
    });
  }

  updateUserLevel() {
    // Update button states
    this.shadowRoot.querySelectorAll('.level-button').forEach(button => {
      button.classList.toggle('active', button.dataset.level === this.userLevel);
      button.setAttribute('aria-selected', button.dataset.level === this.userLevel);
    });

    // Re-render to show/hide features based on level
    this.render();
    this.setupEventListeners();
    this.initializeDragDrop();

    // Save preference
    localStorage.setItem('formula-builder-level', this.userLevel);
  }

  updateCategoryFilter() {
    // Update tab states
    this.shadowRoot.querySelectorAll('.category-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.category === this.selectedCategory);
    });

    // Re-render function list
    const functionList = this.shadowRoot.querySelector('.function-list');
    functionList.innerHTML = this.renderFunctionList();

    // Re-initialize drag-drop for new items
    this.initializeDragDrop();
  }

  filterFunctions(searchTerm) {
    const items = this.shadowRoot.querySelectorAll('.function-item');
    const term = searchTerm.toLowerCase();

    items.forEach(item => {
      const name = item.querySelector('.function-name').textContent.toLowerCase();
      const description = item.querySelector('.function-description').textContent.toLowerCase();
      const matches = name.includes(term) || description.includes(term);

      item.style.display = matches ? '' : 'none';
    });

    // Update group visibility
    this.shadowRoot.querySelectorAll('.function-group').forEach(group => {
      const hasVisibleItems = Array.from(group.querySelectorAll('.function-item'))
        .some(item => item.style.display !== 'none');
      group.style.display = hasVisibleItems ? '' : 'none';
    });
  }

  insertFunction(functionName) {
    // Programmatically insert function (for keyboard navigation)
    this.handleDrop(functionName, this.shadowRoot.querySelector('.drop-zone'));
  }

  applyTemplate(templateName) {
    const template = FORMULA_PATTERNS[templateName];
    if (!template) return;

    // Clear current formula
    this.clearFormula();

    // Set formula text
    this.formula = template.formula;

    // TODO: Parse and create visual nodes from formula text
    const dropZone = this.shadowRoot.querySelector('.drop-zone');
    dropZone.innerHTML = `<div class="formula-text">${template.formula}</div>`;

    // Update and validate
    this.updatePreview();
    this.validateFormula();

    // Dispatch event
    this.dispatchEvent(new CustomEvent(FormulaBuilderEvents.TEMPLATE_SELECTED, {
      detail: { template: templateName, formula: template.formula }
    }));

    this.announce(`Applied template: ${templateName}`);
  }

  loadUserPreferences() {
    // Load saved user level
    const savedLevel = localStorage.getItem('formula-builder-level');
    if (savedLevel && ['beginner', 'intermediate', 'advanced'].includes(savedLevel)) {
      this.userLevel = savedLevel;
    }
  }

  announce(message) {
    // Announce to screen readers
    if (this.announcer) {
      this.announcer.textContent = message;

      // Clear after announcement
      setTimeout(() => {
        this.announcer.textContent = '';
      }, 1000);
    }
  }

  // Custom methods for RAD integration
  addCustomFields(fields) {
    // Store custom fields
    this.customFields = fields || [];

    // TODO: Integrate custom fields into the function palette
    // For now, we'll add them as pseudo-functions
    fields.forEach(field => {
      if (!FUNCTION_METADATA[field.name]) {
        FUNCTION_METADATA[field.name] = {
          category: 'fields',
          description: field.description || `Field: ${field.name}`,
          examples: [`${field.name}`],
          icon: 'field'
        };
      }
    });

    // Re-render if already connected
    if (this.shadowRoot) {
      const functionList = this.shadowRoot.querySelector('.function-list');
      if (functionList) {
        functionList.innerHTML = this.renderFunctionList();
        this.initializeDragDrop();
      }
    }
  }

  addTemplates(templates) {
    // Add custom templates to FORMULA_PATTERNS
    templates.forEach(template => {
      if (!FORMULA_PATTERNS[template.name]) {
        FORMULA_PATTERNS[template.name] = {
          formula: template.formula,
          description: template.description,
          category: 'rad-monitoring'
        };
      }
    });

    // Re-render templates section if showing templates
    if (this.selectedCategory === 'templates' && this.shadowRoot) {
      const functionList = this.shadowRoot.querySelector('.function-list');
      if (functionList) {
        functionList.innerHTML = this.renderTemplates();
      }
    }
  }

  // Getter for current formula
  get formula() {
    return this._formula || '';
  }

  set formula(value) {
    this._formula = value;
  }
}

// Register custom element
customElements.define('enhanced-formula-builder', EnhancedFormulaBuilder);
