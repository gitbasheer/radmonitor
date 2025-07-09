/**
 * MCP Formula Builder Core - RAD Pattern Implementation
 *
 * This module exports all core components following GoDaddy's RAD patterns:
 * - Entity management for data consistency
 * - Synthesizers for eligibility and scoring
 * - RAD cards for UI components
 * - Event tracking for monitoring
 * - Experiment management for A/B testing
 */

// Entity Management
export {
  FormulaEntity,
  DataSourceEntity,
  UserEntity,
  FormulaContextEntity,
  EntitlementsEntity,
  FormulaEntityManager,
  formulaEntityManager
} from './formula-entities.js';

// Synthesizer Pattern
export {
  FormulaSynthesizer,
  SumFormulaSynthesizer,
  FilterFormulaSynthesizer,
  FormulaSynthesizerFactory,
  default as formulaSynthesizerFactory
} from './formula-synthesizer.js';

// RAD Cards
export {
  FormulaRADCard,
  FormulaRADCardManager,
  FORMULA_RAD_CARDS,
  formulaRADCardManager
} from './formula-rad-cards.js';

// Event Tracking
export {
  FormulaEventTracker,
  FormulaEventMonitor,
  formulaEventTracker,
  formulaEventMonitor
} from './formula-event-tracker.js';

// Experiment Management
export {
  FormulaExperimentManager,
  FORMULA_EXPERIMENTS,
  formulaExperimentManager
} from './formula-experiment-manager.js';

/**
 * Quick setup function for common use cases
 */
export function setupFormulaBuilder(config = {}) {
  const {
    entities = {},
    experiments = [],
    monitoring = true,
    debug = false
  } = config;

  // Setup entities
  if (entities.dataSource) {
    formulaEntityManager.addEntity('dataSource', entities.dataSource);
  }
  if (entities.user) {
    formulaEntityManager.addEntity('user', entities.user);
  }
  if (entities.context) {
    formulaEntityManager.addEntity('context', entities.context);
  }

  // Register additional experiments
  experiments.forEach(exp => {
    formulaExperimentManager.registerExperiment(exp);
  });

  // Setup monitoring
  if (monitoring) {
    formulaEventMonitor.startMonitoring();
  }

  // Debug mode
  if (debug) {
    formulaEventTracker.config.debug = true;
    console.log('Formula Builder initialized with:', {
      entities: formulaEntityManager.getAllEntities(),
      experiments: formulaExperimentManager.getActiveExperiments(),
      monitoring: monitoring
    });
  }

  return {
    entityManager: formulaEntityManager,
    radCardManager: formulaRADCardManager,
    experimentManager: formulaExperimentManager,
    eventTracker: formulaEventTracker,
    eventMonitor: formulaEventMonitor
  };
}

/**
 * Get formula suggestions for current context
 */
export async function getFormulaSuggestions(userId, config = {}) {
  const entities = formulaEntityManager.createEntityCollection();

  // Apply experiments
  let finalConfig = { ...config };
  finalConfig = formulaExperimentManager.applyExperimentVariations(
    'formula_ai_ranking',
    userId,
    entities,
    finalConfig
  );

  // Update card manager config
  formulaRADCardManager.config = {
    ...formulaRADCardManager.config,
    ...finalConfig
  };

  // Get eligible cards
  const eligibleCards = await formulaRADCardManager.getEligibleCards(
    entities,
    finalConfig
  );

  // Render and return
  return formulaRADCardManager.renderCards(eligibleCards, {
    userId,
    experiment: finalConfig._experiment
  });
}

/**
 * Handle formula action
 */
export function handleFormulaAction(cardId, actionType, context = {}) {
  return formulaRADCardManager.handleCardAction(cardId, actionType, context);
}

/**
 * Get current health status
 */
export function getHealthStatus() {
  const metrics = formulaEventTracker.getMetrics();
  const alerts = formulaEventMonitor.getAlerts();

  return {
    metrics,
    alerts,
    healthy: alerts.filter(a => a.severity === 'critical').length === 0,
    timestamp: Date.now()
  };
}

// Default export
export default {
  setup: setupFormulaBuilder,
  getSuggestions: getFormulaSuggestions,
  handleAction: handleFormulaAction,
  getHealth: getHealthStatus,

  // Core managers
  entities: formulaEntityManager,
  cards: formulaRADCardManager,
  experiments: formulaExperimentManager,
  tracking: formulaEventTracker,
  monitoring: formulaEventMonitor
};
