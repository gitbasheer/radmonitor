/**
 * Formula RAD Cards - Following GoDaddy's RAD Card Patterns
 * Implements formula suggestions as RAD-like cards with eligibility, scoring, and tracking
 */

import FormulaSynthesizerFactory from './formula-synthesizer.js';
import { FormulaEventTracker } from './formula-event-tracker.js';

/**
 * Formula RAD Card Schema
 */
export class FormulaRADCard {
  constructor(config) {
    this.definitionId = config.definitionId;
    this.type = config.type || 'formula-suggestion';
    this.schema = {
      title: config.title,
      description: config.description,
      icon: config.icon || 'calculator',
      cta: {
        primary: config.primaryCTA || 'Apply Formula',
        secondary: config.secondaryCTA || 'Learn More'
      },
      metadata: config.metadata || {}
    };

    // Create synthesizer for this formula type
    this.synthesizer = FormulaSynthesizerFactory.create(
      config.formulaType,
      config.synthesizerConfig
    );

    // Initialize event tracker
    this.eventTracker = new FormulaEventTracker({
      radId: this.definitionId,
      radset: 'formula-builder'
    });
  }

  /**
   * Evaluate if this RAD card should be shown
   */
  async evaluate(entities, customData = {}) {
    try {
      const result = await this.synthesizer.evaluate(entities, customData);

      // Track evaluation
      this.eventTracker.trackEvent('evaluation', {
        eligible: result.eligible,
        score: result.score,
        reason: result.reason
      });

      return result;
    } catch (error) {
      console.error(`RAD Card evaluation error for ${this.definitionId}:`, error);
      return { eligible: false, reason: 'evaluation_error' };
    }
  }

  /**
   * Render the RAD card
   */
  render(context = {}) {
    const card = {
      id: this.definitionId,
      type: this.type,
      ...this.schema,
      context
    };

    // Track impression
    this.eventTracker.trackImpression(context.index);

    return card;
  }

  /**
   * Handle primary CTA click
   */
  handlePrimaryClick(context = {}) {
    this.eventTracker.trackClick('primary', context);

    // Return formula application data
    return {
      formulaType: this.synthesizer.formulaType,
      definitionId: this.definitionId,
      context
    };
  }

  /**
   * Handle secondary CTA click
   */
  handleSecondaryClick(context = {}) {
    this.eventTracker.trackClick('secondary', context);

    // Return help/documentation reference
    return {
      helpTopic: this.synthesizer.formulaType,
      definitionId: this.definitionId,
      context
    };
  }
}

/**
 * Formula RAD Card Definitions
 */
export const FORMULA_RAD_CARDS = {
  // SUM Formula Card
  'MCP-Formula-Sum': {
    definitionId: 'MCP-Formula-Sum',
    formulaType: 'sum',
    title: 'Sum Values',
    description: 'Calculate total values from your numeric data',
    icon: 'sum',
    primaryCTA: 'Create Sum Formula',
    secondaryCTA: 'View Example',
    metadata: {
      category: 'aggregation',
      difficulty: 'beginner',
      estimatedTime: '1 min'
    },
    synthesizerConfig: {
      performanceThreshold: 50
    }
  },

  // SUM BY CATEGORY Formula Card
  'MCP-Formula-SumByCategory': {
    definitionId: 'MCP-Formula-SumByCategory',
    formulaType: 'sum',
    title: 'Sum by Category',
    description: 'Calculate totals grouped by categories in your data',
    icon: 'sum-category',
    primaryCTA: 'Apply Formula',
    secondaryCTA: 'Learn More',
    metadata: {
      category: 'aggregation',
      difficulty: 'intermediate',
      estimatedTime: '2 min',
      requirements: ['numeric_field', 'category_field']
    }
  },

  // FILTER Formula Card
  'MCP-Formula-Filter': {
    definitionId: 'MCP-Formula-Filter',
    formulaType: 'filter',
    title: 'Filter Data',
    description: 'Show only data that meets specific conditions',
    icon: 'filter',
    primaryCTA: 'Create Filter',
    secondaryCTA: 'See Examples',
    metadata: {
      category: 'transformation',
      difficulty: 'beginner',
      estimatedTime: '1 min'
    }
  },

  // TREND Formula Card
  'MCP-Formula-Trend': {
    definitionId: 'MCP-Formula-Trend',
    formulaType: 'trend',
    title: 'Analyze Trends',
    description: 'Identify patterns and trends in your time-series data',
    icon: 'trending-up',
    primaryCTA: 'Show Trends',
    secondaryCTA: 'Learn More',
    metadata: {
      category: 'analysis',
      difficulty: 'intermediate',
      estimatedTime: '3 min',
      requirements: ['date_field', 'numeric_field']
    }
  },

  // PERCENTAGE Formula Card
  'MCP-Formula-Percentage': {
    definitionId: 'MCP-Formula-Percentage',
    formulaType: 'percentage',
    title: 'Calculate Percentages',
    description: 'Convert values to percentages of total or compare ratios',
    icon: 'percent',
    primaryCTA: 'Add Percentage',
    secondaryCTA: 'View Guide',
    metadata: {
      category: 'calculation',
      difficulty: 'beginner',
      estimatedTime: '1 min'
    }
  }
};

/**
 * Formula RAD Card Manager
 */
export class FormulaRADCardManager {
  constructor(config = {}) {
    this.config = {
      maxCards: 5,
      enableExperiments: true,
      enableRanking: true,
      ...config
    };

    this.cards = new Map();
    this.eventTracker = new FormulaEventTracker({
      radset: 'formula-builder'
    });

    // Initialize cards
    this.initializeCards();
  }

  /**
   * Initialize all formula RAD cards
   */
  initializeCards() {
    for (const [id, config] of Object.entries(FORMULA_RAD_CARDS)) {
      this.cards.set(id, new FormulaRADCard(config));
    }
  }

  /**
   * Get eligible formula cards for current context
   */
  async getEligibleCards(entities, customData = {}) {
    const startTime = performance.now();
    const eligibleCards = [];

    try {
      // Evaluate all cards in parallel (lesson from RAD performance)
      const evaluations = await Promise.all(
        Array.from(this.cards.entries()).map(async ([id, card]) => {
          const result = await card.evaluate(entities, customData);
          return { id, card, result };
        })
      );

      // Filter eligible cards
      for (const { id, card, result } of evaluations) {
        if (result.eligible) {
          eligibleCards.push({
            id,
            card,
            score: result.score,
            metadata: result.metadata
          });
        }
      }

      // Rank cards if enabled
      if (this.config.enableRanking) {
        eligibleCards.sort((a, b) => b.score - a.score);
      }

      // Apply max cards limit
      const finalCards = eligibleCards.slice(0, this.config.maxCards);

      // Track performance
      const duration = performance.now() - startTime;
      this.eventTracker.trackEvent('card_evaluation_complete', {
        totalCards: this.cards.size,
        eligibleCards: eligibleCards.length,
        returnedCards: finalCards.length,
        duration
      });

      return finalCards;

    } catch (error) {
      console.error('Error getting eligible cards:', error);
      this.eventTracker.trackEvent('card_evaluation_error', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Render eligible cards with proper tracking
   */
  renderCards(eligibleCards, context = {}) {
    return eligibleCards.map((item, index) => {
      const cardContext = {
        ...context,
        index,
        score: item.score,
        metadata: item.metadata
      };

      return item.card.render(cardContext);
    });
  }

  /**
   * Handle card interaction
   */
  handleCardAction(cardId, actionType, context = {}) {
    const card = this.cards.get(cardId);
    if (!card) {
      console.error(`Card not found: ${cardId}`);
      return null;
    }

    if (actionType === 'primary') {
      return card.handlePrimaryClick(context);
    } else if (actionType === 'secondary') {
      return card.handleSecondaryClick(context);
    }

    return null;
  }

  /**
   * Get card by ID
   */
  getCard(cardId) {
    return this.cards.get(cardId);
  }

  /**
   * Register custom formula card
   */
  registerCard(config) {
    const card = new FormulaRADCard(config);
    this.cards.set(config.definitionId, card);
    return card;
  }
}

// Export singleton instance
export const formulaRADCardManager = new FormulaRADCardManager();

export default formulaRADCardManager;
