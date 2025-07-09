#!/bin/bash
#
# Production Deployment Script for RAD Monitor with FastAPI
# This script prepares and deploys the application to production
#

set -e  # Exit on error

echo "================================================"
echo "RAD Monitor Production Deployment"
echo "================================================"

# Check if production environment file exists
if [ ! -f ".env.production" ]; then
    echo "ERROR: .env.production file not found!"
    echo "Please copy .env.production.example to .env.production and configure it."
    exit 1
fi

# Load production environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Validate required environment variables
REQUIRED_VARS=(
    "API_URL"
    "ELASTICSEARCH_URL"
    "KIBANA_URL"
    "ALLOWED_ORIGINS"
    "ALLOWED_HOSTS"
    "SECRET_KEY"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "ERROR: Required environment variable $var is not set in .env.production"
        exit 1
    fi
done

echo "✓ Environment variables validated"

# Update production configuration with API URL
echo "Updating production configuration..."
cat > config/production.json << EOF
{
  "environment": "production",
  "server": {
    "type": "fastapi",
    "url": "${API_URL}",
    "port": "${SERVER_PORT:-8000}",
    "workers": "${WORKERS:-4}"
  },
  "corsProxy": {
    "enabled": false,
    "url": null
  },
  "lastUpdated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "elasticsearch": {
    "url": "${ELASTICSEARCH_URL}",
    "kibanaUrl": "${KIBANA_URL}",
    "path": "/api/console/proxy?path=traffic-*/_search&method=POST",
    "directConnection": false,
    "corsRequired": false
  },
  "features": {
    "fastapi": true,
    "localServer": false,
    "corsProxy": false,
    "websocket": true,
    "formulaBuilder": true,
    "authentication": true
  },
  "dashboard": {
    "autoLoadCookie": true,
    "skipCookiePrompt": false,
    "refreshInterval": 300
  },
  "security": {
    "allowedOrigins": "${ALLOWED_ORIGINS}",
    "allowedHosts": "${ALLOWED_HOSTS}",
    "enableDocs": false,
    "requireAuth": true
  }
}
EOF

echo "✓ Production configuration updated"

# Create production API URL injection for frontend
echo "Creating production API configuration..."
cat > assets/js/production-config.js << EOF
// Production API Configuration
// This file is auto-generated during deployment
window.PRODUCTION_API_URL = '${API_URL}';
EOF

echo "✓ Production API configuration created"

# Update index.html to include production config
if ! grep -q "production-config.js" index.html; then
    echo "Updating index.html..."
    sed -i.bak '/<script type="module" src="assets\/js\/main-clean.js"><\/script>/i\
    <!-- Production Configuration -->\
    <script src="assets/js/production-config.js"></script>' index.html
    echo "✓ index.html updated"
fi

# Install Python dependencies for production server
echo "Installing Python dependencies..."
pip install -r requirements.txt
echo "✓ Python dependencies installed"

# Run production server tests
echo "Running server tests..."
python -m pytest tests/test_server_production.py -v || echo "⚠️  Some tests failed, continuing..."

# Build static assets (if needed)
if [ -f "package.json" ]; then
    echo "Installing Node dependencies..."
    npm ci --production
    echo "✓ Node dependencies installed"
fi

# Create systemd service file (for Linux deployments)
if [ "$CREATE_SYSTEMD_SERVICE" = "true" ]; then
    echo "Creating systemd service..."
    sudo tee /etc/systemd/system/rad-monitor.service > /dev/null << EOF
[Unit]
Description=RAD Monitor FastAPI Server
After=network.target

[Service]
Type=exec
User=$USER
Group=$USER
WorkingDirectory=$(pwd)
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
EnvironmentFile=$(pwd)/.env.production
ExecStart=/usr/bin/python3 $(pwd)/bin/server_production.py
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable rad-monitor
    echo "✓ Systemd service created"
fi

# Create Docker deployment (if requested)
if [ "$DEPLOY_WITH_DOCKER" = "true" ]; then
    echo "Building Docker image..."
    cat > Dockerfile << EOF
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Expose port
EXPOSE ${SERVER_PORT:-8000}

# Run production server
CMD ["python", "bin/server_production.py"]
EOF

    docker build -t rad-monitor:latest .
    echo "✓ Docker image built"
    
    # Create docker-compose file
    cat > docker-compose.prod.yml << EOF
version: '3.8'

services:
  rad-monitor:
    image: rad-monitor:latest
    ports:
      - "${SERVER_PORT:-8000}:${SERVER_PORT:-8000}"
    env_file:
      - .env.production
    volumes:
      - ./config:/app/config
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:${SERVER_PORT:-8000}/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis-data:/data

volumes:
  redis-data:
EOF
    echo "✓ Docker Compose configuration created"
fi

echo ""
echo "================================================"
echo "Deployment Preparation Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo ""

if [ "$CREATE_SYSTEMD_SERVICE" = "true" ]; then
    echo "1. Start the service:"
    echo "   sudo systemctl start rad-monitor"
    echo ""
    echo "2. Check service status:"
    echo "   sudo systemctl status rad-monitor"
    echo ""
    echo "3. View logs:"
    echo "   sudo journalctl -u rad-monitor -f"
elif [ "$DEPLOY_WITH_DOCKER" = "true" ]; then
    echo "1. Start with Docker Compose:"
    echo "   docker-compose -f docker-compose.prod.yml up -d"
    echo ""
    echo "2. View logs:"
    echo "   docker-compose -f docker-compose.prod.yml logs -f"
else
    echo "1. Start the production server:"
    echo "   python bin/server_production.py"
    echo ""
    echo "2. Or use a process manager like PM2:"
    echo "   pm2 start bin/server_production.py --name rad-monitor"
fi

echo ""
echo "3. Access the dashboard at:"
echo "   ${API_URL}"
echo ""
echo "4. Monitor health at:"
echo "   ${API_URL}/health"
echo ""

# Create deployment info file
cat > DEPLOYMENT_INFO.json << EOF
{
  "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "api_url": "${API_URL}",
  "environment": "production",
  "features": {
    "fastapi": true,
    "websocket": true,
    "formulaBuilder": true,
    "authentication": true
  }
}
EOF

echo "✓ Deployment info saved to DEPLOYMENT_INFO.json"