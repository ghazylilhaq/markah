#!/bin/sh
set -e

# Run Prisma migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Start the Next.js server
echo "Starting application..."
exec node server.js
