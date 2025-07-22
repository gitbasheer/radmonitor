/**
 * Tests for EID Registry
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EIDRegistry } from './eid-registry';
import { EIDMetadata } from '../types/index';

describe('EIDRegistry', () => {
  let registry: EIDRegistry;

  beforeEach(() => {
    registry = new EIDRegistry();
  });

  const createMockEID = (eid: string, frequency = 100): EIDMetadata => ({
    eid,
    namespace: eid.split('.')[0] || 'pandc',
    radset: eid.split('.')[1] || 'vnext',
    radId: eid.split('.')[2] || 'test',
    lastSeen: new Date(),
    frequency,
    avgResponseTime: 250,
    errorRate: 0.01
  });

  describe('initialization', () => {
    it('should initialize empty', () => {
      const state = registry.exportState();
      expect(state.eids).toHaveLength(0);
      expect(state.recent).toHaveLength(0);
      expect(state.hotScores).toHaveLength(0);
    });

    it('should initialize with historical data', async () => {
      const mockData = [
        createMockEID('pandc.vnext.recommendations.view'),
        createMockEID('pandc.vnext.discovery.search')
      ];

      await registry.initialize(mockData);
      
      const state = registry.exportState();
      expect(state.eids).toHaveLength(2);
    });
  });

  describe('addEID', () => {
    it('should add new EID to registry', () => {
      const metadata = createMockEID('pandc.vnext.test.action');
      registry.addEID(metadata);

      const result = registry.search('pandc.vnext.test');
      expect(result).toHaveLength(1);
      expect(result[0].eid).toBe('pandc.vnext.test.action');
    });

    it('should update existing EID', () => {
      const metadata1 = createMockEID('pandc.vnext.test', 100);
      const metadata2 = createMockEID('pandc.vnext.test', 200);

      registry.addEID(metadata1);
      registry.addEID(metadata2);

      const result = registry.search('pandc.vnext.test');
      expect(result).toHaveLength(1);
      expect(result[0].metadata.frequency).toBe(200);
    });

    it('should track recent EIDs', () => {
      const metadata = createMockEID('pandc.vnext.recent');
      registry.addEID(metadata);

      const recent = registry.getRecentEIDs();
      expect(recent).toHaveLength(1);
      expect(recent[0].eid).toBe('pandc.vnext.recent');
    });
  });

  describe('search', () => {
    beforeEach(() => {
      const eids = [
        'pandc.vnext.recommendations.view',
        'pandc.vnext.recommendations.click',
        'pandc.vnext.discovery.search',
        'platform.legacy.cart.add',
        'commerce.experimental.checkout.success'
      ];

      eids.forEach(eid => {
        registry.addEID(createMockEID(eid));
      });
    });

    it('should find EIDs by prefix', () => {
      const results = registry.search('pandc.vnext.rec');
      expect(results).toHaveLength(2);
      expect(results.map(r => r.eid)).toContain('pandc.vnext.recommendations.view');
      expect(results.map(r => r.eid)).toContain('pandc.vnext.recommendations.click');
    });

    it('should respect maxResults', () => {
      const results = registry.search('pandc', { maxResults: 2 });
      expect(results).toHaveLength(2);
    });

    it('should filter by namespace', () => {
      const results = registry.search('', { 
        filterByNamespace: 'platform',
        maxResults: 10 
      });
      expect(results).toHaveLength(1);
      expect(results[0].eid).toBe('platform.legacy.cart.add');
    });

    it('should filter by radset', () => {
      const results = registry.search('', {
        filterByRadset: 'experimental',
        maxResults: 10
      });
      expect(results).toHaveLength(1);
      expect(results[0].eid).toBe('commerce.experimental.checkout.success');
    });

    it('should sort alphabetically', () => {
      const results = registry.search('pandc.vnext', {
        sortBy: 'alphabetical'
      });
      expect(results[0].eid).toBe('pandc.vnext.discovery.search');
      expect(results[1].eid).toBe('pandc.vnext.recommendations.click');
      expect(results[2].eid).toBe('pandc.vnext.recommendations.view');
    });
  });

  describe('hot EIDs', () => {
    it('should track hot EIDs based on frequency', async () => {
      const eids = [
        createMockEID('pandc.vnext.hot1', 1000),
        createMockEID('pandc.vnext.hot2', 500),
        createMockEID('pandc.vnext.cold', 10)
      ];

      await registry.initialize(eids);

      const hot = registry.getHotEIDs(2);
      expect(hot).toHaveLength(2);
      expect(hot[0].eid).toBe('pandc.vnext.hot1');
      expect(hot[1].eid).toBe('pandc.vnext.hot2');
    });

    it('should update hot scores on usage', () => {
      registry.addEID(createMockEID('pandc.vnext.test'));
      
      // Record multiple usages
      for (let i = 0; i < 5; i++) {
        registry.recordUsage('pandc.vnext.test');
      }

      const hot = registry.getHotEIDs();
      expect(hot.some(h => h.eid === 'pandc.vnext.test')).toBe(true);
    });

    it('should detect trends', async () => {
      const oldEid = createMockEID('pandc.vnext.old', 100);
      oldEid.lastSeen = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago

      const newEid = createMockEID('pandc.vnext.new', 100);
      newEid.lastSeen = new Date(); // now

      await registry.initialize([oldEid, newEid]);

      const hot = registry.getHotEIDs();
      const oldEntry = hot.find(h => h.eid === 'pandc.vnext.old');
      const newEntry = hot.find(h => h.eid === 'pandc.vnext.new');

      expect(newEntry?.score).toBeGreaterThan(oldEntry?.score || 0);
    });
  });

  describe('hierarchy', () => {
    it('should build hierarchy from EIDs', () => {
      const eids = [
        'pandc.vnext.recommendations.view',
        'pandc.vnext.recommendations.click',
        'pandc.vnext.discovery.search',
        'platform.legacy.cart.add'
      ];

      eids.forEach(eid => {
        registry.addEID(createMockEID(eid));
      });

      const hierarchy = registry.getHierarchy();
      expect(hierarchy).toHaveLength(2); // pandc and platform

      const pandc = hierarchy.find(h => h.namespace === 'pandc');
      expect(pandc?.radsets.size).toBe(1); // vnext
      
      const vnext = pandc?.radsets.get('vnext');
      expect(vnext?.rads.size).toBe(2); // recommendations and discovery
    });
  });

  describe('recordUsage', () => {
    it('should update frequency and recent list', () => {
      const eid = 'pandc.vnext.test';
      registry.addEID(createMockEID(eid, 100));

      registry.recordUsage(eid);

      const state = registry.exportState();
      const metadata = state.eids.find(e => e.eid === eid);
      expect(metadata?.frequency).toBe(101);
      expect(state.recent).toContain(eid);
    });

    it('should handle non-existent EID gracefully', () => {
      expect(() => {
        registry.recordUsage('non.existent.eid');
      }).not.toThrow();
    });
  });

  describe('state persistence', () => {
    it('should export and import state', () => {
      const eids = [
        'pandc.vnext.test1',
        'pandc.vnext.test2'
      ];

      eids.forEach(eid => {
        registry.addEID(createMockEID(eid));
      });

      registry.recordUsage('pandc.vnext.test1');

      const state = registry.exportState();
      expect(state.eids).toHaveLength(2);
      expect(state.recent).toContain('pandc.vnext.test1');

      // Create new registry and import
      const newRegistry = new EIDRegistry();
      newRegistry.importState(state);

      const newState = newRegistry.exportState();
      expect(newState.eids).toHaveLength(2);
      expect(newState.recent).toEqual(state.recent);
    });
  });

  describe('performance', () => {
    it('should handle large number of EIDs efficiently', async () => {
      const startTime = performance.now();
      const eids: EIDMetadata[] = [];

      // Create 10,000 EIDs
      for (let i = 0; i < 10000; i++) {
        eids.push(createMockEID(`pandc.vnext.eid${i}`, Math.random() * 1000));
      }

      await registry.initialize(eids);
      const initTime = performance.now() - startTime;
      expect(initTime).toBeLessThan(1000); // Should initialize in under 1 second

      // Test search performance
      const searchStart = performance.now();
      const results = registry.search('pandc.vnext.eid99');
      const searchTime = performance.now() - searchStart;
      
      expect(searchTime).toBeLessThan(10); // Should search in under 10ms
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty search query', () => {
      registry.addEID(createMockEID('test.eid'));
      const results = registry.search('');
      expect(results).toHaveLength(1);
    });

    it('should handle special characters in EID', () => {
      const specialEid = 'pandc.vnext.test-special_chars.action';
      registry.addEID(createMockEID(specialEid));
      
      const results = registry.search('test-special');
      expect(results).toHaveLength(1);
      expect(results[0].eid).toBe(specialEid);
    });

    it('should maintain recent list size limit', () => {
      // Add more than max recent items
      for (let i = 0; i < 30; i++) {
        registry.addEID(createMockEID(`pandc.vnext.eid${i}`));
      }

      const recent = registry.getRecentEIDs(20);
      expect(recent.length).toBeLessThanOrEqual(20);
    });
  });
});