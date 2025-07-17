#!/bin/bash
# Quick restart script for RAD Monitor

echo "🛑 Stopping all services..."
pnpm run cleanup:server
pkill -f vite
pkill -f python

echo "⏳ Waiting for ports to clear..."
sleep 2

echo "🚀 Starting RAD Monitor..."
pnpm run dev

# Note: Access the TypeScript app at http://localhost:3000