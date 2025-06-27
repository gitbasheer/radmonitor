# RAD Monitor Dashboard - Working Setup Summary

Last Updated: 2025-06-27
Status: ✅ FULLY OPERATIONAL

## 🚀 Production Environment

### URLs
- **Dashboard**: https://balkhalil-godaddy.github.io/vh-rad-traffic-monitor/
- **Proxy Service**: https://regal-youtiao-09c777.netlify.app/.netlify/functions/proxy
- **Kibana**: https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243
- **Elasticsearch Index**: `traffic-*`

### Authentication
- Cookie format: `Fe26.2**...` (Kibana session cookie)
- Proxy automatically adds `sid=` prefix if missing
- Cookie stored in localStorage with 24-hour expiration

## 🏗️ Architecture

```
GitHub Pages → Netlify Proxy → Kibana → Elasticsearch (traffic-*)
```

### Key Components

1. **Frontend (GitHub Pages)**
   - Static HTML/JS/CSS hosted on GitHub Pages
   - Uses `api-client-unified.js` for API calls
   - Configuration loaded from `config/production.json`

2. **Proxy Service (Netlify Function)**
   - Handles CORS and authentication
   - Adds required headers (`kbn-xsrf: true`)
   - Formats cookies properly for Kibana

3. **Data Source**
   - Kibana proxy endpoint: `/api/console/proxy`
   - Elasticsearch indices: `traffic-*`
   - RAD event pattern: `pandc.vnext.recommendations.feed.feed*`

## 📁 Configuration Files

### 1. `config/production.json`
```json
{
  "environment": "production",
  "corsProxy": {
    "enabled": true,
    "url": "https://regal-youtiao-09c777.netlify.app/.netlify/functions/proxy"
  },
  "elasticsearch": {
    "url": "https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243",
    "path": "/api/console/proxy?path=traffic-*/_search&method=POST",
    "directConnection": false
  }
}
```

### 2. `config/settings.json`
```json
{
  "elasticsearch": {
    "index_pattern": "traffic-*"
  },
  "proxy": {
    "type": "netlify",
    "enabled": true,
    "url": "https://regal-youtiao-09c777.netlify.app/.netlify/functions/proxy"
  }
}
```

### 3. `.github/workflows/static.yml`
- Automatically deploys to GitHub Pages on push to main
- Generates production.json with correct settings
- Can optionally include pre-configured cookie from GitHub Secrets

## 🔧 Maintenance Instructions

### Updating the Cookie
1. Get new cookie from Kibana (F12 → Network → Copy Cookie header)
2. Enter in dashboard when prompted
3. Cookie can be in any format:
   - `Fe26.2**...` (raw value)
   - `sid=Fe26.2**...` (with prefix)
   - Full cookie header

### Redeploying the Proxy
```bash
cd proxy-service
npx netlify deploy --prod
```

### Testing the Proxy
```bash
# Health check
curl https://regal-youtiao-09c777.netlify.app/.netlify/functions/proxy

# Test query
curl -X POST https://regal-youtiao-09c777.netlify.app/.netlify/functions/proxy \
  -H "Content-Type: application/json" \
  -d '{
    "esUrl": "https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243",
    "esPath": "/api/console/proxy?path=traffic-*/_search&method=POST",
    "cookie": "YOUR_COOKIE_HERE",
    "query": {"size": 0, "query": {"match_all": {}}}
  }'
```

## ⚠️ Critical Settings

1. **Index Pattern**: Must be `traffic-*` (not `usi*`)
2. **Kibana Path**: Must be `/api/console/proxy?path=traffic-*/_search&method=POST`
3. **Cookie Format**: Proxy handles formatting, but Kibana expects `sid=` prefix
4. **CORS Headers**: Proxy must include `kbn-xsrf: true` for Kibana

## 🛡️ Troubleshooting

### "Cannot read properties of null"
- Cause: Wrong index pattern or no data returned
- Fix: Ensure using `traffic-*` index pattern

### "Invalid cookie header"
- Cause: Cookie expired or malformed
- Fix: Get fresh cookie from Kibana

### CORS Errors
- Cause: Proxy not working or wrong URL
- Fix: Redeploy proxy with `npx netlify deploy --prod`

### No Data Showing
- Cause: Query filters too restrictive
- Fix: Check time range and RAD pattern filters

## 📊 Query Structure

The dashboard queries for:
- Time range: Configurable (default: `now-12h`)
- Baseline period: `2025-06-01` to `2025-06-09`
- Event pattern: `pandc.vnext.recommendations.feed.feed*`
- Host filter: `dashboard.godaddy.com`

## 🚨 DO NOT CHANGE

1. The proxy URL in production.json
2. The index pattern from `traffic-*`
3. The Kibana proxy path format
4. The cookie handling in the proxy function

## 📝 Notes

- Proxy function automatically adds `sid=` prefix to cookies
- Dashboard caches query results for 5 minutes
- Cookie expires after 24 hours
- GitHub Actions automatically deploys on push to main
