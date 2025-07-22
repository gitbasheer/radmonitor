/**
 * Formula Builder - Main Entry Point
 *
 * A comprehensive formula building system for Elasticsearch queries
 * with Kibana Lens formula syntax support.
 */

// Core exports
export { FormulaParser, parseFormula } from './core/formula-parser.js';
export { QueryBuilder, queryBuilder, buildQueryFromFormula } from './translator/query-builder.js';
export { FormulaValidator } from './core/formula-validator.js';
export { FormulaComposer } from './core/formula-composer.js';

// Type exports
export * from './core/formula-types.js';

// UI exports
export { FormulaEditor, createFormulaEditor } from './ui/formula-editor.js';
export { FunctionPalette } from './ui/function-palette.js';
export { VisualBuilder } from './ui/visual-builder.js';

// Integration exports
export { DashboardFormulaIntegration, createFormulaIntegration } from './integration/dashboard-connector.js';
export { ApiAdapter } from './integration/api-adapter.js';

// Utilities
export { FormulaUtils } from './utils/formula-utils.js';
export { ValidationUtils } from './utils/validation-utils.js';
export { QueryUtils } from './utils/query-utils.js';

// Constants
export const VERSION = '1.0.0';
export const SUPPORTED_ES_VERSIONS = ['7.x', '8.x'];

/**
 * Initialize the Formula Builder system
 * @param {Object} config - Configuration options
 * @returns {Object} Formula Builder instance
 */
export function initializeFormulaBuilder(config = {}) {
  const defaultConfig = {
    elasticsearch: {
      version: '8.x',
      index: 'traffic-*',
      timeField: '@timestamp'
    },
    ui: {
      theme: 'light',
      enableAutoComplete: true,
      enableRealTimeValidation: true,
      debounceDelay: 300
    },
    features: {
      enableVisualBuilder: true,
      enableQueryExecution: true,
      enableDashboardIntegration: true,
      enableFormulaPersistence: true
    },
    validation: {
      strictMode: false,
      allowUnknownFunctions: false,
      maxFormulaLength: 5000
    }
  };

  const finalConfig = deepMerge(defaultConfig, config);

  // Store configuration globally
  window.__formulaBuilderConfig = finalConfig;

  return {
    config: finalConfig,
    parser: new FormulaParser(),
    builder: new QueryBuilder(),
    validator: new FormulaValidator(finalConfig.validation),
    composer: new FormulaComposer()
  };
}

/**
 * Create a Formula Builder UI instance
 * @param {HTMLElement} container - Container element
 * @param {Object} options - UI options
 * @returns {FormulaEditor} Editor instance
 */
export function createFormulaBuilderUI(container, options = {}) {
  const config = window.__formulaBuilderConfig || {};
  const mergedOptions = {
    ...config.ui,
    ...options
  };

  return createFormulaEditor(container, mergedOptions);
}

/**
 * Deep merge utility
 */
function deepMerge(target, source) {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }

  return output;
}

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

// Auto-initialize if data attribute is present
document.addEventListener('DOMContentLoaded', () => {
  const autoInitElements = document.querySelectorAll('[data-formula-builder-auto-init]');

  autoInitElements.forEach(element => {
    const options = element.dataset.formulaBuilderOptions
      ? JSON.parse(element.dataset.formulaBuilderOptions)
      : {};

    createFormulaBuilderUI(element, options);
  });
});

// Export default
export default {
  initialize: initializeFormulaBuilder,
  createUI: createFormulaBuilderUI,
  parse: parseFormula,
  buildQuery: buildQueryFromFormula,
  VERSION
};
