/**
 * Formula Experiment Manager - RAD-style A/B Testing
 * Implements experiment patterns from GoDaddy's Hivemind/RAD system
 * Supports treatment variations, cohort assignment, and tracking
 */

import { FormulaEventTracker } from './formula-event-tracker.js';

/**
 * Formula Experiment Manager
 */
export class FormulaExperimentManager {
  constructor(config = {}) {
    this.config = {
      enableExperiments: true,
      defaultCohortSplit: 0.5,
      cookieName: 'formula_experiments',
      cookieExpiry: 30, // days
      ...config
    };

    this.experiments = new Map();
    this.assignments = new Map();
    this.eventTracker = new FormulaEventTracker({
      radset: 'formula-experiments'
    });

    // Load existing assignments
    this.loadAssignments();
  }

  /**
   * Register an experiment
   */
  registerExperiment(experiment) {
    const config = {
      id: experiment.id,
      name: experiment.name,
      status: experiment.status || 'active',
      startDate: experiment.startDate || Date.now(),
      endDate: experiment.endDate,
      cohorts: experiment.cohorts || {
        control: { weight: 0.5, config: {} },
        treatment: { weight: 0.5, config: {} }
      },
      targetingRules: experiment.targetingRules || {},
      triggerEvent: experiment.triggerEvent,
      ...experiment
    };

    // Validate cohort weights
    const totalWeight = Object.values(config.cohorts)
      .reduce((sum, cohort) => sum + (cohort.weight || 0), 0);

    if (Math.abs(totalWeight - 1) > 0.001) {
      console.warn(`Experiment ${config.id} cohort weights don't sum to 1: ${totalWeight}`);
    }

    this.experiments.set(config.id, config);

    // Track experiment registration
    this.eventTracker.trackEvent('experiment_registered', {
      experimentId: config.id,
      cohortCount: Object.keys(config.cohorts).length
    });

    return config;
  }

  /**
   * Get user's cohort assignment for an experiment
   */
  getCohortAssignment(experimentId, userId, entities = {}) {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      console.error(`Experiment not found: ${experimentId}`);
      return null;
    }

    // Check if experiment is active
    if (!this.isExperimentActive(experiment)) {
      return null;
    }

    // Check targeting rules
    if (!this.checkTargeting(experiment, entities)) {
      return null;
    }

    // Check for existing assignment
    const existingAssignment = this.getExistingAssignment(experimentId, userId);
    if (existingAssignment) {
      return existingAssignment;
    }

    // Create new assignment
    const cohort = this.assignCohort(experiment, userId);
    this.saveAssignment(experimentId, userId, cohort);

    // Track assignment
    this.trackAssignment(experimentId, cohort, entities);

    return cohort;
  }

  /**
   * Check if experiment is active
   */
  isExperimentActive(experiment) {
    if (experiment.status !== 'active') {
      return false;
    }

    const now = Date.now();
    if (experiment.startDate && now < experiment.startDate) {
      return false;
    }
    if (experiment.endDate && now > experiment.endDate) {
      return false;
    }

    return true;
  }

  /**
   * Check targeting rules
   */
  checkTargeting(experiment, entities) {
    const rules = experiment.targetingRules;

    // No rules means everyone is eligible
    if (!rules || Object.keys(rules).length === 0) {
      return true;
    }

    // Check user level
    if (rules.userLevel) {
      const userLevel = entities.user?.level || entities.user?.data?.level;
      if (!rules.userLevel.includes(userLevel)) {
        return false;
      }
    }

    // Check data source type
    if (rules.dataSourceType) {
      const sourceType = entities.dataSource?.type || entities.dataSource?.data?.type;
      if (!rules.dataSourceType.includes(sourceType)) {
        return false;
      }
    }

    // Check custom rules
    if (rules.custom && typeof rules.custom === 'function') {
      return rules.custom(entities);
    }

    return true;
  }

  /**
   * Assign user to cohort
   */
  assignCohort(experiment, userId) {
    // Use consistent hashing for assignment
    const hash = this.hashUserId(userId, experiment.id);
    const randomValue = hash / 0xFFFFFFFF; // Normalize to 0-1

    let cumulative = 0;
    for (const [cohortName, cohortConfig] of Object.entries(experiment.cohorts)) {
      cumulative += cohortConfig.weight || 0;
      if (randomValue < cumulative) {
        return cohortName;
      }
    }

    // Fallback to first cohort
    return Object.keys(experiment.cohorts)[0];
  }

  /**
   * Hash user ID for consistent assignment
   */
  hashUserId(userId, salt) {
    const str = `${userId}:${salt}`;
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash);
  }

  /**
   * Get existing assignment
   */
  getExistingAssignment(experimentId, userId) {
    const key = `${experimentId}:${userId}`;
    return this.assignments.get(key);
  }

  /**
   * Save assignment
   */
  saveAssignment(experimentId, userId, cohort) {
    const key = `${experimentId}:${userId}`;
    this.assignments.set(key, cohort);

    // Persist to cookie/storage
    this.persistAssignments();
  }

  /**
   * Track assignment event
   */
  trackAssignment(experimentId, cohort, entities) {
    const experiment = this.experiments.get(experimentId);

    // Track trigger event if specified
    if (experiment.triggerEvent) {
      this.eventTracker.pushEvent(experiment.triggerEvent, {
        experimentId,
        cohort,
        eligible: true
      });
    }

    // Track generic assignment
    this.eventTracker.trackEvent('cohort_assigned', {
      experimentId,
      experimentName: experiment.name,
      cohort,
      userSegment: entities.user?.data?.level
    });
  }

  /**
   * Get experiment configuration for cohort
   */
  getExperimentConfig(experimentId, cohort) {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return null;

    return experiment.cohorts[cohort]?.config || {};
  }

  /**
   * Apply experiment variations
   */
  applyExperimentVariations(experimentId, userId, entities, baseConfig) {
    const cohort = this.getCohortAssignment(experimentId, userId, entities);
    if (!cohort) {
      return baseConfig;
    }

    const experimentConfig = this.getExperimentConfig(experimentId, cohort);

    // Merge configurations
    return {
      ...baseConfig,
      ...experimentConfig,
      _experiment: {
        id: experimentId,
        cohort,
        applied: true
      }
    };
  }

  /**
   * Load assignments from storage
   */
  loadAssignments() {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.config.cookieName);
      if (stored) {
        const data = JSON.parse(stored);
        this.assignments = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Error loading experiment assignments:', error);
    }
  }

  /**
   * Persist assignments to storage
   */
  persistAssignments() {
    if (typeof window === 'undefined') return;

    try {
      const data = Object.fromEntries(this.assignments);
      localStorage.setItem(this.config.cookieName, JSON.stringify(data));
    } catch (error) {
      console.error('Error persisting experiment assignments:', error);
    }
  }

  /**
   * Get all active experiments
   */
  getActiveExperiments() {
    const active = [];

    for (const [id, experiment] of this.experiments) {
      if (this.isExperimentActive(experiment)) {
        active.push(experiment);
      }
    }

    return active;
  }

  /**
   * Clear assignments for testing
   */
  clearAssignments(experimentId = null) {
    if (experimentId) {
      // Clear specific experiment
      const keysToDelete = [];
      for (const key of this.assignments.keys()) {
        if (key.startsWith(`${experimentId}:`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.assignments.delete(key));
    } else {
      // Clear all
      this.assignments.clear();
    }

    this.persistAssignments();
  }
}

/**
 * Predefined Formula Experiments
 */
export const FORMULA_EXPERIMENTS = {
  // AI-powered formula suggestions
  ai_formula_ranking: {
    id: 'formula_ai_ranking',
    name: 'AI Formula Ranking',
    status: 'active',
    cohorts: {
      control: {
        weight: 0.5,
        config: {
          enableAI: false,
          maxSuggestions: 5
        }
      },
      treatment: {
        weight: 0.5,
        config: {
          enableAI: true,
          maxSuggestions: 3,
          aiModel: 'gpt-4'
        }
      }
    },
    targetingRules: {
      userLevel: ['intermediate', 'advanced']
    },
    triggerEvent: 'pandc.vnext.formula_builder.ai_ranking_eligible.impression'
  },

  // Simplified formula builder for beginners
  simplified_builder: {
    id: 'formula_simplified_builder',
    name: 'Simplified Builder UI',
    status: 'active',
    cohorts: {
      control: {
        weight: 0.5,
        config: {
          showAdvancedOptions: true,
          defaultView: 'code'
        }
      },
      treatment: {
        weight: 0.5,
        config: {
          showAdvancedOptions: false,
          defaultView: 'visual',
          guidedMode: true
        }
      }
    },
    targetingRules: {
      userLevel: ['beginner']
    }
  },

  // Formula card limit test
  card_limit_test: {
    id: 'formula_card_limit',
    name: 'Formula Card Limit Test',
    status: 'active',
    cohorts: {
      control: {
        weight: 0.25,
        config: { maxCards: 5 }
      },
      treatment_2: {
        weight: 0.25,
        config: { maxCards: 2 }
      },
      treatment_3: {
        weight: 0.25,
        config: { maxCards: 3 }
      },
      treatment_4: {
        weight: 0.25,
        config: { maxCards: 4 }
      }
    }
  }
};

// Export singleton instance
export const formulaExperimentManager = new FormulaExperimentManager();

// Register default experiments
Object.values(FORMULA_EXPERIMENTS).forEach(experiment => {
  formulaExperimentManager.registerExperiment(experiment);
});

export default formulaExperimentManager;
