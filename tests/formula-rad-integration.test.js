/**
 * Formula RAD Integration Tests
 * Demonstrates how MCP Formula Builder follows RAD patterns
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import FormulaSynthesizerFactory from '../assets/js/formula-builder/core/formula-synthesizer.js';
import formulaRADCardManager from '../assets/js/formula-builder/core/formula-rad-cards.js';
import formulaEntityManager from '../assets/js/formula-builder/core/formula-entities.js';
import formulaExperimentManager from '../assets/js/formula-builder/core/formula-experiment-manager.js';
// Import synthesizer extensions to register them
import '../assets/js/formula-builder/core/formula-synthesizer-extensions.js';

describe('Formula RAD Integration', () => {
  beforeEach(() => {
    // Clear entities and experiments
    formulaEntityManager.clear();
    formulaExperimentManager.clearAssignments();

    // Mock window for tracking
    global.window = {
      _signalsDataLayer: []
    };
  });

  describe('Entity Validation (Silent Failure Prevention)', () => {
    it('should validate required entity fields', () => {
      // Missing required fields - should fail validation
      const invalidDataSource = {
        // Missing id and type
        fields: [
          { name: 'revenue', type: 'numeric' }
        ]
      };

      const result = formulaEntityManager.addEntity('dataSource', invalidDataSource);
      expect(result).toBe(false);

      // Valid entity
      const validDataSource = {
        id: 'traffic-monitor',
        type: 'elasticsearch',
        fields: [
          { name: 'timestamp', type: 'date' },
          { name: 'count', type: 'numeric' },
          { name: 'source', type: 'category' }
        ],
        rowCount: 5000
      };

      const success = formulaEntityManager.addEntity('dataSource', validDataSource);
      expect(success).toBe(true);
    });

    it('should support nested field access like RAD', () => {
      const userData = {
        id: 'user123',
        level: 'intermediate',
        previousFormulas: ['sum', 'filter'],
        preferences: {
          theme: 'dark',
          features: {
            ai: true,
            advanced: false
          }
        }
      };

      formulaEntityManager.addEntity('user', userData);
      const userEntity = formulaEntityManager.getEntity('user');

      // Test nested access
      expect(userEntity.getField('preferences.theme')).toBe('dark');
      expect(userEntity.getField('preferences.features.ai')).toBe(true);
      expect(userEntity.hasField('preferences.features.advanced')).toBe(true);
    });
  });

  describe('Formula Synthesizer Pattern', () => {
    it('should evaluate formula eligibility like RAD synthesizers', async () => {
      // Setup entities
      formulaEntityManager.addEntity('dataSource', {
        id: 'test-source',
        type: 'api',
        fields: [
          { name: 'revenue', type: 'numeric' },
          { name: 'category', type: 'category' }
        ],
        rowCount: 1000,
        lastUpdated: Date.now()
      });

      formulaEntityManager.addEntity('user', {
        id: 'user123',
        level: 'intermediate',
        previousFormulas: ['filter', 'average']
      });

      const entities = formulaEntityManager.createEntityCollection();
      const synthesizer = FormulaSynthesizerFactory.create('sum');

      // Evaluate eligibility
      const result = await synthesizer.evaluate(entities);

      expect(result.eligible).toBe(true);
      expect(result.score).toBeGreaterThan(10); // Base score + bonuses
      expect(result.duration).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should handle missing fields gracefully (no silent failures)', async () => {
      // Missing dataSource entity
      const entities = {
        user: { id: 'user123', level: 'beginner' }
      };

      const synthesizer = FormulaSynthesizerFactory.create('filter');
      const result = await synthesizer.evaluate(entities);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('Missing required entity: dataSource');
      expect(result.errors).toBeDefined();
    });

    it('should apply custom eligibility rules', async () => {
      formulaEntityManager.addEntity('dataSource', {
        id: 'complex-source',
        type: 'database',
        fields: Array(20).fill({ name: 'field', type: 'mixed' }),
        complexity: 8
      });

      formulaEntityManager.addEntity('user', {
        id: 'beginner123',
        level: 'beginner'
      });

      const entities = formulaEntityManager.createEntityCollection();
      const customData = { userLevel: 'beginner' };

      const synthesizer = FormulaSynthesizerFactory.create('sum');
      const result = await synthesizer.evaluate(entities, customData);

      // Should fail due to complexity check
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('complexity_too_high_for_user_level');
    });
  });

  describe('Formula RAD Cards', () => {
    beforeEach(() => {
      // Setup standard entities
      formulaEntityManager.addEntity('dataSource', {
        id: 'test-source',
        type: 'api',
        fields: [
          { name: 'sales', type: 'numeric' },
          { name: 'region', type: 'category' },
          { name: 'date', type: 'date' }
        ],
        rowCount: 2000
      });

      formulaEntityManager.addEntity('user', {
        id: 'user456',
        level: 'intermediate',
        previousFormulas: ['sum', 'filter', 'sum']
      });
    });

    it('should get eligible cards and rank them', async () => {
      const entities = formulaEntityManager.createEntityCollection();
      const eligibleCards = await formulaRADCardManager.getEligibleCards(entities);

      expect(eligibleCards.length).toBeGreaterThan(0);
      expect(eligibleCards.length).toBeLessThanOrEqual(5); // Max cards limit

      // Check ranking (highest score first)
      for (let i = 1; i < eligibleCards.length; i++) {
        expect(eligibleCards[i - 1].score).toBeGreaterThanOrEqual(eligibleCards[i].score);
      }
    });

    it('should track impressions with index positions', async () => {
      const entities = formulaEntityManager.createEntityCollection();
      const eligibleCards = await formulaRADCardManager.getEligibleCards(entities);

      // Render cards
      const rendered = formulaRADCardManager.renderCards(eligibleCards);

      // Check impression tracking
      expect(window._signalsDataLayer.length).toBeGreaterThan(0);

      // Verify index tracking
      const impressionEvents = window._signalsDataLayer.filter(
        event => event.eid.includes('.impression')
      );

      impressionEvents.forEach((event, index) => {
        expect(event.customProperties.index).toBe(index);
        expect(event.customProperties.position).toBe(`index_${index}`);
      });
    });

    it('should handle card actions and track clicks', () => {
      const actionResult = formulaRADCardManager.handleCardAction(
        'MCP-Formula-Sum',
        'primary',
        { source: 'test' }
      );

      expect(actionResult).toBeDefined();
      expect(actionResult.formulaType).toBe('sum');
      expect(actionResult.definitionId).toBe('MCP-Formula-Sum');

      // Check click tracking
      const clickEvents = window._signalsDataLayer.filter(
        event => event.eid.includes('.click')
      );
      expect(clickEvents.length).toBeGreaterThan(0);
      expect(clickEvents[0].customProperties.ctaType).toBe('primary');
    });
  });

  describe('Experiment Integration', () => {
    it('should assign users to experiment cohorts', () => {
      const entities = formulaEntityManager.createEntityCollection();
      const userId = 'test-user-123';

      // Get cohort assignment
      const cohort = formulaExperimentManager.getCohortAssignment(
        'formula_ai_ranking',
        userId,
        entities
      );

      expect(['control', 'treatment']).toContain(cohort);

      // Should get same assignment on subsequent calls
      const cohort2 = formulaExperimentManager.getCohortAssignment(
        'formula_ai_ranking',
        userId,
        entities
      );
      expect(cohort2).toBe(cohort);
    });

    it('should respect targeting rules', () => {
      // Beginner user for AI ranking experiment (targets intermediate/advanced)
      formulaEntityManager.addEntity('user', {
        id: 'beginner789',
        level: 'beginner'
      });

      const entities = formulaEntityManager.createEntityCollection();
      const cohort = formulaExperimentManager.getCohortAssignment(
        'formula_ai_ranking',
        'beginner789',
        entities
      );

      // Should not be assigned due to targeting rules
      expect(cohort).toBe(null);
    });

    it('should apply experiment variations to config', () => {
      formulaEntityManager.addEntity('user', {
        id: 'user999',
        level: 'intermediate'
      });

      const entities = formulaEntityManager.createEntityCollection();
      const baseConfig = { maxCards: 5, enableAI: false };

      const modifiedConfig = formulaExperimentManager.applyExperimentVariations(
        'formula_ai_ranking',
        'user999',
        entities,
        baseConfig
      );

      // Should have experiment modifications
      expect(modifiedConfig._experiment).toBeDefined();
      expect(modifiedConfig._experiment.applied).toBe(true);

      // Config should be modified based on cohort
      if (modifiedConfig._experiment.cohort === 'treatment') {
        expect(modifiedConfig.enableAI).toBe(true);
        expect(modifiedConfig.maxSuggestions).toBe(3);
      }
    });
  });

  describe('Event Tracking and Monitoring', () => {
    it('should never send empty EIDs', () => {
      const card = formulaRADCardManager.getCard('MCP-Formula-Sum');

      // Try to track with empty EID
      const originalRadId = card.eventTracker.config.radId;
      card.eventTracker.config.radId = '';

      card.eventTracker.trackImpression();

      // Should not have added event due to validation
      const events = window._signalsDataLayer.filter(
        event => event.eid && event.eid.trim() !== ''
      );

      expect(events.length).toBe(0);

      // Restore
      card.eventTracker.config.radId = originalRadId;
    });

    it('should track performance warnings', async () => {
      const synthesizer = FormulaSynthesizerFactory.create('sum', {
        performanceThreshold: 1 // Very low threshold to trigger warning
      });

      // Add delay to trigger performance warning
      synthesizer.calculateScore = async function() {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 50;
      };

      const entities = formulaEntityManager.createEntityCollection();
      const consoleSpy = vi.spyOn(console, 'warn');

      await synthesizer.evaluate(entities);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Performance Warning'),
        expect.any(Object)
      );
    });

    it('should monitor health metrics', () => {
      // Get event tracker from a card
      const card = formulaRADCardManager.getCard('MCP-Formula-Sum');
      const tracker = card.eventTracker;

      // Simulate activity
      tracker.trackImpression();
      tracker.trackImpression();
      tracker.trackClick('primary');
      tracker.trackValidation('sum', false, 'syntax_error');

      const metrics = tracker.getMetrics();

      expect(metrics.impressions).toBe(2);
      expect(metrics.clicks).toBe(1);
      expect(metrics.errors).toBe(1);

      // CTR should be 50%
      const ctr = metrics.clicks / metrics.impressions;
      expect(ctr).toBe(0.5);
    });
  });

  describe('Full Integration Flow', () => {
    it('should complete full RAD-style formula suggestion flow', async () => {
      // 1. Setup entities
      formulaEntityManager.addEntity('dataSource', {
        id: 'sales-data',
        type: 'database',
        fields: [
          { name: 'revenue', type: 'numeric' },
          { name: 'product', type: 'category' },
          { name: 'date', type: 'date' },
          { name: 'region', type: 'category' }
        ],
        rowCount: 10000,
        lastUpdated: Date.now() - 3600000 // 1 hour ago
      });

      formulaEntityManager.addEntity('user', {
        id: 'power-user',
        level: 'advanced',
        previousFormulas: ['sum', 'filter', 'trend', 'percentage', 'sum']
      });

      formulaEntityManager.addEntity('context', {
        experimentGroup: 'ai_boosted',
        source: 'dashboard',
        sessionDuration: 300000
      });

      // 2. Get entities and check experiments
      const entities = formulaEntityManager.createEntityCollection();
      const userId = 'power-user';

      // 3. Apply experiment variations
      let config = { maxCards: 5 };
      config = formulaExperimentManager.applyExperimentVariations(
        'formula_ai_ranking',
        userId,
        entities,
        config
      );

      // 4. Get eligible cards with experiment config
      formulaRADCardManager.config = { ...formulaRADCardManager.config, ...config };
      const eligibleCards = await formulaRADCardManager.getEligibleCards(
        entities,
        entities.context
      );

      // 5. Render cards (tracks impressions)
      const renderedCards = formulaRADCardManager.renderCards(eligibleCards, {
        experiment: config._experiment
      });

      // 6. Simulate user interaction
      const selectedCard = eligibleCards[0];
      const actionResult = formulaRADCardManager.handleCardAction(
        selectedCard.id,
        'primary',
        { experiment: config._experiment }
      );

      // Verify complete flow
      expect(eligibleCards.length).toBeGreaterThan(0);
      expect(renderedCards.length).toBe(eligibleCards.length);
      expect(actionResult).toBeDefined();

      // Check tracking events
      const events = window._signalsDataLayer;
      const impressionEvents = events.filter(e => e.eid.includes('.impression'));
      const clickEvents = events.filter(e => e.eid.includes('.click'));

      expect(impressionEvents.length).toBeGreaterThan(0);
      expect(clickEvents.length).toBe(1);

      // Verify experiment tracking
      if (config._experiment?.applied) {
        const experimentEvents = events.filter(
          e => e.customProperties?.experimentId === 'formula_ai_ranking'
        );
        expect(experimentEvents.length).toBeGreaterThan(0);
      }
    });
  });
});
