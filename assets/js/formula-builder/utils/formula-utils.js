/**
 * Formula Utilities - Helper functions for formula manipulation
 */

import { parseFormula } from '../core/formula-parser.js';
import { ASTNodeTypes, FunctionMetadata } from '../core/formula-types.js';

export class FormulaUtils {
  /**
   * Extract all fields used in a formula
   * @param {string} formula - The formula string
   * @returns {string[]} Array of field names
   */
  static extractFields(formula) {
    const ast = parseFormula(formula);
    const fields = new Set();

    function traverse(node) {
      if (node.type === ASTNodeTypes.FIELD_REFERENCE) {
        fields.add(node.field);
      } else if (node.type === ASTNodeTypes.FUNCTION_CALL) {
        // Check for field in positional arguments
        node.arguments.forEach(arg => traverse(arg));

        // Check for fields in named arguments
        Object.values(node.namedArguments).forEach(arg => traverse(arg));
      } else if (node.type === ASTNodeTypes.BINARY_OPERATION) {
        traverse(node.left);
        traverse(node.right);
      }
    }

    traverse(ast);
    return Array.from(fields);
  }

  /**
   * Extract all functions used in a formula
   * @param {string} formula - The formula string
   * @returns {Object[]} Array of function usage info
   */
  static extractFunctions(formula) {
    const ast = parseFormula(formula);
    const functions = [];

    function traverse(node, path = '') {
      if (node.type === ASTNodeTypes.FUNCTION_CALL) {
        functions.push({
          name: node.name,
          path,
          arguments: node.arguments.length,
          namedArguments: Object.keys(node.namedArguments),
          metadata: FunctionMetadata[node.name] || null
        });

        // Traverse arguments
        node.arguments.forEach((arg, index) => {
          traverse(arg, `${path}/${node.name}[${index}]`);
        });

        Object.entries(node.namedArguments).forEach(([key, value]) => {
          traverse(value, `${path}/${node.name}.${key}`);
        });
      } else if (node.type === ASTNodeTypes.BINARY_OPERATION) {
        traverse(node.left, `${path}/left`);
        traverse(node.right, `${path}/right`);
      }
    }

    traverse(ast);
    return functions;
  }

  /**
   * Extract KQL filters from a formula
   * @param {string} formula - The formula string
   * @returns {string[]} Array of KQL filter strings
   */
  static extractKQLFilters(formula) {
    const ast = parseFormula(formula);
    const filters = [];

    function traverse(node) {
      if (node.type === ASTNodeTypes.FUNCTION_CALL) {
        // Check for KQL in named arguments
        if (node.namedArguments.kql) {
          const kqlNode = node.namedArguments.kql;
          if (kqlNode.type === ASTNodeTypes.LITERAL) {
            filters.push(kqlNode.value);
          }
        }

        // Traverse arguments
        node.arguments.forEach(arg => traverse(arg));
        Object.values(node.namedArguments).forEach(arg => traverse(arg));
      } else if (node.type === ASTNodeTypes.BINARY_OPERATION) {
        traverse(node.left);
        traverse(node.right);
      }
    }

    traverse(ast);
    return filters;
  }

  /**
   * Simplify a formula by evaluating constant expressions
   * @param {string} formula - The formula string
   * @returns {string} Simplified formula
   */
  static simplify(formula) {
    const ast = parseFormula(formula);

    function simplifyNode(node) {
      if (node.type === ASTNodeTypes.BINARY_OPERATION) {
        const left = simplifyNode(node.left);
        const right = simplifyNode(node.right);

        // If both sides are literals, evaluate
        if (left.type === ASTNodeTypes.LITERAL && right.type === ASTNodeTypes.LITERAL) {
          const result = evaluateOperation(left.value, node.operator, right.value);
          if (result !== null) {
            return {
              type: ASTNodeTypes.LITERAL,
              value: result,
              valueType: typeof result
            };
          }
        }

        return {
          ...node,
          left,
          right
        };
      }

      if (node.type === ASTNodeTypes.FUNCTION_CALL) {
        return {
          ...node,
          arguments: node.arguments.map(simplifyNode),
          namedArguments: Object.fromEntries(
            Object.entries(node.namedArguments).map(([key, value]) => [key, simplifyNode(value)])
          )
        };
      }

      return node;
    }

    function evaluateOperation(left, operator, right) {
      switch (operator) {
        case '+': return left + right;
        case '-': return left - right;
        case '*': return left * right;
        case '/': return right !== 0 ? left / right : null;
        case '>': return left > right;
        case '<': return left < right;
        case '>=': return left >= right;
        case '<=': return left <= right;
        case '==': return left === right;
        case '!=': return left !== right;
        default: return null;
      }
    }

    const simplified = simplifyNode(ast);
    return this.astToFormula(simplified);
  }

  /**
   * Convert AST back to formula string
   * @param {Object} ast - The AST
   * @returns {string} Formula string
   */
  static astToFormula(ast) {
    switch (ast.type) {
      case ASTNodeTypes.LITERAL:
        if (ast.valueType === 'string') {
          return `'${ast.value.replace(/'/g, "\\'")}'`;
        }
        return String(ast.value);

      case ASTNodeTypes.FIELD_REFERENCE:
        return ast.field;

      case ASTNodeTypes.FUNCTION_CALL:
        const args = [];

        // Add positional arguments
        args.push(...ast.arguments.map(arg => this.astToFormula(arg)));

        // Add named arguments
        Object.entries(ast.namedArguments).forEach(([key, value]) => {
          args.push(`${key}=${this.astToFormula(value)}`);
        });

        return `${ast.name}(${args.join(', ')})`;

      case ASTNodeTypes.BINARY_OPERATION:
        const left = this.astToFormula(ast.left);
        const right = this.astToFormula(ast.right);

        // Add parentheses for clarity in some cases
        const needsParens = ast.operator === '*' || ast.operator === '/';
        if (needsParens && ast.left.type === ASTNodeTypes.BINARY_OPERATION) {
          return `(${left}) ${ast.operator} ${right}`;
        }
        if (needsParens && ast.right.type === ASTNodeTypes.BINARY_OPERATION) {
          return `${left} ${ast.operator} (${right})`;
        }

        return `${left} ${ast.operator} ${right}`;

      default:
        throw new Error(`Unknown AST node type: ${ast.type}`);
    }
  }

  /**
   * Format a formula for better readability
   * @param {string} formula - The formula string
   * @param {Object} options - Formatting options
   * @returns {string} Formatted formula
   */
  static format(formula, options = {}) {
    const {
      indentSize = 2,
      maxLineLength = 80,
      breakOnComma = true,
      breakOnOperator = true
    } = options;

    const ast = parseFormula(formula);

    // For now, just return a basic formatted version
    // This could be enhanced with proper formatting logic
    return this.astToFormula(ast);
  }

  /**
   * Get formula complexity metrics
   * @param {string} formula - The formula string
   * @returns {Object} Complexity metrics
   */
  static getComplexity(formula) {
    const ast = parseFormula(formula);

    let depth = 0;
    let maxDepth = 0;
    let nodeCount = 0;
    let functionCount = 0;
    let operatorCount = 0;

    function traverse(node, currentDepth = 0) {
      nodeCount++;
      maxDepth = Math.max(maxDepth, currentDepth);

      switch (node.type) {
        case ASTNodeTypes.FUNCTION_CALL:
          functionCount++;
          node.arguments.forEach(arg => traverse(arg, currentDepth + 1));
          Object.values(node.namedArguments).forEach(arg => traverse(arg, currentDepth + 1));
          break;

        case ASTNodeTypes.BINARY_OPERATION:
          operatorCount++;
          traverse(node.left, currentDepth + 1);
          traverse(node.right, currentDepth + 1);
          break;
      }
    }

    traverse(ast);

    return {
      maxDepth,
      nodeCount,
      functionCount,
      operatorCount,
      fields: this.extractFields(formula).length,
      kqlFilters: this.extractKQLFilters(formula).length,
      complexity: Math.log2(nodeCount) * maxDepth // Simple complexity score
    };
  }

  /**
   * Replace field names in a formula
   * @param {string} formula - The formula string
   * @param {Object} fieldMap - Map of old field names to new field names
   * @returns {string} Formula with replaced field names
   */
  static replaceFields(formula, fieldMap) {
    const ast = parseFormula(formula);

    function replaceInNode(node) {
      if (node.type === ASTNodeTypes.FIELD_REFERENCE) {
        if (fieldMap[node.field]) {
          return {
            ...node,
            field: fieldMap[node.field]
          };
        }
      } else if (node.type === ASTNodeTypes.FUNCTION_CALL) {
        // Check if first argument is a field that should be replaced
        const newArgs = node.arguments.map((arg, index) => {
          if (index === 0 && arg.type === ASTNodeTypes.FIELD_REFERENCE && fieldMap[arg.field]) {
            return {
              ...arg,
              field: fieldMap[arg.field]
            };
          }
          return replaceInNode(arg);
        });

        return {
          ...node,
          arguments: newArgs,
          namedArguments: Object.fromEntries(
            Object.entries(node.namedArguments).map(([key, value]) => [key, replaceInNode(value)])
          )
        };
      } else if (node.type === ASTNodeTypes.BINARY_OPERATION) {
        return {
          ...node,
          left: replaceInNode(node.left),
          right: replaceInNode(node.right)
        };
      }

      return node;
    }

    const newAst = replaceInNode(ast);
    return this.astToFormula(newAst);
  }

  /**
   * Check if two formulas are equivalent
   * @param {string} formula1 - First formula
   * @param {string} formula2 - Second formula
   * @returns {boolean} True if formulas are equivalent
   */
  static areEquivalent(formula1, formula2) {
    try {
      const ast1 = parseFormula(formula1);
      const ast2 = parseFormula(formula2);

      return this.compareAST(ast1, ast2);
    } catch {
      return false;
    }
  }

  /**
   * Compare two AST nodes for equivalence
   */
  static compareAST(node1, node2) {
    if (node1.type !== node2.type) return false;

    switch (node1.type) {
      case ASTNodeTypes.LITERAL:
        return node1.value === node2.value && node1.valueType === node2.valueType;

      case ASTNodeTypes.FIELD_REFERENCE:
        return node1.field === node2.field;

      case ASTNodeTypes.FUNCTION_CALL:
        if (node1.name !== node2.name) return false;
        if (node1.arguments.length !== node2.arguments.length) return false;

        // Compare positional arguments
        for (let i = 0; i < node1.arguments.length; i++) {
          if (!this.compareAST(node1.arguments[i], node2.arguments[i])) return false;
        }

        // Compare named arguments
        const keys1 = Object.keys(node1.namedArguments).sort();
        const keys2 = Object.keys(node2.namedArguments).sort();
        if (keys1.join(',') !== keys2.join(',')) return false;

        for (const key of keys1) {
          if (!this.compareAST(node1.namedArguments[key], node2.namedArguments[key])) return false;
        }

        return true;

      case ASTNodeTypes.BINARY_OPERATION:
        return node1.operator === node2.operator &&
               this.compareAST(node1.left, node2.left) &&
               this.compareAST(node1.right, node2.right);

      default:
        return false;
    }
  }
}
