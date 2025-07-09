#!/bin/bash

# Quick script to sync Kibana sid cookie with RAD Monitor

if [ -z "$1" ]; then
    echo "Usage: ./sync-cookie.sh <sid-cookie-value>"
    echo "Example: ./sync-cookie.sh 'Fe26.2**...'"
    exit 1
fi

COOKIE_VALUE="$1"

# Sync the cookie
echo "🔄 Syncing sid cookie to RAD Monitor..."

curl -X POST http://localhost:8000/api/v1/config/cookie \
  -H "Content-Type: application/json" \
  -d "{
    \"cookie\": \"sid=$COOKIE_VALUE\",
    \"source\": \"shell-script\",
    \"persist\": true
  }" | jq

echo "(✓)Done! Your Kibana session is now synced with RAD Monitor."
