/**
 * UI Consolidation Module
 * Handles UI state and interactions for the consolidated dashboard
 */

export const UIConsolidation = (() => {
    'use strict';

    // State
    let configPanelVisible = false;
    let advancedVisible = false;

    /**
     * Initialize UI state and event listeners
     */
    function init() {
        // Update connection status based on API state
        updateConnectionStatus();
        
        // Listen for API status changes
        if (window.unifiedAPI) {
            window.addEventListener('api:statusChange', updateConnectionStatus);
        }
        
        // Listen for successful data updates
        if (window.DataLayer) {
            window.DataLayer.addEventListener('searchComplete', () => {
                updateConnectionStatus(true, 'Connected');
            });
            
            window.DataLayer.addEventListener('error', () => {
                updateConnectionStatus(false, 'Connection error');
            });
        }
    }

    /**
     * Update connection status indicator
     */
    function updateConnectionStatus(connected = null, message = null) {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        
        if (!statusDot || !statusText) return;
        
        // Auto-detect connection status if not provided
        if (connected === null) {
            // Check various indicators
            const hasApiConnection = window.unifiedAPI && window.unifiedAPI.getMode();
            const hasCookie = localStorage.getItem('elasticCookie');
            const isFastAPI = hasApiConnection === 'fastapi';
            
            if (isFastAPI) {
                connected = true;
                message = 'FastAPI Connected';
            } else if (hasCookie) {
                connected = true;
                message = 'Ready';
            } else {
                connected = false;
                message = 'No authentication';
            }
        }
        
        // Update UI
        if (connected) {
            statusDot.style.backgroundColor = '#4CAF50';
            statusText.textContent = message || 'Connected';
        } else {
            statusDot.style.backgroundColor = '#f44336';
            statusText.textContent = message || 'Disconnected';
        }
    }

    /**
     * Toggle settings panel visibility
     */
    function toggleSettings() {
        const panel = document.getElementById('configPanel');
        configPanelVisible = !configPanelVisible;
        panel.style.display = configPanelVisible ? 'block' : 'none';
        
        // Animate icon rotation
        const settingsBtn = document.querySelector('.settings-btn .icon');
        if (settingsBtn) {
            settingsBtn.style.transform = configPanelVisible ? 'rotate(45deg)' : 'rotate(0)';
        }
    }

    /**
     * Toggle advanced configuration visibility
     */
    function toggleAdvanced() {
        const advanced = document.getElementById('advancedConfig');
        const btn = event.target;
        
        advancedVisible = !advancedVisible;
        
        if (advancedVisible) {
            advanced.style.display = 'block';
            btn.textContent = 'Advanced ▲';
        } else {
            advanced.style.display = 'none';
            btn.textContent = 'Advanced ▼';
        }
    }

    /**
     * Handle time range selection changes
     */
    function handleTimeRangeChange(select) {
        const customInput = document.getElementById('customTimeRange');
        const hiddenInput = document.getElementById('currentTimeRange') || createHiddenTimeRangeInput();
        
        if (select.value === 'custom') {
            customInput.style.display = 'inline-block';
            customInput.focus();
            // Update hidden input when custom value changes
            customInput.onchange = () => {
                hiddenInput.value = customInput.value;
            };
        } else {
            customInput.style.display = 'none';
            hiddenInput.value = select.value;
        }
    }

    /**
     * Create hidden time range input for compatibility
     */
    function createHiddenTimeRangeInput() {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.id = 'currentTimeRange';
        input.value = 'now-12h';
        document.body.appendChild(input);
        return input;
    }

    /**
     * Toggle baseline date editing
     */
    function toggleBaselineEdit() {
        const display = document.getElementById('baselineDisplay');
        const edit = document.getElementById('baselineEdit');
        
        if (edit.style.display === 'none') {
            edit.style.display = 'inline-block';
            display.style.display = 'none';
        } else {
            edit.style.display = 'none';
            display.style.display = 'inline';
            updateBaselineDisplay();
        }
    }

    /**
     * Update baseline display text
     */
    function updateBaselineDisplay() {
        const start = document.getElementById('baselineStart').value;
        const end = document.getElementById('baselineEnd').value;
        const display = document.getElementById('baselineDisplay');
        
        if (start && end) {
            const startDate = new Date(start);
            const endDate = new Date(end);
            const options = { month: 'short', day: 'numeric' };
            display.textContent = `${startDate.toLocaleDateString('en', options)}-${endDate.toLocaleDateString('en', options)}, ${endDate.getFullYear()}`;
        }
    }

    /**
     * Apply configuration with proper time range handling
     */
    function applyConfig() {
        // Update hidden time range input
        const timeSelect = document.getElementById('timeRangeSelect');
        const customInput = document.getElementById('customTimeRange');
        const hiddenInput = document.getElementById('currentTimeRange') || createHiddenTimeRangeInput();
        
        hiddenInput.value = timeSelect.value === 'custom' ? customInput.value : timeSelect.value;
        
        // Call original apply function
        if (window.ConfigManager) {
            window.ConfigManager.applyConfiguration();
        }
    }

    /**
     * Handle filter selection changes
     */
    function applyFilters() {
        const filterValue = document.getElementById('statusFilter').value;
        
        // Find and click the corresponding filter button
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            if (btn.getAttribute('data-filter') === filterValue) {
                btn.click();
            }
        });
    }

    /**
     * Export table data
     */
    function exportData() {
        // Get current table data
        const rows = document.querySelectorAll('#tableBody tr:not([style*="display: none"])');
        if (rows.length === 0) {
            alert('No data to export');
            return;
        }
        
        // Build CSV content
        let csv = 'Event ID,Status,Score,Current,Expected,Change,Daily Avg\n';
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            const rowData = [
                cells[0].textContent, // Event ID
                cells[1].textContent, // Status
                cells[2].textContent, // Score
                cells[3].textContent, // Current
                cells[4].textContent, // Expected
                cells[5].textContent, // Change
                cells[6].textContent  // Daily Avg
            ];
            csv += rowData.map(cell => `"${cell.trim()}"`).join(',') + '\n';
        });
        
        // Download CSV
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rad_monitor_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    /**
     * Toggle column visibility
     */
    function toggleColumns() {
        // Simple implementation - could be enhanced with a modal
        const columns = ['Score', 'Expected', 'Change', 'Daily Avg'];
        const selected = prompt('Enter columns to hide (comma-separated):\n' + columns.join(', '));
        
        if (selected) {
            const hideColumns = selected.split(',').map(s => s.trim());
            const table = document.getElementById('dataTable');
            const headers = table.querySelectorAll('th');
            
            headers.forEach((header, index) => {
                const headerText = header.textContent;
                const shouldHide = hideColumns.some(col => headerText.includes(col));
                
                // Hide/show header
                header.style.display = shouldHide ? 'none' : '';
                
                // Hide/show corresponding cells
                const cells = table.querySelectorAll(`td:nth-child(${index + 1})`);
                cells.forEach(cell => {
                    cell.style.display = shouldHide ? 'none' : '';
                });
            });
        }
    }

    // Public API
    return {
        init,
        updateConnectionStatus,
        toggleSettings,
        toggleAdvanced,
        handleTimeRangeChange,
        toggleBaselineEdit,
        updateBaselineDisplay,
        applyConfig,
        applyFilters,
        exportData,
        toggleColumns
    };
})();

// Export as default
export default UIConsolidation;

// Make available globally for inline event handlers
if (typeof window !== 'undefined') {
    window.UIConsolidation = UIConsolidation;
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', UIConsolidation.init);
    } else {
        UIConsolidation.init();
    }
}