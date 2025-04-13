#!/bin/bash

# Make sure docker is running
echo "🧪 Starting E2E tests..."
echo "🔧 Setting up test environment..."

# Clean up any previous containers
docker-compose -f docker-compose.e2e.yml down -v

# Build and start the e2e test environment
echo "🚀 Starting Docker containers..."
docker-compose -f docker-compose.e2e.yml up --build --abort-on-container-exit

# Grab the exit code
EXIT_CODE=$?

# Clean up
echo "🧹 Cleaning up test environment..."
docker-compose -f docker-compose.e2e.yml down -v

echo "✅ E2E tests completed!"
exit $EXIT_CODE 