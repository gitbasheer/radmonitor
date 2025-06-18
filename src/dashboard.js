// dashboard.js - Dashboard functionality module for RAD Monitor

const KIBANA_URL = 'https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243';

// Configuration management
export const config = {
  baselineStart: '2025-06-01',
  baselineEnd: '2025-06-09',
  currentTimeRange: 'now-12h',
  criticalThreshold: -80,
  warningThreshold: -50,
  minDailyVolume: 100,
  autoRefreshEnabled: true,
  autoRefreshInterval: 300000, // 5 minutes
  // New filter settings
  searchTerm: '',
  hideNormal: false,
  criticalOnly: false,
  statusFilter: null
};

// Cookie management
export function setCookie(name, value, days = 7) {
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  // Don't encode the value to preserve special characters
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

export function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for(let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      // Trim the value to handle spaces
      return c.substring(nameEQ.length, c.length).trim();
    }
  }
  return null;
}

export function deleteCookie(name) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/`;
}

// Authentication
export async function getAuthenticationDetails() {
  let cookie = getCookie('elastic_cookie');
  
  // Fall back to localStorage if cookie not found
  if (!cookie) {
    cookie = localStorage.getItem('elastic_cookie');
  }
  
  if (!cookie) {
    return { valid: false, method: null, cookie: null };
  }
  
  // Only check CORS proxy on localhost
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    const corsProxyAvailable = await checkCorsProxy();
    if (corsProxyAvailable) {
      return { valid: true, method: 'proxy', cookie };
    } else {
      return { valid: false, method: null, cookie };
    }
  } else {
    // Non-localhost, use direct method
    return { valid: true, method: 'direct', cookie };
  }
}

export async function checkCorsProxy() {
  try {
    const response = await fetch('http://localhost:8889/health', {
      method: 'GET',
      mode: 'cors'
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Score calculation
export function calculateScore(current, baseline) {
  if (baseline === 0) return 0;
  const score = Math.round((current - baseline) / baseline * 100);
  // Ensure we return 0 not -0
  return score === 0 ? 0 : score;
}

export function getStatus(score, dailyAvg) {
  // Use dynamic thresholds from config
  const criticalThreshold = config.criticalThreshold;
  const warningThreshold = config.warningThreshold;
  
  if (dailyAvg >= 1000) {
    // High volume cards
    if (score <= criticalThreshold) return 'CRITICAL';
    if (score <= warningThreshold) return 'WARNING';
  } else {
    // Medium volume cards (more sensitive)
    if (score <= criticalThreshold) return 'CRITICAL';
    if (score <= warningThreshold) return 'WARNING';
    if (score <= (warningThreshold + 20)) return 'WARNING'; // Additional sensitivity
  }
  
  if (score > 0) return 'INCREASED';
  return 'NORMAL';
}

export function calculateImpact(current, expected) {
  const difference = Math.abs(current - expected);
  
  if (difference < 50) {
    return { type: 'normal', message: 'Normal variance' };
  }
  
  if (current < expected) {
    return { type: 'loss', message: `Lost ~${difference.toLocaleString()} impressions` };
  } else {
    return { type: 'gain', message: `Gained ~${difference.toLocaleString()} impressions` };
  }
}

// Data processing
export function processElasticsearchResponse(response) {
  const results = [];
  
  if (!response.aggregations || !response.aggregations.events) {
    throw new Error('Invalid response structure');
  }
  
  const buckets = response.aggregations.events.buckets;
  
  for (const bucket of buckets) {
    const eventId = bucket.key;
    const baselineCount = bucket.baseline?.doc_count || 0;
    const currentCount = bucket.current?.doc_count || 0;
    
    // Calculate baseline for 12 hours (8 days of data)
    const baseline12h = baselineCount > 0 ? (baselineCount / 8 / 24 * 12) : 0;
    const dailyAvg = baselineCount / 8;
    
    // Skip low volume events based on dynamic threshold
    if (dailyAvg < config.minDailyVolume) {
      continue;
    }
    
    const score = calculateScore(currentCount, baseline12h);
    const status = getStatus(score, dailyAvg);
    const impact = calculateImpact(currentCount, baseline12h);
    
    results.push({
      eventId,
      displayName: eventId.replace('pandc.vnext.recommendations.feed.', ''),
      current: currentCount,
      baseline12h: Math.round(baseline12h),
      score,
      status,
      impact,
      dailyAvg: Math.round(dailyAvg)
    });
  }
  
  // Sort by score (most negative first, which means lowest scores first)
  results.sort((a, b) => a.score - b.score);
  
  return results;
}

// Search and filter functions
export function searchResults(results, searchTerm) {
  if (!searchTerm || searchTerm.trim() === '') {
    return results;
  }
  
  const term = searchTerm.trim().toLowerCase();
  return results.filter(result => 
    result.displayName.toLowerCase().includes(term) ||
    result.eventId.toLowerCase().includes(term)
  );
}

export function filterByStatus(results, status) {
  if (!status) return results;
  
  return results.filter(result => 
    result.status.toLowerCase() === status.toLowerCase()
  );
}

export function filterByThreshold(results, hideNormal = false, criticalOnly = false) {
  if (criticalOnly) {
    return results.filter(result => result.status === 'CRITICAL');
  }
  
  if (hideNormal) {
    return results.filter(result => 
      result.status === 'CRITICAL' || result.status === 'WARNING'
    );
  }
  
  return results;
}

export function applyAllFilters(results, filters = {}) {
  let filtered = [...results];
  
  // Apply search
  if (filters.searchTerm) {
    filtered = searchResults(filtered, filters.searchTerm);
  }
  
  // Apply status filter
  if (filters.statusFilter) {
    filtered = filterByStatus(filtered, filters.statusFilter);
  }
  
  // Apply threshold filters
  filtered = filterByThreshold(filtered, filters.hideNormal, filters.criticalOnly);
  
  return filtered;
}

// API calls
export async function fetchTrafficData(auth, customConfig = {}) {
  const mergedConfig = { ...config, ...customConfig };
  
  // Parse time range
  const timeRange = mergedConfig.currentTimeRange;
  const hoursMatch = timeRange.match(/now-(\d+)h/);
  const hours = hoursMatch ? parseInt(hoursMatch[1]) : 12;
  
  const query = {
    aggs: {
      events: {
        terms: {
          field: "detail.event.data.traffic.eid.keyword",
          order: { "_key": "asc" },
          size: 500
        },
        aggs: {
          baseline: {
            filter: {
              range: {
                "@timestamp": {
                  gte: mergedConfig.baselineStart,
                  lt: mergedConfig.baselineEnd
                }
              }
            }
          },
          current: {
            filter: {
              range: {
                "@timestamp": {
                  gte: mergedConfig.currentTimeRange
                }
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
              "detail.event.data.traffic.eid.keyword": {
                value: "pandc.vnext.recommendations.feed.feed*"
              }
            }
          },
          {
            match_phrase: {
              "detail.global.page.host": "dashboard.godaddy.com"
            }
          },
          {
            range: {
              "@timestamp": {
                gte: "2025-05-19T04:00:00.000Z",
                lte: "now"
              }
            }
          }
        ]
      }
    }
  };
  
  let apiUrl, headers;
  
  if (auth.method === 'proxy') {
    apiUrl = 'http://localhost:8889/kibana-proxy';
    headers = {
      'Content-Type': 'application/json',
      'X-Elastic-Cookie': auth.cookie
    };
  } else {
    apiUrl = `${KIBANA_URL}/api/console/proxy?path=traffic-*/_search&method=POST`;
    headers = {
      'Content-Type': 'application/json',
      'kbn-xsrf': 'true',
      'Cookie': `sid=${auth.cookie}`
    };
  }
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(query),
    credentials: auth.method === 'direct' ? 'include' : 'omit'
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(`Elasticsearch error: ${data.error.reason || data.error.type}`);
  }
  
  return data;
}

// Preference management
export function savePreferences(preferences) {
  localStorage.setItem('rad_monitor_preferences', JSON.stringify(preferences));
}

export function loadPreferences() {
  const saved = localStorage.getItem('rad_monitor_preferences');
  if (!saved) return null;
  
  try {
    return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to parse saved preferences:', e);
    return null;
  }
}

export function applyPreferences(preferences) {
  if (!preferences) return;
  
  // Apply to config
  Object.keys(preferences).forEach(key => {
    if (key in config) {
      config[key] = preferences[key];
    }
  });
}

// UI updates
export function updateDashboardUI(data, results) {
  // Count statuses
  const statusCounts = {
    critical: results.filter(r => r.status === 'CRITICAL').length,
    warning: results.filter(r => r.status === 'WARNING').length,
    normal: results.filter(r => r.status === 'NORMAL').length,
    increased: results.filter(r => r.status === 'INCREASED').length
  };
  
  // Update summary cards
  const summaryElements = {
    critical: document.querySelector('.card.critical .card-number'),
    warning: document.querySelector('.card.warning .card-number'),
    normal: document.querySelector('.card.normal .card-number'),
    increased: document.querySelector('.card.increased .card-number')
  };
  
  Object.keys(summaryElements).forEach(key => {
    if (summaryElements[key]) {
      summaryElements[key].textContent = statusCounts[key];
    }
  });
  
  // Update timestamp
  const timestampElement = document.querySelector('.timestamp');
  if (timestampElement) {
    timestampElement.textContent = `Last updated: ${new Date().toLocaleString()}`;
  }
  
  // Update table
  updateTable(results);
}

export function updateTable(results) {
  const tbody = document.querySelector('table tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  results.forEach(result => {
    const row = document.createElement('tr');
    
    // Create elements to properly escape HTML
    const eventNameSpan = document.createElement('span');
    eventNameSpan.className = 'event-name';
    eventNameSpan.textContent = result.displayName;
    
    const eventNameTd = document.createElement('td');
    eventNameTd.appendChild(eventNameSpan);
    
    row.appendChild(eventNameTd);
    
    // Handle missing impact property
    const impactType = result.impact ? result.impact.type : 'normal';
    const impactMessage = result.impact ? result.impact.message : 'No impact data';
    
    // Add remaining cells using innerHTML for simplicity
    row.innerHTML += `
      <td><span class="badge ${result.status.toLowerCase()}">${result.status}</span></td>
      <td class="number"><span class="score ${result.score < 0 ? 'negative' : 'positive'}">${result.score > 0 ? '+' : ''}${result.score}%</span></td>
      <td class="number">${(result.current || 0).toLocaleString()}</td>
      <td class="number">${(result.baseline12h || 0).toLocaleString()}</td>
      <td class="number">${(result.dailyAvg || 0).toLocaleString()}</td>
      <td><span class="impact ${impactType}">${impactMessage}</span></td>
    `;
    tbody.appendChild(row);
  });
}

// Main update function
export async function updateDashboardRealtime(customConfig = {}) {
  try {
    const auth = await getAuthenticationDetails();
    
    if (!auth.valid) {
      throw new Error('Authentication not available or invalid');
    }
    
    const data = await fetchTrafficData(auth, customConfig);
    const results = processElasticsearchResponse(data);
    
    updateDashboardUI(data, results);
    
    return { success: true, results };
  } catch (error) {
    console.error('Dashboard update failed:', error);
    return { success: false, error: error.message };
  }
}

// Auto-refresh functionality
let autoRefreshTimer = null;

export function startAutoRefresh() {
  if (!config.autoRefreshEnabled) return;
  
  stopAutoRefresh();
  
  autoRefreshTimer = setInterval(() => {
    updateDashboardRealtime();
  }, config.autoRefreshInterval);
}

export function stopAutoRefresh() {
  if (autoRefreshTimer) {
    // Handle Node.js environment where clearInterval might not be global
    if (typeof clearInterval !== 'undefined') {
      clearInterval(autoRefreshTimer);
    }
    autoRefreshTimer = null;
  }
}

export function toggleAutoRefresh() {
  config.autoRefreshEnabled = !config.autoRefreshEnabled;
  
  if (config.autoRefreshEnabled) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
  
  return config.autoRefreshEnabled;
} 