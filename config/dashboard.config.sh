#!/bin/bash
# Dashboard Configuration File
# Contains all environment variables and settings for the RAD Monitor

# Kibana Configuration
export KIBANA_URL="https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243"
export KIBANA_INDEX_PATTERN="traffic-*"

# Default Time Ranges
export DEFAULT_BASELINE_START="2025-06-01"
export DEFAULT_BASELINE_END="2025-06-09"
export DEFAULT_CURRENT_TIME_RANGE="now-12h"

# Volume Thresholds
export DEFAULT_HIGH_VOLUME_THRESHOLD=1000
export DEFAULT_MEDIUM_VOLUME_THRESHOLD=100

# Score Calculation Thresholds
export CRITICAL_THRESHOLD=-80
export WARNING_THRESHOLD=-50
export HIGH_VOLUME_DROP_THRESHOLD=0.5
export MEDIUM_VOLUME_DROP_THRESHOLD=0.3

# API Configuration
export CORS_PROXY_PORT=8889
export CORS_PROXY_URL="http://localhost:${CORS_PROXY_PORT}"

# Dashboard Settings
export AUTO_REFRESH_MINUTES=45
export MAX_EVENTS_TO_DISPLAY=500
export CONSOLE_CHART_WIDTH=30
export CONSOLE_TOP_RESULTS=20

# File Paths
export DATA_DIR="${DATA_DIR:-data}"
export RAW_RESPONSE_FILE="${DATA_DIR}/raw_response.json"

# Feature Flags
export ENABLE_CONSOLE_VISUALIZATION=${ENABLE_CONSOLE_VISUALIZATION:-true}
export ENABLE_REAL_TIME_API=${ENABLE_REAL_TIME_API:-true}
