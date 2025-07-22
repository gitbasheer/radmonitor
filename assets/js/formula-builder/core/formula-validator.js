/**
 * Formula Validator - Validates formula syntax and semantics
 */

import { parseFormula } from './formula-parser.js';

export class FormulaValidator {
  constructor(options = {}) {
    this.options = {
      strictMode: false,
      allowUnknownFunctions: false,
      maxFormulaLength: 5000,
      maxNestingDepth: 10,
      ...options
    };

    this.errors = [];
    this.warnings = [];
  }

  /**
   * Validate a formula string
   * @param {string} formula - The formula to validate
   * @returns {Object} Validation result with errors and warnings
   */
  validate(formula) {
    this.errors = [];
    this.warnings = [];

    // Basic validation
    if (!this.validateBasicRequirements(formula)) {
      return this.getValidationResult();
    }

    // Parse and validate AST
    let ast;
    try {
      ast = parseFormula(formula);
    } catch (error) {
      this.addError('PARSE_ERROR', error.message);
      return this.getValidationResult();
    }

    // Validate AST structure
    this.validateAST(ast);

    // Semantic validation
    this.validateSemantics(ast);

    return this.getValidationResult();
  }

  /**
   * Basic formula validation
   */
  validateBasicRequirements(formula) {
    // Check if formula is provided
    if (!formula || typeof formula !== 'string') {
      this.addError('INVALID_INPUT', 'Formula must be a non-empty string');
      return false;
    }

    // Check formula length
    if (formula.length > this.options.maxFormulaLength) {
      this.addError('FORMULA_TOO_LONG',
        `Formula exceeds maximum length of ${this.options.maxFormulaLength} characters`);
      return false;
    }

    // Check balanced parentheses
    if (!this.hasBalancedParentheses(formula)) {
      this.addError('UNBALANCED_PARENTHESES', 'Parentheses are not balanced');
      return false;
    }

    // Check balanced quotes
    if (!this.hasBalancedQuotes(formula)) {
      this.addError('UNBALANCED_QUOTES', 'Quotes are not balanced');
      return false;
    }

    return true;
  }

  /**
   * Validate AST structure
   */
  validateAST(ast, depth = 0) {
    if (depth > this.options.maxNestingDepth) {
      this.addError('MAX_NESTING_EXCEEDED',
        `Formula exceeds maximum nesting depth of ${this.options.maxNestingDepth}`);
      return;
    }

    switch (ast.type) {
      case ASTNodeTypes.FUNCTION_CALL:
        this.validateFunctionCall(ast, depth);
        break;

      case ASTNodeTypes.BINARY_OPERATION:
        this.validateBinaryOperation(ast, depth);
        break;

      case ASTNodeTypes.LITERAL:
        this.validateLiteral(ast);
        break;

      case ASTNodeTypes.FIELD_REFERENCE:
        this.validateFieldReference(ast);
        break;

      default:
        this.addWarning('UNKNOWN_NODE_TYPE', `Unknown AST node type: ${ast.type}`);
    }
  }

  /**
   * Validate function calls
   */
  validateFunctionCall(node, depth) {
    const metadata = FunctionMetadata[node.name];

    // Check if function exists
    if (!metadata && !this.options.allowUnknownFunctions) {
      this.addError('UNKNOWN_FUNCTION', `Unknown function: ${node.name}`);
      return;
    }

    if (metadata) {
      // Validate parameters
      this.validateFunctionParameters(node, metadata);

      // Check deprecated functions
      if (metadata.deprecated) {
        this.addWarning('DEPRECATED_FUNCTION',
          `Function '${node.name}' is deprecated. ${metadata.deprecationMessage || ''}`);
      }
    }

    // Recursively validate arguments
    node.arguments.forEach(arg => this.validateAST(arg, depth + 1));
    Object.values(node.namedArguments).forEach(arg => this.validateAST(arg, depth + 1));
  }

  /**
   * Validate function parameters
   */
  validateFunctionParameters(node, metadata) {
    const { parameters = [] } = metadata;
    const requiredParams = parameters.filter(p => p.required);
    const positionalArgs = node.arguments;
    const namedArgs = node.namedArguments;

    // Check required parameters
    requiredParams.forEach((param, index) => {
      if (param.positional && !positionalArgs[index] && !namedArgs[param.name]) {
        this.addError('MISSING_REQUIRED_PARAMETER',
          `Function '${node.name}' requires parameter '${param.name}'`);
      }
    });

    // Check parameter types
    parameters.forEach((param, index) => {
      const value = param.positional ? positionalArgs[index] : namedArgs[param.name];
      if (value) {
        this.validateParameterType(value, param, node.name);
      }
    });

    // Check for unknown named parameters
    if (this.options.strictMode) {
      const validParamNames = parameters.map(p => p.name);
      Object.keys(namedArgs).forEach(name => {
        if (!validParamNames.includes(name)) {
          this.addWarning('UNKNOWN_PARAMETER',
            `Unknown parameter '${name}' for function '${node.name}'`);
        }
      });
    }
  }

  /**
   * Validate parameter types
   */
  validateParameterType(value, param, functionName) {
    const expectedType = param.type;
    const actualType = this.getNodeType(value);

    // Type compatibility check
    if (!this.isTypeCompatible(actualType, expectedType)) {
      this.addError('TYPE_MISMATCH',
        `Parameter '${param.name}' of function '${functionName}' expects ${expectedType} but got ${actualType}`);
    }
  }

  /**
   * Validate binary operations
   */
  validateBinaryOperation(node, depth) {
    // Validate operands
    this.validateAST(node.left, depth + 1);
    this.validateAST(node.right, depth + 1);

    // Check operator validity
    const validOperators = ['+', '-', '*', '/', '>', '<', '>=', '<=', '==', '!='];
    if (!validOperators.includes(node.operator)) {
      this.addError('INVALID_OPERATOR', `Invalid operator: ${node.operator}`);
    }

    // Type checking for operations
    if (this.options.strictMode) {
      this.validateOperationTypes(node);
    }
  }

  /**
   * Validate operation types
   */
  validateOperationTypes(node) {
    const leftType = this.getNodeType(node.left);
    const rightType = this.getNodeType(node.right);

    // Arithmetic operations require numbers
    if (['+', '-', '*', '/'].includes(node.operator)) {
      if (leftType !== 'number' || rightType !== 'number') {
        this.addWarning('TYPE_WARNING',
          `Arithmetic operation '${node.operator}' should be used with numbers`);
      }
    }
  }

  /**
   * Validate literals
   */
  validateLiteral(node) {
    if (node.valueType === 'number' && !isFinite(node.value)) {
      this.addError('INVALID_NUMBER', `Invalid number value: ${node.value}`);
    }
  }

  /**
   * Validate field references
   */
  validateFieldReference(node) {
    // Check field name format
    if (!/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(node.field)) {
      this.addWarning('INVALID_FIELD_NAME',
        `Field name '${node.field}' may not be valid`);
    }

    // Check for common mistakes
    if (node.field.includes('..')) {
      this.addError('INVALID_FIELD_PATH',
        `Invalid field path: ${node.field}`);
    }
  }

  /**
   * Semantic validation
   */
  validateSemantics(ast) {
    // Check for division by zero
    this.checkDivisionByZero(ast);

    // Check for logical errors
    this.checkLogicalErrors(ast);

    // Check for performance issues
    this.checkPerformanceIssues(ast);
  }

  /**
   * Check for division by zero
   */
  checkDivisionByZero(ast) {
    if (ast.type === ASTNodeTypes.BINARY_OPERATION && ast.operator === '/') {
      if (ast.right.type === ASTNodeTypes.LITERAL && ast.right.value === 0) {
        this.addError('DIVISION_BY_ZERO', 'Division by zero detected');
      }
    }

    // Recursive check
    if (ast.arguments) {
      ast.arguments.forEach(arg => this.checkDivisionByZero(arg));
    }
    if (ast.left) this.checkDivisionByZero(ast.left);
    if (ast.right) this.checkDivisionByZero(ast.right);
  }

  /**
   * Check for logical errors
   */
  checkLogicalErrors(ast) {
    // Check for always true/false conditions
    if (ast.type === ASTNodeTypes.FUNCTION_CALL && ast.name === 'ifelse') {
      const condition = ast.arguments[0];
      if (condition && condition.type === ASTNodeTypes.LITERAL) {
        if (condition.value === true || condition.value === false) {
          this.addWarning('CONSTANT_CONDITION',
            'Condition in ifelse is always ' + condition.value);
        }
      }
    }
  }

  /**
   * Check for performance issues
   */
  checkPerformanceIssues(ast) {
    // Count aggregations
    const aggCount = this.countAggregations(ast);
    if (aggCount > 10) {
      this.addWarning('TOO_MANY_AGGREGATIONS',
        `Formula contains ${aggCount} aggregations which may impact performance`);
    }
  }

  /**
   * Count aggregations in AST
   */
  countAggregations(ast) {
    let count = 0;

    if (ast.type === ASTNodeTypes.FUNCTION_CALL) {
      const metadata = FunctionMetadata[ast.name];
      if (metadata && metadata.category === 'elasticsearch') {
        count++;
      }
    }

    // Recursive count
    if (ast.arguments) {
      ast.arguments.forEach(arg => {
        count += this.countAggregations(arg);
      });
    }
    if (ast.left) count += this.countAggregations(ast.left);
    if (ast.right) count += this.countAggregations(ast.right);

    return count;
  }

  /**
   * Utility methods
   */
  hasBalancedParentheses(str) {
    let count = 0;
    for (const char of str) {
      if (char === '(') count++;
      if (char === ')') count--;
      if (count < 0) return false;
    }
    return count === 0;
  }

  hasBalancedQuotes(str) {
    const quotes = ['"', "'"];
    for (const quote of quotes) {
      let count = 0;
      let escaped = false;
      for (let i = 0; i < str.length; i++) {
        if (str[i] === '\\' && !escaped) {
          escaped = true;
          continue;
        }
        if (str[i] === quote && !escaped) {
          count++;
        }
        escaped = false;
      }
      if (count % 2 !== 0) return false;
    }
    return true;
  }

  getNodeType(node) {
    switch (node.type) {
      case ASTNodeTypes.LITERAL:
        return node.valueType;
      case ASTNodeTypes.FIELD_REFERENCE:
        return 'field';
      case ASTNodeTypes.FUNCTION_CALL:
        const metadata = FunctionMetadata[node.name];
        return metadata ? metadata.returns : 'unknown';
      case ASTNodeTypes.BINARY_OPERATION:
        return 'number'; // Most operations return numbers
      default:
        return 'unknown';
    }
  }

  isTypeCompatible(actual, expected) {
    if (actual === expected) return true;
    if (expected === 'any') return true;
    if (actual === 'unknown') return true; // Be permissive with unknown types

    // Field can be used as string
    if (actual === 'field' && expected === 'string') return true;

    return false;
  }

  addError(code, message) {
    this.errors.push({ code, message, severity: 'error' });
  }

  addWarning(code, message) {
    this.warnings.push({ code, message, severity: 'warning' });
  }

  getValidationResult() {
    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      totalIssues: this.errors.length + this.warnings.length
    };
  }
}

// Export singleton instance for convenience
export const formulaValidator = new FormulaValidator();

// Export validation function
export function validateFormula(formula, options) {
  const validator = new FormulaValidator(options);
  return validator.validate(formula);
}
