# CORS Proxy Service for RAD Monitor

## Quick Deploy to Vercel (5 minutes)

### 1. **Install Vercel CLI**
```bash
npm i -g vercel
```

### 2. **Deploy from this directory**
```bash
cd proxy-service
vercel --prod
```

### 3. **Update the GitHub Pages config**
Once deployed, update the proxy URL in `.github/workflows/static.yml`:
```json
"corsProxy": {
  "url": "https://YOUR-VERCEL-URL.vercel.app/api/proxy"
}
```

## Alternative: Deploy to Netlify Functions

### 1. **Create netlify.toml**
```toml
[build]
  functions = "functions"

[[redirects]]
  from = "/api/proxy"
  to = "/.netlify/functions/proxy"
  status = 200
```

### 2. **Move index.js to functions/proxy.js**
```bash
mkdir functions
cp index.js functions/proxy.js
```

### 3. **Deploy**
```bash
netlify deploy --prod
```

## Testing

Once deployed, test the proxy:
```bash
curl "https://your-proxy-url.vercel.app/api/proxy?esUrl=https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243&esPath=/elasticsearch/usi*/_search&cookie=YOUR_COOKIE" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"size":0,"query":{"match_all":{}}}'
```

## Benefits

✅ **No CORS browser extensions needed**
✅ **Works for all team members immediately**  
✅ **Serverless (free tier available)**
✅ **Automatically handles CORS headers** 