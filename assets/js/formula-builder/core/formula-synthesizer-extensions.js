/**
 * Formula Synthesizer Extensions
 * Additional synthesizers for advanced formula types
 */

import { FormulaSynthesizer, FormulaSynthesizerFactory } from './formula-synthesizer.js';

/**
 * Synthesizer for TREND formulas
 */
export class TrendFormulaSynthesizer extends FormulaSynthesizer {
  constructor(config) {
    super(config);
    this.formulaType = 'trend';
  }

  checkRequiredFields(fields) {
    // Trend formulas need date and numeric fields
    const hasDateField = fields.some(field =>
      field.type === 'date' || field.type === 'datetime' || field.type === 'timestamp'
    );
    const hasNumericField = fields.some(field =>
      field.type === 'numeric' || field.type === 'number'
    );

    return hasDateField && hasNumericField;
  }

  calculateHistoryBonus(previousFormulas) {
    // Bonus for users who have done time-series analysis
    const timeSeriesFormulas = ['trend', 'forecast', 'seasonal', 'timeseries'];
    const usedTimeSeries = previousFormulas.filter(f => timeSeriesFormulas.includes(f));

    // Also bonus for visualization experience
    const vizFormulas = ['chart', 'graph', 'plot'];
    const usedViz = previousFormulas.filter(f => vizFormulas.includes(f));

    return (usedTimeSeries.length * 3) + (usedViz.length * 2);
  }

  calculateDataPatternScore(dataSource) {
    let score = 0;

    // Time range is important for trends
    if (dataSource.timeRange) {
      const days = (dataSource.timeRange.end - dataSource.timeRange.start) / (1000 * 60 * 60 * 24);
      if (days >= 30) score += 10;  // Month or more of data
      else if (days >= 7) score += 7;  // Week of data
      else if (days >= 1) score += 3;  // At least a day
    }

    // Multiple numeric fields allow for comparing trends
    const numericFields = dataSource.fields.filter(f =>
      f.type === 'numeric' || f.type === 'number'
    );
    score += Math.min(numericFields.length * 2, 10);

    // Regular intervals are good for trends
    if (dataSource.metadata?.intervalRegular) {
      score += 5;
    }

    // Sufficient data points
    if (dataSource.rowCount > 100) {
      score += 5;
    }

    return score;
  }

  async checkEligibility(entities, customData) {
    const baseEligibility = await super.checkEligibility(entities, customData);
    if (!baseEligibility.eligible) {
      return baseEligibility;
    }

    // Additional trend-specific checks
    const dataSource = entities.dataSource;

    // Need enough data points for meaningful trends
    if (dataSource.rowCount < 10) {
      return {
        eligible: false,
        reason: 'insufficient_data_points_for_trend'
      };
    }

    // Check if data is too old for trends
    if (dataSource.lastUpdated) {
      const daysSinceUpdate = (Date.now() - dataSource.lastUpdated) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate > 365) {
        return {
          eligible: false,
          reason: 'data_too_old_for_trend_analysis'
        };
      }
    }

    return { eligible: true };
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
    return fields.some(field =>
      field.type === 'numeric' || field.type === 'number' || field.type === 'integer'
    );
  }

  calculateHistoryBonus(previousFormulas) {
    // Bonus for users familiar with ratios and calculations
    const calculationFormulas = ['percentage', 'ratio', 'proportion', 'rate', 'average'];
    const usedCalculations = previousFormulas.filter(f => calculationFormulas.includes(f));

    return usedCalculations.length * 2.5;
  }

  calculateDataPatternScore(dataSource) {
    let score = 0;

    // Multiple numeric fields enable percentage comparisons
    const numericFields = dataSource.fields.filter(f =>
      f.type === 'numeric' || f.type === 'number'
    );

    if (numericFields.length >= 2) {
      score += 15; // Can calculate percentages between fields
    } else if (numericFields.length === 1) {
      score += 8; // Can calculate percentage of total
    }

    // Category fields make percentage breakdowns useful
    const categoryFields = dataSource.fields.filter(f =>
      f.type === 'category' || f.type === 'string' || f.type === 'enum'
    );

    if (categoryFields.length > 0 && numericFields.length > 0) {
      score += 10; // Percentage by category is very useful
    }

    // Boolean fields can be converted to percentages
    const booleanFields = dataSource.fields.filter(f => f.type === 'boolean');
    if (booleanFields.length > 0) {
      score += 5;
    }

    return score;
  }

  async checkEligibility(entities, customData) {
    const baseEligibility = await super.checkEligibility(entities, customData);
    if (!baseEligibility.eligible) {
      return baseEligibility;
    }

    // Percentage formulas are generally applicable, no additional restrictions
    return { eligible: true };
  }
}

/**
 * Synthesizer for AVERAGE formulas
 */
export class AverageFormulaSynthesizer extends FormulaSynthesizer {
  constructor(config) {
    super(config);
    this.formulaType = 'average';
  }

  checkRequiredFields(fields) {
    return fields.some(field => field.type === 'numeric' || field.type === 'number');
  }

  calculateHistoryBonus(previousFormulas) {
    const aggregationFormulas = ['average', 'mean', 'median', 'sum', 'count'];
    const usedAggregations = previousFormulas.filter(f => aggregationFormulas.includes(f));
    return usedAggregations.length * 2;
  }

  calculateDataPatternScore(dataSource) {
    let score = 0;

    // Multiple numeric fields
    const numericFields = dataSource.fields.filter(f => f.type === 'numeric');
    score += Math.min(numericFields.length * 3, 12);

    // Categories make averages more meaningful
    const categoryFields = dataSource.fields.filter(f =>
      f.type === 'category' || f.type === 'string'
    );
    if (categoryFields.length > 0 && numericFields.length > 0) {
      score += 8;
    }

    // Good for larger datasets
    if (dataSource.rowCount > 100) {
      score += 5;
    }

    return score;
  }
}

/**
 * Synthesizer for COUNT formulas
 */
export class CountFormulaSynthesizer extends FormulaSynthesizer {
  constructor(config) {
    super(config);
    this.formulaType = 'count';
  }

  checkRequiredFields(fields) {
    // Count works with any fields
    return fields && fields.length > 0;
  }

  calculateHistoryBonus(previousFormulas) {
    // Count is often a starting point
    if (previousFormulas.length === 0) {
      return 5; // Bonus for beginners
    }

    const basicFormulas = ['count', 'sum', 'list'];
    const usedBasics = previousFormulas.filter(f => basicFormulas.includes(f));
    return usedBasics.length * 1.5;
  }

  calculateDataPatternScore(dataSource) {
    let score = 10; // Count is always relevant

    // Categories make counting more useful
    const categoryFields = dataSource.fields.filter(f =>
      f.type === 'category' || f.type === 'string' || f.type === 'enum'
    );
    score += categoryFields.length * 3;

    // Boolean fields are great for counting
    const booleanFields = dataSource.fields.filter(f => f.type === 'boolean');
    score += booleanFields.length * 4;

    return score;
  }
}

/**
 * Synthesizer for GROUPBY formulas
 */
export class GroupByFormulaSynthesizer extends FormulaSynthesizer {
  constructor(config) {
    super(config);
    this.formulaType = 'groupby';
  }

  checkRequiredFields(fields) {
    // Need at least one groupable field
    const groupableFields = fields.filter(f =>
      f.type === 'category' || f.type === 'string' ||
      f.type === 'enum' || f.type === 'boolean'
    );
    return groupableFields.length > 0;
  }

  calculateHistoryBonus(previousFormulas) {
    // Advanced feature, bonus for experienced users
    const advancedFormulas = ['groupby', 'pivot', 'aggregate', 'summarize'];
    const usedAdvanced = previousFormulas.filter(f => advancedFormulas.includes(f));

    // Also check for aggregation experience
    const aggregations = ['sum', 'average', 'count', 'max', 'min'];
    const usedAggregations = previousFormulas.filter(f => aggregations.includes(f));

    return (usedAdvanced.length * 4) + (usedAggregations.length * 1);
  }

  calculateDataPatternScore(dataSource) {
    let score = 0;

    // Category fields for grouping
    const categoryFields = dataSource.fields.filter(f =>
      f.type === 'category' || f.type === 'string' || f.type === 'enum'
    );
    score += Math.min(categoryFields.length * 5, 15);

    // Numeric fields for aggregation
    const numericFields = dataSource.fields.filter(f => f.type === 'numeric');
    score += Math.min(numericFields.length * 3, 9);

    // Ideal scenario: multiple categories and numerics
    if (categoryFields.length >= 2 && numericFields.length >= 1) {
      score += 10;
    }

    return score;
  }

  async checkEligibility(entities, customData) {
    const baseEligibility = await super.checkEligibility(entities, customData);
    if (!baseEligibility.eligible) {
      return baseEligibility;
    }

    // GroupBy is more advanced, check user level
    if (customData.userLevel === 'beginner') {
      // Still allow but with lower score
      return { eligible: true, scoreModifier: 0.5 };
    }

    return { eligible: true };
  }
}

// Register all new synthesizers
FormulaSynthesizerFactory.register('trend', TrendFormulaSynthesizer);
FormulaSynthesizerFactory.register('percentage', PercentageFormulaSynthesizer);
FormulaSynthesizerFactory.register('average', AverageFormulaSynthesizer);
FormulaSynthesizerFactory.register('count', CountFormulaSynthesizer);
FormulaSynthesizerFactory.register('groupby', GroupByFormulaSynthesizer);

// Export individual classes
export {
  TrendFormulaSynthesizer,
  PercentageFormulaSynthesizer,
  AverageFormulaSynthesizer,
  CountFormulaSynthesizer,
  GroupByFormulaSynthesizer
};
