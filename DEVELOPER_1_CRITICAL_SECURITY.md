# Developer 1: Critical Security Fixes

## Priority 1: XSS Vulnerabilities - First Half (Day 1) 🚨 EXTREME RISK

You'll fix the **first 75 innerHTML instances** while Developer 2 handles the other 74.

### Setup
```bash
npm install dompurify
npm install @types/dompurify --save-dev
```

### Your Files (Most Critical User Data Display)

#### A. Core Dashboard Files:
1. **`assets/js/ui-updater.js`** (19 instances) - HIGHEST PRIORITY
   - Lines: 33, 69, 175, 177, 182, 185, 196, 198, 201, 218, 223, 226, 237, 239, 242, 259, 419, 489, 532
   - This displays user event data directly!

2. **`assets/js/dashboard-simplified.js`** (3 instances)
   - Lines: 335, 614, 639
   - Main dashboard display

3. **`assets/js/main-clean.js`** (1 instance)
   - Line: 188
   - Entry point

4. **`assets/js/components/ux-components.js`** (13 instances)
   - All UI components that could display user content

5. **`assets/js/components/auth-overlay.js`** (1 instance)
   - Authentication forms

6. **`assets/js/components/loading-overlay.js`** (1 instance)

7. **`assets/js/components/loading-overlay-ux.js`** (1 instance)

8. **`assets/js/components/animated-branding.js`** (1 instance)

9. **`assets/js/components/auth-prompt.js`** (1 instance)

10. **`assets/js/production-helper.js`** (3 instances)

11. **`assets/js/connection-status-manager.js`** (1 instance)

12. **`assets/js/ai-formula-integration.js`** (6 instances)

#### Total for Developer 1: ~51 instances in core files

### Fix Pattern
```javascript
// ❌ VULNERABLE
element.innerHTML = userInput;
element.innerHTML = `<div>${data.name}</div>`;

// ✅ SAFE Option 1: Plain text
element.textContent = userInput;

// ✅ SAFE Option 2: DOMPurify for HTML
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(htmlContent);

// ✅ SAFE Option 3: DOM creation
const div = document.createElement('div');
div.textContent = data.name;
element.appendChild(div);
```

### Testing Each Fix
```javascript
// Add this test to ensure no XSS
const testXSS = '<img src=x onerror=alert("XSS")>';
element.textContent = testXSS; // Should display as text, not execute
```

## Priority 2: Missing Formula API Endpoints (Day 1-2) 🚨 CORE FEATURE BROKEN

### Implement These 3 Endpoints in `bin/server_enhanced.py`:

#### 1. Formula Validation (Line 515)
```python
@app.post("/api/v1/formulas/validate")
async def validate_formula(validation_request: FormulaValidationRequest):
    """Validate formula syntax"""
    valid_functions = {"sum", "avg", "count", "min", "max", "if", "and", "or"}
    errors = []

    formula = validation_request.formula

    # Basic validation
    if not formula:
        errors.append("Formula cannot be empty")

    # Check parentheses
    if formula.count('(') != formula.count(')'):
        errors.append("Unmatched parentheses")

    # Check function names
    import re
    functions_used = re.findall(r'(\w+)\s*\(', formula)
    for func in functions_used:
        if func.lower() not in valid_functions:
            errors.append(f"Unknown function: {func}")

    return {
        "valid": len(errors) == 0,
        "formula": formula,
        "errors": errors,
        "warnings": []
    }
```

#### 2. Formula Execution (Line 486)
```python
@app.post("/api/v1/formulas/execute")
async def execute_formula(
    formula_request: FormulaRequest,
    cookie: Optional[str] = Header(None, alias="X-Elastic-Cookie")
):
    """Execute formula and return results"""
    # Parse formula to ES query
    query = {
        "size": 0,
        "aggs": {}
    }

    # Simple parser for basic functions
    if formula_request.formula.startswith("sum("):
        field = formula_request.formula[4:-1]
        query["aggs"]["result"] = {"sum": {"field": field}}
    elif formula_request.formula.startswith("count("):
        query["aggs"]["result"] = {"value_count": {"field": "_id"}}
    # Add more functions...

    # Execute against Elasticsearch
    result = await execute_es_query(query, cookie)

    return {
        "success": True,
        "formula": formula_request.formula,
        "result": {
            "value": result.get("aggregations", {}).get("result", {}).get("value", 0),
            "timestamp": datetime.now().isoformat()
        }
    }
```

#### 3. Get Available Functions
```python
@app.get("/api/v1/formulas/functions")
async def get_formula_functions():
    """Return available formula functions"""
    return {
        "functions": [
            {
                "name": "sum",
                "args": ["field"],
                "description": "Sum numeric field values",
                "example": "sum(event.count)"
            },
            {
                "name": "avg",
                "args": ["field"],
                "description": "Average of numeric field values",
                "example": "avg(response.time)"
            },
            {
                "name": "count",
                "args": [],
                "description": "Count number of documents",
                "example": "count()"
            },
            {
                "name": "min",
                "args": ["field"],
                "description": "Minimum value of field",
                "example": "min(price)"
            },
            {
                "name": "max",
                "args": ["field"],
                "description": "Maximum value of field",
                "example": "max(price)"
            }
        ]
    }
```

## Priority 3: Update Server Configuration (Day 2)

### Fix `bin/server_production.py` to use new config system

Replace ALL instances of `validated_env` with config:

```python
# At top, replace:
# from env_validator import validate_environment
# validated_env = validate_environment()

# With:
from config import get_config
config = get_config()

# Then replace throughout:
# validated_env.get("SECRET_KEY") → config.security.secret_key
# validated_env.get("SERVER_PORT") → config.server.port
# validated_env.get("ELASTICSEARCH_URL") → config.elasticsearch.url
# etc.
```

## Priority 4: Fix ConfigService URLs (Day 2-3)

Update these files to use the new ConfigService methods:

1. **`assets/js/api-client-unified.js`**
   ```javascript
   import { getApiUrl, getElasticsearchUrl } from './config-service.js';

   // Replace:
   // this.baseUrl = window.API_URL || 'http://localhost:8000';
   // With:
   this.baseUrl = getApiUrl();
   ```

2. **`assets/js/centralized-auth.js`**
3. **`assets/js/direct-elasticsearch-client.js`**
4. **`assets/js/fastapi-integration.js`**
5. **`assets/js/cors-direct-override.js`**

## Daily Goals

### Day 1:
- [ ] Morning: Fix 25+ innerHTML instances (focus on ui-updater.js first)
- [ ] Afternoon: Implement formula validation endpoint
- [ ] Test XSS fixes thoroughly

### Day 2:
- [ ] Morning: Fix remaining innerHTML instances
- [ ] Implement formula execution & functions endpoints
- [ ] Update server_production.py

### Day 3:
- [ ] Fix all hardcoded URLs
- [ ] Integration testing
- [ ] Security verification

## Verification Commands

```bash
# Check your XSS progress
grep -r "innerHTML" assets/js/ui-updater.js assets/js/dashboard-simplified.js assets/js/main-clean.js | wc -l

# Test formula endpoints
curl http://localhost:8000/api/v1/formulas/validate -X POST -H "Content-Type: application/json" -d '{"formula":"sum(value)"}'

# Check for remaining hardcoded URLs
grep -r "localhost:8000" assets/js/ --include="*.js" | grep -v config-service | wc -l
```

## Communication with Developer 2

- You're both fixing XSS issues - coordinate which files to avoid conflicts
- Share any security patterns you discover
- Test each other's API endpoints
