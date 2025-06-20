#!/bin/bash
# Cookie Handler - Manages Elastic cookie validation and retrieval

# Get the Elastic cookie from various sources
get_elastic_cookie() {
    local cookie=""

    # Priority 1: Environment variable
    if [ -n "$ELASTIC_COOKIE" ]; then
        cookie="$ELASTIC_COOKIE"
    # Priority 2: Local script (for development)
    elif [ -f "$HOME/scripts/traffic_monitor.sh" ]; then
        echo "Looking for cookie in local script..." >&2
        cookie=$(grep 'ELASTIC_COOKIE="' "$HOME/scripts/traffic_monitor.sh" | cut -d'"' -f2)
    fi

    echo "$cookie"
}

# Validate cookie format
validate_cookie() {
    local cookie="$1"

    if [ -z "$cookie" ]; then
        return 1
    fi

    # Basic validation - check if it looks like a valid Elastic cookie
    if [[ "$cookie" =~ ^Fe26\.2\*\* ]] || [ ${#cookie} -gt 100 ]; then
        return 0
    else
        return 1
    fi
}

# Setup cookie with validation
setup_elastic_cookie() {
    local cookie=$(get_elastic_cookie)

    if ! validate_cookie "$cookie"; then
        echo "Error: Invalid or missing Elastic cookie" >&2
        echo "Please set ELASTIC_COOKIE environment variable" >&2
        return 1
    fi

    export ELASTIC_COOKIE="$cookie"
    return 0
}
