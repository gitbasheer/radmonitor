/**
 * Formula Editor Integration for Dashboard
 * Integrates the enhanced formula editor with the RAD Monitor dashboard
 * @module formula-editor-integration
 */

import { dataService } from './data-service.js';
import './formula-builder/ui/enhanced-formula-editor.js';
import DOMPurify from './lib/dompurify.js';

// Constants
const VALIDATION_DELAY = 500; // ms
const MAX_RESULTS_PREVIEW = 3;

const STATUS_COLORS = {
    ready: '#666',
    typing: '#999',
    validating: '#2196F3',
    valid: '#4CAF50',
    error: '#f44336'
};

// Common traffic monitoring fields
const COMMON_FIELDS = [
    { name: 'response_time', type: 'number', aggregatable: true },
    { name: 'error_count', type: 'number', aggregatable: true },
    { name: 'error_rate', type: 'number', aggregatable: true },
    { name: 'request_count', type: 'number', aggregatable: true },
    { name: 'bytes_sent', type: 'number', aggregatable: true },
    { name: 'bytes_received', type: 'number', aggregatable: true },
    { name: 'status_code', type: 'number', aggregatable: true },
    { name: 'duration', type: 'number', aggregatable: true },
    { name: 'user_count', type: 'number', aggregatable: true },
    { name: 'session_count', type: 'number', aggregatable: true },
    { name: 'page_views', type: 'number', aggregatable: true },
    { name: 'conversion_rate', type: 'number', aggregatable: true },
    { name: '@timestamp', type: 'date', aggregatable: true },
    { name: 'host.name', type: 'keyword', aggregatable: true },
    { name: 'service.name', type: 'keyword', aggregatable: true },
    { name: 'environment', type: 'keyword', aggregatable: true },
    { name: 'status', type: 'keyword', aggregatable: true },
    { name: 'method', type: 'keyword', aggregatable: true },
    { name: 'path', type: 'keyword', aggregatable: true },
    { name: 'user.id', type: 'keyword', aggregatable: true }
];

/**
 * Formula Editor Integration Class
 * Manages the integration between the formula editor UI and the data service
 */
export class FormulaEditorIntegration {
    constructor() {
        this.editor = null;
        this.validationTimer = null;
        this.availableFields = new Map();
        this.isValidating = false;
    }

    /**
     * Initialize the formula editor integration
     * @returns {Promise<void>}
     */
    async init() {
        try {
            console.log('🔧 Initializing formula editor integration...');

            // Get the editor element
            this.editor = document.getElementById('formulaEditor');
            if (!this.editor) {
                console.warn('Formula editor element not found');
                return;
            }

            // Ensure it's the enhanced editor with setValue method
            if (!this.editor.setValue && this.editor.tagName !== 'ENHANCED-FORMULA-EDITOR') {
                console.warn('Formula editor is not an enhanced-formula-editor element');
                return;
            }

            // Wait for custom element to be defined if not already
            await customElements.whenDefined('enhanced-formula-editor');

            // Set up event listeners
            this.setupEventListeners();

            // Load available fields
            await this.loadAvailableFields();

            // Set initial example - check if setValue exists
            if (this.editor.setValue) {
                this.editor.setValue('sum("response_time")');
            } else {
                console.warn('Editor does not have setValue method');
            }

            console.log('(✓)Formula editor initialized');

            // Emit initialization event
            window.dispatchEvent(new CustomEvent('formula:initialized', {
                detail: { message: 'Formula builder ready' }
            }));
        } catch (error) {
            console.error('Failed to initialize formula editor:', error);
            this.updateStatus('Initialization failed', 'error');

            // Emit error event
            window.dispatchEvent(new CustomEvent('formula:error', {
                detail: { message: error.message || 'Formula builder initialization failed' }
            }));
        }
    }

    /**
     * Set up event listeners for the editor
     * @private
     */
    setupEventListeners() {
        if (!this.editor) return;

        // Listen for input changes for real-time validation
        this.editor.addEventListener('input', () => {
            this.scheduleValidation();
        });

        // Listen for focus to refresh field list
        this.editor.addEventListener('focus', async () => {
            await this.loadAvailableFields();
        });
    }

    /**
     * Schedule formula validation with debouncing
     * @private
     */
    scheduleValidation() {
        // Clear existing timer
        if (this.validationTimer) {
            clearTimeout(this.validationTimer);
        }

        // Show typing status
        this.updateStatus('Typing...', 'typing');

        // Schedule validation after delay
        this.validationTimer = setTimeout(() => {
            this.validateFormula();
        }, VALIDATION_DELAY);
    }

    /**
     * Validate the current formula
     * @returns {Promise<void>}
     */
    async validateFormula() {
        if (this.isValidating || !this.editor) return;

        const formula = this.editor.getValue().trim();
        if (!formula) {
            this.updateStatus('Ready to create formulas', 'ready');
            return;
        }

        this.isValidating = true;
        this.updateStatus('Validating...', 'validating');

        try {
            const result = await dataService.validateFormula(formula, {
                dataView: {
                    fields: Array.from(this.availableFields.values())
                }
            });

            if (result.valid) {
                const complexity = result.complexity ? ` (complexity: ${result.complexity})` : '';
                this.updateStatus(`(✓) Valid formula${complexity}`, 'valid');
            } else {
                const errorMsg = result.errors?.[0]?.message || 'Invalid formula';
                this.updateStatus(`(✗)${errorMsg}`, 'error');
            }

            // Log warnings for debugging
            if (result.warnings?.length > 0) {
                console.warn('Formula warnings:', result.warnings);
            }

        } catch (error) {
            console.error('Validation error:', error);
            this.updateStatus(`(✗)Validation error: ${error.message}`, 'error');
        } finally {
            this.isValidating = false;
        }
    }

    /**
     * Load available fields for autocomplete
     * @returns {Promise<void>}
     */
    async loadAvailableFields() {
        try {
            // TODO: In production, fetch from Elasticsearch mapping API
            // For now, use common traffic monitoring fields

            // Clear and rebuild field map
            this.availableFields.clear();
            COMMON_FIELDS.forEach(field => {
                this.availableFields.set(field.name, field);
            });

            // Update the editor's field schema for autocomplete
            if (this.editor?.setFieldSchema) {
                this.editor.setFieldSchema(this.availableFields);
            }

            // Update data service field schema
            dataService.updateFieldSchema(COMMON_FIELDS);

        } catch (error) {
            console.error('Failed to load available fields:', error);
        }
    }

    /**
     * Update the status display
     * @param {string} message - Status message
     * @param {string} type - Status type (ready, typing, validating, valid, error)
     * @private
     */
    updateStatus(message, type = 'ready') {
        const statusEl = document.getElementById('formulaStatus');
        if (!statusEl) return;

        statusEl.style.color = STATUS_COLORS[type] || STATUS_COLORS.ready;
        statusEl.textContent = message;
    }

    /**
     * Test the current formula and display results
     * @returns {Promise<void>}
     */
    async testFormula() {
        if (!this.editor) return;

        const formula = this.editor.getValue().trim();
        if (!formula) {
            this.updateStatus('Enter a formula to test', 'error');
            return;
        }

        const resultsEl = document.getElementById('formulaResults');
        const resultsContent = document.getElementById('formulaResultsContent');
        const testBtn = document.getElementById('testFormulaBtn');

        if (!resultsEl || !resultsContent || !testBtn) {
            console.error('Required DOM elements not found');
            return;
        }

        // Disable button and show loading
        testBtn.disabled = true;
        testBtn.innerHTML = DOMPurify.sanitize('<span style="font-size: 14px;">⏳</span> Testing...');

        try {
            // First validate
            const validation = await dataService.validateFormula(formula, {
                dataView: {
                    fields: Array.from(this.availableFields.values())
                }
            });

            if (!validation.valid) {
                throw new Error(validation.errors?.[0]?.message || 'Invalid formula');
            }

            // Execute the formula
            const result = await dataService.executeFormulaQuery(formula, {
                timeRange: 'now-1h',
                context: {
                    dataView: {
                        fields: Array.from(this.availableFields.values())
                    }
                }
            });

            if (result.success) {
                // Show results
                resultsEl.style.display = 'block';
                resultsContent.innerHTML = DOMPurify.sanitize(this.formatTestResults(result));
                this.updateStatus('(✓) Test successful', 'valid');
            } else {
                throw new Error(result.error || 'Test failed');
            }

        } catch (error) {
            // Show error
            resultsEl.style.display = 'block';
            resultsContent.innerHTML = DOMPurify.sanitize(`<strong style="color: #f44336;">Error:</strong> ${this.escapeHtml(error.message)}`);
            this.updateStatus(`(✗)Test failed: ${error.message}`, 'error');
        } finally {
            // Re-enable button
            testBtn.disabled = false;
            testBtn.innerHTML = DOMPurify.sanitize('<span style="font-size: 14px;">🧪</span> Test Formula');
        }
    }

    /**
     * Format test results for display
     * @param {Object} result - Test result object
     * @returns {string} Formatted HTML
     * @private
     */
    formatTestResults(result) {
        let html = '<strong>Test Results:</strong><br>';

        if (result.data?.length > 0) {
            html += `Found ${result.data.length} results:<br>`;

            result.data.slice(0, MAX_RESULTS_PREVIEW).forEach((item, i) => {
                const value = typeof item.value === 'object'
                    ? JSON.stringify(item.value)
                    : item.value;
                html += `${i + 1}. ${this.escapeHtml(item.name || item.id)}: ${this.escapeHtml(value)}<br>`;
            });

            if (result.data.length > MAX_RESULTS_PREVIEW) {
                html += `... and ${result.data.length - MAX_RESULTS_PREVIEW} more`;
            }
        } else {
            html += 'No results returned';
        }

        if (result.stats) {
            html += '<br><strong>Stats:</strong><br>';
            html += `Total: ${result.stats.total}, `;
            html += `Critical: ${result.stats.critical}, `;
            html += `Warning: ${result.stats.warning}`;
        }

        return html;
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     * @private
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }
}

// Create singleton instance
const formulaEditorIntegration = new FormulaEditorIntegration();

// Export for global access
window.formulaEditorIntegration = formulaEditorIntegration;
window.testFormula = () => formulaEditorIntegration.testFormula();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => formulaEditorIntegration.init());
} else {
    formulaEditorIntegration.init();
}

export { formulaEditorIntegration };
