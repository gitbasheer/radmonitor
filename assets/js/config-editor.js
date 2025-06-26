/**
 * Configuration Editor - Simple UI for editing dashboard configuration
 * Uses the centralized ConfigService API
 */

import { ConfigService } from './config-service.js';
import TimeRangeUtils from './time-range-utils.js';

const ConfigEditor = {
    // Store current config for comparison
    currentConfig: null,
    
    // Initialize the editor
    async init() {
        // Initialize API if not already done
        if (typeof API !== 'undefined' && API.initialize) {
            await API.initialize();
        }
    },
    
    // Load current configuration
    async loadConfig() {
        const statusEl = document.getElementById('configEditorStatus');
        const fieldsEl = document.getElementById('configEditorFields');
        
        try {
            statusEl.textContent = 'Loading configuration...';
            
            // Get config from ConfigService
            this.currentConfig = await ConfigService.getConfig();
            
            // Build the editor fields
            fieldsEl.innerHTML = this.buildEditorFields(this.currentConfig);
            
            statusEl.textContent = '✓ Configuration loaded';
            statusEl.style.color = '#28a745';
            
            console.log('Config loaded:', this.currentConfig);
            
            // Update query preview
            this.updateQueryPreview();
            
            // Add event listeners for real-time updates
            this.attachEventListeners();
        } catch (error) {
            statusEl.textContent = '✗ Error loading config: ' + error.message;
            statusEl.style.color = '#dc3545';
            console.error('Error loading config:', error);
        }
    },
    
    // Build editor fields HTML
    buildEditorFields(config) {
        let html = '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">';
        
        // Left Column
        html += '<div>';
        
        // Time Range Settings
        html += '<div class="config-section">';
        html += '<h5 style="margin: 0 0 8px 0; font-size: 13px; color: #555;">⏰ Time Range</h5>';
        html += this.createCompactField('Current Range', 'timeRange.current', config.currentTimeRange || 'now-12h', 'text');
        html += '<div style="margin: 5px 0; display: flex; gap: 5px; flex-wrap: wrap;">';
        html += '<button class="preset-button" onclick="ConfigEditor.setTimeRange(\'now-6h\')" style="flex: 1; min-width: 40px; padding: 4px; font-size: 11px;">6H</button>';
        html += '<button class="preset-button" onclick="ConfigEditor.setTimeRange(\'now-12h\')" style="flex: 1; min-width: 40px; padding: 4px; font-size: 11px;">12H</button>';
        html += '<button class="preset-button" onclick="ConfigEditor.setTimeRange(\'now-24h\')" style="flex: 1; min-width: 40px; padding: 4px; font-size: 11px;">24H</button>';
        html += '<button class="preset-button" onclick="ConfigEditor.setTimeRange(\'now-3d\')" style="flex: 1; min-width: 40px; padding: 4px; font-size: 11px;">3D</button>';
        html += '</div>';
        html += '</div>';
        
        // Baseline Period
        html += '<div class="config-section" style="margin-top: 12px;">';
        html += '<h5 style="margin: 0 0 8px 0; font-size: 13px; color: #555;">📊 Baseline Period</h5>';
        html += this.createCompactField('Start Date', 'timeRange.baselineStart', config.baselineStart || '2025-06-01', 'date');
        html += this.createCompactField('End Date', 'timeRange.baselineEnd', config.baselineEnd || '2025-06-09', 'date');
        html += '</div>';
        
        // Volume Thresholds
        html += '<div class="config-section" style="margin-top: 12px;">';
        html += '<h5 style="margin: 0 0 8px 0; font-size: 13px; color: #555;">📈 Volume Thresholds</h5>';
        html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">';
        html += this.createCompactField('High', 'processing.highVolumeThreshold', config.highVolumeThreshold || 1000, 'number', 'events/day');
        html += this.createCompactField('Medium', 'processing.mediumVolumeThreshold', config.mediumVolumeThreshold || 100, 'number', 'events/day');
        html += '</div>';
        html += this.createCompactField('Min Daily Volume', 'processing.minDailyVolume', config.minDailyVolume || 100, 'number');
        html += '</div>';
        
        html += '</div>'; // End left column
        
        // Right Column
        html += '<div>';
        
        // Alert Thresholds
        html += '<div class="config-section">';
        html += '<h5 style="margin: 0 0 8px 0; font-size: 13px; color: #555;">🚨 Alert Thresholds</h5>';
        html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">';
        html += this.createCompactField('Critical', 'processing.criticalThreshold', config.criticalThreshold || -80, 'number', '%');
        html += this.createCompactField('Warning', 'processing.warningThreshold', config.warningThreshold || -50, 'number', '%');
        html += '</div>';
        html += '</div>';
        
        // Dashboard Settings
        html += '<div class="config-section" style="margin-top: 12px;">';
        html += '<h5 style="margin: 0 0 8px 0; font-size: 13px; color: #555;">🎨 Dashboard</h5>';
        html += this.createCompactField('Theme', 'dashboard.theme', config.theme || 'light', 'select', ['light', 'dark', 'auto']);
        html += this.createCompactField('Auto Refresh', 'dashboard.autoRefreshEnabled', config.autoRefreshEnabled !== false, 'select', ['true', 'false']);
        html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">';
        html += this.createCompactField('Refresh (s)', 'dashboard.refreshInterval', Math.floor((config.autoRefreshInterval || 300000) / 1000), 'number');
        html += this.createCompactField('Max Events', 'dashboard.maxEventsDisplay', config.maxEventsDisplay || 200, 'number');
        html += '</div>';
        html += '</div>';
        
        // Elasticsearch Settings
        html += '<div class="config-section" style="margin-top: 12px;">';
        html += '<h5 style="margin: 0 0 8px 0; font-size: 13px; color: #555;">🔍 Elasticsearch/Kibana</h5>';
        html += this.createCompactField('Server URL', 'elasticsearch.url', config.elasticsearchUrl || config.kibanaUrl || '', 'text');
        html += this.createCompactField('Index Pattern', 'elasticsearch.indexPattern', config.indexPattern || 'traffic-*', 'text');
        html += this.createCompactField('Auth Cookie', 'elasticsearch.cookie', config.elasticCookie || '', 'text', '', 'password');
        html += '</div>';
        
        html += '</div>'; // End right column
        html += '</div>'; // End grid
        
        // Query Configuration Section
        html += '<div class="config-section" style="margin-top: 12px; border-top: 1px solid #eee; padding-top: 12px;">';
        html += '<h5 style="margin: 0 0 8px 0; font-size: 13px; color: #555;">🎯 Query Configuration</h5>';
        html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">';
        html += '<div>';
        html += this.createCompactField('Event ID Pattern', 'query.eventPattern', config.queryEventPattern || 'pandc.vnext.recommendations.feed.feed*', 'text');
        html += '</div>';
        html += '<div>';
        html += this.createCompactField('Aggregation Size', 'query.aggSize', config.queryAggSize || 500, 'number');
        html += '</div>';
        html += '</div>';
        html += '</div>';
        
        // Query Preview Section
        html += '<div class="config-section" style="margin-top: 12px; border-top: 1px solid #eee; padding-top: 12px;">';
        html += '<h5 style="margin: 0 0 8px 0; font-size: 13px; color: #555;">🔍 Query Preview</h5>';
        html += '<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">';
        html += '<span style="font-size: 11px; color: #666;">Live preview of the Elasticsearch query</span>';
        html += '<button onclick="ConfigEditor.copyQuery(event)" style="padding: 2px 8px; font-size: 11px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 3px; cursor: pointer;">📋 Copy</button>';
        html += '</div>';
        html += '<pre id="queryPreview" style="background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 11px; overflow-x: auto; max-height: 300px; overflow-y: auto; margin: 0;"></pre>';
        html += '</div>';
        
        // Additional settings in full width
        html += '<div class="config-section" style="margin-top: 12px; border-top: 1px solid #eee; padding-top: 12px;">';
        html += '<h5 style="margin: 0 0 8px 0; font-size: 13px; color: #555;">📅 Advanced Settings</h5>';
        html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">';
        html += '<div>';
        // Convert ISO date to datetime-local format
        const minEventDateValue = config.minEventDate ? new Date(config.minEventDate).toISOString().slice(0, 16) : '2025-05-19T04:00';
        html += this.createCompactField('Min Event Date', 'search.minEventDate', minEventDateValue, 'datetime-local');
        html += this.createCompactField('CORS Proxy Port', 'cors.proxyPort', config.corsProxyPort || 8889, 'number');
        html += '</div>';
        html += '<div>';
        html += this.createCompactField('App Name', 'app.name', config.appName || 'RAD Monitor', 'text');
        html += this.createCompactField('Debug Mode', 'app.debug', config.debug || false, 'select', ['false', 'true']);
        html += '</div>';
        html += '</div>';
        html += '</div>';
        
        return html;
    },
    
    // Create a single field
    createField(label, path, value, type = 'text', options = []) {
        const fieldId = 'config_' + path.replace(/\./g, '_');
        let html = '<div class="config-field" style="margin-bottom: 10px;">';
        html += `<label for="${fieldId}" style="display: block; font-size: 12px; margin-bottom: 3px;">${label}:</label>`;
        
        if (type === 'select') {
            html += `<select id="${fieldId}" data-path="${path}" class="config-input" style="width: 100%; padding: 5px;">`;
            options.forEach(opt => {
                html += `<option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>`;
            });
            html += '</select>';
        } else {
            html += `<input type="${type}" id="${fieldId}" data-path="${path}" value="${value}" class="config-input" style="width: 100%; padding: 5px;">`;
        }
        
        html += '</div>';
        return html;
    },
    
    // Create a compact field for the consolidated view
    createCompactField(label, path, value, type = 'text', optionsOrSuffix = '', inputType = null) {
        const fieldId = 'config_' + path.replace(/\./g, '_');
        let html = '<div class="config-field-compact" style="margin-bottom: 6px;">';
        
        if (type === 'select') {
            html += `<label for="${fieldId}" style="display: block; font-size: 11px; margin-bottom: 2px; color: #666;">${label}:</label>`;
            html += `<select id="${fieldId}" data-path="${path}" class="config-input" style="width: 100%; padding: 4px; font-size: 12px;">`;
            optionsOrSuffix.forEach(opt => {
                html += `<option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>`;
            });
            html += '</select>';
        } else {
            const suffix = typeof optionsOrSuffix === 'string' ? optionsOrSuffix : '';
            html += `<label for="${fieldId}" style="display: block; font-size: 11px; margin-bottom: 2px; color: #666;">${label}${suffix ? ' (' + suffix + ')' : ''}:</label>`;
            const actualType = inputType || type;
            html += `<input type="${actualType}" id="${fieldId}" data-path="${path}" value="${value}" class="config-input" style="width: 100%; padding: 4px; font-size: 12px;">`;
        }
        
        html += '</div>';
        return html;
    },
    
    // Set time range helper
    setTimeRange(range) {
        const input = document.getElementById('config_timeRange_current');
        if (input) {
            input.value = range;
            // Update preset button highlights
            const buttons = document.querySelectorAll('.preset-button');
            buttons.forEach(btn => {
                if (btn.textContent === range.replace('now-', '').toUpperCase()) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
    },
    
    // Map nested path to ConfigService flat keys
    mapToConfigKey(section, key) {
        const mapping = {
            'timeRange.current': 'currentTimeRange',
            'timeRange.baselineStart': 'baselineStart',
            'timeRange.baselineEnd': 'baselineEnd',
            'processing.criticalThreshold': 'criticalThreshold',
            'processing.warningThreshold': 'warningThreshold',
            'processing.minDailyVolume': 'minDailyVolume',
            'processing.highVolumeThreshold': 'highVolumeThreshold',
            'processing.mediumVolumeThreshold': 'mediumVolumeThreshold',
            'dashboard.refreshInterval': 'autoRefreshInterval',
            'dashboard.autoRefreshEnabled': 'autoRefreshEnabled',
            'dashboard.maxEventsDisplay': 'maxEventsDisplay',
            'dashboard.theme': 'theme',
            'dashboard.consoleChartWidth': 'consoleChartWidth',
            'dashboard.consoleTopResults': 'consoleTopResults',
            'elasticsearch.indexPattern': 'indexPattern',
            'elasticsearch.timeout': 'elasticsearchTimeout',
            'elasticsearch.url': 'elasticsearchUrl',
            'elasticsearch.cookie': 'elasticCookie',
            'search.minEventDate': 'minEventDate',
            'cors.proxyPort': 'corsProxyPort',
            'app.name': 'appName',
            'app.debug': 'debug',
            'query.eventPattern': 'queryEventPattern',
            'query.aggSize': 'queryAggSize'
        };
        
        const fullPath = `${section}.${key}`;
        return mapping[fullPath] || null;
    },
    
    // Save configuration
    async saveConfig() {
        const statusEl = document.getElementById('configEditorStatus');
        
        try {
            statusEl.textContent = 'Saving configuration...';
            statusEl.style.color = '#666';
            
            
            // Collect all changes
            const flatConfig = {};
            const inputs = document.querySelectorAll('#configEditorFields .config-input');
            
            inputs.forEach(input => {
                const path = input.dataset.path;
                let value = input.value;
                
                // Convert to appropriate type
                if (input.type === 'number') {
                    value = parseInt(value, 10);
                } else if (input.type === 'select' && (path === 'app.debug' || path === 'dashboard.autoRefreshEnabled')) {
                    // Convert string to boolean for debug mode and auto refresh
                    value = value === 'true';
                } else if (input.type === 'datetime-local') {
                    // Convert datetime-local to ISO string
                    value = value ? new Date(value).toISOString() : '';
                }
                
                // Convert nested path to flat config key
                const pathParts = path.split('.');
                if (pathParts.length === 2) {
                    const [section, key] = pathParts;
                    const configKey = this.mapToConfigKey(section, key);
                    if (configKey) {
                        // Special handling for refresh interval (convert seconds to milliseconds)
                        if (configKey === 'autoRefreshInterval') {
                            value = value * 1000;
                        }
                        // Special handling for elasticsearch URL - also set kibanaUrl
                        if (configKey === 'elasticsearchUrl') {
                            flatConfig['elasticsearchUrl'] = value;
                            flatConfig['kibanaUrl'] = value;
                        } else {
                            flatConfig[configKey] = value;
                        }
                    }
                }
            });
            
            // Update configuration using ConfigService
            await ConfigService.updateConfig(flatConfig);
            
            statusEl.textContent = '✓ Configuration saved successfully!';
            statusEl.style.color = '#28a745';
            
            // Notify other parts of the app
            if (typeof Dashboard !== 'undefined' && Dashboard.refresh) {
                setTimeout(() => {
                    statusEl.textContent = 'Refreshing dashboard...';
                    Dashboard.refresh();
                    // Clear the status after a reasonable time
                    setTimeout(() => {
                        statusEl.textContent = '';
                    }, 3000);
                }, 1000);
            }
            
        } catch (error) {
            statusEl.textContent = '✗ Error saving config: ' + error.message;
            statusEl.style.color = '#dc3545';
            console.error('Error saving config:', error);
        }
    },
    
    // Reset to defaults
    async resetToDefaults() {
        const statusEl = document.getElementById('configEditorStatus');
        
        if (!confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
            return;
        }
        
        try {
            statusEl.textContent = 'Resetting to defaults...';
            statusEl.style.color = '#666';
            
            // Reset using ConfigService method
            await ConfigService.resetToDefaults();
            
            // Reload the editor
            await this.loadConfig();
            
            statusEl.textContent = '✓ Reset to defaults complete!';
            statusEl.style.color = '#28a745';
            
        } catch (error) {
            statusEl.textContent = '✗ Error resetting config: ' + error.message;
            statusEl.style.color = '#dc3545';
            console.error('Error resetting config:', error);
        }
    },
    
    // Generate Elasticsearch query based on current form values
    generateQuery() {
        // Get current values from form
        const getValue = (id) => {
            const el = document.getElementById(id);
            return el ? el.value : '';
        };
        
        const currentTimeRange = getValue('config_timeRange_current') || 'now-12h';
        const baselineStart = getValue('config_timeRange_baselineStart') || '2025-06-01';
        const baselineEnd = getValue('config_timeRange_baselineEnd') || '2025-06-09';
        const minEventDate = getValue('config_search_minEventDate');
        const indexPattern = getValue('config_elasticsearch_indexPattern') || 'traffic-*';
        const eventPattern = getValue('config_query_eventPattern') || 'pandc.vnext.recommendations.feed.feed*';
        const aggSize = parseInt(getValue('config_query_aggSize') || '500', 10);
        
        // Fixed values
        const hostFilter = 'dashboard.godaddy.com';
        const eventField = 'detail.event.data.traffic.eid.keyword';
        
        // Convert datetime-local to ISO format for minEventDate
        const minEventDateISO = minEventDate ? new Date(minEventDate).toISOString() : '2025-05-19T04:00:00.000Z';
        
        // Parse current time range
        const currentTimeFilter = TimeRangeUtils.parseTimeRangeToFilter(currentTimeRange);
        
        // Build the query
        const query = {
            index: indexPattern,
            body: {
                aggs: {
                    events: {
                        terms: {
                            field: eventField,
                            size: aggSize,
                            order: { "_count": "desc" }
                        },
                        aggs: {
                            baseline: {
                                filter: {
                                    range: {
                                        "@timestamp": {
                                            gte: baselineStart,
                                            lt: baselineEnd
                                        }
                                    }
                                }
                            },
                            current: {
                                filter: {
                                    range: {
                                        "@timestamp": currentTimeFilter
                                    }
                                }
                            }
                        }
                    }
                },
                size: 0,
                query: {
                    bool: {
                        filter: [
                            {
                                wildcard: {
                                    [eventField]: {
                                        value: eventPattern
                                    }
                                }
                            },
                            {
                                match_phrase: {
                                    "detail.global.page.host": hostFilter
                                }
                            },
                            {
                                range: {
                                    "@timestamp": {
                                        gte: minEventDateISO,
                                        lte: "now"
                                    }
                                }
                            }
                        ]
                    }
                }
            }
        };
        
        return query;
    },
    
    // Update query preview
    updateQueryPreview() {
        const previewEl = document.getElementById('queryPreview');
        if (!previewEl) return;
        
        try {
            const query = this.generateQuery();
            previewEl.textContent = JSON.stringify(query, null, 2);
        } catch (error) {
            previewEl.textContent = `Error generating query: ${error.message}`;
        }
    },
    
    // Attach event listeners for real-time updates
    attachEventListeners() {
        const inputs = document.querySelectorAll('#configEditorFields .config-input');
        
        // Debounce function to avoid too many updates
        let updateTimeout;
        const debouncedUpdate = () => {
            clearTimeout(updateTimeout);
            updateTimeout = setTimeout(() => {
                this.updateQueryPreview();
            }, 300);
        };
        
        inputs.forEach(input => {
            // Update on input change
            input.addEventListener('input', debouncedUpdate);
            input.addEventListener('change', debouncedUpdate);
        });
        
        // Also update when preset time range buttons are clicked
        setTimeout(() => {
            const presetButtons = document.querySelectorAll('.preset-button');
            presetButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    setTimeout(debouncedUpdate, 100);
                });
            });
        }, 100);
    },
    
    // Copy query to clipboard
    async copyQuery(evt) {
        const previewEl = document.getElementById('queryPreview');
        if (!previewEl) return;
        
        try {
            await navigator.clipboard.writeText(previewEl.textContent);
            
            // Show feedback
            const button = evt ? evt.target : document.querySelector('[onclick*="copyQuery"]');
            if (button) {
                const originalText = button.textContent;
                button.textContent = '✓ Copied!';
                button.style.background = '#4CAF50';
                button.style.color = 'white';
                
                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.background = '#f0f0f0';
                    button.style.color = '';
                }, 2000);
            }
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ConfigEditor.init());
} else {
    ConfigEditor.init();
}

// Export for ES6 module usage
export default ConfigEditor;