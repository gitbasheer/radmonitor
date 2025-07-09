/**
 * Formula Editor - Main UI component for building and editing formulas
 */

import { FunctionCategories, getFunctionsByCategory } from '../core/formula-types.js';
import { parseFormula } from '../core/formula-parser.js';

export class FormulaEditor {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      onFormulaChange: () => {},
      onQueryGenerated: () => {},
      enableRealTimePreview: true,
      debounceDelay: 500,
      ...options
    };

    this.formula = '';
    this.ast = null;
    this.query = null;
    this.previewTimeout = null;

    this.init();
  }

  init() {
    this.createDOM();
    this.attachEventListeners();
    this.loadFunctionPalette();
  }

  createDOM() {
    this.container.innerHTML = `
      <div class="formula-editor-container">
        <div class="formula-builder-section">
          <div class="function-palette">
            <h3>Functions</h3>
            <div class="function-search">
              <input type="text" placeholder="Search functions..." class="function-search-input">
            </div>
            <div class="function-categories">
              <div class="category-tab active" data-category="all">All</div>
              <div class="category-tab" data-category="${FunctionCategories.ELASTICSEARCH}">Elasticsearch</div>
              <div class="category-tab" data-category="${FunctionCategories.TIME_SERIES}">Time Series</div>
              <div class="category-tab" data-category="${FunctionCategories.MATH}">Math</div>
              <div class="category-tab" data-category="${FunctionCategories.COMPARISON}">Comparison</div>
            </div>
            <div class="function-list"></div>
          </div>

          <div class="editor-area">
            <div class="formula-input-section">
              <h3>Formula Editor</h3>
              <div class="formula-toolbar">
                <button class="btn-validate">Validate</button>
                <button class="btn-format">Format</button>
                <button class="btn-clear">Clear</button>
              </div>
              <textarea class="formula-input" placeholder="Enter your formula here..."></textarea>
              <div class="formula-status">
                <span class="status-indicator"></span>
                <span class="status-message">Ready</span>
              </div>
            </div>

            <div class="preview-section">
              <h3>Preview</h3>
              <div class="preview-tabs">
                <div class="preview-tab active" data-preview="ast">AST View</div>
                <div class="preview-tab" data-preview="query">Query View</div>
                <div class="preview-tab" data-preview="math">Math View</div>
              </div>
              <div class="preview-content">
                <div class="preview-pane ast-view active"></div>
                <div class="preview-pane query-view"></div>
                <div class="preview-pane math-view"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="formula-examples">
          <h3>Examples</h3>
          <div class="example-list">
            <div class="example-item" data-formula="count()">
              <strong>Simple Count</strong>
              <code>count()</code>
            </div>
            <div class="example-item" data-formula="count(kql='response.status_code > 400') / count()">
              <strong>Error Rate</strong>
              <code>count(kql='response.status_code > 400') / count()</code>
            </div>
            <div class="example-item" data-formula="average(bytes) / average(bytes, shift='1w')">
              <strong>Week over Week</strong>
              <code>average(bytes) / average(bytes, shift='1w')</code>
            </div>
            <div class="example-item" data-formula="sum(price) / overall_sum(sum(price))">
              <strong>Percent of Total</strong>
              <code>sum(price) / overall_sum(sum(price))</code>
            </div>
          </div>
        </div>
      </div>
    `;

    // Cache DOM references
    this.elements = {
      formulaInput: this.container.querySelector('.formula-input'),
      functionList: this.container.querySelector('.function-list'),
      functionSearch: this.container.querySelector('.function-search-input'),
      categoryTabs: this.container.querySelectorAll('.category-tab'),
      previewTabs: this.container.querySelectorAll('.preview-tab'),
      previewPanes: this.container.querySelectorAll('.preview-pane'),
      statusIndicator: this.container.querySelector('.status-indicator'),
      statusMessage: this.container.querySelector('.status-message'),
      exampleItems: this.container.querySelectorAll('.example-item')
    };
  }

  attachEventListeners() {
    // Formula input
    this.elements.formulaInput.addEventListener('input', (e) => {
      this.handleFormulaChange(e.target.value);
    });

    // Category tabs
    this.elements.categoryTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.selectCategory(tab.dataset.category);
      });
    });

    // Preview tabs
    this.elements.previewTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.selectPreviewTab(tab.dataset.preview);
      });
    });

    // Function search
    this.elements.functionSearch.addEventListener('input', (e) => {
      this.filterFunctions(e.target.value);
    });

    // Example items
    this.elements.exampleItems.forEach(item => {
      item.addEventListener('click', () => {
        this.loadExample(item.dataset.formula);
      });
    });

    // Toolbar buttons
    this.container.querySelector('.btn-validate').addEventListener('click', () => {
      this.validateFormula();
    });

    this.container.querySelector('.btn-format').addEventListener('click', () => {
      this.formatFormula();
    });

    this.container.querySelector('.btn-clear').addEventListener('click', () => {
      this.clearFormula();
    });
  }

  loadFunctionPalette() {
    const functions = this.getAllFunctions();
    this.renderFunctionList(functions);
  }

  getAllFunctions() {
    const allFunctions = [];
    const categories = Object.values(FunctionCategories);

    categories.forEach(category => {
      const funcs = getFunctionsByCategory(category);
      allFunctions.push(...funcs);
    });

    return allFunctions;
  }

  renderFunctionList(functions) {
    const html = functions.map(func => `
      <div class="function-item" data-function="${func.name}" data-category="${func.category}">
        <div class="function-header">
          <span class="function-name">${func.name}</span>
          <span class="function-category">${this.getCategoryLabel(func.category)}</span>
        </div>
        <div class="function-description">${func.description}</div>
        <div class="function-signature">
          ${this.formatFunctionSignature(func)}
        </div>
      </div>
    `).join('');

    this.elements.functionList.innerHTML = html;

    // Add click handlers to function items
    this.container.querySelectorAll('.function-item').forEach(item => {
      item.addEventListener('click', () => {
        this.insertFunction(item.dataset.function);
      });
    });
  }

  getCategoryLabel(category) {
    const labels = {
      [FunctionCategories.ELASTICSEARCH]: 'ES',
      [FunctionCategories.TIME_SERIES]: 'TS',
      [FunctionCategories.MATH]: 'Math',
      [FunctionCategories.COMPARISON]: 'Comp',
      [FunctionCategories.KIBANA_CONTEXT]: 'Context'
    };
    return labels[category] || category;
  }

  formatFunctionSignature(func) {
    const params = func.parameters.map(p => {
      const optionalMark = p.optional ? '?' : '';
      return `${p.name}${optionalMark}: ${p.type}`;
    }).join(', ');

    return `${func.name}(${params}) → ${func.returns}`;
  }

  selectCategory(category) {
    // Update active tab
    this.elements.categoryTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.category === category);
    });

    // Filter functions
    if (category === 'all') {
      this.loadFunctionPalette();
    } else {
      const functions = getFunctionsByCategory(category);
      this.renderFunctionList(functions);
    }
  }

  selectPreviewTab(previewType) {
    // Update active tab
    this.elements.previewTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.preview === previewType);
    });

    // Show corresponding pane
    this.elements.previewPanes.forEach(pane => {
      pane.classList.toggle('active', pane.classList.contains(`${previewType}-view`));
    });

    // Update preview content
    this.updatePreview();
  }

  filterFunctions(searchTerm) {
    const term = searchTerm.toLowerCase();
    const functionItems = this.container.querySelectorAll('.function-item');

    functionItems.forEach(item => {
      const name = item.dataset.function.toLowerCase();
      const description = item.querySelector('.function-description').textContent.toLowerCase();
      const matches = name.includes(term) || description.includes(term);
      item.style.display = matches ? 'block' : 'none';
    });
  }

  insertFunction(functionName) {
    const input = this.elements.formulaInput;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;

    // Insert function with parentheses
    const insertion = `${functionName}()`;
    const newText = text.substring(0, start) + insertion + text.substring(end);

    input.value = newText;

    // Position cursor inside parentheses
    const newPosition = start + functionName.length + 1;
    input.setSelectionRange(newPosition, newPosition);
    input.focus();

    // Trigger change event
    this.handleFormulaChange(newText);
  }

  loadExample(formula) {
    this.elements.formulaInput.value = formula;
    this.handleFormulaChange(formula);
  }

  handleFormulaChange(formula) {
    this.formula = formula;

    // Clear existing timeout
    if (this.previewTimeout) {
      clearTimeout(this.previewTimeout);
    }

    // Debounce preview updates
    if (this.options.enableRealTimePreview) {
      this.previewTimeout = setTimeout(() => {
        this.updatePreview();
      }, this.options.debounceDelay);
    }

    // Notify callback
    this.options.onFormulaChange(formula);
  }

  async updatePreview() {
    if (!this.formula) {
      this.clearPreview();
      return;
    }

    try {
      // Parse formula
      this.ast = parseFormula(this.formula);
      this.updateStatus('valid', 'Formula is valid');

      // Update AST view
      this.updateASTView(this.ast);

      // Generate query
      const context = {
        index: 'traffic-*',
        timeRange: {
          from: 'now-15m',
          to: 'now'
        }
      };

      this.query = await buildQueryFromFormula(this.formula, context);
      this.updateQueryView(this.query);

      // Update math view
      this.updateMathView(this.formula);

      // Notify callback
      this.options.onQueryGenerated(this.query);

    } catch (error) {
      this.updateStatus('error', error.message);
      this.clearPreview();
    }
  }

  updateStatus(status, message) {
    this.elements.statusIndicator.className = `status-indicator ${status}`;
    this.elements.statusMessage.textContent = message;
  }

  updateASTView(ast) {
    const astView = this.container.querySelector('.ast-view');
    astView.innerHTML = `<pre>${JSON.stringify(ast, null, 2)}</pre>`;
  }

  updateQueryView(query) {
    const queryView = this.container.querySelector('.query-view');
    queryView.innerHTML = `<pre>${JSON.stringify(query, null, 2)}</pre>`;
  }

  updateMathView(formula) {
    const mathView = this.container.querySelector('.math-view');

    // This is a simplified math view - you could enhance it with actual math rendering
    const mathExpression = this.formulaToMath(formula);
    mathView.innerHTML = `
      <div class="math-expression">
        <h4>Mathematical Expression:</h4>
        <div class="math-content">${mathExpression}</div>
      </div>
    `;
  }

  formulaToMath(formula) {
    // Convert formula to a more mathematical notation
    let math = formula;

    // Replace function calls with mathematical notation
    math = math.replace(/count\(\)/g, 'N');
    math = math.replace(/sum\(([^)]+)\)/g, 'Σ($1)');
    math = math.replace(/average\(([^)]+)\)/g, 'μ($1)');
    math = math.replace(/sqrt\(([^)]+)\)/g, '√($1)');

    return `<code>${math}</code>`;
  }

  clearPreview() {
    this.container.querySelector('.ast-view').innerHTML = '<p>Enter a formula to see the AST</p>';
    this.container.querySelector('.query-view').innerHTML = '<p>Enter a formula to see the query</p>';
    this.container.querySelector('.math-view').innerHTML = '<p>Enter a formula to see the math</p>';
  }

  validateFormula() {
    if (!this.formula) {
      this.updateStatus('error', 'No formula to validate');
      return;
    }

    try {
      parseFormula(this.formula);
      this.updateStatus('valid', 'Formula is valid');
    } catch (error) {
      this.updateStatus('error', error.message);
    }
  }

  formatFormula() {
    // TODO: Implement formula formatting
    this.updateStatus('info', 'Formula formatting not yet implemented');
  }

  clearFormula() {
    this.elements.formulaInput.value = '';
    this.formula = '';
    this.ast = null;
    this.query = null;
    this.clearPreview();
    this.updateStatus('', 'Ready');
  }
}

// Export function to create editor
export function createFormulaEditor(container, options) {
  return new FormulaEditor(container, options);
}
