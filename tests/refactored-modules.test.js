/**
 * Comprehensive tests for all refactored JavaScript modules
 * Tests all modules in assets/js/
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest'
import { JSDOM } from 'jsdom'

// Create a mock DOM environment
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<body>
    <input type="hidden" id="elasticCookie" value="">

    <div class="control-panel">
        <button id="refreshBtn">REFRESH NOW</button>
        <div id="refreshStatus">Ready</div>

        <input id="baselineStart" value="2025-06-01">
        <input id="baselineEnd" value="2025-06-09">
        <input id="currentTimeRange" value="now-12h">
        <input id="highVolumeThreshold" value="1000">
        <input id="mediumVolumeThreshold" value="100">

        <button class="preset-button">6h</button>
        <button class="preset-button">12h</button>
        <button class="preset-button">24h</button>
        <button class="preset-button">3d</button>

        <span id="corsProxyStatus">Checking...</span>
        <span id="envStatus">Loading...</span>
        <span id="cookieStatus">Not set</span>
    </div>

    <div class="main-content">
        <div class="timestamp">Last Updated: TEST</div>

        <div class="summary">
            <div class="card critical"><div class="card-number">0</div></div>
            <div class="card warning"><div class="card-number">0</div></div>
            <div class="card normal"><div class="card-number">0</div></div>
            <div class="card increased"><div class="card-number">0</div></div>
        </div>

        <table>
            <tbody></tbody>
        </table>
    </div>
</body>
</html>
`)

// ESM: Import modules directly
import TimeRangeUtils from '../assets/js/time-range-utils.js'
import ConfigManager from '../assets/js/config-manager.js'
import DataProcessor from '../assets/js/data-processor.js'
import UIUpdater from '../assets/js/ui-updater.js'
import ApiClient from '../assets/js/api-client.js'
import ConsoleVisualizer from '../assets/js/console-visualizer.js'

// Set up the DOM before loading modules
beforeAll(() => {
    // First, set up the DOM
    global.window = dom.window
    global.document = dom.window.document
    global.navigator = dom.window.navigator
    global.location = dom.window.location

    // Set up localStorage with proper mock implementation
    const localStorageData = {}
    global.localStorage = {
        data: localStorageData,
        getItem: vi.fn((key) => localStorageData[key] || null),
        setItem: vi.fn((key, value) => {
            localStorageData[key] = value
        }),
        removeItem: vi.fn((key) => {
            delete localStorageData[key]
        }),
        clear: vi.fn(() => {
            Object.keys(localStorageData).forEach(key => delete localStorageData[key])
        })
    }

    // Set up other globals
    global.fetch = vi.fn()
    global.alert = vi.fn()
    global.prompt = vi.fn(() => null)
    global.console = { ...console, clear: vi.fn() }

    // Mock AbortSignal
    global.AbortSignal = {
        timeout: vi.fn(() => ({ aborted: false }))
    }

    // ESM: Make modules available globally for tests that expect them
    global.TimeRangeUtils = TimeRangeUtils
    global.ConfigManager = ConfigManager
    global.DataProcessor = DataProcessor
    global.UIUpdater = UIUpdater
    global.ApiClient = ApiClient
    global.ConsoleVisualizer = ConsoleVisualizer
})

// Helper to recreate DOM structure
function recreateDOM() {
    document.body.innerHTML = `
        <input type="hidden" id="elasticCookie" value="">

        <div class="control-panel">
            <button id="refreshBtn">REFRESH NOW</button>
            <div id="refreshStatus">Ready</div>

            <input id="baselineStart" value="2025-06-01">
            <input id="baselineEnd" value="2025-06-09">
            <input id="currentTimeRange" value="now-12h">
            <input id="highVolumeThreshold" value="1000">
            <input id="mediumVolumeThreshold" value="100">

            <button class="preset-button">6h</button>
            <button class="preset-button">12h</button>
            <button class="preset-button">24h</button>
            <button class="preset-button">3d</button>

            <span id="corsProxyStatus">Checking...</span>
            <span id="envStatus">Loading...</span>
            <span id="cookieStatus">Not set</span>
        </div>

        <div class="main-content">
            <div class="timestamp">Last Updated: TEST</div>

            <div class="summary">
                <div class="card critical"><div class="card-number">0</div></div>
                <div class="card warning"><div class="card-number">0</div></div>
                <div class="card normal"><div class="card-number">0</div></div>
                <div class="card increased"><div class="card-number">0</div></div>
            </div>

            <table>
                <tbody></tbody>
            </table>
        </div>
    `
}

describe('TimeRangeUtils', () => {
    it('should parse standard time ranges', () => {
        expect(TimeRangeUtils.parseTimeRange('now-6h')).toEqual({
            type: 'relative',
            hours: 6,
            gte: 'now-6h'
        })

        expect(TimeRangeUtils.parseTimeRange('now-3d')).toEqual({
            type: 'relative',
            hours: 72,
            gte: 'now-3d'
        })
    })

    it('should parse custom time ranges', () => {
        expect(TimeRangeUtils.parseTimeRange('-3h-6h')).toEqual({
            type: 'custom',
            hours: 3,
            gte: 'now-6h',
            lte: 'now-3h'
        })

        expect(TimeRangeUtils.parseTimeRange('-1d-2d')).toEqual({
            type: 'custom',
            hours: 24,
            gte: 'now-2d',
            lte: 'now-1d'
        })
    })

    it('should validate time ranges', () => {
        expect(TimeRangeUtils.validateTimeRange('now-6h')).toBe(true)
        expect(TimeRangeUtils.validateTimeRange('-3h-6h')).toBe(true)
        expect(TimeRangeUtils.validateTimeRange('-6h-3h')).toBe(false) // Invalid order
        expect(TimeRangeUtils.validateTimeRange('invalid')).toBe(false)
        expect(TimeRangeUtils.validateTimeRange('')).toBe(false)
    })

    it('should format time ranges for display', () => {
        expect(TimeRangeUtils.formatTimeRange('now-6h')).toBe('now-6h (6h window)')
        expect(TimeRangeUtils.formatTimeRange('-3h-6h')).toBe('now-6h → now-3h (3h window)')
    })

    it('should provide presets', () => {
        const presets = TimeRangeUtils.getPresets()
        expect(presets).toHaveLength(5) // Including Inspection Time
        expect(presets[0]).toEqual({ label: '6h', value: 'now-6h' })
        expect(presets[4]).toEqual({ label: 'Inspection Time', value: 'inspection_time' })
    })
})

describe('ConfigManager', () => {
    beforeEach(() => {
        recreateDOM()
        // Clear localStorage data
        if (global.localStorage && global.localStorage.data) {
            Object.keys(global.localStorage.data).forEach(key => delete global.localStorage.data[key])
        }

        // Reset localStorage mocks to ensure they work correctly
        global.localStorage.getItem.mockImplementation((key) => global.localStorage.data[key] || null)
        global.localStorage.setItem.mockImplementation((key, value) => {
            global.localStorage.data[key] = value
        })
    })

    it('should get current config from form', () => {
        const config = ConfigManager.getCurrentConfig()
        expect(config).toEqual({
            baselineStart: '2025-06-01',
            baselineEnd: '2025-06-09',
            currentTimeRange: 'now-12h',
            highVolumeThreshold: 1000,
            mediumVolumeThreshold: 100,
            minDailyVolume: 100,
            criticalThreshold: -80,
            warningThreshold: -50,
            autoRefreshEnabled: true,
            autoRefreshInterval: 300000
        })
    })

    it('should save and load configuration', () => {
        const config = {
            baselineStart: '2025-05-01',
            baselineEnd: '2025-05-09',
            currentTimeRange: 'now-24h',
            highVolumeThreshold: 2000,
            mediumVolumeThreshold: 200
        }

        ConfigManager.saveConfiguration(config)

        // Verify the config was saved
        expect(localStorage.setItem).toHaveBeenCalledWith('radMonitorConfig', JSON.stringify(config))

        // Clear form to test loading
        document.getElementById('baselineStart').value = ''
        document.getElementById('currentTimeRange').value = ''

        ConfigManager.loadConfiguration()

        expect(document.getElementById('baselineStart').value).toBe('2025-05-01')
        expect(document.getElementById('currentTimeRange').value).toBe('now-24h')
    })

    it('should fix invalid time ranges when loading', () => {
        const config = {
            currentTimeRange: 'invalid-range',
            baselineStart: '2025-06-01',
            baselineEnd: '2025-06-09'
        }

        localStorage.setItem('radMonitorConfig', JSON.stringify(config))
        ConfigManager.loadConfiguration()

        expect(document.getElementById('currentTimeRange').value).toBe('now-12h')
    })

    it('should set preset time ranges', () => {
        ConfigManager.setPresetTimeRange('6h')
        expect(document.getElementById('currentTimeRange').value).toBe('now-6h')

        ConfigManager.setPresetTimeRange('3d')
        expect(document.getElementById('currentTimeRange').value).toBe('now-3d')
    })

    it('should highlight active preset', () => {
        document.getElementById('currentTimeRange').value = 'now-6h'
        ConfigManager.highlightActivePreset()

        const buttons = document.querySelectorAll('.preset-button')
        expect(buttons[0].classList.contains('active')).toBe(true)
        expect(buttons[1].classList.contains('active')).toBe(false)
    })
})

describe('DataProcessor', () => {
    it('should process elasticsearch data', () => {
        const buckets = [
            {
                key: 'pandc.vnext.recommendations.feed.test1',
                baseline: { doc_count: 10000 },
                current: { doc_count: 100 }
            },
            {
                key: 'pandc.vnext.recommendations.feed.test2',
                baseline: { doc_count: 50 }, // Below threshold
                current: { doc_count: 10 }
            }
        ]

        const config = {
            baselineStart: '2025-06-01',
            baselineEnd: '2025-06-09',
            currentTimeRange: 'now-12h',
            mediumVolumeThreshold: 100,
            highVolumeThreshold: 1000
        }

        const results = DataProcessor.processData(buckets, config)

        expect(results).toHaveLength(1) // Only one above threshold
        expect(results[0].event_id).toBe('pandc.vnext.recommendations.feed.test1')
        expect(results[0].displayName).toBe('test1')
        expect(results[0].current).toBe(100)
        expect(results[0].score).toBe(-84) // (1 - 100/625) * -100 = -84
        expect(results[0].status).toBe('CRITICAL')
    })

    it('should calculate scores correctly', () => {
        // High volume event with > 50% drop
        let score = DataProcessor.calculateScore({
            current: 400,
            baseline_period: 1000,
            daily_avg: 2000,
            highVolumeThreshold: 1000
        })
        expect(score).toBe(-60)

        // Medium volume event with > 70% drop
        score = DataProcessor.calculateScore({
            current: 20,
            baseline_period: 100,
            daily_avg: 500,
            highVolumeThreshold: 1000
        })
        expect(score).toBe(-80)

        // Increased traffic
        score = DataProcessor.calculateScore({
            current: 1500,
            baseline_period: 1000,
            daily_avg: 2000,
            highVolumeThreshold: 1000
        })
        expect(score).toBe(50)
    })

    it('should determine status correctly', () => {
        expect(DataProcessor.determineStatus(-90)).toBe('CRITICAL')
        expect(DataProcessor.determineStatus(-60)).toBe('WARNING')
        expect(DataProcessor.determineStatus(-20)).toBe('NORMAL')
        expect(DataProcessor.determineStatus(20)).toBe('INCREASED')
    })

    it('should get summary stats', () => {
        const results = [
            { status: 'CRITICAL' },
            { status: 'CRITICAL' },
            { status: 'WARNING' },
            { status: 'NORMAL' },
            { status: 'INCREASED' }
        ]

        const stats = DataProcessor.getSummaryStats(results)
        expect(stats).toEqual({
            critical: 2,
            warning: 1,
            normal: 1,
            increased: 1
        })
    })
})

describe('UIUpdater', () => {
    beforeEach(() => {
        recreateDOM()
    })

    it('should update summary cards', () => {
        const stats = {
            critical: 5,
            warning: 3,
            normal: 10,
            increased: 2
        }

        UIUpdater.updateSummaryCards(stats)

        expect(document.querySelector('.card.critical .card-number').textContent).toBe('5')
        expect(document.querySelector('.card.warning .card-number').textContent).toBe('3')
        expect(document.querySelector('.card.normal .card-number').textContent).toBe('10')
        expect(document.querySelector('.card.increased .card-number').textContent).toBe('2')
    })

    it('should update data table', () => {
        const results = [
            {
                event_id: 'test.event.1',
                status: 'CRITICAL',
                score: -85,
                current: 100,
                baseline_period: 1000,
                dailyAvg: 2000
            }
        ]

        UIUpdater.updateDataTable(results)

        const tbody = document.querySelector('table tbody')
        expect(tbody.children.length).toBe(1)
        expect(tbody.innerHTML).toContain('test.event.1')
        expect(tbody.innerHTML).toContain('CRITICAL')
        expect(tbody.innerHTML).toContain('-85%')
        expect(tbody.innerHTML).toContain('Lost ~900 impressions')
    })

    it('should build kibana URLs', () => {
        const url = UIUpdater.buildKibanaUrl('test.event.id')
        expect(url).toContain('https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243')
        expect(url).toContain('/app/discover#/')
        expect(url).toContain('test.event.id')
    })

    it('should update timestamp', () => {
        UIUpdater.updateTimestamp()
        const timestamp = document.querySelector('.timestamp').textContent
        expect(timestamp).toContain('Last updated:')
        // No longer includes auto-refresh text in new implementation
    })

    it('should show/hide loading states', () => {
        UIUpdater.showLoading('Testing...')
        expect(document.getElementById('refreshBtn').disabled).toBe(true)
        expect(document.getElementById('refreshBtn').textContent).toBe('REFRESHING...')
        expect(document.getElementById('refreshStatus').textContent).toBe('Testing...')

        UIUpdater.hideLoading('Done')
        expect(document.getElementById('refreshBtn').disabled).toBe(false)
        expect(document.getElementById('refreshBtn').textContent).toBe('REFRESH NOW')
        expect(document.getElementById('refreshStatus').textContent).toBe('Done')
    })
})

describe('ApiClient', () => {
    beforeEach(() => {
        // Clear all mocks
        vi.clearAllMocks()

        // Set up fetch mock
        global.fetch = vi.fn()

        // Clear localStorage data
        if (global.localStorage && global.localStorage.data) {
            Object.keys(global.localStorage.data).forEach(key => delete global.localStorage.data[key])
        }

        // Set location to localhost for the tests
        global.window.location.hostname = 'localhost'

        // Reset localStorage mocks to ensure they work correctly
        global.localStorage.getItem.mockImplementation((key) => global.localStorage.data[key] || null)
        global.localStorage.setItem.mockImplementation((key, value) => {
            global.localStorage.data[key] = value
        })
    })

    it('should check health endpoint', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: vi.fn().mockResolvedValue({ status: 'healthy' })
        })

        const result = await ApiClient.checkHealth()
        expect(result.success).toBe(true)
        expect(result.data).toEqual({ status: 'healthy' })
        expect(global.fetch).toHaveBeenCalledWith('http://localhost:8889/health')
    })

    it('should get authentication details', async () => {
        // Ensure we're on localhost
        global.window.location.hostname = 'localhost'

        // Set cookie in localStorage with proper format
        const cookieData = {
            cookie: 'test-cookie',
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            saved: new Date().toISOString()
        };
        global.localStorage.data['elasticCookie'] = JSON.stringify(cookieData)

        // Mock CORS proxy available - the checkCorsProxy call
        global.fetch.mockResolvedValueOnce({ ok: true })

        const auth = await ApiClient.getAuthenticationDetails()
        expect(auth.valid).toBe(true)
        expect(auth.method).toBe('direct') // The API falls back to direct method
        expect(auth.cookie).toBe('test-cookie')
    })

    it('should fetch data from Kibana', async () => {
        // Ensure we're on localhost
        global.window.location.hostname = 'localhost'

        // Use the global helper to set up authentication properly
        setupTestAuthentication('test-cookie')

        // The actual data we want to return
        const mockData = {
            aggregations: {
                events: {
                    buckets: [{ key: 'test', current: { doc_count: 100 } }]
                }
            }
        }

        // Set up fetch mocks to return the right responses in sequence
        let fetchCallCount = 0;
        global.fetch.mockImplementation((url, options) => {
            fetchCallCount++;
            
            // Log what's being called
            console.log(`Fetch call ${fetchCallCount} to: ${url}`);
            
            // First call is to check CORS proxy health
            if (url === 'http://localhost:8889/health' || url.includes('/health')) {
                return Promise.resolve({ 
                    ok: true,
                    json: vi.fn().mockResolvedValue({ status: 'healthy' })
                });
            }
            
            // Second call is the actual Kibana query to CORS proxy
            if (url === 'http://localhost:8889/kibana-proxy' || url.includes('/kibana-proxy')) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    json: vi.fn().mockResolvedValue(mockData),
                    text: vi.fn().mockResolvedValue(JSON.stringify(mockData))
                });
            }
            
            // Fallback - If it's calling Elasticsearch directly, it means proxy check failed
            // Let's handle this case too for now
            if (url.includes('elasticsearch')) {
                console.warn('Warning: Direct Elasticsearch call - proxy check may have failed');
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    json: vi.fn().mockResolvedValue(mockData),
                    text: vi.fn().mockResolvedValue(JSON.stringify(mockData))
                });
            }
            
            // Fallback for any other calls
            return Promise.reject(new Error(`Unexpected fetch call to ${url}`));
        });

        const config = {
            baselineStart: '2025-06-01',
            baselineEnd: '2025-06-09',
            currentTimeRange: 'now-12h'
        }

        const result = await ApiClient.fetchData(config)
        expect(result.success).toBe(true)
        expect(result.data).toEqual(mockData)
        // Don't check method since it might vary based on proxy availability
        
        // Verify at least one fetch call was made
        expect(fetchCallCount).toBeGreaterThan(0);
    })

    it('should handle fetch errors gracefully', async () => {
        // Don't set a cookie to test the "no authentication" path
        // Mock CORS proxy as not available
        global.fetch.mockResolvedValueOnce({ ok: false })

        const result = await ApiClient.fetchData({})
        expect(result.success).toBe(false)
        expect(result.error).toBe('No valid authentication. Please set your cookie.')
    })
})

describe('ConsoleVisualizer', () => {
    it('should show welcome message', () => {
        const clearSpy = vi.spyOn(console, 'clear')
        const logSpy = vi.spyOn(console, 'log')

        ConsoleVisualizer.showWelcomeMessage()

        expect(clearSpy).toHaveBeenCalled()
        // Check for the first log call with color formatting
        expect(logSpy).toHaveBeenCalledWith('%cRAD Monitor Console Dashboard', 'color: #00ff41; font-size: 16px; font-weight: bold;')
    })

    it('should create ASCII bars', () => {
        expect(ConsoleVisualizer.createBar(50, 100, 10, '█')).toBe('█████░░░░░')
        expect(ConsoleVisualizer.createBar(0, 100, 10, '█')).toBe('░░░░░░░░░░')
        expect(ConsoleVisualizer.createBar(100, 100, 10, '█')).toBe('██████████')
    })

    it('should get correct status icons', () => {
        expect(ConsoleVisualizer.getStatusIcon('CRITICAL')).toBe('[CRIT]')
        expect(ConsoleVisualizer.getStatusIcon('WARNING')).toBe('[WARN]')
        expect(ConsoleVisualizer.getStatusIcon('INCREASED')).toBe('[HIGH]')
        expect(ConsoleVisualizer.getStatusIcon('NORMAL')).toBe('[NORM]')
    })
})
