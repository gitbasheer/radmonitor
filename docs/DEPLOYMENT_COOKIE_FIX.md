# Cookie Format Fix Required

## Issue Found
The direct API implementation in `bin/generate_dashboard.py` sends the cookie incorrectly.

### Current Implementation (Line 277):
```python
headers = {
    'Cookie': cookie,  # ❌ WRONG - sends raw cookie
    'Content-Type': 'application/json',
    'kbn-xsrf': 'true'
}
```

### Required Fix:
```python
headers = {
    'Cookie': f'sid={cookie}',  # ✅ CORRECT - proper cookie format
    'Content-Type': 'application/json',
    'kbn-xsrf': 'true'
}
```

## Test Results
With real cookie from .env:
- `Cookie: sid={cookie}` → **200 OK** ✅
- `Cookie: {cookie}` → **400 Bad Request** ❌

## Additional Finding
The Settings model expects `ES_COOKIE` not `ELASTIC_COOKIE`:
- `.env` should use: `ES_COOKIE=Fe26.2**...`
- Or set both: `export ES_COOKIE="$ELASTIC_COOKIE"`

## Action Required
Agent 1 needs to update line 277 in `bin/generate_dashboard.py` to use the correct cookie format.

Once fixed, the deployment pipeline will be fully functional! 