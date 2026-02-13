#!/bin/sh
# Run database migrations before starting the app
echo "Running database migrations..."
npx kysely migrate:latest
echo "Migrations complete. Starting app..."
exec "$@"
