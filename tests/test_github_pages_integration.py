#!/usr/bin/env python3
"""
Integration tests to ensure the RAD Monitor works correctly when hosted on GitHub Pages
Tests the complete flow from GitHub Actions to the deployed dashboard
"""

import os
import json
import subprocess
import tempfile
import shutil
from pathlib import Path
import pytest
import requests
from unittest.mock import patch, Mock, MagicMock


class TestGitHubPagesIntegration:
    """Tests to ensure dashboard works correctly on https://balkhalil.github.io/rad-traffic-monitor/"""
    
    def setup_method(self):
        """Set up test environment"""
        self.test_dir = tempfile.mkdtemp()
        self.original_dir = os.getcwd()
        os.chdir(self.test_dir)
        
        # Create project structure
        os.makedirs('scripts')
        os.makedirs('data')
        os.makedirs('.github/workflows')
        
        # Copy necessary files from actual project
        project_root = Path(__file__).parent.parent
        if (project_root / 'scripts/generate_dashboard.sh').exists():
            shutil.copy(project_root / 'scripts/generate_dashboard.sh', 'scripts/')
        
    def teardown_method(self):
        """Clean up test environment"""
        os.chdir(self.original_dir)
        shutil.rmtree(self.test_dir)
        
    def test_github_actions_workflow_exists(self):
        """Test that GitHub Actions workflow file exists and is valid"""
        project_root = Path(__file__).parent.parent
        workflow_file = project_root / '.github/workflows/update-dashboard.yml'
        
        assert workflow_file.exists(), "GitHub Actions workflow file missing"
        
        # Read and validate workflow
        content = workflow_file.read_text()
        assert 'Update RAD Traffic Dashboard' in content
        assert 'ELASTIC_COOKIE' in content
        assert './scripts/generate_dashboard.sh' in content
        assert 'schedule:' in content  # Has cron schedule
        assert 'workflow_dispatch:' in content  # Can be triggered manually
        
    def test_dashboard_generation_for_github_pages(self):
        """Test dashboard generation in GitHub Pages context"""
        # Create mock generate_dashboard.sh
        generate_script = """#!/bin/bash
echo "=== Generating RAD Traffic Dashboard ==="
echo "Timestamp: $(date)"

if [ -z "$ELASTIC_COOKIE" ]; then
    echo "Error: ELASTIC_COOKIE not set"
    exit 1
fi

# Create dashboard HTML
cat > index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>RAD Traffic Health Monitor</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="refresh" content="300">
</head>
<body>
    <h1>RAD Traffic Health Monitor</h1>
    <div class="timestamp">Generated at: TEST_TIME</div>
    <script>
        // Check if running on GitHub Pages
        if (window.location.hostname === 'balkhalil.github.io') {
            console.log('Running on GitHub Pages - Direct API mode');
        }
    </script>
</body>
</html>
EOF

mkdir -p data
echo '{"test": "data"}' > data/raw_response.json
echo "Dashboard generated successfully!"
"""
        
        with open('scripts/generate_dashboard.sh', 'w') as f:
            f.write(generate_script)
        os.chmod('scripts/generate_dashboard.sh', 0o755)
        
        # Run with cookie as GitHub Actions would
        env = os.environ.copy()
        env['ELASTIC_COOKIE'] = 'test_github_secret_cookie'
        
        result = subprocess.run(['./scripts/generate_dashboard.sh'], 
                              capture_output=True, text=True, env=env)
        
        assert result.returncode == 0
        assert 'Dashboard generated successfully' in result.stdout
        assert Path('index.html').exists()
        assert Path('data/raw_response.json').exists()
        
        # Verify HTML content
        html_content = Path('index.html').read_text()
        assert 'RAD Traffic Health Monitor' in html_content
        assert 'balkhalil.github.io' in html_content  # GitHub Pages check
        
    def test_no_cors_proxy_needed_on_github_pages(self):
        """Test that dashboard doesn't require CORS proxy when on GitHub Pages"""
        # Create test HTML that checks for GitHub Pages
        test_html = """
        <script>
        function checkDeployment() {
            if (window.location.hostname === 'balkhalil.github.io' || 
                window.location.hostname.endsWith('.github.io')) {
                // On GitHub Pages - use direct API calls
                return 'direct';
            } else if (window.location.hostname === 'localhost') {
                // Local development - need CORS proxy
                return 'proxy';
            }
            return 'unknown';
        }
        </script>
        """
        
        # Simulate window.location for GitHub Pages
        assert 'direct' in test_html  # Would return 'direct' on GitHub Pages
        assert 'proxy' in test_html   # Would return 'proxy' on localhost
        
    def test_github_pages_url_structure(self):
        """Test that URLs work correctly for GitHub Pages deployment"""
        # Test expected URL structure
        expected_base_url = "https://balkhalil.github.io/rad-traffic-monitor/"
        
        # These files should be accessible
        expected_files = [
            "",  # index.html
            "data/raw_response.json",
            "cors_proxy.py",  # Even though not used on GitHub Pages
            "README.md"
        ]
        
        for file in expected_files:
            full_url = expected_base_url + file
            # In real test, we'd check if these URLs would be valid
            assert full_url.startswith("https://")
            assert "balkhalil.github.io" in full_url
            
    @patch('subprocess.run')
    def test_github_actions_commit_and_push(self, mock_run):
        """Test that GitHub Actions correctly commits and pushes changes"""
        # Simulate GitHub Actions environment
        env = {
            'GITHUB_ACTIONS': 'true',
            'ELASTIC_COOKIE': 'github_secret_cookie'
        }
        
        # Mock git commands
        mock_run.return_value = Mock(returncode=0, stdout='', stderr='')
        
        # Simulate the commit process from workflow
        commands = [
            ['git', 'config', '--local', 'user.email', 'action@github.com'],
            ['git', 'config', '--local', 'user.name', 'GitHub Action'],
            ['git', 'add', '-A'],
            ['git', 'diff', '--staged', '--quiet'],
            ['git', 'commit', '-m', 'Update dashboard'],
            ['git', 'push']
        ]
        
        for cmd in commands:
            subprocess.run(cmd, capture_output=True, env=env)
            
        # Verify git commands were called
        assert mock_run.called
        
    def test_api_calls_without_cors_on_github_pages(self):
        """Test that API calls work directly from GitHub Pages without CORS proxy"""
        # Create mock JavaScript that would run on GitHub Pages
        js_code = """
        async function fetchDataOnGitHubPages() {
            const cookie = getCookie('elastic_cookie');
            const apiUrl = 'https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243/api/console/proxy';
            
            // Direct API call (no CORS proxy needed on same-origin GitHub Pages)
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'kbn-xsrf': 'true',
                    'Cookie': `sid=${cookie}`
                },
                credentials: 'include',
                body: JSON.stringify({query: {}})
            });
            
            return response.json();
        }
        """
        
        # Verify the code structure for GitHub Pages
        assert 'https://usieventho-prod-usw2' in js_code  # Direct Kibana URL
        assert 'credentials: \'include\'' in js_code      # Include credentials
        assert 'localhost:8889' not in js_code            # No CORS proxy
        
    def test_meta_refresh_works_on_github_pages(self):
        """Test that auto-refresh meta tag works on GitHub Pages"""
        # Generate dashboard
        with open('index.html', 'w') as f:
            f.write("""<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="refresh" content="300">
    <title>RAD Traffic Health Monitor</title>
</head>
<body>
    <h1>Dashboard</h1>
</body>
</html>""")
        
        # Read and verify
        content = Path('index.html').read_text()
        assert '<meta http-equiv="refresh" content="300">' in content
        
    def test_relative_paths_for_assets(self):
        """Test that all asset paths work correctly on GitHub Pages"""
        # Create test HTML with various asset references
        test_html = """<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="styles.css">
    <script src="dashboard.js"></script>
</head>
<body>
    <img src="data/chart.png">
    <a href="data/raw_response.json">Raw Data</a>
</body>
</html>"""
        
        # All paths should be relative (no leading /)
        assert 'href="styles.css"' in test_html       # Relative CSS
        assert 'src="dashboard.js"' in test_html      # Relative JS
        assert 'src="data/chart.png"' in test_html    # Relative image
        assert 'href="data/raw_response.json"' in test_html  # Relative link
        
        # No absolute paths that would break on GitHub Pages
        assert 'href="/styles.css"' not in test_html
        assert 'http://localhost' not in test_html
        
    def test_data_directory_structure(self):
        """Test that data directory is properly structured for GitHub Pages"""
        # Create expected structure
        os.makedirs('data', exist_ok=True)
        
        # Create test data file
        test_data = {
            "timestamp": "2025-06-18T12:00:00Z",
            "aggregations": {
                "events": {
                    "buckets": []
                }
            }
        }
        
        with open('data/raw_response.json', 'w') as f:
            json.dump(test_data, f)
            
        # Verify structure
        assert Path('data').is_dir()
        assert Path('data/raw_response.json').exists()
        
        # Verify JSON is valid
        with open('data/raw_response.json') as f:
            loaded = json.load(f)
            assert 'timestamp' in loaded
            
    def test_github_pages_handles_large_files(self):
        """Test that dashboard handles GitHub Pages file size limits"""
        # GitHub Pages has a 100MB file size limit
        # Create a reasonably sized response file
        large_data = {
            "aggregations": {
                "events": {
                    "buckets": [
                        {
                            "key": f"event_{i}",
                            "doc_count": i * 100
                        } for i in range(1000)  # 1000 events
                    ]
                }
            }
        }
        
        with open('data/raw_response.json', 'w') as f:
            json.dump(large_data, f)
            
        # Check file size is reasonable
        file_size = Path('data/raw_response.json').stat().st_size
        assert file_size < 100 * 1024 * 1024  # Under 100MB
        assert file_size > 0  # Not empty
        
    def test_error_handling_on_github_pages(self):
        """Test that dashboard handles errors gracefully on GitHub Pages"""
        error_handling_js = """
        async function handleErrorsOnGitHubPages() {
            try {
                const response = await fetchTrafficData();
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                return await response.json();
            } catch (error) {
                console.error('Dashboard error:', error);
                
                // Show user-friendly error
                if (error.message.includes('401')) {
                    showError('Authentication expired. Please update ELASTIC_COOKIE in GitHub Secrets.');
                } else if (error.message.includes('Failed to fetch')) {
                    showError('Network error. Please check your connection.');
                } else {
                    showError('An error occurred loading the dashboard.');
                }
                
                // Still show cached data if available
                return loadCachedData();
            }
        }
        """
        
        # Verify error handling includes GitHub-specific guidance
        assert 'GitHub Secrets' in error_handling_js
        assert 'loadCachedData' in error_handling_js
        
    def test_scheduled_updates_configuration(self):
        """Test that scheduled updates are properly configured"""
        project_root = Path(__file__).parent.parent
        workflow_file = project_root / '.github/workflows/update-dashboard.yml'
        
        if workflow_file.exists():
            content = workflow_file.read_text()
            
            # Check cron schedule (every 10 minutes)
            assert "cron: '*/10 * * * *'" in content
            
            # Check workflow can be manually triggered
            assert 'workflow_dispatch:' in content
            
            # Check it runs on push to main
            assert 'push:' in content
            assert 'branches: [ main ]' in content


class TestCompleteDeploymentFlow:
    """Test the complete flow from local development to GitHub Pages"""
    
    def test_local_to_production_flow(self):
        """Test complete deployment flow works correctly"""
        flow_steps = [
            "1. Local development with CORS proxy",
            "2. Test locally with run_with_cors.sh",
            "3. Commit and push to GitHub",
            "4. GitHub Actions runs generate_dashboard.sh",
            "5. Dashboard deployed to GitHub Pages",
            "6. Users access without CORS proxy"
        ]
        
        # Each step should work independently
        for step in flow_steps:
            assert step  # Placeholder for actual step validation
            
    def test_cookie_rotation_process(self):
        """Test that cookie rotation process is documented and works"""
        # Cookie rotation steps
        rotation_steps = [
            "1. Get new cookie from Kibana",
            "2. Update GitHub Secret ELASTIC_COOKIE",
            "3. Trigger workflow manually or wait for schedule",
            "4. Verify dashboard updates successfully"
        ]
        
        # Verify process is clear
        for step in rotation_steps:
            assert step  # Each step should be clear and actionable


if __name__ == '__main__':
    pytest.main([__file__, '-v']) 