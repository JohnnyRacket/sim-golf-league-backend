#!/usr/bin/env pwsh

# Make sure docker is running
Write-Host "Starting E2E tests..." -ForegroundColor Cyan
Write-Host "Setting up test environment..." -ForegroundColor Yellow

# Clean up any previous containers
docker-compose -f docker-compose.e2e.yml down -v

# Build and start the e2e test environment
Write-Host "Starting Docker containers..." -ForegroundColor Green
docker-compose -f docker-compose.e2e.yml up --build --abort-on-container-exit

# Grab the exit code
$EXIT_CODE = $LASTEXITCODE

# Clean up
Write-Host "Cleaning up test environment..." -ForegroundColor Yellow
docker-compose -f docker-compose.e2e.yml down -v

Write-Host "E2E tests completed!" -ForegroundColor Cyan
exit $EXIT_CODE 