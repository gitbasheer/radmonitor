# Deploy Your Own Proxy Service

Choose one of these free options:

## Option 1: Cloudflare Workers (Recommended - 5 minutes)

1. Go to [workers.cloudflare.com](https://workers.cloudflare.com)
2. Sign up for free account
3. Click "Create a Service"
4. Paste the code from `cloudflare-worker.js`
5. Click "Save and Deploy"
6. Copy your worker URL (e.g., `https://rad-monitor.username.workers.dev`)

## Option 2: Vercel (Already configured)

```bash
npx vercel login
npx vercel --prod
```

## Option 3: Netlify Functions

1. Create account at [netlify.com](https://netlify.com)
2. Install Netlify CLI: `npm i -g netlify-cli`
3. Deploy:
```bash
netlify init
netlify deploy --prod
```

## Option 4: Run Your Own Server

Deploy this simple Node.js server anywhere (Heroku, Railway, Render, etc):

```javascript
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/proxy', async (req, res) => {
    const { esUrl, esPath, cookie, query } = req.body;

    try {
        const response = await fetch(`${esUrl}${esPath}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookie
            },
            body: JSON.stringify(query)
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
```

## After Deployment

Update `config/production.json` with your proxy URL:

```json
{
  "corsProxy": {
    "enabled": true,
    "url": "YOUR_PROXY_URL_HERE"
  }
}
```

Then commit and push to update GitHub Pages.
