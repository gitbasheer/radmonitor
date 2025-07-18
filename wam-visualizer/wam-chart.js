/**
 * WAM Chart Component
 * Simple visualization for EID timeline data
 */

import { WamDataService } from './wam-service.js';

export class WamChart {
    constructor(containerId, config = {}) {
        this.container = document.getElementById(containerId);
        this.config = {
            proxyUrl: 'http://localhost:8001',
            esIndex: '*',
            eidPattern: 'pandc.vnext.recommendations.metricsevolved*',
            topEidsLimit: 20,
            cardinalityPrecision: 1000,
            baselineWeeks: 3,
            chartTension: 0.1,
            pointRadius: 3,
            defaultRange: '24h',
            showBaseline: true,
            timestampField: '@timestamp',
            eidField: 'detail.event.data.traffic.eid.keyword',
            userIdField: 'detail.event.data.traffic.userId.keyword',
            ...config
        };
        
        this.service = new WamDataService(this.config);
        this.chart = null;
        this.currentEid = null;
        
        if (!this.container) {
            throw new Error(`Container element '${containerId}' not found`);
        }
        
        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="wam-chart-container" style="background: var(--bg-secondary); padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px var(--shadow);">
                <div class="wam-chart-header" style="margin-bottom: 20px;">
                    <h3 style="margin: 0 0 15px 0; color: var(--text-primary);">WAM EID Timeline Visualization</h3>
                    
                    <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
                        <select id="wam-eid-select" style="padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; flex: 1; max-width: 400px; background: var(--bg-primary); color: var(--text-primary);">
                            <option value="">Loading EIDs...</option>
                        </select>
                        
                        <select id="wam-time-range" style="padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-primary); color: var(--text-primary);">
                            <option value="1h" ${this.config.defaultRange === '1h' ? 'selected' : ''}>Last 1 Hour</option>
                            <option value="6h" ${this.config.defaultRange === '6h' ? 'selected' : ''}>Last 6 Hours</option>
                            <option value="24h" ${this.config.defaultRange === '24h' ? 'selected' : ''}>Last 24 Hours</option>
                            <option value="7d" ${this.config.defaultRange === '7d' ? 'selected' : ''}>Last 7 Days</option>
                            <option value="30d" ${this.config.defaultRange === '30d' ? 'selected' : ''}>Last 30 Days</option>
                        </select>
                        
                        <button id="wam-refresh-btn" style="padding: 8px 16px; background: #FF6F00; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Refresh
                        </button>
                        
                        <button id="wam-kibana-btn" style="padding: 8px 16px; background: #1BA9F5; color: white; border: none; border-radius: 4px; cursor: pointer; display: none; font-weight: 500;">
                            <svg style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                            </svg>
                            View in Kibana
                        </button>
                        
                        <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
                            <input type="checkbox" id="wam-baseline-toggle" ${this.config.showBaseline ? 'checked' : ''}>
                            <span>Show Baseline</span>
                        </label>
                    </div>
                </div>
                
                <div id="wam-chart-status" style="margin: 10px 0;"></div>
                
                <div style="position: relative; height: 400px;">
                    <canvas id="wam-timeline-chart"></canvas>
                </div>
                
                <div id="wam-chart-stats" style="margin-top: 20px; padding: 15px; background: var(--bg-primary); border-radius: 4px; display: none;">
                    <h4 style="margin: 0 0 10px 0; color: var(--text-primary);">Statistics</h4>
                    <div id="wam-stats-content" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;"></div>
                </div>
            </div>
        `;
        
        this.initializeChart();
        this.attachEventListeners();
        this.loadTopEids();
    }

    async initializeChart() {
        // Load Chart.js from CDN
        if (!window.Chart) {
            await this.loadChartJs();
        }

        const canvas = document.getElementById('wam-timeline-chart');
        if (!canvas) {
            console.error('Canvas element not found');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    // Baseline upper bound (p90) - subtle dotted line
                    {
                        label: 'Expected High (90th)',
                        data: [],
                        borderColor: 'rgba(156, 39, 176, 0.5)',
                        borderDash: [2, 4],
                        borderWidth: 1.5,
                        backgroundColor: 'transparent',
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        tension: 0.4,
                        yAxisID: 'y-events',
                        order: 5
                    },
                    // Baseline lower bound (p10) - subtle dotted line
                    {
                        label: 'Expected Low (10th)',
                        data: [],
                        borderColor: 'rgba(156, 39, 176, 0.5)',
                        borderDash: [2, 4],
                        borderWidth: 1.5,
                        backgroundColor: 'transparent',
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        tension: 0.4,
                        yAxisID: 'y-events',
                        order: 5
                    },
                    // Baseline typical range (p25-p75) - more prominent
                    {
                        label: 'Typical Range',
                        data: [],
                        borderColor: 'rgba(103, 58, 183, 0.7)',
                        borderDash: [6, 3],
                        borderWidth: 2,
                        backgroundColor: 'transparent',
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        tension: 0.4,
                        yAxisID: 'y-events',
                        order: 4
                    },
                    {
                        label: false, // p25 line (hidden)
                        data: [],
                        borderColor: 'rgba(103, 58, 183, 0.7)',
                        borderDash: [6, 3],
                        borderWidth: 2,
                        backgroundColor: 'transparent',
                        pointRadius: 0,
                        tension: 0.4,
                        yAxisID: 'y-events',
                        order: 4
                    },
                    // Baseline median - prominent solid line
                    {
                        label: 'Expected Normal',
                        data: [],
                        borderColor: 'rgba(94, 53, 177, 0.8)',
                        borderDash: [],
                        borderWidth: 2.5,
                        backgroundColor: 'transparent',
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        tension: 0.4,
                        yAxisID: 'y-events',
                        order: 3
                    },
                    // Current data - prominent colors
                    {
                        label: 'Events',
                        data: [],
                        borderColor: '#FF6F00',
                        backgroundColor: 'transparent',
                        borderWidth: 3,
                        tension: this.config.chartTension,
                        pointRadius: this.config.pointRadius,
                        pointHoverRadius: this.config.pointRadius + 3,
                        pointBackgroundColor: '#FF6F00',
                        yAxisID: 'y-events',
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            filter: function(item) {
                                // Only show items with actual labels
                                return item && item.text && item.text !== '' && item.text !== false;
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label;
                                if (!label || label === false) return null;
                                
                                const value = context.parsed.y;
                                if (label.includes('Baseline')) {
                                    return `${label}: ${Math.round(value).toLocaleString()}`;
                                }
                                
                                return `${label}: ${value.toLocaleString()}`;
                            },
                            afterLabel: function(context) {
                                // Add baseline comparison for current data
                                if (context.datasetIndex === 5) { // Events dataset
                                    const baselineMedian = context.chart.data.datasets[4].data[context.dataIndex];
                                    if (baselineMedian) {
                                        const diff = ((context.parsed.y - baselineMedian) / baselineMedian * 100).toFixed(1);
                                        const sign = diff > 0 ? '+' : '';
                                        const status = Math.abs(diff) < 10 ? '✓ Normal' : 
                                                      diff > 0 ? '⚠️ Above Normal' : '⚠️ Below Normal';
                                        return [`vs Expected: ${sign}${diff}%`, status];
                                    }
                                }
                                return null;
                            }
                        },
                        filter: function(tooltipItem) {
                            // Hide tooltip for invisible baseline boundaries
                            return tooltipItem.dataset.label !== false;
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            tooltipFormat: 'MMM dd, HH:mm',
                            displayFormats: {
                                hour: 'HH:mm',
                                day: 'MMM dd'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    },
                    'y-events': {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Events'
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString();
                            }
                        }
                    },
                }
            }
        });
    }

    async loadChartJs() {
        // Load Chart.js
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        
        // Load date adapter for Chart.js time scale
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    attachEventListeners() {
        const eidSelect = document.getElementById('wam-eid-select');
        const timeRange = document.getElementById('wam-time-range');
        const refreshBtn = document.getElementById('wam-refresh-btn');
        const baselineToggle = document.getElementById('wam-baseline-toggle');
        const kibanaBtn = document.getElementById('wam-kibana-btn');
        
        eidSelect.addEventListener('change', () => this.loadEidData());
        timeRange.addEventListener('change', () => this.loadEidData(true)); // Pass true for time range changes
        refreshBtn.addEventListener('click', () => {
            this.loadTopEids();
            this.loadEidData();
        });
        baselineToggle.addEventListener('change', (e) => {
            this.toggleBaseline(e.target.checked);
        });
        kibanaBtn.addEventListener('click', () => {
            this.openInKibana();
        });
    }

    async loadTopEids() {
        try {
            this.showStatus('Loading EIDs...', 'info');
            const timeRange = document.getElementById('wam-time-range').value;
            const eids = await this.service.fetchTopEids(timeRange, this.config.topEidsLimit);
            
            const select = document.getElementById('wam-eid-select');
            const currentValue = select.value;
            
            select.innerHTML = '<option value="">Select an EID</option>' +
                eids.map(eid => 
                    `<option value="${eid.eid}">${eid.eid} (${eid.events.toLocaleString()} events)</option>`
                ).join('');
            
            // Restore previous selection if it still exists
            if (currentValue && eids.some(e => e.eid === currentValue)) {
                select.value = currentValue;
            }
            
            this.showStatus('', 'success');
        } catch (error) {
            this.showStatus(`Failed to load EIDs: ${error.message}`, 'error');
        }
    }

    async loadEidData(isTimeRangeChange = false) {
        const eid = document.getElementById('wam-eid-select').value;
        if (!eid) {
            this.clearChart();
            return;
        }

        const timeRange = document.getElementById('wam-time-range').value;
        
        try {
            if (isTimeRangeChange) {
                // Add a subtle loading indicator for time range changes
                this.showStatus('Adjusting time window...', 'info');
            } else {
                this.showStatus(`Loading data for ${eid}...`, 'info');
            }
            this.currentEid = eid;
            
            const showBaseline = document.getElementById('wam-baseline-toggle').checked;
            const data = await this.service.fetchEidTimeline(eid, timeRange, showBaseline);
            this.updateChart(data, isTimeRangeChange);
            this.updateStats(data.current || data);
            
            this.showStatus('', 'success');
        } catch (error) {
            this.showStatus(`Failed to load data: ${error.message}`, 'error');
        }
    }

    updateChart(data, isTimeRangeChange = false) {
        if (!this.chart) {
            return;
        }

        // Handle both old format (array) and new format (object with current/baseline)
        const currentData = data.current || data;
        const baselineData = data.baseline || [];
        
        if (!currentData || currentData.length === 0) {
            this.clearChart();
            return;
        }
        
        // Store current data for Kibana URL generation
        this.currentData = currentData;

        const labels = currentData.map(d => d.timestamp);
        const events = currentData.map(d => d.events);
        
        // Update baseline datasets (indices 0-4)
        if (baselineData && baselineData.length > 0) {
            console.log('Updating baseline data:', baselineData.length, 'points');
            // p90 (upper bound)
            this.chart.data.datasets[0].data = baselineData.map(d => d.p90 || 0);
            // p10 (lower bound)
            this.chart.data.datasets[1].data = baselineData.map(d => d.p10 || 0);
            // p75 (upper typical range)
            this.chart.data.datasets[2].data = baselineData.map(d => d.p75 || 0);
            // p25 (lower typical range)
            this.chart.data.datasets[3].data = baselineData.map(d => d.p25 || 0);
            // p50 (median - expected normal)
            this.chart.data.datasets[4].data = baselineData.map(d => d.p50 || 0);
        } else {
            console.log('No baseline data available');
            // Clear baseline data if not available
            for (let i = 0; i < 5; i++) {
                this.chart.data.datasets[i].data = [];
            }
        }
        
        // Update current data (index 5)
        this.chart.data.labels = labels;
        this.chart.data.datasets[5].data = events;
        
        // Use smooth animation for all updates
        this.chart.update();
        
        // Show Kibana button when data is loaded
        const kibanaBtn = document.getElementById('wam-kibana-btn');
        if (kibanaBtn && this.currentEid) {
            kibanaBtn.style.display = 'block';
        }
    }
    
    toggleBaseline(show) {
        if (!this.chart) return;
        
        // Toggle visibility of baseline datasets
        for (let i = 0; i < 5; i++) {
            this.chart.data.datasets[i].hidden = !show;
        }
        
        this.chart.update();
        
        // Reload data if toggling on and we don't have baseline data
        if (show && this.currentEid && this.chart.data.datasets[0].data.length === 0) {
            this.loadEidData();
        }
    }

    updateStats(data) {
        const statsDiv = document.getElementById('wam-chart-stats');
        const statsContent = document.getElementById('wam-stats-content');
        
        if (!data || data.length === 0) {
            statsDiv.style.display = 'none';
            return;
        }

        const totalEvents = data.reduce((sum, d) => sum + d.events, 0);
        const avgEvents = Math.round(totalEvents / data.length);
        const maxEvents = Math.max(...data.map(d => d.events));
        const minEvents = Math.min(...data.map(d => d.events));
        
        statsContent.innerHTML = `
            <div>
                <div style="color: var(--text-secondary); font-size: 12px;">Total Events</div>
                <div style="font-size: 20px; font-weight: bold; color: var(--accent);">${totalEvents.toLocaleString()}</div>
            </div>
            <div>
                <div style="color: var(--text-secondary); font-size: 12px;">Avg Events/Period</div>
                <div style="font-size: 20px; font-weight: bold; color: var(--text-primary);">${avgEvents.toLocaleString()}</div>
            </div>
            <div>
                <div style="color: var(--text-secondary); font-size: 12px;">Peak Events</div>
                <div style="font-size: 20px; font-weight: bold; color: var(--text-primary);">${maxEvents.toLocaleString()}</div>
            </div>
            <div>
                <div style="color: var(--text-secondary); font-size: 12px;">Min Events</div>
                <div style="font-size: 20px; font-weight: bold; color: var(--text-primary);">${minEvents.toLocaleString()}</div>
            </div>
        `;
        
        statsDiv.style.display = 'block';
    }

    clearChart() {
        if (this.chart) {
            this.chart.data.labels = [];
            // Clear all datasets
            this.chart.data.datasets.forEach(dataset => {
                dataset.data = [];
            });
            this.chart.update();
        }
        document.getElementById('wam-chart-stats').style.display = 'none';
    }

    showStatus(message, type = 'info') {
        const statusDiv = document.getElementById('wam-chart-status');
        if (!message) {
            statusDiv.innerHTML = '';
            return;
        }

        const colors = {
            info: '#1976d2',
            success: '#388e3c',
            error: '#d32f2f'
        };
        
        statusDiv.innerHTML = `<div style="padding: 10px; background: ${colors[type]}20; color: ${colors[type]}; border-radius: 4px;">${message}</div>`;
    }

    setCookie(cookie) {
        this.service.setCookie(cookie);
    }
    
    applyConfig(newConfig) {
        // Update config
        this.config = { ...this.config, ...newConfig };
        
        // Update service with new config
        this.service.updateConfig(this.config);
        
        // Update chart properties if chart exists
        if (this.chart) {
            // Update line tension and point sizes for events dataset
            if (this.chart.data.datasets[5]) { // Events dataset
                this.chart.data.datasets[5].tension = this.config.chartTension;
                this.chart.data.datasets[5].pointRadius = this.config.pointRadius;
                this.chart.data.datasets[5].pointHoverRadius = this.config.pointRadius + 3;
            }
            
            this.chart.update();
        }
        
        // Update baseline toggle state
        const baselineToggle = document.getElementById('wam-baseline-toggle');
        if (baselineToggle) {
            baselineToggle.checked = this.config.showBaseline;
            this.toggleBaseline(this.config.showBaseline);
        }
        
        // Set default time range
        const timeRange = document.getElementById('wam-time-range');
        if (timeRange && timeRange.value !== this.config.defaultRange) {
            timeRange.value = this.config.defaultRange;
        }
        
        // Reload data with new configuration
        this.loadTopEids();
        if (this.currentEid) {
            this.loadEidData();
        }
    }

    updateTheme(isDark) {
        if (!this.chart) return;
        
        // Update chart colors based on theme
        const textColor = isDark ? '#e0e0e0' : '#333';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const baselineColor = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.2)';
        
        // Update scale title colors
        this.chart.options.scales.x.title.color = textColor;
        this.chart.options.scales['y-events'].title.color = textColor;
        
        // Update scale tick colors
        this.chart.options.scales.x.ticks.color = textColor;
        this.chart.options.scales['y-events'].ticks.color = textColor;
        
        // Update grid colors
        this.chart.options.scales.x.grid.color = gridColor;
        this.chart.options.scales['y-events'].grid.color = gridColor;
        
        // Update legend color
        this.chart.options.plugins.legend.labels.color = textColor;
        
        // Update baseline colors for dark mode
        if (isDark) {
            // Baseline upper/lower bounds (p10/p90)
            this.chart.data.datasets[0].borderColor = 'rgba(206, 147, 216, 0.6)';
            this.chart.data.datasets[1].borderColor = 'rgba(206, 147, 216, 0.6)';
            // Baseline typical range (p25/p75)
            this.chart.data.datasets[2].borderColor = 'rgba(179, 136, 255, 0.8)';
            this.chart.data.datasets[3].borderColor = 'rgba(179, 136, 255, 0.8)';
            // Baseline median
            this.chart.data.datasets[4].borderColor = 'rgba(149, 117, 205, 0.9)';
        } else {
            // Reset to original colors for light mode
            this.chart.data.datasets[0].borderColor = 'rgba(156, 39, 176, 0.5)';
            this.chart.data.datasets[1].borderColor = 'rgba(156, 39, 176, 0.5)';
            this.chart.data.datasets[2].borderColor = 'rgba(103, 58, 183, 0.7)';
            this.chart.data.datasets[3].borderColor = 'rgba(103, 58, 183, 0.7)';
            this.chart.data.datasets[4].borderColor = 'rgba(94, 53, 177, 0.8)';
        }
        
        // Update the chart
        this.chart.update();
        
        // Update status message colors
        const statusDiv = document.getElementById('wam-chart-status');
        if (statusDiv && statusDiv.innerHTML) {
            // Re-render any existing status message with new theme
            const existingMessage = statusDiv.querySelector('div');
            if (existingMessage) {
                const message = existingMessage.textContent;
                const type = existingMessage.style.color.includes('1976d2') ? 'info' :
                           existingMessage.style.color.includes('388e3c') ? 'success' : 'error';
                this.showStatus(message, type);
            }
        }
    }
    
    openInKibana() {
        if (!this.currentEid || !this.currentData || this.currentData.length === 0) {
            return;
        }
        
        // Get time range from the data
        const startTime = this.currentData[0].timestamp;
        const endTime = this.currentData[this.currentData.length - 1].timestamp;
        
        // Get the base Kibana URL from the cookie domain
        const kibanaBase = 'https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243';
        
        // Build the query
        const query = {
            query: {
                match_phrase: {
                    [this.config.eidField.replace('.keyword', '')]: this.currentEid
                }
            }
        };
        
        // Create the Kibana Discover URL
        const appState = {
            columns: ['_source'],
            filters: [],
            index: 'traffic-*',
            interval: 'auto',
            query: {
                language: 'kuery',
                query: `${this.config.eidField.replace('.keyword', '')} : "${this.currentEid}"`
            },
            sort: [['@timestamp', 'desc']]
        };
        
        const globalState = {
            filters: [],
            refreshInterval: {
                pause: true,
                value: 0
            },
            time: {
                from: startTime.toISOString(),
                to: endTime.toISOString()
            }
        };
        
        // Encode the states
        const encodedAppState = encodeURIComponent(JSON.stringify(appState));
        const encodedGlobalState = encodeURIComponent(JSON.stringify(globalState));
        
        // Construct the full URL
        const kibanaUrl = `${kibanaBase}/app/discover#/?_g=${encodedGlobalState}&_a=${encodedAppState}`;
        
        // Open in new tab
        window.open(kibanaUrl, '_blank');
    }
}