#!/usr/bin/env python3
"""
Comprehensive tests for all refactored Python modules
Tests traffic_processor.py, score_calculator.py, html_generator.py, and process_data.py
"""

import pytest
import sys
import os
import json
import tempfile
from pathlib import Path
from datetime import datetime, timedelta
from unittest.mock import patch, mock_open, MagicMock

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from data.processors import TrafficProcessor, ScoreCalculator, HTMLGenerator
# from data.process_data import DataProcessor  # Not implemented - using process_data.py as script


class TestTrafficProcessor:
    """Test the TrafficProcessor class"""

    def setup_method(self):
        """Set up test fixtures"""
        self.config = {
            'baselineStart': '2025-01-01',
            'baselineEnd': '2025-01-09',
            'currentTimeRange': 'now-12h',
            'mediumVolumeThreshold': 100,
            'highVolumeThreshold': 1000
        }
        self.processor = TrafficProcessor(self.config)

    def test_init(self):
        """Test TrafficProcessor initialization"""
        assert self.processor.config == self.config
        assert self.processor.medium_threshold == 100

    def test_process_response_with_error(self):
        """Test processing response with error"""
        response = {
            'error': {
                'type': 'search_phase_execution_exception',
                'reason': 'all shards failed'
            }
        }

        with pytest.raises(ValueError) as exc_info:
            self.processor.process_response(response)
        assert 'Elasticsearch error' in str(exc_info.value)

    def test_process_response_invalid_structure(self):
        """Test processing response with invalid structure"""
        response = {'data': 'invalid'}
        with pytest.raises(ValueError, match="Invalid response structure"):
            self.processor.process_response(response)

    def test_process_response_success(self):
        """Test successful response processing"""
        response = {
            'aggregations': {
                'events': {
                    'buckets': [
                        {
                            'key': 'pandc.vnext.recommendations.feed.test1',
                            'doc_count': 10500,  # Total doc count
                            'baseline': {'doc_count': 10000},
                            'current': {'doc_count': 500}
                        },
                        {
                            'key': 'pandc.vnext.recommendations.feed.test2',
                            'doc_count': 60,  # Total doc count
                            'baseline': {'doc_count': 50},  # Below threshold
                            'current': {'doc_count': 10}
                        }
                    ]
                }
            }
        }

        results = self.processor.process_response(response)
        assert len(results) == 1  # Only one above threshold
        assert results[0]['event_id'] == 'pandc.vnext.recommendations.feed.test1'
        assert results[0]['display_name'] == 'test1'
        assert results[0]['current'] == 500
        assert results[0]['daily_avg'] == 1250  # 10000/8

    def test_parse_time_range_hours(self):
        """Test time range parsing"""
        assert self.processor._parse_time_range_hours('now-6h') == 6
        assert self.processor._parse_time_range_hours('now-12h') == 12
        assert self.processor._parse_time_range_hours('now-24h') == 24
        assert self.processor._parse_time_range_hours('now-3d') == 72
        assert self.processor._parse_time_range_hours('-3h-6h') == 3
        assert self.processor._parse_time_range_hours('-1d-2d') == 24
        assert self.processor._parse_time_range_hours('inspection_time') == 16
        assert self.processor._parse_time_range_hours('invalid') == 12  # default

    def test_calculate_baseline_days(self):
        """Test baseline days calculation"""
        assert self.processor._calculate_baseline_days() == 8


class TestScoreCalculator:
    """Test the ScoreCalculator class"""

    def setup_method(self):
        """Set up test fixtures"""
        self.config = {
            'highVolumeThreshold': 1000,
            'criticalThreshold': -80,
            'warningThreshold': -50
        }
        self.calculator = ScoreCalculator(self.config)

    def test_init(self):
        """Test ScoreCalculator initialization"""
        assert self.calculator.high_volume_threshold == 1000
        assert self.calculator.critical_threshold == -80
        assert self.calculator.warning_threshold == -50

    def test_calculate_score_high_volume(self):
        """Test score calculation for high volume events"""
        # Test > 50% drop
        event = {
            'current': 400,
            'baseline_period': 1000,
            'daily_avg': 2000
        }
        score = self.calculator._calculate_score(event)
        assert score == -60  # (1 - 0.4) * -100

        # Test < 50% drop
        event = {
            'current': 800,
            'baseline_period': 1000,
            'daily_avg': 2000
        }
        score = self.calculator._calculate_score(event)
        assert score == -20  # (0.8 - 1) * 100

        # Test increase
        event = {
            'current': 1500,
            'baseline_period': 1000,
            'daily_avg': 2000
        }
        score = self.calculator._calculate_score(event)
        assert score == 50  # (1.5 - 1) * 100

    def test_calculate_score_medium_volume(self):
        """Test score calculation for medium volume events"""
        # Test > 70% drop
        event = {
            'current': 20,
            'baseline_period': 100,
            'daily_avg': 500
        }
        score = self.calculator._calculate_score(event)
        assert score == -80  # (1 - 0.2) * -100

        # Test < 70% drop
        event = {
            'current': 60,
            'baseline_period': 100,
            'daily_avg': 500
        }
        score = self.calculator._calculate_score(event)
        assert score == -40  # (0.6 - 1) * 100

    def test_determine_status(self):
        """Test status determination"""
        assert self.calculator._determine_status(-90) == "CRITICAL"
        assert self.calculator._determine_status(-60) == "WARNING"
        assert self.calculator._determine_status(-10) == "NORMAL"
        assert self.calculator._determine_status(10) == "INCREASED"

    def test_calculate_scores(self):
        """Test full score calculation pipeline"""
        events = [
            {
                'event_id': 'pandc.vnext.recommendations.feed.test1',
                'display_name': 'test1',
                'current': 100,
                'baseline_period': 1000,
                'baseline_12h': 1000,
                'baseline_count': 16000,
                'baseline_days': 8,
                'current_hours': 12,
                'daily_avg': 2000
            },
            {
                'event_id': 'pandc.vnext.recommendations.feed.test2',
                'display_name': 'test2',
                'current': 2000,
                'baseline_period': 1000,
                'baseline_12h': 1000,
                'baseline_count': 16000,
                'baseline_days': 8,
                'current_hours': 12,
                'daily_avg': 2000
            }
        ]

        scored = self.calculator.calculate_scores(events)
        assert len(scored) == 2
        assert scored[0]['score'] == -90  # Worst first
        assert scored[0]['status'] == 'CRITICAL'
        assert scored[1]['score'] == 100
        assert scored[1]['status'] == 'INCREASED'

    def test_get_summary_stats(self):
        """Test summary statistics"""
        events = [
            {'status': 'CRITICAL'},
            {'status': 'CRITICAL'},
            {'status': 'WARNING'},
            {'status': 'NORMAL'},
            {'status': 'INCREASED'}
        ]

        stats = self.calculator.get_summary_stats(events)
        assert stats['critical'] == 2
        assert stats['warning'] == 1
        assert stats['normal'] == 1
        assert stats['increased'] == 1
        assert stats['total'] == 5


class TestHTMLGenerator:
    """Test the HTMLGenerator class"""

    def setup_method(self):
        """Set up test fixtures"""
        self.generator = HTMLGenerator('index.html')

    def test_init(self):
        """Test HTMLGenerator initialization"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False) as f:
            f.write('<html>{{CRITICAL_COUNT}}</html>')
            template_path = f.name

        generator = HTMLGenerator(template_path)
        assert generator.template_path == template_path

        # Cleanup
        os.unlink(template_path)

    def test_load_template(self):
        """Test template loading"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False) as f:
            f.write('<html>Test Template</html>')
            template_path = f.name

        generator = HTMLGenerator(template_path)
        content = generator._load_template()
        assert content == '<html>Test Template</html>'

        # Cleanup
        os.unlink(template_path)

    def test_load_template_not_found(self):
        """Test template loading with missing file"""
        generator = HTMLGenerator('/nonexistent/template.html')
        with pytest.raises(FileNotFoundError):
            generator._load_template()

    def test_generate(self):
        """Test HTML generation"""
        # Create template
        template_content = """
<html>
<div>Critical: {{CRITICAL_COUNT}}</div>
<div>Warning: {{WARNING_COUNT}}</div>
<div>Normal: {{NORMAL_COUNT}}</div>
<div>Increased: {{INCREASED_COUNT}}</div>
<div>Time: {{TIMESTAMP}}</div>
<tbody>{{TABLE_ROWS}}</tbody>
</html>
"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False) as f:
            f.write(template_content)
            template_path = f.name

        generator = HTMLGenerator(template_path)

        events = [
            {
                'event_id': 'test.event.1',
                'status': 'CRITICAL',
                'score': -85,
                'current': 100,
                'baseline_period': 1000,
                'daily_avg': 2000
            }
        ]

        stats = {
            'critical': 1,
            'warning': 0,
            'normal': 0,
            'increased': 0
        }

        html = generator.generate(events, stats)

        assert '<div>Critical: 1</div>' in html
        assert '<div>Warning: 0</div>' in html
        assert 'test.event.1' in html
        assert 'CRITICAL' in html
        assert '-85%' in html
        assert 'Lost ~900 impressions' in html

        # Cleanup
        os.unlink(template_path)

    def test_build_kibana_url(self):
        """Test Kibana URL building"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False) as f:
            f.write('<html></html>')
            template_path = f.name

        generator = HTMLGenerator(template_path)
        url = generator._build_kibana_url('test.event.id')

        assert 'https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243' in url
        assert '/app/discover#/' in url
        assert 'test.event.id' in url

        # Cleanup
        os.unlink(template_path)


class TestProcessDataIntegration:
    """Test the main process_data.py integration"""

    def test_full_pipeline(self):
        """Test the complete data processing pipeline"""
        # Create test data
        response_data = {
            'aggregations': {
                'events': {
                    'buckets': [
                        {
                            'key': 'pandc.vnext.recommendations.feed.critical_event',
                            'baseline': {'doc_count': 10000},
                            'current': {'doc_count': 100}
                        },
                        {
                            'key': 'pandc.vnext.recommendations.feed.normal_event',
                            'baseline': {'doc_count': 8000},
                            'current': {'doc_count': 950}
                        }
                    ]
                }
            }
        }

        # Create temporary files
        with tempfile.TemporaryDirectory() as tmpdir:
            # Response file
            response_file = os.path.join(tmpdir, 'response.json')
            with open(response_file, 'w') as f:
                json.dump(response_data, f)

            # Template file
            template_file = os.path.join(tmpdir, 'template.html')
            with open(template_file, 'w') as f:
                f.write("""
<html>
<div>Critical: {{CRITICAL_COUNT}}</div>
<div>Table: {{TABLE_ROWS}}</div>
<div>Time: {{TIMESTAMP}}</div>
</html>
""")

            # Output file
            output_file = os.path.join(tmpdir, 'output.html')

            # Run process_data.py
            import subprocess
            result = subprocess.run([
                sys.executable,
                'src/data/process_data.py',
                '--response', response_file,
                '--output-template', template_file,
                '--output', output_file
            ], capture_output=True, text=True, env={
                **os.environ,
                'BASELINE_START': '2025-06-01',
                'BASELINE_END': '2025-06-09',
                'CURRENT_TIME_RANGE': 'now-12h',
                'HIGH_VOLUME_THRESHOLD': '1000',
                'MEDIUM_VOLUME_THRESHOLD': '100'
            })

            # Check success
            assert result.returncode == 0, f"process_data.py failed: {result.stderr}"

            # Check output
            assert os.path.exists(output_file)
            with open(output_file, 'r') as f:
                html_content = f.read()

            assert '<div>Critical: 1</div>' in html_content
            assert 'critical_event' in html_content


# TestDataProcessor removed - process_data.py is used as a script, not a class


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
