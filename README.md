# RAD Traffic Health Monitor

Real-time monitoring dashboard for RAD cards traffic health. Automatically detects and alerts on traffic anomalies using statistical analysis and visual indicators.

## Overview

This dashboard monitors impression and click traffic for RAD cards, comparing current performance against historical baselines to identify issues quickly. It provides:

- **Real-time monitoring** with live data updates
- **Automatic anomaly detection** using statistical analysis
- **Visual status indicators** (Critical/Warning/Normal/Increased)
- **Detailed metrics** including score, percentage change, and impact
- **GitHub Pages hosting** with automatic updates

## Features

### Live Data Functionality
- Real-time API calls to Elasticsearch/Kibana
- CORS proxy support for local development
- Automatic refresh with configurable intervals
- Cookie-based authentication for secure access

### Intelligent Monitoring
- Statistical analysis combining percentage change and z-score
- Volume-weighted scoring to prioritize high-traffic cards
- Customizable thresholds for alerts
- Historical baseline comparison (8-day average)

### User Interface
- Fixed sidebar layout with organized controls
- Real-time search and filtering
- Dark theme support
- Interactive configuration editor
- Performance monitoring dashboard

## Quick Start

### Prerequisites
- Node.js and npm
- Python 3.x and pip
- Git
- Elasticsearch/Kibana access with valid cookie

### Installation

1. **Clone and install dependencies**
```bash
git clone https://github.com/balkhalil/rad_monitor.git
cd rad_monitor
npm install
pip install -r requirements-enhanced.txt
```

**Note**: The project has two requirements files:
- `requirements-enhanced.txt` - Full dependencies for local development (includes FastAPI server, rate limiting, etc.)
- `requirements-minimal.txt` - Minimal dependencies for dashboard generation only (used by GitHub Actions)

2. **Start development server**
```bash
npm run dev
```
The unified server automatically detects your environment and starts the best available mode.

3. **Configure authentication**
   - Get your Elasticsearch cookie from Kibana (Developer Tools → Network → Copy `sid` value)
   - Set environment variable: `export ES_COOKIE="your_cookie_here"`
   - Or use the dashboard UI: Click gear icon → "Set Cookie for Real-time"

4. **Access dashboard**
   - Open http://localhost:8000
   - Click "Test Connection" to verify setup
   - Dashboard will start displaying real-time data

### Production Deployment

For GitHub Pages deployment:

1. **Configure GitHub repository**
   - Enable GitHub Pages in Settings → Pages
   - Add `ELASTIC_COOKIE` secret in Settings → Secrets and variables → Actions

2. **Automatic updates**
   - GitHub Actions runs every 45 minutes
   - Dashboard generates fresh data and updates automatically
   - No server required - runs entirely in the browser

## Configuration

### Dashboard Settings

Use the Control Panel (gear icon) to configure:

- **Time Range**: Data window (1h to 48h, default 12h)
- **Thresholds**: Critical (-80%) and Warning (-50%) alert levels
- **Volume Filters**: Minimum daily volume to include events
- **Auto Refresh**: Toggle and interval settings
- **Theme**: Light/dark mode toggle

### Advanced Configuration

The dashboard includes an Advanced Configuration Editor with:
- Live Elasticsearch query preview
- Customizable event ID patterns
- Aggregation size controls
- One-click query copy for testing

## NPM Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start unified development server (recommended) |
| `npm run generate` | Generate dashboard with latest data |
| `npm test` | Run JavaScript tests |
| `npm run test:all` | Run complete test suite (JS, Python, Bash) |
| `npm run cors-proxy` | Start CORS proxy only |
| `npm run serve` | Start web server only |

## Project Structure

```
rad_monitor/
├── index.html                 # Main dashboard
├── bin/                       # Python executables
│   ├── generate_dashboard.py  # Dashboard generator
│   └── server.py              # Unified development server
├── assets/                    # Frontend assets
│   ├── css/                   # Stylesheets
│   └── js/                    # JavaScript modules
├── config/                    # Configuration files
│   ├── api-endpoints.json     # API configuration
│   └── settings.json          # Runtime settings
├── tests/                     # Test suite
├── scripts/                   # Utility scripts
└── docs/                      # Documentation
```

## Authentication

The dashboard requires an Elasticsearch session cookie for data access.

### Getting Your Cookie

1. Open Kibana in your browser
2. Open Developer Tools → Network tab
3. Find any request to Kibana
4. Copy the `sid` value from the Cookie header

### Setting the Cookie

**Local Development:**
```bash
export ES_COOKIE="your_cookie_value"
```

**GitHub Actions:**
1. Go to repository Settings → Secrets and variables → Actions
2. Add secret named `ELASTIC_COOKIE`
3. Paste your cookie value

**Dashboard UI:**
1. Click gear icon in dashboard
2. Select "Set Cookie for Real-time"
3. Paste cookie and test connection

## How It Works

The dashboard uses a sophisticated scoring system:

1. **Baseline Comparison**: Compares current traffic against 8-day historical average
2. **Status Classification**:
   - **CRITICAL**: Traffic dropped >80%
   - **WARNING**: Traffic dropped 50-80%
   - **NORMAL**: Traffic within expected range
   - **INCREASED**: Traffic higher than usual
3. **Volume Weighting**: Prioritizes high-traffic events for alerting

### Data Flow

```
Elasticsearch/Kibana API → CORS Proxy/Direct API → Dashboard → Visual Display
```

## Testing

The project includes comprehensive test coverage:

### JavaScript Tests
```bash
npm test              # Watch mode
npm run test:run      # Single run
npm run test:coverage # With coverage
```

### Python Tests
```bash
python -m pytest tests/test_*.py
```

### Complete Test Suite
```bash
npm run test:all
```

## Performance

- **Update Frequency**: Every 45 minutes (automated) or on-demand
- **Data Period**: Last 12 hours vs 8-day baseline
- **Response Time**: < 2 seconds for API calls
- **Browser Support**: Chrome, Firefox, Safari, Edge

## Troubleshooting

### Common Issues

**Authentication Error / 502 Bad Gateway:**
- Cookie has expired - get fresh cookie from Kibana
- Update environment variable or GitHub secret

**CORS Errors (local development):**
- Ensure development server is running: `npm run dev`
- Check CORS proxy on port 8889

**No Real-time Updates:**
- Verify cookie is set correctly
- Test connection in dashboard settings
- Check browser console for errors

**Development Server Issues:**
- Use `npm run dev` for automatic mode detection
- Force specific mode: `npm run dev:simple` or `npm run dev:fastapi`
- Check ports 8000 and 8889 are available

**Missing Python Dependencies:**
- Run `pip install -r requirements-enhanced.txt` for local development
- Use `requirements-minimal.txt` for dashboard generation only

### Debug Commands

```bash
# Test connection
python3 bin/generate_dashboard.py

# Check proxy health
curl http://localhost:8889/health

# View GitHub Actions logs
gh run list --workflow=update-dashboard.yml
```

## Contributing

We welcome contributions! Here's how to get started:

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests: `npm run test:all`
5. Submit a pull request

### Code Style

- **JavaScript**: ES6+ modules, async/await patterns
- **Python**: PEP 8 compliant, type hints preferred
- **Tests**: Comprehensive coverage for new features

### Areas for Contribution

- **Multi-RAD Support**: Extend monitoring beyond current focus
- **Data Visualization**: Enhanced charts and graphs
- **Performance Optimization**: Query optimization and caching
- **Mobile Responsiveness**: Improve mobile experience
- **Documentation**: API documentation and tutorials

### Testing Your Changes

```bash
# Run all tests
npm run test:all

# Test specific components
npm test -- --grep "your-feature"
python -m pytest tests/test_your_feature.py

# Test dashboard generation
npm run generate
```

## Roadmap

**Planned Enhancements:**
- Formula filtering system using Lens formulas
- Discover integration with Elasticsearch querying
- Multi-RAD support beyond venture-feed
- Python-based visualizations
- FullStory hyperlinks for each EID
- Experiment tracking capabilities

## License

MIT License - see LICENSE file for details.

## Support

- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Documentation**: Check the `docs/` directory for detailed guides
- **Troubleshooting**: See troubleshooting section above

---

**Live Dashboard**: Available at your GitHub Pages URL
**Update Frequency**: Every 45 minutes via GitHub Actions
**Data Source**: Elasticsearch/Kibana with real-time API access
