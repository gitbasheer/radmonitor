#!/usr/bin/env python3
"""
Production Validation Script Test Suite
Tests for security, performance, and functionality
"""

import os
import sys
import pytest
import json
import tempfile
import asyncio
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
import socket
import ssl

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from bin.validate_connections_production import (
    Validator, ValidationResult, Colors
)


class TestValidationResult:
    """Test ValidationResult class"""
    
    def test_result_tracking(self):
        """Test result tracking functionality"""
        result = ValidationResult()
        
        # Test pass
        result.add_pass("Test 1", "Success message", duration=0.5)
        assert result.passed == 1
        assert len(result.details) == 1
        assert result.details[0]["status"] == "passed"
        assert result.details[0]["duration"] == 0.5
        
        # Test fail
        result.add_fail("Test 2", "Failure message", severity="critical")
        assert result.failed == 1
        assert result.details[1]["severity"] == "critical"
        
        # Test warning
        result.add_warning("Test 3", "Warning message")
        assert result.warnings == 1
        
        # Test security issue
        result.add_security_issue("Test 4", "Security problem", severity="high")
        assert result.security_issues == 1
        
        # Test performance issue
        result.add_performance_issue("Test 5", "Slow operation")
        assert result.performance_issues == 1
    
    def test_json_export(self):
        """Test JSON export functionality"""
        result = ValidationResult()
        result.add_pass("Test 1")
        result.add_fail("Test 2")
        
        json_data = result.to_json()
        
        assert json_data["summary"]["passed"] == 1
        assert json_data["summary"]["failed"] == 1
        assert json_data["summary"]["total"] == 2
        assert json_data["summary"]["success"] == False
        assert "duration" in json_data["summary"]
        assert "timestamp" in json_data
        assert "environment" in json_data
    
    def test_success_criteria(self):
        """Test success determination"""
        result = ValidationResult()
        
        # Only passes - success
        result.add_pass("Test 1")
        assert result.to_json()["summary"]["success"] == True
        
        # With failures - not success
        result.add_fail("Test 2")
        assert result.to_json()["summary"]["success"] == False
        
        # Reset and test security issues
        result = ValidationResult()
        result.add_pass("Test 1")
        result.add_security_issue("Test 2", "Security issue")
        assert result.to_json()["summary"]["success"] == False


class TestValidator:
    """Test Validator class"""
    
    @pytest.fixture
    def validator(self):
        return Validator(verbose=False, parallel=False)
    
    @pytest.fixture
    def temp_project(self, tmp_path):
        """Create a temporary project structure"""
        # Create directories
        (tmp_path / "assets" / "js").mkdir(parents=True)
        (tmp_path / "assets" / "css").mkdir(parents=True)
        (tmp_path / "config").mkdir()
        (tmp_path / "bin").mkdir()
        (tmp_path / "tests").mkdir()
        
        # Create files
        (tmp_path / "config" / "settings.json").write_text(json.dumps({
            "elasticsearch": {"url": "http://localhost:9200"},
            "kibana": {"url": "http://localhost:5601"},
            "processing": {}
        }))
        (tmp_path / "package.json").write_text('{"name": "test"}')
        (tmp_path / "index.html").write_text("<html></html>")
        
        return tmp_path
    
    def test_file_validation(self, validator, tmp_path):
        """Test file validation with security checks"""
        # Create test file
        test_file = tmp_path / "test.txt"
        test_file.write_text("test content")
        
        # Normal file check
        with patch("bin.validate_connections_production.PROJECT_ROOT", tmp_path):
            assert validator.check_file("test.txt", "Test file")
            assert validator.result.passed == 1
        
        # Non-existent file
        validator.result = ValidationResult()
        with patch("bin.validate_connections_production.PROJECT_ROOT", tmp_path):
            assert not validator.check_file("nonexistent.txt", "Missing file")
            assert validator.result.failed == 1
        
        # World-writable file
        validator.result = ValidationResult()
        test_file.chmod(0o666)
        with patch("bin.validate_connections_production.PROJECT_ROOT", tmp_path):
            validator.check_file("test.txt", "Writable file")
            assert validator.result.security_issues == 1
    
    def test_path_traversal_prevention(self, validator, tmp_path):
        """Test path traversal attack prevention"""
        with patch("bin.validate_connections_production.PROJECT_ROOT", tmp_path):
            # Attempt path traversal
            validator.check_file("../../../etc/passwd", "Path traversal test")
            assert validator.result.security_issues == 1
            assert "Path traversal attempt" in validator.result.details[0]["message"]
    
    def test_directory_validation(self, validator, tmp_path):
        """Test directory validation"""
        test_dir = tmp_path / "testdir"
        test_dir.mkdir()
        
        with patch("bin.validate_connections_production.PROJECT_ROOT", tmp_path):
            assert validator.check_dir("testdir", "Test directory")
            assert validator.result.passed == 1
        
        # World-writable directory
        validator.result = ValidationResult()
        test_dir.chmod(0o777)
        with patch("bin.validate_connections_production.PROJECT_ROOT", tmp_path):
            validator.check_dir("testdir", "Writable directory")
            assert validator.result.security_issues == 1
    
    def test_python_import_validation(self, validator):
        """Test Python import validation"""
        # Valid import
        assert validator.check_python_import("import os", "OS module")
        assert validator.result.passed == 1
        
        # Invalid import
        validator.result = ValidationResult()
        assert not validator.check_python_import("import nonexistent_module", "Bad module")
        assert validator.result.failed == 1
        
        # Code injection attempt
        validator.result = ValidationResult()
        validator.check_python_import("import os; os.system('evil')", "Injection test")
        assert validator.result.security_issues == 1
    
    def test_command_validation(self, validator):
        """Test command existence validation"""
        # Common command that should exist
        assert validator.check_command("python", "Python command")
        assert validator.result.passed == 1
        
        # Non-existent command
        validator.result = ValidationResult()
        assert not validator.check_command("nonexistent_command_xyz", "Bad command")
        assert validator.result.failed == 1
    
    def test_environment_variable_validation(self, validator):
        """Test environment variable validation"""
        # Set test variable
        os.environ["TEST_VAR"] = "test_value"
        
        # Required variable exists
        assert validator.check_env_var("TEST_VAR", "Test variable", required=True)
        assert validator.result.passed == 1
        
        # Required variable missing
        validator.result = ValidationResult()
        assert not validator.check_env_var("MISSING_VAR", "Missing variable", required=True)
        assert validator.result.failed == 1
        
        # Optional variable missing
        validator.result = ValidationResult()
        validator.check_env_var("OPTIONAL_VAR", "Optional variable", required=False)
        assert validator.result.warnings == 1
        
        # Sensitive variable with insecure value
        validator.result = ValidationResult()
        os.environ["API_KEY"] = "password"
        validator.check_env_var("API_KEY", "API key", sensitive=True)
        assert validator.result.security_issues == 1
        
        # Cleanup
        del os.environ["TEST_VAR"]
        del os.environ["API_KEY"]
    
    @pytest.mark.asyncio
    async def test_network_connectivity(self, validator):
        """Test network connectivity checks"""
        with patch("httpx.AsyncClient") as mock_client:
            # Successful connection
            mock_response = Mock()
            mock_response.status_code = 200
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)
            
            result = await validator.check_network_connectivity(
                "http://example.com",
                "Test connection"
            )
            assert result == True
            assert validator.result.passed == 1
        
        # Slow response
        validator.result = ValidationResult()
        with patch("httpx.AsyncClient") as mock_client:
            async def slow_response(*args, **kwargs):
                await asyncio.sleep(2.5)
                response = Mock()
                response.status_code = 200
                return response
            
            mock_client.return_value.__aenter__.return_value.get = slow_response
            
            with patch("time.time") as mock_time:
                mock_time.side_effect = [0, 2.5]
                result = await validator.check_network_connectivity(
                    "http://slow.com",
                    "Slow connection",
                    timeout=5.0
                )
                assert validator.result.performance_issues == 1
    
    def test_ssl_certificate_validation(self, validator):
        """Test SSL certificate validation"""
        with patch("socket.create_connection") as mock_socket:
            with patch("ssl.create_default_context") as mock_context:
                # Mock certificate data
                mock_cert = Mock()
                mock_cert.not_valid_after = Mock()
                
                # Valid certificate
                from datetime import datetime, timedelta
                mock_cert.not_valid_after = datetime.now() + timedelta(days=90)
                
                with patch("cryptography.x509.load_der_x509_certificate", return_value=mock_cert):
                    mock_ssl_socket = Mock()
                    mock_ssl_socket.getpeercert_binary.return_value = b"cert_data"
                    mock_context.return_value.wrap_socket.return_value.__enter__.return_value = mock_ssl_socket
                    
                    result = validator.check_ssl_certificate("example.com", 443)
                    assert result == True
                    assert validator.result.passed == 1
                
                # Expired certificate
                validator.result = ValidationResult()
                mock_cert.not_valid_after = datetime.now() - timedelta(days=1)
                
                with patch("cryptography.x509.load_der_x509_certificate", return_value=mock_cert):
                    result = validator.check_ssl_certificate("expired.com", 443)
                    assert result == False
                    assert validator.result.security_issues == 1
    
    def test_port_availability(self, validator):
        """Test port availability checks"""
        # Test with mocked socket
        with patch("socket.socket") as mock_socket_class:
            mock_socket = Mock()
            mock_socket_class.return_value.__enter__.return_value = mock_socket
            
            # Port available
            mock_socket.connect_ex.return_value = 1  # Connection refused = port available
            assert validator.check_port_availability(8080, "Test port")
            assert validator.result.passed == 1
            
            # Port in use
            validator.result = ValidationResult()
            mock_socket.connect_ex.return_value = 0  # Connection successful = port in use
            
            with patch("psutil.net_connections") as mock_connections:
                mock_conn = Mock()
                mock_conn.laddr.port = 8080
                mock_conn.pid = 1234
                mock_connections.return_value = [mock_conn]
                
                with patch("psutil.Process") as mock_process:
                    mock_process.return_value.name.return_value = "test_process"
                    
                    result = validator.check_port_availability(8080, "Used port")
                    assert result == False
                    assert validator.result.warnings == 1
    
    def test_json_file_validation(self, validator, tmp_path):
        """Test JSON file validation"""
        # Valid JSON
        valid_json = tmp_path / "valid.json"
        valid_json.write_text('{"key": "value"}')
        
        with patch("bin.validate_connections_production.PROJECT_ROOT", tmp_path):
            assert validator.validate_json_file("valid.json")
            assert validator.result.passed == 1
        
        # Invalid JSON
        validator.result = ValidationResult()
        invalid_json = tmp_path / "invalid.json"
        invalid_json.write_text('{"key": invalid}')
        
        with patch("bin.validate_connections_production.PROJECT_ROOT", tmp_path):
            assert not validator.validate_json_file("invalid.json")
            assert validator.result.failed == 1
        
        # Non-existent file
        validator.result = ValidationResult()
        with patch("bin.validate_connections_production.PROJECT_ROOT", tmp_path):
            assert not validator.validate_json_file("missing.json")
            assert validator.result.failed == 1
    
    def test_disk_space_check(self, validator):
        """Test disk space validation"""
        with patch("psutil.disk_usage") as mock_usage:
            # Sufficient space
            mock_usage.return_value = Mock(
                free=10 * 1024**3,  # 10 GB
                percent=50
            )
            assert validator.check_disk_space(min_gb=1.0)
            assert validator.result.passed == 1
            
            # Insufficient space
            validator.result = ValidationResult()
            mock_usage.return_value = Mock(
                free=0.5 * 1024**3,  # 0.5 GB
                percent=95
            )
            assert not validator.check_disk_space(min_gb=1.0)
            assert validator.result.failed == 1
            
            # High usage warning
            validator.result = ValidationResult()
            mock_usage.return_value = Mock(
                free=5 * 1024**3,  # 5 GB
                percent=92
            )
            validator.check_disk_space(min_gb=1.0)
            assert validator.result.warnings == 1
    
    def test_memory_check(self, validator):
        """Test memory usage validation"""
        with patch("psutil.virtual_memory") as mock_memory:
            # Normal usage
            mock_memory.return_value = Mock(
                percent=60,
                available=8 * 1024**3  # 8 GB
            )
            assert validator.check_memory_usage()
            assert validator.result.passed == 1
            
            # High usage
            validator.result = ValidationResult()
            mock_memory.return_value = Mock(
                percent=95,
                available=1 * 1024**3  # 1 GB
            )
            assert not validator.check_memory_usage()
            assert validator.result.performance_issues == 1


class TestColors:
    """Test color output"""
    
    def test_color_output_tty(self):
        """Test color codes when output is TTY"""
        with patch("sys.stdout.isatty", return_value=True):
            assert Colors.green("test") == f"{Colors.GREEN}test{Colors.NC}"
            assert Colors.red("test") == f"{Colors.RED}test{Colors.NC}"
            assert Colors.yellow("test") == f"{Colors.YELLOW}test{Colors.NC}"
            assert Colors.blue("test") == f"{Colors.BLUE}test{Colors.NC}"
    
    def test_color_output_non_tty(self):
        """Test no color codes when output is not TTY"""
        with patch("sys.stdout.isatty", return_value=False):
            assert Colors.green("test") == "test"
            assert Colors.red("test") == "test"
            assert Colors.yellow("test") == "test"
            assert Colors.blue("test") == "test"


class TestIntegration:
    """Integration tests"""
    
    @pytest.mark.asyncio
    async def test_full_validation_flow(self, tmp_path):
        """Test complete validation flow"""
        # Set up project structure
        (tmp_path / "assets" / "js").mkdir(parents=True)
        (tmp_path / "config").mkdir()
        (tmp_path / "bin").mkdir()
        
        # Create required files
        settings = {
            "elasticsearch": {"url": "http://localhost:9200"},
            "kibana": {"url": "http://localhost:5601"},
            "processing": {}
        }
        (tmp_path / "config" / "settings.json").write_text(json.dumps(settings))
        (tmp_path / "package.json").write_text('{"name": "test-project"}')
        (tmp_path / "index.html").write_text("<html></html>")
        
        # Run validation
        with patch("bin.validate_connections_production.PROJECT_ROOT", tmp_path):
            validator = Validator(verbose=False, parallel=False)
            
            # Mock system checks
            with patch.object(validator, "check_disk_space", return_value=True):
                with patch.object(validator, "check_memory_usage", return_value=True):
                    with patch.object(validator, "check_port_availability", return_value=True):
                        success = await validator.validate_all()
            
            # Check results
            result = validator.result.to_json()
            assert result["summary"]["failed"] == 0
            assert result["summary"]["security_issues"] == 0
            assert success == True


class TestParallelExecution:
    """Test parallel execution capabilities"""
    
    def test_parallel_validator(self):
        """Test validator with parallel execution"""
        validator = Validator(verbose=False, parallel=True)
        assert validator.executor is not None
        
        # Cleanup
        del validator


class TestCLI:
    """Test command-line interface"""
    
    def test_argument_parsing(self):
        """Test CLI argument parsing"""
        from bin.validate_connections_production import main
        
        # Test with various arguments
        test_args = [
            ["--verbose"],
            ["--json"],
            ["--output", "test.json"],
            ["--no-parallel"],
            ["--network"]
        ]
        
        for args in test_args:
            with patch("sys.argv", ["validate_connections_production.py"] + args):
                with patch("bin.validate_connections_production.Validator.validate_all", 
                          return_value=asyncio.coroutine(lambda: True)()):
                    with pytest.raises(SystemExit) as exc:
                        main()
                    assert exc.value.code == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])