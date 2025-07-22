#!/usr/bin/env python3
"""
Script to automatically resolve common merge conflicts.
"""
import os
import re
import subprocess

def get_conflicted_files():
    """Get list of files with conflicts."""
    result = subprocess.run(['git', 'diff', '--name-only'], capture_output=True, text=True)
    return result.stdout.strip().split('\n') if result.stdout.strip() else []

def resolve_file(filepath):
    """Resolve conflicts in a single file."""
    if not os.path.exists(filepath):
        return False
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Check if file has conflicts
    if '<<<<<<< HEAD' not in content:
        return False
    
    # For simple emoji conflicts, prefer the version with checkmarks
    # Pattern: conflicts where only difference is emoji
    simple_emoji_pattern = r'<<<<<<< HEAD\n(.*?)✓(.*?)\n=======\n\1✅\2\n>>>>>>> balkhalil-godaddy/polish'
    content = re.sub(simple_emoji_pattern, r'\1✓\2', content, flags=re.MULTILINE)
    
    # For shell script conflicts with minor differences
    # Pattern: bash script option conflicts
    bash_option_pattern = r'<<<<<<< HEAD\n(.*?)\$\((.*?)\)\n=======\n\1\$\(\2\)\n>>>>>>> balkhalil-godaddy/polish'
    content = re.sub(bash_option_pattern, r'\1$(\2)', content, flags=re.MULTILINE)
    
    # Write back if conflicts were resolved
    if '<<<<<<< HEAD' not in content:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"✓ Auto-resolved: {filepath}")
        return True
    else:
        # Count remaining conflicts
        conflicts = len(re.findall(r'<<<<<<< HEAD', content))
        print(f"✗ Still has {conflicts} conflicts: {filepath}")
        return False

def main():
    """Main function."""
    files = get_conflicted_files()
    print(f"Found {len(files)} files with potential conflicts\n")
    
    resolved = 0
    for filepath in files:
        if resolve_file(filepath):
            resolved += 1
    
    print(f"\nAuto-resolved {resolved} files")
    print(f"Remaining files with conflicts: {len(files) - resolved}")

if __name__ == "__main__":
    main()