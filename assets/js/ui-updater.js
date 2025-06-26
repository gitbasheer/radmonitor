/**
 * UI Updater for RAD Monitor Dashboard
 * Handles all DOM updates and UI interactions
 */

// ESM: Converted from IIFE to ES module export
export const UIUpdater = (() => {
    'use strict';

    /**
     * Update summary cards with statistics
     */
    function updateSummaryCards(stats) {
        // Update using the correct class name 'value' instead of 'card-number'
        const critical = document.getElementById('criticalCount');
        const warning = document.getElementById('warningCount');
        const normal = document.getElementById('normalCount');
        const increased = document.getElementById('increasedCount');

        if (critical) critical.textContent = stats.critical || 0;
        if (warning) warning.textContent = stats.warning || 0;
        if (normal) normal.textContent = stats.normal || 0;
        if (increased) increased.textContent = stats.increased || 0;
    }

    /**
     * Update data table with results
     */
    function updateDataTable(results) {
        const tbody = document.querySelector('table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        for (const item of results) {
            const score = item.score || 0;
            const score_class = score < 0 ? 'negative' : 'positive';
            const score_text = `${score > 0 ? '+' : ''}${score}%`;

            const current = item.current || 0;
            const baseline = item.baseline_period || item.baseline12h || 0;
            const diff = current - baseline;

            let impact, impact_class;
            if (diff < -50) {
                impact = `Lost ~${Math.abs(diff).toLocaleString()} impressions`;
                impact_class = 'loss';
            } else if (diff > 50) {
                impact = `Gained ~${diff.toLocaleString()} impressions`;
                impact_class = 'gain';
            } else {
                impact = 'Normal variance';
                impact_class = '';
            }

            const eventId = item.event_id || item.eventId || item.displayName || '';
            const kibanaUrl = buildKibanaUrl(eventId);

            // Get RAD type configuration
            const radType = item.rad_type || 'unknown';
            const config = ConfigService.getConfig();
            const radConfig = config.rad_types?.[radType] || {};
            const radDisplayName = radConfig.display_name || radType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const radColor = radConfig.color || '#666';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><a href="${kibanaUrl}" target="_blank" class="event-link">
                    <span class="event-name">${item.displayName || eventId}</span>
                </a></td>
                <td><span class="rad-type-badge" style="background: ${radColor}; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: 600;">${radDisplayName}</span></td>
                <td><span class="badge ${(item.status || 'normal').toLowerCase()}">${item.status || 'NORMAL'}</span></td>
                <td class="number"><span class="score ${score_class}">${score_text}</span></td>
                <td class="number">${current.toLocaleString()}</td>
                <td class="number">${baseline.toLocaleString()}</td>
                <td><span class="impact ${impact_class}">${impact}</span></td>
            `;
            tbody.appendChild(row);
        }

        // Refresh search/filter state after table update
        if (typeof SearchFilter !== 'undefined' && SearchFilter.refresh) {
            SearchFilter.refresh();
        }
    }

    /**
     * Build Kibana URL for event
     */
    function buildKibanaUrl(event_id) {
        const base_url = "https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243";
        const discover_path = "/app/discover#/";

        const params =
            "?_g=(filters:!(),refreshInterval:(pause:!t,value:0)," +
            "time:(from:'2025-05-28T16:50:47.243Z',to:now))" +
            "&_a=(columns:!(),filters:!(('$state':(store:appState)," +
            `meta:(alias:!n,disabled:!f,key:detail.event.data.traffic.eid.keyword,` +
            `negate:!f,params:(query:'${event_id}'),type:phrase),` +
            `query:(match_phrase:(detail.event.data.traffic.eid.keyword:'${event_id}')))),` +
            "grid:(columns:(detail.event.data.traffic.eid.keyword:(width:400)))," +
            "hideChart:!f,index:'traffic-*',interval:auto,query:(language:kuery,query:''),sort:!())";

        return base_url + discover_path + params;
    }

    /**
     * Update timestamp
     */
    function updateTimestamp() {
        const now = new Date();
        const timestamp = document.querySelector('.timestamp');
        if (timestamp) {
            timestamp.textContent = `Last updated: ${now.toLocaleString()}`;
        }
    }

    /**
     * Update API status indicators
     */
    async function updateApiStatus() {
        const isLocalhost = window.location.hostname === 'localhost';
        const statusEl = document.getElementById('refreshStatus');
        const corsStatusEl = document.getElementById('corsProxyStatus');
        const envStatusEl = document.getElementById('envStatus');
        const cookieStatusEl = document.getElementById('cookieStatus');

        // Don't override authentication error messages, but add a timeout to prevent permanent lockup
        if (statusEl && statusEl.dataset.authRequired === 'true') {
            const authErrorTime = statusEl.dataset.authErrorTime;
            const now = Date.now();
            
            // If auth error has been showing for more than 30 seconds, clear it
            if (authErrorTime && (now - parseInt(authErrorTime)) > 30000) {
                delete statusEl.dataset.authRequired;
                delete statusEl.dataset.authErrorTime;
            } else {
                console.log('⏭️ SKIPPING status update - authentication error is showing');
                return;
            }
        }

        // If FastAPI is working, don't test legacy auth
        const fastAPIWorking = window.FastAPIIntegration && window.FastAPIIntegration.getStatus().enabled;
        if (fastAPIWorking) {
            console.log('⏭️ SKIPPING auth test - FastAPI integration is working');
        }

        // Update environment status
        if (envStatusEl) {
            envStatusEl.textContent = isLocalhost ? 'Local Dev' : 'GitHub Pages';
        }

        // Update cookie status
        const hasCookie = localStorage.getItem('elasticCookie');
        if (cookieStatusEl) {
            cookieStatusEl.textContent = hasCookie ? 'Set' : 'Not set';
            cookieStatusEl.style.color = hasCookie ? '#388e3c' : '#d32f2f';
        }

        if (isLocalhost) {
            // Check CORS proxy status
            const proxyRunning = await ApiClient.checkCorsProxy();

            if (corsStatusEl) {
                corsStatusEl.textContent = proxyRunning ? 'Running' : 'Not running';
                corsStatusEl.style.color = proxyRunning ? '#388e3c' : '#d32f2f';
            }

            // Update main status message (only if no auth error is showing)
            if (statusEl) {
                if (!proxyRunning) {
                    statusEl.innerHTML = `Start CORS proxy for real-time | <a href="#" onclick="Dashboard.showApiSetupInstructions(); return false;" style="color: #333;">Instructions</a>`;
                } else if (!hasCookie) {
                    statusEl.innerHTML = `CORS proxy ready - need cookie | <a href="#" onclick="Dashboard.setCookieForRealtime(); return false;" style="color: #333;">Set Cookie</a> | <a href="#" onclick="Dashboard.showApiSetupInstructions(); return false;" style="color: #333;">Setup</a>`;
                } else {
                    // We have both proxy and cookie
                    if (fastAPIWorking) {
                        // FastAPI is working, so auth is good
                        statusEl.innerHTML = `Ready for real-time! | <a href="#" onclick="Dashboard.testApiConnection(); return false;" style="color: #333;">Test API</a> | <a href="#" onclick="Dashboard.showApiSetupInstructions(); return false;" style="color: #333;">Setup</a>`;
                    } else {
                        // Test legacy auth with timeout
                        statusEl.innerHTML = `Testing authentication... | <a href="#" onclick="Dashboard.setCookieForRealtime(); return false;" style="color: #333;">Update Cookie</a>`;
                        
                        // Add timeout to auth test to prevent hanging
                        const authTestPromise = ApiClient.testAuthentication();
                        const timeoutPromise = new Promise((resolve) => {
                            setTimeout(() => resolve({ success: false, error: 'Authentication test timed out' }), 5000);
                        });
                        
                        try {
                            const testResult = await Promise.race([authTestPromise, timeoutPromise]);
                            if (testResult.success) {
                                statusEl.innerHTML = `Ready for real-time! | <a href="#" onclick="Dashboard.testApiConnection(); return false;" style="color: #333;">Test API</a> | <a href="#" onclick="Dashboard.showApiSetupInstructions(); return false;" style="color: #333;">Setup</a>`;
                            } else {
                                statusEl.innerHTML = `Cookie invalid - need valid cookie | <a href="#" onclick="Dashboard.setCookieForRealtime(); return false;" style="color: #d32f2f;">Fix Cookie</a> | <a href="#" onclick="Dashboard.showApiSetupInstructions(); return false;" style="color: #333;">Help</a>`;
                            }
                        } catch (error) {
                            statusEl.innerHTML = `Cookie test failed | <a href="#" onclick="Dashboard.setCookieForRealtime(); return false;" style="color: #d32f2f;">Fix Cookie</a> | <a href="#" onclick="Dashboard.showApiSetupInstructions(); return false;" style="color: #333;">Help</a>`;
                        }
                    }
                }
                // Clear auth flag when successfully updating status
                delete statusEl.dataset.authRequired;
                delete statusEl.dataset.authErrorTime;
            }
        } else {
            // GitHub Pages - no CORS proxy needed
            if (corsStatusEl) {
                corsStatusEl.textContent = 'Not needed';
                corsStatusEl.style.color = '#666';
            }

            if (statusEl) {
                if (!hasCookie) {
                    statusEl.innerHTML = `Auto-refresh: 45 minutes | <a href="#" onclick="Dashboard.setCookieForRealtime(); return false;" style="color: #333;">Enable Real-time</a>`;
                } else {
                    // We have a cookie
                    if (fastAPIWorking) {
                        // FastAPI is working, so auth is good
                        statusEl.innerHTML = `Real-time enabled | <a href="#" onclick="Dashboard.testApiConnection(); return false;" style="color: #333;">Test API</a> | <a href="#" onclick="Dashboard.setCookieForRealtime(); return false;" style="color: #333;">Update Cookie</a>`;
                    } else {
                        // Test legacy auth with timeout
                        statusEl.innerHTML = `Testing authentication... | <a href="#" onclick="Dashboard.setCookieForRealtime(); return false;" style="color: #333;">Update Cookie</a>`;
                        
                        // Add timeout to auth test to prevent hanging
                        const authTestPromise = ApiClient.testAuthentication();
                        const timeoutPromise = new Promise((resolve) => {
                            setTimeout(() => resolve({ success: false, error: 'Authentication test timed out' }), 5000);
                        });
                        
                        try {
                            const testResult = await Promise.race([authTestPromise, timeoutPromise]);
                            if (testResult.success) {
                                statusEl.innerHTML = `Real-time enabled | <a href="#" onclick="Dashboard.testApiConnection(); return false;" style="color: #333;">Test API</a> | <a href="#" onclick="Dashboard.setCookieForRealtime(); return false;" style="color: #333;">Update Cookie</a>`;
                            } else {
                                statusEl.innerHTML = `Cookie invalid - need valid cookie | <a href="#" onclick="Dashboard.setCookieForRealtime(); return false;" style="color: #d32f2f;">Fix Cookie</a>`;
                            }
                        } catch (error) {
                            statusEl.innerHTML = `Cookie test failed | <a href="#" onclick="Dashboard.setCookieForRealtime(); return false;" style="color: #d32f2f;">Fix Cookie</a>`;
                        }
                    }
                }
                // Clear auth flag when successfully updating status
                delete statusEl.dataset.authRequired;
                delete statusEl.dataset.authErrorTime;
            }
        }
    }

    /**
     * Set authentication error state with timestamp
     */
    function setAuthenticationError(message) {
        const statusEl = document.getElementById('refreshStatus');
        if (statusEl) {
            statusEl.innerHTML = message;
            statusEl.dataset.authRequired = 'true';
            statusEl.dataset.authErrorTime = Date.now().toString();
        }
    }

    /**
     * Clear authentication error state
     */
    function clearAuthenticationError() {
        const statusEl = document.getElementById('refreshStatus');
        if (statusEl) {
            delete statusEl.dataset.authRequired;
            delete statusEl.dataset.authErrorTime;
        }
    }

    /**
     * Show loading state
     */
    function showLoading(message = 'Loading...') {
        const refreshBtn = document.getElementById('refreshBtn');
        const status = document.getElementById('refreshStatus');
        const loadingIndicator = document.getElementById('loadingIndicator');

        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.textContent = 'REFRESHING...';
        }

        if (status) {
            status.textContent = message;
        }
        
        // Show the visual loading indicator
        if (loadingIndicator) {
            loadingIndicator.style.display = 'flex';
            const loadingText = loadingIndicator.querySelector('span');
            if (loadingText) {
                loadingText.textContent = message;
            }
        }
    }

    /**
     * Hide loading state
     */
    function hideLoading(message = 'Ready') {
        const refreshBtn = document.getElementById('refreshBtn');
        const status = document.getElementById('refreshStatus');
        const loadingIndicator = document.getElementById('loadingIndicator');

        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.textContent = 'REFRESH NOW';
        }

        if (status) {
            status.textContent = message;
        }
        
        // Hide the visual loading indicator
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }

    /**
     * Update CORS proxy status indicator
     */
    function updateProxyStatusIndicator(isRunning, errorMessage = null) {
        let indicator = document.getElementById('corsProxyIndicator');
        let banner = document.getElementById('corsProxyBanner');

        // Create indicator if it doesn't exist
        if (!indicator) {
            const container = document.querySelector('.container');
            const header = container.querySelector('h1');

            // Create indicator element
            indicator = document.createElement('span');
            indicator.id = 'corsProxyIndicator';
            indicator.style.cssText = `
                display: inline-block;
                width: 10px;
                height: 10px;
                border-radius: 50%;
                margin-left: 10px;
                vertical-align: middle;
                transition: all 0.3s ease;
            `;

            // Add to header
            header.appendChild(indicator);

            // Create tooltip
            const tooltip = document.createElement('span');
            tooltip.style.cssText = `
                display: none;
                position: absolute;
                background: #333;
                color: white;
                padding: 5px 10px;
                border-radius: 4px;
                font-size: 12px;
                margin-left: 15px;
                white-space: nowrap;
                z-index: 1000;
            `;
            indicator.appendChild(tooltip);

            // Show tooltip on hover
            indicator.addEventListener('mouseenter', () => {
                tooltip.style.display = 'block';
            });
            indicator.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
            });
        }

        const tooltip = indicator.querySelector('span');

        // Update indicator based on status
        if (isRunning === null) {
            // GitHub Pages - no indicator needed
            indicator.style.display = 'none';
        } else if (isRunning) {
            // CORS proxy is running
            indicator.style.display = 'inline-block';
            indicator.style.backgroundColor = '#4caf50';
            indicator.style.boxShadow = '0 0 5px rgba(76, 175, 80, 0.5)';
            tooltip.textContent = 'CORS Proxy: Running';

            // Remove banner if it exists
            if (banner) {
                banner.remove();
            }
        } else {
            // CORS proxy is not running
            indicator.style.display = 'inline-block';
            indicator.style.backgroundColor = '#f44336';
            indicator.style.boxShadow = '0 0 5px rgba(244, 67, 54, 0.5)';
            tooltip.textContent = errorMessage || 'CORS Proxy: Not Running';

            // Show warning banner if not already shown
            if (!banner) {
                banner = document.createElement('div');
                banner.id = 'corsProxyBanner';
                banner.style.cssText = `
                    background-color: #fff3cd;
                    border: 1px solid #ffeaa7;
                    color: #856404;
                    padding: 12px 20px;
                    margin-bottom: 20px;
                    border-radius: 4px;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                `;
                banner.innerHTML = `
                    <span>⚠️ CORS proxy is not running. Real-time data updates are unavailable.</span>
                    <a href="#" onclick="Dashboard.showApiSetupInstructions(); return false;" style="color: #856404; text-decoration: underline;">
                        Setup Instructions
                    </a>
                `;

                const container = document.querySelector('.container');
                const footer = container.querySelector('.footer-content') || container.querySelector('footer');
                if (footer) {
                    container.insertBefore(banner, footer.parentElement);
                } else {
                    // Fallback: insert before the first table if footer not found
                    const table = container.querySelector('table');
                    if (table) {
                        container.insertBefore(banner, table);
                    } else {
                        container.appendChild(banner);
                    }
                }
            }
        }
    }

    /**
     * Create and update performance metrics widget
     */
    function updatePerformanceWidget() {
        let widget = document.getElementById('performanceWidget');

        // Create widget if it doesn't exist
        if (!widget) {
            const container = document.querySelector('.container');
            const footer = container.querySelector('.footer');

            widget = document.createElement('div');
            widget.id = 'performanceWidget';
            widget.style.cssText = `
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 8px;
                padding: 15px 20px;
                margin: 30px 0 20px 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 13px;
                color: #666;
            `;

            container.insertBefore(widget, footer);
        }

        // Get current metrics
        const metrics = DataLayer.getPerformanceMetrics();

        // Format metrics for display
        const avgDuration = metrics.averageQueryDuration > 0
            ? `${metrics.averageQueryDuration}ms`
            : 'N/A';

        const cacheRate = metrics.cacheHitRate > 0
            ? `${metrics.cacheHitRate}%`
            : 'N/A';

        const failRate = (metrics.cacheHits + metrics.cacheMisses + metrics.failedQueries) > 0
            ? Math.round((metrics.failedQueries / (metrics.cacheHits + metrics.cacheMisses + metrics.failedQueries)) * 100)
            : 0;

        // Update widget content
        widget.innerHTML = `
            <div style="display: flex; gap: 30px;">
                <div>
                    <strong style="color: #333;">Avg Query Time:</strong>
                    <span style="color: ${metrics.averageQueryDuration > 3000 ? '#dc3545' : metrics.averageQueryDuration > 1000 ? '#ffc107' : '#28a745'};">
                        ${avgDuration}
                    </span>
                </div>
                <div>
                    <strong style="color: #333;">Cache Hit Rate:</strong>
                    <span style="color: ${metrics.cacheHitRate > 70 ? '#28a745' : metrics.cacheHitRate > 50 ? '#ffc107' : '#dc3545'};">
                        ${cacheRate}
                    </span>
                </div>
                <div>
                    <strong style="color: #333;">Failed Queries:</strong>
                    <span style="color: ${metrics.failedQueries === 0 ? '#28a745' : metrics.failedQueries < 3 ? '#ffc107' : '#dc3545'};">
                        ${metrics.failedQueries}
                    </span>
                </div>
                <div>
                    <strong style="color: #333;">Reliability:</strong>
                    <span style="color: ${failRate === 0 ? '#28a745' : failRate < 10 ? '#ffc107' : '#dc3545'};">
                        ${100 - failRate}%
                    </span>
                </div>
            </div>
            <div>
                <a href="#" onclick="Dashboard.showPerformanceStats(); return false;" style="color: #007bff; text-decoration: none;">
                    View Details →
                </a>
            </div>
        `;
    }

    /**
     * Initialize RAD type filter buttons
     */
    function initializeRadTypeFilters() {
        const container = document.getElementById('radTypeButtons');
        if (!container) return;

        // Clear existing buttons
        container.innerHTML = '';

        // Get RAD types from config
        const config = ConfigService.getConfig();
        const radTypes = config.rad_types || {};

        // Add "All" button
        const allBtn = document.createElement('button');
        allBtn.className = 'filter-btn rad-filter-btn active';
        allBtn.dataset.radType = 'all';
        allBtn.textContent = 'ALL';
        allBtn.onclick = function() {
            // Toggle all selection
            const radButtons = document.querySelectorAll('.rad-filter-btn');
            const isActive = this.classList.contains('active');
            
            if (!isActive) {
                // Activate all
                radButtons.forEach(btn => btn.classList.add('active'));
            } else {
                // Keep at least this one active
                radButtons.forEach(btn => {
                    if (btn !== this) btn.classList.remove('active');
                });
            }
            
            // Trigger filter update
            if (typeof SearchFilter !== 'undefined' && SearchFilter.applyRadTypeFilter) {
                SearchFilter.applyRadTypeFilter();
            }
        };
        container.appendChild(allBtn);

        // Add button for each enabled RAD type
        Object.entries(radTypes).forEach(([radKey, radConfig]) => {
            if (radConfig.enabled) {
                const btn = document.createElement('button');
                btn.className = 'filter-btn rad-filter-btn active';
                btn.dataset.radType = radKey;
                btn.textContent = radConfig.display_name;
                btn.style.cssText = `
                    position: relative;
                    padding-left: 20px;
                `;
                
                // Add color indicator
                const colorDot = document.createElement('span');
                colorDot.style.cssText = `
                    position: absolute;
                    left: 8px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: ${radConfig.color};
                `;
                btn.appendChild(colorDot);
                
                btn.onclick = function() {
                    // Toggle this button
                    this.classList.toggle('active');
                    
                    // Update "All" button state
                    const allActive = Array.from(document.querySelectorAll('.rad-filter-btn:not([data-rad-type="all"])')).every(b => b.classList.contains('active'));
                    const allBtn = document.querySelector('.rad-filter-btn[data-rad-type="all"]');
                    if (allBtn) {
                        if (allActive) {
                            allBtn.classList.add('active');
                        } else {
                            allBtn.classList.remove('active');
                        }
                    }
                    
                    // Ensure at least one is selected
                    const anyActive = Array.from(document.querySelectorAll('.rad-filter-btn')).some(b => b.classList.contains('active'));
                    if (!anyActive) {
                        this.classList.add('active');
                    }
                    
                    // Trigger filter update
                    if (typeof SearchFilter !== 'undefined' && SearchFilter.applyRadTypeFilter) {
                        SearchFilter.applyRadTypeFilter();
                    }
                };
                
                container.appendChild(btn);
            }
        });
    }

    // Public API
    return {
        updateSummaryCards,
        updateDataTable,
        updateTimestamp,
        updateApiStatus,
        showLoading,
        hideLoading,
        buildKibanaUrl,
        updateProxyStatusIndicator,
        updatePerformanceWidget,
        setAuthenticationError,
        clearAuthenticationError,
        initializeRadTypeFilters
    };
})();

// ESM: Export as default for convenience
export default UIUpdater;


