#!/usr/bin/env python3
"""
Cleanup script to kill any orphaned server processes
"""

import os
import sys
import subprocess
import signal
import time

def find_processes_on_port(port):
    """Find all processes listening on a specific port"""
    processes = []
    
    try:
        # Use lsof to find processes on the port
        result = subprocess.run(
            ['lsof', '-i', f':{port}', '-t'],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0 and result.stdout:
            pids = result.stdout.strip().split('\n')
            for pid in pids:
                try:
                    processes.append(int(pid))
                except ValueError:
                    pass
    except Exception as e:
        print(f"Error finding processes: {e}")
    
    return processes

def kill_process(pid):
    """Kill a single process by PID"""
    try:
        # Try graceful shutdown first
        os.kill(pid, signal.SIGTERM)
        time.sleep(0.5)
        
        # Check if still running
        try:
            os.kill(pid, 0)  # This doesn't kill, just checks if process exists
            # Still running, force kill
            os.kill(pid, signal.SIGKILL)
            return True, "Force killed"
        except ProcessLookupError:
            # Already terminated gracefully
            return True, "Terminated"
            
    except PermissionError:
        return False, "Permission denied (try with sudo)"
    except Exception as e:
        return False, str(e)

def main():
    """Main cleanup function"""
    print("🧹 RAD Monitor Server Cleanup")
    print("=" * 40)
    
    # Check for processes on common ports
    ports = [8000, 8001, 8889, 3001]  # Common server and CORS proxy ports
    
    found_processes = {}
    
    # Find processes on each port
    for port in ports:
        pids = find_processes_on_port(port)
        if pids:
            found_processes[port] = pids
            print(f"Found {len(pids)} process(es) on port {port}: {pids}")
    
    if not found_processes:
        print("✅ No server processes found. All ports are clear!")
        return 0
    
    # Kill the processes
    print(f"\n⚠️  Cleaning up processes...")
    
    failed_kills = []
    
    for port, pids in found_processes.items():
        for pid in pids:
            success, message = kill_process(pid)
            if success:
                print(f"✅ Port {port}: PID {pid} - {message}")
            else:
                failed_kills.append((port, pid, message))
                print(f"❌ Port {port}: PID {pid} - {message}")
    
    if failed_kills:
        print(f"\n❌ Failed to kill {len(failed_kills)} process(es):")
        for port, pid, error in failed_kills:
            print(f"   - Port {port}, PID {pid}: {error}")
        return 1
    
    # Verify ports are free
    print("\nVerifying ports are free...")
    time.sleep(1)
    
    still_in_use = []
    for port in ports:
        if find_processes_on_port(port):
            still_in_use.append(port)
    
    if still_in_use:
        print(f"⚠️  Some ports are still in use: {still_in_use}")
        print("You may need to wait a moment or run with sudo")
        return 1
    else:
        print("✅ All ports are free! You can now start the server.")
        return 0

if __name__ == "__main__":
    sys.exit(main())