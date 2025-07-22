/**
 * Formula Entities - RAD-style Entity Interfaces
 * Provides consistent data source interfaces similar to RAD entities
 * Prevents silent failures through validation and error handling
 */

/**
 * Base Entity class following RAD patterns
 */
export class FormulaEntity {
  constructor(type, data = {}) {
    this.type = type;
    this.data = data;
    this.timestamp = Date.now();
    this.errors = [];
  }

  /**
   * Validate entity data
   */
  validate() {
    throw new Error('validate() must be implemented by subclass');
  }

  /**
   * Get field by path (supports nested access like RAD)
   */
  getField(path) {
    const parts = path.split('.');
    let value = this.data;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Check if field exists
   */
  hasField(path) {
    return this.getField(path) !== undefined;
  }

  /**
   * Get all field paths
   */
  getFieldPaths(obj = this.data, prefix = '') {
    const paths = [];

    for (const key in obj) {
      const fullPath = prefix ? `${prefix}.${key}` : key;

      if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        paths.push(...this.getFieldPaths(obj[key], fullPath));
      } else {
        paths.push(fullPath);
      }
    }

    return paths;
  }

  /**
   * Add validation error
   */
  addError(field, message) {
    this.errors.push({ field, message, timestamp: Date.now() });
  }

  /**
   * Check if entity is valid
   */
  isValid() {
    this.errors = [];
    this.validate();
    return this.errors.length === 0;
  }
}

/**
 * Data Source Entity - Similar to RAD's projects/wsbvnext entities
 */
export class DataSourceEntity extends FormulaEntity {
  constructor(data) {
    super('dataSource', data);
  }

  validate() {
    // Required fields
    if (!this.data.id) {
      this.addError('id', 'Data source ID is required');
    }

    if (!this.data.type) {
      this.addError('type', 'Data source type is required');
    }

    if (!this.data.fields || !Array.isArray(this.data.fields)) {
      this.addError('fields', 'Fields array is required');
    } else {
      // Validate each field
      this.data.fields.forEach((field, index) => {
        if (!field.name) {
          this.addError(`fields[${index}].name`, 'Field name is required');
        }
        if (!field.type) {
          this.addError(`fields[${index}].type`, 'Field type is required');
        }
      });
    }

    // Optional but recommended fields
    if (this.data.rowCount && typeof this.data.rowCount !== 'number') {
      this.addError('rowCount', 'Row count must be a number');
    }
  }

  /**
   * Get fields by type
   */
  getFieldsByType(type) {
    if (!this.data.fields) return [];
    return this.data.fields.filter(field => field.type === type);
  }

  /**
   * Check if has fields of specific type
   */
  hasFieldType(type) {
    return this.getFieldsByType(type).length > 0;
  }

  /**
   * Get field metadata
   */
  getFieldMetadata(fieldName) {
    if (!this.data.fields) return null;
    return this.data.fields.find(field => field.name === fieldName);
  }

  /**
   * Calculate complexity score (for synthesizer use)
   */
  getComplexity() {
    let complexity = 0;

    // Factor in number of fields
    complexity += (this.data.fields?.length || 0) * 0.5;

    // Factor in data size
    if (this.data.rowCount > 10000) complexity += 3;
    else if (this.data.rowCount > 1000) complexity += 2;
    else if (this.data.rowCount > 100) complexity += 1;

    // Factor in field types diversity
    const uniqueTypes = new Set(this.data.fields?.map(f => f.type) || []);
    complexity += uniqueTypes.size;

    return Math.min(complexity, 10); // Cap at 10
  }
}

/**
 * User Entity - Similar to RAD's user/shopper entities
 */
export class UserEntity extends FormulaEntity {
  constructor(data) {
    super('user', data);
  }

  validate() {
    if (!this.data.id) {
      this.addError('id', 'User ID is required');
    }

    if (this.data.level && !['beginner', 'intermediate', 'advanced'].includes(this.data.level)) {
      this.addError('level', 'Invalid user level');
    }

    if (this.data.previousFormulas && !Array.isArray(this.data.previousFormulas)) {
      this.addError('previousFormulas', 'Previous formulas must be an array');
    }
  }

  /**
   * Get user experience level
   */
  getExperienceLevel() {
    // Default to beginner if not specified
    if (!this.data.level) {
      // Infer from history
      const formulaCount = this.data.previousFormulas?.length || 0;
      if (formulaCount > 20) return 'advanced';
      if (formulaCount > 5) return 'intermediate';
      return 'beginner';
    }
    return this.data.level;
  }

  /**
   * Check if user has used specific formula type
   */
  hasUsedFormula(formulaType) {
    return this.data.previousFormulas?.includes(formulaType) || false;
  }

  /**
   * Get formula usage stats
   */
  getFormulaStats() {
    const stats = {};

    if (this.data.previousFormulas) {
      for (const formula of this.data.previousFormulas) {
        stats[formula] = (stats[formula] || 0) + 1;
      }
    }

    return stats;
  }
}

/**
 * Formula Context Entity - Similar to RAD's customData
 */
export class FormulaContextEntity extends FormulaEntity {
  constructor(data) {
    super('context', data);
  }

  validate() {
    // Context is flexible, minimal validation
    if (this.data.experimentGroup && typeof this.data.experimentGroup !== 'string') {
      this.addError('experimentGroup', 'Experiment group must be a string');
    }

    if (this.data.allowedFormulas && !Array.isArray(this.data.allowedFormulas)) {
      this.addError('allowedFormulas', 'Allowed formulas must be an array');
    }
  }

  /**
   * Check if in experiment
   */
  isInExperiment(experimentName) {
    return this.data.experimentGroup === experimentName;
  }

  /**
   * Check if formula allowed
   */
  isFormulaAllowed(formulaType) {
    if (!this.data.allowedFormulas) return true;
    return this.data.allowedFormulas.includes(formulaType);
  }
}

/**
 * Entitlements Entity - Similar to RAD's entitlements
 */
export class EntitlementsEntity extends FormulaEntity {
  constructor(data) {
    super('entitlements', data);
  }

  validate() {
    // Validate structure matches RAD pattern
    if (this.data.current && typeof this.data.current !== 'object') {
      this.addError('current', 'Current entitlements must be an object');
    }

    if (this.data.used && typeof this.data.used !== 'object') {
      this.addError('used', 'Used entitlements must be an object');
    }
  }

  /**
   * Check if has entitlement
   */
  hasEntitlement(feature) {
    return this.data.current?.[feature] === true;
  }

  /**
   * Get usage for feature
   */
  getUsage(feature) {
    return this.data.used?.[feature] || 0;
  }

  /**
   * Check if within limits
   */
  isWithinLimits(feature, limit) {
    const usage = this.getUsage(feature);
    return usage < limit;
  }
}

/**
 * Entity Manager - Manages all entities like RAD
 */
export class FormulaEntityManager {
  constructor() {
    this.entities = new Map();
    this.validators = new Map();

    // Register default validators
    this.registerValidator('dataSource', DataSourceEntity);
    this.registerValidator('user', UserEntity);
    this.registerValidator('context', FormulaContextEntity);
    this.registerValidator('entitlements', EntitlementsEntity);
  }

  /**
   * Register entity validator
   */
  registerValidator(type, ValidatorClass) {
    this.validators.set(type, ValidatorClass);
  }

  /**
   * Add entity
   */
  addEntity(type, data) {
    const ValidatorClass = this.validators.get(type) || FormulaEntity;
    const entity = new ValidatorClass(data);

    if (!entity.isValid()) {
      console.error(`Invalid ${type} entity:`, entity.errors);
      return false;
    }

    this.entities.set(type, entity);
    return true;
  }

  /**
   * Get entity
   */
  getEntity(type) {
    return this.entities.get(type);
  }

  /**
   * Get all entities
   */
  getAllEntities() {
    const result = {};
    for (const [type, entity] of this.entities) {
      result[type] = entity;
    }
    return result;
  }

  /**
   * Clear all entities
   */
  clear() {
    this.entities.clear();
  }

  /**
   * Validate all entities
   */
  validateAll() {
    const errors = {};

    for (const [type, entity] of this.entities) {
      if (!entity.isValid()) {
        errors[type] = entity.errors;
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Create entity collection for synthesizer evaluation
   */
  createEntityCollection() {
    const collection = {};

    for (const [type, entity] of this.entities) {
      collection[type] = entity.data;
    }

    return collection;
  }
}

// Export singleton instance
export const formulaEntityManager = new FormulaEntityManager();

export default formulaEntityManager;
