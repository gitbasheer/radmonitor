# 🚨 Critical Fixes for RAD Monitor

## Most Critical Issues (In Order of Priority)

### 1. **Missing Elasticsearch Cookie Configuration** ⚠️ BLOCKING
**Impact**: Application cannot connect to Elasticsearch without this
**Fix**:
```bash
# Run the setup script
chmod +x setup_and_run.sh
./setup_and_run.sh

# It will create a .env file and prompt you to add your cookie
```

**How to get your cookie**:
1. Open Kibana in Chrome/Firefox
2. Press F12 to open DevTools
3. Go to Network tab
4. Refresh the page
5. Find any request to Kibana
6. Look in Headers > Cookie
7. Copy the `sid=...` value (the entire cookie string)

### 2. **Update Baseline Dates** ⚠️ IMPORTANT
**Impact**: Incorrect baseline dates will give wrong metrics
**Fix**: Edit `.env` and update:
```bash
BASELINE_START=2024-12-01T00:00:00  # Your actual baseline start
BASELINE_END=2024-12-08T00:00:00    # Your actual baseline end (7 days)
```

### 3. **Data Model Test Fix** ✅ ALREADY FIXED
**Impact**: Tests were failing due to incorrect field names
**Status**: Fixed in `test_full_integration.py`

## Quick Start After Fixes

Once you've updated the cookie and dates:

```bash
# Option 1: Use the setup script (RECOMMENDED)
./setup_and_run.sh

# Option 2: Manual start
./run_enhanced_cors.sh
```

## Verify Everything Works

```bash
# Check health
python3 health_check.py

# Run integration tests
python3 test_full_integration.py
```

## Why These Are Critical

1. **No Cookie = No Data**: Without the Elasticsearch cookie, the app can't fetch any data
2. **Wrong Dates = Wrong Metrics**: The baseline comparison will be meaningless
3. **Test Failures = Uncertainty**: Can't verify the system works without passing tests

## Next Steps After Critical Fixes

1. Monitor the dashboard for real data
2. Adjust thresholds in `.env` based on your traffic patterns
3. Set up automated monitoring with `health_check.py`
4. Consider setting up a cron job for regular health checks

## Emergency Troubleshooting

If things aren't working after the fixes:

1. **Check logs**: The enhanced proxy prints detailed errors
2. **Verify cookie**: Make sure you copied the entire cookie string
3. **Test connection**:
   ```bash
   curl http://localhost:8889/health
   ```
4. **Check services**:
   ```bash
   ps aux | grep python  # Should show cors_proxy_enhanced.py
   ```

Remember: The cookie expires, so you'll need to update it periodically!
