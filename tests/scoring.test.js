// tests/scoring.test.js - Score calculation and status tests

import { describe, it, expect } from 'vitest';
import { calculateScore, getStatus, calculateImpact } from '../assets/js/data-processor.js';

describe('Score Calculation', () => {
  describe('calculateScore', () => {
    it('should calculate score for traffic drop', () => {
      expect(calculateScore(100, 200)).toBe(-50); // 50% drop
      expect(calculateScore(50, 200)).toBe(-75);  // 75% drop
      expect(calculateScore(20, 200)).toBe(-90);  // 90% drop
    });

    it('should calculate score for traffic increase', () => {
      expect(calculateScore(300, 200)).toBe(50);   // 50% increase
      expect(calculateScore(400, 200)).toBe(100);  // 100% increase
      expect(calculateScore(240, 200)).toBe(20);   // 20% increase
    });

    it('should return 0 when baseline is 0', () => {
      expect(calculateScore(100, 0)).toBe(0);
      expect(calculateScore(0, 0)).toBe(0);
    });

    it('should handle edge cases', () => {
      expect(calculateScore(0, 100)).toBe(-100);   // 100% drop
      expect(calculateScore(200, 200)).toBe(0);    // No change
      expect(calculateScore(199, 200)).toBe(0);    // Slight drop rounds to 0
    });

    it('should round to nearest integer', () => {
      expect(calculateScore(133, 200)).toBe(-33);  // 33.5% -> -33 (Math.round rounds 0.5 down for negative)
      expect(calculateScore(267, 200)).toBe(34);   // 33.5% -> 34%
    });
  });

  describe('getStatus', () => {
    describe('High volume cards (>=1000 daily)', () => {
      const highVolume = 1000;

      it('should return CRITICAL for score <= -80', () => {
        expect(getStatus(-80, highVolume)).toBe('CRITICAL');
        expect(getStatus(-90, highVolume)).toBe('CRITICAL');
        expect(getStatus(-100, highVolume)).toBe('CRITICAL');
      });

      it('should return WARNING for score <= -50 and > -80', () => {
        expect(getStatus(-50, highVolume)).toBe('WARNING');
        expect(getStatus(-60, highVolume)).toBe('WARNING');
        expect(getStatus(-79, highVolume)).toBe('WARNING');
      });

      it('should return NORMAL for negative scores > -50', () => {
        expect(getStatus(-49, highVolume)).toBe('NORMAL');
        expect(getStatus(-30, highVolume)).toBe('NORMAL');
        expect(getStatus(-10, highVolume)).toBe('NORMAL');
        expect(getStatus(-1, highVolume)).toBe('NORMAL');
      });

      it('should return INCREASED for positive scores', () => {
        expect(getStatus(1, highVolume)).toBe('INCREASED');
        expect(getStatus(50, highVolume)).toBe('INCREASED');
        expect(getStatus(100, highVolume)).toBe('INCREASED');
      });

      it('should return NORMAL for score = 0', () => {
        expect(getStatus(0, highVolume)).toBe('NORMAL');
      });
    });

    describe('Medium volume cards (100-999 daily)', () => {
      const mediumVolume = 500;

      it('should return CRITICAL for score <= -80', () => {
        expect(getStatus(-80, mediumVolume)).toBe('CRITICAL');
        expect(getStatus(-90, mediumVolume)).toBe('CRITICAL');
      });

      it('should return WARNING for score <= -30 and > -80', () => {
        expect(getStatus(-30, mediumVolume)).toBe('WARNING');
        expect(getStatus(-40, mediumVolume)).toBe('WARNING');
        expect(getStatus(-50, mediumVolume)).toBe('WARNING');
        expect(getStatus(-60, mediumVolume)).toBe('WARNING');
        expect(getStatus(-79, mediumVolume)).toBe('WARNING');
      });

      it('should return NORMAL for negative scores > -30', () => {
        expect(getStatus(-29, mediumVolume)).toBe('NORMAL');
        expect(getStatus(-20, mediumVolume)).toBe('NORMAL');
        expect(getStatus(-1, mediumVolume)).toBe('NORMAL');
      });

      it('should return INCREASED for positive scores', () => {
        expect(getStatus(1, mediumVolume)).toBe('INCREASED');
        expect(getStatus(50, mediumVolume)).toBe('INCREASED');
      });
    });

    describe('Edge cases', () => {
      it('should handle boundary values for high volume', () => {
        expect(getStatus(-50, 1000)).toBe('WARNING');  // Exactly 1000
        expect(getStatus(-50, 999)).toBe('WARNING');   // Just below 1000
      });

      it('should handle very low volume', () => {
        expect(getStatus(-90, 100)).toBe('CRITICAL');
        expect(getStatus(-40, 100)).toBe('WARNING');
      });

      it('should handle extreme scores', () => {
        expect(getStatus(-200, 1000)).toBe('CRITICAL');
        expect(getStatus(500, 1000)).toBe('INCREASED');
      });
    });
  });

  describe('calculateImpact', () => {
    it('should return normal variance for small differences', () => {
      const impact = calculateImpact(100, 110);
      expect(impact.type).toBe('normal');
      expect(impact.message).toBe('Normal variance');
    });

    it('should calculate loss impact', () => {
      const impact = calculateImpact(1000, 2000);
      expect(impact.type).toBe('loss');
      expect(impact.message).toBe('Lost ~1,000 impressions');
    });

    it('should calculate gain impact', () => {
      const impact = calculateImpact(3000, 2000);
      expect(impact.type).toBe('gain');
      expect(impact.message).toBe('Gained ~1,000 impressions');
    });

    it('should handle large numbers with proper formatting', () => {
      const impact = calculateImpact(10000, 50000);
      expect(impact.type).toBe('loss');
      expect(impact.message).toBe('Lost ~40,000 impressions');
    });

    it('should handle edge cases', () => {
      // Exactly 50 difference
      const impact1 = calculateImpact(100, 150);
      expect(impact1.type).toBe('loss');
      expect(impact1.message).toBe('Lost ~50 impressions');

      // Just under 50 difference
      const impact2 = calculateImpact(100, 149);
      expect(impact2.type).toBe('normal');
      expect(impact2.message).toBe('Normal variance');
    });

    it('should handle zero values', () => {
      const impact1 = calculateImpact(0, 100);
      expect(impact1.type).toBe('loss');
      expect(impact1.message).toBe('Lost ~100 impressions');

      const impact2 = calculateImpact(100, 0);
      expect(impact2.type).toBe('gain');
      expect(impact2.message).toBe('Gained ~100 impressions');

      const impact3 = calculateImpact(0, 0);
      expect(impact3.type).toBe('normal');
      expect(impact3.message).toBe('Normal variance');
    });
  });

  describe('Scoring integration scenarios', () => {
    it('should handle critical traffic drop scenario', () => {
      const current = 200;
      const baseline = 2000;
      const dailyAvg = 4000;

      const score = calculateScore(current, baseline);
      const status = getStatus(score, dailyAvg);
      const impact = calculateImpact(current, baseline);

      expect(score).toBe(-90);
      expect(status).toBe('CRITICAL');
      expect(impact.type).toBe('loss');
      expect(impact.message).toBe('Lost ~1,800 impressions');
    });

    it('should handle warning scenario for medium volume', () => {
      const current = 300;
      const baseline = 500;
      const dailyAvg = 800;

      const score = calculateScore(current, baseline);
      const status = getStatus(score, dailyAvg);
      const impact = calculateImpact(current, baseline);

      expect(score).toBe(-40);
      expect(status).toBe('WARNING');
      expect(impact.type).toBe('loss');
      expect(impact.message).toBe('Lost ~200 impressions');
    });

    it('should handle traffic increase scenario', () => {
      const current = 1500;
      const baseline = 1000;
      const dailyAvg = 2000;

      const score = calculateScore(current, baseline);
      const status = getStatus(score, dailyAvg);
      const impact = calculateImpact(current, baseline);

      expect(score).toBe(50);
      expect(status).toBe('INCREASED');
      expect(impact.type).toBe('gain');
      expect(impact.message).toBe('Gained ~500 impressions');
    });

    it('should handle normal variance scenario', () => {
      const current = 980;
      const baseline = 1000;
      const dailyAvg = 2000;

      const score = calculateScore(current, baseline);
      const status = getStatus(score, dailyAvg);
      const impact = calculateImpact(current, baseline);

      expect(score).toBe(-2);
      expect(status).toBe('NORMAL');
      expect(impact.type).toBe('normal');
      expect(impact.message).toBe('Normal variance');
    });
  });
});
