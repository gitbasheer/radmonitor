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
        const critical = document.querySelector('.card.critical .card-number');
        const warning = document.querySelector('.card.warning .card-number');
        const normal = document.querySelector('.card.normal .card-number');
        const increased = document.querySelector('.card.increased .card-number');

        if (critical) critical.textContent = stats.critical;
        if (warning) warning.textContent = stats.warning;
        if (normal) normal.textContent = stats.normal;
        if (increased) increased.textContent = stats.increased;
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

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><a href="${kibanaUrl}" target="_blank" class="event-link">
                    <span class="event-name">${eventId}</span>
                </a></td>
                <td><span class="badge ${(item.status || 'normal').toLowerCase()}">${item.status || 'NORMAL'}</span></td>
                <td class="number"><span class="score ${score_class}">${score_text}</span></td>
                <td class="number">${current.toLocaleString()}</td>
                <td class="number">${baseline.toLocaleString()}</td>
                <td class="number">${(item.dailyAvg || 0).toLocaleString()}</td>
                <td><span class="impact ${impact_class}">${impact}</span></td>
            `;
            tbody.appendChild(row);
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

        // Don't override authentication error messages
        if (statusEl && statusEl.dataset.authRequired === 'true') {
            console.log('⏭️ SKIPPING status update - authentication error is showing');
            return;
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
                    // We have both proxy and cookie - but need to validate the cookie actually works
                    statusEl.innerHTML = `Testing authentication... | <a href="#" onclick="Dashboard.setCookieForRealtime(); return false;" style="color: #333;">Update Cookie</a>`;
                    
                    // Test the cookie by attempting a simple query
                    try {
                        const testResult = await ApiClient.testAuthentication();
                        if (testResult.success) {
                            statusEl.innerHTML = `Ready for real-time! | <a href="#" onclick="Dashboard.testApiConnection(); return false;" style="color: #333;">Test API</a> | <a href="#" onclick="Dashboard.showApiSetupInstructions(); return false;" style="color: #333;">Setup</a>`;
                        } else {
                            statusEl.innerHTML = `Cookie invalid - need valid cookie | <a href="#" onclick="Dashboard.setCookieForRealtime(); return false;" style="color: #d32f2f;">Fix Cookie</a> | <a href="#" onclick="Dashboard.showApiSetupInstructions(); return false;" style="color: #333;">Help</a>`;
                        }
                    } catch (error) {
                        statusEl.innerHTML = `Cookie test failed | <a href="#" onclick="Dashboard.setCookieForRealtime(); return false;" style="color: #d32f2f;">Fix Cookie</a> | <a href="#" onclick="Dashboard.showApiSetupInstructions(); return false;" style="color: #333;">Help</a>`;
                    }
                }
                // Clear auth flag when successfully updating status
                delete statusEl.dataset.authRequired;
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
                    // We have a cookie - but need to validate it actually works (same logic as localhost)
                    statusEl.innerHTML = `Testing authentication... | <a href="#" onclick="Dashboard.setCookieForRealtime(); return false;" style="color: #333;">Update Cookie</a>`;
                    
                    // Test the cookie by attempting a simple query
                    try {
                        const testResult = await ApiClient.testAuthentication();
                        if (testResult.success) {
                            statusEl.innerHTML = `Real-time enabled | <a href="#" onclick="Dashboard.testApiConnection(); return false;" style="color: #333;">Test API</a> | <a href="#" onclick="Dashboard.setCookieForRealtime(); return false;" style="color: #333;">Update Cookie</a>`;
                        } else {
                            statusEl.innerHTML = `Cookie invalid - need valid cookie | <a href="#" onclick="Dashboard.setCookieForRealtime(); return false;" style="color: #d32f2f;">Fix Cookie</a>`;
                        }
                    } catch (error) {
                        statusEl.innerHTML = `Cookie test failed | <a href="#" onclick="Dashboard.setCookieForRealtime(); return false;" style="color: #d32f2f;">Fix Cookie</a>`;
                    }
                }
                // Clear auth flag when successfully updating status
                delete statusEl.dataset.authRequired;
            }
        }
    }

    /**
     * Show loading state
     */
    function showLoading(message = 'Loading...') {
        const refreshBtn = document.getElementById('refreshBtn');
        const status = document.getElementById('refreshStatus');

        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.textContent = 'REFRESHING...';
        }

        if (status) {
            status.textContent = message;
        }
    }

    /**
     * Hide loading state
     */
    function hideLoading(message = 'Ready') {
        const refreshBtn = document.getElementById('refreshBtn');
        const status = document.getElementById('refreshStatus');

        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.textContent = 'REFRESH NOW';
        }

        if (status) {
            status.textContent = message;
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
        updatePerformanceWidget
    };
})();

// ESM: Export as default for convenience
export default UIUpdater;

