# Developer Coordination Guide - Critical Issues Focus

## New Work Division (Both Tackling Critical Issues)

### Developer 1 (DEVELOPER_1_CRITICAL_SECURITY.md)
**Focus: Core Security & API**
- Fix first ~75 innerHTML instances (core dashboard files)
- Implement 3 formula API endpoints (validate, execute, functions)
- Update server_production.py to new config
- Fix hardcoded URLs in JS files

### Developer 2 (DEVELOPER_2_SECURITY_AND_STABILITY.md)
**Focus: Formula Security & Stability**
- Fix remaining ~74 innerHTML instances (formula builder)
- Implement 3 formula API endpoints (fields, save, history)
- Fix 30+ memory leaks
- Clean up unused files
- Fix broken tests

## Critical Issues Being Addressed in Parallel

### Both Working On:
1. **XSS Vulnerabilities (149 total)** - Split 75/74
2. **Formula API Endpoints (6 total)** - Split 3/3

This ensures the two most critical issues get fixed fastest!

## File Division for XSS Fixes

### Developer 1 Takes:
- `ui-updater.js` (19) ⚠️ HIGHEST RISK
- `dashboard-simplified.js` (3)
- `main-clean.js` (1)
- `components/ux-components.js` (13)
- `components/auth-overlay.js` (1)
- `components/loading-overlay.js` (1)
- `ai-formula-integration.js` (6)
- Other component files

### Developer 2 Takes:
- All `formula-builder/` files (~40 instances)
- All `emil/` files
- `formula-editor-integration.js` (5)
- Any files not claimed by Developer 1

## API Endpoint Division

### Developer 1 Implements:
1. `/api/v1/formulas/validate` - Syntax validation
2. `/api/v1/formulas/execute` - Run formulas
3. `/api/v1/formulas/functions` - List available functions

### Developer 2 Implements:
1. `/api/v1/formulas/fields` - Get ES fields
2. `/api/v1/formulas/save` - Save formulas
3. `/api/v1/formulas/history` - Get saved formulas

## Coordination Points

### Morning Sync (Day 1) - CRITICAL
1. Confirm file division for XSS fixes
2. Share DOMPurify import pattern
3. Agree on testing approach

### API Testing (Day 1 Afternoon)
- Test each other's endpoints:
```bash
# Developer 1 endpoints
curl -X POST http://localhost:8000/api/v1/formulas/validate -d '{"formula":"sum(value)"}'
curl http://localhost:8000/api/v1/formulas/functions

# Developer 2 endpoints
curl http://localhost:8000/api/v1/formulas/fields
curl -X POST http://localhost:8000/api/v1/formulas/save -d '{"formula":"avg(score)"}'
```

### End of Day 1 Merge Strategy
1. **5:00 PM**: Both commit XSS fixes
2. **5:15 PM**: Developer 1 merges first (core files)
3. **5:30 PM**: Developer 2 pulls and merges
4. **5:45 PM**: Joint testing of all changes

## No Conflict Zones

These can be done independently:
- Developer 1: server_production.py updates
- Developer 2: Memory leak fixes
- Developer 2: File cleanup
- Developer 2: Test fixes

## Shared Resources

### npm packages (coordinate timing):
```json
{
  "dependencies": {
    "dompurify": "^3.0.0"
  },
  "devDependencies": {
    "@types/dompurify": "^3.0.0"
  }
}
```

### Server Ports (if testing simultaneously):
- Developer 1: Port 8000
- Developer 2: Port 8001

## Success Metrics by Day

### Day 1 End (MUST HAVE):
- ✅ 149 XSS vulnerabilities fixed (combined)
- ✅ 6 API endpoints working (combined)
- ✅ DOMPurify integrated and tested

### Day 2 End:
- ✅ server_production.py using new config (Dev 1)
- ✅ Memory leaks fixed (Dev 2)
- ✅ Unused files cleaned (Dev 2)
- ✅ Hardcoded URLs fixed (Dev 1)

### Day 3 End:
- ✅ All tests passing
- ✅ Full integration tested
- ✅ Security scan clean
- ✅ Ready for production

## Communication Protocol

### Immediate notification needed:
1. Any new XSS patterns discovered
2. API endpoint interface changes
3. Security vulnerabilities found
4. Build/test failures

### Slack/Teams Updates:
```
Dev1: "Completed ui-updater.js (19 XSS fixed), moving to dashboard-simplified.js"
Dev2: "Fields endpoint working, starting formula save endpoint"
```

## Emergency Procedures

If blocked on XSS fixes:
1. Use `textContent` for simple text
2. Use DOMPurify for complex HTML
3. Ask other dev for pattern help

If API endpoints conflict:
1. Check endpoint paths don't overlap
2. Ensure consistent response formats
3. Share Pydantic models if needed

## Final Day 3 Checklist

Both developers verify together:
- [ ] `grep -r "innerHTML" assets/js/ | grep -v "DOMPurify" | wc -l` returns 0
- [ ] All 6 formula endpoints return valid responses
- [ ] No memory leaks in Chrome DevTools
- [ ] Core tests pass
- [ ] Production build works

**Remember: We're fixing the MOST CRITICAL issues first. Stay focused on security and core functionality!**
