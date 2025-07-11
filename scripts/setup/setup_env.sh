#!/bin/bash
# Setup environment file from template

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
usage() {
    echo "Usage: $0 [development|staging|production]"
    echo
    echo "Sets up environment file from template"
    echo
    echo "Options:"
    echo "  development  - Setup for local development"
    echo "  staging      - Setup for staging environment"
    echo "  production   - Setup for production environment"
    echo
    echo "Example:"
    echo "  $0 development"
    exit 1
}

# Check arguments
if [ $# -eq 0 ]; then
    usage
fi

ENVIRONMENT=$1
TEMPLATE_DIR="${PROJECT_ROOT}/config/templates"
TEMPLATE_FILE="${TEMPLATE_DIR}/env.${ENVIRONMENT}"
ENV_FILE="${PROJECT_ROOT}/.env"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT"
    usage
fi

# Check if template exists
if [ ! -f "$TEMPLATE_FILE" ]; then
    print_error "Template file not found: $TEMPLATE_FILE"
    exit 1
fi

# Backup existing .env if it exists
if [ -f "$ENV_FILE" ]; then
    BACKUP_FILE="${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    print_info "Backing up existing .env to $BACKUP_FILE"
    cp "$ENV_FILE" "$BACKUP_FILE"
fi

# Copy template
print_info "Setting up environment for: $ENVIRONMENT"
cp "$TEMPLATE_FILE" "$ENV_FILE"

# Make the file only readable by owner for security
chmod 600 "$ENV_FILE"

print_info "Environment file created at: $ENV_FILE"

# Environment-specific instructions
case "$ENVIRONMENT" in
    development)
        print_warning "Don't forget to:"
        echo "  1. Add your Elasticsearch cookie to ELASTICSEARCH__COOKIE"
        echo "  2. Adjust ports if needed"
        echo "  3. Run: python bin/config_cli.py setup"
        ;;
    staging)
        print_warning "Don't forget to:"
        echo "  1. Set all required environment variables"
        echo "  2. Configure Redis connection"
        echo "  3. Update allowed origins for CORS"
        ;;
    production)
        print_warning "IMPORTANT for production:"
        echo "  1. Set ES_COOKIE environment variable"
        echo "  2. Set SECRET_KEY environment variable"
        echo "  3. Configure ALLOWED_HOSTS and ALLOWED_ORIGINS"
        echo "  4. Set up Redis connection"
        echo "  5. Review all security settings"
        ;;
esac

print_info "Setup complete!"
print_info "You can now run: python bin/server.py"
