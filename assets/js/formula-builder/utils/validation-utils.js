/**
 * Validation Utilities
 */

export class ValidationUtils {
  /**
   * Validate field name format
   */
  static isValidFieldName(name) {
    return /^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(name);
  }

  /**
   * Validate function name
   */
  static isValidFunctionName(name) {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
  }

  /**
   * Validate KQL syntax (basic check)
   */
  static isValidKQL(kql) {
    // Basic validation - check for balanced quotes and parentheses
    let singleQuotes = 0;
    let doubleQuotes = 0;
    let parens = 0;
    let escaped = false;

    for (const char of kql) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === "'") singleQuotes++;
      if (char === '"') doubleQuotes++;
      if (char === '(') parens++;
      if (char === ')') parens--;

      if (parens < 0) return false;
    }

    return singleQuotes % 2 === 0 &&
           doubleQuotes % 2 === 0 &&
           parens === 0;
  }

  /**
   * Sanitize user input
   */
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;

    // Remove potentially dangerous characters
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '');
  }

  /**
   * Validate time range format
   */
  static isValidTimeRange(range) {
    // Check for relative time ranges
    if (/^now(-\d+[smhdwMy])?$/.test(range)) return true;

    // Check for ISO date format
    if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/.test(range)) return true;

    return false;
  }
}
