# Environment Variable Validation

The RAD Monitor now includes comprehensive environment variable validation that runs at server startup. This ensures that all required configuration is present and valid before the application starts, preventing runtime failures due to misconfiguration.

## Overview

The environment validation system:
- ✅ Validates all required environment variables at startup
- ✅ Provides clear error messages for missing or invalid variables
- ✅ Supports different validation rules for development vs production
- ✅ Includes type conversion and format validation
- ✅ Masks sensitive values in logs
- ✅ Fails fast to prevent silent misconfigurations

## Required Environment Variables

### Core Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `ELASTICSEARCH_URL` | Yes | Elasticsearch endpoint URL | `https://es.example.com:9243` |
| `KIBANA_URL` | Yes | Kibana endpoint URL | `https://kibana.example.com:9243` |
| `ELASTIC_COOKIE` or `ES_COOKIE` | Yes | Authentication cookie | `sid=Fe26.2**your-cookie**` |
| `BASELINE_START` | Yes | Baseline start date (ISO) | `2024-01-01T00:00:00` |
| `BASELINE_END` | Yes | Baseline end date (ISO) | `2024-01-07T00:00:00` |

### Production Requirements

When `ENVIRONMENT=production`, these additional variables are required:

| Variable | Description | Example |
|----------|-------------|---------|
| `SECRET_KEY` | JWT secret (min 32 chars) | `your-very-long-secret-key-here` |
| `API_TOKENS` | Comma-separated API tokens | `token1,token2,token3` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `https://app.example.com` |

### Optional Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `ENVIRONMENT` | `development` | Environment name |
| `SERVER_PORT` | `8000` | Server port |
| `SERVER_HOST` | `0.0.0.0` | Server host |
| `WORKERS` | `4` | Number of workers |
| `LOG_LEVEL` | `INFO` | Logging level |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection |
| `DISABLE_AUTH` | `false` | Disable authentication |
| `ENABLE_DOCS` | `false` | Enable API docs |
| `VERIFY_SSL` | `true` | Verify SSL certificates |

## Usage

### Running the Server

The validation runs automatically when starting any server:

```bash
# Development server
python bin/server.py

# Production server
python bin/server_production.py
```

If validation fails, you'll see clear error messages:

```
============================================================
RAD Monitor Environment Validation
Environment: production
============================================================

❌ Errors (3):
  - ELASTICSEARCH_URL: Required variable is not set. Elasticsearch endpoint URL
    Example: ELASTICSEARCH_URL=https://your-es-instance.aws.found.io:9243
  - KIBANA_URL: Required variable is not set. Kibana endpoint URL
    Example: KIBANA_URL=https://your-kibana-instance.aws.found.io:9243
  - SECRET_KEY: Required variable is not set. Secret key for JWT/session management
    Example: SECRET_KEY=your-very-long-secret-key-here-minimum-32-chars

============================================================

❌ Environment validation failed:
Environment validation failed with 3 error(s):
  - ELASTICSEARCH_URL: Required variable is not set...
  - KIBANA_URL: Required variable is not set...
  - SECRET_KEY: Required variable is not set...
```

### Testing Validation

Run the test script to see validation in action:

```bash
python bin/test_env_validation.py
```

### Manual Validation

You can also run validation manually:

```bash
python bin/env_validator.py
```

## Environment Setup

### Development Setup

Create a `.env` file in the project root:

```env
# Development configuration
ENVIRONMENT=development
ELASTICSEARCH_URL=https://your-es.example.com:9243
KIBANA_URL=https://your-kibana.example.com:9243
ELASTIC_COOKIE=sid=Fe26.2**your-dev-cookie**
BASELINE_START=2024-01-01T00:00:00
BASELINE_END=2024-01-07T00:00:00
LOG_LEVEL=DEBUG
DISABLE_AUTH=true
```

### Production Setup

For production, ensure all security variables are set:

```env
# Production configuration
ENVIRONMENT=production
ELASTICSEARCH_URL=https://prod-es.example.com:9243
KIBANA_URL=https://prod-kibana.example.com:9243
ELASTIC_COOKIE=sid=Fe26.2**production-cookie**
BASELINE_START=2024-01-01T00:00:00
BASELINE_END=2024-01-07T00:00:00
SECRET_KEY=your-very-long-secret-key-minimum-32-characters
API_TOKENS=prod-token-1,prod-token-2,prod-token-3
ALLOWED_ORIGINS=https://app.example.com,https://www.example.com
LOG_LEVEL=INFO
DISABLE_AUTH=false
WORKERS=4
```

## Validation Features

### Type Conversion

The validator automatically converts string values to appropriate types:
- Boolean: `"true"` → `True`, `"false"` → `False`
- Integer: `"8000"` → `8000`
- List: `"a,b,c"` → `["a", "b", "c"]`

### Format Validation

Built-in validators check:
- ✅ URL format (http/https with valid structure)
- ✅ Port numbers (1-65535)
- ✅ ISO date format
- ✅ Regex patterns (time ranges, log levels)
- ✅ CSV format
- ✅ Minimum string lengths

### Security Features

- Sensitive values are masked in logs
- Production mode enforces stricter requirements
- Secret keys must be at least 32 characters
- API tokens are validated as lists

### Cookie Handling

The system supports two cookie variable names for compatibility:
- `ELASTIC_COOKIE` (preferred)
- `ES_COOKIE` (legacy)

If only `ES_COOKIE` is set, it's automatically copied to `ELASTIC_COOKIE`.

## Extending Validation

To add new environment variables, edit `bin/env_validator.py`:

```python
EnvVar(
    name="MY_NEW_VAR",
    description="Description of the variable",
    level=ValidationLevel.REQUIRED,  # or RECOMMENDED, OPTIONAL
    default="default_value",         # Optional default
    validator=validator_function,     # Optional validator
    transformer=transformer_function, # Optional transformer
    example="example_value",         # Example for error messages
    sensitive=True                   # Mask in logs if True
)
```

## Best Practices

1. **Use .env files**: Keep environment variables in `.env` files (git-ignored)
2. **Validate early**: The fail-fast approach prevents runtime surprises
3. **Check logs**: Validation output shows what was validated
4. **Test thoroughly**: Use the test script to verify configurations
5. **Document changes**: Update this guide when adding new variables
6. **Secure production**: Always set proper security variables in production

## Troubleshooting

### Common Issues

1. **Missing variables**: Check the error message for the exact variable name and example
2. **Invalid format**: Ensure URLs start with http:// or https://
3. **Wrong environment**: Some variables are only required in production
4. **Cookie issues**: Either ELASTIC_COOKIE or ES_COOKIE must be set

### Debug Mode

Set `LOG_LEVEL=DEBUG` to see more detailed validation output.

### Getting Help

If validation fails:
1. Read the specific error message
2. Check the example provided in the error
3. Verify the variable name and format
4. Consult this documentation
5. Run the test script to see working examples
