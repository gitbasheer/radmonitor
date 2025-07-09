/**
 * Enhanced Formula Validator with Security Focus
 * Features:
 * - AST-based validation
 * - Type checking
 * - Security scanning
 * - Performance analysis
 * - Real-time validation with <100ms response
 */

import { NodeType } from './enhanced-ast-parser.js';
import { ELASTICSEARCH_FUNCTIONS, MATH_FUNCTIONS, COMPARISON_FUNCTIONS, COLUMN_FUNCTIONS, CONTEXT_FUNCTIONS } from './formula-functions.js';

// Validation result types
export const ValidationSeverity = {
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// Security configuration
const SECURITY_CONFIG = {
  maxFormulaLength: 10000,
  maxNestingDepth: 20,
  maxFunctionCalls: 100,
  maxStringLength: 1000,
  maxArraySize: 1000,
  forbiddenPatterns: [
    /eval\s*\(/,
    /Function\s*\(/,
    /setTimeout/,
    /setInterval/,
    /import\s*\(/,
    /require\s*\(/
  ],
  maxQueryComplexity: 50, // Arbitrary complexity score
  maxTimeRange: 365 * 24 * 60 * 60 * 1000 // 1 year in ms
};

// Type definitions
const DataTypes = {
  NUMBER: 'number',
  STRING: 'string',
  BOOLEAN: 'boolean',
  DATE: 'date',
  ARRAY: 'array',
  ANY: 'any'
};

// Function signatures
const FUNCTION_SIGNATURES = new Map([
  // Elasticsearch functions
  ['sum', { args: [{ name: 'field', type: DataTypes.STRING }], returns: DataTypes.NUMBER }],
  ['average', { args: [{ name: 'field', type: DataTypes.STRING }], returns: DataTypes.NUMBER }],
  ['count', { args: [{ name: 'field', type: DataTypes.STRING, optional: true }], returns: DataTypes.NUMBER }],
  ['max', { args: [{ name: 'field', type: DataTypes.STRING }], returns: DataTypes.NUMBER }],
  ['min', { args: [{ name: 'field', type: DataTypes.STRING }], returns: DataTypes.NUMBER }],
  ['unique_count', { args: [{ name: 'field', type: DataTypes.STRING }], returns: DataTypes.NUMBER }],
  ['percentile', {
    args: [
      { name: 'field', type: DataTypes.STRING },
      { name: 'percentile', type: DataTypes.NUMBER, optional: true }
    ],
    returns: DataTypes.NUMBER
  }],

  // Math functions
  ['round', {
    args: [
      { name: 'value', type: DataTypes.NUMBER },
      { name: 'decimals', type: DataTypes.NUMBER, optional: true }
    ],
    returns: DataTypes.NUMBER
  }],
  ['abs', { args: [{ name: 'value', type: DataTypes.NUMBER }], returns: DataTypes.NUMBER }],
  ['sqrt', { args: [{ name: 'value', type: DataTypes.NUMBER }], returns: DataTypes.NUMBER }],
  ['pow', {
    args: [
      { name: 'value', type: DataTypes.NUMBER },
      { name: 'exponent', type: DataTypes.NUMBER }
    ],
    returns: DataTypes.NUMBER
  }],

  // Comparison functions
  ['gt', {
    args: [
      { name: 'left', type: DataTypes.NUMBER },
      { name: 'right', type: DataTypes.NUMBER }
    ],
    returns: DataTypes.BOOLEAN
  }],
  ['lt', {
    args: [
      { name: 'left', type: DataTypes.NUMBER },
      { name: 'right', type: DataTypes.NUMBER }
    ],
    returns: DataTypes.BOOLEAN
  }],
  ['ifelse', {
    args: [
      { name: 'condition', type: DataTypes.BOOLEAN },
      { name: 'truthy', type: DataTypes.ANY },
      { name: 'falsy', type: DataTypes.ANY }
    ],
    returns: DataTypes.ANY
  }],

  // Time series functions
  ['moving_average', {
    args: [
      { name: 'metric', type: DataTypes.NUMBER },
      { name: 'window', type: DataTypes.NUMBER, optional: true }
    ],
    returns: DataTypes.NUMBER
  }],
  ['cumulative_sum', { args: [{ name: 'metric', type: DataTypes.NUMBER }], returns: DataTypes.NUMBER }],
  ['differences', { args: [{ name: 'metric', type: DataTypes.NUMBER }], returns: DataTypes.NUMBER }],

  // Context functions
  ['interval', { args: [], returns: DataTypes.NUMBER }],
  ['now', { args: [], returns: DataTypes.NUMBER }],
  ['time_range', { args: [], returns: DataTypes.NUMBER }]
]);

/**
 * Enhanced validator with multiple validation layers
 */
export class EnhancedFormulaValidator {
  constructor(config = {}) {
    this.config = { ...SECURITY_CONFIG, ...config };
    this.validationCache = new Map();
    this.fieldSchema = config.fieldSchema || new Map();
    this.customFunctions = config.customFunctions || new Map();
  }

  /**
   * Main validation entry point
   */
  async validate(ast, context = {}) {
    const startTime = performance.now();
    const results = [];

    try {
      // Security validation
      results.push(...this.validateSecurity(ast));

      // Syntax validation
      results.push(...this.validateSyntax(ast));

      // Type validation
      results.push(...await this.validateTypes(ast, context));

      // Performance validation
      results.push(...this.validatePerformance(ast));

      // Context-specific validation
      if (context.dataView) {
        results.push(...this.validateDataView(ast, context.dataView));
      }

      const validationTime = performance.now() - startTime;

      return {
        valid: !results.some(r => r.severity === ValidationSeverity.ERROR),
        results,
        validationTime,
        complexity: this.calculateComplexity(ast)
      };
    } catch (error) {
      return {
        valid: false,
        results: [{
          severity: ValidationSeverity.ERROR,
          message: `Validation error: ${error.message}`,
          position: 0
        }],
        validationTime: performance.now() - startTime
      };
    }
  }

  /**
   * Security validation
   */
  validateSecurity(ast) {
    const results = [];

    // Check formula length
    const formulaLength = this.getFormulaLength(ast);
    if (formulaLength > this.config.maxFormulaLength) {
      results.push({
        severity: ValidationSeverity.ERROR,
        message: `Formula too long: ${formulaLength} characters (max: ${this.config.maxFormulaLength})`,
        position: 0
      });
    }

    // Check nesting depth
    const maxDepth = this.getMaxDepth(ast);
    if (maxDepth > this.config.maxNestingDepth) {
      results.push({
        severity: ValidationSeverity.ERROR,
        message: `Formula too deeply nested: depth ${maxDepth} (max: ${this.config.maxNestingDepth})`,
        position: 0
      });
    }

    // Check function call count
    const functionCount = this.countFunctionCalls(ast);
    if (functionCount > this.config.maxFunctionCalls) {
      results.push({
        severity: ValidationSeverity.ERROR,
        message: `Too many function calls: ${functionCount} (max: ${this.config.maxFunctionCalls})`,
        position: 0
      });
    }

    // Scan for forbidden patterns
    this.walkAST(ast, (node) => {
      if (node.type === NodeType.LITERAL && node.dataType === 'string') {
        for (const pattern of this.config.forbiddenPatterns) {
          if (pattern.test(node.value)) {
            results.push({
              severity: ValidationSeverity.ERROR,
              message: `Forbidden pattern detected in string literal`,
              position: node.position
            });
          }
        }
      }
    });

    return results;
  }

  /**
   * Syntax validation
   */
  validateSyntax(ast) {
    const results = [];

    this.walkAST(ast, (node, parent) => {
      switch (node.type) {
        case NodeType.FUNCTION_CALL:
          results.push(...this.validateFunctionCall(node));
          break;

        case NodeType.BINARY_OP:
          results.push(...this.validateBinaryOp(node));
          break;

        case NodeType.UNARY_OP:
          results.push(...this.validateUnaryOp(node));
          break;

        case NodeType.FIELD_REF:
          results.push(...this.validateFieldRef(node));
          break;
      }
    });

    return results;
  }

  /**
   * Type validation with inference
   */
  async validateTypes(ast, context) {
    const results = [];
    const typeMap = new Map();

    // First pass: infer types
    await this.inferTypes(ast, typeMap, context);

    // Second pass: validate type compatibility
    this.walkAST(ast, (node) => {
      const nodeType = typeMap.get(node);

      switch (node.type) {
        case NodeType.BINARY_OP:
          const leftType = typeMap.get(node.left);
          const rightType = typeMap.get(node.right);

          if (!this.areTypesCompatible(node.operator, leftType, rightType)) {
            results.push({
              severity: ValidationSeverity.ERROR,
              message: `Type mismatch: cannot apply '${node.operator}' to ${leftType} and ${rightType}`,
              position: node.position
            });
          }
          break;

        case NodeType.FUNCTION_CALL:
          const signature = FUNCTION_SIGNATURES.get(node.name) || this.customFunctions.get(node.name);
          if (signature) {
            // Validate argument types
            for (let i = 0; i < node.args.length; i++) {
              const expectedType = signature.args[i]?.type;
              const actualType = typeMap.get(node.args[i]);
              const argNode = node.args[i];

              // Special handling for field references as function arguments
              // Field references in aggregation functions are valid string arguments
              if (argNode.type === NodeType.FIELD_REF && expectedType === DataTypes.STRING) {
                // This is valid - field reference as string argument
                continue;
              }

              if (expectedType && expectedType !== DataTypes.ANY && actualType !== expectedType) {
                // Allow ANY type to match anything
                if (actualType !== DataTypes.ANY) {
                  results.push({
                    severity: ValidationSeverity.ERROR,
                    message: `Type mismatch in function '${node.name}' argument ${i + 1}: expected ${expectedType}, got ${actualType}`,
                    position: node.args[i].position
                  });
                }
              }
            }
          }
          break;
      }
    });

    return results;
  }

  /**
   * Performance validation
   */
  validatePerformance(ast) {
    const results = [];
    const metrics = this.analyzePerformance(ast);

    // Check query complexity
    if (metrics.complexity > this.config.maxQueryComplexity) {
      results.push({
        severity: ValidationSeverity.WARNING,
        message: `Formula may be slow: complexity score ${metrics.complexity} (recommended max: ${this.config.maxQueryComplexity})`,
        position: 0
      });
    }

    // Check aggregation count
    if (metrics.aggregationCount > 10) {
      results.push({
        severity: ValidationSeverity.WARNING,
        message: `Many aggregations (${metrics.aggregationCount}) may impact performance`,
        position: 0
      });
    }

    // Check time range
    if (metrics.hasTimeRange && metrics.estimatedTimeRange > this.config.maxTimeRange) {
      results.push({
        severity: ValidationSeverity.WARNING,
        message: `Large time range may impact performance`,
        position: 0
      });
    }

    // Suggest optimizations
    if (metrics.duplicateSubexpressions.length > 0) {
      results.push({
        severity: ValidationSeverity.INFO,
        message: `Consider extracting common subexpressions for better performance`,
        position: 0,
        suggestions: metrics.duplicateSubexpressions
      });
    }

    return results;
  }

  /**
   * Data view specific validation
   */
  validateDataView(ast, dataView) {
    const results = [];
    const availableFields = new Set(dataView.fields.map(f => f.name));

    this.walkAST(ast, (node) => {
      if (node.type === NodeType.FIELD_REF) {
        if (!availableFields.has(node.field)) {
          results.push({
            severity: ValidationSeverity.ERROR,
            message: `Field '${node.field}' not found in data view`,
            position: node.position,
            suggestions: this.getSimilarFields(node.field, availableFields)
          });
        }
      }

      if (node.type === NodeType.FUNCTION_CALL) {
        // Validate KQL filters
        if (node.namedArgs.kql) {
          const kqlValidation = this.validateKQL(node.namedArgs.kql, availableFields);
          results.push(...kqlValidation);
        }
      }
    });

    return results;
  }

  // Helper methods

  validateFunctionCall(node) {
    const results = [];
    const signature = FUNCTION_SIGNATURES.get(node.name) || this.customFunctions.get(node.name);

    if (!signature) {
      results.push({
        severity: ValidationSeverity.ERROR,
        message: `Unknown function '${node.name}'`,
        position: node.position,
        suggestions: this.getSimilarFunctions(node.name)
      });
      return results;
    }

    // Validate argument count
    const requiredArgs = signature.args.filter(a => !a.optional).length;
    const maxArgs = signature.args.length;

    if (node.args.length < requiredArgs) {
      results.push({
        severity: ValidationSeverity.ERROR,
        message: `Function '${node.name}' requires at least ${requiredArgs} arguments, got ${node.args.length}`,
        position: node.position
      });
    }

    if (node.args.length > maxArgs && Object.keys(node.namedArgs).length === 0) {
      results.push({
        severity: ValidationSeverity.ERROR,
        message: `Function '${node.name}' accepts at most ${maxArgs} arguments, got ${node.args.length}`,
        position: node.position
      });
    }

    // Validate named arguments
    const validNamedArgs = new Set(signature.args.map(a => a.name));
    for (const argName of Object.keys(node.namedArgs)) {
      if (!validNamedArgs.has(argName)) {
        results.push({
          severity: ValidationSeverity.ERROR,
          message: `Unknown argument '${argName}' for function '${node.name}'`,
          position: node.position,
          suggestions: Array.from(validNamedArgs)
        });
      }
    }

    return results;
  }

  validateBinaryOp(node) {
    const results = [];
    const validOps = ['+', '-', '*', '/', '%', '^', '>', '<', '>=', '<=', '==', '!=', 'AND', 'OR'];

    if (!validOps.includes(node.operator)) {
      results.push({
        severity: ValidationSeverity.ERROR,
        message: `Invalid operator '${node.operator}'`,
        position: node.position
      });
    }

    return results;
  }

  validateUnaryOp(node) {
    const results = [];
    const validOps = ['-', '!', 'NOT'];

    if (!validOps.includes(node.operator)) {
      results.push({
        severity: ValidationSeverity.ERROR,
        message: `Invalid unary operator '${node.operator}'`,
        position: node.position
      });
    }

    return results;
  }

  validateFieldRef(node) {
    const results = [];

    // Check for common mistakes
    if (node.field.includes(' ')) {
      results.push({
        severity: ValidationSeverity.WARNING,
        message: `Field name contains spaces. Did you mean to quote it?`,
        position: node.position
      });
    }

    return results;
  }

  validateKQL(kqlNode, availableFields) {
    const results = [];

    if (kqlNode.type !== NodeType.LITERAL || kqlNode.dataType !== 'string') {
      results.push({
        severity: ValidationSeverity.ERROR,
        message: `KQL parameter must be a string literal`,
        position: kqlNode.position
      });
      return results;
    }

    // Basic KQL validation
    try {
      // Extract field references from KQL
      const fieldPattern = /(\w+(?:\.\w+)*)\s*:/g;
      let match;

      while ((match = fieldPattern.exec(kqlNode.value)) !== null) {
        const field = match[1];
        if (!availableFields.has(field)) {
          results.push({
            severity: ValidationSeverity.WARNING,
            message: `Field '${field}' in KQL filter not found in data view`,
            position: kqlNode.position + match.index
          });
        }
      }
    } catch (error) {
      results.push({
        severity: ValidationSeverity.ERROR,
        message: `Invalid KQL syntax: ${error.message}`,
        position: kqlNode.position
      });
    }

    return results;
  }

  // Type inference
  async inferTypes(node, typeMap, context) {
    if (!node) return DataTypes.ANY;

    switch (node.type) {
      case NodeType.LITERAL:
        typeMap.set(node, node.dataType);
        return node.dataType;

      case NodeType.FIELD_REF:
        // Field references are treated as the type they would return
        // In most cases, this would be a number for aggregation fields
        const fieldType = this.getFieldType(node.field, context);
        typeMap.set(node, fieldType);
        return fieldType;

      case NodeType.FUNCTION_CALL:
        const signature = FUNCTION_SIGNATURES.get(node.name) || this.customFunctions.get(node.name);
        if (signature) {
          // Infer argument types
          for (let i = 0; i < node.args.length; i++) {
            await this.inferTypes(node.args[i], typeMap, context);
          }
          typeMap.set(node, signature.returns);
          return signature.returns;
        }
        typeMap.set(node, DataTypes.ANY);
        return DataTypes.ANY;

      case NodeType.BINARY_OP:
        const leftType = await this.inferTypes(node.left, typeMap, context);
        const rightType = await this.inferTypes(node.right, typeMap, context);
        const resultType = this.inferBinaryOpType(node.operator, leftType, rightType);
        typeMap.set(node, resultType);
        return resultType;

      case NodeType.UNARY_OP:
        const operandType = await this.inferTypes(node.operand, typeMap, context);
        const unaryResultType = node.operator === '!' || node.operator === 'NOT'
          ? DataTypes.BOOLEAN
          : operandType;
        typeMap.set(node, unaryResultType);
        return unaryResultType;

      default:
        typeMap.set(node, DataTypes.ANY);
        return DataTypes.ANY;
    }
  }

  getFieldType(field, context) {
    // If we have a data view context, check the field type
    if (context?.dataView?.fields) {
      const fieldDef = context.dataView.fields.find(f => f.name === field);
      if (fieldDef) {
        return fieldDef.type === 'number' ? DataTypes.NUMBER :
               fieldDef.type === 'string' ? DataTypes.STRING :
               fieldDef.type === 'boolean' ? DataTypes.BOOLEAN :
               fieldDef.type === 'date' ? DataTypes.DATE :
               DataTypes.ANY;
      }
    }

    // Default assumption: field references in aggregation context are strings (field names)
    // But when used as arguments to aggregation functions, they represent the field to aggregate
    return DataTypes.STRING;
  }

  inferBinaryOpType(operator, leftType, rightType) {
    // Arithmetic operators
    if (['+', '-', '*', '/', '%', '^'].includes(operator)) {
      return DataTypes.NUMBER;
    }

    // Comparison operators
    if (['>', '<', '>=', '<=', '==', '!='].includes(operator)) {
      return DataTypes.BOOLEAN;
    }

    // Logical operators
    if (['AND', 'OR'].includes(operator)) {
      return DataTypes.BOOLEAN;
    }

    return DataTypes.ANY;
  }

  areTypesCompatible(operator, leftType, rightType) {
    // Arithmetic operators require numbers
    if (['+', '-', '*', '/', '%', '^'].includes(operator)) {
      return leftType === DataTypes.NUMBER && rightType === DataTypes.NUMBER;
    }

    // Comparison operators work with same types
    if (['>', '<', '>=', '<='].includes(operator)) {
      return leftType === rightType && leftType === DataTypes.NUMBER;
    }

    // Equality works with any same types
    if (['==', '!='].includes(operator)) {
      return leftType === rightType || leftType === DataTypes.ANY || rightType === DataTypes.ANY;
    }

    // Logical operators require booleans
    if (['AND', 'OR'].includes(operator)) {
      return leftType === DataTypes.BOOLEAN && rightType === DataTypes.BOOLEAN;
    }

    return true;
  }

  // Performance analysis
  analyzePerformance(ast) {
    const metrics = {
      complexity: 0,
      aggregationCount: 0,
      hasTimeRange: false,
      estimatedTimeRange: 0,
      duplicateSubexpressions: []
    };

    const subexpressionMap = new Map();

    this.walkAST(ast, (node) => {
      // Count aggregations
      if (node.type === NodeType.FUNCTION_CALL && ELASTICSEARCH_FUNCTIONS.has(node.name)) {
        metrics.aggregationCount++;
        metrics.complexity += 5;
      }

      // Check for time series functions
      if (node.type === NodeType.FUNCTION_CALL && COLUMN_FUNCTIONS.has(node.name)) {
        metrics.hasTimeRange = true;
        metrics.complexity += 10;
      }

      // Track subexpressions
      const hash = this.hashNode(node);
      if (subexpressionMap.has(hash)) {
        subexpressionMap.get(hash).count++;
      } else {
        subexpressionMap.set(hash, { node, count: 1 });
      }

      // Add complexity for operators
      if (node.type === NodeType.BINARY_OP) {
        metrics.complexity += 1;
      }
    });

    // Find duplicate subexpressions
    for (const [hash, info] of subexpressionMap) {
      if (info.count > 2 && this.getNodeComplexity(info.node) > 5) {
        metrics.duplicateSubexpressions.push({
          expression: this.nodeToString(info.node),
          count: info.count
        });
      }
    }

    return metrics;
  }

  // Utility methods
  walkAST(node, callback, parent = null) {
    callback(node, parent);

    switch (node.type) {
      case NodeType.FUNCTION_CALL:
        for (const arg of node.args) {
          this.walkAST(arg, callback, node);
        }
        for (const arg of Object.values(node.namedArgs)) {
          this.walkAST(arg, callback, node);
        }
        break;

      case NodeType.BINARY_OP:
        this.walkAST(node.left, callback, node);
        this.walkAST(node.right, callback, node);
        break;

      case NodeType.UNARY_OP:
        this.walkAST(node.operand, callback, node);
        break;
    }
  }

  getMaxDepth(node, currentDepth = 0) {
    if (!node) return currentDepth;

    let maxDepth = currentDepth;

    switch (node.type) {
      case NodeType.FUNCTION_CALL:
        // Function calls increase depth
        const funcDepth = currentDepth + 1;

        // Check all arguments
        for (const arg of node.args) {
          maxDepth = Math.max(maxDepth, this.getMaxDepth(arg, funcDepth));
        }

        // Check named arguments
        for (const arg of Object.values(node.namedArgs)) {
          maxDepth = Math.max(maxDepth, this.getMaxDepth(arg, funcDepth));
        }
        break;

      case NodeType.BINARY_OP:
        // Binary operators don't increase depth, but their operands might
        maxDepth = Math.max(
          maxDepth,
          this.getMaxDepth(node.left, currentDepth),
          this.getMaxDepth(node.right, currentDepth)
        );
        break;

      case NodeType.UNARY_OP:
        // Unary operators don't increase depth
        maxDepth = Math.max(maxDepth, this.getMaxDepth(node.operand, currentDepth));
        break;

      case NodeType.FIELD_REF:
      case NodeType.LITERAL:
        // Terminals don't add depth
        maxDepth = currentDepth;
        break;
    }

    return maxDepth;
  }

  countFunctionCalls(node) {
    let count = 0;
    this.walkAST(node, (n) => {
      if (n.type === NodeType.FUNCTION_CALL) {
        count++;
      }
    });
    return count;
  }

  getFormulaLength(node) {
    // Approximate formula length from AST
    return JSON.stringify(node).length;
  }

  calculateComplexity(node) {
    let complexity = 0;

    this.walkAST(node, (n) => {
      switch (n.type) {
        case NodeType.FUNCTION_CALL:
          complexity += 5;
          if (COLUMN_FUNCTIONS.has(n.name)) {
            complexity += 5; // Time series functions are more complex
          }
          break;
        case NodeType.BINARY_OP:
          complexity += 1;
          break;
        case NodeType.UNARY_OP:
          complexity += 1;
          break;
      }
    });

    return complexity;
  }

  getNodeComplexity(node) {
    let complexity = 0;
    this.walkAST(node, () => complexity++);
    return complexity;
  }

  hashNode(node) {
    // Simple hash for identifying duplicate subexpressions
    return JSON.stringify({
      type: node.type,
      operator: node.operator,
      name: node.name,
      field: node.field,
      value: node.value
    });
  }

  nodeToString(node) {
    // Convert AST node back to formula string
    switch (node.type) {
      case NodeType.LITERAL:
        return node.dataType === 'string' ? `'${node.value}'` : String(node.value);
      case NodeType.FIELD_REF:
        return node.field;
      case NodeType.FUNCTION_CALL:
        const args = node.args.map(a => this.nodeToString(a)).join(', ');
        return `${node.name}(${args})`;
      case NodeType.BINARY_OP:
        return `${this.nodeToString(node.left)} ${node.operator} ${this.nodeToString(node.right)}`;
      case NodeType.UNARY_OP:
        return `${node.operator}${this.nodeToString(node.operand)}`;
      default:
        return '';
    }
  }

  getSimilarFunctions(name) {
    const allFunctions = [
      ...ELASTICSEARCH_FUNCTIONS,
      ...MATH_FUNCTIONS,
      ...COMPARISON_FUNCTIONS,
      ...COLUMN_FUNCTIONS,
      ...CONTEXT_FUNCTIONS,
      ...this.customFunctions.keys()
    ];

    return this.findSimilar(name, allFunctions);
  }

  getSimilarFields(field, availableFields) {
    return this.findSimilar(field, Array.from(availableFields));
  }

  findSimilar(target, candidates, maxResults = 3) {
    // Simple Levenshtein distance
    const distances = candidates.map(candidate => ({
      candidate,
      distance: this.levenshteinDistance(target.toLowerCase(), candidate.toLowerCase())
    }));

    return distances
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxResults)
      .filter(d => d.distance < Math.max(3, target.length / 2))
      .map(d => d.candidate);
  }

  levenshteinDistance(a, b) {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
}
