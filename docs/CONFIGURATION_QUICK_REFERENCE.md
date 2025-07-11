# Configuration Quick Reference

## Essential Commands

### Setup
```bash
# Quick setup
./scripts/setup/setup_env.sh development
python bin/config_cli.py setup

# Manual setup
cp config/templates/env.development .env
# Edit .env with your settings
python bin/server.py
```

### Configuration CLI
```bash
# Show config
python bin/config_cli.py show

# Get value
python bin/config_cli.py get server.port

# Set value
python bin/config_cli.py set server.port 8080

# Validate
python bin/config_cli.py validate

# Interactive mode
python bin/config_cli.py interactive
```

### Docker Commands
```bash
# Development
./scripts/docker/start-dev.sh
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f

# Production
./scripts/docker/start-prod.sh
docker-compose --profile production logs -f
```

## Environment Variables

### Format
```bash
SECTION__KEY=value
```

### Common Variables
```bash
# Required for production
ELASTICSEARCH__COOKIE=your_cookie_here
SECURITY__SECRET_KEY=your_secret_key

# Common overrides
SERVER__PORT=8080
SERVER__WORKERS=4
REDIS__ENABLED=true
REDIS__URL=redis://localhost:6379
DEBUG=true
ENVIRONMENT=production
```

## File Locations

```
config/
├── config.yaml              # Main configuration
├── models.py               # Pydantic models
├── manager.py              # Config manager
├── __init__.py            # Package exports
├── templates/             # Environment templates
│   ├── env.development
│   ├── env.staging
│   └── env.production
├── environments/          # Environment configs
│   ├── development.yaml
│   ├── staging.yaml
│   └── production.yaml
└── backups/              # Automatic backups
```

## Configuration Sections

| Section | Purpose | Key Settings |
|---------|---------|--------------|
| `app_name` | Application name | Display name |
| `environment` | Environment type | development/staging/production |
| `elasticsearch` | ES connection | url, cookie, index_pattern |
| `kibana` | Kibana settings | url, paths |
| `processing` | Data processing | thresholds, time ranges |
| `dashboard` | UI settings | refresh_interval, theme |
| `server` | Server config | host, port, workers |
| `security` | Security settings | secret_key, auth requirements |
| `redis` | Cache settings | enabled, url, ttl |
| `rad_types` | Event types | patterns, colors, enabled |

## Migration Checklist

- [ ] Backup existing configuration
- [ ] Run migration: `python bin/config_cli.py migrate config/settings.json`
- [ ] Update environment variables to use `__` format
- [ ] Update code imports: `from config import get_config`
- [ ] Test configuration: `python bin/config_cli.py validate`
- [ ] Update deployment scripts

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Config not loading | Check `config/config.yaml` exists and is valid YAML |
| Env vars not working | Use double underscore: `SECTION__KEY` |
| Docker fails to start | Check `.env` file and required variables |
| Permission errors | Check file permissions, especially for `.env` |
| Import errors | Ensure you're in project root with proper PYTHONPATH |

## Help

```bash
# CLI help
python bin/config_cli.py --help
python bin/config_cli.py <command> --help

# Check current config
python bin/config_cli.py show

# Validate setup
python bin/config_cli.py validate
```
