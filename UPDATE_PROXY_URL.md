# Deploy Proxy for GitHub Pages - Quick Guide

## Step 1: Deploy to Netlify (2 minutes)

1. Open [Netlify Drop](https://app.netlify.com/drop) in your browser
2. In Finder/Explorer, navigate to the `proxy-service` folder
3. Drag the entire `proxy-service` folder onto the Netlify Drop page
4. Wait for deployment (takes about 30 seconds)
5. Copy your new URL (e.g., `https://amazing-site-12345.netlify.app`)

## Step 2: Update Configuration Files

Replace the proxy URL in these 3 locations:

### 1. config/production.json
```json
{
  "corsProxy": {
    "url": "https://YOUR-SITE.netlify.app/.netlify/functions/proxy"
  }
}
```

### 2. assets/js/config-service.js (line ~394)
```javascript
const proxyUrl = 'https://YOUR-SITE.netlify.app/.netlify/functions/proxy';
```

### 3. .github/workflows/static.yml (line ~68)
```yaml
echo 'window.PROXY_URL = "https://YOUR-SITE.netlify.app/.netlify/functions/proxy";'
```

## Step 3: Commit and Push

```bash
git add -A
git commit -m "Update proxy URL to Netlify deployment"
git push origin main
```

## Done!

Your GitHub Pages site will automatically rebuild and start using the new proxy.
Visit: https://balkhalil-godaddy.github.io/vh-rad-traffic-monitor/

The proxy will handle all CORS issues and your team can access the dashboard without any special browser settings.
