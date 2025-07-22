#!/bin/bash
# Start development environment with Docker Compose

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

echo -e "${GREEN}Starting VH-RAD Traffic Monitor - Development Environment${NC}"
echo "=================================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}No .env file found. Creating from template...${NC}"
    if [ -f config/templates/env.development ]; then
        cp config/templates/env.development .env
        echo -e "${GREEN}Created .env from development template${NC}"
        echo -e "${YELLOW}Please edit .env and add your Elasticsearch cookie${NC}"
        exit 1
    else
        echo -e "${RED}No template found. Please create .env file${NC}"
        exit 1
    fi
fi

# Build and start containers
echo -e "${GREEN}Building containers...${NC}"
docker-compose -f docker-compose.yml -f docker-compose.dev.yml build

echo -e "${GREEN}Starting services...${NC}"
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Wait for services to be ready
echo -e "${GREEN}Waiting for services to be ready...${NC}"
sleep 5

# Show status
echo -e "${GREEN}Services status:${NC}"
docker-compose -f docker-compose.yml -f docker-compose.dev.yml ps

# Show logs
echo -e "${GREEN}Application logs (last 20 lines):${NC}"
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=20 app

echo ""
echo -e "${GREEN}Development environment is ready!${NC}"
echo "=================================================="
echo "Dashboard: http://localhost:8000"
echo "Redis: localhost:6379"
echo ""
echo "Useful commands:"
echo "  View logs: docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f app"
echo "  Stop: docker-compose -f docker-compose.yml -f docker-compose.dev.yml down"
echo "  Shell: docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec app bash"
