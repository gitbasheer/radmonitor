/**
 * Tests for Formula-related functionality in Data Service
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Create mock implementations first
const mockParser = {
    parse: vi.fn()
};

const mockValidator = {
    validate: vi.fn(),
    getComplexity: vi.fn(),
    fieldSchema: new Map()
};

const mockQueryBuilder = {
    buildQuery: vi.fn(),
    buildElasticsearchQuery: vi.fn()
};

// Mock the formula builder modules BEFORE importing anything that uses them
vi.mock('../assets/js/formula-builder/core/enhanced-ast-parser.js', () => ({
    EnhancedFormulaParser: vi.fn(() => mockParser)
}));

vi.mock('../assets/js/formula-builder/core/enhanced-validator.js', () => ({
    EnhancedFormulaValidator: vi.fn(() => mockValidator)
}));

vi.mock('../assets/js/formula-builder/translator/query-builder.js', () => ({
    QueryBuilder: vi.fn(() => mockQueryBuilder)
}));

vi.mock('../assets/js/api-client-unified.js', () => ({
    UnifiedAPIClient: {
        getInstance: vi.fn(() => ({
            validateConnection: vi.fn(),
            fetchTrafficData: vi.fn(),
            submitSearch: vi.fn(),
            post: vi.fn(),
            getCachedDashboardData: vi.fn()
        }))
    }
}));

// Create a mock EventEmitter base class
class MockEventEmitter {
    constructor() {
        this._events = {};
    }

    emit(event, ...args) {
        if (this._events[event]) {
            this._events[event].forEach(handler => handler(...args));
        }
    }

    on(event, handler) {
        if (!this._events[event]) {
            this._events[event] = [];
        }
        this._events[event].push(handler);
    }

    removeAllListeners() {
        this._events = {};
    }
}

vi.mock('../assets/js/event-emitter.js', () => ({
    EventEmitter: MockEventEmitter
}));

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
};
global.localStorage = localStorageMock;

// Import after all mocks are set up
import { dataService } from '../assets/js/data-service.js';

describe('DataService Formula Methods', () => {

    beforeEach(() => {
        // Reset all mocks
        vi.clearAllMocks();

        // Reset mock validator schema
        mockValidator.fieldSchema.clear();

        // Reset localStorage mock
        localStorageMock.getItem.mockReturnValue(null);
    });

    describe('executeFormulaQuery', () => {
        it('should execute a valid formula query successfully', async () => {
            const formula = 'sum("response_time")';
            const options = { timeRange: 'now-1h' };

            // Mock successful parse
            const ast = { type: 'function', name: 'sum', args: ['response_time'] };
            mockParser.parse.mockReturnValue({ success: true, ast });

            // Mock successful validation
            mockValidator.validate.mockResolvedValue({
                valid: true,
                results: []
            });

            // Mock query building
            const esQuery = { aggs: { result: { sum: { field: 'response_time' } } } };
            mockQueryBuilder.buildQuery.mockReturnValue(esQuery);

            // Mock API response
            const { UnifiedAPIClient } = await import('../assets/js/api-client-unified.js');
            const apiClient = UnifiedAPIClient.getInstance();
            apiClient.post.mockResolvedValue({
                success: true,
                data: [{ id: 'result', value: 1500 }],
                stats: { total: 1 }
            });

            const result = await dataService.executeFormulaQuery(formula, options);

            expect(result.success).toBe(true);
            expect(result.data).toEqual([{ id: 'result', value: 1500 }]);
            expect(mockParser.parse).toHaveBeenCalledWith(formula);
            expect(mockValidator.validate).toHaveBeenCalledWith(ast, expect.any(Object));
            expect(mockQueryBuilder.buildQuery).toHaveBeenCalledWith(ast, expect.any(Object));
        });

        it('should handle empty formula', async () => {
            // Empty formula should trigger parse error
            mockParser.parse.mockReturnValue({
                success: false,
                errors: [{ message: 'No formula provided' }]
            });

            const result = await dataService.executeFormulaQuery('', {});

            expect(result.success).toBe(false);
            expect(result.error).toContain('No formula provided');
        });

        it('should handle parse errors', async () => {
            mockParser.parse.mockReturnValue({
                success: false,
                errors: [{ message: 'Parse error: Invalid syntax' }]
            });

            const result = await dataService.executeFormulaQuery('invalid(', {});

            expect(result.success).toBe(false);
            expect(result.error).toContain('Parse error');
        });

        it('should handle validation errors', async () => {
            const ast = { type: 'function' };
            mockParser.parse.mockReturnValue({ success: true, ast });
            mockValidator.validate.mockResolvedValue({
                valid: false,
                results: [{ severity: 'error', message: 'Unknown function' }]
            });

            const result = await dataService.executeFormulaQuery('unknown()', {});

            expect(result.success).toBe(false);
            expect(result.error).toBe('Unknown function');
        });

        it('should handle API errors', async () => {
            const ast = { type: 'function' };
            mockParser.parse.mockReturnValue({ success: true, ast });
            mockValidator.validate.mockResolvedValue({ valid: true, results: [] });
            mockQueryBuilder.buildQuery.mockReturnValue({});

            const { UnifiedAPIClient } = await import('../assets/js/api-client-unified.js');
            const apiClient = UnifiedAPIClient.getInstance();
            apiClient.post.mockResolvedValue({
                success: false,
                error: 'Elasticsearch error'
            });

            const result = await dataService.executeFormulaQuery('sum("test")', {});

            expect(result.success).toBe(false);
            expect(result.error).toBe('Elasticsearch error');
        });

        it('should use current time range if not provided', async () => {
            const ast = { type: 'function' };
            mockParser.parse.mockReturnValue({ success: true, ast });
            mockValidator.validate.mockResolvedValue({ valid: true, results: [] });
            mockQueryBuilder.buildQuery.mockReturnValue({});

            const { UnifiedAPIClient } = await import('../assets/js/api-client-unified.js');
            const apiClient = UnifiedAPIClient.getInstance();
            apiClient.post.mockResolvedValue({ success: true, data: [] });

            await dataService.executeFormulaQuery('count()', {});

            expect(mockQueryBuilder.buildQuery).toHaveBeenCalledWith(
                ast,
                expect.objectContaining({
                    timeRange: expect.any(Object)
                })
            );
        });
    });

    describe('validateFormula', () => {
        it('should validate a correct formula', async () => {
            const formula = 'average("response_time")';
            const context = { dataView: { fields: [] } };

            const ast = { type: 'function', name: 'average' };
            mockParser.parse.mockReturnValue({ success: true, ast });
            mockValidator.validate.mockResolvedValue({
                valid: true,
                results: [],
                complexity: 5
            });

            const result = await dataService.validateFormula(formula, context);

            expect(result.valid).toBe(true);
            expect(result.complexity).toBe(5);
            expect(result.errors).toEqual([]);
        });

        it('should return errors for invalid formula', async () => {
            const formula = 'invalid(';

            mockParser.parse.mockReturnValue({
                success: false,
                errors: [{ message: 'Unexpected end of input' }]
            });

            const result = await dataService.validateFormula(formula);

            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].message).toBe('Unexpected end of input');
        });

        it('should handle validation warnings', async () => {
            const ast = { type: 'function' };
            mockParser.parse.mockReturnValue({ success: true, ast });
            mockValidator.validate.mockResolvedValue({
                valid: true,
                results: [{ severity: 'warning', message: 'Field may not exist' }],
                complexity: 3
            });

            const result = await dataService.validateFormula('sum("maybe_field")');

            expect(result.valid).toBe(true);
            expect(result.warnings).toHaveLength(1);
            expect(result.warnings[0].message).toBe('Field may not exist');
        });

        it('should handle empty formula', async () => {
            mockParser.parse.mockReturnValue({
                success: false,
                errors: [{ message: 'Formula cannot be empty' }]
            });

            const result = await dataService.validateFormula('');

            expect(result.valid).toBe(false);
            expect(result.errors[0].message).toBe('Formula cannot be empty');
        });

        it('should handle exceptions during parsing', async () => {
            mockParser.parse.mockImplementation(() => {
                throw new Error('Parser crashed');
            });

            const result = await dataService.validateFormula('test');

            expect(result.valid).toBe(false);
            expect(result.errors[0].message).toBe('Parser crashed');
        });
    });

    describe('updateFieldSchema', () => {
        it('should update field schema', () => {
            const fields = [
                { name: 'test1', type: 'number', aggregatable: true },
                { name: 'test2', type: 'keyword', aggregatable: false }
            ];

            dataService.updateFieldSchema(fields);

            // Check the validator's field schema was updated
            expect(mockValidator.fieldSchema.size).toBe(2);
            expect(mockValidator.fieldSchema.get('test1')).toEqual({
                type: 'number',
                aggregatable: true
            });
        });

        it('should handle empty field array', () => {
            dataService.updateFieldSchema([]);

            expect(mockValidator.fieldSchema.size).toBe(0);
        });

        it('should overwrite existing schema', () => {
            // Set initial schema
            dataService.updateFieldSchema([{ name: 'old', type: 'text' }]);
            expect(mockValidator.fieldSchema.size).toBe(1);

            // Update with new schema
            dataService.updateFieldSchema([
                { name: 'new1', type: 'number' },
                { name: 'new2', type: 'date' }
            ]);

            expect(mockValidator.fieldSchema.size).toBe(2);
            expect(mockValidator.fieldSchema.has('old')).toBe(false);
            expect(mockValidator.fieldSchema.has('new1')).toBe(true);
            expect(mockValidator.fieldSchema.has('new2')).toBe(true);
        });
    });

    describe('Error handling edge cases', () => {
        it('should handle malformed parse results', async () => {
            mockParser.parse.mockReturnValue({
                // Missing success field
                ast: {}
            });

            const result = await dataService.executeFormulaQuery('test', {});

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should handle validator throwing exceptions', async () => {
            mockParser.parse.mockReturnValue({ success: true, ast: {} });
            mockValidator.validate.mockRejectedValue(new Error('Validator error'));

            const result = await dataService.executeFormulaQuery('test', {});

            expect(result.success).toBe(false);
            expect(result.error).toContain('Validator error');
        });

        it('should handle query builder failures', async () => {
            mockParser.parse.mockReturnValue({ success: true, ast: {} });
            mockValidator.validate.mockResolvedValue({ valid: true, results: [] });
            mockQueryBuilder.buildQuery.mockImplementation(() => {
                throw new Error('Query build failed');
            });

            const result = await dataService.executeFormulaQuery('test', {});

            expect(result.success).toBe(false);
            expect(result.error).toContain('Query build failed');
        });
    });
});
