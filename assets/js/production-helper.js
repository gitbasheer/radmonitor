/**
 * Production Helper - GitHub Pages specific functionality
 * Handles CORS instructions, production mode warnings, and environment-specific features
 */

window.ProductionHelper = (() => {
    'use strict';

    let corsModalShown = false;

    /**
     * Show CORS setup instructions modal
     */
    function showCorsInstructions() {
        if (corsModalShown) return;
        corsModalShown = true;

        const instructions = ConfigService.getCorsInstructions();
        
        // Create modal HTML
        const modalHtml = `
            <div id="corsInstructionsModal" class="modal" style="display: block; z-index: 10000;">
                <div class="modal-content" style="max-width: 600px; text-align: left;">
                    <div class="modal-header" style="background: #ff9800; color: white;">
                        <h2 style="margin: 0; color: white;">🔧 ${instructions.title}</h2>
                        <span class="close" onclick="ProductionHelper.closeCorsInstructions()">&times;</span>
                    </div>
                    <div class="modal-body" style="padding: 20px;">
                        <p><strong>${instructions.message}</strong></p>
                        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
                            ${instructions.steps.map(step => `<div style="margin: 8px 0; font-family: monospace;">${step}</div>`).join('')}
                        </div>
                        <div style="background: #e3f2fd; padding: 12px; border-radius: 6px; border-left: 4px solid #2196f3; margin: 15px 0;">
                            <strong>💡 ${instructions.note}</strong>
                        </div>
                        <div style="text-align: center; margin-top: 20px;">
                            <button onclick="ProductionHelper.closeCorsInstructions()" 
                                    style="background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 16px;">
                                Got it! I'll set up CORS
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add to page
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);

        // Auto-close on outside click
        const modal = document.getElementById('corsInstructionsModal');
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeCorsInstructions();
            }
        });

        console.log('🔧 CORS Instructions Modal shown');
    }

    /**
     * Close CORS instructions modal
     */
    function closeCorsInstructions() {
        const modal = document.getElementById('corsInstructionsModal');
        if (modal) {
            modal.remove();
        }
        localStorage.setItem('radMonitor_corsInstructionsShown', 'true');
    }

    /**
     * Check if CORS error occurred and show instructions
     */
    function handleCorsError(error) {
        if (!ConfigService.isProduction()) return false;

        const isCorsError = error.message.includes('CORS') || 
                          error.message.includes('Access to fetch') ||
                          error.name === 'TypeError' && error.message.includes('Failed to fetch');

        if (isCorsError) {
            console.warn('🚨 CORS Error detected in production mode');
            
            // Show instructions after a short delay
            setTimeout(() => {
                const alreadyShown = localStorage.getItem('radMonitor_corsInstructionsShown');
                if (!alreadyShown) {
                    showCorsInstructions();
                }
            }, 2000);
            
            return true;
        }
        return false;
    }

    /**
     * Show production environment banner
     */
    function showProductionBanner() {
        if (!ConfigService.isProduction()) return;

        const bannerHtml = `
            <div id="productionBanner" style="
                position: fixed; 
                top: 0; 
                left: 0; 
                right: 0; 
                background: linear-gradient(90deg, #4CAF50, #45a049); 
                color: white; 
                padding: 8px; 
                text-align: center; 
                font-weight: 500; 
                z-index: 9999;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            ">
                🌐 GitHub Pages Mode | Live Dashboard | ${window.location.hostname}
                <button onclick="ProductionHelper.hideBanner()" style="
                    background: rgba(255,255,255,0.2); 
                    border: none; 
                    color: white; 
                    padding: 2px 8px; 
                    margin-left: 10px; 
                    border-radius: 3px; 
                    cursor: pointer;
                    font-size: 12px;
                ">×</button>
            </div>
        `;

        const bannerContainer = document.createElement('div');
        bannerContainer.innerHTML = bannerHtml;
        document.body.insertBefore(bannerContainer, document.body.firstChild);

        // Adjust body padding to account for banner
        document.body.style.paddingTop = '35px';

        // Auto-hide after 10 seconds
        setTimeout(() => {
            hideBanner();
        }, 10000);
    }

    /**
     * Hide production banner
     */
    function hideBanner() {
        const banner = document.getElementById('productionBanner');
        if (banner) {
            banner.remove();
            document.body.style.paddingTop = '0';
        }
    }

    /**
     * Initialize production helpers
     */
    function initialize() {
        console.log('🚀 Production Helper initialized');
        
        if (ConfigService.isProduction()) {
            console.log('🌐 Running in production mode on GitHub Pages');
            
            // Check for auto-authentication
            checkAutoAuthentication();
            
            // Show production banner
            showProductionBanner();
            
            // Set up global error handler for CORS issues
            window.addEventListener('unhandledrejection', (event) => {
                if (handleCorsError(event.reason)) {
                    // Prevent the default "Uncaught (in promise)" error
                    event.preventDefault();
                }
            });

            // Override fetch to handle CORS errors
            const originalFetch = window.fetch;
            window.fetch = async (...args) => {
                try {
                    return await originalFetch(...args);
                } catch (error) {
                    if (handleCorsError(error)) {
                        // Re-throw with more context
                        throw new Error(`CORS Error: ${error.message}. Please set up CORS extension (see instructions).`);
                    }
                    throw error;
                }
            };
        }
    }
    
    /**
     * Check for auto-authentication setup
     */
    function checkAutoAuthentication() {
        // Wait for config to load
        ConfigService.subscribe((event) => {
            if (event.event === 'initialized') {
                const config = event.newConfig;
                
                if (config.dashboard?.autoAuthenticated) {
                    console.log('🔐 Auto-authentication enabled - cookie pre-configured');
                    
                    // Update the banner to show auto-auth status
                    setTimeout(() => {
                        const banner = document.getElementById('productionBanner');
                        if (banner) {
                            banner.innerHTML = banner.innerHTML.replace(
                                'GitHub Pages Mode',
                                'GitHub Pages Mode | 🔐 Auto-Authenticated'
                            );
                        }
                    }, 1000);
                } else if (config.dashboard?.skipCookiePrompt === false) {
                    console.log('🔐 Cookie prompt will be shown - no pre-configured authentication');
                }
            }
        });
    }

    /**
     * Get production status info
     */
    function getProductionInfo() {
        const env = ConfigService.getEnvironmentInfo();
        return {
            ...env,
            corsExtensionNeeded: env.isProduction,
            dashboardUrl: window.location.href,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Quick setup guide for users
     */
    function showQuickSetupGuide() {
        const isProduction = ConfigService.isProduction();
        const guide = isProduction ? {
            title: "🌐 GitHub Pages Setup",
            steps: [
                "1. Install CORS browser extension",
                "2. Enable extension for this site",
                "3. Enter your Elasticsearch cookie",
                "4. Start monitoring!"
            ]
        } : {
            title: "💻 Local Development",
            steps: [
                "1. Dashboard is ready to use",
                "2. Backend server detected",
                "3. No CORS setup needed",
                "4. Start monitoring!"
            ]
        };

        console.log(`📋 ${guide.title}:`);
        guide.steps.forEach(step => console.log(`   ${step}`));
        
        return guide;
    }

    // Public API
    return {
        initialize,
        showCorsInstructions,
        closeCorsInstructions,
        handleCorsError,
        showProductionBanner,
        hideBanner,
        getProductionInfo,
        showQuickSetupGuide,
        checkAutoAuthentication
    };
})();

// Auto-initialize when DOM is ready
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ProductionHelper.initialize);
    } else {
        ProductionHelper.initialize();
    }
} 