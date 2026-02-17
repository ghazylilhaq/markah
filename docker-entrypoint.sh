#!/bin/sh
set -e

# Run Prisma migrations
echo "Running database migrations..."
node node_modules/prisma/build/index.js migrate deploy

# Start the Next.js server
echo "Starting application..."
exec node server.js
