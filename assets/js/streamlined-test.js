/**
 * Streamlined Test Script
 * Quick test to verify authentication and data flow
 */

export const StreamlinedTest = {
    async testAuthFlow() {
        console.log('🧪 Testing streamlined authentication flow...\n');

        // Step 1: Check initial auth status
        console.log('1️⃣ Checking initial auth status...');
        const authStatus = await window.authService.checkAuth();
        console.log('   Auth status:', authStatus);

        // Step 2: Test API connection
        console.log('\n2️⃣ Testing API connection...');
        const apiClient = window.apiClient || window.SimplifiedAPIClient?.prototype;
        if (!apiClient) {
            console.error('❌ API client not found');
            return;
        }

        // Step 3: Check if cookie is being sent
        console.log('\n3️⃣ Checking cookie headers...');
        const testRequest = async () => {
            try {
                const response = await fetch('/health', {
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                console.log('   Health check response:', response.status);

                // Check if we have a cookie
                const cookie = window.CentralizedAuth?.getCookie?.() ||
                              localStorage.getItem('elasticCookie');
                console.log('   Cookie available:', !!cookie);

                if (cookie) {
                    console.log('   Cookie format:', cookie.substring(0, 20) + '...');
                }
            } catch (error) {
                console.error('   Health check failed:', error);
            }
        };

        await testRequest();

        // Step 4: Test data loading
        console.log('\n4️⃣ Testing data service...');
        const dataService = window.dataService;
        if (dataService) {
            const state = dataService.getState();
            console.log('   Data state:', {
                hasData: state.data.length > 0,
                loading: state.loading,
                error: state.error,
                authenticated: authStatus.authenticated
            });
        }

        console.log('\n✅ Test complete!');
        console.log('💡 If authentication failed, click TEST CONNECTION to set cookie');
    },

    async debugCookie() {
        console.log('🍪 Debugging cookie state...\n');

        // Check all cookie sources
        const sources = {
            CentralizedAuth: window.CentralizedAuth?.getCookie?.(),
            localStorage: (() => {
                try {
                    const saved = localStorage.getItem('elasticCookie');
                    return saved ? JSON.parse(saved).cookie : null;
                } catch (e) {
                    return null;
                }
            })(),
            authService: (await window.authService?.checkAuth())?.cookie
        };

        console.log('Cookie sources:');
        Object.entries(sources).forEach(([source, value]) => {
            console.log(`  ${source}:`, value ? `${value.substring(0, 30)}...` : 'Not found');
        });

        // Test cookie format
        const cookie = sources.CentralizedAuth || sources.localStorage || sources.authService;
        if (cookie) {
            console.log('\nCookie analysis:');
            console.log('  Starts with sid=:', cookie.startsWith('sid='));
            console.log('  Starts with Fe26.2:', cookie.startsWith('Fe26.2'));
            console.log('  Length:', cookie.length);
        } else {
            console.log('\n❌ No cookie found in any source');
        }
    },

    async clearAndRetest() {
        console.log('🧹 Clearing auth and retesting...\n');

        // Clear all auth
        await window.authService?.clearAuth();
        localStorage.removeItem('elasticCookie');
        if (window.CentralizedAuth?.clearCookie) {
            window.CentralizedAuth.clearCookie();
        }

        console.log('✅ Auth cleared');
        console.log('🔄 Refreshing page in 2 seconds...');

        setTimeout(() => {
            window.location.reload();
        }, 2000);
    }
};

// Make available globally
window.StreamlinedTest = StreamlinedTest;

console.log('🧪 Streamlined test loaded!');
console.log('   Run: StreamlinedTest.testAuthFlow()');
console.log('   Debug: StreamlinedTest.debugCookie()');
console.log('   Reset: StreamlinedTest.clearAndRetest()');
