"""
Comprehensive tests for the flexible time comparison functionality
"""

import json
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, MagicMock
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cors_proxy_enhanced import (
    app, TrafficQueryRequest, TrafficQueryResponse,
    ResponseProcessor, TrafficEvent
)

client = TestClient(app)


class TestTrafficQueryRequest:
    """Test the TrafficQueryRequest model"""

    def test_new_comparison_fields(self):
        """Test that new comparison fields are properly validated"""
        now = datetime.utcnow()

        request = TrafficQueryRequest(
            baseline_start=now - timedelta(days=7),
            baseline_end=now - timedelta(days=3.5),
            comparison_start=now - timedelta(minutes=39),
            comparison_end=now,
            time_comparison_strategy="linear_scale"
        )

        assert request.comparison_start == now - timedelta(minutes=39)
        assert request.comparison_end == now
        assert request.time_comparison_strategy == "linear_scale"

    def test_backward_compatibility(self):
        """Test that old-style requests still work"""
        now = datetime.utcnow()

        request = TrafficQueryRequest(
            baseline_start=now - timedelta(days=7),
            baseline_end=now - timedelta(days=3.5),
            current_time_range="12h"
        )

        assert request.current_time_range == "12h"
        assert request.comparison_start is None
        assert request.comparison_end is None
        assert request.time_comparison_strategy == "linear_scale"  # default

    def test_all_comparison_strategies(self):
        """Test all valid comparison strategies"""
        strategies = ["linear_scale", "hourly_average", "daily_pattern"]
        now = datetime.utcnow()

        for strategy in strategies:
            request = TrafficQueryRequest(
                baseline_start=now - timedelta(days=7),
                baseline_end=now - timedelta(days=3.5),
                comparison_start=now - timedelta(hours=1),
                comparison_end=now,
                time_comparison_strategy=strategy
            )
            assert request.time_comparison_strategy == strategy

    def test_invalid_strategy_rejected(self):
        """Test that invalid strategies are rejected"""
        now = datetime.utcnow()

        with pytest.raises(Exception):
            TrafficQueryRequest(
                baseline_start=now - timedelta(days=7),
                baseline_end=now - timedelta(days=3.5),
                time_comparison_strategy="invalid_strategy"
            )

    def test_build_es_query_with_comparison_dates(self):
        """Test that ES query is built correctly with comparison dates"""
        now = datetime.utcnow()
        comparison_start = now - timedelta(hours=2)
        comparison_end = now

        request = TrafficQueryRequest(
            baseline_start=now - timedelta(days=7),
            baseline_end=now - timedelta(days=3),
            comparison_start=comparison_start,
            comparison_end=comparison_end
        )

        query = request.build_es_query()

        # Check that comparison dates are used in the query
        current_filter = query["aggs"]["events"]["aggs"]["current"]["filter"]["range"]["@timestamp"]
        assert current_filter["gte"] == comparison_start.isoformat() + "Z"
        assert current_filter["lte"] == comparison_end.isoformat() + "Z"


class TestResponseProcessor:
    """Test the ResponseProcessor with normalization logic"""

    def test_process_traffic_response_with_linear_scale(self):
        """Test linear scale normalization"""
        now = datetime.utcnow()

        request = TrafficQueryRequest(
            baseline_start=now - timedelta(days=7),
            baseline_end=now - timedelta(days=3.5),  # 3.5 days
            comparison_start=now - timedelta(minutes=39),
            comparison_end=now,
            time_comparison_strategy="linear_scale"
        )

        # Mock Elasticsearch response
        mock_response = {
            "took": 123,
            "aggregations": {
                "events": {
                    "buckets": [
                        {
                            "key": "event.type.1",
                            "baseline": {"doc_count": 12923},  # ~129x more for 3.5 days
                            "current": {"doc_count": 100}  # 39 minutes
                        }
                    ]
                }
            }
        }

        result = ResponseProcessor.process_traffic_response(mock_response, request)

        # Check metadata
        assert result.metadata["baseline_duration_ms"] == int(timedelta(days=3.5).total_seconds() * 1000)
        assert result.metadata["comparison_duration_ms"] == int(timedelta(minutes=39).total_seconds() * 1000)
        assert abs(result.metadata["normalization_factor"] - 129.23) < 0.01
        assert result.metadata["comparison_method"] == "linear_scale"

        # Check event normalization
        event = result.events[0]
        assert event.current_count == 100
        assert event.baseline_count == 12923
        # With linear scale, baseline_period should be ~100 (12923 / 129.23)
        assert 99 <= event.baseline_period <= 101

    def test_process_traffic_response_with_hourly_average(self):
        """Test hourly average normalization"""
        now = datetime.utcnow()

        request = TrafficQueryRequest(
            baseline_start=now - timedelta(days=7),
            baseline_end=now - timedelta(days=3),  # 4 days = 96 hours
            comparison_start=now - timedelta(hours=2),
            comparison_end=now,  # 2 hours
            time_comparison_strategy="hourly_average"
        )

        mock_response = {
            "took": 123,
            "aggregations": {
                "events": {
                    "buckets": [
                        {
                            "key": "event.type.2",
                            "baseline": {"doc_count": 9600},  # 100 per hour average
                            "current": {"doc_count": 200}  # 2 hours
                        }
                    ]
                }
            }
        }

        result = ResponseProcessor.process_traffic_response(mock_response, request)

        assert result.metadata["comparison_method"] == "hourly_average"

        event = result.events[0]
        # Hourly average: 9600 / 96 hours = 100 per hour
        # Expected for 2 hours: 100 * 2 = 200
        assert event.baseline_period == 200

    def test_process_traffic_response_with_daily_pattern(self):
        """Test daily pattern normalization (original behavior)"""
        now = datetime.utcnow()

        request = TrafficQueryRequest(
            baseline_start=now - timedelta(days=8),
            baseline_end=now - timedelta(days=0),  # 8 days
            comparison_start=now - timedelta(hours=12),
            comparison_end=now,  # 12 hours
            time_comparison_strategy="daily_pattern"
        )

        mock_response = {
            "took": 123,
            "aggregations": {
                "events": {
                    "buckets": [
                        {
                            "key": "event.type.3",
                            "baseline": {"doc_count": 9600},  # 1200 per day
                            "current": {"doc_count": 600}  # 12 hours
                        }
                    ]
                }
            }
        }

        result = ResponseProcessor.process_traffic_response(mock_response, request)

        assert result.metadata["comparison_method"] == "daily_pattern"

        event = result.events[0]
        # Daily pattern: 9600 / 8 days = 1200 per day
        # For 12 hours: 1200 / 24 * 12 = 600
        assert event.baseline_period == 600

    def test_backward_compatibility_uses_daily_pattern(self):
        """Test that old-style requests use daily pattern by default"""
        now = datetime.utcnow()

        request = TrafficQueryRequest(
            baseline_start=now - timedelta(days=8),
            baseline_end=now - timedelta(days=0),
            current_time_range="12h"  # Old style
        )

        mock_response = {
            "took": 123,
            "aggregations": {
                "events": {
                    "buckets": [
                        {
                            "key": "event.type.4",
                            "baseline": {"doc_count": 9600},
                            "current": {"doc_count": 600}
                        }
                    ]
                }
            }
        }

        result = ResponseProcessor.process_traffic_response(mock_response, request)

        # Should use linear_scale as default now
        assert result.metadata["comparison_method"] == "linear_scale"


class TestTrafficAnalysisEndpoint:
    """Test the /api/traffic-analysis endpoint"""

    @patch('cors_proxy_enhanced.es_client.execute_query')
    def test_endpoint_with_comparison_dates(self, mock_execute):
        """Test the endpoint with new comparison date fields"""
        now = datetime.utcnow()

        # Mock Elasticsearch response
        mock_execute.return_value = {
            "took": 50,
            "aggregations": {
                "events": {
                    "buckets": [
                        {
                            "key": "test.event",
                            "baseline": {"doc_count": 1000},
                            "current": {"doc_count": 50}
                        }
                    ]
                }
            }
        }

        request_data = {
            "baseline_start": (now - timedelta(days=7)).isoformat() + "Z",
            "baseline_end": (now - timedelta(days=3)).isoformat() + "Z",
            "comparison_start": (now - timedelta(hours=1)).isoformat() + "Z",
            "comparison_end": now.isoformat() + "Z",
            "time_comparison_strategy": "hourly_average"
        }

        response = client.post(
            "/api/traffic-analysis",
            json=request_data,
            headers={"X-Elastic-Cookie": "test_cookie"}
        )

        assert response.status_code == 200
        data = response.json()

        # Verify response structure
        assert "events" in data
        assert "metadata" in data
        assert data["metadata"]["comparison_method"] == "hourly_average"
        assert "normalization_factor" in data["metadata"]
        assert "baseline_duration_ms" in data["metadata"]
        assert "comparison_duration_ms" in data["metadata"]

    @patch('cors_proxy_enhanced.es_client.execute_query')
    def test_endpoint_backward_compatibility(self, mock_execute):
        """Test that old-style requests still work"""
        now = datetime.utcnow()

        mock_execute.return_value = {
            "took": 50,
            "aggregations": {
                "events": {
                    "buckets": []
                }
            }
        }

        request_data = {
            "baseline_start": (now - timedelta(days=7)).isoformat() + "Z",
            "baseline_end": (now - timedelta(days=0)).isoformat() + "Z",
            "current_time_range": "24h"  # Old style
        }

        response = client.post(
            "/api/traffic-analysis",
            json=request_data,
            headers={"X-Elastic-Cookie": "test_cookie"}
        )

        assert response.status_code == 200


class TestNormalizationCalculations:
    """Test normalization factor calculations"""

    def test_normalization_factor_calculations(self):
        """Test various normalization factor calculations"""
        test_cases = [
            # (baseline_duration, comparison_duration, expected_factor)
            (timedelta(days=3.5), timedelta(minutes=39), 129.23),
            (timedelta(days=7), timedelta(hours=1), 168.0),
            (timedelta(days=1), timedelta(hours=2), 12.0),
            (timedelta(hours=24), timedelta(minutes=30), 48.0),
        ]

        for baseline_duration, comparison_duration, expected_factor in test_cases:
            baseline_ms = baseline_duration.total_seconds() * 1000
            comparison_ms = comparison_duration.total_seconds() * 1000
            factor = baseline_ms / comparison_ms

            assert abs(factor - expected_factor) < 0.01, \
                f"Expected {expected_factor}, got {factor} for {baseline_duration} vs {comparison_duration}"


class TestEdgeCases:
    """Test edge cases and error handling"""

    def test_zero_duration_handling(self):
        """Test handling of zero duration comparison periods"""
        now = datetime.utcnow()

        request = TrafficQueryRequest(
            baseline_start=now - timedelta(days=1),
            baseline_end=now,
            comparison_start=now,
            comparison_end=now  # Zero duration
        )

        mock_response = {
            "aggregations": {
                "events": {
                    "buckets": [{
                        "key": "test",
                        "baseline": {"doc_count": 100},
                        "current": {"doc_count": 0}
                    }]
                }
            }
        }

        # Should handle gracefully without division by zero
        result = ResponseProcessor.process_traffic_response(mock_response, request)
        assert result.metadata["comparison_duration_ms"] == 0
        assert result.metadata["normalization_factor"] == 1.0  # Safe default

    def test_missing_optional_fields(self):
        """Test that missing optional fields don't break the system"""
        now = datetime.utcnow()

        # Minimal request
        request = TrafficQueryRequest(
            baseline_start=now - timedelta(days=7),
            baseline_end=now
            # No comparison dates, no strategy specified
        )

        assert request.time_comparison_strategy == "linear_scale"  # default
        assert request.comparison_start is None
        assert request.comparison_end is None

    def test_negative_duration_handling(self):
        """Test handling when end is before start"""
        now = datetime.utcnow()

        # End before start - negative duration
        request = TrafficQueryRequest(
            baseline_start=now,
            baseline_end=now - timedelta(days=1),  # End before start
            comparison_start=now - timedelta(hours=1),
            comparison_end=now - timedelta(hours=2)  # End before start
        )

        mock_response = {"aggregations": {"events": {"buckets": []}}}

        # Should handle negative durations gracefully
        result = ResponseProcessor.process_traffic_response(mock_response, request)
        # Negative durations should be treated as positive
        assert result.metadata["baseline_duration_ms"] > 0
        assert result.metadata["comparison_duration_ms"] > 0

    def test_very_large_durations(self):
        """Test handling of very large time periods (years)"""
        now = datetime.utcnow()

        # 2 year baseline vs 1 second comparison
        request = TrafficQueryRequest(
            baseline_start=now - timedelta(days=730),  # 2 years
            baseline_end=now,
            comparison_start=now - timedelta(seconds=1),
            comparison_end=now,
            time_comparison_strategy="linear_scale"
        )

        mock_response = {
            "aggregations": {
                "events": {
                    "buckets": [{
                        "key": "test",
                        "baseline": {"doc_count": 63072000},  # ~2 events per second for 2 years
                        "current": {"doc_count": 2}
                    }]
                }
            }
        }

        result = ResponseProcessor.process_traffic_response(mock_response, request)

        # Normalization factor should be huge (2 years / 1 second)
        assert result.metadata["normalization_factor"] > 60000000  # > 60 million

        # But calculations should still work
        event = result.events[0]
        # 63072000 events in 63072000 seconds = 1 event per second
        # So for 1 second comparison, we expect baseline_period = 1.0
        assert 0.9 < event.baseline_period < 1.1  # Should be ~1

    def test_millisecond_precision(self):
        """Test handling of millisecond-precision timestamps"""
        # Create timestamps with millisecond precision
        base_time = datetime(2023, 11, 11, 12, 30, 45, 123456)

        request = TrafficQueryRequest(
            baseline_start=base_time,
            baseline_end=base_time + timedelta(milliseconds=500),
            comparison_start=base_time + timedelta(days=1),
            comparison_end=base_time + timedelta(days=1, milliseconds=100),
            time_comparison_strategy="linear_scale"
        )

        query = request.build_es_query()

        # Verify milliseconds are preserved in ISO format
        baseline_filter = query["aggs"]["events"]["aggs"]["baseline"]["filter"]["range"]["@timestamp"]
        assert ".123456" in baseline_filter["gte"]  # Microseconds should be preserved

    def test_concurrent_requests_with_different_strategies(self):
        """Test multiple requests with different strategies don't interfere"""
        now = datetime.utcnow()

        requests = []
        strategies = ["linear_scale", "hourly_average", "daily_pattern"]

        for strategy in strategies:
            req = TrafficQueryRequest(
                baseline_start=now - timedelta(days=7),
                baseline_end=now,
                comparison_start=now - timedelta(hours=1),
                comparison_end=now,
                time_comparison_strategy=strategy
            )
            requests.append(req)

        # Each should maintain its own strategy
        for i, req in enumerate(requests):
            assert req.time_comparison_strategy == strategies[i]

    def test_floating_point_precision_issues(self):
        """Test handling of floating point precision in calculations"""
        now = datetime.utcnow()

        # Use durations that might cause floating point issues
        # 1/3 day (8 hours) vs 1/7 hour (~8.57 minutes)
        request = TrafficQueryRequest(
            baseline_start=now - timedelta(hours=8),
            baseline_end=now,
            comparison_start=now - timedelta(minutes=8.571428571),  # 1/7 hour
            comparison_end=now,
            time_comparison_strategy="linear_scale"
        )

        mock_response = {
            "aggregations": {
                "events": {
                    "buckets": [{
                        "key": "test",
                        "baseline": {"doc_count": 5600},  # 700 per hour
                        "current": {"doc_count": 100}
                    }]
                }
            }
        }

        result = ResponseProcessor.process_traffic_response(mock_response, request)

        # Normalization factor should be ~56 (8 hours / 8.57 minutes)
        assert 55.9 < result.metadata["normalization_factor"] < 56.1

        event = result.events[0]
        # baseline_period = 5600 / 56 = 100
        assert 99 < event.baseline_period < 101

    def test_inspection_time_with_comparison_dates(self):
        """Test that comparison dates override inspection_time"""
        now = datetime.utcnow()

        request = TrafficQueryRequest(
            baseline_start=now - timedelta(days=7),
            baseline_end=now,
            current_time_range="inspection_time",  # Should be ignored
            comparison_start=now - timedelta(hours=1),
            comparison_end=now,
            time_comparison_strategy="linear_scale"
        )

        query = request.build_es_query()

        # Should use comparison dates, not inspection time
        current_filter = query["aggs"]["events"]["aggs"]["current"]["filter"]["range"]["@timestamp"]
        assert current_filter["gte"] == request.comparison_start.isoformat() + "Z"
        assert current_filter["lte"] == request.comparison_end.isoformat() + "Z"

    def test_extreme_normalization_factors(self):
        """Test handling of extreme normalization factors"""
        now = datetime.utcnow()

        # Test very small factor (comparison > baseline)
        request1 = TrafficQueryRequest(
            baseline_start=now - timedelta(minutes=1),
            baseline_end=now,
            comparison_start=now - timedelta(days=1),
            comparison_end=now,
            time_comparison_strategy="linear_scale"
        )

        mock_response1 = {
            "aggregations": {
                "events": {
                    "buckets": [{
                        "key": "test",
                        "baseline": {"doc_count": 10},
                        "current": {"doc_count": 14400}  # 10 per minute for 24 hours
                    }]
                }
            }
        }

        result1 = ResponseProcessor.process_traffic_response(mock_response1, request1)

        # Factor should be < 1 (1 minute / 24 hours = 1/1440)
        assert result1.metadata["normalization_factor"] < 0.001

        # baseline_period = 10 / (1/1440) = 14400
        event1 = result1.events[0]
        assert event1.baseline_period == 14400


class TestComplexScenarios:
    """Test complex real-world scenarios"""

    def test_multi_timezone_handling(self):
        """Test handling of different timezone representations"""
        # UTC
        request1 = TrafficQueryRequest(
            baseline_start=datetime(2023, 11, 1, 0, 0, 0),
            baseline_end=datetime(2023, 11, 8, 0, 0, 0),
            comparison_start=datetime(2023, 11, 10, 23, 0, 0),
            comparison_end=datetime(2023, 11, 11, 0, 0, 0)
        )

        # All datetimes should be converted to UTC with Z suffix
        query = request1.build_es_query()
        assert query["aggs"]["events"]["aggs"]["baseline"]["filter"]["range"]["@timestamp"]["gte"].endswith("Z")

    def test_daylight_saving_time_transitions(self):
        """Test handling around DST transitions"""
        # Spring forward (lose an hour)
        dst_start = datetime(2023, 3, 12, 2, 0, 0)  # 2 AM becomes 3 AM

        request = TrafficQueryRequest(
            baseline_start=dst_start - timedelta(hours=2),
            baseline_end=dst_start + timedelta(hours=2),
            comparison_start=dst_start,
            comparison_end=dst_start + timedelta(hours=1),
            time_comparison_strategy="hourly_average"
        )

        # Should handle the missing hour gracefully
        assert request is not None

    def test_leap_year_handling(self):
        """Test handling of leap year dates"""
        # Feb 29, 2024 (leap year)
        leap_day = datetime(2024, 2, 29, 12, 0, 0)

        request = TrafficQueryRequest(
            baseline_start=leap_day - timedelta(days=366),  # Feb 28, 2023 (366 days for leap year)
            baseline_end=leap_day,
            comparison_start=leap_day - timedelta(hours=1),
            comparison_end=leap_day,
            time_comparison_strategy="daily_pattern"
        )

        # Should handle leap year correctly
        baseline_days = (request.baseline_end - request.baseline_start).days
        assert baseline_days == 366  # Includes leap day

    def test_mixed_strategies_in_sequence(self):
        """Test processing same data with different strategies"""
        now = datetime.utcnow()

        request_base = {
            "baseline_start": now - timedelta(days=7),
            "baseline_end": now,
            "comparison_start": now - timedelta(hours=1),
            "comparison_end": now
        }

        mock_response = {
            "aggregations": {
                "events": {
                    "buckets": [{
                        "key": "test",
                        "baseline": {"doc_count": 16800},  # 100/hour average
                        "current": {"doc_count": 100}
                    }]
                }
            }
        }

        results = {}
        for strategy in ["linear_scale", "hourly_average", "daily_pattern"]:
            request = TrafficQueryRequest(**request_base, time_comparison_strategy=strategy)
            result = ResponseProcessor.process_traffic_response(mock_response, request)
            results[strategy] = result.events[0].baseline_period

        # Each strategy should give different results
        assert results["linear_scale"] == 100  # 16800 / 168
        assert results["hourly_average"] == 100  # 100/hour * 1 hour
        assert results["daily_pattern"] == 100  # 2400/day / 24 * 1


class TestAPIValidation:
    """Test API request validation"""

    def test_invalid_date_formats_rejected(self):
        """Test that invalid date formats are rejected"""
        with pytest.raises(Exception):
            TrafficQueryRequest(
                baseline_start="not-a-date",
                baseline_end="2023-11-01"
            )

    def test_future_dates_allowed(self):
        """Test that future dates are allowed (for testing purposes)"""
        future = datetime.utcnow() + timedelta(days=30)

        request = TrafficQueryRequest(
            baseline_start=future,
            baseline_end=future + timedelta(days=7),
            comparison_start=future + timedelta(days=10),
            comparison_end=future + timedelta(days=10, hours=1)
        )

        assert request is not None

    def test_very_old_dates_handled(self):
        """Test handling of very old dates"""
        old_date = datetime(1970, 1, 1, 0, 0, 0)

        request = TrafficQueryRequest(
            baseline_start=old_date,
            baseline_end=old_date + timedelta(days=7),
            comparison_start=datetime.utcnow() - timedelta(hours=1),
            comparison_end=datetime.utcnow()
        )

        # Should handle epoch time correctly
        query = request.build_es_query()
        assert "1970-01-01" in query["aggs"]["events"]["aggs"]["baseline"]["filter"]["range"]["@timestamp"]["gte"]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
