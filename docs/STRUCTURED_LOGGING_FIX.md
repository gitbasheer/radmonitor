# Structured Logging Visibility Fix

## The Problem

Structured logging is implemented but hidden by Uvicorn's default formatter. The JSON logs are being generated but Uvicorn converts them to plain text.

## Solutions

### Option 1: Direct JSON Output (Recommended for Production)

Run the server with JSON logging enabled:

```bash
# Start server with JSON logs
uvicorn bin.dev_server_fastapi:app --log-config=logging_config.json
```

Create `logging_config.json`:
```json
{
  "version": 1,
  "disable_existing_loggers": false,
  "formatters": {
    "json": {
      "class": "pythonjsonlogger.jsonlogger.JsonFormatter",
      "format": "%(asctime)s %(name)s %(levelname)s %(message)s"
    }
  },
  "handlers": {
    "default": {
      "formatter": "json",
      "class": "logging.StreamHandler",
      "stream": "ext://sys.stdout"
    }
  },
  "root": {
    "level": "INFO",
    "handlers": ["default"]
  },
  "loggers": {
    "uvicorn.error": {
      "level": "INFO"
    },
    "uvicorn.access": {
      "handlers": ["default"],
      "level": "INFO",
      "propagate": false
    }
  }
}
```

### Option 2: Separate Structured Log File

Add a file handler to write JSON logs separately:

```python
# In dev_server_fastapi.py, add:
import logging.handlers

# Configure file handler for structured logs
json_handler = logging.handlers.RotatingFileHandler(
    'rad_monitor_structured.log',
    maxBytes=10485760,  # 10MB
    backupCount=5
)
json_handler.setFormatter(structlog.processors.JSONRenderer())

# Add to structlog configuration
structlog.configure(
    processors=[...],
    logger_factory=lambda: logging.getLogger().addHandler(json_handler),
    ...
)
```

### Option 3: Log Aggregation Service

Send structured logs to a service that preserves JSON:

```python
# Example: Send to Elasticsearch
from elasticsearch import Elasticsearch

class ElasticsearchLogHandler(logging.Handler):
    def __init__(self, es_host='localhost:9200', index_prefix='rad-monitor'):
        super().__init__()
        self.es = Elasticsearch([es_host])
        self.index_prefix = index_prefix
        
    def emit(self, record):
        log_entry = {
            '@timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            **record.__dict__.get('extra', {})
        }
        
        index = f"{self.index_prefix}-{datetime.utcnow().strftime('%Y.%m.%d')}"
        self.es.index(index=index, body=log_entry)
```

### Option 4: Development Mode - Pretty Print

For development, use colored structured logs:

```python
# Add to dev_server_fastapi.py for dev mode
if os.getenv('ENV') == 'development':
    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.dev.ConsoleRenderer(colors=True)  # Pretty colors!
        ],
        ...
    )
```

## Viewing Structured Logs

### Real-time Monitoring
```bash
# Watch JSON logs in real-time
tail -f rad_monitor_structured.log | jq '.'

# Filter by level
tail -f rad_monitor_structured.log | jq 'select(.level == "ERROR")'

# Filter by endpoint
tail -f rad_monitor_structured.log | jq 'select(.endpoint == "/api/config")'
```

### Metrics from Logs
```bash
# Count requests by endpoint
cat rad_monitor_structured.log | jq -r '.endpoint' | sort | uniq -c

# Average response time
cat rad_monitor_structured.log | jq 'select(.duration_ms != null) | .duration_ms' | awk '{sum+=$1} END {print sum/NR}'

# Error rate
cat rad_monitor_structured.log | jq 'select(.event == "request_metrics") | .success' | grep -c false
```

## Integration with Monitoring

### Grafana Loki
```yaml
# docker-compose.yml
services:
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    
  promtail:
    image: grafana/promtail:latest
    volumes:
      - ./rad_monitor_structured.log:/var/log/rad_monitor.log
      - ./promtail-config.yml:/etc/promtail/config.yml
```

### Promtail Config
```yaml
# promtail-config.yml
clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: rad_monitor
    static_configs:
      - targets:
          - localhost
        labels:
          job: rad_monitor
          __path__: /var/log/rad_monitor.log
    pipeline_stages:
      - json:
          expressions:
            level: level
            endpoint: endpoint
            duration: duration_ms
      - labels:
          level:
          endpoint:
```

## Quick Start

1. **For immediate visibility**, run:
   ```bash
   python3 bin/dev_server_fastapi.py 2>&1 | grep -E "query_|request_|rate_limit_|circuit_breaker_|error"
   ```

2. **For production**, use Option 1 with proper log aggregation

3. **For debugging**, the `/api/metrics` endpoint provides aggregated data without needing log parsing

## Summary

While Uvicorn hides structured logs by default, there are multiple ways to access them:
- Configure Uvicorn for JSON output
- Write to separate log files
- Use log aggregation services
- Access metrics via the API endpoint

The structured logging is working correctly - it just needs the right configuration to be visible! 