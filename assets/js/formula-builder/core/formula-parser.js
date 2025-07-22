/**
 * Formula Parser - Converts formula strings into Abstract Syntax Trees (AST)
 */

import { ASTNodeTypes, Operators } from './formula-types.js';

export class FormulaParser {
  constructor() {
    this.pos = 0;
    this.input = '';
  }

  /**
   * Parse a formula string into an AST
   * @param {string} formula - The formula to parse
   * @returns {Object} The AST representation
   */
  parse(formula) {
    this.input = formula;
    this.pos = 0;

    try {
      const ast = this.parseExpression();
      this.skipWhitespace();

      if (this.pos < this.input.length) {
        throw new Error(`Unexpected character at position ${this.pos}: ${this.input[this.pos]}`);
      }

      return ast;
    } catch (error) {
      throw new Error(`Parse error: ${error.message}`);
    }
  }

  parseExpression() {
    return this.parseComparison();
  }

  parseComparison() {
    let left = this.parseAdditive();

    while (true) {
      this.skipWhitespace();

      const op = this.tryParseComparisonOperator();
      if (!op) break;

      const right = this.parseAdditive();
      left = {
        type: ASTNodeTypes.BINARY_OPERATION,
        operator: op,
        left,
        right
      };
    }

    return left;
  }

  parseAdditive() {
    let left = this.parseMultiplicative();

    while (true) {
      this.skipWhitespace();

      if (this.match('+')) {
        const right = this.parseMultiplicative();
        left = {
          type: ASTNodeTypes.BINARY_OPERATION,
          operator: Operators.PLUS,
          left,
          right
        };
      } else if (this.match('-')) {
        const right = this.parseMultiplicative();
        left = {
          type: ASTNodeTypes.BINARY_OPERATION,
          operator: Operators.MINUS,
          left,
          right
        };
      } else {
        break;
      }
    }

    return left;
  }

  parseMultiplicative() {
    let left = this.parsePrimary();

    while (true) {
      this.skipWhitespace();

      if (this.match('*')) {
        const right = this.parsePrimary();
        left = {
          type: ASTNodeTypes.BINARY_OPERATION,
          operator: Operators.MULTIPLY,
          left,
          right
        };
      } else if (this.match('/')) {
        const right = this.parsePrimary();
        left = {
          type: ASTNodeTypes.BINARY_OPERATION,
          operator: Operators.DIVIDE,
          left,
          right
        };
      } else {
        break;
      }
    }

    return left;
  }

  parsePrimary() {
    this.skipWhitespace();

    // Check for function call
    if (this.isIdentifierStart()) {
      const name = this.parseIdentifier();

      if (this.match('(')) {
        return this.parseFunctionCall(name);
      } else {
        // Field reference
        return {
          type: ASTNodeTypes.FIELD_REFERENCE,
          field: name
        };
      }
    }

    // Check for number
    if (this.isDigit(this.current()) || this.current() === '.') {
      return this.parseNumber();
    }

    // Check for string
    if (this.current() === '"' || this.current() === "'") {
      return this.parseString();
    }

    // Check for parentheses
    if (this.match('(')) {
      const expr = this.parseExpression();
      this.expect(')');
      return expr;
    }

    throw new Error(`Unexpected token at position ${this.pos}: ${this.current()}`);
  }

  parseFunctionCall(name) {
    const args = [];
    const namedArgs = {};

    this.skipWhitespace();

    while (!this.match(')')) {
      if (args.length > 0 || Object.keys(namedArgs).length > 0) {
        this.expect(',');
        this.skipWhitespace();
      }

      // Check for named argument
      if (this.isIdentifierStart() && this.peekAhead() === '=') {
        const paramName = this.parseIdentifier();
        this.expect('=');
        const value = this.parseExpression();
        namedArgs[paramName] = value;
      } else {
        // Positional argument
        args.push(this.parseExpression());
      }

      this.skipWhitespace();
    }

    return {
      type: ASTNodeTypes.FUNCTION_CALL,
      name,
      arguments: args,
      namedArguments: namedArgs
    };
  }

  parseNumber() {
    let num = '';

    while (this.isDigit(this.current()) || this.current() === '.') {
      num += this.current();
      this.pos++;
    }

    return {
      type: ASTNodeTypes.LITERAL,
      value: parseFloat(num),
      valueType: 'number'
    };
  }

  parseString() {
    const quote = this.current();
    this.pos++; // Skip opening quote

    let str = '';
    while (this.current() !== quote && this.pos < this.input.length) {
      if (this.current() === '\\') {
        this.pos++; // Skip backslash
        str += this.current();
      } else {
        str += this.current();
      }
      this.pos++;
    }

    this.expect(quote); // Closing quote

    return {
      type: ASTNodeTypes.LITERAL,
      value: str,
      valueType: 'string'
    };
  }

  parseIdentifier() {
    let id = '';

    while (this.isIdentifierChar(this.current())) {
      id += this.current();
      this.pos++;
    }

    // Handle field paths with dots
    while (this.current() === '.' && this.isIdentifierStart(this.peek())) {
      id += '.';
      this.pos++;

      while (this.isIdentifierChar(this.current())) {
        id += this.current();
        this.pos++;
      }
    }

    return id;
  }

  tryParseComparisonOperator() {
    const twoCharOps = ['==', '!=', '>=', '<='];
    const oneCharOps = ['>', '<'];

    // Try two-character operators first
    for (const op of twoCharOps) {
      if (this.matchSequence(op)) {
        return op;
      }
    }

    // Try one-character operators
    for (const op of oneCharOps) {
      if (this.match(op)) {
        return op;
      }
    }

    return null;
  }

  // Helper methods
  skipWhitespace() {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
      this.pos++;
    }
  }

  current() {
    return this.input[this.pos] || '';
  }

  peek() {
    return this.input[this.pos + 1] || '';
  }

  peekAhead() {
    // Look ahead for = after identifier
    let tempPos = this.pos;
    while (tempPos < this.input.length && this.isIdentifierChar(this.input[tempPos])) {
      tempPos++;
    }
    while (tempPos < this.input.length && /\s/.test(this.input[tempPos])) {
      tempPos++;
    }
    return this.input[tempPos] || '';
  }

  match(char) {
    if (this.current() === char) {
      this.pos++;
      return true;
    }
    return false;
  }

  matchSequence(seq) {
    if (this.input.substr(this.pos, seq.length) === seq) {
      this.pos += seq.length;
      return true;
    }
    return false;
  }

  expect(char) {
    if (!this.match(char)) {
      throw new Error(`Expected '${char}' at position ${this.pos}, found '${this.current()}'`);
    }
  }

  isDigit(char) {
    return /[0-9]/.test(char);
  }

  isIdentifierStart(char = this.current()) {
    return /[a-zA-Z_]/.test(char);
  }

  isIdentifierChar(char) {
    return /[a-zA-Z0-9_]/.test(char);
  }
}

// Export singleton instance
export const formulaParser = new FormulaParser();

// Export helper function
export function parseFormula(formula) {
  return formulaParser.parse(formula);
}
