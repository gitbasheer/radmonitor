// tests/uiUpdates.test.js - UI update tests

import { describe, it, expect, beforeEach } from 'vitest';
import { updateDashboardUI, updateTable } from '../src/dashboard.js';

describe('UI Updates', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <div class="summary">
        <div class="card critical"><div class="card-number">0</div></div>
        <div class="card warning"><div class="card-number">0</div></div>
        <div class="card normal"><div class="card-number">0</div></div>
        <div class="card increased"><div class="card-number">0</div></div>
      </div>
      <div class="timestamp">Not updated</div>
      <table>
        <tbody></tbody>
      </table>
    `;
  });

  describe('updateDashboardUI', () => {
    it('should update summary card counts', () => {
      const mockData = {};
      const mockResults = [
        { status: 'CRITICAL' },
        { status: 'CRITICAL' },
        { status: 'WARNING' },
        { status: 'NORMAL' },
        { status: 'NORMAL' },
        { status: 'NORMAL' },
        { status: 'INCREASED' }
      ];

      updateDashboardUI(mockData, mockResults);

      expect(document.querySelector('.card.critical .card-number').textContent).toBe('2');
      expect(document.querySelector('.card.warning .card-number').textContent).toBe('1');
      expect(document.querySelector('.card.normal .card-number').textContent).toBe('3');
      expect(document.querySelector('.card.increased .card-number').textContent).toBe('1');
    });

    it('should update timestamp', () => {
      const beforeTime = Date.now();
      
      updateDashboardUI({}, []);
      
      const timestampText = document.querySelector('.timestamp').textContent;
      expect(timestampText).toContain('Last updated:');
      
      // Since we're just checking the text was updated, not parsing the actual date
      const afterTime = Date.now();
      
      // The update should have happened between beforeTime and afterTime
      // We can't reliably parse toLocaleString() output, so just check the text changed
      expect(timestampText).not.toBe('Not updated');
      expect(timestampText.length).toBeGreaterThan('Last updated: '.length);
    });

    it('should handle empty results', () => {
      updateDashboardUI({}, []);

      expect(document.querySelector('.card.critical .card-number').textContent).toBe('0');
      expect(document.querySelector('.card.warning .card-number').textContent).toBe('0');
      expect(document.querySelector('.card.normal .card-number').textContent).toBe('0');
      expect(document.querySelector('.card.increased .card-number').textContent).toBe('0');
    });

    it('should handle missing DOM elements gracefully', () => {
      // Remove some elements
      document.querySelector('.card.warning').remove();
      document.querySelector('.timestamp').remove();

      // Should not throw
      expect(() => updateDashboardUI({}, [])).not.toThrow();
    });

    it('should call updateTable with results', () => {
      const mockResults = [
        { displayName: 'test1', status: 'CRITICAL', score: -90 }
      ];

      updateDashboardUI({}, mockResults);

      // Check that table was updated
      const rows = document.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
    });
  });

  describe('updateTable', () => {
    it('should create table rows for results', () => {
      const results = [
        {
          displayName: 'feed_creategmb',
          status: 'CRITICAL',
          score: -87,
          current: 2372,
          baseline12h: 18465,
          dailyAvg: 36931,
          impact: { type: 'loss', message: 'Lost ~16,093 impressions' }
        },
        {
          displayName: 'feed_marketing',
          status: 'NORMAL',
          score: -5,
          current: 9500,
          baseline12h: 10000,
          dailyAvg: 20000,
          impact: { type: 'normal', message: 'Normal variance' }
        }
      ];

      updateTable(results);

      const rows = document.querySelectorAll('tbody tr');
      expect(rows.length).toBe(2);

      // Check first row
      const firstRow = rows[0];
      expect(firstRow.querySelector('.event-name').textContent).toBe('feed_creategmb');
      expect(firstRow.querySelector('.badge').textContent).toBe('CRITICAL');
      expect(firstRow.querySelector('.badge').classList.contains('critical')).toBe(true);
      expect(firstRow.querySelector('.score').textContent).toBe('-87%');
      expect(firstRow.querySelector('.score').classList.contains('negative')).toBe(true);
      
      // Check formatted numbers
      const cells = firstRow.querySelectorAll('.number');
      expect(cells[0].textContent).toContain('-87%'); // Score
      expect(cells[1].textContent).toBe('2,372');     // Current
      expect(cells[2].textContent).toBe('18,465');    // Baseline
      expect(cells[3].textContent).toBe('36,931');    // Daily avg
    });

    it('should handle positive scores correctly', () => {
      const results = [{
        displayName: 'feed_increased',
        status: 'INCREASED',
        score: 25,
        current: 1250,
        baseline12h: 1000,
        dailyAvg: 2000,
        impact: { type: 'gain', message: 'Gained ~250 impressions' }
      }];

      updateTable(results);

      const row = document.querySelector('tbody tr');
      expect(row.querySelector('.score').textContent).toBe('+25%');
      expect(row.querySelector('.score').classList.contains('positive')).toBe(true);
      expect(row.querySelector('.impact').classList.contains('gain')).toBe(true);
    });

    it('should clear existing table content', () => {
      // Add existing content
      document.querySelector('tbody').innerHTML = '<tr><td>Old content</td></tr>';
      
      updateTable([]);

      const rows = document.querySelectorAll('tbody tr');
      expect(rows.length).toBe(0);
    });

    it('should handle missing tbody gracefully', () => {
      document.querySelector('tbody').remove();
      
      // Should not throw
      expect(() => updateTable([])).not.toThrow();
    });

    it('should apply correct CSS classes based on status', () => {
      const results = [
        { displayName: 'critical', status: 'CRITICAL', score: -90, current: 100, baseline12h: 1000, dailyAvg: 2000, impact: { type: 'loss', message: 'Lost' } },
        { displayName: 'warning', status: 'WARNING', score: -60, current: 400, baseline12h: 1000, dailyAvg: 2000, impact: { type: 'loss', message: 'Lost' } },
        { displayName: 'normal', status: 'NORMAL', score: -10, current: 900, baseline12h: 1000, dailyAvg: 2000, impact: { type: 'normal', message: 'Normal' } },
        { displayName: 'increased', status: 'INCREASED', score: 50, current: 1500, baseline12h: 1000, dailyAvg: 2000, impact: { type: 'gain', message: 'Gained' } }
      ];

      updateTable(results);

      const badges = document.querySelectorAll('.badge');
      expect(badges[0].classList.contains('critical')).toBe(true);
      expect(badges[1].classList.contains('warning')).toBe(true);
      expect(badges[2].classList.contains('normal')).toBe(true);
      expect(badges[3].classList.contains('increased')).toBe(true);
    });

    it('should format large numbers with commas', () => {
      const results = [{
        displayName: 'large_numbers',
        status: 'NORMAL',
        score: 0,
        current: 1234567,
        baseline12h: 9876543,
        dailyAvg: 19753086,
        impact: { type: 'normal', message: 'Normal variance' }
      }];

      updateTable(results);

      const cells = document.querySelectorAll('.number');
      expect(cells[1].textContent).toBe('1,234,567');
      expect(cells[2].textContent).toBe('9,876,543');
      expect(cells[3].textContent).toBe('19,753,086');
    });

    it('should escape HTML in display names', () => {
      const results = [{
        displayName: '<script>alert("xss")</script>',
        status: 'NORMAL',
        score: 0,
        current: 100,
        baseline12h: 100,
        dailyAvg: 200,
        impact: { type: 'normal', message: 'Normal' }
      }];

      updateTable(results);

      const eventName = document.querySelector('.event-name');
      expect(eventName.textContent).toBe('<script>alert("xss")</script>');
      expect(eventName.innerHTML).not.toContain('<script>');
    });
  });

  describe('UI Integration', () => {
    it('should handle complete dashboard update', () => {
      const mockData = {};
      const mockResults = [
        {
          displayName: 'feed_apmc',
          status: 'CRITICAL',
          score: -92,
          current: 874,
          baseline12h: 10718,
          dailyAvg: 21436,
          impact: { type: 'loss', message: 'Lost ~9,844 impressions' }
        },
        {
          displayName: 'feed_marketing',
          status: 'WARNING',
          score: -55,
          current: 4500,
          baseline12h: 10000,
          dailyAvg: 20000,
          impact: { type: 'loss', message: 'Lost ~5,500 impressions' }
        },
        {
          displayName: 'feed_ssl',
          status: 'INCREASED',
          score: 120,
          current: 22000,
          baseline12h: 10000,
          dailyAvg: 20000,
          impact: { type: 'gain', message: 'Gained ~12,000 impressions' }
        }
      ];

      updateDashboardUI(mockData, mockResults);

      // Check summary
      expect(document.querySelector('.card.critical .card-number').textContent).toBe('1');
      expect(document.querySelector('.card.warning .card-number').textContent).toBe('1');
      expect(document.querySelector('.card.increased .card-number').textContent).toBe('1');

      // Check table
      const rows = document.querySelectorAll('tbody tr');
      expect(rows.length).toBe(3);

      // Check timestamp was updated
      expect(document.querySelector('.timestamp').textContent).toContain('Last updated:');
    });
  });
}); 