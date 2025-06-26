// timeRange.test.js - Tests for custom time range functionality
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
// ESM: Import TimeRangeUtils directly
import TimeRangeUtils from '../assets/js/time-range-utils.js';

// Set up DOM environment
const dom = new JSDOM();
global.window = dom.window;
global.document = window.document;

describe('Time Range Parsing', () => {
  beforeEach(() => {
    // Mock Date to have consistent test results
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Existing "now-" format', () => {
    it('should parse now-6h correctly', () => {
      const result = TimeRangeUtils.parseTimeRange('now-6h');
      expect(result).toEqual({
        type: 'relative',
        gte: 'now-6h',
        hours: 6
      });
    });

    it('should parse now-12h correctly', () => {
      const result = TimeRangeUtils.parseTimeRange('now-12h');
      expect(result).toEqual({
        type: 'relative',
        gte: 'now-12h',
        hours: 12
      });
    });

    it('should parse now-24h correctly', () => {
      const result = TimeRangeUtils.parseTimeRange('now-24h');
      expect(result).toEqual({
        type: 'relative',
        gte: 'now-24h',
        hours: 24
      });
    });

    it('should parse now-3d correctly (days to hours)', () => {
      const result = TimeRangeUtils.parseTimeRange('now-3d');
      expect(result).toEqual({
        type: 'relative',
        gte: 'now-3d',
        hours: 72 // 3 * 24
      });
    });
  });

  describe('Inspection time format', () => {
    it('should parse inspection_time correctly', () => {
      const result = TimeRangeUtils.parseTimeRange('inspection_time');
      expect(result).toEqual({
        type: 'inspection',
        hours: 16, // 24h - 8h = 16h window
        gte: 'now-24h',
        lte: 'now-8h',
        label: 'Inspection Time (8-24h ago)'
      });
    });

    it('should validate inspection_time', () => {
      expect(TimeRangeUtils.validateTimeRange('inspection_time')).toBe(true);
    });

    it('should format inspection_time correctly', () => {
      const formatted = TimeRangeUtils.formatTimeRange('inspection_time');
      expect(formatted).toBe('Inspection Time (8-24h ago)');
    });

    it('should generate correct filter for inspection_time', () => {
      const filter = TimeRangeUtils.parseTimeRangeToFilter('inspection_time');
      expect(filter).toEqual({
        gte: 'now-24h',
        lte: 'now-8h'
      });
    });

    it('should include inspection_time in presets', () => {
      const presets = TimeRangeUtils.getPresets();
      const inspectionPreset = presets.find(p => p.value === 'inspection_time');
      expect(inspectionPreset).toBeDefined();
      expect(inspectionPreset.label).toBe('Inspection Time');
    });
  });

  describe('New custom time window format', () => {
    it('should parse -3h-6h correctly (from 3h ago to 6h ago)', () => {
      const result = TimeRangeUtils.parseTimeRange('-3h-6h');

      expect(result.type).toBe('custom');
      expect(result.hours).toBe(3); // 6 - 3 = 3 hour window

      // Verify the time range strings are correct
      expect(result.gte).toBe('now-6h'); // 6 hours ago (earlier)
      expect(result.lte).toBe('now-3h'); // 3 hours ago (later)
    });

    it('should parse -1h-4h correctly (from 1h ago to 4h ago)', () => {
      const result = TimeRangeUtils.parseTimeRange('-1h-4h');

      expect(result.type).toBe('custom');
      expect(result.hours).toBe(3); // 4 - 1 = 3 hour window

      expect(result.gte).toBe('now-4h'); // 4 hours ago (earlier)
      expect(result.lte).toBe('now-1h'); // 1 hour ago (later)
    });

    it('should parse -2h-8h correctly', () => {
      const result = TimeRangeUtils.parseTimeRange('-2h-8h');

      expect(result.type).toBe('custom');
      expect(result.hours).toBe(6); // 8 - 2 = 6 hour window

      expect(result.gte).toBe('now-8h'); // 8 hours ago (earlier)
      expect(result.lte).toBe('now-2h'); // 2 hours ago (later)
    });

    it('should parse mixed units like -2h-1d correctly', () => {
      const result = TimeRangeUtils.parseTimeRange('-2h-1d');

      expect(result.type).toBe('custom');
      expect(result.hours).toBe(22); // 24 - 2 = 22 hour window

      expect(result.gte).toBe('now-1d'); // 1 day ago (earlier)
      expect(result.lte).toBe('now-2h'); // 2 hours ago (later)
    });

    it('should parse -1d-2d correctly (yesterday vs day before)', () => {
      const result = TimeRangeUtils.parseTimeRange('-1d-2d');

      expect(result.type).toBe('custom');
      expect(result.hours).toBe(24); // 48 - 24 = 24 hour window

      expect(result.gte).toBe('now-2d'); // 2 days ago (earlier)
      expect(result.lte).toBe('now-1d'); // 1 day ago (later)
    });
  });

  describe('Edge cases and validation', () => {
    it('should handle invalid format gracefully', () => {
      const result = TimeRangeUtils.parseTimeRange('invalid-format');
      expect(result).toEqual({
        type: 'relative',
        gte: 'now-12h',
        hours: 12
      });
    });

    it('should handle empty string', () => {
      const result = TimeRangeUtils.parseTimeRange('');
      expect(result).toEqual({
        type: 'relative',
        gte: 'now-12h',
        hours: 12
      });
    });

    it('should handle null/undefined', () => {
      const result = TimeRangeUtils.parseTimeRange(null);
      expect(result).toEqual({
        type: 'relative',
        gte: 'now-12h',
        hours: 12
      });
    });

    it('should validate different formats', () => {
      expect(TimeRangeUtils.validateTimeRange('now-6h')).toBe(true);
      expect(TimeRangeUtils.validateTimeRange('-3h-6h')).toBe(true);
      expect(TimeRangeUtils.validateTimeRange('-6h-3h')).toBe(false); // Invalid order
      expect(TimeRangeUtils.validateTimeRange('inspection_time')).toBe(true);
      expect(TimeRangeUtils.validateTimeRange('invalid')).toBe(false);
      expect(TimeRangeUtils.validateTimeRange('')).toBe(false);
    });
  });

  describe('Real-world usage scenarios', () => {
    it('should support looking at traffic during a specific incident window', () => {
      // Incident happened from 2-5 hours ago
      const result = TimeRangeUtils.parseTimeRange('-2h-5h');

      expect(result.type).toBe('custom');
      expect(result.hours).toBe(3); // 3-hour incident window
    });

    it('should support comparing different time periods', () => {
      // Compare last week same time with current
      const result = TimeRangeUtils.parseTimeRange('-168h-180h'); // 7 days ago, 12-hour window

      expect(result.type).toBe('custom');
      expect(result.hours).toBe(12);
    });

    it('should support maintenance window analysis', () => {
      // Maintenance window: 4-6 hours ago
      const result = TimeRangeUtils.parseTimeRange('-4h-6h');

      expect(result.type).toBe('custom');
      expect(result.hours).toBe(2); // 2-hour maintenance window
    });

    it('should support inspection time for post-incident analysis', () => {
      const result = TimeRangeUtils.parseTimeRange('inspection_time');
      expect(result.type).toBe('inspection');
      expect(result.hours).toBe(16); // 16-hour inspection window
    });
  });

  describe('Time range formatting', () => {
    it('should format standard ranges correctly', () => {
      expect(TimeRangeUtils.formatTimeRange('now-6h')).toBe('now-6h (6h window)');
      expect(TimeRangeUtils.formatTimeRange('now-24h')).toBe('now-24h (24h window)');
      expect(TimeRangeUtils.formatTimeRange('now-3d')).toBe('now-3d (72h window)');
    });

    it('should format custom ranges correctly', () => {
      expect(TimeRangeUtils.formatTimeRange('-3h-6h')).toBe('now-6h → now-3h (3h window)');
      expect(TimeRangeUtils.formatTimeRange('-1d-2d')).toBe('now-2d → now-1d (24h window)');
    });

    it('should format inspection time correctly', () => {
      expect(TimeRangeUtils.formatTimeRange('inspection_time')).toBe('Inspection Time (8-24h ago)');
    });
  });
});

// Test the query generation with different time ranges
describe('Query Generation with Time Ranges', () => {
  it('should generate correct filter for relative time range', () => {
    const filter = TimeRangeUtils.parseTimeRangeToFilter('now-6h');
    expect(filter).toEqual({
      gte: 'now-6h'
    });
  });

  it('should generate correct filter for custom time range', () => {
    const filter = TimeRangeUtils.parseTimeRangeToFilter('-3h-6h');
    expect(filter).toEqual({
      gte: 'now-6h',
      lte: 'now-3h'
    });
  });

  it('should generate correct filter for inspection time', () => {
    const filter = TimeRangeUtils.parseTimeRangeToFilter('inspection_time');
    expect(filter).toEqual({
      gte: 'now-24h',
      lte: 'now-8h'
    });
  });

  it('should handle invalid format with default', () => {
    const filter = TimeRangeUtils.parseTimeRangeToFilter('invalid');
    expect(filter).toEqual({
      gte: 'now-12h'
    });
  });
});
