# Deploy to Render.com in 5 Minutes (Free)

## Step 1: Prepare the Code

First, push your proxy service to GitHub:

```bash
cd proxy-service
git add .
git commit -m "Add Render deployment files"
git push
```

## Step 2: Deploy to Render

1. Go to [render.com](https://render.com) and sign up/login
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account
4. Select your repository: `vh-rad-traffic-monitor`
5. Configure the service:
   - **Name**: `rad-monitor-proxy`
   - **Root Directory**: `proxy-service`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
6. Click **"Create Web Service"**

## Step 3: Get Your Proxy URL

After deployment (takes ~2 minutes), you'll get a URL like:
`https://rad-monitor-proxy.onrender.com`

## Step 4: Update Your Configuration

Update these files with your new proxy URL:

1. **config/production.json**:
```json
{
  "corsProxy": {
    "enabled": true,
    "url": "https://rad-monitor-proxy.onrender.com/api/proxy"
  }
}
```

2. **assets/js/config-service.js** (line ~394):
```javascript
url: "https://rad-monitor-proxy.onrender.com/api/proxy"
```

3. **.github/workflows/static.yml** (line ~68):
```json
"url": "https://rad-monitor-proxy.onrender.com/api/proxy"
```

## Step 5: Push Changes

```bash
cd .. # back to project root
git add -A
git commit -m "Update proxy URL to Render deployment"
git push
```

## That's it! 🎉

Your GitHub Pages site will update in ~2-3 minutes and your team can access real-time data!

### Test Your Proxy:
```bash
curl https://rad-monitor-proxy.onrender.com
# Should return: {"status":"RAD Monitor Proxy is running!"}
```

### Notes:
- Render free tier includes 750 hours/month (enough for 24/7 operation)
- The service may sleep after 15 minutes of inactivity (first request will be slow)
- No authentication issues like Vercel!
