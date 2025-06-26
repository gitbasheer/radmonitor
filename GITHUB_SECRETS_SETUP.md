# GitHub Secrets Setup for Auto-Authentication

## 🔐 Setup Elasticsearch Cookie via GitHub Secrets

This allows your team to access the dashboard without manually entering the Elasticsearch cookie each time.

### **Step 1: Add GitHub Secret**

1. **Go to your repository settings**:
   ```
   https://github.com/balkhalil-godaddy/vh-rad-traffic-monitor/settings/secrets/actions
   ```

2. **Click "New repository secret"**

3. **Add the secret**:
   - **Name**: `ELASTICSEARCH_COOKIE`
   - **Value**: Your full Elasticsearch cookie string
   - Click **"Add secret"**

### **Step 2: Trigger Rebuild**

After adding the secret, trigger a rebuild:

```bash
# Make any small change and push
git commit --allow-empty -m "Trigger rebuild with new secret"
git push origin main
```

### **Step 3: Verify Auto-Authentication**

1. **Wait 2-3 minutes** for GitHub Pages to rebuild
2. **Visit your dashboard**: https://balkhalil-godaddy.github.io/vh-rad-traffic-monitor/
3. **Look for**: "🔐 Auto-Authenticated" in the banner
4. **No cookie prompt** should appear - it should connect automatically!

## 🎯 **Benefits**

✅ **Zero setup for team members** - just share the URL  
✅ **No manual cookie entry** required  
✅ **Secure** - cookie stored in GitHub Secrets  
✅ **Easy updates** - just update the secret when cookie expires  

## 🔄 **Cookie Expiry Management**

When your Elasticsearch cookie expires:

1. **Get new cookie** from your Elasticsearch/Kibana session
2. **Update GitHub Secret**:
   - Go to repository secrets
   - Click "Update" on `ELASTICSEARCH_COOKIE`
   - Enter new cookie value
3. **Trigger rebuild** (any push to main branch)

## 🛡️ **Security Notes**

- ✅ **GitHub Secrets are encrypted** and only accessible during GitHub Actions
- ✅ **Not visible in repository code** or public logs
- ✅ **Only injected during build time** into the static configuration
- ✅ **Team members can't see the actual cookie value**

## 📋 **Current Status**

- **Repository**: `balkhalil-godaddy/vh-rad-traffic-monitor`
- **Secret Name**: `ELASTICSEARCH_COOKIE`
- **Live URL**: https://balkhalil-godaddy.github.io/vh-rad-traffic-monitor/
- **Proxy Service**: https://rad-monitor-demo-jbgygggfw-basheers-projects-d3b7a207.vercel.app/api/proxy

Once the secret is added, your entire team can access real-time monitoring data without any setup! 🚀 