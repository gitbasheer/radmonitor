/**
 * Tests for RadixTrie implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RadixTrie } from '../../../../assets/js/emil/trie/radix-trie.js';

describe('RadixTrie', () => {
  let trie: RadixTrie<string>;

  beforeEach(() => {
    trie = new RadixTrie<string>();
  });

  describe('insert and search', () => {
    it('should insert and retrieve exact matches', () => {
      trie.insert('pandc.vnext.recommendations', 'recommendations-data');
      trie.insert('pandc.vnext.discovery', 'discovery-data');

      expect(trie.search('pandc.vnext.recommendations')).toBe('recommendations-data');
      expect(trie.search('pandc.vnext.discovery')).toBe('discovery-data');
      expect(trie.search('pandc.vnext.search')).toBeUndefined();
    });

    it('should handle empty key insertion', () => {
      trie.insert('', 'empty-data');
      expect(trie.getSize()).toBe(0);
    });

    it('should update existing keys', () => {
      trie.insert('test.key', 'value1');
      trie.insert('test.key', 'value2');
      
      expect(trie.search('test.key')).toBe('value2');
      expect(trie.getSize()).toBe(1);
    });
  });

  describe('prefix search', () => {
    beforeEach(() => {
      trie.insert('pandc.vnext.recommendations.view', 'rec-view');
      trie.insert('pandc.vnext.recommendations.click', 'rec-click');
      trie.insert('pandc.vnext.discovery.search', 'disc-search');
      trie.insert('pandc.legacy.recommendations', 'legacy-rec');
    });

    it('should find all keys with given prefix', () => {
      const results = trie.prefixSearch('pandc.vnext.recommendations');
      
      expect(results).toHaveLength(2);
      expect(results.map(r => r.key)).toContain('pandc.vnext.recommendations.view');
      expect(results.map(r => r.key)).toContain('pandc.vnext.recommendations.click');
    });

    it('should return empty array for non-existent prefix', () => {
      const results = trie.prefixSearch('nonexistent');
      expect(results).toHaveLength(0);
    });

    it('should respect maxResults parameter', () => {
      const results = trie.prefixSearch('pandc', 2);
      expect(results).toHaveLength(2);
    });

    it('should include exact prefix match if it exists', () => {
      trie.insert('pandc.vnext.recommendations', 'exact-match');
      const results = trie.prefixSearch('pandc.vnext.recommendations');
      
      const exactMatch = results.find(r => r.key === 'pandc.vnext.recommendations');
      expect(exactMatch).toBeDefined();
      expect(exactMatch?.score).toBeGreaterThan(100); // Should have bonus score
    });
  });

  describe('fuzzy search', () => {
    beforeEach(() => {
      trie.insert('pandc.vnext.recommendations', 'rec');
      trie.insert('platform.discovery.search', 'search');
      trie.insert('commerce.cart.add', 'cart');
    });

    it('should find exact matches with highest score', () => {
      const results = trie.fuzzySearch('recommendations');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].key).toBe('pandc.vnext.recommendations');
      expect(results[0].score).toBeGreaterThanOrEqual(70); // Contains match
    });

    it('should find partial matches', () => {
      const results = trie.fuzzySearch('cart');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].key).toBe('commerce.cart.add');
    });

    it('should handle character-by-character matching', () => {
      const results = trie.fuzzySearch('pvc');
      
      // Should match 'p' from pandc, 'v' from vnext, 'c' from recommendations
      const pancResult = results.find(r => r.key.startsWith('pandc'));
      expect(pancResult).toBeDefined();
    });
  });

  describe('frequency tracking', () => {
    it('should update frequency for existing keys', () => {
      trie.insert('test.eid', 'data');
      trie.updateFrequency('test.eid', 5);
      
      const results = trie.prefixSearch('test');
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('should not crash when updating non-existent key', () => {
      expect(() => {
        trie.updateFrequency('nonexistent', 1);
      }).not.toThrow();
    });
  });

  describe('getAllKeys', () => {
    it('should return all keys in the trie', () => {
      trie.insert('key1', 'value1');
      trie.insert('key2', 'value2');
      trie.insert('key3', 'value3');
      
      const keys = trie.getAllKeys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });
  });

  describe('performance', () => {
    it('should handle large number of insertions efficiently', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 10000; i++) {
        trie.insert(`pandc.vnext.eid${i}`, `data${i}`);
      }
      
      const insertTime = performance.now() - startTime;
      expect(insertTime).toBeLessThan(1000); // Should complete in under 1 second
      
      // Test search performance
      const searchStart = performance.now();
      const results = trie.prefixSearch('pandc.vnext.eid99');
      const searchTime = performance.now() - searchStart;
      
      expect(searchTime).toBeLessThan(1); // Sub-millisecond search
      expect(results.length).toBeGreaterThan(0);
    });
  });
});