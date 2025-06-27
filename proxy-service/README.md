# RAD Monitor Proxy - Simple Netlify Deployment

A simple CORS proxy for RAD Monitor to access Elasticsearch from GitHub Pages.

## Deploy in 2 Minutes (No Login Required!)

### Option 1: Drag & Drop

1. Visit [Netlify Drop](https://app.netlify.com/drop)
2. Drag this entire `proxy-service` folder onto the page
3. Netlify will deploy it instantly!
4. Copy your new proxy URL (e.g., `https://amazing-site-12345.netlify.app`)

### Option 2: Deploy Button (Requires GitHub)

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/balkhalil-godaddy/vh-rad-traffic-monitor)

## Update Your Configuration

After deployment, update these files with your new Netlify URL:

1. **config/production.json**
   ```json
   {
     "corsProxy": {
       "url": "https://YOUR-SITE.netlify.app/.netlify/functions/proxy"
     }
   }
   ```

2. **assets/js/config-service.js** (line ~394)
   ```javascript
   const proxyUrl = 'https://YOUR-SITE.netlify.app/.netlify/functions/proxy';
   ```

3. **.github/workflows/static.yml** (line ~68)
   ```yaml
   echo 'window.PROXY_URL = "https://YOUR-SITE.netlify.app/.netlify/functions/proxy";'
   ```

## Example
If your Netlify URL is `https://amazing-site-12345.netlify.app`,
your proxy endpoint will be: `https://amazing-site-12345.netlify.app/.netlify/functions/proxy`

## That's It!

Your proxy is now deployed and ready to use. The dashboard at GitHub Pages will be able to access Elasticsearch data through this proxy.
