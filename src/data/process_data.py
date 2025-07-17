#!/usr/bin/env python3
"""
Main data processing orchestrator for RAD Monitor Dashboard
Coordinates the processing pipeline from raw data to HTML output
"""

import json
import sys
import argparse
import os
from typing import Dict, Any
from pydantic import ValidationError



# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data.processors import TrafficProcessor, ScoreCalculator, HTMLGenerator
from data.models import (
    ProcessingConfig,
    ElasticResponse,
    DashboardData,
    DashboardStats,
    TrafficEvent
)
# from config.settings import get_settings  # Commented out - not yet implemented


def load_json_file(filepath: str) -> Dict[str, Any]:
    """Load JSON data from file"""
    with open(filepath, 'r') as f:
        return json.load(f)


def save_output(content: str, filepath: str):
    """Save content to file"""
    dirname = os.path.dirname(filepath)
    if dirname:
        os.makedirs(dirname, exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)


def main():
    """Main processing function"""
    parser = argparse.ArgumentParser(description='Process RAD Monitor data')
    parser.add_argument('--response', type=str, default='data/raw_response.json',
                        help='Path to raw response JSON file')
    parser.add_argument('--template', type=str, required=True,
                        help='Path to HTML template file')
    parser.add_argument('--output', type=str, default='index.html',
                        help='Output HTML file path')
    parser.add_argument('--config', type=str, help='Configuration JSON file')

    args = parser.parse_args()

    try:
        # Load configuration from environment or config file
        if args.config and os.path.exists(args.config):
            config_dict = load_json_file(args.config)
        else:
            # Use environment variables (backward compatibility)
            config_dict = {
                'baselineStart': os.environ.get('BASELINE_START', '2025-06-01'),
                'baselineEnd': os.environ.get('BASELINE_END', '2025-06-09'),
                'currentTimeRange': os.environ.get('CURRENT_TIME_RANGE', 'now-12h'),
                'highVolumeThreshold': int(os.environ.get('HIGH_VOLUME_THRESHOLD', '1000')),
                'mediumVolumeThreshold': int(os.environ.get('MEDIUM_VOLUME_THRESHOLD', '100')),
                'criticalThreshold': int(os.environ.get('CRITICAL_THRESHOLD', '-80')),
                'warningThreshold': int(os.environ.get('WARNING_THRESHOLD', '-50'))
            }

        # Validate configuration
        try:
            config = ProcessingConfig(**config_dict)
        except ValidationError as e:
            print(f"Invalid configuration: {e}", file=sys.stderr)
            sys.exit(1)

        # Load and validate response data
        response_dict = load_json_file(args.response)

        try:
            response = ElasticResponse(**response_dict)
        except ValidationError as e:
            print(f"Invalid Elasticsearch response: {e}", file=sys.stderr)
            sys.exit(1)

        # Check for errors in response
        if response.error:
            print(f"Elasticsearch error: {response.error}", file=sys.stderr)
            sys.exit(1)

        # Process data through pipeline
        traffic_processor = TrafficProcessor(config.model_dump())
        events = traffic_processor.process_response(response.model_dump())

        score_calculator = ScoreCalculator(config.model_dump())
        scored_events_dicts = score_calculator.calculate_scores(events)
        stats_dict = score_calculator.get_summary_stats(scored_events_dicts)

        # Validate scored events
        try:
            scored_events = [TrafficEvent(**event) for event in scored_events_dicts]
            stats = DashboardStats(**stats_dict)
        except ValidationError as e:
            print(f"Invalid processed data: {e}", file=sys.stderr)
            sys.exit(1)

        # Create validated dashboard data
        dashboard_data = DashboardData(
            events=scored_events,
            stats=stats,
            config=config
        )

        # Generate HTML using validated data
        html_generator = HTMLGenerator(args.template)
        html_content = html_generator.generate(
            [event.model_dump() for event in dashboard_data.events],
            dashboard_data.stats.model_dump()
        )

        # Save output
        save_output(html_content, args.output)

        # Print summary
        print(f"Dashboard generated successfully!", file=sys.stderr)
        print(f"Total events processed: {dashboard_data.stats.total}", file=sys.stderr)
        print(f"Critical: {dashboard_data.stats.critical}, Warning: {dashboard_data.stats.warning}, "
              f"Normal: {dashboard_data.stats.normal}, Increased: {dashboard_data.stats.increased}", file=sys.stderr)

    except FileNotFoundError as e:
        print(f"File not found: {str(e)}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Invalid JSON: {str(e)}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error processing data: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
