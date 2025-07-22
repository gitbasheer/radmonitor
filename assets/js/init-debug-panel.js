/**
 * Initialize Debug Panel
 * Add this script to any page to include the debug panel
 */

(function() {
    'use strict';
    
    // Check if debug panel is already loaded
    if (window.debugPanel) {
        console.log('Debug panel already initialized');
        return;
    }
    
    // Load debug panel CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/src/styles/debug-panel.css';
    document.head.appendChild(link);
    
    // Load debug panel script
    const script = document.createElement('script');
    script.src = '/assets/js/components/debug-panel.js';
    script.onload = function() {
        console.log('Debug panel loaded');
        
        // Create debug panel instance
        const debugPanel = new window.DebugPanel();
        
        // Add to page
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.bottom = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        container.appendChild(debugPanel.render());
        document.body.appendChild(container);
        
        // Make globally accessible
        window.debugPanel = debugPanel;
        
        console.log('Debug panel initialized. Click the 🐛 Debug button to open.');
    };
    
    document.body.appendChild(script);
})();