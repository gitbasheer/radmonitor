/**
 * Main Dashboard Entry Point
 * Coordinates initialization of all dashboard components
 */

import { appStore, useActions } from './stores/app-store.js';
import { SimplifiedDashboard } from './dashboard-simplified.js';
import './stores/dom-effects.js'; // Auto-initializes DOM effects

// Create global Dashboard instance
const dashboard = new SimplifiedDashboard();

// Dashboard initialization is now handled by main-clean.js
// This prevents double initialization

// Export dashboard instance for use in main-clean.js
window.SimplifiedDashboard = SimplifiedDashboard;

// Export for use in other modules
export { dashboard };