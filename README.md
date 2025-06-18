# RAD Traffic Monitor

A real-time monitoring dashboard for GoDaddy's RAD (Recommendation) cards that automatically tracks traffic health, detects anomalies, and provides instant alerts for traffic drops.

🔗 **Live Dashboard**: https://balkhalil.github.io/rad-traffic-monitor/

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

### Alternative Local Methods

**Quick test without proxy:**
```bash
./test_locally.sh
# Then manually open index.html in your browser
```

**Direct run with system paths:**
```bash
./run_with_cors_direct.sh
# Uses absolute paths, helpful if you have PATH issues
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

## 📦 Installation

### Prerequisites
- Python 3.x
- Node.js (for running tests)
- Git
- Web browser

### Full Setup

1. **Install dependencies**
   ```bash
   # For tests (optional)
   npm install
   pip install -r tests/requirements.txt
   ```

2. **Make scripts executable**
   ```bash
   chmod +x run_with_cors.sh test_locally.sh run_with_cors_direct.sh
   chmod +x scripts/generate_dashboard.sh
   ```

## 🏗️ Architecture

### Components

1. **Dashboard (index.html)**
   - Pure JavaScript, no framework dependencies
   - Fetches data via CORS proxy (local) or direct API (GitHub Pages)
   - Updates UI dynamically with traffic data

2. **CORS Proxy (cors_proxy.py)**
   - Local proxy server for development
   - Handles authentication headers
   - Bypasses CORS restrictions
   - SSL certificate handling for self-signed certs

3. **Data Generator (scripts/generate_dashboard.sh)**
   - Fetches latest traffic data from Elasticsearch
   - Processes aggregations
   - Updates dashboard HTML

4. **GitHub Actions (.github/workflows/update-dashboard.yml)**
   - Runs every 10 minutes
   - Updates dashboard with fresh data
   - Commits changes to GitHub Pages

### Data Flow

```
Elasticsearch/Kibana
        ↓
[Local: CORS Proxy / Production: Direct API]
        ↓
Dashboard JavaScript
        ↓
Visual Display (HTML/CSS)
```

## 🧪 Testing

The project includes comprehensive test coverage across all components.

### Run All Tests
```bash
./run_all_tests.sh
```

### JavaScript Tests (Vitest)
```bash
npm test                    # Run tests
npm run test:coverage      # With coverage
npm run test:watch         # Watch mode
```

### Python Tests (pytest)
```bash
pytest tests/ -v           # Run all Python tests
pytest tests/test_cors_proxy.py -v --cov=cors_proxy
```

### Bash Tests (bats)
```bash
# Install bats first
brew install bats-core     # macOS
sudo apt-get install bats  # Linux

# Run tests
bats tests/test_bash_scripts.bats
```

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

The dashboard now includes a Control Panel for real-time configuration without code changes:

1. **Using the Control Panel**
   - Critical Threshold: Set the percentage drop for critical alerts
   - Warning Threshold: Set the percentage drop for warnings
   - Min Daily Volume: Filter out low-traffic cards
   - Time Range: Select data window (1h to 48h)
   - Auto Refresh: Toggle and set interval

2. **Search and Filter**
   - Use the search box to find specific cards
   - Click status cards to filter by category
   - Use checkboxes to hide normal traffic
   - Save preferences for future sessions

3. **Programmatic Configuration** (optional)
   ```javascript
   // In src/dashboard.js
   export const config = {
     criticalThreshold: -80,
     warningThreshold: -50,
     minDailyVolume: 100,
     autoRefreshInterval: 60000 // milliseconds
   };
   ```

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

## 🛠️ Maintenance

### Cookie Rotation

Elastic cookies expire periodically. When authentication fails:

1. Get a new cookie from Kibana (see Authentication section)
2. Update locally: `export ELASTIC_COOKIE="new_cookie"`
3. Update GitHub Secret for automated updates

### Monitoring the Monitor

- Check GitHub Actions for update failures
- Dashboard shows "Authentication Error" if cookie expired
- Enable GitHub notifications for Action failures

### Troubleshooting

**502 Bad Gateway Error:**
- Usually means cookie has expired
- Get a fresh cookie from Kibana

**CORS Errors (local only):**
- Ensure CORS proxy is running on port 8889
- Check `ps aux | grep cors_proxy`

**No Data Showing:**
- Verify Elasticsearch query in `generate_dashboard.sh`
- Check browser console for errors
- Ensure time range is appropriate

**PATH Issues (macOS):**
- Use `run_with_cors_direct.sh` which uses absolute paths
- Or add `/usr/bin` to your PATH

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

- **CRITICAL**: Significant drop requiring immediate attention
- **WARNING**: Notable decrease worth investigating  
- **NORMAL**: Expected variation
- **INCREASED**: Positive traffic spike

### Thresholds

Dynamic thresholds based on traffic volume:
- High-volume types: More sensitive to changes
- Low-volume types: Higher tolerance for variation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Run tests: `./run_all_tests.sh`
4. Submit a pull request

### Development Workflow

1. Make changes locally
2. Test with `./run_with_cors.sh`
3. Run test suite
4. Commit and push
5. Verify GitHub Actions pass

## 📄 Project Structure

```
rad_monitor/
├── index.html                 # Main dashboard
├── cors_proxy.py             # Local CORS proxy server
├── scripts/
│   └── generate_dashboard.sh # Data fetching script
├── tests/                    # Comprehensive test suite
│   ├── *.test.js            # JavaScript tests
│   ├── test_*.py            # Python tests
│   └── *.bats               # Bash tests
├── src/
│   └── dashboard.js         # Extracted JS modules
├── .github/
│   └── workflows/
│       ├── update-dashboard.yml  # Auto-update workflow
│       └── test.yml             # CI test workflow
├── run_with_cors.sh         # Local development script
├── test_locally.sh          # Quick test script
├── run_all_tests.sh         # Test runner
└── README.md               # This file
```

## 🐛 Known Issues

1. **Cookie Expiration**: Elastic cookies expire every few weeks
2. **Rate Limiting**: Excessive API calls may trigger Kibana limits
3. **Time Zones**: All times shown in UTC

## 🚨 Alerting

While the dashboard provides visual alerts, for critical monitoring consider:
- Setting up browser notifications
- Integrating with monitoring tools via the data API
- Creating email alerts through GitHub Actions

## 📝 License

This project is proprietary and intended for internal GoDaddy use.

## 🙏 Acknowledgments

Built in response to the RAD card migration incident to ensure traffic anomalies are never missed again. Special thanks to the team for identifying the need for better monitoring.

---

**Remember**: This dashboard is your early warning system. A quick glance can save days of lost traffic. Keep it open, check it often, and never miss another traffic drop! 🚀