#!/usr/bin/env python3
"""
Dashboard Generator for RAD Monitor
Modern Python implementation for generating static dashboard HTML.

This script generates a static HTML dashboard by fetching traffic data
from Elasticsearch and processing it according to RAD monitoring patterns.

Usage:
    python3 generate_dashboard.py [baseline_start] [baseline_end] [current_time]

Example:
    python3 generate_dashboard.py "2025-06-01" "2025-06-09" "now-12h"
"""

import os
import sys
import json
import logging
import argparse
import requests
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, Any, List
import traceback

# ====================
# Configuration & Setup
# ====================

class ColoredFormatter(logging.Formatter):
    """Custom formatter with colors for console output"""

    COLORS = {
        'DEBUG': '\033[36m',     # Cyan
        'INFO': '\033[0m',       # Default
        'WARNING': '\033[33m',   # Yellow
        'ERROR': '\033[31m',     # Red
        'SUCCESS': '\033[32m',   # Green
    }
    RESET = '\033[0m'

    def format(self, record):
        # Add custom SUCCESS level
        if record.levelno == 25:
            record.levelname = 'SUCCESS'

        # Apply color
        levelname = record.levelname
        if levelname in self.COLORS:
            record.levelname = f"{self.COLORS[levelname]}{levelname}{self.RESET}"

        return super().format(record)


# Add SUCCESS level
logging.SUCCESS = 25
logging.addLevelName(logging.SUCCESS, 'SUCCESS')
def success(self, message, *args, **kwargs):
    if self.isEnabledFor(logging.SUCCESS):
        self._log(logging.SUCCESS, message, args, **kwargs)
logging.Logger.success = success


def setup_logging(verbose: bool = False):
    """Configure logging with colored output"""
    logger = logging.getLogger()
    logger.setLevel(logging.DEBUG if verbose else logging.INFO)

    # Console handler with colors
    console = logging.StreamHandler()
    console.setFormatter(
        ColoredFormatter('[%(asctime)s] %(levelname)s: %(message)s',
                        datefmt='%Y-%m-%d %H:%M:%S')
    )
    logger.addHandler(console)

    return logger


class DashboardConfig:
    """Dashboard configuration with defaults using current settings.json"""

    def __init__(self):
        # Load centralized settings
        self.settings = self._load_settings()

        # Elasticsearch settings
        self.elasticsearch_url = self.settings.get('elasticsearch', {}).get('url',
            'https://usieventho-prod-usw2.es.us-west-2.aws.found.io:9243')
        self.kibana_url = self.settings.get('kibana', {}).get('url',
            'https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243')
        self.kibana_index = self.settings.get('elasticsearch', {}).get('index_pattern', 'traffic-*')

        # Default time ranges
        processing = self.settings.get('processing', {})
        self.default_baseline_start = processing.get('baseline_start', '2025-06-01')
        self.default_baseline_end = processing.get('baseline_end', '2025-06-09')
        self.default_current_time = processing.get('current_time_range', 'now-12h')

        # Thresholds
        self.high_volume_threshold = processing.get('high_volume_threshold', 1000)
        self.medium_volume_threshold = processing.get('medium_volume_threshold', 100)
        self.critical_threshold = processing.get('critical_threshold', -80)
        self.warning_threshold = processing.get('warning_threshold', -50)
        self.min_daily_volume = processing.get('min_daily_volume', 100)

        # RAD types configuration
        self.rad_types = self.settings.get('rad_types', {})

        # File paths
        self.data_dir = "data"
        self.raw_response_file = "data/raw_response.json"
        self.output_file = "index.html"

    def _load_settings(self) -> Dict[str, Any]:
        """Load settings from config/settings.json"""
        config_path = Path(__file__).parent.parent / "config" / "settings.json"

        if not config_path.exists():
            logging.warning(f"Settings file not found at {config_path}, using defaults")
            return {}

        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            logging.warning(f"Failed to load settings: {e}, using defaults")
            return {}


# ====================
# Authentication
# ====================

def get_elastic_cookie() -> Optional[str]:
    """Get Elastic cookie from environment or local script"""
    # Priority 1: Environment variable (for CI/CD)
    cookie = os.environ.get('ELASTIC_COOKIE') or os.environ.get('ES_COOKIE')
    if cookie:
        return cookie

    # Priority 2: Local script (for development)
    local_script = os.path.expanduser("~/scripts/traffic_monitor.sh")
    if os.path.exists(local_script):
        try:
            with open(local_script, 'r') as f:
                for line in f:
                    if 'ELASTIC_COOKIE="' in line:
                        cookie = line.split('"')[1]
                        return cookie
        except Exception:
            pass

    return None


def validate_cookie(cookie: Optional[str]) -> bool:
    """Validate cookie format"""
    if not cookie:
        return False

    # Basic validation - Kibana cookies typically start with specific patterns
    if (cookie.startswith("Fe26.2**") or
        cookie.startswith("sid=") or
        len(cookie) > 100):
        return True

    return False


def setup_authentication(logger: logging.Logger) -> str:
    """Setup and validate authentication"""
    cookie = get_elastic_cookie()

    if not validate_cookie(cookie):
        logger.error("(✗) Invalid or missing Elastic cookie")
        logger.error("Please set ELASTIC_COOKIE environment variable")
        logger.error("Example: export ELASTIC_COOKIE='your_kibana_session_cookie'")
        sys.exit(1)

    logger.info("(✓)Authentication configured")
    return cookie


# ====================
# Data Processing
# ====================

def build_elasticsearch_query(config: DashboardConfig, baseline_start: str,
                             baseline_end: str, current_time: str) -> Dict[str, Any]:
    """Build Elasticsearch query for multi-RAD monitoring"""

    # Build wildcard filters for enabled RAD types
    wildcard_filters = []
    enabled_rad_types = []

    for rad_key, rad_config in config.rad_types.items():
        if rad_config.get('enabled', False) and rad_config.get('pattern'):
            wildcard_filters.append({
                "wildcard": {
                    "detail.event.data.traffic.eid.keyword": {
                        "value": rad_config['pattern']
                    }
                }
            })
            enabled_rad_types.append(f"{rad_config['display_name']} ({rad_config['pattern']})")

    # If no RAD types are enabled, fall back to default venture feed
    if not wildcard_filters:
        wildcard_filters = [{
            "wildcard": {
                "detail.event.data.traffic.eid.keyword": {
                    "value": "pandc.vnext.recommendations.feed.feed*"
                }
            }
        }]
        enabled_rad_types = ["Venture Feed (default)"]

    logging.info(f"Monitoring RAD types: {', '.join(enabled_rad_types)}")

    # Convert time range to actual timestamp for current period
    if current_time.startswith('now-'):
        time_value = current_time[4:]  # Remove 'now-'
        if time_value.endswith('h'):
            hours = int(time_value[:-1])
            current_start = datetime.utcnow() - timedelta(hours=hours)
        elif time_value.endswith('d'):
            days = int(time_value[:-1])
            current_start = datetime.utcnow() - timedelta(days=days)
        else:
            current_start = datetime.utcnow() - timedelta(hours=12)  # default

        current_start_str = current_start.isoformat() + "Z"
    else:
        current_start_str = current_time

    # Build the complete Elasticsearch query
    query = {
        "size": 0,
        "query": {
            "bool": {
                "filter": [
                    {
                        "bool": {
                            "should": wildcard_filters,
                            "minimum_should_match": 1
                        }
                    },
                    {
                        "match_phrase": {
                            "detail.global.page.host": "dashboard.godaddy.com"
                        }
                    },
                    {
                        "range": {
                            "@timestamp": {
                                "gte": baseline_start,
                                "lte": "now"
                            }
                        }
                    }
                ]
            }
        },
        "aggs": {
            "events": {
                "terms": {
                    "field": "detail.event.data.traffic.eid.keyword",
                    "order": {"current": "desc"},
                    "size": 500
                },
                "aggs": {
                    "baseline": {
                        "filter": {
                            "range": {
                                "@timestamp": {
                                    "gte": baseline_start,
                                    "lt": baseline_end
                                }
                            }
                        }
                    },
                    "current": {
                        "filter": {
                            "range": {
                                "@timestamp": {
                                    "gte": current_start_str,
                                    "lte": "now"
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    return query


def fetch_kibana_data(cookie: str, config: DashboardConfig, baseline_start: str,
                     baseline_end: str, current_time: str, logger: logging.Logger) -> Dict[str, Any]:
    """Fetch data from Kibana/Elasticsearch"""

    logger.info("📊 Fetching traffic data from Elasticsearch...")

    # Build the query
    query = build_elasticsearch_query(config, baseline_start, baseline_end, current_time)

    # Prepare headers
    headers = {
        'Content-Type': 'application/json',
        'kbn-xsrf': 'true',
        'Cookie': cookie
    }

    # Make the request to Kibana
    kibana_search_url = f"{config.kibana_url}/api/console/proxy?path=traffic-*/_search&method=POST"

    try:
        response = requests.post(
            kibana_search_url,
            headers=headers,
            json=query,
            timeout=30
        )

        if response.status_code == 200:
            data = response.json()
            logger.success("(✓)Data fetched successfully")
            return data
        else:
            logger.error(f"(✗) Kibana request failed: {response.status_code}")
            logger.error(f"Response: {response.text}")
            return {}

    except requests.exceptions.RequestException as e:
        logger.error(f"(✗) Network error: {e}")
        return {}


def process_elasticsearch_data(data: Dict[str, Any], config: DashboardConfig,
                              logger: logging.Logger) -> List[Dict[str, Any]]:
    """Process Elasticsearch response data"""

    if not data or 'aggregations' not in data:
        logger.warning("No aggregations found in response")
        return []

    events_agg = data['aggregations'].get('events', {})
    buckets = events_agg.get('buckets', [])

    if not buckets:
        logger.warning("No event buckets found")
        return []

    logger.info(f"Processing {len(buckets)} events...")

    processed_events = []

    for bucket in buckets:
        event_id = bucket['key']

        # Get counts
        baseline_count = bucket.get('baseline', {}).get('doc_count', 0)
        current_count = bucket.get('current', {}).get('doc_count', 0)

        # Skip events below volume threshold
        if baseline_count < config.min_daily_volume:
            continue

        # Calculate metrics
        baseline_daily = baseline_count / 8  # 8-day baseline period

        if baseline_daily > 0:
            score = round(((current_count / baseline_daily) - 1) * 100)
        else:
            score = 0

        # Determine status
        if score <= config.critical_threshold:
            status = "CRITICAL"
        elif score <= config.warning_threshold:
            status = "WARNING"
        elif score >= 50:
            status = "INCREASED"
        else:
            status = "NORMAL"

        # Determine RAD type
        rad_type = "unknown"
        rad_display_name = "Unknown"
        rad_color = "#666"

        for rad_key, rad_config in config.rad_types.items():
            pattern = rad_config.get('pattern', '')
            if pattern and pattern.replace('*', '') in event_id:
                rad_type = rad_key
                rad_display_name = rad_config.get('display_name', rad_key)
                rad_color = rad_config.get('color', '#666')
                break

        # Calculate impact
        diff = current_count - baseline_daily
        if diff < -50:
            impact = f"Lost ~{abs(int(diff)):,} impressions"
        elif diff > 50:
            impact = f"Gained ~{int(diff):,} impressions"
        else:
            impact = "Normal variance"

        # Create processed event
        event = {
            "event_id": event_id,
            "display_name": event_id.split('.')[-1] if '.' in event_id else event_id,
            "current": current_count,
            "baseline_period": baseline_count,
            "baseline_daily": round(baseline_daily),
            "score": score,
            "status": status,
            "rad_type": rad_type,
            "rad_display_name": rad_display_name,
            "rad_color": rad_color,
            "impact": impact
        }

        processed_events.append(event)

    # Sort by score (most critical first)
    processed_events.sort(key=lambda x: x['score'])

    logger.success(f"(✓)Processed {len(processed_events)} events")
    return processed_events


def calculate_summary_stats(events: List[Dict[str, Any]]) -> Dict[str, int]:
    """Calculate summary statistics"""
    stats = {
        "critical": 0,
        "warning": 0,
        "normal": 0,
        "increased": 0,
        "total": len(events)
    }

    for event in events:
        status = event['status'].lower()
        if status in stats:
            stats[status] += 1

    return stats


# ====================
# HTML Generation
# ====================

def generate_html_dashboard(events: List[Dict[str, Any]], stats: Dict[str, int],
                          config: DashboardConfig, args: argparse.Namespace,
                          logger: logging.Logger) -> str:
    """Generate HTML dashboard"""

    # Generate timestamp
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")

    # Generate summary cards HTML
    summary_html = f"""
    <div class="summary">
        <div class="card critical">
            <div class="label">Critical</div>
            <div class="value" id="criticalCount">{stats['critical']}</div>
        </div>
        <div class="card warning">
            <div class="label">Warning</div>
            <div class="value" id="warningCount">{stats['warning']}</div>
        </div>
        <div class="card normal">
            <div class="label">Normal</div>
            <div class="value" id="normalCount">{stats['normal']}</div>
        </div>
        <div class="card increased">
            <div class="label">Increased</div>
            <div class="value" id="increasedCount">{stats['increased']}</div>
        </div>
    </div>"""

    # Generate table rows HTML
    table_rows = ""
    for event in events[:50]:  # Limit to top 50 for static dashboard
        score_class = "negative" if event['score'] < 0 else "positive"
        score_text = f"{'+' if event['score'] > 0 else ''}{event['score']}%"

        kibana_url = build_kibana_url(event['event_id'])

        table_rows += f"""
        <tr data-rad-type="{event['rad_type']}">
            <td>
                <a href="{kibana_url}" target="_blank" class="event-link">
                    <span class="event-name">{event['event_id']}</span>
                </a>
            </td>
            <td>
                <span class="rad-type-badge" style="background: {event['rad_color']}; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: 600;">
                    {event['rad_display_name']}
                </span>
            </td>
            <td><span class="badge {event['status'].lower()}">{event['status']}</span></td>
            <td class="number"><span class="score {score_class}">{score_text}</span></td>
            <td class="number">{event['current']:,}</td>
            <td class="number">{event['baseline_daily']:,}</td>
            <td><span class="impact">{event['impact']}</span></td>
        </tr>"""

    # Load base HTML template and replace placeholders
    template_path = Path(__file__).parent.parent / "index.html"

    if template_path.exists():
        with open(template_path, 'r') as f:
            html_content = f.read()

        # Simple replacements for static generation
        html_content = html_content.replace('Last Updated: <span id="lastUpdated">Loading...</span>',
                                          f'Last Updated: {timestamp}')

        # Find and replace the summary section
        summary_start = html_content.find('<div class="summary">')
        summary_end = html_content.find('</div>', summary_start) + 6
        if summary_start != -1 and summary_end != -1:
            html_content = (html_content[:summary_start] +
                          summary_html +
                          html_content[summary_end:])

        # Find and replace the table body
        tbody_start = html_content.find('<tbody>')
        tbody_end = html_content.find('</tbody>') + 8
        if tbody_start != -1 and tbody_end != -1:
            html_content = (html_content[:tbody_start] +
                          f'<tbody>{table_rows}</tbody>' +
                          html_content[tbody_end:])
    else:
        # Fallback minimal HTML if template not found
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>RAD Monitor Dashboard</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .summary {{ display: flex; gap: 20px; margin-bottom: 30px; }}
                .card {{ padding: 20px; border-radius: 8px; text-align: center; }}
                .critical {{ background: #ffebee; color: #c62828; }}
                .warning {{ background: #fff3e0; color: #ef6c00; }}
                .normal {{ background: #e8f5e8; color: #2e7d32; }}
                .increased {{ background: #e3f2fd; color: #1565c0; }}
                table {{ width: 100%; border-collapse: collapse; }}
                th, td {{ padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }}
            </style>
        </head>
        <body>
            <h1>RAD Monitor Dashboard</h1>
            <p>Generated: {timestamp}</p>
            {summary_html}
            <table>
                <thead>
                    <tr>
                        <th>Event ID</th>
                        <th>RAD Type</th>
                        <th>Status</th>
                        <th>Score</th>
                        <th>Current</th>
                        <th>Baseline</th>
                        <th>Impact</th>
                    </tr>
                </thead>
                <tbody>{table_rows}</tbody>
            </table>
        </body>
        </html>"""

    logger.success("(✓)HTML dashboard generated")
    return html_content


def build_kibana_url(event_id: str) -> str:
    """Build Kibana URL for event"""
    base_url = "https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243"
    discover_path = "/app/discover#/"

    params = (
        "?_g=(filters:!(),refreshInterval:(pause:!t,value:0),"
        "time:(from:'2025-05-28T16:50:47.243Z',to:now))"
        "&_a=(columns:!(),filters:!(('$state':(store:appState),"
        f"meta:(alias:!n,disabled:!f,key:detail.event.data.traffic.eid.keyword,"
        f"negate:!f,params:(query:'{event_id}'),type:phrase),"
        f"query:(match_phrase:(detail.event.data.traffic.eid.keyword:'{event_id}')))),"
        "grid:(columns:(detail.event.data.traffic.eid.keyword:(width:400))),"
        "hideChart:!f,index:'traffic-*',interval:auto,query:(language:kuery,query:''),sort:!())"
    )

    return base_url + discover_path + params


# ====================
# Main Function
# ====================

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Generate RAD Monitor Dashboard')
    parser.add_argument('baseline_start', nargs='?',
                       help='Baseline start date (YYYY-MM-DD)')
    parser.add_argument('baseline_end', nargs='?',
                       help='Baseline end date (YYYY-MM-DD)')
    parser.add_argument('current_time', nargs='?',
                       help='Current time range (e.g., now-12h)')
    parser.add_argument('--output', '-o', default='index.html',
                       help='Output file path')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Verbose logging')
    parser.add_argument('--dry-run', action='store_true',
                       help='Show configuration without making requests')

    args = parser.parse_args()

    # Setup logging
    logger = setup_logging(args.verbose)

    try:
        logger.info("🚀 Starting RAD Monitor Dashboard generation...")

        # Load configuration
        config = DashboardConfig()

        # Use provided arguments or defaults
        baseline_start = args.baseline_start or config.default_baseline_start
        baseline_end = args.baseline_end or config.default_baseline_end
        current_time = args.current_time or config.default_current_time

        logger.info(f"Configuration:")
        logger.info(f"  Baseline: {baseline_start} to {baseline_end}")
        logger.info(f"  Current time: {current_time}")
        logger.info(f"  Output file: {args.output}")

        if args.dry_run:
            logger.info("🏃 Dry run mode - configuration validated successfully")
            return

        # Setup authentication
        cookie = setup_authentication(logger)

        # Ensure directories exist
        Path(config.data_dir).mkdir(parents=True, exist_ok=True)
        logger.info(f"(✓)Data directory ready: {config.data_dir}")

        # Fetch data from Kibana
        raw_data = fetch_kibana_data(cookie, config, baseline_start,
                                   baseline_end, current_time, logger)

        if not raw_data:
            logger.error("(✗) Failed to fetch data")
            sys.exit(1)

        # Save raw response for debugging
        with open(config.raw_response_file, 'w') as f:
            json.dump(raw_data, f, indent=2)
        logger.info(f"(✓)Raw response saved to {config.raw_response_file}")

        # Process the data
        events = process_elasticsearch_data(raw_data, config, logger)

        if not events:
            logger.warning("⚠️  No events found matching criteria")

        # Calculate summary statistics
        stats = calculate_summary_stats(events)
        logger.info(f"📊 Summary: {stats['critical']} critical, {stats['warning']} warning, "
                   f"{stats['normal']} normal, {stats['increased']} increased")

        # Generate HTML dashboard
        html_content = generate_html_dashboard(events, stats, config, args, logger)

        # Write output file
        with open(args.output, 'w') as f:
            f.write(html_content)

        logger.success(f"🎉 Dashboard generated successfully: {args.output}")
        logger.info(f"Total events processed: {len(events)}")

    except KeyboardInterrupt:
        logger.warning("⚡ Interrupted by user")
        sys.exit(130)
    except Exception as e:
        logger.error(f"💥 Unexpected error: {e}")
        if args.verbose:
            logger.error(traceback.format_exc())
        sys.exit(1)


if __name__ == '__main__':
    main()
