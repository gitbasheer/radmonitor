#!/usr/bin/env python3
"""
Configuration CLI for VH-RAD Traffic Monitor
Provides command-line interface for managing application configuration
"""
import sys
import os
import json
import argparse
from pathlib import Path
from typing import Optional, List, Dict, Any
import yaml
from datetime import datetime
from getpass import getpass

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import (
    AppConfig, get_config, reload_config,
    ConfigurationManager, get_config_manager
)


class ConfigCLI:
    """Command-line interface for configuration management"""

    def __init__(self):
        self.manager = get_config_manager()
        self.parser = self._create_parser()

    def _create_parser(self) -> argparse.ArgumentParser:
        """Create argument parser"""
        parser = argparse.ArgumentParser(
            description="VH-RAD Traffic Monitor Configuration Manager",
            formatter_class=argparse.RawDescriptionHelpFormatter,
            epilog="""
Examples:
  # Show current configuration
  %(prog)s show

  # Get specific value
  %(prog)s get elasticsearch.url

  # Set configuration value
  %(prog)s set server.port 8080

  # Validate configuration
  %(prog)s validate

  # Create environment config
  %(prog)s env create production

  # Export environment variables
  %(prog)s env export --environment production > .env.production
            """
        )

        subparsers = parser.add_subparsers(dest='command', help='Commands')

        # Show command
        show_parser = subparsers.add_parser('show', help='Show current configuration')
        show_parser.add_argument('--format', choices=['yaml', 'json'], default='yaml',
                               help='Output format')
        show_parser.add_argument('--environment', help='Show config for specific environment')

        # Get command
        get_parser = subparsers.add_parser('get', help='Get configuration value')
        get_parser.add_argument('key', help='Configuration key (e.g., elasticsearch.url)')
        get_parser.add_argument('--environment', help='Get from specific environment')

        # Set command
        set_parser = subparsers.add_parser('set', help='Set configuration value')
        set_parser.add_argument('key', help='Configuration key')
        set_parser.add_argument('value', help='Configuration value')
        set_parser.add_argument('--environment', help='Set in specific environment')
        set_parser.add_argument('--backup', action='store_true', help='Backup before changing')

        # Validate command
        validate_parser = subparsers.add_parser('validate', help='Validate configuration')
        validate_parser.add_argument('--environment', help='Validate specific environment')
        validate_parser.add_argument('--file', help='Validate specific file')

        # Environment commands
        env_parser = subparsers.add_parser('env', help='Environment management')
        env_subparsers = env_parser.add_subparsers(dest='env_command')

        # Create environment
        env_create = env_subparsers.add_parser('create', help='Create environment config')
        env_create.add_argument('environment', choices=['development', 'staging', 'production'])
        env_create.add_argument('--from', dest='from_env', help='Base environment to copy from')

        # List environments
        env_subparsers.add_parser('list', help='List available environments')

        # Export environment
        env_export = env_subparsers.add_parser('export', help='Export as environment variables')
        env_export.add_argument('--environment', default='development', help='Environment to export')

        # Migrate command
        migrate_parser = subparsers.add_parser('migrate', help='Migrate from JSON config')
        migrate_parser.add_argument('json_file', help='Path to JSON config file')
        migrate_parser.add_argument('--backup', action='store_true', help='Backup existing config')

        # Backup command
        backup_parser = subparsers.add_parser('backup', help='Backup configuration')
        backup_parser.add_argument('--file', help='Specific file to backup')

        # Interactive command
        subparsers.add_parser('interactive', help='Interactive configuration mode')

        # Setup wizard
        subparsers.add_parser('setup', help='Run setup wizard')

        return parser

    def show_config(self, format: str = 'yaml', environment: Optional[str] = None):
        """Show current configuration"""
        config = self.manager.get_config(environment)

        if format == 'json':
            print(json.dumps(config.model_dump(), indent=2))
        else:
            print(yaml.dump(config.model_dump(), default_flow_style=False, sort_keys=False))

    def get_value(self, key: str, environment: Optional[str] = None):
        """Get specific configuration value"""
        config = self.manager.get_config(environment)

        # Navigate through nested keys
        value = config
        for part in key.split('.'):
            if hasattr(value, part):
                value = getattr(value, part)
            elif isinstance(value, dict) and part in value:
                value = value[part]
            else:
                print(f"Error: Key '{key}' not found", file=sys.stderr)
                return 1

        # Handle special types
        if hasattr(value, 'get_secret_value'):
            value = value.get_secret_value()

        print(value)
        return 0

    def set_value(self, key: str, value: str, environment: Optional[str] = None, backup: bool = False):
        """Set configuration value"""
        # Load config
        config_path = Path("config/config.yaml")
        if environment:
            config_path = Path(f"config/environments/{environment}.yaml")

        # Backup if requested
        if backup and config_path.exists():
            backup_path = self.manager.backup_config(config_path)
            print(f"Backed up to: {backup_path}")

        # Load current config
        if config_path.exists():
            config = AppConfig.load_from_yaml(config_path)
        else:
            config = AppConfig()

        # Parse value
        try:
            # Try to parse as JSON first (for lists, dicts, bools, numbers)
            parsed_value = json.loads(value)
        except json.JSONDecodeError:
            # Keep as string
            parsed_value = value

        # Set value
        parts = key.split('.')
        target = config

        # Navigate to the parent
        for part in parts[:-1]:
            if hasattr(target, part):
                target = getattr(target, part)
            else:
                print(f"Error: Invalid key path '{key}'", file=sys.stderr)
                return 1

        # Set the final value
        final_key = parts[-1]
        if hasattr(target, final_key):
            setattr(target, final_key, parsed_value)
        else:
            print(f"Error: Key '{final_key}' not found in {parts[:-1]}", file=sys.stderr)
            return 1

        # Save config
        config.save_to_yaml(config_path)
        print(f"Updated {key} = {parsed_value}")
        return 0

    def validate_config(self, environment: Optional[str] = None, file: Optional[str] = None):
        """Validate configuration"""
        if file:
            config_path = Path(file)
            if not config_path.exists():
                print(f"Error: File not found: {file}", file=sys.stderr)
                return 1
            issues = self.manager.validate_config(config_path)
        else:
            config = self.manager.get_config(environment)
            issues = self.manager.validate_config(config)

        if issues:
            print("Configuration validation failed:")
            for issue in issues:
                print(f"  - {issue}")
            return 1
        else:
            print("Configuration is valid!")
            return 0

    def create_environment(self, environment: str, from_env: Optional[str] = None):
        """Create environment-specific configuration"""
        base_config = None
        if from_env:
            base_config = self.manager.get_config(from_env)

        path = self.manager.create_environment_config(environment, base_config)
        print(f"Created environment config: {path}")
        return 0

    def list_environments(self):
        """List available environments"""
        env_dir = Path("config/environments")
        if not env_dir.exists():
            print("No environment configurations found")
            return 0

        print("Available environments:")
        for env_file in env_dir.glob("*.yaml"):
            env_name = env_file.stem
            print(f"  - {env_name}")
        return 0

    def export_environment(self, environment: str = 'development'):
        """Export configuration as environment variables"""
        template = self.manager.export_env_template(environment)
        print(template)
        return 0

    def migrate_from_json(self, json_file: str, backup: bool = False):
        """Migrate from JSON configuration"""
        json_path = Path(json_file)
        if not json_path.exists():
            print(f"Error: File not found: {json_file}", file=sys.stderr)
            return 1

        # Backup existing config if requested
        yaml_path = Path("config/config.yaml")
        if backup and yaml_path.exists():
            backup_path = self.manager.backup_config(yaml_path)
            print(f"Backed up existing config to: {backup_path}")

        try:
            config = self.manager.migrate_from_json(json_path)
            print(f"Successfully migrated configuration from {json_file}")
            print(f"New YAML config saved to: config/config.yaml")
            return 0
        except Exception as e:
            print(f"Error migrating configuration: {e}", file=sys.stderr)
            return 1

    def backup_config(self, file: Optional[str] = None):
        """Backup configuration"""
        config_path = Path(file) if file else None
        try:
            backup_path = self.manager.backup_config(config_path)
            print(f"Configuration backed up to: {backup_path}")
            return 0
        except Exception as e:
            print(f"Error backing up configuration: {e}", file=sys.stderr)
            return 1

    def interactive_mode(self):
        """Interactive configuration mode"""
        print("VH-RAD Traffic Monitor - Interactive Configuration")
        print("=" * 50)

        while True:
            print("\nOptions:")
            print("1. Show current configuration")
            print("2. Modify Elasticsearch settings")
            print("3. Modify server settings")
            print("4. Modify processing settings")
            print("5. Validate configuration")
            print("6. Save and exit")
            print("7. Exit without saving")

            choice = input("\nSelect option (1-7): ").strip()

            if choice == '1':
                self.show_config()
            elif choice == '2':
                self._interactive_elasticsearch()
            elif choice == '3':
                self._interactive_server()
            elif choice == '4':
                self._interactive_processing()
            elif choice == '5':
                self.validate_config()
            elif choice == '6':
                print("Configuration saved!")
                break
            elif choice == '7':
                print("Exiting without saving.")
                break
            else:
                print("Invalid option!")

    def _interactive_elasticsearch(self):
        """Interactive Elasticsearch configuration"""
        config = get_config()

        print("\nElasticsearch Configuration:")
        print(f"1. URL: {config.elasticsearch.url}")
        print(f"2. Index Pattern: {config.elasticsearch.index_pattern}")
        print(f"3. Timeout: {config.elasticsearch.timeout}")
        print("4. Set authentication cookie")
        print("5. Back to main menu")

        choice = input("\nSelect option (1-5): ").strip()

        if choice == '1':
            url = input(f"Enter new URL [{config.elasticsearch.url}]: ").strip()
            if url:
                self.set_value('elasticsearch.url', url)
        elif choice == '2':
            pattern = input(f"Enter index pattern [{config.elasticsearch.index_pattern}]: ").strip()
            if pattern:
                self.set_value('elasticsearch.index_pattern', pattern)
        elif choice == '3':
            timeout = input(f"Enter timeout in seconds [{config.elasticsearch.timeout}]: ").strip()
            if timeout:
                self.set_value('elasticsearch.timeout', timeout)
        elif choice == '4':
            cookie = getpass("Enter Elasticsearch cookie: ").strip()
            if cookie:
                self.set_value('elasticsearch.cookie', cookie)

    def _interactive_server(self):
        """Interactive server configuration"""
        config = get_config()

        print("\nServer Configuration:")
        print(f"1. Host: {config.server.host}")
        print(f"2. Port: {config.server.port}")
        print(f"3. Workers: {config.server.workers}")
        print(f"4. Log Level: {config.server.log_level}")
        print("5. Back to main menu")

        choice = input("\nSelect option (1-5): ").strip()

        if choice == '1':
            host = input(f"Enter host [{config.server.host}]: ").strip()
            if host:
                self.set_value('server.host', host)
        elif choice == '2':
            port = input(f"Enter port [{config.server.port}]: ").strip()
            if port:
                self.set_value('server.port', port)
        elif choice == '3':
            workers = input(f"Enter number of workers [{config.server.workers}]: ").strip()
            if workers:
                self.set_value('server.workers', workers)
        elif choice == '4':
            level = input(f"Enter log level (DEBUG/INFO/WARNING/ERROR) [{config.server.log_level}]: ").strip()
            if level:
                self.set_value('server.log_level', level.upper())

    def _interactive_processing(self):
        """Interactive processing configuration"""
        config = get_config()

        print("\nProcessing Configuration:")
        print(f"1. Baseline Start: {config.processing.baseline_start}")
        print(f"2. Baseline End: {config.processing.baseline_end}")
        print(f"3. High Volume Threshold: {config.processing.high_volume_threshold}")
        print(f"4. Medium Volume Threshold: {config.processing.medium_volume_threshold}")
        print(f"5. Critical Threshold: {config.processing.critical_threshold}%")
        print(f"6. Warning Threshold: {config.processing.warning_threshold}%")
        print("7. Back to main menu")

        choice = input("\nSelect option (1-7): ").strip()

        if choice == '1':
            date = input(f"Enter baseline start date (YYYY-MM-DD) [{config.processing.baseline_start}]: ").strip()
            if date:
                self.set_value('processing.baseline_start', date)
        elif choice == '2':
            date = input(f"Enter baseline end date (YYYY-MM-DD) [{config.processing.baseline_end}]: ").strip()
            if date:
                self.set_value('processing.baseline_end', date)
        elif choice == '3':
            threshold = input(f"Enter high volume threshold [{config.processing.high_volume_threshold}]: ").strip()
            if threshold:
                self.set_value('processing.high_volume_threshold', threshold)
        elif choice == '4':
            threshold = input(f"Enter medium volume threshold [{config.processing.medium_volume_threshold}]: ").strip()
            if threshold:
                self.set_value('processing.medium_volume_threshold', threshold)
        elif choice == '5':
            threshold = input(f"Enter critical threshold (negative %) [{config.processing.critical_threshold}]: ").strip()
            if threshold:
                self.set_value('processing.critical_threshold', threshold)
        elif choice == '6':
            threshold = input(f"Enter warning threshold (negative %) [{config.processing.warning_threshold}]: ").strip()
            if threshold:
                self.set_value('processing.warning_threshold', threshold)

    def setup_wizard(self):
        """Setup wizard for initial configuration"""
        print("VH-RAD Traffic Monitor - Setup Wizard")
        print("=" * 50)
        print("\nThis wizard will help you configure the application.\n")

        # Environment
        print("1. Select environment:")
        print("   a) Development (local testing)")
        print("   b) Staging (pre-production)")
        print("   c) Production (live)")
        env_choice = input("\nSelect (a/b/c) [a]: ").strip().lower() or 'a'

        environment = {
            'a': 'development',
            'b': 'staging',
            'c': 'production'
        }.get(env_choice, 'development')

        # Create base config
        self.create_environment(environment)
        config = self.manager.get_config(environment)

        # Elasticsearch
        print("\n2. Elasticsearch Configuration:")
        es_url = input(f"   Elasticsearch URL [{config.elasticsearch.url}]: ").strip()
        if es_url:
            self.set_value('elasticsearch.url', es_url, environment)

        es_cookie = getpass("   Elasticsearch cookie (press Enter to skip): ").strip()
        if es_cookie:
            self.set_value('elasticsearch.cookie', es_cookie, environment)

        # Server
        print("\n3. Server Configuration:")
        port = input(f"   Server port [{config.server.port}]: ").strip()
        if port:
            self.set_value('server.port', port, environment)

        # Processing
        print("\n4. Processing Configuration:")
        print("   Configure baseline period for comparisons:")
        start = input(f"   Baseline start date (YYYY-MM-DD) [{config.processing.baseline_start}]: ").strip()
        if start:
            self.set_value('processing.baseline_start', start, environment)

        end = input(f"   Baseline end date (YYYY-MM-DD) [{config.processing.baseline_end}]: ").strip()
        if end:
            self.set_value('processing.baseline_end', end, environment)

        # Redis
        if environment in ['staging', 'production']:
            print("\n5. Redis Configuration (recommended for production):")
            use_redis = input("   Enable Redis caching? (y/n) [y]: ").strip().lower()
            if use_redis != 'n':
                self.set_value('redis.enabled', 'true', environment)
                redis_url = input("   Redis URL [redis://localhost:6379]: ").strip()
                if redis_url:
                    self.set_value('redis.url', redis_url, environment)

        # Validate
        print("\n6. Validating configuration...")
        issues = self.manager.validate_config(config)
        if issues:
            print("   Warning: Configuration has issues:")
            for issue in issues:
                print(f"   - {issue}")
        else:
            print("   Configuration is valid!")

        # Export .env
        print("\n7. Environment variables:")
        export = input("   Export environment variables to .env file? (y/n) [y]: ").strip().lower()
        if export != 'n':
            env_file = f".env.{environment}"
            with open(env_file, 'w') as f:
                f.write(self.manager.export_env_template(environment))
            print(f"   Exported to {env_file}")

        print("\nSetup complete!")
        print(f"Configuration saved to: config/environments/{environment}.yaml")
        print(f"\nTo start the server, run:")
        print(f"  python bin/server.py")

        return 0

    def run(self, args: Optional[List[str]] = None):
        """Run the CLI"""
        args = self.parser.parse_args(args)

        if not args.command:
            self.parser.print_help()
            return 0

        # Route commands
        if args.command == 'show':
            return self.show_config(args.format, args.environment)
        elif args.command == 'get':
            return self.get_value(args.key, args.environment)
        elif args.command == 'set':
            return self.set_value(args.key, args.value, args.environment, args.backup)
        elif args.command == 'validate':
            return self.validate_config(args.environment, args.file)
        elif args.command == 'env':
            if args.env_command == 'create':
                return self.create_environment(args.environment, args.from_env)
            elif args.env_command == 'list':
                return self.list_environments()
            elif args.env_command == 'export':
                return self.export_environment(args.environment)
            else:
                self.parser.parse_args(['env', '--help'])
        elif args.command == 'migrate':
            return self.migrate_from_json(args.json_file, args.backup)
        elif args.command == 'backup':
            return self.backup_config(args.file)
        elif args.command == 'interactive':
            return self.interactive_mode()
        elif args.command == 'setup':
            return self.setup_wizard()

        return 0


def main():
    """Main entry point"""
    cli = ConfigCLI()
    sys.exit(cli.run())


if __name__ == "__main__":
    main()
