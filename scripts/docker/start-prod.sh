#!/bin/bash
# Start production environment with Docker Compose

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "$PROJECT_ROOT"

echo -e "${GREEN}Starting VH-RAD Traffic Monitor - Production Environment${NC}"
echo "=================================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}No .env file found!${NC}"
    echo "Please create .env file with production settings"
    echo "You can use: scripts/setup/setup_env.sh production"
    exit 1
fi

# Verify required environment variables
REQUIRED_VARS=(
    "ELASTICSEARCH__COOKIE"
    "SECURITY__SECRET_KEY"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        # Check if it's in .env file
        if ! grep -q "^${var}=" .env; then
            MISSING_VARS+=("$var")
        fi
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${RED}Missing required environment variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    exit 1
fi

# Build containers
echo -e "${GREEN}Building containers...${NC}"
docker-compose --profile production build

# Start services
echo -e "${GREEN}Starting services...${NC}"
docker-compose --profile production up -d

# Wait for services to be ready
echo -e "${GREEN}Waiting for services to be ready...${NC}"
sleep 10

# Health check
echo -e "${GREEN}Running health checks...${NC}"
HEALTH_CHECK=$(docker-compose exec -T app curl -s http://localhost:8000/health | python3 -m json.tool 2>/dev/null || echo "{}")

if echo "$HEALTH_CHECK" | grep -q '"status": "healthy"'; then
    echo -e "${GREEN}Application is healthy!${NC}"
else
    echo -e "${YELLOW}Application health check failed or degraded${NC}"
    echo "$HEALTH_CHECK"
fi

# Show status
echo -e "${GREEN}Services status:${NC}"
docker-compose --profile production ps

echo ""
echo -e "${GREEN}Production environment is running!${NC}"
echo "=================================================="
echo "Dashboard: http://localhost"
echo "Prometheus: http://localhost:9090"
echo "Grafana: http://localhost:3001 (admin/admin)"
echo ""
echo "Useful commands:"
echo "  View logs: docker-compose --profile production logs -f app"
echo "  Stop: docker-compose --profile production down"
echo "  Backup: docker-compose run --rm config-cli backup"
