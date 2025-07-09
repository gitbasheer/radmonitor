/**
 * Tests for Formula Editor Integration
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock dependencies first
vi.mock('../assets/js/data-service.js', () => ({
    dataService: {
        validateFormula: vi.fn(),
        executeFormulaQuery: vi.fn(),
        updateFieldSchema: vi.fn()
    }
}));

vi.mock('../assets/js/api-client-unified.js', () => ({
    UnifiedAPIClient: {
        getInstance: vi.fn(() => ({
            validateConnection: vi.fn(),
            fetchTrafficData: vi.fn(),
            submitSearch: vi.fn(),
            post: vi.fn()
        }))
    }
}));

// Mock the enhanced formula editor module to prevent actual import
vi.mock('../assets/js/formula-builder/ui/enhanced-formula-editor.js', () => ({}));

// Register the mock element only if not already registered
if (!customElements.get('enhanced-formula-editor')) {
    // Mock the enhanced formula editor element
    class MockEnhancedFormulaEditor extends HTMLElement {
        constructor() {
            super();
            this._value = '';
            this.fieldSchema = null;
            this._listeners = {};
        }

        getValue() {
            return this._value;
        }

        setValue(value) {
            this._value = value;
        }

        get value() {
            return this._value;
        }

        set value(val) {
            this._value = val;
        }

        setFieldSchema(schema) {
            this.fieldSchema = schema;
        }

        focus() {
            const event = new Event('focus');
            this.dispatchEvent(event);
        }

        addEventListener(event, handler) {
            super.addEventListener(event, handler);
            if (!this._listeners[event]) {
                this._listeners[event] = [];
            }
            this._listeners[event].push(handler);
        }

        dispatchEvent(event) {
            // Call handlers directly
            if (this._listeners[event.type]) {
                this._listeners[event.type].forEach(handler => handler(event));
            }
            // Also use native dispatchEvent
            return super.dispatchEvent(event);
        }
    }

    customElements.define('enhanced-formula-editor', MockEnhancedFormulaEditor);
}

// Import after mocks are set up
import { FormulaEditorIntegration } from '../assets/js/formula-editor-integration.js';

describe('FormulaEditorIntegration', () => {
    let integration;
    let editor;
    let statusEl;
    let resultsEl;
    let resultsContent;
    let testBtn;

    beforeEach(() => {
        // Set up DOM
        document.body.innerHTML = `
            <enhanced-formula-editor id="formulaEditor"></enhanced-formula-editor>
            <span id="formulaStatus">Ready</span>
            <button id="testFormulaBtn">Test Formula</button>
            <div id="formulaResults" style="display: none;">
                <div id="formulaResultsContent"></div>
            </div>
        `;

        editor = document.getElementById('formulaEditor');
        statusEl = document.getElementById('formulaStatus');
        resultsEl = document.getElementById('formulaResults');
        resultsContent = document.getElementById('formulaResultsContent');
        testBtn = document.getElementById('testFormulaBtn');

        // Create instance
        integration = new FormulaEditorIntegration();

        // Reset mocks
        vi.clearAllMocks();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.clearAllTimers();
    });

    describe('Initialization', () => {
        it('should initialize successfully', async () => {
            await integration.init();

            expect(integration.editor).toBe(editor);
            expect(editor.getValue()).toBe('sum("response_time")');
            expect(integration.availableFields.size).toBeGreaterThan(0);
        });

        it('should handle missing editor element gracefully', async () => {
            document.body.innerHTML = ''; // Remove editor

            const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
            await integration.init();

            expect(consoleWarn).toHaveBeenCalledWith('Formula editor element not found');
            expect(integration.editor).toBeNull();

            consoleWarn.mockRestore();
        });

        it('should load available fields', async () => {
            await integration.init();

            expect(integration.availableFields.has('response_time')).toBe(true);
            expect(integration.availableFields.has('error_count')).toBe(true);
            expect(integration.availableFields.has('@timestamp')).toBe(true);
            expect(integration.availableFields.size).toBe(20); // Based on COMMON_FIELDS
        });
    });

    describe('Event Handling', () => {
        beforeEach(async () => {
            await integration.init();
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should schedule validation on input', () => {
            editor.value = 'average("error_count")';
            editor.dispatchEvent(new Event('input'));

            expect(statusEl.textContent).toBe('Typing...');
            expect(integration.validationTimer).toBeDefined();
        });

        it('should debounce validation', () => {
            const validateSpy = vi.spyOn(integration, 'validateFormula');

            // Multiple rapid inputs
            editor.value = 'a';
            editor.dispatchEvent(new Event('input'));
            editor.value = 'av';
            editor.dispatchEvent(new Event('input'));
            editor.value = 'avg';
            editor.dispatchEvent(new Event('input'));

            // Should not validate yet
            expect(validateSpy).not.toHaveBeenCalled();

            // Fast forward 500ms
            vi.advanceTimersByTime(500);

            // Should validate once
            expect(validateSpy).toHaveBeenCalledTimes(1);
        });

        it('should reload fields on focus', async () => {
            const loadFieldsSpy = vi.spyOn(integration, 'loadAvailableFields');

            editor.focus();

            // Since focus is synchronous in our mock, we can check immediately
            expect(loadFieldsSpy).toHaveBeenCalled();
        });
    });

    describe('Validation', () => {
        beforeEach(async () => {
            await integration.init();
        });

        it('should validate valid formula', async () => {
            const { dataService } = await import('../assets/js/data-service.js');
            dataService.validateFormula.mockResolvedValue({
                valid: true,
                complexity: 5
            });

            editor.value = 'sum("response_time")';
            await integration.validateFormula();

            expect(dataService.validateFormula).toHaveBeenCalledWith(
                'sum("response_time")',
                expect.objectContaining({
                    dataView: expect.objectContaining({
                        fields: expect.any(Array)
                    })
                })
            );
            expect(statusEl.textContent).toBe('(✓) Valid formula (complexity: 5)');
            expect(statusEl.style.color).toBe('rgb(76, 175, 80)'); // #4CAF50
        });

        it('should show validation errors', async () => {
            const { dataService } = await import('../assets/js/data-service.js');
            dataService.validateFormula.mockResolvedValue({
                valid: false,
                errors: [{ message: 'Unknown function "invalid"' }]
            });

            editor.value = 'invalid()';
            await integration.validateFormula();

            expect(statusEl.textContent).toBe('(✗)Unknown function "invalid"');
            expect(statusEl.style.color).toBe('rgb(244, 67, 54)'); // #f44336
        });

        it('should handle empty formula', async () => {
            editor.value = '';
            await integration.validateFormula();

            expect(statusEl.textContent).toBe('Ready to create formulas');
            expect(statusEl.style.color).toBe('rgb(102, 102, 102)'); // #666
        });

        it('should prevent concurrent validation', async () => {
            const { dataService } = await import('../assets/js/data-service.js');
            let resolveValidation;
            dataService.validateFormula.mockImplementation(() =>
                new Promise(resolve => { resolveValidation = resolve; })
            );

            // Start first validation
            editor.value = 'test';
            const promise1 = integration.validateFormula();

            // Try to start second validation while first is running
            expect(integration.isValidating).toBe(true);
            const promise2 = integration.validateFormula();

            // Resolve first validation
            resolveValidation({ valid: true });
            await promise1;

            // Second promise should also be resolved
            await promise2;

            // Should only have called validation once
            expect(dataService.validateFormula).toHaveBeenCalledTimes(1);
        });
    });

    describe('Test Formula Execution', () => {
        beforeEach(async () => {
            await integration.init();
            window.testFormula = () => integration.testFormula();
        });

        it('should test valid formula successfully', async () => {
            const { dataService } = await import('../assets/js/data-service.js');

            dataService.validateFormula.mockResolvedValue({ valid: true });
            dataService.executeFormulaQuery.mockResolvedValue({
                success: true,
                data: [
                    { id: 'test1', name: 'Test 1', value: 100 },
                    { id: 'test2', name: 'Test 2', value: 200 }
                ],
                stats: { total: 2, critical: 0, warning: 1 }
            });

            editor.value = 'sum("response_time")';
            await integration.testFormula();

            expect(resultsEl.style.display).toBe('block');
            expect(resultsContent.innerHTML).toContain('Found 2 results');
            expect(resultsContent.innerHTML).toContain('Test 1: 100');
            expect(resultsContent.innerHTML).toContain('Test 2: 200');
            expect(resultsContent.innerHTML).toContain('Total: 2');
            expect(statusEl.textContent).toBe('(✓) Test successful');
        });

        it('should handle test errors', async () => {
            const { dataService } = await import('../assets/js/data-service.js');

            dataService.validateFormula.mockResolvedValue({
                valid: false,
                errors: [{ message: 'Invalid syntax' }]
            });

            editor.value = 'invalid(';
            await integration.testFormula();

            expect(resultsEl.style.display).toBe('block');
            expect(resultsContent.innerHTML).toContain('Error:');
            expect(resultsContent.innerHTML).toContain('Invalid syntax');
            expect(statusEl.textContent).toBe('(✗)Test failed: Invalid syntax');
        });

        it('should handle empty formula', async () => {
            editor.value = '';
            await integration.testFormula();

            expect(statusEl.textContent).toBe('Enter a formula to test');
            expect(statusEl.style.color).toBe('rgb(244, 67, 54)'); // #f44336
        });

        it('should disable button during test', async () => {
            const { dataService } = await import('../assets/js/data-service.js');

            let resolveExecution;
            dataService.validateFormula.mockResolvedValue({ valid: true });
            dataService.executeFormulaQuery.mockImplementation(() =>
                new Promise(resolve => { resolveExecution = resolve; })
            );

            editor.value = 'sum("test")';
            const promise = integration.testFormula();

            // Button should be disabled
            expect(testBtn.disabled).toBe(true);
            expect(testBtn.innerHTML).toContain('Testing...');

            // Resolve execution
            resolveExecution({ success: true, data: [] });
            await promise;

            // Button should be re-enabled
            expect(testBtn.disabled).toBe(false);
            expect(testBtn.innerHTML).toContain('Test Formula');
        });

        it('should show limited results', async () => {
            const { dataService } = await import('../assets/js/data-service.js');

            dataService.validateFormula.mockResolvedValue({ valid: true });
            dataService.executeFormulaQuery.mockResolvedValue({
                success: true,
                data: Array(10).fill(null).map((_, i) => ({
                    id: `test${i}`,
                    value: i * 100
                }))
            });

            editor.value = 'count()';
            await integration.testFormula();

            expect(resultsContent.innerHTML).toContain('Found 10 results');
            expect(resultsContent.innerHTML).toContain('... and 7 more');
        });
    });

    describe('Field Schema Management', () => {
        beforeEach(async () => {
            await integration.init();
        });

        it('should update editor field schema', async () => {
            await integration.loadAvailableFields();

            expect(editor.fieldSchema).toBeDefined();
            expect(editor.fieldSchema.size).toBe(20);
            expect(editor.fieldSchema.has('response_time')).toBe(true);
        });

        it('should update data service field schema', async () => {
            const { dataService } = await import('../assets/js/data-service.js');

            await integration.loadAvailableFields();

            expect(dataService.updateFieldSchema).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ name: 'response_time', type: 'number' })
                ])
            );
        });
    });

    describe('Status Updates', () => {
        beforeEach(async () => {
            await integration.init();
        });

        it('should update status with correct colors', () => {
            const testCases = [
                { type: 'ready', color: 'rgb(102, 102, 102)' },
                { type: 'typing', color: 'rgb(153, 153, 153)' },
                { type: 'validating', color: 'rgb(33, 150, 243)' },
                { type: 'valid', color: 'rgb(76, 175, 80)' },
                { type: 'error', color: 'rgb(244, 67, 54)' }
            ];

            testCases.forEach(({ type, color }) => {
                integration.updateStatus(`Test ${type}`, type);
                expect(statusEl.textContent).toBe(`Test ${type}`);
                expect(statusEl.style.color).toBe(color);
            });
        });
    });
});
