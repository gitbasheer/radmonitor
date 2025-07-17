#!/usr/bin/env python3
"""
Dashboard Generator for RAD Monitor
Simple, readable Python replacement for generate_dashboard_refactored.sh

This script completely replaces the bash implementation while maintaining
100% backward compatibility through a wrapper script at scripts/generate_dashboard_refactored.sh

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
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Import our data processor
from src.data.process_data import main as process_data_main
from src.config.settings import Settings


# Configure logging with colors
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


# Set up logging
def setup_logging():
    """Configure logging with colored output"""
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)

    # Console handler with colors
    console = logging.StreamHandler()
    console.setFormatter(
        ColoredFormatter('[%(asctime)s] %(levelname)s: %(message)s',
                        datefmt='%Y-%m-%d %H:%M:%S')
    )
    logger.addHandler(console)

    return logger


# Configuration class to replace bash config
class DashboardConfig:
    """Dashboard configuration with defaults - now uses centralized config"""

    def __init__(self):
        # Load centralized settings
        settings = Settings()
        
        # Kibana settings
        self.kibana_url = settings.kibana.url
        self.kibana_index = settings.elasticsearch.index_pattern

        # Default time ranges
        self.default_baseline_start = settings.processing.baseline_start
        self.default_baseline_end = settings.processing.baseline_end
        self.default_current_time = settings.processing.current_time_range

        # Thresholds
        self.high_volume_threshold = settings.processing.high_volume_threshold
        self.medium_volume_threshold = settings.processing.medium_volume_threshold
        self.critical_threshold = settings.processing.critical_threshold
        self.warning_threshold = settings.processing.warning_threshold

        # File paths
        self.data_dir = "data"
        self.raw_response_file = "data/raw_response.json"
        self.output_file = "index.html"


# Cookie handler functions
def get_elastic_cookie() -> Optional[str]:
    """Get Elastic cookie from environment or local script"""
    # Priority 1: Environment variable
    cookie = os.environ.get('ELASTIC_COOKIE')
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

    # Basic validation
    if cookie.startswith("Fe26.2**") or len(cookie) > 100:
        return True

    return False


def setup_authentication(logger: logging.Logger) -> str:
    """Setup and validate authentication"""
    cookie = get_elastic_cookie()

    if not validate_cookie(cookie):
        logger.error("❌ Invalid or missing Elastic cookie")
        logger.error("Please set ELASTIC_COOKIE environment variable")
        sys.exit(1)

    logger.info("✅ Authentication configured")
    return cookie


def ensure_directories(config: DashboardConfig, logger: logging.Logger):
    """Ensure required directories exist"""
    Path(config.data_dir).mkdir(parents=True, exist_ok=True)
    logger.info(f"✅ Data directory ready: {config.data_dir}")


def fetch_kibana_data(cookie: str, config: DashboardConfig, args: argparse.Namespace,
                     logger: logging.Logger) -> Dict[str, Any]:
    """Fetch data from Kibana using our FastAPI endpoint"""
    import requests

    logger.info("📊 Fetching traffic data from Kibana...")

    # Load RAD types from settings
    settings = Settings()
    rad_types = settings.rad_types
    
    # Build wildcard filters for enabled RAD types
    wildcard_filters = []
    for rad_key, rad_config in rad_types.items():
        if rad_config.get('enabled', False) and rad_config.get('pattern'):
            wildcard_filters.append({
                "wildcard": {
                    "detail.event.data.traffic.eid.keyword": {
                        "value": rad_config['pattern']
                    }
                }
            })
    
    # If no RAD types are enabled, fall back to default
    if not wildcard_filters:
        logger.warning("No RAD types enabled, using default pattern")
        wildcard_filters = [{
            "wildcard": {
                "detail.event.data.traffic.eid.keyword": {
                    "value": "pandc.vnext.recommendations.feed.feed*"
                }
            }
        }]
    
    # Log which patterns we're using
    patterns = [f['wildcard']['detail.event.data.traffic.eid.keyword']['value'] for f in wildcard_filters]
    logger.info(f"Using RAD patterns: {', '.join(patterns)}")

    # Build the Elasticsearch query with multiple patterns using OR logic
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
                                "gte": "2025-05-19T04:00:00.000Z",
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
                    "order": {"_key": "asc"},
                    "size": 500
                },
                "aggs": {
                    "baseline": {
                        "filter": {
                            "range": {
                                "@timestamp": {
                                    "gte": args.baseline_start,
                                    "lt": args.baseline_end
                                }
                            }
                        }
                    },
                    "current": {
                        "filter": {
                            "range": {
                                "@timestamp": {
                                    "gte": args.current_time
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    # Try FastAPI endpoint first (if dev server is running)
    try:
        response = requests.post(
            "http://localhost:8000/api/fetch-kibana-data",
            json={"query": query, "force_refresh": False},
            headers={"X-Elastic-Cookie": cookie},
            timeout=30
        )

        if response.status_code == 200:
            logger.info("✅ Data fetched via FastAPI endpoint")
            return response.json()
        else:
            logger.warning(f"FastAPI endpoint returned {response.status_code}, falling back to CORS proxy")
    except requests.exceptions.RequestException as e:
        logger.warning(f"FastAPI endpoint not available, using CORS proxy: {e}")

    # Fallback to CORS proxy
    try:
        response = requests.post(
            "http://localhost:8889/kibana-proxy",
            json=query,
            headers={"X-Elastic-Cookie": cookie},
            timeout=30
        )

        if response.status_code == 200:
            logger.info("✅ Data fetched via CORS proxy")
            return response.json()
        else:
            logger.error(f"❌ Failed to fetch data: HTTP {response.status_code}")
            logger.error(response.text)
            sys.exit(1)

    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Failed to connect to CORS proxy: {e}")
        logger.error("Make sure CORS proxy is running: npm run cors-proxy")
        
        # Direct API fallback for GitHub Actions
        logger.info("🔄 Proxy servers unavailable, using direct Elasticsearch API")
        headers = {
            'Cookie': f'sid={cookie}',
            'Content-Type': 'application/json',
            'kbn-xsrf': 'true'
        }
        es_url = "https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243/api/console/proxy?path=traffic-*/_search&method=POST"
        
        try:
            response = requests.post(es_url, json=query, headers=headers, timeout=30)
            
            if response.status_code == 200:
                logger.info("✅ Data fetched via direct Elasticsearch API")
                return response.json()
            else:
                logger.error(f"❌ Direct API failed: HTTP {response.status_code}")
                logger.error(response.text)
                sys.exit(1)
                
        except requests.exceptions.RequestException as direct_e:
            logger.error(f"❌ Direct API connection failed: {direct_e}")
            logger.error("All data fetch methods failed")
            sys.exit(1)


def save_raw_response(data: Dict[str, Any], config: DashboardConfig, logger: logging.Logger):
    """Save raw response to file"""
    with open(config.raw_response_file, 'w') as f:
        json.dump(data, f, indent=2)
    logger.info(f"💾 Raw response saved to {config.raw_response_file}")


def generate_dashboard(config: DashboardConfig, args: argparse.Namespace,
                      logger: logging.Logger):
    """Process data and generate HTML dashboard"""
    logger.info("🔨 Processing data and generating dashboard...")

    # Set environment variables for process_data.py
    os.environ['BASELINE_START'] = args.baseline_start
    os.environ['BASELINE_END'] = args.baseline_end
    os.environ['CURRENT_TIME_RANGE'] = args.current_time
    os.environ['HIGH_VOLUME_THRESHOLD'] = str(config.high_volume_threshold)
    os.environ['MEDIUM_VOLUME_THRESHOLD'] = str(config.medium_volume_threshold)
    os.environ['CRITICAL_THRESHOLD'] = str(config.critical_threshold)
    os.environ['WARNING_THRESHOLD'] = str(config.warning_threshold)

    # Build arguments for process_data.py
    old_argv = sys.argv.copy()  # Save current argv
    sys.argv = [
        'process_data.py',
        '--response', config.raw_response_file,
        '--output-template', config.output_file,
        '--output', config.output_file
    ]

    try:
        # Debug: Log what we're about to do
        logger.info(f"Calling process_data with args: {sys.argv}")
        
        # Call process_data.py main function directly
        process_data_main()
        logger.success(f"✅ Dashboard generated successfully!")
        logger.info(f"📄 Output: {config.output_file}")
    except SystemExit as e:
        if e.code != 0:
            logger.error("❌ Failed to process data and generate HTML")
            sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Failed to generate dashboard: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        sys.argv = old_argv  # Restore original argv


def main():
    """Main function - orchestrates dashboard generation"""
    # Setup
    logger = setup_logging()
    config = DashboardConfig()

    # Command line arguments
    parser = argparse.ArgumentParser(description='Generate RAD Monitor Dashboard')
    parser.add_argument('baseline_start', nargs='?',
                       default=config.default_baseline_start,
                       help='Baseline start date (YYYY-MM-DD)')
    parser.add_argument('baseline_end', nargs='?',
                       default=config.default_baseline_end,
                       help='Baseline end date (YYYY-MM-DD)')
    parser.add_argument('current_time', nargs='?',
                       default=config.default_current_time,
                       help='Current time range (e.g., now-12h)')

    args = parser.parse_args()

    # Start generation
    logger.info("🚀 === Building RAD Dashboard ===")
    logger.info(f"📅 Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"📊 Baseline: {args.baseline_start} to {args.baseline_end}")
    logger.info(f"⏰ Current period: {args.current_time}")

    try:
        # Step 1: Setup directories
        ensure_directories(config, logger)

        # Step 2: Setup authentication
        cookie = setup_authentication(logger)

        # Step 3: Fetch data from Kibana
        response_data = fetch_kibana_data(cookie, config, args, logger)

        # Step 4: Save raw response
        save_raw_response(response_data, config, logger)

        # Step 5: Generate dashboard HTML
        generate_dashboard(config, args, logger)

        logger.success("🎉 Dashboard generation complete!")

    except KeyboardInterrupt:
        logger.warning("\n⚠️  Dashboard generation interrupted")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
