/**
 * Configuration Editor - Simple UI for editing dashboard configuration
 * Uses the centralized ConfigService API
 */

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
        } catch (error) {
            statusEl.textContent = '✗ Error loading config: ' + error.message;
            statusEl.style.color = '#dc3545';
            console.error('Error loading config:', error);
        }
    },
    
    // Build editor fields HTML
    buildEditorFields(config) {
        let html = '';
        
        // Processing settings
        html += '<div class="config-section">';
        html += '<h5 style="margin: 10px 0 5px 0;">Processing Settings</h5>';
        html += this.createField('Critical Threshold', 'processing.criticalThreshold', config.processing?.criticalThreshold || -80, 'number');
        html += this.createField('Warning Threshold', 'processing.warningThreshold', config.processing?.warningThreshold || -50, 'number');
        html += this.createField('Min Daily Volume', 'processing.minDailyVolume', config.processing?.minDailyVolume || 100, 'number');
        html += '</div>';
        
        // Dashboard settings
        html += '<div class="config-section" style="margin-top: 15px;">';
        html += '<h5 style="margin: 10px 0 5px 0;">Dashboard Settings</h5>';
        html += this.createField('Refresh Interval (seconds)', 'dashboard.refreshInterval', config.dashboard?.refreshInterval || 300, 'number');
        html += this.createField('Max Events Display', 'dashboard.maxEventsDisplay', config.dashboard?.maxEventsDisplay || 200, 'number');
        html += this.createField('Theme', 'dashboard.theme', config.dashboard?.theme || 'light', 'select', ['light', 'dark', 'auto']);
        html += this.createField('Console Chart Width', 'dashboard.consoleChartWidth', config.dashboard?.consoleChartWidth || 30, 'number');
        html += '</div>';
        
        // Elasticsearch settings
        html += '<div class="config-section" style="margin-top: 15px;">';
        html += '<h5 style="margin: 10px 0 5px 0;">Elasticsearch Settings</h5>';
        html += this.createField('Index Pattern', 'elasticsearch.indexPattern', config.elasticsearch?.indexPattern || 'traffic-*', 'text');
        html += this.createField('Timeout (seconds)', 'elasticsearch.timeout', config.elasticsearch?.timeout || 30, 'number');
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
    
    // Save configuration
    async saveConfig() {
        const statusEl = document.getElementById('configEditorStatus');
        
        try {
            statusEl.textContent = 'Saving configuration...';
            statusEl.style.color = '#666';
            
            // Collect all changes
            const changes = {};
            const inputs = document.querySelectorAll('#configEditorFields .config-input');
            
            inputs.forEach(input => {
                const path = input.dataset.path;
                let value = input.value;
                
                // Convert to appropriate type
                if (input.type === 'number') {
                    value = parseInt(value, 10);
                }
                
                // Use ConfigService to update each setting
                ConfigService.updateSetting(path, value);
            });
            
            // Save to backend
            await ConfigService.saveToBackend();
            
            statusEl.textContent = '✓ Configuration saved successfully!';
            statusEl.style.color = '#28a745';
            
            // Notify other parts of the app
            if (typeof Dashboard !== 'undefined' && Dashboard.refresh) {
                setTimeout(() => {
                    statusEl.textContent = 'Refreshing dashboard...';
                    Dashboard.refresh();
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
            
            // Define default configuration
            const defaults = {
                processing: {
                    criticalThreshold: -80,
                    warningThreshold: -50,
                    minDailyVolume: 100,
                    highVolumeThreshold: 1000,
                    mediumVolumeThreshold: 100
                },
                dashboard: {
                    refreshInterval: 300,
                    maxEventsDisplay: 200,
                    theme: 'light',
                    consoleChartWidth: 30,
                    consoleTopResults: 20
                },
                elasticsearch: {
                    indexPattern: 'traffic-*',
                    timeout: 30
                }
            };
            
            // Update each setting
            for (const [section, settings] of Object.entries(defaults)) {
                for (const [key, value] of Object.entries(settings)) {
                    await ConfigService.updateSetting(`${section}.${key}`, value);
                }
            }
            
            // Save to backend
            await ConfigService.saveToBackend();
            
            // Reload the editor
            await this.loadConfig();
            
            statusEl.textContent = '✓ Reset to defaults complete!';
            statusEl.style.color = '#28a745';
            
        } catch (error) {
            statusEl.textContent = '✗ Error resetting config: ' + error.message;
            statusEl.style.color = '#dc3545';
            console.error('Error resetting config:', error);
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