# 🚀 RAD Monitor - Real-Time API Solutions

**Problem Solved:** CORS errors preventing real-time API calls on localhost

## 🎯 **Quick Start - Full Real-Time (Recommended)**

```bash
chmod +x run_with_cors.sh && ./run_with_cors.sh
```

This starts both:
- **CORS Proxy Server** (port 8889) - Fixes CORS issues
- **Dashboard Server** (port 8888) - Your main dashboard

**Result:** ✅ Real-time API calls work perfectly on localhost!

---

## 📋 **All Available Options**

### **Option 1: Full Real-Time Setup**
```bash
./run_with_cors.sh
```
- ✅ **Real-time API calls** - No CORS errors
- ✅ **Instant updates** - No page reloads  
- ✅ **Live configuration** - Changes apply immediately
- ✅ **Auto browser open** - Ready to use

### **Option 2: Basic Dashboard (Static Refresh)**
```bash
./run_local_auto.sh
```
- ⚠️ **CORS errors** - Expected in console
- ✅ **Static refresh** - Regenerates + reloads page
- ✅ **Still functional** - Gets fresh data from Kibana

### **Option 3: Manual Setup**
```bash
# Terminal 1: Start CORS proxy
python3 cors_proxy.py

# Terminal 2: Start dashboard
python3 -m http.server 8888
```

---

## 🔧 **How the CORS Proxy Works**

The `cors_proxy.py` server:

1. **Receives** requests from your browser (localhost:8888)
2. **Forwards** them to Kibana with proper headers
3. **Adds CORS headers** to the response
4. **Returns** data to your dashboard

**Flow:**
```
Browser → CORS Proxy → Kibana → CORS Proxy → Browser
                ↓
         (Adds CORS headers)
```

---

## 🎛️ **Dashboard Features**

### **Sidebar Controls** (Always Visible)
- **API Status** - Shows CORS proxy and cookie status
- **Live Configuration** - Change time ranges, thresholds
- **Test Connection** - Verify API calls work
- **Quick Setup Guide** - Built-in instructions

### **Real-Time Status Indicators**
- 🟢 **CORS Proxy: Running** - Real-time ready
- 🔴 **CORS Proxy: Not running** - Static refresh only
- 🟢 **Cookie: Set** - Authentication ready
- 🔴 **Cookie: Not set** - Need authentication

---

## 🔑 **Authentication Setup**

### **Get Your Elastic Cookie:**

1. **Open Kibana** in new tab
2. **DevTools** → Application/Storage → Cookies
3. **Find 'sid' cookie** 
4. **Copy full value** (starts with `Fe26.2**`)

### **Set in Dashboard:**
1. Click **"SET COOKIE FOR REAL-TIME"**
2. Paste cookie value
3. Click **"TEST API CONNECTION"**
4. Should show: ✅ API test successful!

---

## 🐛 **Troubleshooting**

### **CORS Errors in Console**
- ✅ **Normal** if not using CORS proxy
- ✅ **Expected** browser security behavior  
- 🛠️ **Solution:** Use `./run_with_cors.sh`

### **"Failed to fetch" Errors**
- 🔍 **Check:** CORS proxy running on port 8889
- 🔍 **Check:** Cookie set correctly
- 🔍 **Test:** Visit http://localhost:8889/health

### **Port Already in Use**
```bash
# Kill existing processes
kill -9 $(lsof -ti:8888) 2>/dev/null
kill -9 $(lsof -ti:8889) 2>/dev/null

# Then restart
./run_with_cors.sh
```

### **Cookie Invalid/Expired**
- 🔄 **Get fresh cookie** from Kibana
- 🔄 **Update in dashboard** via "SET COOKIE"
- 🔄 **Test connection** to verify

---

## 🌐 **Production Deployment**

### **GitHub Pages**
- ✅ **No CORS issues** - Same origin policy
- ✅ **Real-time works** - Direct Kibana calls
- ✅ **No proxy needed** - Browser restrictions don't apply

### **Deploy Steps:**
1. **Push to GitHub** - Triggers auto-build
2. **Set GitHub Secret** - `ELASTIC_COOKIE` 
3. **Enable Pages** - Settings → Pages
4. **Visit URL** - https://balkhalil.github.io/rad-traffic-monitor/

---

## 📊 **File Structure**

```
rad_monitor/
├── cors_proxy.py              # CORS proxy server
├── run_with_cors.sh           # Full real-time setup
├── run_local_auto.sh          # Basic setup
├── scripts/
│   └── generate_dashboard.sh  # Dashboard generator
├── index.html                 # Generated dashboard
└── data/
    └── raw_response.json      # Latest API response
```

---

## 💡 **Pro Tips**

### **Development Workflow**
1. **Use `./run_with_cors.sh`** for real-time development
2. **Change configurations** in sidebar
3. **Click refresh** - instant updates!
4. **No page reloads** needed

### **Cookie Management**  
- **Expires periodically** - Normal Kibana behavior
- **Update easily** - Click "SET COOKIE" button
- **Test regularly** - Use "TEST API CONNECTION"

### **Performance**
- **Real-time mode** - Instant updates, no regeneration
- **Static mode** - Regenerates dashboard, always fresh
- **Both work** - Choose based on your needs

---

## 🎉 **Success Indicators**

### **Full Real-Time Working:**
- ✅ CORS Proxy: **Running** 
- ✅ Cookie: **Set**
- ✅ Refresh: **Updates without page reload**
- ✅ Timestamp: **Changes immediately**
- ✅ Console: **No CORS errors**

### **Static Refresh Working:**
- ✅ Refresh: **Page reloads with fresh data**
- ✅ Timestamp: **Updates after reload**
- ⚠️ Console: **CORS errors (normal)**

---

## 🔗 **Quick Commands**

```bash
# Full real-time setup
./run_with_cors.sh

# Test CORS proxy health
curl http://localhost:8889/health

# Check what's running on ports
lsof -i :8888
lsof -i :8889

# Kill all servers
pkill -f "python3 -m http.server"
pkill -f "cors_proxy.py"
```

**🎯 You now have multiple robust solutions for real-time RAD monitoring!** 