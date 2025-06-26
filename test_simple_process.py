#!/usr/bin/env python3
import sys
import os

# Minimal test - just try the imports
try:
    print("1. Starting imports...")
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    print("2. Importing processors...")
    # This is the problematic import line from process_data.py
    from data.processors import TrafficProcessor, ScoreCalculator, HTMLGenerator
    
    print("3. Import successful!")
    
except Exception as e:
    print(f"ERROR during import: {e}")
    import traceback
    traceback.print_exc()
