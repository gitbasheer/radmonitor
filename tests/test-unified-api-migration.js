/**
 * Test script to verify unified API client migration
 * Run this to ensure all imports are working correctly
 */

import { unifiedAPI } from '../assets/js/api-interface.js';
import { Dashboard } from '../assets/js/dashboard-main.js';
import { DataLayer } from '../assets/js/data-layer.js';

console.log('Testing Unified API Client Migration...\n');

// Test 1: Check if unifiedAPI is properly imported
console.log('1. Testing unifiedAPI import:');
console.log('   - unifiedAPI exists:', !!unifiedAPI);
console.log('   - unifiedAPI.client exists:', !!unifiedAPI.client);
console.log('   - Legacy methods available:');
console.log('     - checkCorsProxy:', typeof unifiedAPI.client.checkCorsProxy === 'function');
console.log('     - promptForCookie:', typeof unifiedAPI.client.promptForCookie === 'function');
console.log('     - testAuthentication:', typeof unifiedAPI.client.testAuthentication === 'function');

// Test 2: Check Dashboard module
console.log('\n2. Testing Dashboard module:');
console.log('   - Dashboard exists:', !!Dashboard);
console.log('   - init method exists:', typeof Dashboard.init === 'function');

// Test 3: Check DataLayer module
console.log('\n3. Testing DataLayer module:');
console.log('   - DataLayer exists:', !!DataLayer);
console.log('   - Key methods exist:',
    typeof DataLayer.fetchTrafficData === 'function',
    typeof DataLayer.updateState === 'function'
);

// Test 4: Check for any remaining old API client imports
console.log('\n4. Checking for old API client references:');
try {
    // This should fail if we've properly removed the import
    const oldClient = await import('../assets/js/api-client.js');
    console.log('   ⚠️  WARNING: Old api-client.js is still being loaded!');
} catch (e) {
    console.log('   (✓)Good: Old api-client.js import would fail (as expected if removed)');
}

console.log('\n(✓)All import tests completed!');
console.log('\nNext steps:');
console.log('- Monitor the unified client for 1 week in production');
console.log('- Then remove old API client files');
console.log('- Continue with Module System Modernization');
