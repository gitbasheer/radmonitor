"""
Traffic data processor for extracting and transforming Elasticsearch aggregations
"""

from datetime import datetime
from typing import Dict, List, Any
from pydantic import ValidationError
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from data.models import ElasticBucket, ProcessedEvent


class TrafficProcessor:
    """Processes raw Elasticsearch traffic data into structured results"""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.medium_threshold = config.get('mediumVolumeThreshold', 100)

    def process_response(self, response: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Process Elasticsearch response and extract traffic metrics

        Args:
            response: Raw Elasticsearch response

        Returns:
            List of processed traffic events
        """
        if 'error' in response and response['error']:
            raise ValueError(f"Elasticsearch error: {response['error']}")

        if 'aggregations' not in response or 'events' not in response['aggregations']:
            raise ValueError("Invalid response structure")

        buckets = response['aggregations']['events']['buckets']
        results = []

        # Calculate baseline days
        baseline_days = self._calculate_baseline_days()

        for bucket_data in buckets:
            try:
                # Validate bucket structure
                bucket = ElasticBucket(**bucket_data)
                processed = self._process_bucket(bucket.model_dump(), baseline_days)
                if processed:
                    # Validate processed event
                    validated_event = ProcessedEvent(**processed)
                    results.append(validated_event.model_dump())
            except ValidationError as e:
                print(f"Skipping invalid bucket {bucket_data.get('key', 'unknown')}: {e}", file=sys.stderr)
                continue

        return results

    def _calculate_baseline_days(self) -> int:
        """Calculate number of days in baseline period"""
        start = datetime.fromisoformat(self.config['baselineStart'])
        end = datetime.fromisoformat(self.config['baselineEnd'])
        return max(1, (end - start).days)

    def _process_bucket(self, bucket: Dict[str, Any], baseline_days: int) -> Dict[str, Any]:
        """Process a single event bucket"""
        event_id = bucket['key']
        baseline_count = bucket.get('baseline', {}).get('doc_count', 0)
        current_count = bucket.get('current', {}).get('doc_count', 0)

        # Calculate daily average
        daily_avg = baseline_count / baseline_days if baseline_days > 0 else 0

        # Skip low-volume events
        if daily_avg < self.medium_threshold:
            return None

        # Get current period hours from config
        current_hours = self._parse_time_range_hours(self.config.get('currentTimeRange', 'now-12h'))

        # Calculate expected count for current period
        baseline_period = (baseline_count / baseline_days / 24 * current_hours) if baseline_days > 0 else 0

        # Skip if no baseline
        if baseline_period == 0:
            return None

        return {
            'event_id': event_id,
            'display_name': event_id.replace('pandc.vnext.recommendations.feed.', ''),
            'current': current_count,
            'baseline_12h': round(baseline_period),  # Keep name for compatibility
            'baseline_period': round(baseline_period),
            'daily_avg': round(daily_avg),
            'baseline_count': baseline_count,
            'baseline_days': baseline_days,
            'current_hours': current_hours
        }

    def _parse_time_range_hours(self, time_range: str) -> int:
        """Parse time range string to hours"""
        # Handle inspection_time
        if time_range == 'inspection_time':
            return 16  # 24h - 8h = 16h window

        # Handle custom range format: -Xh-Yh
        import re
        custom_match = re.match(r'^-(\d+)([hd])-(\d+)([hd])$', time_range)
        if custom_match:
            from_value = int(custom_match.group(1))
            from_unit = custom_match.group(2)
            to_value = int(custom_match.group(3))
            to_unit = custom_match.group(4)

            from_hours = from_value if from_unit == 'h' else from_value * 24
            to_hours = to_value if to_unit == 'h' else to_value * 24

            return to_hours - from_hours

        # Handle standard format: now-Xh or now-Xd
        now_match = re.match(r'^now-(\d+)([hd])$', time_range)
        if now_match:
            value = int(now_match.group(1))
            unit = now_match.group(2)
            return value if unit == 'h' else value * 24

        # Default to 12 hours
        return 12
