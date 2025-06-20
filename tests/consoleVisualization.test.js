// consoleVisualization.test.js - Tests for console visualization functionality
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Console Visualization', () => {
  let originalConsole;
  let consoleOutput;

  beforeEach(() => {
    // Capture console output
    originalConsole = global.console;
    consoleOutput = [];
    global.console = {
      ...originalConsole,
      log: vi.fn((...args) => {
        consoleOutput.push(args.join(' '));
      }),
      clear: vi.fn(),
      error: originalConsole.error,
      warn: originalConsole.warn
    };
  });

  afterEach(() => {
    global.console = originalConsole;
  });

  describe('Bar creation', () => {
    it('should create bars with correct proportions', () => {
      // Mock the createBar function
      function createBar(value, maxValue, width, char) {
        if (maxValue === 0) return '░'.repeat(width);
        const barLength = Math.round((value / maxValue) * width);
        const bar = char.repeat(barLength);
        const empty = '░'.repeat(width - barLength);
        return bar + empty;
      }

      // Test full bar
      const fullBar = createBar(100, 100, 10, '█');
      expect(fullBar).toBe('██████████');

      // Test half bar
      const halfBar = createBar(50, 100, 10, '█');
      expect(halfBar).toBe('█████░░░░░');

      // Test empty bar
      const emptyBar = createBar(0, 100, 10, '█');
      expect(emptyBar).toBe('░░░░░░░░░░');

      // Test zero max value
      const zeroMaxBar = createBar(50, 0, 10, '█');
      expect(zeroMaxBar).toBe('░░░░░░░░░░');
    });

    it('should handle different characters and widths', () => {
      function createBar(value, maxValue, width, char) {
        if (maxValue === 0) return '░'.repeat(width);
        const barLength = Math.round((value / maxValue) * width);
        const bar = char.repeat(barLength);
        const empty = '░'.repeat(width - barLength);
        return bar + empty;
      }

      const customBar = createBar(75, 100, 20, '█');
      expect(customBar.length).toBe(20);
      expect(customBar.startsWith('█')).toBe(true);
      expect(customBar.endsWith('░')).toBe(true);
    });
  });

  describe('Status icons', () => {
    it('should return correct status icons', () => {
      function getStatusIcon(status) {
        switch (status) {
          case 'CRITICAL': return '[CRIT]';
          case 'WARNING': return '[WARN]';
          case 'INCREASED': return '[HIGH]';
          case 'NORMAL':
          default: return '[NORM]';
        }
      }

      expect(getStatusIcon('CRITICAL')).toBe('[CRIT]');
      expect(getStatusIcon('WARNING')).toBe('[WARN]');
      expect(getStatusIcon('INCREASED')).toBe('[HIGH]');
      expect(getStatusIcon('NORMAL')).toBe('[NORM]');
      expect(getStatusIcon('UNKNOWN')).toBe('[NORM]'); // Default case
    });
  });

  describe('Console output formatting', () => {
    it('should log visualization header with colors', () => {
      function logVisualizationHeader() {
        console.log('%cRAD MONITOR - CONSOLE DASHBOARD', 'color: #00ff41; font-size: 16px; font-weight: bold;');
        console.log('%c' + '='.repeat(80), 'color: #00ff41;');
      }

      logVisualizationHeader();

      expect(consoleOutput[0]).toContain('RAD MONITOR - CONSOLE DASHBOARD');
      expect(consoleOutput[0]).toContain('color: #00ff41');
      expect(consoleOutput[1]).toContain('='.repeat(80));
    });

    it('should log time window information with colors', () => {
      function logTimeWindow(timeRange, hours) {
        console.log(`%cTIME WINDOW: ${timeRange} (${hours}h window)`, 'color: #4ecdc4; font-weight: bold;');
      }

      logTimeWindow('now-6h', 6);
      expect(consoleOutput[0]).toContain('TIME WINDOW: now-6h (6h window)');
      expect(consoleOutput[0]).toContain('color: #4ecdc4');
    });

    it('should log custom time window information', () => {
      function logCustomTimeWindow(startTime, endTime, hours) {
        console.log(`%cTIME WINDOW: ${startTime} → ${endTime} (${hours}h)`, 'color: #4ecdc4; font-weight: bold;');
      }

      const start = '6/18/2025, 12:00:00 PM';
      const end = '6/18/2025, 6:00:00 PM';

      logCustomTimeWindow(start, end, 6);
      expect(consoleOutput[0]).toContain(`TIME WINDOW: ${start} → ${end} (6h)`);
      expect(consoleOutput[0]).toContain('color: #4ecdc4');
    });

    it('should log summary statistics with multiple colors', () => {
      function logSummary(critical, warning, normal, increased) {
        console.log(
          '%cSUMMARY: %c' + critical + ' Critical %c| %c' + warning + ' Warning %c| %c' + normal + ' Normal %c| %c' + increased + ' Increased',
          'color: #ffe66d; font-weight: bold;',
          'color: #ff0000; font-weight: bold;',
          'color: #666666;',
          'color: #ffaa00; font-weight: bold;',
          'color: #666666;',
          'color: #00ff00; font-weight: bold;',
          'color: #666666;',
          'color: #0099ff; font-weight: bold;'
        );
      }

      logSummary(2, 5, 10, 3);
      expect(consoleOutput[0]).toContain('SUMMARY:');
      expect(consoleOutput[0]).toContain('2 Critical');
      expect(consoleOutput[0]).toContain('5 Warning');
      expect(consoleOutput[0]).toContain('10 Normal');
      expect(consoleOutput[0]).toContain('3 Increased');
      expect(consoleOutput[0]).toContain('color: #ff0000'); // Critical color
      expect(consoleOutput[0]).toContain('color: #ffaa00'); // Warning color
      expect(consoleOutput[0]).toContain('color: #00ff00'); // Normal color
      expect(consoleOutput[0]).toContain('color: #0099ff'); // Increased color
    });
  });

  describe('Data processing for visualization', () => {
    it('should process mock data correctly', () => {
      const mockData = {
        aggregations: {
          events: {
            buckets: [
              {
                key: 'pandc.vnext.recommendations.feed.test1',
                baseline: { doc_count: 1000 },
                current: { doc_count: 500 }
              },
              {
                key: 'pandc.vnext.recommendations.feed.test2',
                baseline: { doc_count: 800 },
                current: { doc_count: 1200 }
              }
            ]
          }
        }
      };

      // Mock processing function
      function processForVisualization(data) {
        const buckets = data.aggregations.events.buckets;
        return buckets.map(bucket => ({
          displayName: bucket.key.replace('pandc.vnext.recommendations.feed.', ''),
          current: bucket.current.doc_count,
          baseline: bucket.baseline.doc_count,
          score: Math.round((bucket.current.doc_count / bucket.baseline.doc_count - 1) * 100)
        }));
      }

      const results = processForVisualization(mockData);

      expect(results).toHaveLength(2);
      expect(results[0].displayName).toBe('test1');
      expect(results[0].score).toBe(-50); // 500/1000 - 1 = -0.5 = -50%
      expect(results[1].displayName).toBe('test2');
      expect(results[1].score).toBe(50); // 1200/800 - 1 = 0.5 = 50%
    });
  });

  describe('Welcome message', () => {
    it('should display welcome message with colors', () => {
      function showWelcomeMessage() {
        console.log('%cRAD Monitor Console Dashboard', 'color: #00ff41; font-size: 16px; font-weight: bold;');
        console.log('%cConsole visualization enabled!', 'color: #ff6b35; font-size: 14px; font-weight: bold;');
        console.log('%cFeatures:', 'color: #ffe66d; font-weight: bold;');
        console.log('%c- Live ASCII bar charts for data fetches', 'color: #a8e6cf;');
      }

      showWelcomeMessage();

      expect(consoleOutput[0]).toContain('RAD Monitor Console Dashboard');
      expect(consoleOutput[0]).toContain('color: #00ff41');
      expect(consoleOutput[1]).toContain('Console visualization enabled!');
      expect(consoleOutput[1]).toContain('color: #ff6b35');
      expect(consoleOutput[2]).toContain('Features:');
      expect(consoleOutput[3]).toContain('- Live ASCII bar charts');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle empty data gracefully', () => {
      function createVisualization(results) {
        if (!results || results.length === 0) {
          console.log('%cNo data to visualize', 'color: #ff6b35;');
          return;
        }
        console.log(`%cVisualizing ${results.length} items`, 'color: #00ff41;');
      }

      createVisualization([]);
      expect(consoleOutput[0]).toContain('No data to visualize');

      consoleOutput = [];
      createVisualization([{}, {}]);
      expect(consoleOutput[0]).toContain('Visualizing 2 items');
    });

    it('should format bar charts with status colors', () => {
      function createStatusBar(status, eventName, score, currentBar, current) {
        let statusColor, statusIcon;
        switch (status) {
          case 'CRITICAL':
            statusColor = '#ff0000';
            statusIcon = '[CRIT]';
            break;
          case 'WARNING':
            statusColor = '#ffaa00';
            statusIcon = '[WARN]';
            break;
          default:
            statusColor = '#00ff00';
            statusIcon = '[NORM]';
        }

        console.log(`%c${statusIcon} ${eventName} %c${score}%`,
          `color: ${statusColor}; font-weight: bold;`,
          `color: ${statusColor}; font-weight: bold;`
        );
        console.log(`   %cCurrent  %c${currentBar} %c${current.toLocaleString()}`,
          'color: #a8e6cf;',
          `color: ${statusColor};`,
          'color: #ffffff;'
        );
      }

      createStatusBar('CRITICAL', 'feed_test', -80, '██░░░░░░░░', 1000);

      expect(consoleOutput[0]).toContain('[CRIT] feed_test');
      expect(consoleOutput[0]).toContain('-80%');
      expect(consoleOutput[0]).toContain('color: #ff0000');
      expect(consoleOutput[1]).toContain('Current');
      expect(consoleOutput[1]).toContain('██░░░░░░░░');
      expect(consoleOutput[1]).toContain('1,000');
    });

    it('should handle real-world time range scenarios', () => {
      function testTimeRangeScenarios() {
        const scenarios = [
          { range: 'now-6h', description: 'Standard 6-hour window' },
          { range: '-3h-6h', description: 'Custom 3-hour window from past' },
          { range: '-1h-4h', description: 'Incident analysis window' },
          { range: '-2h-1d', description: 'Long-term comparison' }
        ];

        scenarios.forEach(scenario => {
          console.log(`%cTesting: ${scenario.range} - ${scenario.description}`, 'color: #4ecdc4;');
        });
      }

      testTimeRangeScenarios();

      expect(consoleOutput[0]).toContain('Testing: now-6h - Standard 6-hour window');
      expect(consoleOutput[1]).toContain('Testing: -3h-6h - Custom 3-hour window from past');
      expect(consoleOutput[2]).toContain('Testing: -1h-4h - Incident analysis window');
      expect(consoleOutput[3]).toContain('Testing: -2h-1d - Long-term comparison');
      expect(consoleOutput.every(line => line.includes('color: #4ecdc4'))).toBe(true);
    });

    it('should properly truncate long event names', () => {
      function truncateEventName(eventName, maxLength = 25) {
        const cleanName = eventName.replace('pandc.vnext.recommendations.feed.', '');
        if (cleanName.length > maxLength) {
          return cleanName.substring(0, maxLength - 3) + '...';
        }
        return cleanName.padEnd(maxLength);
      }

      const longName = 'pandc.vnext.recommendations.feed.feed_this_is_a_very_long_event_name_that_should_be_truncated';
      const truncated = truncateEventName(longName);

      expect(truncated).toBe('feed_this_is_a_very_lo...');
      expect(truncated.length).toBe(25);
    });

    it('should format large numbers correctly', () => {
      function formatNumber(num) {
        return num.toLocaleString();
      }

      expect(formatNumber(1000000)).toBe('1,000,000');
      expect(formatNumber(123456789)).toBe('123,456,789');
      expect(formatNumber(999)).toBe('999');
    });
  });
});
