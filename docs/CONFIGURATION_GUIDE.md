# VH-RAD Traffic Monitor Configuration Guide

This guide covers the new streamlined configuration system for VH-RAD Traffic Monitor, which provides centralized configuration management with YAML files, environment variable overrides, and a powerful CLI tool.

## Table of Contents

1. [Overview](#overview)
2. [Configuration Structure](#configuration-structure)
3. [Getting Started](#getting-started)
4. [Configuration Files](#configuration-files)
5. [Environment Variables](#environment-variables)
6. [Configuration CLI](#configuration-cli)
7. [Docker Setup](#docker-setup)
8. [Migration Guide](#migration-guide)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

## Overview

The new configuration system provides:

- **Centralized Configuration**: Single YAML file for all settings
- **Type Safety**: Pydantic models with validation
- **Environment Overrides**: Environment variables can override any setting
- **Multiple Environments**: Easy management of dev/staging/production configs
- **CLI Management**: Powerful command-line tool for configuration
- **Docker Integration**: Automated setup with Docker Compose
- **Backwards Compatibility**: Migration path from old JSON configs

## Configuration Structure

The configuration is organized into logical sections:

```yaml
# Application settings
app_name: RAD Monitor
environment: development
debug: false

# Service configurations
elasticsearch:
  url: https://your-elasticsearch.com
  cookie: null  # Set via environment variable
  index_pattern: traffic-*

server:
  host: 0.0.0.0
  port: 8000
  workers: 1

# ... more sections
```

### Configuration Sections

1. **Application** - General app settings
2. **Elasticsearch** - ES connection and authentication
3. **Kibana** - Kibana URLs and paths
4. **Processing** - Data processing parameters
5. **Dashboard** - UI configuration
6. **Server** - Server runtime settings
7. **Security** - Authentication and security
8. **Redis** - Caching configuration
9. **CORS Proxy** - CORS handling
10. **RAD Types** - Event type definitions

## Getting Started

### Quick Start

1. **Setup environment from template:**
   ```bash
   ./scripts/setup/setup_env.sh development
   ```

2. **Run the setup wizard:**
   ```bash
   python bin/config_cli.py setup
   ```

3. **Start the server:**
   ```bash
   python bin/server.py
   ```

### Manual Setup

1. **Copy configuration template:**
   ```bash
   cp config/templates/env.development .env
   ```

2. **Edit `.env` file:**
   ```bash
   # Add your Elasticsearch cookie
   ELASTICSEARCH__COOKIE=your_cookie_here
   ```

3. **Start the application:**
   ```bash
   python bin/server.py
   ```

## Configuration Files

### Main Configuration File

**Location**: `config/config.yaml`

This is the primary configuration file containing all default settings. It uses YAML format for better readability and supports comments.

### Environment Templates

Pre-configured templates for different environments:

- `config/templates/env.development` - Local development settings
- `config/templates/env.staging` - Staging environment
- `config/templates/env.production` - Production settings

### Environment-Specific Configs

Store environment-specific configurations in:
- `config/environments/development.yaml`
- `config/environments/staging.yaml`
- `config/environments/production.yaml`

## Environment Variables

### Override Syntax

Any configuration value can be overridden using environment variables with the format:
```
SECTION__KEY=value
```

### Examples

```bash
# Override Elasticsearch URL
ELASTICSEARCH__URL=https://new-elasticsearch.com

# Override server port
SERVER__PORT=8080

# Override Redis settings
REDIS__ENABLED=true
REDIS__URL=redis://redis-server:6379

# Override nested settings
DASHBOARD__REFRESH_INTERVAL=60
```

### Special Environment Variables

Some environment variables have special handling:

- `ENVIRONMENT` - Sets the environment (development/staging/production)
- `DEBUG` - Enables debug mode
- `ES_COOKIE` or `ELASTICSEARCH__COOKIE` - Elasticsearch authentication

## Configuration CLI

The configuration CLI (`bin/config_cli.py`) provides comprehensive configuration management.

### Available Commands

#### Show Configuration
```bash
# Show current configuration
python bin/config_cli.py show

# Show as JSON
python bin/config_cli.py show --format json

# Show specific environment
python bin/config_cli.py show --environment production
```

#### Get/Set Values
```bash
# Get specific value
python bin/config_cli.py get elasticsearch.url

# Set configuration value
python bin/config_cli.py set server.port 8080

# Set with backup
python bin/config_cli.py set server.port 8080 --backup
```

#### Environment Management
```bash
# Create environment config
python bin/config_cli.py env create production

# List environments
python bin/config_cli.py env list

# Export environment variables
python bin/config_cli.py env export --environment production > .env.prod
```

#### Validation
```bash
# Validate current config
python bin/config_cli.py validate

# Validate specific file
python bin/config_cli.py validate --file config/custom.yaml
```

#### Migration
```bash
# Migrate from old JSON config
python bin/config_cli.py migrate config/settings.json --backup
```

#### Interactive Mode
```bash
# Interactive configuration
python bin/config_cli.py interactive

# Setup wizard
python bin/config_cli.py setup
```

## Docker Setup

### Development with Docker

1. **Start development environment:**
   ```bash
   ./scripts/docker/start-dev.sh
   ```

2. **Access services:**
   - Application: http://localhost:8000
   - Redis: localhost:6379

3. **View logs:**
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f app
   ```

### Production with Docker

1. **Prepare environment:**
   ```bash
   # Setup production config
   ./scripts/setup/setup_env.sh production

   # Set required variables
   export ELASTICSEARCH__COOKIE=your_cookie
   export SECURITY__SECRET_KEY=your_secret_key
   ```

2. **Start production:**
   ```bash
   ./scripts/docker/start-prod.sh
   ```

3. **Access services:**
   - Application: http://localhost
   - Prometheus: http://localhost:9090
   - Grafana: http://localhost:3001

### Docker Compose Profiles

Different profiles for different needs:

```bash
# Development (default)
docker-compose up

# Production with all services
docker-compose --profile production up

# With monitoring
docker-compose --profile monitoring up

# Configuration tools only
docker-compose --profile tools run config-cli
```

## Migration Guide

### From JSON to YAML

1. **Automatic migration:**
   ```bash
   python bin/config_cli.py migrate config/settings.json
   ```

2. **Manual migration:**
   - Copy values from `settings.json` to `config.yaml`
   - Update any camelCase keys to snake_case
   - Add any missing sections with defaults

### From Environment Variables

Old format:
```bash
KIBANA_URL=https://kibana.com
ES_COOKIE=cookie_value
```

New format:
```bash
KIBANA__URL=https://kibana.com
ELASTICSEARCH__COOKIE=cookie_value
```

### Code Changes

Old code:
```python
from src.config import settings
url = settings.elasticsearch_url
```

New code:
```python
from config import get_config
config = get_config()
url = config.elasticsearch.url
```

## Best Practices

### 1. Environment-Specific Settings

Keep environment-specific settings in separate files:
```yaml
# config/environments/production.yaml
environment: production
debug: false
server:
  workers: 4
redis:
  enabled: true
```

### 2. Sensitive Data

Never commit sensitive data. Use environment variables:
```yaml
elasticsearch:
  cookie: null  # Set via ELASTICSEARCH__COOKIE env var
security:
  secret_key: null  # Set via SECURITY__SECRET_KEY env var
```

### 3. Validation

Always validate configuration after changes:
```bash
python bin/config_cli.py validate
```

### 4. Backups

Create backups before major changes:
```bash
python bin/config_cli.py backup
```

### 5. Documentation

Document custom settings in your config files:
```yaml
# Custom timeout for slow queries (in seconds)
elasticsearch:
  timeout: 60  # Increased from default 30s for large datasets
```

## Troubleshooting

### Common Issues

#### Configuration Not Loading

1. Check file exists: `ls config/config.yaml`
2. Validate YAML syntax: `python -m yaml config/config.yaml`
3. Check for import errors: `python -c "from config import get_config; print(get_config())"`

#### Environment Variables Not Working

1. Check variable format: `SECTION__KEY` (double underscore)
2. Verify `.env` file is loaded: `python -c "import os; print(os.getenv('ELASTICSEARCH__URL'))"`
3. Check for typos in variable names

#### Docker Issues

1. Check `.env` file exists
2. Verify required variables are set
3. Check Docker logs: `docker-compose logs app`
4. Ensure ports are available: `lsof -i :8000`

### Debug Mode

Enable debug mode for more information:
```bash
DEBUG=true python bin/server.py
```

### Getting Help

1. Run validation: `python bin/config_cli.py validate`
2. Check logs: `tail -f logs/app.log`
3. Use interactive mode: `python bin/config_cli.py interactive`
4. Review this guide and examples

## Examples

### Complete Development Setup

```bash
# 1. Clone and setup
git clone <repository>
cd vh-rad-traffic-monitor

# 2. Install dependencies
pip install -r requirements.txt

# 3. Setup configuration
./scripts/setup/setup_env.sh development

# 4. Add your Elasticsearch cookie
echo "ELASTICSEARCH__COOKIE=your_cookie_here" >> .env

# 5. Start development server
python bin/server.py
```

### Production Deployment

```bash
# 1. Setup production environment
./scripts/setup/setup_env.sh production

# 2. Set required secrets
export ELASTICSEARCH__COOKIE=production_cookie
export SECURITY__SECRET_KEY=production_secret
export ALLOWED_HOSTS='["production.domain.com"]'

# 3. Build and deploy with Docker
./scripts/docker/start-prod.sh
```

### Configuration Customization

```bash
# 1. Create custom environment
python bin/config_cli.py env create custom --from production

# 2. Modify settings
python bin/config_cli.py set server.workers 8 --environment custom
python bin/config_cli.py set redis.enabled true --environment custom

# 3. Export for deployment
python bin/config_cli.py env export --environment custom > .env.custom
```

## Summary

The new configuration system provides a robust, flexible, and maintainable way to manage VH-RAD Traffic Monitor settings across different environments. Key benefits include:

- Centralized configuration management
- Strong typing and validation
- Easy environment switching
- Powerful CLI tools
- Docker integration
- Smooth migration path

For additional help or questions, refer to the inline documentation in the configuration files or use the CLI help commands.
