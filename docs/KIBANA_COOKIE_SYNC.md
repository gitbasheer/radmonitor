# Kibana Cookie Sync Guide

This guide explains how to sync your Kibana authentication cookie with the RAD Monitor dashboard.

## Quick Start (Browser Console Method)

1. **Open Kibana** and log in
2. **Open Developer Console** (F12)
3. **Paste this code** in the console:

```javascript
// RAD Monitor Cookie Sync - Looking for 'sid' cookie
(async () => {
    const cookies = document.cookie.split(';').map(c => c.trim());
    const sidCookie = cookies.find(c => c.startsWith('sid='));

    if (!sidCookie) {
        console.error('(✗) No sid cookie found! Make sure you are logged into Kibana.');
        return;
    }

    console.log('(✓)Found sid cookie, syncing...');

    try {
        const response = await fetch('http://localhost:8000/api/v1/config/cookie', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cookie: sidCookie,
                source: 'console',
                persist: true
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('(✓)Cookie synced successfully!', result);
            console.log('🚀 You can now use RAD Monitor with your Kibana session!');
        } else {
            console.error('(✗) Sync failed:', response.status);
        }
    } catch (error) {
        console.error('(✗) Error:', error);
        console.log('Make sure RAD Monitor is running on http://localhost:8000');
    }
})();
```

4. **Press Enter** to run the code
5. You should see "(✓)Cookie synced successfully!" in the console

## Alternative Methods

### Method 1: Bookmarklet

1. Visit `http://localhost:8000/kibana-cookie-sync.html`
2. Drag the "Sync Kibana Cookie" button to your bookmarks bar
3. Click it while on any Kibana page

### Method 2: Manual Entry

1. In Kibana, open Developer Tools (F12)
2. Go to Application → Cookies
3. Find your session cookie (usually starts with `sid`)
4. Copy the entire cookie string
5. Visit `http://localhost:8000/kibana-cookie-sync.html`
6. Paste and click "Sync Cookie"

### Method 3: Environment Variable

Set the cookie as an environment variable before starting the server:

```bash
export ELASTIC_COOKIE="your-cookie-here"
python bin/dev_server_unified.py
```

## Troubleshooting

### Cookie Not Found
- Make sure you're logged into Kibana
- Try refreshing the Kibana page
- Check that cookies are enabled in your browser

### Connection Failed
- Ensure RAD Monitor is running on `http://localhost:8000`
- Check that CORS is not blocking the request
- Try using the manual entry method instead

### Cookie Expires Quickly
- Kibana sessions have a timeout (usually 8-24 hours)
- You'll need to re-sync when your Kibana session expires
- Consider using a longer-lived API key instead (future feature)

## Security Notes

- Cookies are stored in memory and optionally in settings
- Never share your cookie publicly
- Cookies expire based on Kibana's session timeout
- Use HTTPS in production environments

## Automation Ideas

1. **Browser Extension**: Create a simple extension that auto-syncs
2. **Periodic Sync**: Set up a cron job or scheduled task
3. **API Key**: Use Elasticsearch API keys instead of cookies (recommended for production)
