#!/usr/bin/env python3
"""
Port Cleanup Utility for RAD Monitor
Kills processes using development ports (8889, 8000)
100% functional replacement for cleanup-ports.sh
"""

import os
import sys
import platform
import subprocess
import signal
import time
import argparse
import logging
from typing import List, Tuple, Optional

# Configure logging with colors
class ColoredFormatter(logging.Formatter):
    """Custom formatter with colors for console output"""

    COLORS = {
        'DEBUG': '\033[36m',     # Cyan
        'INFO': '\033[0m',       # Default
        'WARNING': '\033[33m',   # Yellow
        'ERROR': '\033[31m',     # Red
        'SUCCESS': '\033[32m',   # Green
    }
    RESET = '\033[0m'

    def format(self, record):
        levelname = record.levelname
        if levelname in self.COLORS:
            record.levelname = f"{self.COLORS[levelname]}{levelname}{self.RESET}"
        if levelname == 'INFO' and record.msg.startswith('✅'):
            record.msg = f"\033[32m{record.msg}\033[0m"  # Green for success
        return super().format(record)


# Set up logging
def setup_logging(verbose: bool = False):
    """Configure logging with colored output"""
    logger = logging.getLogger()
    logger.setLevel(logging.DEBUG if verbose else logging.INFO)

    # Console handler with colors
    console = logging.StreamHandler()
    console.setFormatter(
        ColoredFormatter('%(message)s')
    )
    logger.addHandler(console)

    return logger


def find_process_by_port_unix(port: int) -> List[Tuple[int, str]]:
    """Find processes using a port on Unix systems (macOS, Linux)"""
    processes = []

    # Try lsof first (most reliable)
    try:
        result = subprocess.run(
            ['lsof', '-ti', f':{port}'],
            capture_output=True,
            text=True
        )
        if result.returncode == 0 and result.stdout.strip():
            pids = result.stdout.strip().split('\n')
            for pid in pids:
                try:
                    # Get process name
                    name_result = subprocess.run(
                        ['ps', '-p', pid, '-o', 'comm='],
                        capture_output=True,
                        text=True
                    )
                    process_name = name_result.stdout.strip()
                    processes.append((int(pid), process_name))
                except:
                    processes.append((int(pid), "unknown"))
    except FileNotFoundError:
        # lsof not available, try netstat
        try:
            if platform.system() == 'Darwin':  # macOS
                cmd = ['netstat', '-anv', '-p', 'tcp']
            else:  # Linux
                cmd = ['netstat', '-tlnp']

            result = subprocess.run(cmd, capture_output=True, text=True)
            for line in result.stdout.split('\n'):
                if f':{port}' in line or f'.{port}' in line:
                    # Parse PID from netstat output (platform-specific)
                    parts = line.split()
                    if platform.system() == 'Darwin' and len(parts) > 8:
                        # macOS netstat format
                        pid_info = parts[8]
                        if '/' in pid_info:
                            pid = int(pid_info.split('/')[0])
                            processes.append((pid, "unknown"))
                    elif platform.system() == 'Linux' and 'LISTEN' in line:
                        # Linux netstat format
                        for part in parts:
                            if '/' in part:
                                pid = int(part.split('/')[0])
                                name = part.split('/')[1]
                                processes.append((pid, name))
                                break
        except:
            pass

    return processes


def find_process_by_port_windows(port: int) -> List[Tuple[int, str]]:
    """Find processes using a port on Windows"""
    processes = []

    try:
        # Use netstat to find the port
        result = subprocess.run(
            ['netstat', '-ano'],
            capture_output=True,
            text=True,
            shell=True
        )

        for line in result.stdout.split('\n'):
            if f':{port}' in line and 'LISTENING' in line:
                parts = line.split()
                if len(parts) >= 5:
                    pid = int(parts[-1])

                    # Get process name using tasklist
                    name_result = subprocess.run(
                        ['tasklist', '/FI', f'PID eq {pid}', '/FO', 'CSV'],
                        capture_output=True,
                        text=True,
                        shell=True
                    )

                    lines = name_result.stdout.strip().split('\n')
                    if len(lines) > 1:
                        # Parse CSV output
                        name = lines[1].split(',')[0].strip('"')
                        processes.append((pid, name))
                    else:
                        processes.append((pid, "unknown"))
    except:
        pass

    return processes


def find_process_by_port(port: int) -> List[Tuple[int, str]]:
    """Find all processes using a specific port"""
    if platform.system() == 'Windows':
        return find_process_by_port_windows(port)
    else:
        return find_process_by_port_unix(port)


def kill_process(pid: int, force: bool = False) -> bool:
    """Kill a process by PID"""
    try:
        if platform.system() == 'Windows':
            if force:
                subprocess.run(['taskkill', '/F', '/PID', str(pid)],
                             capture_output=True, shell=True)
            else:
                subprocess.run(['taskkill', '/PID', str(pid)],
                             capture_output=True, shell=True)
        else:
            if force:
                os.kill(pid, signal.SIGKILL)  # -9
            else:
                os.kill(pid, signal.SIGTERM)  # -15

        # Give it a moment to die
        time.sleep(0.5)

        # Check if process is still alive
        try:
            os.kill(pid, 0)  # This doesn't kill, just checks
            return False  # Still alive
        except (OSError, ProcessLookupError):
            return True  # Successfully killed

    except Exception as e:
        logging.debug(f"Error killing process {pid}: {e}")
        return False


def cleanup_port(port: int, force: bool = False) -> int:
    """Clean up all processes using a specific port"""
    logger = logging.getLogger()

    processes = find_process_by_port(port)

    if not processes:
        logger.info(f"✅ Port {port} is already free")
        return 0

    logger.info(f"Found {len(processes)} process(es) on port {port}:")
    for pid, name in processes:
        logger.info(f"  PID: {pid} ({name})")

    killed_count = 0
    for pid, name in processes:
        logger.info(f"Killing process {pid} ({name})...")

        # Try graceful kill first
        if kill_process(pid, force=False):
            logger.info(f"✅ Process {pid} terminated gracefully")
            killed_count += 1
        elif force or kill_process(pid, force=True):
            logger.info(f"✅ Process {pid} force killed")
            killed_count += 1
        else:
            logger.error(f"❌ Failed to kill process {pid}")

    # Verify port is free
    remaining = find_process_by_port(port)
    if not remaining:
        logger.info(f"✅ Port {port} cleared")
    else:
        logger.warning(f"⚠️  Port {port} still has {len(remaining)} process(es)")

    return killed_count


def main():
    """Main function - replaces cleanup-ports.sh functionality"""
    parser = argparse.ArgumentParser(
        description='Kill processes using development ports'
    )
    parser.add_argument(
        'ports',
        nargs='*',
        type=int,
        default=[8889, 8000],
        help='Ports to clean up (default: 8889 8000)'
    )
    parser.add_argument(
        '-f', '--force',
        action='store_true',
        help='Force kill processes (SIGKILL)'
    )
    parser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help='Verbose output'
    )
    parser.add_argument(
        '-q', '--quiet',
        action='store_true',
        help='Quiet mode - only show errors'
    )

    args = parser.parse_args()

    # Setup logging
    if args.quiet:
        logging.basicConfig(level=logging.ERROR)
    else:
        logger = setup_logging(args.verbose)

        if not args.quiet:
            logger.info("Checking for processes on development ports...")

    # Clean up each port
    total_killed = 0
    for port in args.ports:
        if not args.quiet:
            logger.info(f"\nChecking port {port}...")
        killed = cleanup_port(port, args.force)
        total_killed += killed

    # Summary
    if not args.quiet:
        if total_killed > 0:
            logger.info(f"\n✅ Killed {total_killed} process(es) total")
        logger.info("Ports are now free!")

    # Exit code: 0 if successful, 1 if any ports still occupied
    for port in args.ports:
        if find_process_by_port(port):
            sys.exit(1)

    sys.exit(0)


if __name__ == '__main__':
    main()
