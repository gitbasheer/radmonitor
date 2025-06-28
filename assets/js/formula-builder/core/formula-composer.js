/**
 * Formula Composer - Build formulas programmatically
 */

import { FunctionTypes, Operators } from './formula-types.js';
import { validateFormula } from './formula-validator.js';

export class FormulaComposer {
  constructor() {
    this.reset();
  }

  /**
   * Reset the composer
   */
  reset() {
    this.parts = [];
    this.openParentheses = 0;
    return this;
  }

  /**
   * Start a new formula
   */
  formula() {
    this.reset();
    return this;
  }

  /**
   * Add a function call
   * @param {string} functionName - Name of the function
   * @param {...any} args - Function arguments
   */
  func(functionName, ...args) {
    this.parts.push(functionName);
    this.parts.push('(');
    this.openParentheses++;

    if (args.length > 0) {
      args.forEach((arg, index) => {
        if (index > 0) this.parts.push(', ');

        if (typeof arg === 'object' && arg !== null && arg._isComposer) {
          // Nested composer
          this.parts.push(arg.toString());
        } else if (typeof arg === 'object' && arg !== null) {
          // Named argument
          const [key, value] = Object.entries(arg)[0];
          this.parts.push(`${key}=`);
          this.addValue(value);
        } else {
          this.addValue(arg);
        }
      });
    }

    this.parts.push(')');
    this.openParentheses--;
    return this;
  }

  /**
   * Add a field reference
   * @param {string} fieldName - Name of the field
   */
  field(fieldName) {
    this.parts.push(fieldName);
    return this;
  }

  /**
   * Add a literal value
   * @param {any} value - The value to add
   */
  value(value) {
    this.addValue(value);
    return this;
  }

  /**
   * Add a string literal
   * @param {string} str - The string value
   */
  string(str) {
    this.parts.push(`'${str.replace(/'/g, "\\'")}'`);
    return this;
  }

  /**
   * Add a number literal
   * @param {number} num - The number value
   */
  number(num) {
    this.parts.push(num.toString());
    return this;
  }

  /**
   * Add an operator
   * @param {string} operator - The operator
   */
  op(operator) {
    this.parts.push(` ${operator} `);
    return this;
  }

  /**
   * Arithmetic operators
   */
  plus() { return this.op(Operators.PLUS); }
  minus() { return this.op(Operators.MINUS); }
  multiply() { return this.op(Operators.MULTIPLY); }
  divide() { return this.op(Operators.DIVIDE); }

  /**
   * Comparison operators
   */
  gt() { return this.op(Operators.GREATER_THAN); }
  gte() { return this.op(Operators.GREATER_THAN_EQUALS); }
  lt() { return this.op(Operators.LESS_THAN); }
  lte() { return this.op(Operators.LESS_THAN_EQUALS); }
  eq() { return this.op(Operators.EQUALS); }
  neq() { return this.op(Operators.NOT_EQUALS); }

  /**
   * Grouping
   */
  group(callback) {
    this.parts.push('(');
    this.openParentheses++;

    if (typeof callback === 'function') {
      callback(this);
    }

    this.parts.push(')');
    this.openParentheses--;
    return this;
  }

  /**
   * Common function shortcuts
   */
  count(field, kql) {
    const args = [];
    if (field) args.push(field);
    if (kql) args.push({ kql });
    return this.func(FunctionTypes.COUNT, ...args);
  }

  average(field, kql) {
    const args = [field];
    if (kql) args.push({ kql });
    return this.func(FunctionTypes.AVERAGE, ...args);
  }

  sum(field, kql) {
    const args = [field];
    if (kql) args.push({ kql });
    return this.func(FunctionTypes.SUM, ...args);
  }

  max(field, kql) {
    const args = [field];
    if (kql) args.push({ kql });
    return this.func(FunctionTypes.MAX, ...args);
  }

  min(field, kql) {
    const args = [field];
    if (kql) args.push({ kql });
    return this.func(FunctionTypes.MIN, ...args);
  }

  ifelse(condition, trueValue, falseValue) {
    return this.func(FunctionTypes.IFELSE, condition, trueValue, falseValue);
  }

  round(value, decimals) {
    const args = [value];
    if (decimals !== undefined) args.push(decimals);
    return this.func(FunctionTypes.ROUND, ...args);
  }

  /**
   * Build complex formulas with chaining
   */
  chain() {
    return new ChainableComposer(this);
  }

  /**
   * Helper to add values
   */
  addValue(value) {
    if (typeof value === 'string') {
      // Check if it's a field name or needs quoting
      if (this.isFieldName(value)) {
        this.parts.push(value);
      } else {
        this.parts.push(`'${value.replace(/'/g, "\\'")}'`);
      }
    } else if (typeof value === 'number') {
      this.parts.push(value.toString());
    } else if (typeof value === 'boolean') {
      this.parts.push(value.toString());
    } else if (value && value._isComposer) {
      this.parts.push(value.toString());
    } else {
      this.parts.push(String(value));
    }
  }

  /**
   * Check if a string is a valid field name
   */
  isFieldName(str) {
    return /^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(str);
  }

  /**
   * Convert to string
   */
  toString() {
    return this.parts.join('');
  }

  /**
   * Build and validate the formula
   */
  build() {
    const formula = this.toString();
    const validation = validateFormula(formula);

    if (!validation.valid) {
      throw new Error(`Invalid formula: ${validation.errors[0].message}`);
    }

    return formula;
  }

  /**
   * Build without validation
   */
  buildRaw() {
    return this.toString();
  }

  /**
   * Mark this as a composer instance
   */
  get _isComposer() {
    return true;
  }
}

/**
 * Chainable composer for more fluent API
 */
class ChainableComposer {
  constructor(composer) {
    this.composer = composer;
    this.current = null;
  }

  count(field, kql) {
    this.current = new FormulaComposer().count(field, kql);
    return this;
  }

  average(field, kql) {
    this.current = new FormulaComposer().average(field, kql);
    return this;
  }

  sum(field, kql) {
    this.current = new FormulaComposer().sum(field, kql);
    return this;
  }

  dividedBy(value) {
    if (!this.current) throw new Error('No current value to divide');
    this.composer.parts.push(this.current.toString());
    this.composer.divide();

    if (typeof value === 'function') {
      const subComposer = new ChainableComposer(new FormulaComposer());
      value(subComposer);
      this.composer.parts.push(subComposer.build());
    } else {
      this.composer.addValue(value);
    }

    return this.composer;
  }

  multipliedBy(value) {
    if (!this.current) throw new Error('No current value to multiply');
    this.composer.parts.push(this.current.toString());
    this.composer.multiply();

    if (typeof value === 'function') {
      const subComposer = new ChainableComposer(new FormulaComposer());
      value(subComposer);
      this.composer.parts.push(subComposer.build());
    } else {
      this.composer.addValue(value);
    }

    return this.composer;
  }

  plus(value) {
    if (!this.current) throw new Error('No current value to add to');
    this.composer.parts.push(this.current.toString());
    this.composer.plus();

    if (typeof value === 'function') {
      const subComposer = new ChainableComposer(new FormulaComposer());
      value(subComposer);
      this.composer.parts.push(subComposer.build());
    } else {
      this.composer.addValue(value);
    }

    return this.composer;
  }

  build() {
    if (this.current) {
      return this.current.toString();
    }
    return this.composer.build();
  }
}

/**
 * Factory functions for common patterns
 */
export const FormulaPatterns = {
  /**
   * Create an error rate formula
   */
  errorRate(errorCondition = 'status >= 400') {
    return new FormulaComposer()
      .count(null, errorCondition)
      .divide()
      .count()
      .build();
  },

  /**
   * Create a percentage formula
   */
  percentage(numerator, denominator) {
    return new FormulaComposer()
      .group(() => {
        if (typeof numerator === 'function') {
          numerator(new FormulaComposer());
        }
      })
      .divide()
      .group(() => {
        if (typeof denominator === 'function') {
          denominator(new FormulaComposer());
        }
      })
      .multiply()
      .number(100)
      .build();
  },

  /**
   * Create a week-over-week comparison
   */
  weekOverWeek(metric, field) {
    const composer = new FormulaComposer();

    if (metric === 'average') {
      composer.average(field);
    } else if (metric === 'sum') {
      composer.sum(field);
    } else {
      composer.func(metric, field);
    }

    composer.divide();

    if (metric === 'average') {
      composer.average(field, null, { shift: '1w' });
    } else if (metric === 'sum') {
      composer.sum(field, null, { shift: '1w' });
    } else {
      composer.func(metric, field, { shift: '1w' });
    }

    return composer.build();
  },

  /**
   * Create a moving average formula
   */
  smoothed(metric, field, window = 5) {
    return new FormulaComposer()
      .func('moving_average',
        new FormulaComposer().func(metric, field),
        { window }
      )
      .build();
  }
};

// Export convenience function
export function compose() {
  return new FormulaComposer();
}
