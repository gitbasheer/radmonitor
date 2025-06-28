# RAD Monitor Dashboard

A real-time traffic monitoring dashboard for RAD events. Shows you when traffic drops so you can catch issues fast.

## Live Dashboard

**Production URL**: https://balkhalil-godaddy.github.io/vh-rad-traffic-monitor/

Just need to monitor traffic? Go to the URL above, enter your Kibana cookie when prompted, and you're good to go.

## How It Works

```mermaid
graph LR
    A[Dashboard<br/>GitHub Pages] -->|HTTPS| B[Proxy<br/>Netlify Function]
    B -->|Authenticated| C[Kibana API]
    C -->|Query| D[Elasticsearch<br/>traffic-* indices]

    style A fill:#e1f5fe
    style B fill:#c8e6c9
    style C fill:#fff9c4
    style D fill:#ffccbc
```

The dashboard queries Elasticsearch for RAD events, compares current traffic to historical baselines, and flags anything that looks wrong.

## Getting Started

### For Monitoring (No Setup)

1. Go to https://balkhalil-godaddy.github.io/vh-rad-traffic-monitor/
2. When prompted, enter your Kibana cookie:
   - A clean modal will appear with instructions
   - Open Kibana in another tab
   - F12 → Network tab → Refresh page
   - Find any request → Copy the Cookie header value
   - Look for the `sid=Fe26.2**...` part
3. Paste cookie in the modal and click "Save Cookie"
4. Watch your traffic

### For Development

Clone and install:
```bash
git clone https://github.com/balkhalil-godaddy/vh-rad-traffic-monitor.git
cd vh-rad-traffic-monitor
npm install
```

#### First Time Setup (Python Environment)
```bash
# Create and activate Python virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements-minimal.txt
```

#### Daily Development
```bash
# After initial setup, just run:
npm run dev

# This starts the FastAPI server at http://localhost:8000
# It's the same as running: python bin/server.py
# But npm run dev also cleans up ports and shows a nice startup message
```

**Quick Reference:**
- `npm run dev` = Runs `python bin/dev_server_unified.py` → Which runs `bin/server.py`
- `npm run dev:direct` = Runs `python bin/server.py` directly
- Both start the same server! Use `npm run dev` for convenience.

## Key Files & URLs

| What | Where | Why |
|------|-------|-----|
| Dashboard | https://balkhalil-godaddy.github.io/vh-rad-traffic-monitor/ | Live production dashboard |
| Proxy | https://regal-youtiao-09c777.netlify.app/.netlify/functions/proxy | Handles CORS and auth |
| Main Config | `config/production.json` | Controls proxy URL and index pattern |
| Proxy Code | `proxy-service/netlify/functions/proxy.js` | The magic that makes it work |

## Architecture

```mermaid
graph TB
    subgraph "Frontend"
        A[index.html] --> B[api-client-unified.js]
        B --> C[config-service.js]
    end

    subgraph "Config"
        D[production.json]
        E[settings.json]
        F[api-endpoints.json]
    end

    subgraph "Backend"
        G[Netlify Proxy<br/>proxy.js]
    end

    C --> D
    B --> G
    G --> H[Kibana/Elasticsearch]
```

## Essential Commands

```bash
# Check if everything's configured right
./scripts/verify-config.sh

# Test the proxy
curl https://regal-youtiao-09c777.netlify.app/.netlify/functions/proxy

# Test authentication flow
open test-auth-flow.html    # Test auth system independently

# Redeploy proxy (if you change proxy.js)
cd proxy-service && npx netlify deploy --prod

# Run tests
npm test              # JavaScript tests
npm run test:all      # Everything

# Generate static dashboard (for GitHub Actions)
npm run generate
```

## Configuration

The important stuff lives in these files:

**`config/production.json`** - This gets deployed to GitHub Pages
```json
{
  "corsProxy": {
    "url": "https://regal-youtiao-09c777.netlify.app/.netlify/functions/proxy"
  },
  "elasticsearch": {
    "path": "/api/console/proxy?path=traffic-*/_search&method=POST"
  }
}
```

**Don't change these**:
- The proxy URL (unless you deploy a new one)
- The index pattern (`traffic-*`)
- The Kibana proxy path format

## Deployment

### GitHub Pages (Dashboard)
Pushes to `main` automatically deploy via GitHub Actions. Takes about 2-3 minutes.

### Netlify (Proxy)
The proxy function is deployed to Netlify. To update it:
```bash
cd proxy-service
npx netlify deploy --prod
```

## Authentication

The dashboard needs a Kibana session cookie. The cookie:
- Expires after 24 hours (auto-cleared)
- Can be entered as `Fe26.2**...` or `sid=Fe26.2**...` (proxy handles both)
- Gets stored in localStorage with automatic expiry
- Shows a clean modal UI for entry (no browser prompts)
- Only prompts once per session (no authentication loops)

## Common Issues

**"Invalid cookie header"**
- Your cookie expired. Click "Set Cookie" button to enter a fresh one from Kibana.

**No data showing**
- Check the browser console
- Make sure you're looking at `traffic-*` indices
- Verify time range isn't too restrictive

**CORS errors**
- The proxy might be down. Test it with curl (see commands above)
- Redeploy the proxy if needed

**Wrong index pattern errors**
- Run `./scripts/verify-config.sh` to check configuration
- Make sure all configs use `traffic-*` not `usi*`

## Troubleshooting

### Common Errors

1. **Module syntax errors** (`Unexpected token 'export'`)
   - Fixed: Removed duplicate script loading in index.html

2. **API 404 errors** (`POST /api/v1/query 404`)
   - Fixed: Updated to correct endpoint `/api/v1/dashboard/query`

3. **Authentication issues**
   - The cookie modal now validates cookies before saving
   - Invalid cookies show error messages instead of loops

For more details, see [README_detailed.md](README_detailed.md#known-issues--solutions).

## What This Monitors

The dashboard tracks RAD events matching this pattern:
- `pandc.vnext.recommendations.feed.feed*`

It compares:
- Current period: Last 12 hours (configurable)
- Baseline: June 1-9, 2025 (8 days)

Status levels:
- 🔴 **CRITICAL**: Traffic dropped >80%
- 🟡 **WARNING**: Traffic dropped 50-80%
- 🟢 **NORMAL**: Traffic looks fine
- 🔵 **INCREASED**: Traffic is up

## Project Structure

```
.
├── index.html                    # The dashboard
├── assets/js/
│   ├── api-client-unified.js     # Handles API calls
│   └── config-service.js         # Loads configuration
├── config/
│   ├── production.json           # Production settings
│   └── settings.json             # Local settings
├── proxy-service/
│   └── netlify/functions/
│       └── proxy.js              # CORS proxy function
└── scripts/
    └── verify-config.sh          # Config checker
```

## Need Help?

1. Check the console for errors
2. Run `./scripts/verify-config.sh`
3. Test the proxy is alive
4. Make sure your cookie is fresh

That's it. Keep it simple. Monitor your traffic. Fix issues fast.
