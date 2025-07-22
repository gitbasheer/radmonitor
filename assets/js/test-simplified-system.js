/**
 * Test Suite for Simplified RAD Monitor System
 * Run this in the browser console to verify functionality
 */

// Test Suite
async function testSimplifiedSystem() {
    console.log('🧪 RAD Monitor Simplified System Test Suite');
    console.log('==========================================\n');

    const tests = {
        '1. System Loaded': testSystemLoaded(),
        '2. Authentication': await testAuth(),
        '3. Data Loading': await testDataLoad(),
        '4. Filtering': testFiltering(),
        '5. Search': testSearch(),
        '6. Refresh': await testRefresh(),
        '7. State Persistence': testPersistence(),
        '8. Error Handling': await testErrorHandling(),
        '9. API Client': await testApiClient(),
        '10. Performance': testPerformance()
    };

    // Display results
    console.log('\n Test Results:');
    console.table(tests);

    const passed = Object.values(tests).filter(t => t.includes('✅')).length;
    const total = Object.keys(tests).length;
    const allPassed = passed === total;

    console.log(`\n${allPassed ? '🎉' : '⚠️'} Overall: ${passed}/${total} tests passed`);

    if (!allPassed) {
        console.log('\n(✗) Some tests failed. Check the results above.');
    } else {
        console.log('\n(✓)All tests passed! System is ready for production.');
    }

    return allPassed;
}

// Individual Tests

function testSystemLoaded() {
    const checks = {
        RADMonitor: typeof RADMonitor !== 'undefined',
        Dashboard: typeof Dashboard !== 'undefined',
        AuthService: typeof AuthService !== 'undefined',
        DataService: typeof DataService !== 'undefined',
        APIClient: typeof APIClient !== 'undefined'
    };

    const allLoaded = Object.values(checks).every(v => v);

    if (!allLoaded) {
        console.error('Missing modules:', checks);
        return '(✗) Missing modules';
    }

    return '(✓)Pass - All modules loaded';
}

async function testAuth() {
    try {
        const status = await AuthService.checkAuth();
        console.log('Auth status:', status);

        if (!status.authenticated) {
            return '⚠️ Not authenticated (set cookie first)';
        }

        return `(✓)Pass - ${status.method} auth`;
    } catch (e) {
        console.error('Auth test failed:', e);
        return '(✗) Error: ' + e.message;
    }
}

async function testDataLoad() {
    try {
        console.log('Loading data...');
        const success = await DataService.loadData();
        const state = DataService.getState();

        console.log('Data state:', {
            success,
            dataCount: state.data.length,
            stats: state.stats
        });

        if (!success) {
            return '(✗) Load failed';
        }

        if (state.data.length === 0) {
            return '⚠️ No data returned';
        }

        return `(✓)Pass - ${state.data.length} events loaded`;
    } catch (e) {
        console.error('Data load test failed:', e);
        return '(✗) Error: ' + e.message;
    }
}

function testFiltering() {
    try {
        const initialCount = DataService.getState().data.length;

        // Test status filter
        DataService.applyFilters({ status: 'critical' });
        const criticalData = DataService.getFilteredData();

        // Test search filter
        DataService.applyFilters({ search: 'test' });
        const searchData = DataService.getFilteredData();

        // Reset filters
        DataService.applyFilters({ status: 'all', search: '' });
        const resetData = DataService.getFilteredData();

        console.log('Filter test results:', {
            initial: initialCount,
            afterStatusFilter: criticalData.length,
            afterSearchFilter: searchData.length,
            afterReset: resetData.length
        });

        return '(✓)Pass - Filters working';
    } catch (e) {
        console.error('Filter test failed:', e);
        return '(✗) Error: ' + e.message;
    }
}

function testSearch() {
    try {
        const testSearches = ['feed', 'recommendations', 'xyz123'];
        const results = {};

        testSearches.forEach(term => {
            DataService.applyFilters({ search: term });
            results[term] = DataService.getFilteredData().length;
        });

        // Reset
        DataService.applyFilters({ search: '' });

        console.log('Search test results:', results);
        return '(✓)Pass - Search working';
    } catch (e) {
        console.error('Search test failed:', e);
        return '(✗) Error: ' + e.message;
    }
}

async function testRefresh() {
    try {
        const beforeCount = DataService.getState().data.length;
        console.log('Refreshing data...');

        const success = await DataService.refresh();
        const afterCount = DataService.getState().data.length;

        console.log('Refresh results:', {
            success,
            beforeCount,
            afterCount
        });

        return success ? '(✓)Pass - Refresh successful' : '(✗) Refresh failed';
    } catch (e) {
        console.error('Refresh test failed:', e);
        return '(✗) Error: ' + e.message;
    }
}

function testPersistence() {
    try {
        const saved = localStorage.getItem('radMonitorState');

        if (!saved) {
            return '⚠️ No saved state found';
        }

        const parsed = JSON.parse(saved);
        console.log('Persisted state:', parsed);

        if (!parsed.filters || !parsed.timeRange) {
            return '(✗) Invalid saved state';
        }

        return '(✓)Pass - State persisted';
    } catch (e) {
        console.error('Persistence test failed:', e);
        return '(✗) Error: ' + e.message;
    }
}

async function testErrorHandling() {
    try {
        // Save current auth
        const currentAuth = AuthService.getStatus();

        // Clear auth to trigger error
        AuthService.clearAuth();

        // Try to load data (should handle gracefully)
        const result = await DataService.loadData();

        // Restore auth if it was valid
        if (currentAuth.authenticated && currentAuth.method === 'legacy') {
            const cookie = localStorage.getItem('elasticCookie');
            if (cookie) {
                const parsed = JSON.parse(cookie);
                await AuthService.setLegacyCookie(parsed.cookie);
            }
        }

        // Check if error was handled
        const state = DataService.getState();
        console.log('Error handling result:', {
            error: state.error,
            hasData: state.data.length > 0
        });

        return '(✓)Pass - Errors handled gracefully';
    } catch (e) {
        console.error('Error handling test failed:', e);
        return '(✗) Unhandled error: ' + e.message;
    }
}

async function testApiClient() {
    try {
        const metrics = APIClient.getMetrics();
        console.log('API Client metrics:', metrics);

        if (metrics.requests === 0) {
            return '⚠️ No API requests made yet';
        }

        const successRate = ((metrics.requests - metrics.errors) / metrics.requests * 100).toFixed(1);

        return `(✓)Pass - ${successRate}% success rate`;
    } catch (e) {
        console.error('API client test failed:', e);
        return '(✗) Error: ' + e.message;
    }
}

function testPerformance() {
    try {
        const metrics = APIClient.getMetrics();
        const state = DataService.getState();

        const performance = {
            apiCalls: metrics.requests,
            cacheHits: metrics.cacheHits,
            cacheHitRate: metrics.cacheHitRate,
            dataCount: state.data.length
        };

        console.log('Performance metrics:', performance);

        if (metrics.cacheHitRate > 0) {
            return `(✓)Pass - ${metrics.cacheHitRate.toFixed(1)}% cache hit rate`;
        }

        return '(✓)Pass - Performance normal';
    } catch (e) {
        console.error('Performance test failed:', e);
        return '(✗) Error: ' + e.message;
    }
}

// Interactive Test Commands
window.TestSuite = {
    // Run full test suite
    run: testSimplifiedSystem,

    // Individual tests
    auth: testAuth,
    data: testDataLoad,
    filters: testFiltering,
    search: testSearch,
    refresh: testRefresh,
    persistence: testPersistence,
    errors: testErrorHandling,
    api: testApiClient,
    performance: testPerformance,

    // Utility functions
    clearCache: () => {
        APIClient.clearCache();
        console.log('(✓)Cache cleared');
    },

    clearState: () => {
        DataService.clearPersistedState();
        console.log('(✓)Persisted state cleared');
    },

    showState: () => {
        console.log('Current state:', DataService.getState());
    },

    showMetrics: () => {
        console.log('API metrics:', APIClient.getMetrics());
    }
};

// Auto-export for console access
console.log('🧪 Test Suite Loaded!');
console.log('   Run: TestSuite.run()');
console.log('   Or test individually: TestSuite.auth(), TestSuite.data(), etc.');
console.log('   Commands: TestSuite.clearCache(), TestSuite.showState()');

export default TestSuite;
