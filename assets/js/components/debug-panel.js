/**
 * Debug Panel Component - JavaScript version
 * Comprehensive debugging and monitoring for EID Registry and RAD mappings
 */

class DebugPanel {
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'debug-panel-container';
        this.isOpen = false;
        this.logs = [];
        this.maxLogs = 100;
        this.autoRefreshInterval = null;
        
        // Setup debug listeners
        this.setupDebugListeners();
    }

    setupDebugListeners() {
        // Override console methods to capture logs
        const originalLog = console.log;
        const originalError = console.error;
        
        console.log = (...args) => {
            originalLog.apply(console, args);
            if (args[0]?.includes?.('EID') || args[0]?.includes?.('RAD')) {
                this.addLog('api', args.join(' '));
            }
        };
        
        console.error = (...args) => {
            originalError.apply(console, args);
            this.addLog('error', args.join(' '), { stack: new Error().stack });
        };
    }

    addLog(type, message, details) {
        this.logs.unshift({
            timestamp: new Date(),
            type,
            message,
            details
        });
        
        // Keep only recent logs
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }
        
        // Update UI if panel is open
        if (this.isOpen) {
            this.updateLogsDisplay();
        }
    }

    render() {
        this.container.innerHTML = `
            <button class="btn btn-secondary" id="debug-toggle" title="Debug Panel">
                🐛 Debug
            </button>
            
            ${this.isOpen ? this.renderPanel() : ''}
        `;

        this.attachEventHandlers();
        return this.container;
    }

    renderPanel() {
        const events = window.dataService?.getData?.() || [];
        const mappings = this.getEIDMappings();
        const processingResults = this.analyzeEIDProcessing(events);
        
        return `
            <div class="debug-panel-backdrop">
                <div class="debug-panel">
                    <div class="debug-panel-header">
                        <h2>🐛 EID Registry Debug Panel</h2>
                        <button class="btn btn-icon" id="close-debug">✕</button>
                    </div>
                    
                    <div class="debug-panel-body">
                        <!-- Overview Stats -->
                        <div class="debug-section">
                            <h3> Overview</h3>
                            <div class="debug-stats">
                                <div class="stat-card">
                                    <div class="stat-value">${events.length}</div>
                                    <div class="stat-label">Total Events</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-value">${mappings.length}</div>
                                    <div class="stat-label">Registry Mappings</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-value">${processingResults.filter(r => r.source === 'registry').length}</div>
                                    <div class="stat-label">Registry Matches</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-value">${processingResults.filter(r => r.source === 'pattern').length}</div>
                                    <div class="stat-label">Pattern Matches</div>
                                </div>
                            </div>
                        </div>

                        <!-- EID Processing Analysis -->
                        <div class="debug-section">
                            <h3>🔍 EID Processing Analysis</h3>
                            <div class="processing-table">
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>EID</th>
                                            <th>Detected RAD</th>
                                            <th>Source</th>
                                            <th>Confidence</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${processingResults.slice(0, 20).map(result => `
                                            <tr class="${result.source === 'unknown' ? 'warning-row' : ''}">
                                                <td><code>${this.truncateEID(result.eid)}</code></td>
                                                <td>
                                                    <span class="rad-badge" style="background: ${this.getRADColor(result.detectedRAD)}">
                                                        ${result.detectedRAD || 'Unknown'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span class="source-badge source-${result.source}">
                                                        ${result.source}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div class="confidence-bar">
                                                        <div class="confidence-fill" style="width: ${result.confidence}%"></div>
                                                        <span class="confidence-text">${result.confidence}%</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    ${result.source === 'registry' ? '✅' : result.source === 'pattern' ? '🔄' : '❓'}
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                                ${processingResults.length > 20 ? `
                                    <p class="text-muted">Showing 20 of ${processingResults.length} events</p>
                                ` : ''}
                            </div>
                        </div>

                        <!-- Current Mappings -->
                        <div class="debug-section">
                            <h3>📋 Current Registry Mappings</h3>
                            ${mappings.length > 0 ? `
                                <div class="mappings-grid">
                                    ${mappings.map(mapping => `
                                        <div class="mapping-card">
                                            <div class="mapping-eid"><code>${mapping.eid}</code></div>
                                            <div class="mapping-arrow">→</div>
                                            <div class="mapping-rad">
                                                <span class="rad-badge" style="background: ${this.getRADColor(mapping.rad_type || mapping.radType)}">
                                                    ${mapping.rad_type || mapping.radType}
                                                </span>
                                            </div>
                                            ${mapping.description ? `
                                                <div class="mapping-desc">${mapping.description}</div>
                                            ` : ''}
                                        </div>
                                    `).join('')}
                                </div>
                            ` : `
                                <p class="text-muted">No mappings in registry</p>
                            `}
                        </div>

                        <!-- Diagnostic API Results -->
                        <div class="debug-section">
                            <h3>🔧 Server Diagnostics</h3>
                            <div class="diagnostics-container">
                                <button class="btn btn-primary" onclick="window.debugPanel.fetchDiagnostics()">
                                    Fetch Server Diagnostics
                                </button>
                                <div id="diagnostics-results"></div>
                            </div>
                        </div>

                        <!-- Activity Log -->
                        <div class="debug-section">
                            <h3>📝 Activity Log</h3>
                            <div class="log-controls">
                                <button class="btn btn-sm" onclick="window.debugPanel.clearLogs()">Clear Logs</button>
                                <label>
                                    <input type="checkbox" id="auto-refresh" ${this.autoRefreshInterval ? 'checked' : ''}>
                                    Auto-refresh
                                </label>
                            </div>
                            <div class="activity-log">
                                ${this.logs.length > 0 ? this.logs.map(log => `
                                    <div class="log-entry log-${log.type}">
                                        <span class="log-time">${this.formatTime(log.timestamp)}</span>
                                        <span class="log-type">${log.type}</span>
                                        <span class="log-message">${log.message}</span>
                                        ${log.details ? `
                                            <details class="log-details">
                                                <summary>Details</summary>
                                                <pre>${JSON.stringify(log.details, null, 2)}</pre>
                                            </details>
                                        ` : ''}
                                    </div>
                                `).join('') : '<p class="text-muted">No logs yet</p>'}
                            </div>
                        </div>

                        <!-- Actions -->
                        <div class="debug-section">
                            <h3>🛠️ Debug Actions</h3>
                            <div class="debug-actions">
                                <button class="btn btn-primary" onclick="window.debugPanel.testAllMappings()">
                                    Test All Mappings
                                </button>
                                <button class="btn btn-secondary" onclick="window.debugPanel.exportDebugData()">
                                    Export Debug Data
                                </button>
                                <button class="btn btn-secondary" onclick="window.debugPanel.refreshData()">
                                    Refresh Analysis
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    attachEventHandlers() {
        // Toggle button
        const toggleBtn = this.container.querySelector('#debug-toggle');
        toggleBtn?.addEventListener('click', () => {
            this.isOpen = !this.isOpen;
            this.render();
        });

        // Close button
        const closeBtn = this.container.querySelector('#close-debug');
        closeBtn?.addEventListener('click', () => {
            this.isOpen = false;
            this.render();
        });

        // Auto-refresh checkbox
        const autoRefreshCheckbox = this.container.querySelector('#auto-refresh');
        autoRefreshCheckbox?.addEventListener('change', (e) => {
            if (e.target.checked) {
                this.startAutoRefresh();
            } else {
                this.stopAutoRefresh();
            }
        });
    }

    getEIDMappings() {
        // Get from localStorage
        const stored = localStorage.getItem('eid-mappings');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch {
                return [];
            }
        }
        return [];
    }

    analyzeEIDProcessing(events) {
        const mappings = this.getEIDMappings();
        const results = [];

        events.forEach(event => {
            const eid = event.id || event.event_id || event.name || '';
            const registryMapping = mappings.find(m => 
                eid.toUpperCase().includes(m.eid.toUpperCase())
            );

            let detectedRAD = null;
            let source = 'unknown';
            let confidence = 0;

            if (registryMapping) {
                detectedRAD = registryMapping.rad_type || registryMapping.radType;
                source = 'registry';
                confidence = 100;
            } else {
                // Try pattern matching
                detectedRAD = this.detectRADFromPattern(eid);
                if (detectedRAD) {
                    source = 'pattern';
                    confidence = this.calculatePatternConfidence(eid, detectedRAD);
                }
            }

            results.push({
                eid,
                detectedRAD,
                source,
                confidence
            });
        });

        return results;
    }

    detectRADFromPattern(eid) {
        const eidUpper = eid.toUpperCase();
        if (eidUpper.includes('LOGIN') || eidUpper.includes('AUTH')) {
            return 'login';
        } else if (eidUpper.includes('API') || eidUpper.includes('ENDPOINT')) {
            return 'api_call';
        } else if (eidUpper.includes('PAGE') || eidUpper.includes('VIEW')) {
            return 'page_view';
        } else if (eidUpper.includes('DOWNLOAD') || eidUpper.includes('FILE')) {
            return 'file_download';
        }
        return null;
    }

    calculatePatternConfidence(eid, radType) {
        if (!radType) return 0;
        
        const eidUpper = eid.toUpperCase();
        const patterns = {
            'login': ['LOGIN', 'AUTH', 'SIGNIN', 'LOGON'],
            'api_call': ['API', 'ENDPOINT', 'SERVICE', 'REQUEST'],
            'page_view': ['PAGE', 'VIEW', 'VISIT', 'SCREEN'],
            'file_download': ['DOWNLOAD', 'FILE', 'EXPORT', 'ATTACHMENT']
        };

        const relevantPatterns = patterns[radType] || [];
        let matchCount = 0;
        
        relevantPatterns.forEach(pattern => {
            if (eidUpper.includes(pattern)) matchCount++;
        });

        return Math.min(100, (matchCount / relevantPatterns.length) * 100);
    }

    async fetchDiagnostics() {
        const resultsContainer = document.getElementById('diagnostics-results');
        resultsContainer.innerHTML = '<p>Loading diagnostics...</p>';
        
        try {
            const response = await fetch('/api/v1/diagnostics/eid-processing');
            if (response.ok) {
                const data = await response.json();
                resultsContainer.innerHTML = `
                    <div class="diagnostics-data">
                        <h4>Server-side Analysis</h4>
                        <ul>
                            <li>Total Events: ${data.total_events}</li>
                            <li>Registry Mappings: ${data.registry_mappings}</li>
                            <li>Registry Matches: ${data.registry_matches}</li>
                            <li>Pattern Matches: ${data.pattern_matches}</li>
                            <li>Unknown EIDs: ${data.unknown_eids.length}</li>
                        </ul>
                        ${data.unknown_eids.length > 0 ? `
                            <h5>Unknown EIDs:</h5>
                            <ul>
                                ${data.unknown_eids.map(eid => `<li><code>${eid}</code></li>`).join('')}
                            </ul>
                        ` : ''}
                    </div>
                `;
                this.addLog('api', 'Fetched server diagnostics successfully');
            } else {
                throw new Error(`Failed to fetch diagnostics: ${response.status}`);
            }
        } catch (error) {
            resultsContainer.innerHTML = `<p class="text-danger">Error: ${error.message}</p>`;
            this.addLog('error', `Failed to fetch diagnostics: ${error.message}`);
        }
    }

    clearLogs() {
        this.logs = [];
        this.addLog('api', 'Logs cleared');
        this.render();
    }

    testAllMappings() {
        this.addLog('api', 'Testing all mappings...');
        
        const events = window.dataService?.getData?.() || [];
        const mappings = this.getEIDMappings();
        
        let successCount = 0;
        let failCount = 0;
        
        mappings.forEach(mapping => {
            const matchingEvents = events.filter(e => 
                (e.id || e.event_id || e.name || '').toUpperCase().includes(mapping.eid.toUpperCase())
            );
            
            if (matchingEvents.length > 0) {
                successCount++;
                this.addLog('mapping', `✅ Mapping "${mapping.eid}" matched ${matchingEvents.length} events`);
            } else {
                failCount++;
                this.addLog('mapping', `❌ Mapping "${mapping.eid}" has no matches`);
            }
        });
        
        this.addLog('api', `Test complete: ${successCount} successful, ${failCount} failed`);
        this.render();
    }

    exportDebugData() {
        const debugData = {
            timestamp: new Date().toISOString(),
            events: window.dataService?.getData?.() || [],
            mappings: this.getEIDMappings(),
            processingResults: this.analyzeEIDProcessing(window.dataService?.getData?.() || []),
            logs: this.logs
        };
        
        const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `eid-debug-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.addLog('api', 'Debug data exported');
    }

    refreshData() {
        this.addLog('api', 'Refreshing analysis...');
        if (window.SimplifiedDashboard?.refresh) {
            window.SimplifiedDashboard.refresh();
        }
        setTimeout(() => {
            this.render();
            this.addLog('api', 'Analysis refreshed');
        }, 1000);
    }

    startAutoRefresh() {
        this.autoRefreshInterval = setInterval(() => {
            this.render();
        }, 2000);
    }

    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }

    updateLogsDisplay() {
        const logContainer = this.container.querySelector('.activity-log');
        if (!logContainer) return;

        logContainer.innerHTML = this.logs.length > 0 ? this.logs.map(log => `
            <div class="log-entry log-${log.type}">
                <span class="log-time">${this.formatTime(log.timestamp)}</span>
                <span class="log-type">${log.type}</span>
                <span class="log-message">${log.message}</span>
            </div>
        `).join('') : '<p class="text-muted">No logs yet</p>';
    }

    truncateEID(eid, maxLength = 30) {
        if (eid.length <= maxLength) return eid;
        return eid.substring(0, maxLength - 3) + '...';
    }

    formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    getRADColor(radType) {
        const colors = {
            login: '#6B7280',
            api_call: '#3B82F6',
            page_view: '#10B981',
            file_download: '#F59E0B',
            custom: '#8B5CF6'
        };
        return colors[radType || ''] || '#999';
    }

    destroy() {
        this.stopAutoRefresh();
    }
}

// Make available globally
window.DebugPanel = DebugPanel;
window.debugPanel = new DebugPanel();

// Export for ES modules
export { DebugPanel };