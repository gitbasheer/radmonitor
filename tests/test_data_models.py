"""
Tests for Pydantic data models used in the RAD Monitor pipeline
"""

import pytest
from datetime import datetime
from pydantic import ValidationError
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.data.models import (
    ElasticBucket,
    ElasticAggregations,
    ElasticResponse,
    ProcessingConfig,
    TrafficEvent,
    DashboardStats,
    DashboardData,
    ProcessedEvent
)


class TestElasticBucket:
    """Test ElasticBucket model validation"""

    def test_valid_bucket(self):
        """Test valid bucket creation"""
        bucket = ElasticBucket(
            key="pandc.vnext.recommendations.feed.some_event",
            doc_count=100,
            baseline={"doc_count": 50},
            current={"doc_count": 75}
        )
        assert bucket.key == "pandc.vnext.recommendations.feed.some_event"
        assert bucket.doc_count == 100

    def test_invalid_doc_count(self):
        """Test negative doc_count validation"""
        with pytest.raises(ValidationError) as exc_info:
            ElasticBucket(key="feed_test", doc_count=-1)
        assert "greater than or equal to 0" in str(exc_info.value)

    def test_invalid_event_id_format(self):
        """Test event ID format validation"""
        with pytest.raises(ValidationError) as exc_info:
            ElasticBucket(key="invalid_format", doc_count=10)
        assert "Unexpected event ID format" in str(exc_info.value)

    def test_empty_event_id(self):
        """Test empty event ID validation"""
        with pytest.raises(ValidationError) as exc_info:
            ElasticBucket(key="", doc_count=10)
        assert "Event ID cannot be empty" in str(exc_info.value)


class TestElasticResponse:
    """Test ElasticResponse model validation"""

    def test_valid_response_with_aggregations(self):
        """Test valid response with aggregations"""
        response = ElasticResponse(
            aggregations={
                "events": {
                    "buckets": [
                        {"key": "feed_test", "doc_count": 100}
                    ]
                }
            },
            took=150,
            _shards={"total": 5, "successful": 5}
        )
        assert response.aggregations is not None
        assert response.error is None

    def test_valid_response_with_error(self):
        """Test valid response with error"""
        response = ElasticResponse(
            error={"type": "search_phase_execution_exception", "reason": "test error"}
        )
        assert response.error is not None
        assert response.aggregations is None

    def test_missing_buckets_in_aggregations(self):
        """Test aggregations without buckets"""
        with pytest.raises(ValidationError) as exc_info:
            ElasticResponse(
                aggregations={"events": {"doc_count": 100}}
            )
        assert "Events aggregation must contain 'buckets'" in str(exc_info.value)


class TestProcessingConfig:
    """Test ProcessingConfig model validation"""

    def test_valid_config(self):
        """Test valid configuration"""
        config = ProcessingConfig(
            baselineStart="2025-06-01",
            baselineEnd="2025-06-09",
            currentTimeRange="now-12h",
            highVolumeThreshold=1000,
            mediumVolumeThreshold=100,
            criticalThreshold=-80,
            warningThreshold=-50
        )
        assert config.baselineStart == "2025-06-01"
        assert config.currentTimeRange == "now-12h"

    def test_invalid_date_format(self):
        """Test invalid date format validation"""
        with pytest.raises(ValidationError) as exc_info:
            ProcessingConfig(
                baselineStart="06/01/2025",  # Wrong format
                baselineEnd="2025-06-09"
            )
        assert "Invalid ISO date format" in str(exc_info.value)

    def test_invalid_time_range_format(self):
        """Test invalid time range format"""
        with pytest.raises(ValidationError) as exc_info:
            ProcessingConfig(
                baselineStart="2025-06-01",
                baselineEnd="2025-06-09",
                currentTimeRange="12 hours ago"  # Invalid format
            )
        assert "Invalid time range format" in str(exc_info.value)

    def test_valid_time_range_formats(self):
        """Test various valid time range formats"""
        formats = ["now-12h", "now-1d", "-24h-8h", "inspection_time"]
        for fmt in formats:
            config = ProcessingConfig(
                baselineStart="2025-06-01",
                baselineEnd="2025-06-09",
                currentTimeRange=fmt
            )
            assert config.currentTimeRange == fmt

    def test_threshold_validation(self):
        """Test threshold validations"""
        # Critical must be less than warning
        with pytest.raises(ValidationError) as exc_info:
            ProcessingConfig(
                baselineStart="2025-06-01",
                baselineEnd="2025-06-09",
                criticalThreshold=-40,
                warningThreshold=-50
            )
        assert "Critical threshold must be less than warning threshold" in str(exc_info.value)

        # Negative thresholds
        with pytest.raises(ValidationError) as exc_info:
            ProcessingConfig(
                baselineStart="2025-06-01",
                baselineEnd="2025-06-09",
                highVolumeThreshold=-100
            )
        assert "greater than or equal to 0" in str(exc_info.value)


class TestTrafficEvent:
    """Test TrafficEvent model validation"""

    def test_valid_event(self):
        """Test valid traffic event"""
        event = TrafficEvent(
            event_id="pandc.vnext.recommendations.feed.test",
            display_name="test",
            current=500,
            baseline_12h=1000,
            baseline_period=1000,
            daily_avg=2000,
            baseline_count=14000,
            baseline_days=7,
            current_hours=12,
            score=-50,
            status="WARNING"
        )
        assert event.score == -50
        assert event.status == "WARNING"

    def test_invalid_score_range(self):
        """Test score range validation"""
        with pytest.raises(ValidationError) as exc_info:
            TrafficEvent(
                event_id="feed_test",
                display_name="test",
                current=500,
                baseline_12h=1000,
                baseline_period=1000,
                daily_avg=2000,
                baseline_count=14000,
                baseline_days=7,
                current_hours=12,
                score=-150,  # Out of range
                status="CRITICAL"
            )
        assert "greater than or equal to -100" in str(exc_info.value)

    def test_score_status_consistency(self):
        """Test score and status consistency validation"""
        # Critical status with non-critical score
        with pytest.raises(ValidationError) as exc_info:
            TrafficEvent(
                event_id="feed_test",
                display_name="test",
                current=500,
                baseline_12h=1000,
                baseline_period=1000,
                daily_avg=2000,
                baseline_count=14000,
                baseline_days=7,
                current_hours=12,
                score=-50,  # Not critical
                status="CRITICAL"
            )
        assert "CRITICAL status requires score <= -80" in str(exc_info.value)

        # Valid combinations
        valid_combinations = [
            (-85, "CRITICAL"),
            (-60, "WARNING"),
            (-30, "NORMAL"),
            (20, "INCREASED")
        ]
        for score, status in valid_combinations:
            event = TrafficEvent(
                event_id="feed_test",
                display_name="test",
                current=500,
                baseline_12h=1000,
                baseline_period=1000,
                daily_avg=2000,
                baseline_count=14000,
                baseline_days=7,
                current_hours=12,
                score=score,
                status=status
            )
            assert event.score == score
            assert event.status == status

    def test_invalid_status(self):
        """Test invalid status value"""
        with pytest.raises(ValidationError) as exc_info:
            TrafficEvent(
                event_id="feed_test",
                display_name="test",
                current=500,
                baseline_12h=1000,
                baseline_period=1000,
                daily_avg=2000,
                baseline_count=14000,
                baseline_days=7,
                current_hours=12,
                score=-50,
                status="UNKNOWN"  # Invalid status
            )
        assert "Input should be" in str(exc_info.value)


class TestDashboardStats:
    """Test DashboardStats model validation"""

    def test_valid_stats(self):
        """Test valid dashboard stats"""
        stats = DashboardStats(
            critical=2,
            warning=5,
            normal=10,
            increased=3,
            total=20
        )
        assert stats.total == 20

    def test_invalid_total(self):
        """Test total validation"""
        with pytest.raises(ValidationError) as exc_info:
            DashboardStats(
                critical=2,
                warning=5,
                normal=10,
                increased=3,
                total=25  # Wrong total
            )
        assert "Total (25) must equal sum of all statuses (20)" in str(exc_info.value)


class TestDashboardData:
    """Test DashboardData model validation"""

    def test_valid_dashboard_data(self):
        """Test valid dashboard data creation"""
        config = ProcessingConfig(
            baselineStart="2025-06-01",
            baselineEnd="2025-06-09"
        )

        events = [
            TrafficEvent(
                event_id="feed_test1",
                display_name="test1",
                current=100,
                baseline_12h=1000,
                baseline_period=1000,
                daily_avg=2000,
                baseline_count=14000,
                baseline_days=7,
                current_hours=12,
                score=-85,
                status="CRITICAL"
            ),
            TrafficEvent(
                event_id="feed_test2",
                display_name="test2",
                current=500,
                baseline_12h=1000,
                baseline_period=1000,
                daily_avg=2000,
                baseline_count=14000,
                baseline_days=7,
                current_hours=12,
                score=-50,
                status="WARNING"
            )
        ]

        stats = DashboardStats(
            critical=1,
            warning=1,
            normal=0,
            increased=0,
            total=2
        )

        dashboard = DashboardData(
            events=events,
            stats=stats,
            config=config
        )

        assert len(dashboard.events) == 2
        assert dashboard.stats.total == 2

    def test_events_not_sorted(self):
        """Test events sorting validation"""
        config = ProcessingConfig(
            baselineStart="2025-06-01",
            baselineEnd="2025-06-09"
        )

        events = [
            TrafficEvent(
                event_id="feed_test1",
                display_name="test1",
                current=500,
                baseline_12h=1000,
                baseline_period=1000,
                daily_avg=2000,
                baseline_count=14000,
                baseline_days=7,
                current_hours=12,
                score=-50,  # Higher score
                status="WARNING"
            ),
            TrafficEvent(
                event_id="feed_test2",
                display_name="test2",
                current=100,
                baseline_12h=1000,
                baseline_period=1000,
                daily_avg=2000,
                baseline_count=14000,
                baseline_days=7,
                current_hours=12,
                score=-85,  # Lower score should be first
                status="CRITICAL"
            )
        ]

        stats = DashboardStats(
            critical=1,
            warning=1,
            normal=0,
            increased=0,
            total=2
        )

        with pytest.raises(ValidationError) as exc_info:
            DashboardData(
                events=events,
                stats=stats,
                config=config
            )
        assert "Events must be sorted by score in ascending order" in str(exc_info.value)

    def test_to_dict_backward_compatibility(self):
        """Test backward compatibility of to_dict method"""
        config = ProcessingConfig(
            baselineStart="2025-06-01",
            baselineEnd="2025-06-09"
        )

        events = [
            TrafficEvent(
                event_id="feed_test",
                display_name="test",
                current=500,
                baseline_12h=1000,
                baseline_period=1000,
                daily_avg=2000,
                baseline_count=14000,
                baseline_days=7,
                current_hours=12,
                score=-50,
                status="WARNING"
            )
        ]

        stats = DashboardStats(
            critical=0,
            warning=1,
            normal=0,
            increased=0,
            total=1
        )

        dashboard = DashboardData(
            events=events,
            stats=stats,
            config=config
        )

        data_dict = dashboard.to_dict()

        assert 'events' in data_dict
        assert 'stats' in data_dict
        assert 'generated_at' in data_dict
        assert 'config' in data_dict
        assert len(data_dict['events']) == 1
        assert data_dict['stats']['total'] == 1


class TestProcessedEvent:
    """Test ProcessedEvent model validation"""

    def test_valid_processed_event(self):
        """Test valid processed event"""
        event = ProcessedEvent(
            event_id="feed_test",
            display_name="test",
            current=500,
            baseline_12h=1000,
            baseline_period=1000,
            daily_avg=2000,
            baseline_count=14000,
            baseline_days=7,
            current_hours=12
        )
        assert event.current == 500
        assert event.baseline_days == 7

    def test_invalid_current_hours(self):
        """Test current hours validation"""
        with pytest.raises(ValidationError) as exc_info:
            ProcessedEvent(
                event_id="feed_test",
                display_name="test",
                current=500,
                baseline_12h=1000,
                baseline_period=1000,
                daily_avg=2000,
                baseline_count=14000,
                baseline_days=7,
                current_hours=200  # More than 168 (1 week)
            )
        assert "less than or equal to 168" in str(exc_info.value)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
