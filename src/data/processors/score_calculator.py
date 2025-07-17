"""
Score calculator for determining traffic health status
"""

from typing import Dict, List, Any
from pydantic import ValidationError
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from data.models import TrafficEvent, DashboardStats


class ScoreCalculator:
    """Calculates health scores and statuses for traffic events"""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.high_volume_threshold = config.get('highVolumeThreshold', 1000)
        self.critical_threshold = config.get('criticalThreshold', -80)
        self.warning_threshold = config.get('warningThreshold', -50)

    def calculate_scores(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Calculate scores and statuses for all events

        Args:
            events: List of processed traffic events

        Returns:
            Events with added score and status fields
        """
        scored_events = []

        for event in events:
            scored_event = event.copy()
            score = self._calculate_score(event)
            status = self._determine_status(score)

            scored_event['score'] = score
            scored_event['status'] = status

            try:
                # Validate the scored event
                validated = TrafficEvent(**scored_event)
                scored_events.append(validated.model_dump())
            except ValidationError as e:
                print(f"Invalid scored event {event.get('event_id', 'unknown')}: {e}", file=sys.stderr)
                continue

        # Sort by score (worst first)
        scored_events.sort(key=lambda x: x['score'])

        return scored_events

    def _calculate_score(self, event: Dict[str, Any]) -> int:
        """Calculate health score for a single event"""
        current = event['current']
        baseline_period = event['baseline_period']
        daily_avg = event['daily_avg']

        if baseline_period == 0:
            return 0

        ratio = current / baseline_period

        # High volume events (>= 1000 daily average)
        if daily_avg >= self.high_volume_threshold:
            if ratio < 0.5:  # Dropped by more than 50%
                # Negative score based on how much it dropped
                score = round((1 - ratio) * -100)
            else:
                # Positive/negative score based on increase/decrease
                score = round((ratio - 1) * 100)

        # Medium volume events
        else:
            if ratio < 0.3:  # Dropped by more than 70%
                # Negative score based on how much it dropped
                score = round((1 - ratio) * -100)
            else:
                # Positive/negative score based on increase/decrease
                score = round((ratio - 1) * 100)

        # Clamp score to valid range [-100, 100]
        return max(-100, min(100, score))

    def _determine_status(self, score: int) -> str:
        """Determine status based on score"""
        if score <= self.critical_threshold:
            return "CRITICAL"
        elif score <= self.warning_threshold:
            return "WARNING"
        elif score > 0:
            return "INCREASED"
        else:
            return "NORMAL"

    def get_summary_stats(self, events: List[Dict[str, Any]]) -> Dict[str, int]:
        """Get summary statistics for all events"""
        stats_dict = {
            'critical': 0,
            'warning': 0,
            'normal': 0,
            'increased': 0,
            'total': len(events)
        }

        for event in events:
            status = event['status'].lower()
            if status in stats_dict:
                stats_dict[status] += 1

        # Validate stats
        try:
            stats = DashboardStats(**stats_dict)
            return stats.model_dump()
        except ValidationError as e:
            print(f"Invalid stats generated: {e}", file=sys.stderr)
            # Return the dict anyway for backward compatibility
            return stats_dict
