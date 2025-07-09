# Script Usage Guide

## Server Scripts

### Main Development Server: `bin/server.py`
- **When to use**: Default development server
- **Features**: Full API, WebSocket support, static file serving
- **Start**: `npm start` or `python3 bin/server.py`
- **Port**: 8000
- **Use cases**: 
  - Local development
  - Testing WebSocket features
  - Full API functionality needed

### Simple Server: `bin/simple-server.py`
- **When to use**: Lightweight development or demos
- **Features**: Basic HTTP server with mock data
- **Start**: `npm run start:simple` or `python3 bin/simple-server.py`
- **Port**: 8000
- **Use cases**:
  - Quick demos
  - Frontend-only development
  - When Elasticsearch is not available

### Production Server: `bin/server_production.py`
- **When to use**: Production deployments
- **Features**: Security hardening, monitoring, caching, rate limiting
- **Start**: `npm run start:production` or `python3 bin/server_production.py`
- **Port**: 8000 (configurable via SERVER_PORT env)
- **Requirements**:
  - Set environment variables (see requirements)
  - Install production dependencies: `pip install -r requirements-production.txt`
- **Use cases**:
  - Production deployments
  - Staging environments
  - Performance testing

## Validation Scripts

### Main Validation: `bin/validate_connections.py`
- **When to use**: Default validation (uses enhanced version internally)
- **Features**: Comprehensive error handling, JSON output
- **Run**: `python3 bin/validate_connections.py`
- **Options**:
  - `-j, --json`: Output as JSON
  - `-o OUTPUT`: Save to file
  - `-s, --strict`: Stop on first error

### Simple Validation: `bin/validate_connections_simple.py`
- **When to use**: Quick basic checks
- **Features**: Basic validation without error recovery
- **Run**: `python3 bin/validate_connections_simple.py`

### Enhanced Validation: `bin/validate_connections_enhanced.py`
- **When to use**: Detailed validation with full error handling
- **Features**: Safe operations, detailed logging, error recovery
- **Run**: `python3 bin/validate_connections_enhanced.py`

### Production Validation: `bin/validate_connections_production.py`
- **When to use**: Production readiness checks
- **Features**: Security audits, performance checks, SSL validation
- **Run**: `python3 bin/validate_connections_production.py`
- **Options**:
  - `--network`: Enable network connectivity tests
  - `--no-parallel`: Disable parallel execution

## Quick Start Commands

```bash
# Default development
npm start

# Simple lightweight server
npm run start:simple

# Production server
npm run start:production

# Run tests
npm test

# Validate setup
python3 bin/validate_connections.py

# Run all tests
python3 bin/run_all_tests.py
```

## Environment Variables

### Development (Optional)
```bash
ENVIRONMENT=development
SERVER_PORT=8000
SERVER_HOST=0.0.0.0
```

### Production (Required)
```bash
ENVIRONMENT=production
SECRET_KEY=<generate-secure-key>
API_TOKENS=token1,token2
ALLOWED_ORIGINS=https://yourdomain.com
ALLOWED_HOSTS=yourdomain.com
REDIS_URL=redis://localhost:6379
```

## Decision Tree

1. **Need full API features?** → Use `server.py`
2. **Just testing frontend?** → Use `simple-server.py`
3. **Deploying to production?** → Use `server_production.py`
4. **Quick validation?** → Use `validate_connections.py`
5. **Production audit?** → Use `validate_connections_production.py`