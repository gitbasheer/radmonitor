#!/usr/bin/env python3
"""
Comprehensive Test Suite for Enhanced Validation Script
Tests all error handling paths and edge cases
"""

import os
import sys
import pytest
import json
import tempfile
import subprocess
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock, mock_open
import logging

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from bin.validate_connections_enhanced import (
    SafeValidator, ValidationResult, ValidationError, Colors, PROJECT_ROOT
)


class TestValidationResult:
    """Test ValidationResult class with error handling"""
    
    def test_initialization(self):
        """Test result initialization"""
        result = ValidationResult()
        assert result.passed == 0
        assert result.failed == 0
        assert result.warnings == 0
        assert result.errors == 0
        assert result.critical_errors == []
        assert len(result.details) == 0
    
    def test_add_pass_normal(self):
        """Test adding pass result"""
        result = ValidationResult()
        result.add_pass("Test 1", "Success", duration=1.5)
        
        assert result.passed == 1
        assert len(result.details) == 1
        assert result.details[0]["status"] == "passed"
        assert result.details[0]["duration"] == 1.5
    
    def test_add_pass_with_output_error(self):
        """Test pass recording when output fails"""
        result = ValidationResult()
        
        # Mock print to raise exception
        with patch('builtins.print', side_effect=IOError("Output failed")):
            # Should handle error gracefully
            result.add_pass("Test", "Message")
        
        # Result should still be recorded
        assert result.passed == 1
    
    def test_add_fail_critical(self):
        """Test critical failure recording"""
        result = ValidationResult()
        result.add_fail("Critical Test", "Major issue", critical=True)
        
        assert result.failed == 1
        assert len(result.critical_errors) == 1
        assert "Critical Test: Major issue" in result.critical_errors
    
    def test_add_error_with_exception(self):
        """Test error recording with exception details"""
        result = ValidationResult()
        
        try:
            raise ValueError("Test exception")
        except ValueError as e:
            result.add_error("Error Test", e)
        
        assert result.errors == 1
        assert result.details[0]["status"] == "error"
        assert "ValueError: Test exception" in result.details[0]["message"]
        assert "traceback" in result.details[0]
    
    def test_to_json_normal(self):
        """Test JSON export"""
        result = ValidationResult()
        result.add_pass("Test 1")
        result.add_fail("Test 2")
        result.add_warning("Test 3")
        result.add_error("Test 4", Exception("Error"))
        
        json_data = result.to_json()
        
        assert json_data["summary"]["passed"] == 1
        assert json_data["summary"]["failed"] == 1
        assert json_data["summary"]["warnings"] == 1
        assert json_data["summary"]["errors"] == 1
        assert json_data["summary"]["success"] == False
        assert "duration" in json_data["summary"]
    
    def test_to_json_with_error(self):
        """Test JSON export error handling"""
        result = ValidationResult()
        
        # Mock datetime to cause JSON serialization error
        with patch.object(result, 'details', Mock(side_effect=Exception("Serialization error"))):
            json_data = result.to_json()
        
        assert "error" in json_data
        assert "Failed to generate JSON results" in json_data["error"]


class TestSafeValidator:
    """Test SafeValidator with comprehensive error scenarios"""
    
    @pytest.fixture
    def validator(self):
        return SafeValidator(verbose=False, continue_on_error=True)
    
    @pytest.fixture
    def temp_project(self, tmp_path):
        """Create temporary project structure"""
        (tmp_path / "config").mkdir()
        (tmp_path / "assets").mkdir()
        (tmp_path / "bin").mkdir()
        return tmp_path
    
    def test_safe_check_file_nonexistent(self, validator, tmp_path):
        """Test checking non-existent file"""
        with patch("bin.validate_connections_enhanced.PROJECT_ROOT", tmp_path):
            result = validator.safe_check_file("missing.txt", "Missing file")
        
        assert not result
        assert validator.result.failed == 1
        assert "File not found" in validator.result.details[0]["message"]
    
    def test_safe_check_file_permission_denied(self, validator, tmp_path):
        """Test file with permission denied"""
        test_file = tmp_path / "restricted.txt"
        test_file.write_text("content")
        test_file.chmod(0o000)
        
        try:
            with patch("bin.validate_connections_enhanced.PROJECT_ROOT", tmp_path):
                result = validator.safe_check_file(
                    "restricted.txt", 
                    "Restricted file", 
                    check_read=True
                )
            
            assert not result
            assert validator.result.failed == 1
            assert "Permission denied" in validator.result.details[0]["message"]
        finally:
            # Restore permissions for cleanup
            test_file.chmod(0o644)
    
    def test_safe_check_file_unicode_error(self, validator, tmp_path):
        """Test file with invalid encoding"""
        test_file = tmp_path / "binary.dat"
        test_file.write_bytes(b'\x80\x81\x82\x83')  # Invalid UTF-8
        
        with patch("bin.validate_connections_enhanced.PROJECT_ROOT", tmp_path):
            result = validator.safe_check_file(
                "binary.dat", 
                "Binary file", 
                check_read=True
            )
        
        # Should warn but not fail for binary files
        assert result
        assert validator.result.warnings == 1
    
    def test_safe_check_file_json_invalid(self, validator, tmp_path):
        """Test invalid JSON file"""
        test_file = tmp_path / "invalid.json"
        test_file.write_text('{"key": invalid}')
        
        with patch("bin.validate_connections_enhanced.PROJECT_ROOT", tmp_path):
            result = validator.safe_check_file(
                "invalid.json", 
                "Invalid JSON", 
                check_json=True
            )
        
        assert not result
        assert validator.result.failed == 1
        assert "Invalid JSON" in validator.result.details[0]["message"]
    
    def test_safe_check_file_large_file_warning(self, validator, tmp_path):
        """Test large file warning"""
        test_file = tmp_path / "large.txt"
        test_file.write_text("x" * (101 * 1024 * 1024))  # 101MB
        
        with patch("bin.validate_connections_enhanced.PROJECT_ROOT", tmp_path):
            result = validator.safe_check_file("large.txt", "Large file")
        
        assert result  # Should pass but warn
        assert validator.result.warnings == 1
        assert "Large file" in validator.result.details[1]["message"]
    
    def test_safe_check_file_empty_warning(self, validator, tmp_path):
        """Test empty file warning"""
        test_file = tmp_path / "empty.txt"
        test_file.touch()
        
        with patch("bin.validate_connections_enhanced.PROJECT_ROOT", tmp_path):
            result = validator.safe_check_file("empty.txt", "Empty file")
        
        assert result
        assert validator.result.warnings == 1
        assert "File is empty" in validator.result.details[0]["message"]
    
    def test_safe_check_dir_not_directory(self, validator, tmp_path):
        """Test checking file as directory"""
        test_file = tmp_path / "file.txt"
        test_file.write_text("content")
        
        with patch("bin.validate_connections_enhanced.PROJECT_ROOT", tmp_path):
            result = validator.safe_check_dir("file.txt", "Not a directory")
        
        assert not result
        assert validator.result.failed == 1
        assert "Not a directory" in validator.result.details[0]["message"]
    
    def test_safe_check_dir_not_writable(self, validator, tmp_path):
        """Test non-writable directory"""
        test_dir = tmp_path / "readonly"
        test_dir.mkdir()
        test_dir.chmod(0o555)  # Read-only
        
        try:
            with patch("bin.validate_connections_enhanced.PROJECT_ROOT", tmp_path):
                result = validator.safe_check_dir(
                    "readonly", 
                    "Read-only dir", 
                    check_writable=True
                )
            
            assert not result
            assert validator.result.failed == 1
            assert "not writable" in validator.result.details[0]["message"]
        finally:
            test_dir.chmod(0o755)
    
    def test_safe_check_python_import_dangerous(self, validator):
        """Test dangerous import detection"""
        dangerous_imports = [
            "import os; os.system('rm -rf /')",
            "__import__('os').system('evil')",
            "exec('malicious code')",
            "eval('dangerous')",
        ]
        
        for imp in dangerous_imports:
            validator.result = ValidationResult()  # Reset
            result = validator.safe_check_python_import(imp, "Dangerous import")
            assert not result
            assert validator.result.failed == 1
            assert "dangerous" in validator.result.details[0]["message"].lower()
    
    def test_safe_check_python_import_timeout(self, validator):
        """Test import timeout handling"""
        infinite_import = "import time; time.sleep(100)"
        
        with patch("subprocess.run", side_effect=subprocess.TimeoutExpired("cmd", 5)):
            result = validator.safe_check_python_import(infinite_import, "Timeout test")
        
        assert not result
        assert validator.result.failed == 1
        assert "timeout" in validator.result.details[0]["message"].lower()
    
    def test_safe_check_python_import_subprocess_error(self, validator):
        """Test subprocess error handling"""
        with patch("subprocess.run", side_effect=OSError("Cannot run subprocess")):
            result = validator.safe_check_python_import("import os", "Subprocess error")
        
        assert not result
        assert validator.result.errors == 1
    
    def test_safe_check_command_not_found(self, validator):
        """Test command not found"""
        result = validator.safe_check_command("nonexistent_command_xyz", "Missing command")
        
        assert not result
        assert validator.result.failed == 1
        assert "Command not found" in validator.result.details[0]["message"]
    
    def test_safe_check_command_exception(self, validator):
        """Test command check exception"""
        with patch("shutil.which", side_effect=Exception("which failed")):
            result = validator.safe_check_command("python", "Python command")
        
        assert not result
        assert validator.result.errors == 1
    
    def test_safe_check_env_var_invalid_name(self, validator):
        """Test invalid environment variable name"""
        invalid_names = ["", "123VAR", "VAR-NAME", "VAR NAME", "VAR$"]
        
        for name in invalid_names:
            validator.result = ValidationResult()
            result = validator.safe_check_env_var(name, "Invalid var")
            assert not result
            assert validator.result.failed == 1
    
    def test_safe_check_env_var_sensitive(self, validator):
        """Test sensitive variable handling"""
        os.environ["SECRET_KEY"] = "my-secret"
        
        result = validator.safe_check_env_var(
            "SECRET_KEY", 
            "Secret key", 
            sensitive=True
        )
        
        assert result
        assert validator.result.passed == 1
        # Should not log the actual value
        assert "my-secret" not in str(validator.result.details)
        
        del os.environ["SECRET_KEY"]
    
    def test_safe_load_json_file_too_large(self, validator, tmp_path):
        """Test JSON file size limit"""
        large_json = tmp_path / "large.json"
        
        # Mock large file
        with patch("pathlib.Path.stat") as mock_stat:
            mock_stat.return_value.st_size = 11 * 1024 * 1024  # 11MB
            
            with patch("bin.validate_connections_enhanced.PROJECT_ROOT", tmp_path):
                result = validator.safe_load_json("large.json", "Large JSON")
        
        assert result is None
        assert validator.result.failed == 1
        assert "too large" in validator.result.details[0]["message"]
    
    def test_safe_load_json_parse_error(self, validator, tmp_path):
        """Test JSON parse error with line number"""
        bad_json = tmp_path / "bad.json"
        bad_json.write_text('{\n  "key": "value",\n  "bad": line\n}')
        
        with patch("bin.validate_connections_enhanced.PROJECT_ROOT", tmp_path):
            result = validator.safe_load_json("bad.json", "Bad JSON")
        
        assert result is None
        assert validator.result.failed == 1
        assert "line" in validator.result.details[0]["message"]
    
    def test_safe_run_command_success(self, validator):
        """Test successful command execution"""
        result = validator.safe_run_command(
            [sys.executable, "-c", "print('hello')"],
            "Test command"
        )
        
        assert result is not None
        assert result.returncode == 0
        assert validator.result.passed == 1
    
    def test_safe_run_command_failure(self, validator):
        """Test command failure"""
        result = validator.safe_run_command(
            [sys.executable, "-c", "import sys; sys.exit(1)"],
            "Failing command"
        )
        
        assert result is not None
        assert result.returncode == 1
        assert validator.result.failed == 1
    
    def test_safe_run_command_timeout(self, validator):
        """Test command timeout"""
        result = validator.safe_run_command(
            [sys.executable, "-c", "import time; time.sleep(10)"],
            "Slow command",
            timeout=1
        )
        
        assert result is None
        assert validator.result.failed == 1
        assert "timed out" in validator.result.details[0]["message"]
    
    def test_safe_run_command_not_found(self, validator):
        """Test command not found"""
        result = validator.safe_run_command(
            ["nonexistent_command_xyz"],
            "Missing command"
        )
        
        assert result is None
        assert validator.result.failed == 1


class TestValidationFlow:
    """Test complete validation flow with error scenarios"""
    
    @pytest.fixture
    def validator(self):
        return SafeValidator(verbose=False, continue_on_error=True)
    
    def test_validate_project_structure_missing_critical(self, validator, tmp_path):
        """Test missing critical directory"""
        with patch("bin.validate_connections_enhanced.PROJECT_ROOT", tmp_path):
            # Should not raise even for critical directories when continue_on_error=True
            validator.validate_project_structure()
        
        # Should have failures for missing directories
        assert validator.result.failed > 0
    
    def test_validate_project_structure_strict_mode(self, tmp_path):
        """Test strict mode stops on critical error"""
        validator = SafeValidator(verbose=False, continue_on_error=False)
        
        with patch("bin.validate_connections_enhanced.PROJECT_ROOT", tmp_path):
            with pytest.raises(ValidationError, match="Critical directory missing"):
                validator.validate_project_structure()
    
    def test_validate_core_files_critical_missing(self, tmp_path):
        """Test missing critical files in strict mode"""
        validator = SafeValidator(verbose=False, continue_on_error=False)
        (tmp_path / "config").mkdir()
        
        with patch("bin.validate_connections_enhanced.PROJECT_ROOT", tmp_path):
            with pytest.raises(ValidationError, match="Critical file invalid"):
                validator.validate_core_files()
    
    def test_validate_configuration_invalid_json(self, validator, tmp_path):
        """Test configuration with invalid JSON"""
        (tmp_path / "config").mkdir()
        settings = tmp_path / "config" / "settings.json"
        settings.write_text("not json")
        
        with patch("bin.validate_connections_enhanced.PROJECT_ROOT", tmp_path):
            validator.validate_configuration()
        
        assert validator.result.failed > 0
    
    def test_validate_configuration_missing_sections(self, validator, tmp_path):
        """Test configuration with missing sections"""
        (tmp_path / "config").mkdir()
        settings = tmp_path / "config" / "settings.json"
        settings.write_text('{"elasticsearch": {}}')  # Missing kibana and processing
        
        with patch("bin.validate_connections_enhanced.PROJECT_ROOT", tmp_path):
            validator.validate_configuration()
        
        assert validator.result.failed > 0
        assert any("Missing sections" in d["message"] for d in validator.result.details)
    
    def test_validate_runtime_environment_old_python(self, validator):
        """Test Python version check"""
        with patch("sys.version_info", (3, 7, 0)):
            validator.validate_runtime_environment()
        
        assert any("Python 3.8+ required" in d["message"] for d in validator.result.details)
    
    def test_validate_runtime_environment_low_disk_space(self, validator):
        """Test low disk space warning"""
        mock_usage = Mock()
        mock_usage.free = 0.05 * 1024**3  # 0.05 GB
        
        with patch("shutil.disk_usage", return_value=mock_usage):
            validator.validate_runtime_environment()
        
        assert validator.result.failed > 0
        assert any("Only" in d["message"] and "GB free" in d["message"] 
                  for d in validator.result.details)
    
    def test_run_all_validations_success(self, validator, tmp_path):
        """Test successful validation run"""
        # Create valid structure
        (tmp_path / "config").mkdir()
        (tmp_path / "assets").mkdir()
        (tmp_path / "bin").mkdir()
        
        settings = tmp_path / "config" / "settings.json"
        settings.write_text(json.dumps({
            "elasticsearch": {},
            "kibana": {},
            "processing": {}
        }))
        
        package = tmp_path / "package.json"
        package.write_text('{"name": "test"}')
        
        with patch("bin.validate_connections_enhanced.PROJECT_ROOT", tmp_path):
            with patch.object(validator, "validate_dependencies"):  # Skip dependency checks
                success = validator.run_all_validations()
        
        # Should have some passes
        assert validator.result.passed > 0
    
    def test_run_all_validations_with_exception(self, validator):
        """Test validation with unexpected exception"""
        with patch.object(validator, "validate_runtime_environment", 
                         side_effect=Exception("Unexpected error")):
            success = validator.run_all_validations()
        
        assert not success
        assert validator.result.errors > 0


class TestColors:
    """Test color output handling"""
    
    def test_colors_tty(self):
        """Test colors when TTY is available"""
        with patch("sys.stdout.isatty", return_value=True):
            with patch.dict(os.environ, {"TERM": "xterm"}):
                # Force color class to reinitialize
                Colors.GREEN = '\033[0;32m'
                assert '\033[' in Colors.green("test")
                assert '\033[' in Colors.red("test")
    
    def test_colors_no_tty(self):
        """Test no colors when not TTY"""
        with patch("sys.stdout.isatty", return_value=False):
            # Force reinitialization
            Colors.GREEN = ''
            assert '\033[' not in Colors.green("test")
            assert '\033[' not in Colors.red("test")
    
    def test_colors_dumb_terminal(self):
        """Test no colors for dumb terminal"""
        with patch("sys.stdout.isatty", return_value=True):
            with patch.dict(os.environ, {"TERM": "dumb"}):
                Colors.GREEN = ''
                assert '\033[' not in Colors.green("test")


class TestMainFunction:
    """Test main function and CLI"""
    
    def test_main_keyboard_interrupt(self):
        """Test handling of keyboard interrupt"""
        with patch("sys.argv", ["validate.py"]):
            with patch("bin.validate_connections_enhanced.SafeValidator.run_all_validations",
                      side_effect=KeyboardInterrupt()):
                with pytest.raises(SystemExit) as exc:
                    from bin.validate_connections_enhanced import main
                    main()
                
                assert exc.value.code == 130
    
    def test_main_json_output(self, tmp_path):
        """Test JSON output mode"""
        output_file = tmp_path / "results.json"
        
        with patch("sys.argv", ["validate.py", "--json", "-o", str(output_file)]):
            with patch("bin.validate_connections_enhanced.SafeValidator.run_all_validations",
                      return_value=True):
                with pytest.raises(SystemExit) as exc:
                    from bin.validate_connections_enhanced import main
                    main()
                
                assert exc.value.code == 0
                assert output_file.exists()
    
    def test_main_output_file_error(self, tmp_path):
        """Test output file write error"""
        output_file = tmp_path / "readonly" / "results.json"
        
        with patch("sys.argv", ["validate.py", "-o", str(output_file)]):
            with patch("bin.validate_connections_enhanced.SafeValidator.run_all_validations",
                      return_value=True):
                with pytest.raises(SystemExit) as exc:
                    from bin.validate_connections_enhanced import main
                    main()
                
                assert exc.value.code == 2
    
    def test_main_unhandled_exception(self):
        """Test unhandled exception in main"""
        with patch("sys.argv", ["validate.py"]):
            with patch("bin.validate_connections_enhanced.SafeValidator.__init__",
                      side_effect=Exception("Unexpected error")):
                with pytest.raises(SystemExit) as exc:
                    from bin.validate_connections_enhanced import main
                    main()
                
                assert exc.value.code == 2


class TestEdgeCases:
    """Test edge cases and boundary conditions"""
    
    def test_validator_cleanup_on_delete(self, tmp_path):
        """Test validator cleanup on deletion"""
        validator = SafeValidator()
        
        # Add temp file
        temp_file = tmp_path / "temp.txt"
        temp_file.touch()
        validator._temp_files.append(temp_file)
        
        # Delete validator
        del validator
        
        # File should be cleaned up (or at least attempted)
        # Note: Can't guarantee deletion worked, but shouldn't crash
    
    def test_empty_import_statement(self):
        """Test empty import statement"""
        validator = SafeValidator()
        result = validator.safe_check_python_import("", "Empty import")
        
        assert not result
        assert validator.result.failed == 1
    
    def test_very_long_import_statement(self):
        """Test very long import statement"""
        validator = SafeValidator()
        long_import = "import " + "a" * 300
        result = validator.safe_check_python_import(long_import, "Long import")
        
        assert not result
        assert validator.result.failed == 1
    
    def test_concurrent_validation_results(self):
        """Test thread safety of validation results"""
        # This is a basic test - full thread safety would require more complex testing
        result = ValidationResult()
        
        # Simulate concurrent access
        for i in range(100):
            result.add_pass(f"Test {i}")
        
        assert result.passed == 100
        assert len(result.details) == 100


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--cov=bin.validate_connections_enhanced"])