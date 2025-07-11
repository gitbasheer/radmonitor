/**
 * Integration tests for EMIL components
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { 
  EIDRegistry, 
  EIDSelector, 
  ESQLExecutor, 
  QueryPanel,
  EIDParser 
} from './index';

describe('EMIL Integration Tests', () => {
  let dom: JSDOM;
  let container: HTMLElement;
  let registry: EIDRegistry;
  let selector: EIDSelector | null = null;
  let executor: ESQLExecutor;
  let queryPanel: QueryPanel | null = null;

  beforeEach(() => {
    // Setup DOM
    dom = new JSDOM('<!DOCTYPE html><html><body><div id="test-container"></div></body></html>');
    global.document = dom.window.document;
    global.window = dom.window as any;
    global.HTMLElement = dom.window.HTMLElement;
    
    container = document.getElementById('test-container')!;
    
    // Initialize components
    registry = new EIDRegistry();
    executor = new ESQLExecutor({ mockMode: true });
  });

  afterEach(() => {
    // Cleanup
    selector?.destroy();
    selector = null;
    queryPanel = null;
    container.innerHTML = '';
  });

  describe('EID Selection to Query Execution Flow', () => {
    it('should execute query when EIDs are selected', async () => {
      // Setup test data
      const testEIDs = [
        'pandc.vnext.recommendations.view',
        'pandc.vnext.discovery.search'
      ];

      for (const eid of testEIDs) {
        registry.addEID(EIDParser.createMetadata(eid, {
          frequency: 1000,
          lastSeen: new Date()
        }));
      }

      // Create selector
      const selectorContainer = document.createElement('div');
      container.appendChild(selectorContainer);
      
      let selectedEIDs: string[] = [];
      selector = new EIDSelector({
        container: selectorContainer,
        registry,
        onSelectionChange: (eids) => {
          selectedEIDs = eids;
        }
      });

      // Create query panel
      const panelContainer = document.createElement('div');
      container.appendChild(panelContainer);
      
      let queryExecuted = false;
      const originalExecuteIntent = executor.executeIntent.bind(executor);
      executor.executeIntent = async (intent) => {
        queryExecuted = true;
        expect(intent.eids).toEqual(testEIDs);
        expect(intent.action).toBe('health-check');
        return originalExecuteIntent(intent);
      };

      queryPanel = new QueryPanel({
        container: panelContainer,
        executor
      });

      // Select EIDs
      selector.setSelectedEIDs(testEIDs);
      expect(selectedEIDs).toEqual(testEIDs);

      // Update query panel
      queryPanel.updateEIDs(selectedEIDs);

      // Simulate clicking health check button
      const healthButton = panelContainer.querySelector('[data-action="health-check"]') as HTMLElement;
      expect(healthButton).toBeTruthy();
      expect(healthButton.hasAttribute('disabled')).toBe(false);

      // Execute query
      healthButton.click();
      
      // Wait for async execution
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(queryExecuted).toBe(true);
    });

    it('should handle search and selection flow', () => {
      // Add test EIDs
      const eids = [
        'pandc.vnext.recommendations.view',
        'pandc.vnext.recommendations.click',
        'pandc.vnext.discovery.search'
      ];

      eids.forEach(eid => {
        registry.addEID(EIDParser.createMetadata(eid));
      });

      // Create selector
      selector = new EIDSelector({
        container,
        registry
      });

      // Search for recommendations
      const searchInput = container.querySelector('.eid-search-input') as HTMLInputElement;
      expect(searchInput).toBeTruthy();

      // Simulate search
      searchInput.value = 'recommendations';
      searchInput.dispatchEvent(new Event('input'));

      // Wait for debounce
      setTimeout(() => {
        const suggestions = container.querySelectorAll('.eid-suggestion');
        expect(suggestions.length).toBe(2);
      }, 200);
    });
  });

  describe('Registry and UI Synchronization', () => {
    it('should update hot EIDs when usage is recorded', () => {
      const eid = 'pandc.vnext.hot.eid';
      registry.addEID(EIDParser.createMetadata(eid));

      selector = new EIDSelector({
        container,
        registry,
        showHotSection: true
      });

      // Record multiple usages
      for (let i = 0; i < 10; i++) {
        registry.recordUsage(eid);
      }

      // Re-render hot section
      selector['refreshSections']();

      const hotChips = container.querySelectorAll('.eid-hot-section .eid-chip');
      const hotEID = Array.from(hotChips).find(chip => 
        chip.getAttribute('data-eid') === eid
      );

      expect(hotEID).toBeTruthy();
    });

    it('should maintain selection state across updates', () => {
      const eids = ['eid1', 'eid2', 'eid3'];
      eids.forEach(eid => {
        registry.addEID(EIDParser.createMetadata(eid));
      });

      selector = new EIDSelector({
        container,
        registry
      });

      // Select some EIDs
      selector.setSelectedEIDs(['eid1', 'eid3']);
      expect(selector.getSelectedEIDs()).toEqual(['eid1', 'eid3']);

      // Add new EID to registry
      registry.addEID(EIDParser.createMetadata('eid4'));

      // Selection should be maintained
      expect(selector.getSelectedEIDs()).toEqual(['eid1', 'eid3']);
    });
  });

  describe('Error Handling', () => {
    it('should handle query execution errors gracefully', async () => {
      // Setup error scenario
      executor.executeIntent = async () => ({
        query: 'test',
        executedAt: new Date(),
        duration: 100,
        data: null,
        error: 'Connection timeout'
      });

      queryPanel = new QueryPanel({
        container,
        executor
      });

      queryPanel.updateEIDs(['test.eid']);

      // Try to execute query
      const button = container.querySelector('[data-action="health-check"]') as HTMLElement;
      button.click();

      // Should not throw
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should validate EID format', () => {
      const validEID = 'pandc.vnext.test';
      const invalidEID = 'invalid-format';

      expect(EIDParser.validate(validEID)).toBe(true);
      expect(EIDParser.validate(invalidEID)).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should handle large EID selections efficiently', async () => {
      const startTime = performance.now();

      // Add 1000 EIDs
      for (let i = 0; i < 1000; i++) {
        registry.addEID(EIDParser.createMetadata(`pandc.vnext.eid${i}`));
      }

      selector = new EIDSelector({
        container,
        registry
      });

      // Select all
      const allEIDs = registry.exportState().eids.map(e => e.eid);
      selector.setSelectedEIDs(allEIDs);

      const setupTime = performance.now() - startTime;
      expect(setupTime).toBeLessThan(1000); // Should complete in under 1 second

      // Test query building performance
      const queryStart = performance.now();
      queryPanel = new QueryPanel({
        container: document.createElement('div'),
        executor
      });
      queryPanel.updateEIDs(allEIDs);

      const queryTime = performance.now() - queryStart;
      expect(queryTime).toBeLessThan(100); // Should update in under 100ms
    });
  });

  describe('State Persistence', () => {
    it('should save and restore complete application state', () => {
      // Setup initial state
      const eids = ['eid1', 'eid2', 'eid3'];
      eids.forEach(eid => {
        registry.addEID(EIDParser.createMetadata(eid));
      });

      selector = new EIDSelector({
        container,
        registry
      });

      selector.setSelectedEIDs(['eid1', 'eid3']);
      registry.recordUsage('eid2');

      // Export state
      const registryState = registry.exportState();
      const selectedState = selector.getSelectedEIDs();

      // Create new instances
      const newRegistry = new EIDRegistry();
      newRegistry.importState(registryState);

      const newContainer = document.createElement('div');
      const newSelector = new EIDSelector({
        container: newContainer,
        registry: newRegistry
      });

      newSelector.setSelectedEIDs(selectedState);

      // Verify state
      expect(newSelector.getSelectedEIDs()).toEqual(['eid1', 'eid3']);
      expect(newRegistry.getRecentEIDs()[0]?.eid).toBe('eid2');

      // Cleanup
      newSelector.destroy();
    });
  });
});