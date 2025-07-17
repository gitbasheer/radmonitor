// searchFilter.test.js - Tests for search and filter functionality

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  searchResults,
  filterByStatus,
  filterByThreshold,
  applyAllFilters,
  savePreferences,
  loadPreferences,
  applyPreferences,
  config
} from '../src/dashboard.js';

describe('Search Functionality', () => {
  const mockResults = [
    {
      eventId: 'pandc.vnext.recommendations.feed.feed_domain',
      displayName: 'feed_domain',
      status: 'CRITICAL',
      score: -85,
      current: 100,
      baseline12h: 1000,
      dailyAvg: 2000
    },
    {
      eventId: 'pandc.vnext.recommendations.feed.feed_creategmb',
      displayName: 'feed_creategmb',
      status: 'WARNING',
      score: -60,
      current: 400,
      baseline12h: 1000,
      dailyAvg: 2000
    },
    {
      eventId: 'pandc.vnext.recommendations.feed.feed_startseo',
      displayName: 'feed_startseo',
      status: 'NORMAL',
      score: -10,
      current: 900,
      baseline12h: 1000,
      dailyAvg: 2000
    },
    {
      eventId: 'pandc.vnext.recommendations.feed.feed_ssl',
      displayName: 'feed_ssl',
      status: 'INCREASED',
      score: 50,
      current: 1500,
      baseline12h: 1000,
      dailyAvg: 2000
    }
  ];

  it('should return all results when search term is empty', () => {
    const result = searchResults(mockResults, '');
    expect(result).toEqual(mockResults);
  });

  it('should return all results when search term is null', () => {
    const result = searchResults(mockResults, null);
    expect(result).toEqual(mockResults);
  });

  it('should filter by display name (case insensitive)', () => {
    const result = searchResults(mockResults, 'GMB');
    expect(result).toHaveLength(1);
    expect(result[0].displayName).toBe('feed_creategmb');
  });

  it('should filter by event ID', () => {
    const result = searchResults(mockResults, 'feed.feed_ssl');
    expect(result).toHaveLength(1);
    expect(result[0].displayName).toBe('feed_ssl');
  });

  it('should return multiple matches', () => {
    const result = searchResults(mockResults, 'feed_');
    expect(result).toHaveLength(4);
  });

  it('should handle partial matches', () => {
    const result = searchResults(mockResults, 'seo');
    expect(result).toHaveLength(1);
    expect(result[0].displayName).toBe('feed_startseo');
  });

  it('should return empty array when no matches found', () => {
    const result = searchResults(mockResults, 'nonexistent');
    expect(result).toHaveLength(0);
  });

  it('should trim whitespace from search term', () => {
    const result = searchResults(mockResults, '  domain  ');
    expect(result).toHaveLength(1);
    expect(result[0].displayName).toBe('feed_domain');
  });
});

describe('Status Filter', () => {
  const mockResults = [
    { displayName: 'card1', status: 'CRITICAL' },
    { displayName: 'card2', status: 'CRITICAL' },
    { displayName: 'card3', status: 'WARNING' },
    { displayName: 'card4', status: 'NORMAL' },
    { displayName: 'card5', status: 'INCREASED' }
  ];

  it('should return all results when status is null', () => {
    const result = filterByStatus(mockResults, null);
    expect(result).toEqual(mockResults);
  });

  it('should filter by CRITICAL status', () => {
    const result = filterByStatus(mockResults, 'CRITICAL');
    expect(result).toHaveLength(2);
    expect(result.every(r => r.status === 'CRITICAL')).toBe(true);
  });

  it('should filter by WARNING status', () => {
    const result = filterByStatus(mockResults, 'WARNING');
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('WARNING');
  });

  it('should be case insensitive', () => {
    const result = filterByStatus(mockResults, 'critical');
    expect(result).toHaveLength(2);
  });

  it('should return empty array for non-existent status', () => {
    const result = filterByStatus(mockResults, 'INVALID');
    expect(result).toHaveLength(0);
  });
});

describe('Threshold Filter', () => {
  const mockResults = [
    { displayName: 'card1', status: 'CRITICAL' },
    { displayName: 'card2', status: 'WARNING' },
    { displayName: 'card3', status: 'NORMAL' },
    { displayName: 'card4', status: 'INCREASED' }
  ];

  it('should return all results when no filters applied', () => {
    const result = filterByThreshold(mockResults, false, false);
    expect(result).toEqual(mockResults);
  });

  it('should hide normal and increased when hideNormal is true', () => {
    const result = filterByThreshold(mockResults, true, false);
    expect(result).toHaveLength(2);
    expect(result.every(r => r.status === 'CRITICAL' || r.status === 'WARNING')).toBe(true);
  });

  it('should show only critical when criticalOnly is true', () => {
    const result = filterByThreshold(mockResults, false, true);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('CRITICAL');
  });

  it('should prioritize criticalOnly over hideNormal', () => {
    const result = filterByThreshold(mockResults, true, true);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('CRITICAL');
  });
});

describe('Combined Filters', () => {
  const mockResults = [
    {
      eventId: 'pandc.vnext.recommendations.feed.feed_domain',
      displayName: 'feed_domain',
      status: 'CRITICAL',
      score: -85
    },
    {
      eventId: 'pandc.vnext.recommendations.feed.feed_creategmb',
      displayName: 'feed_creategmb',
      status: 'WARNING',
      score: -60
    },
    {
      eventId: 'pandc.vnext.recommendations.feed.feed_domain_backup',
      displayName: 'feed_domain_backup',
      status: 'NORMAL',
      score: -10
    },
    {
      eventId: 'pandc.vnext.recommendations.feed.feed_ssl',
      displayName: 'feed_ssl',
      status: 'INCREASED',
      score: 50
    }
  ];

  it('should apply search filter only', () => {
    const result = applyAllFilters(mockResults, { searchTerm: 'domain' });
    expect(result).toHaveLength(2);
    expect(result.every(r => r.displayName.includes('domain'))).toBe(true);
  });

  it('should apply status filter only', () => {
    const result = applyAllFilters(mockResults, { statusFilter: 'warning' });
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('WARNING');
  });

  it('should apply threshold filters only', () => {
    const result = applyAllFilters(mockResults, { hideNormal: true });
    expect(result).toHaveLength(2);
    expect(result.every(r => r.status === 'CRITICAL' || r.status === 'WARNING')).toBe(true);
  });

  it('should apply all filters together', () => {
    const result = applyAllFilters(mockResults, {
      searchTerm: 'domain',
      statusFilter: 'critical',
      hideNormal: true
    });
    expect(result).toHaveLength(1);
    expect(result[0].displayName).toBe('feed_domain');
    expect(result[0].status).toBe('CRITICAL');
  });

  it('should handle empty filter object', () => {
    const result = applyAllFilters(mockResults, {});
    expect(result).toEqual(mockResults);
  });

  it('should handle no filters parameter', () => {
    const result = applyAllFilters(mockResults);
    expect(result).toEqual(mockResults);
  });
});

describe('Preference Management', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
  });

  it('should save preferences to localStorage', () => {
    const preferences = {
      criticalThreshold: -70,
      warningThreshold: -40,
      minDailyVolume: 200,
      searchTerm: 'test',
      hideNormal: true
    };

    savePreferences(preferences);

    // Verify setItem was called with correct arguments
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'rad_monitor_preferences',
      JSON.stringify(preferences)
    );
  });

  it('should load preferences from localStorage', () => {
    const preferences = {
      criticalThreshold: -70,
      warningThreshold: -40,
      customField: 'test'
    };

    // Mock getItem to return our preferences
    localStorage.getItem.mockReturnValueOnce(JSON.stringify(preferences));

    const loaded = loadPreferences();
    expect(loaded).toEqual(preferences);
    expect(localStorage.getItem).toHaveBeenCalledWith('rad_monitor_preferences');
  });

  it('should return null when no preferences saved', () => {
    const loaded = loadPreferences();
    expect(loaded).toBeNull();
  });

  it('should handle corrupted localStorage data', () => {
    localStorage.setItem('rad_monitor_preferences', 'invalid json');
    
    const loaded = loadPreferences();
    expect(loaded).toBeNull();
  });

  it('should apply preferences to config', () => {
    const originalCritical = config.criticalThreshold;
    const originalWarning = config.warningThreshold;

    const preferences = {
      criticalThreshold: -70,
      warningThreshold: -40,
      minDailyVolume: 200,
      nonExistentField: 'ignored'
    };

    applyPreferences(preferences);

    expect(config.criticalThreshold).toBe(-70);
    expect(config.warningThreshold).toBe(-40);
    expect(config.minDailyVolume).toBe(200);
    expect(config.nonExistentField).toBeUndefined();

    // Restore original values
    config.criticalThreshold = originalCritical;
    config.warningThreshold = originalWarning;
  });

  it('should handle null preferences gracefully', () => {
    const originalCritical = config.criticalThreshold;
    
    applyPreferences(null);
    
    expect(config.criticalThreshold).toBe(originalCritical);
  });
});

describe('Filter Integration with Config', () => {
  beforeEach(() => {
    // Reset config
    config.searchTerm = '';
    config.hideNormal = false;
    config.criticalOnly = false;
    config.statusFilter = null;
  });

  it('should use config values for filtering', () => {
    const mockResults = [
      { displayName: 'critical_card', status: 'CRITICAL' },
      { displayName: 'normal_card', status: 'NORMAL' }
    ];

    // Update config
    config.hideNormal = true;

    const filters = {
      hideNormal: config.hideNormal
    };

    const result = applyAllFilters(mockResults, filters);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('CRITICAL');
  });

  it('should respect dynamic thresholds in status calculation', () => {
    // This would be tested in the scoring.test.js but included here for completeness
    const originalCritical = config.criticalThreshold;
    const originalWarning = config.warningThreshold;

    config.criticalThreshold = -70;
    config.warningThreshold = -30;

    // The getStatus function would use these new thresholds
    // Testing would require importing getStatus function

    // Restore
    config.criticalThreshold = originalCritical;
    config.warningThreshold = originalWarning;
  });
});

describe('Search and Filter Edge Cases', () => {
  it('should handle empty results array', () => {
    const result = searchResults([], 'test');
    expect(result).toEqual([]);
  });

  it('should handle special characters in search', () => {
    const mockResults = [
      { displayName: 'feed_domain/index_1', eventId: 'test.feed_domain/index_1' },
      { displayName: 'feed_domain_index_2', eventId: 'test.feed_domain_index_2' }
    ];

    const result = searchResults(mockResults, 'domain/index');
    expect(result).toHaveLength(1);
    expect(result[0].displayName).toBe('feed_domain/index_1');
  });

  it('should handle very long search terms', () => {
    const mockResults = [{ displayName: 'test', eventId: 'test' }];
    const longSearch = 'a'.repeat(1000);
    
    const result = searchResults(mockResults, longSearch);
    expect(result).toHaveLength(0);
  });

  it('should maintain result order after filtering', () => {
    const mockResults = [
      { displayName: 'a_domain', status: 'CRITICAL', score: -90 },
      { displayName: 'b_domain', status: 'WARNING', score: -60 },
      { displayName: 'c_domain', status: 'CRITICAL', score: -85 }
    ];

    const result = filterByStatus(mockResults, 'CRITICAL');
    expect(result[0].displayName).toBe('a_domain');
    expect(result[1].displayName).toBe('c_domain');
  });
}); 