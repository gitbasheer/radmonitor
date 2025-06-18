# RAD Traffic Monitor

A real-time monitoring dashboard for GoDaddy's RAD (Recommendation) cards that automatically tracks traffic health, detects anomalies, and provides instant alerts for traffic drops.

🔗 **Live Dashboard**: https://balkhalil-godaddy.github.io/vh-rad-traffic-monitor/

## 🎯 Overview

The RAD Traffic Monitor was built to solve a critical problem: After migrating RAD cards to a new system, traffic dropped by 50% but went undetected for days. This dashboard ensures such incidents are caught immediately by:

- **Real-time monitoring** of traffic across all RAD card types
- **Automatic anomaly detection** with configurable thresholds
- **Visual alerts** for critical drops or unusual spikes
- **Historical comparison** to identify trends
- **Automated updates** every 10 minutes via GitHub Actions

## ✨ Features

### Real-Time Monitoring
- Live traffic data from Elasticsearch/Kibana
- Auto-refresh every 60 seconds (configurable)
- Visual indicators for traffic health status
- Support for all RAD card types (product, article, support, video)

### Search and Filter
- **Real-time search**: Find specific cards by name or ID
- **Status filtering**: Click summary cards to filter by status
- **Threshold filtering**: Hide normal/increased traffic to focus on issues
- **Save preferences**: Remember your filter settings across sessions

### Intelligent Scoring System
- Calculates traffic changes using percentage and z-score algorithms
- Dynamic thresholds based on traffic volume
- Four status levels: CRITICAL, WARNING, NORMAL, INCREASED
- Automatic severity detection for different traffic volumes

### Visual Dashboard
- Color-coded cards for each RAD type
- Summary statistics with trend indicators
- Sortable data table with all metrics
- Last refresh timestamp
- Mobile-responsive design

### Control Panel
- **Dynamic thresholds**: Adjust critical and warning levels
- **Volume filtering**: Set minimum daily volume for monitoring
- **Time range**: Select from 1 hour to 48 hours of data
- **Auto-refresh**: Toggle and configure refresh interval
- **Apply/Reset**: Instantly update dashboard with new settings

### Automated Deployment
- GitHub Actions updates dashboard every 10 minutes
- Hosted on GitHub Pages (no server required)
- Works without CORS proxy in production
- Automatic error recovery

## 🚀 Quick Start

### Prerequisites
- Python 3.x
- Git
- Web browser
- Elasticsearch/Kibana access with valid cookie

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/rad_monitor.git
   cd rad_monitor
   ```

2. **Set up authentication**
   ```bash
   # Get your Elastic cookie from Kibana (see Authentication section)
   export ELASTIC_COOKIE="your_cookie_here"
   ```

3. **Run with CORS proxy** (recommended for local development)
   ```bash
   ./run_with_cors.sh
   ```
   This will:
   - Start CORS proxy on http://localhost:8889
   - Generate dashboard with latest data
   - Open dashboard at http://localhost:8888
   - Enable real-time API calls without CORS errors

### Alternative: Quick Test
```bash
# Generate static dashboard and view
./test_locally.sh
# Then manually open index.html in your browser
```

## 🔐 Authentication

The dashboard requires an Elasticsearch session cookie to fetch data. 

### Getting Your Cookie:

1. Log into Kibana (https://usieventho-prod-usw2.kb.us-west-2.aws.found.io)
2. Open browser Developer Tools → Network tab
3. Look for any request and find the `Cookie` header
4. Copy the value starting with `sid=Fe26.2**...`
5. Use the full cookie value (without `sid=` prefix) as your `ELASTIC_COOKIE`

### Setting the Cookie:

**For local development:**
```bash
export ELASTIC_COOKIE="Fe26.2**your_cookie_here**"
```

**For GitHub deployment:**
1. Go to your repo's Settings → Secrets and variables → Actions
2. Add a new secret named `ELASTIC_COOKIE`
3. Paste your cookie value

**In the dashboard UI:**
1. Click the ⚙️ gear icon
2. Click '🔑 Set Cookie for Real-time'
3. Paste your Elastic cookie
4. Click 'Test Connection' to verify

## 🏗️ Project Structure

```
rad_monitor/
├── index.html                   # Main dashboard (generated)
├── src/
│   └── dashboard.js            # Dashboard JavaScript modules
├── scripts/
│   ├── generate_dashboard.sh   # Dashboard generation script
│   └── legacy/                 # Archived scripts for reference
├── tests/                      # Comprehensive test suite
│   ├── *.test.js              # JavaScript tests (Vitest)
│   ├── test_*.py              # Python tests (pytest)
│   ├── test_*.bats            # Bash tests (bats)
│   └── requirements.txt       # Test dependencies
├── data/
│   └── raw_response.json      # Latest API response (generated)
├── .github/
│   └── workflows/
│       ├── update-dashboard.yml # Auto-update workflow
│       └── test.yml            # CI test workflow
├── cors_proxy.py              # Local CORS proxy server
├── run_with_cors.sh          # Primary local development script
├── test_locally.sh           # Quick test script
├── run_all_tests.sh          # Comprehensive test runner
├── package.json              # Node.js dependencies
├── vitest.config.js          # JavaScript test configuration
├── .gitignore                # Git ignore patterns
└── README.md                 # This file
```

## 📦 Installation

### Full Setup

1. **Install dependencies**
   ```bash
   # For JavaScript tests (optional)
   npm install
   
   # For Python tests (optional)
   pip install -r tests/requirements.txt
   
   # For Bash tests (optional)
   brew install bats-core  # macOS
   sudo apt-get install bats  # Linux
   ```

2. **Make scripts executable**
   ```bash
   chmod +x run_with_cors.sh test_locally.sh run_all_tests.sh
   chmod +x scripts/generate_dashboard.sh
   ```

## 🧪 Testing

The project includes comprehensive test coverage across all components.

### Run All Tests
```bash
./run_all_tests.sh
```

### Test Categories

#### JavaScript Tests (Vitest) - 150+ tests
```bash
npm test                    # Run tests
npm run test:coverage      # With coverage
npm run test:watch         # Watch mode
```

**Coverage includes:**
- Cookie management
- Authentication flow
- Score calculations
- Data processing
- UI updates
- Search and filtering
- Integration scenarios

#### Python Tests (pytest) - 40+ tests
```bash
pytest tests/ -v           # Run all Python tests
pytest tests/test_cors_proxy.py -v --cov=cors_proxy
```

**Coverage includes:**
- CORS proxy functionality
- SSL handling
- Error responses
- GitHub Pages integration

#### Bash Tests (bats) - 20+ tests
```bash
bats tests/test_bash_scripts.bats
```

**Coverage includes:**
- Script execution
- Server management
- Error handling
- Process control

### CI/CD

Tests run automatically on:
- Push to main branch
- Pull requests
- Manual workflow dispatch

Test matrix covers:
- Node.js: 18.x, 20.x
- Python: 3.9, 3.10, 3.11
- OS: Ubuntu latest

## 🌐 Deployment

### GitHub Pages (Recommended)

1. **Enable GitHub Pages**
   - Go to Settings → Pages
   - Source: Deploy from branch
   - Branch: main, folder: / (root)

2. **Add GitHub Secret**
   - Settings → Secrets → Actions
   - Add `ELASTIC_COOKIE` with your cookie value

3. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial deployment"
   git push origin main
   ```

4. **Access your dashboard**
   - Wait for Actions to complete
   - Visit: https://yourusername.github.io/rad_monitor/

The dashboard will automatically update every 10 minutes via GitHub Actions.

### Manual Deployment

You can also host the static files on any web server:
```bash
# Generate dashboard
./scripts/generate_dashboard.sh

# Copy files to your server
scp -r index.html data/ user@server:/path/to/webroot/
```

## 🔧 Configuration

### Dashboard Settings

Use the Control Panel (⚙️ icon) for real-time configuration:

- **Critical Threshold**: Percentage drop for critical alerts (-80% default)
- **Warning Threshold**: Percentage drop for warnings (-50% default)
- **Min Daily Volume**: Filter out low-traffic cards (100 default)
- **Time Range**: Data window from 1h to 48h (12h default)
- **Auto Refresh**: Toggle and set interval (60s default)

### CORS Proxy Settings

In `cors_proxy.py`:
```python
PORT = 8889  # Proxy port
KIBANA_URL = "https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243"
```

### GitHub Actions Schedule

In `.github/workflows/update-dashboard.yml`:
```yaml
schedule:
  - cron: '*/10 * * * *'  # Every 10 minutes
```

## 📊 How It Works

### Score Calculation

The dashboard uses a sophisticated scoring system:

```javascript
// Percentage change
const percentChange = ((current - average) / average) * 100;

// Z-score for statistical significance
const zScore = (current - average) / stdDev;

// Combined score with volume weighting
const score = (percentChange * 0.7) + (zScore * 10 * 0.3);
```

### Status Determination

- **CRITICAL**: Score < -80 (significant drop)
- **WARNING**: Score < -50 (notable decrease)
- **NORMAL**: -50 ≤ Score ≤ 20 (expected variation)
- **INCREASED**: Score > 20 (positive spike)

### Data Flow

```
Elasticsearch/Kibana API
        ↓
[Local: CORS Proxy / Production: Direct API]
        ↓
Dashboard JavaScript
        ↓
Visual Display (HTML/CSS)
```

## 🛠️ Troubleshooting

### Common Issues

**502 Bad Gateway / Authentication Error:**
- Cookie has expired
- Get a fresh cookie from Kibana
- Update locally: `export ELASTIC_COOKIE="new_cookie"`
- Update GitHub Secret for automated updates

**CORS Errors (local only):**
- Ensure CORS proxy is running: `ps aux | grep cors_proxy`
- Use `./run_with_cors.sh` for local development
- Check proxy health: `curl http://localhost:8889/health`

**No Data Showing:**
- Verify Elasticsearch query in `scripts/generate_dashboard.sh`
- Check browser console for errors
- Ensure time range is appropriate
- Verify cookie is valid

**Port Already in Use:**
```bash
# Kill existing processes
kill -9 $(lsof -ti:8888) 2>/dev/null
kill -9 $(lsof -ti:8889) 2>/dev/null
```

**PATH Issues (macOS):**
If commands aren't found, the project includes fallback scripts in `scripts/legacy/` that use absolute paths.

## 🚨 Monitoring Best Practices

1. **Keep the dashboard open** during critical periods
2. **Set up browser notifications** for visual alerts
3. **Check GitHub Actions** for update failures
4. **Monitor the monitor** - ensure automated updates are working
5. **Rotate cookies regularly** before they expire

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Run tests: `./run_all_tests.sh`
4. Commit changes: `git commit -m "Add feature"`
5. Push: `git push origin feature-name`
6. Submit a pull request

### Development Guidelines

- Write tests for new features
- Maintain test coverage above 80%
- Follow existing code style
- Update documentation as needed
- Test both local and GitHub Pages scenarios

## 📝 License

This project is proprietary and intended for internal GoDaddy use.

## 🙏 Acknowledgments

Built in response to the RAD card migration incident to ensure traffic anomalies are never missed again. Special thanks to the team for identifying the need for better monitoring.

---

**Remember**: This dashboard is your early warning system. A quick glance can save days of lost traffic. Keep it open, check it often, and never miss another traffic drop! 🚀

**Technologies Used**: Python 3, Bash, cURL, GitHub Actions, GitHub Pages

## How It Works: Traffic Analysis & Calculations

### Overview

The RAD Traffic Monitor analyzes traffic patterns for GoDaddy's RAD cards by comparing current traffic against historical baselines. It identifies anomalies and categorizes them based on severity.

### Data Flow

1. **Data Collection**: 
   - Queries Elasticsearch/Kibana for RAD card traffic events
   - Collects data for events matching pattern: `pandc.vnext.recommendations.feed.feed*`
   - Retrieves both baseline period data (8 days) and current period data (last 12 hours)

2. **Request Architecture**:
   - **Static Mode**: Pre-generated dashboard using GitHub Actions (updates every 15 minutes)
   - **Live Mode**: Real-time updates via CORS proxy server
   
   ```
   Browser → CORS Proxy (port 8889) → Kibana API → Elasticsearch
   ```

### Calculation Methodology

#### 1. Baseline Calculation
The baseline represents expected traffic based on historical data:

```python
# Baseline period: 8 days of historical data
baseline_count = total_events_in_8_days

# Convert to 12-hour baseline for comparison
baseline_12h = (baseline_count / 8 / 24 * 12)

# Daily average for context
daily_avg = baseline_count / 8
```

#### 2. Score Calculation
The score indicates how current traffic compares to the baseline:

```python
# For high-traffic events (daily_avg >= 1000):
if current_count / baseline_12h < 0.5:  # Significant drop
    score = -((1 - current_count / baseline_12h) * 100)
else:
    score = ((current_count / baseline_12h - 1) * 100)

# For low-traffic events (daily_avg < 1000):
if current_count / baseline_12h < 0.3:  # More sensitive threshold
    score = -((1 - current_count / baseline_12h) * 100)
else:
    score = ((current_count / baseline_12h - 1) * 100)
```

**Score Examples**:
- `-99%`: Current traffic is 99% below expected (1% of baseline)
- `+150%`: Current traffic is 150% above expected (2.5x baseline)
- `0%`: Current traffic matches baseline exactly

#### 3. Status Classification

Events are categorized based on their score:

| Status | Score Range | Description |
|--------|-------------|-------------|
| **CRITICAL** | ≤ -80% | Severe traffic drop requiring immediate attention |
| **WARNING** | -50% to -80% | Significant traffic drop that needs investigation |
| **NORMAL** | -50% to 0% | Below baseline but within acceptable range |
| **INCREASED** | > 0% | Traffic above baseline |

#### 4. Impact Calculation

The impact shows the actual difference in event counts:

```python
impact = current_count - baseline_12h

# Examples:
# "Lost ~1,234 impressions" (negative impact)
# "Gained ~567 impressions" (positive impact)
# "Normal variance" (for low-traffic events with small changes)
```

### Kibana Request Structure

The system queries Kibana using Elasticsearch aggregations:

```json
{
  "aggs": {
    "events": {
      "terms": {
        "field": "detail.event.data.traffic.eid.keyword",
        "size": 500
      },
      "aggs": {
        "baseline": {
          "filter": {
            "range": {
              "@timestamp": {
                "gte": "2025-06-01",
                "lt": "2025-06-09"
              }
            }
          }
        },
        "current": {
          "filter": {
            "range": {
              "@timestamp": {
                "gte": "now-12h"
              }
            }
          }
        }
      }
    }
  },
  "query": {
    "bool": {
      "filter": [
        {
          "wildcard": {
            "detail.event.data.traffic.eid.keyword": {
              "value": "pandc.vnext.recommendations.feed.feed*"
            }
          }
        }
      ]
    }
  }
}
```

### CORS Proxy Details

The CORS proxy server (`cors_proxy.py`) enables real-time dashboard updates:

1. **Purpose**: Browsers block direct requests to Kibana due to CORS policy
2. **Solution**: Local proxy adds required CORS headers
3. **Flow**: 
   - Dashboard sends request to `http://localhost:8889/kibana-proxy`
   - Proxy forwards to Kibana with authentication cookie
   - Proxy returns response with CORS headers
4. **Security**: Cookie is passed via header, never exposed in browser

### Example Analysis

For event `feed_domain/index_3.impression`:
- **Baseline**: 3,404 events/day = 1,702 events/12h expected
- **Current**: 34 events in last 12 hours
- **Score**: -98% (34/1702 = 0.02 = 2% of expected)
- **Status**: CRITICAL
- **Impact**: Lost ~1,668 impressions

This indicates a critical traffic drop where the RAD card is receiving only 2% of its expected traffic.

## Architecture