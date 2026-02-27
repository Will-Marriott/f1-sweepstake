#!/bin/sh
set -e

echo "Running Prisma migrations..."
node node_modules/prisma/build/index.js migrate deploy --config ./prisma.config.ts

echo "Starting Next.js server..."
exec node server.js
