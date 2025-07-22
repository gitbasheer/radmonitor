/**
 * Formula Synthesizer - RAD Pattern Implementation
 * Based on GoDaddy's RAD synthesizer patterns for formula eligibility and scoring
 */

class FormulaSynthesizerError extends Error {
  constructor(message, context) {
    super(message);
    this.name = 'FormulaSynthesizerError';
    this.context = context;
    this.timestamp = new Date().toISOString();

    // Log to monitoring system (never fail silently)
    console.error('Formula Synthesizer Error:', {
      message,
      context,
      timestamp: this.timestamp,
      stack: this.stack
    });
  }
}

/**
 * Base Formula Synthesizer following RAD patterns
 */
export class FormulaSynthesizer {
  constructor(config = {}) {
    this.config = {
      performanceThreshold: 100, // ms
      enableMonitoring: true,
      enableExperiments: true,
      ...config
    };

    this.metrics = {
      eligibilityChecks: 0,
      successfulChecks: 0,
      errors: []
    };
  }

  /**
   * Main synthesizer function - determines formula eligibility
   * @param {Object} entities - Data sources (similar to RAD entities)
   * @param {Object} customData - Custom parameters for context
   * @returns {Object} Eligibility result with score
   */
  async evaluate(entities, customData = {}) {
    const startTime = performance.now();

    try {
      // Data validation (lesson from silent failures)
      const validation = this.validateEntities(entities);
      if (!validation.valid) {
        return {
          eligible: false,
          reason: validation.reason,
          errors: validation.errors
        };
      }

      // Check basic eligibility
      const eligibility = await this.checkEligibility(entities, customData);
      if (!eligibility.eligible) {
        return eligibility;
      }

      // Calculate relevance score
      const score = await this.calculateScore(entities, customData);

      // Track performance
      const duration = performance.now() - startTime;
      if (duration > this.config.performanceThreshold) {
        this.logPerformanceWarning(duration, entities);
      }

      return {
        eligible: true,
        score,
        duration,
        metadata: this.extractMetadata(entities, customData)
      };

    } catch (error) {
      this.handleError(error, { entities, customData });
      return {
        eligible: false,
        reason: 'synthesizer_error',
        error: error.message
      };
    }
  }

  /**
   * Validate entity data to prevent silent failures
   */
  validateEntities(entities) {
    const errors = [];

    // Check for required entities
    if (!entities || typeof entities !== 'object') {
      errors.push('Missing or invalid entities object');
    }

    // Check for data source
    if (!entities.dataSource) {
      errors.push('Missing required entity: dataSource');
    } else {
      // Validate data source fields
      if (!entities.dataSource.fields || !Array.isArray(entities.dataSource.fields)) {
        errors.push('Invalid dataSource.fields - must be an array');
      }
    }

    // Check for user context
    if (!entities.user) {
      errors.push('Missing required entity: user');
    }

    return {
      valid: errors.length === 0,
      reason: errors.join('; '),
      errors
    };
  }

  /**
   * Check formula eligibility based on entities
   */
  async checkEligibility(entities, customData) {
    // User level check
    if (customData.userLevel === 'beginner' && entities.dataSource.complexity > 5) {
      return {
        eligible: false,
        reason: 'complexity_too_high_for_user_level'
      };
    }

    // Field availability check
    const hasRequiredFields = this.checkRequiredFields(entities.dataSource.fields);
    if (!hasRequiredFields) {
      return {
        eligible: false,
        reason: 'missing_required_fields'
      };
    }

    // Custom eligibility rules
    if (customData.experimentGroup === 'limited_formulas') {
      const allowedFormulas = customData.allowedFormulas || [];
      if (!allowedFormulas.includes(this.formulaType)) {
        return {
          eligible: false,
          reason: 'formula_not_in_experiment_group'
        };
      }
    }

    return { eligible: true };
  }

  /**
   * Calculate relevance score for formula ranking
   */
  async calculateScore(entities, customData) {
    let score = 10; // Base score

    // User history bonus
    if (entities.user.previousFormulas?.length > 0) {
      score += this.calculateHistoryBonus(entities.user.previousFormulas);
    }

    // Data pattern matching
    score += this.calculateDataPatternScore(entities.dataSource);

    // Recency bonus
    if (entities.dataSource.lastUpdated) {
      const hoursSinceUpdate = (Date.now() - entities.dataSource.lastUpdated) / (1000 * 60 * 60);
      if (hoursSinceUpdate < 24) {
        score += 5; // Fresh data bonus
      }
    }

    // Experiment adjustments
    if (customData.experimentGroup === 'ai_boosted') {
      score *= 1.2; // 20% boost for AI experiment
    }

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Extract metadata for tracking and monitoring
   */
  extractMetadata(entities, customData) {
    return {
      dataSourceType: entities.dataSource?.type,
      fieldCount: entities.dataSource?.fields?.length || 0,
      userLevel: customData.userLevel,
      experimentGroup: customData.experimentGroup,
      timestamp: Date.now()
    };
  }

  /**
   * Handle errors with proper logging and monitoring
   */
  handleError(error, context) {
    this.metrics.errors.push({
      error: error.message,
      context,
      timestamp: Date.now()
    });

    // Log to monitoring system
    if (this.config.enableMonitoring) {
      console.error('Formula Synthesizer Error:', {
        error: error.message,
        stack: error.stack,
        context
      });
    }

    // Throw FormulaSynthesizerError for critical errors
    if (error.critical) {
      throw new FormulaSynthesizerError(error.message, context);
    }
  }

  /**
   * Log performance warnings
   */
  logPerformanceWarning(duration, entities) {
    console.warn('Formula Synthesizer Performance Warning:', {
      duration: `${duration}ms`,
      threshold: `${this.config.performanceThreshold}ms`,
      dataSourceSize: entities.dataSource?.fields?.length
    });
  }

  // Abstract methods to be implemented by specific synthesizers
  checkRequiredFields(fields) {
    throw new Error('checkRequiredFields must be implemented by subclass');
  }

  calculateHistoryBonus(previousFormulas) {
    throw new Error('calculateHistoryBonus must be implemented by subclass');
  }

  calculateDataPatternScore(dataSource) {
    throw new Error('calculateDataPatternScore must be implemented by subclass');
  }
}

/**
 * Specific synthesizer for SUM formulas
 */
export class SumFormulaSynthesizer extends FormulaSynthesizer {
  constructor(config) {
    super(config);
    this.formulaType = 'sum';
  }

  checkRequiredFields(fields) {
    // Sum formulas need at least one numeric field
    return fields.some(field => field.type === 'numeric' || field.type === 'number');
  }

  calculateHistoryBonus(previousFormulas) {
    // Higher bonus if user has used aggregation formulas before
    const aggregationFormulas = ['sum', 'average', 'count', 'max', 'min'];
    const usedAggregations = previousFormulas.filter(f => aggregationFormulas.includes(f));
    return usedAggregations.length * 2;
  }

  calculateDataPatternScore(dataSource) {
    let score = 0;

    // Multiple numeric fields increase relevance
    const numericFields = dataSource.fields.filter(f => f.type === 'numeric');
    score += Math.min(numericFields.length * 3, 15);

    // Category fields make sum more useful
    const categoryFields = dataSource.fields.filter(f => f.type === 'category' || f.type === 'string');
    if (categoryFields.length > 0 && numericFields.length > 0) {
      score += 10; // Sum by category is valuable
    }

    return score;
  }
}

/**
 * Synthesizer for FILTER formulas
 */
export class FilterFormulaSynthesizer extends FormulaSynthesizer {
  constructor(config) {
    super(config);
    this.formulaType = 'filter';
  }

  checkRequiredFields(fields) {
    // Filter formulas need at least one field
    return fields && fields.length > 0;
  }

  calculateHistoryBonus(previousFormulas) {
    // Bonus if user has used filters or conditions before
    const conditionalFormulas = ['filter', 'if', 'where', 'condition'];
    const usedConditionals = previousFormulas.filter(f => conditionalFormulas.includes(f));
    return usedConditionals.length * 3;
  }

  calculateDataPatternScore(dataSource) {
    let score = 0;

    // Large datasets benefit more from filtering
    if (dataSource.rowCount > 1000) {
      score += 15;
    } else if (dataSource.rowCount > 100) {
      score += 10;
    }

    // Multiple field types increase filter usefulness
    const uniqueTypes = new Set(dataSource.fields.map(f => f.type));
    score += uniqueTypes.size * 2;

    return score;
  }
}

/**
 * Synthesizer for TREND formulas
 */
export class TrendFormulaSynthesizer extends FormulaSynthesizer {
  constructor(config) {
    super(config);
    this.formulaType = 'trend';
  }

  checkRequiredFields(fields) {
    // Trend formulas need at least one date field and one numeric field
    const hasDate = fields.some(field => field.type === 'date' || field.type === 'datetime');
    const hasNumeric = fields.some(field => field.type === 'numeric' || field.type === 'number');
    return hasDate && hasNumeric;
  }

  calculateHistoryBonus(previousFormulas) {
    // Bonus if user has used analytical formulas before
    const analyticalFormulas = ['trend', 'slope', 'correlation', 'regression', 'moving_average'];
    const usedAnalytical = previousFormulas.filter(f => analyticalFormulas.includes(f));
    return usedAnalytical.length * 4;
  }

  calculateDataPatternScore(dataSource) {
    let score = 0;

    // Time series data is ideal for trends
    const dateFields = dataSource.fields.filter(f => f.type === 'date' || f.type === 'datetime');
    const numericFields = dataSource.fields.filter(f => f.type === 'numeric');

    if (dateFields.length > 0 && numericFields.length > 0) {
      score += 20; // Perfect for trends
    }

    // Large datasets show trends better
    if (dataSource.rowCount > 100) {
      score += 10;
    }

    // Multiple numeric fields allow comparison of trends
    score += Math.min(numericFields.length * 2, 10);

    return score;
  }
}

/**
 * Synthesizer for PERCENTAGE formulas
 */
export class PercentageFormulaSynthesizer extends FormulaSynthesizer {
  constructor(config) {
    super(config);
    this.formulaType = 'percentage';
  }

  checkRequiredFields(fields) {
    // Percentage formulas need at least one numeric field
    return fields.some(field => field.type === 'numeric' || field.type === 'number');
  }

  calculateHistoryBonus(previousFormulas) {
    // Bonus if user has used calculation formulas before
    const calculationFormulas = ['percentage', 'ratio', 'proportion', 'percent_change', 'growth'];
    const usedCalculations = previousFormulas.filter(f => calculationFormulas.includes(f));
    return usedCalculations.length * 3;
  }

  calculateDataPatternScore(dataSource) {
    let score = 0;

    // Multiple numeric fields make percentages useful
    const numericFields = dataSource.fields.filter(f => f.type === 'numeric');
    if (numericFields.length >= 2) {
      score += 15; // Can calculate percentages between fields
    } else if (numericFields.length === 1) {
      score += 8; // Can calculate percentage of total
    }

    // Category fields allow percentage breakdowns
    const categoryFields = dataSource.fields.filter(f => f.type === 'category' || f.type === 'string');
    if (categoryFields.length > 0 && numericFields.length > 0) {
      score += 12; // Percentage by category is valuable
    }

    return score;
  }
}

/**
 * Factory for creating synthesizers
 */
export class FormulaSynthesizerFactory {
  static synthesizers = new Map();

  static register(formulaType, SynthesizerClass) {
    this.synthesizers.set(formulaType, SynthesizerClass);
  }

  static create(formulaType, config) {
    const SynthesizerClass = this.synthesizers.get(formulaType);
    if (!SynthesizerClass) {
      throw new FormulaSynthesizerError(
        `Unknown formula type: ${formulaType}`,
        { availableTypes: Array.from(this.synthesizers.keys()) }
      );
    }
    return new SynthesizerClass(config);
  }

  static createAll(config) {
    const instances = {};
    for (const [type, SynthesizerClass] of this.synthesizers) {
      instances[type] = new SynthesizerClass(config);
    }
    return instances;
  }
}

// Register default synthesizers
FormulaSynthesizerFactory.register('sum', SumFormulaSynthesizer);
FormulaSynthesizerFactory.register('filter', FilterFormulaSynthesizer);
FormulaSynthesizerFactory.register('trend', TrendFormulaSynthesizer);
FormulaSynthesizerFactory.register('percentage', PercentageFormulaSynthesizer);

export default FormulaSynthesizerFactory;
