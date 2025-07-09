/**
 * Enhanced AST Parser for Formula Builder
 * Features:
 * - Operator precedence handling
 * - Unary operators support
 * - Better error recovery
 * - Performance optimizations with caching
 * - Security-focused design
 */

// Token types
const TokenType = {
  // Literals
  NUMBER: 'NUMBER',
  STRING: 'STRING',
  FIELD: 'FIELD',
  BOOLEAN: 'BOOLEAN',

  // Identifiers
  FUNCTION: 'FUNCTION',
  IDENTIFIER: 'IDENTIFIER',

  // Operators
  PLUS: 'PLUS',
  MINUS: 'MINUS',
  MULTIPLY: 'MULTIPLY',
  DIVIDE: 'DIVIDE',
  MODULO: 'MODULO',
  POWER: 'POWER',

  // Comparison
  EQUALS: 'EQUALS',
  NOT_EQUALS: 'NOT_EQUALS',
  GREATER: 'GREATER',
  LESS: 'LESS',
  GREATER_EQUALS: 'GREATER_EQUALS',
  LESS_EQUALS: 'LESS_EQUALS',

  // Logical
  AND: 'AND',
  OR: 'OR',
  NOT: 'NOT',

  // Delimiters
  LPAREN: 'LPAREN',
  RPAREN: 'RPAREN',
  COMMA: 'COMMA',
  COLON: 'COLON',

  // Special
  EOF: 'EOF',
  SHIFT: 'SHIFT',
  KQL: 'KQL'
};

// Operator precedence (higher number = higher precedence)
const PRECEDENCE = {
  [TokenType.OR]: 1,
  [TokenType.AND]: 2,
  [TokenType.EQUALS]: 3,
  [TokenType.NOT_EQUALS]: 3,
  [TokenType.GREATER]: 4,
  [TokenType.LESS]: 4,
  [TokenType.GREATER_EQUALS]: 4,
  [TokenType.LESS_EQUALS]: 4,
  [TokenType.PLUS]: 5,
  [TokenType.MINUS]: 5,
  [TokenType.MULTIPLY]: 6,
  [TokenType.DIVIDE]: 6,
  [TokenType.MODULO]: 6,
  [TokenType.POWER]: 7,
  [TokenType.NOT]: 8,
  UNARY: 9
};

// AST Node Types
const NodeType = {
  FUNCTION_CALL: 'FunctionCall',
  BINARY_OP: 'BinaryOp',
  UNARY_OP: 'UnaryOp',
  FIELD_REF: 'FieldRef',
  LITERAL: 'Literal',
  IDENTIFIER: 'Identifier'
};

class Token {
  constructor(type, value, position, length) {
    this.type = type;
    this.value = value;
    this.position = position;
    this.length = length;
  }
}

class ASTNode {
  constructor(type, position, length) {
    this.type = type;
    this.position = position;
    this.length = length;
  }
}

class FunctionCallNode extends ASTNode {
  constructor(name, args, namedArgs, position, length) {
    super(NodeType.FUNCTION_CALL, position, length);
    this.name = name;
    this.args = args;
    this.namedArgs = namedArgs;
  }
}

class BinaryOpNode extends ASTNode {
  constructor(operator, left, right, position, length) {
    super(NodeType.BINARY_OP, position, length);
    this.operator = operator;
    this.left = left;
    this.right = right;
  }
}

class UnaryOpNode extends ASTNode {
  constructor(operator, operand, position, length) {
    super(NodeType.UNARY_OP, position, length);
    this.operator = operator;
    this.operand = operand;
  }
}

class FieldRefNode extends ASTNode {
  constructor(field, position, length) {
    super(NodeType.FIELD_REF, position, length);
    this.field = field;
  }
}

class LiteralNode extends ASTNode {
  constructor(value, dataType, position, length) {
    super(NodeType.LITERAL, position, length);
    this.value = value;
    this.dataType = dataType;
  }
}

/**
 * Enhanced tokenizer with better string handling and operator recognition
 */
class Tokenizer {
  constructor(input) {
    this.input = input;
    this.position = 0;
    this.tokens = [];
  }

  tokenize() {
    while (this.position < this.input.length) {
      this.skipWhitespace();

      if (this.position >= this.input.length) {
        break;
      }

      const token = this.readNextToken();
      if (token) {
        this.tokens.push(token);
      }
    }

    this.tokens.push(new Token(TokenType.EOF, null, this.position, 0));
    return this.tokens;
  }

  skipWhitespace() {
    while (this.position < this.input.length && /\s/.test(this.input[this.position])) {
      this.position++;
    }
  }

  readNextToken() {
    const start = this.position;
    const char = this.input[this.position];

    // Numbers
    if (/\d/.test(char) || (char === '.' && /\d/.test(this.input[this.position + 1]))) {
      return this.readNumber();
    }

    // Strings
    if (char === '"' || char === "'") {
      return this.readString();
    }

    // Identifiers and keywords
    if (/[a-zA-Z_]/.test(char)) {
      return this.readIdentifier();
    }

    // Operators and delimiters
    switch (char) {
      case '+': this.position++; return new Token(TokenType.PLUS, '+', start, 1);
      case '-': this.position++; return new Token(TokenType.MINUS, '-', start, 1);
      case '*': this.position++; return new Token(TokenType.MULTIPLY, '*', start, 1);
      case '/': this.position++; return new Token(TokenType.DIVIDE, '/', start, 1);
      case '%': this.position++; return new Token(TokenType.MODULO, '%', start, 1);
      case '^': this.position++; return new Token(TokenType.POWER, '^', start, 1);
      case '(': this.position++; return new Token(TokenType.LPAREN, '(', start, 1);
      case ')': this.position++; return new Token(TokenType.RPAREN, ')', start, 1);
      case ',': this.position++; return new Token(TokenType.COMMA, ',', start, 1);
      case ':': this.position++; return new Token(TokenType.COLON, ':', start, 1);

      case '=':
        this.position++;
        if (this.input[this.position] === '=') {
          this.position++;
          return new Token(TokenType.EQUALS, '==', start, 2);
        }
        return new Token(TokenType.EQUALS, '=', start, 1);

      case '!':
        this.position++;
        if (this.input[this.position] === '=') {
          this.position++;
          return new Token(TokenType.NOT_EQUALS, '!=', start, 2);
        }
        return new Token(TokenType.NOT, '!', start, 1);

      case '>':
        this.position++;
        if (this.input[this.position] === '=') {
          this.position++;
          return new Token(TokenType.GREATER_EQUALS, '>=', start, 2);
        }
        return new Token(TokenType.GREATER, '>', start, 1);

      case '<':
        this.position++;
        if (this.input[this.position] === '=') {
          this.position++;
          return new Token(TokenType.LESS_EQUALS, '<=', start, 2);
        }
        return new Token(TokenType.LESS, '<', start, 1);

      default:
        throw new Error(`Unexpected character '${char}' at position ${this.position}`);
    }
  }

  readNumber() {
    const start = this.position;
    let hasDecimal = false;

    while (this.position < this.input.length) {
      const char = this.input[this.position];
      if (/\d/.test(char)) {
        this.position++;
      } else if (char === '.' && !hasDecimal) {
        hasDecimal = true;
        this.position++;
      } else {
        break;
      }
    }

    const value = this.input.substring(start, this.position);
    return new Token(TokenType.NUMBER, parseFloat(value), start, this.position - start);
  }

  readString() {
    const start = this.position;
    const quote = this.input[this.position];
    this.position++; // Skip opening quote

    let value = '';
    let escaped = false;

    while (this.position < this.input.length) {
      const char = this.input[this.position];

      if (escaped) {
        // Handle escape sequences
        switch (char) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case 'r': value += '\r'; break;
          case '\\': value += '\\'; break;
          case quote: value += quote; break;
          default: value += char;
        }
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        this.position++; // Skip closing quote
        return new Token(TokenType.STRING, value, start, this.position - start);
      } else {
        value += char;
      }

      this.position++;
    }

    throw new Error(`Unterminated string starting at position ${start}`);
  }

  readIdentifier() {
    const start = this.position;

    while (this.position < this.input.length && /[a-zA-Z0-9_.]/.test(this.input[this.position])) {
      this.position++;
    }

    const value = this.input.substring(start, this.position);

    // Check for keywords
    const lowerValue = value.toLowerCase();
    switch (lowerValue) {
      case 'and': return new Token(TokenType.AND, 'AND', start, this.position - start);
      case 'or': return new Token(TokenType.OR, 'OR', start, this.position - start);
      case 'not': return new Token(TokenType.NOT, 'NOT', start, this.position - start);
      case 'true': return new Token(TokenType.BOOLEAN, true, start, this.position - start);
      case 'false': return new Token(TokenType.BOOLEAN, false, start, this.position - start);
      case 'shift': return new Token(TokenType.SHIFT, 'shift', start, this.position - start);
      case 'kql': return new Token(TokenType.KQL, 'kql', start, this.position - start);
      default:
        // Check if it's a function (followed by parenthesis)
        this.skipWhitespace();
        if (this.position < this.input.length && this.input[this.position] === '(') {
          return new Token(TokenType.FUNCTION, value, start, this.position - start);
        }
        // Otherwise it's a field reference
        return new Token(TokenType.FIELD, value, start, this.position - start);
    }
  }
}

/**
 * Enhanced parser with operator precedence and better error handling
 */
export class EnhancedFormulaParser {
  constructor() {
    this.tokens = [];
    this.position = 0;
    this.errors = [];
    this.cache = new Map();
    this.maxCacheSize = 1000;
  }

  parse(formula) {
    // Check cache
    const cached = this.cache.get(formula);
    if (cached) {
      return cached;
    }

    try {
      // Reset state
      this.errors = [];
      this.position = 0;

      // Tokenize
      const tokenizer = new Tokenizer(formula);
      this.tokens = tokenizer.tokenize();

      // Parse
      const ast = this.parseExpression();

      // Ensure we've consumed all tokens
      if (!this.isAtEnd()) {
        const unexpectedToken = this.currentToken();
        throw new Error(`Unexpected token '${unexpectedToken.value}' at position ${unexpectedToken.position}`);
      }

      // Cache result
      this.addToCache(formula, ast);

      return {
        success: true,
        ast,
        errors: this.errors
      };
    } catch (error) {
      return {
        success: false,
        ast: null,
        errors: [...this.errors, {
          message: error.message,
          position: this.currentToken()?.position || 0
        }]
      };
    }
  }

  parseExpression(minPrecedence = 0) {
    let left = this.parsePrimary();

    while (!this.isAtEnd()) {
      const token = this.currentToken();

      // Check if it's a binary operator
      const precedence = this.getBinaryPrecedence(token.type);
      if (precedence === null || precedence < minPrecedence) {
        break;
      }

      this.advance(); // Consume operator

      // Parse right side with higher precedence for left-associative operators
      const right = this.parseExpression(precedence + 1);

      left = new BinaryOpNode(
        token.value,
        left,
        right,
        left.position,
        right.position + right.length - left.position
      );
    }

    return left;
  }

  parsePrimary() {
    const token = this.currentToken();

    // Unary operators
    if (token.type === TokenType.MINUS || token.type === TokenType.NOT) {
      this.advance();
      const operand = this.parseExpression(PRECEDENCE.UNARY);
      return new UnaryOpNode(
        token.value,
        operand,
        token.position,
        operand.position + operand.length - token.position
      );
    }

    // Parenthesized expression
    if (token.type === TokenType.LPAREN) {
      this.advance(); // Consume '('
      const expr = this.parseExpression();
      this.consume(TokenType.RPAREN, "Expected ')' after expression");
      return expr;
    }

    // Function call
    if (token.type === TokenType.FUNCTION) {
      return this.parseFunctionCall();
    }

    // Field reference
    if (token.type === TokenType.FIELD) {
      this.advance();
      return new FieldRefNode(token.value, token.position, token.length);
    }

    // Literals
    if (token.type === TokenType.NUMBER) {
      this.advance();
      return new LiteralNode(token.value, 'number', token.position, token.length);
    }

    if (token.type === TokenType.STRING) {
      this.advance();
      return new LiteralNode(token.value, 'string', token.position, token.length);
    }

    if (token.type === TokenType.BOOLEAN) {
      this.advance();
      return new LiteralNode(token.value, 'boolean', token.position, token.length);
    }

    throw new Error(`Unexpected token '${token.value}' at position ${token.position}`);
  }

  parseFunctionCall() {
    const nameToken = this.currentToken();
    const functionName = nameToken.value;
    const startPos = nameToken.position;

    this.advance(); // Consume function name
    this.consume(TokenType.LPAREN, `Expected '(' after function name '${functionName}'`);

    const args = [];
    const namedArgs = {};

    // Parse arguments
    while (!this.check(TokenType.RPAREN) && !this.isAtEnd()) {
      // Check for named argument - allow KQL and SHIFT as argument names
      const currentType = this.currentToken().type;
      const isNamedArg = (currentType === TokenType.FIELD ||
                         currentType === TokenType.KQL ||
                         currentType === TokenType.SHIFT) &&
                        (this.checkNext(TokenType.EQUALS) || this.checkNext(TokenType.COLON));

      if (isNamedArg) {
        const argNameToken = this.currentToken();
        const argName = argNameToken.value.toLowerCase(); // normalize to lowercase
        this.advance(); // Consume argument name
        this.advance(); // Consume '=' or ':'
        const argValue = this.parseExpression();
        namedArgs[argName] = argValue;
      } else {
        // Positional argument
        args.push(this.parseExpression());
      }

      if (!this.check(TokenType.RPAREN)) {
        this.consume(TokenType.COMMA, "Expected ',' between arguments");
      }
    }

    const endToken = this.consume(TokenType.RPAREN, "Expected ')' after arguments");

    return new FunctionCallNode(
      functionName,
      args,
      namedArgs,
      startPos,
      endToken.position + endToken.length - startPos
    );
  }

  // Helper methods
  currentToken() {
    return this.tokens[this.position];
  }

  previousToken() {
    return this.tokens[this.position - 1];
  }

  isAtEnd() {
    return this.currentToken().type === TokenType.EOF;
  }

  advance() {
    if (!this.isAtEnd()) {
      this.position++;
    }
    return this.previousToken();
  }

  check(type) {
    if (this.isAtEnd()) return false;
    return this.currentToken().type === type;
  }

  checkNext(type) {
    if (this.position + 1 >= this.tokens.length) return false;
    return this.tokens[this.position + 1].type === type;
  }

  consume(type, message) {
    if (this.check(type)) {
      return this.advance();
    }

    const token = this.currentToken();
    throw new Error(`${message} at position ${token.position}`);
  }

  getBinaryPrecedence(tokenType) {
    return PRECEDENCE[tokenType] || null;
  }

  addToCache(formula, ast) {
    // Implement LRU cache
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(formula, ast);
  }
}

// Export for use in other modules
export { TokenType, NodeType, ASTNode, FunctionCallNode, BinaryOpNode, UnaryOpNode, FieldRefNode, LiteralNode };
